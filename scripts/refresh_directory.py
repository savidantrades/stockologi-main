"""Weekly refresh of the Stockologi directory tables in D1.

Updates, for every company in the directory:
  companies  mcap, price_asof, updated   (Nasdaq screener; unchanged if Nasdaq has no cap)
  filings    new 8-K / 6-K current reports from SEC EDGAR, last 180 days
  releases   new press releases (the EX-99 exhibit of an 8-K / 6-K), headline pulled from the exhibit

Reads what is already in D1 from the JSON that `wrangler d1 execute --json` writes, so it only inserts
what is new and never duplicates a row. Writes out/refresh.sql for `wrangler d1 execute --file`.

Run: python3 scripts/refresh_directory.py --existing existing.json [--limit N]
"""
import html, json, re, sys, time
from datetime import date, timedelta
from pathlib import Path

import requests

OUT = Path(__file__).resolve().parent / "out"
LOOKBACK_DAYS = 180
SEC = requests.Session(); SEC.headers.update({"User-Agent": "Stockologi research hello@stockologi.net"})
WEB = requests.Session(); WEB.headers.update({"User-Agent": "Mozilla/5.0", "Accept": "application/json"})

# Lines that sit above a release headline and are never the headline itself
NOT_TITLE = re.compile(r"^(exhibit|ex-?99|for immediate release|news release|press release|media|investor|contact|"
                       r"nasdaq|nyse|tsx|source:|page \d|forward[- ]looking|about )", re.I)


def get(sess, url, pause=0.11, **kw):
    for i in range(4):
        try:
            r = sess.get(url, timeout=40, **kw)
            if r.status_code == 200:
                time.sleep(pause)
                return r
            if r.status_code == 404:
                return None
        except requests.RequestException:
            pass
        time.sleep(2 * (i + 1))
    return None


def rows(path, key):
    """Rows of one statement from wrangler's --json output: [{results: [...]}]."""
    data = json.loads(Path(path).read_text())
    for block in data:
        res = block.get("results") or []
        if res and key in res[0]:
            return res
    return []


def digits(acc):
    return re.sub(r"\D", "", str(acc or ""))


def headline(doc_html):
    text = re.sub(r"(?is)<(script|style).*?</\1>", " ", doc_html)
    text = re.sub(r"(?i)<br\s*/?>|</(p|div|tr|h\d|li)>", "\n", text)
    text = html.unescape(re.sub(r"<[^>]+>", " ", text))
    for line in (re.sub(r"\s+", " ", l).strip() for l in text.split("\n")):
        words = line.split()
        if not (5 <= len(words) <= 45) or NOT_TITLE.match(line):
            continue
        if re.match(r"^[A-Z][a-z]+\.? \d{1,2}, \d{4}", line) or "(GLOBE NEWSWIRE)" in line or "/PRNewswire/" in line:
            continue  # dateline paragraph, the headline came before it
        return line[:300]
    return None


# Exhibits that are filed as EX-99 but are not press releases
NOT_RELEASE = re.compile(r"(financial statements|management.?s discussion|presentation|investor deck|"
                         r"notice of (annual|special)|proxy|table of contents|unaudited|interim report)", re.I)
BAD_RELEASE_SQL = ("DELETE FROM releases WHERE lower(title) LIKE '%financial statements%' "
                   "OR lower(title) LIKE '%presentation%' OR lower(title) LIKE '%management_s discussion%' "
                   "OR lower(title) LIKE 'notice of annual%' OR lower(title) LIKE 'notice of special%';")


def ex_order(name):
    m = re.search(r"99[._-]?(\d+)", name)
    return (int(m.group(1)) if m else 99, name)


def release_for(cik, acc_nodash):
    idx = get(SEC, f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc_nodash}/index.json")
    if not idx:
        return None
    files = [f["name"] for f in idx.json().get("directory", {}).get("item", [])]
    ex = [f for f in files if re.search(r"(ex-?99|ex99|exhibit99|dex99)", f, re.I) and f.lower().endswith((".htm", ".html", ".txt"))]
    if not ex:
        return None
    for name in sorted(ex, key=ex_order)[:3]:  # 99.1 first, then 99.2, 99.3
        url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc_nodash}/{name}"
        doc = get(SEC, url)
        title = doc and headline(doc.text)
        if title and not NOT_RELEASE.search(title):
            return title, url
    return None


def q(v):
    return "NULL" if v is None else (str(v) if isinstance(v, (int, float)) else "'" + str(v).replace("'", "''") + "'")


def main():
    args = sys.argv
    existing = args[args.index("--existing") + 1]
    limit = int(args[args.index("--limit") + 1]) if "--limit" in args else None
    OUT.mkdir(exist_ok=True)
    today = date.today().isoformat()
    since = (date.today() - timedelta(days=LOOKBACK_DAYS)).isoformat()

    companies = rows(existing, "cik")
    have_filings = {(r["ticker"], digits(r["acc"])) for r in rows(existing, "acc")}
    have_releases = {(r["ticker"], m.group(1)) for r in rows(existing, "url")
                     if (m := re.search(r"/data/\d+/(\d{18})/", r["url"] or ""))}
    sample = next((r["acc"] for r in rows(existing, "acc")), "")
    dashed = "-" in str(sample)
    if limit:
        companies = companies[:limit]
    print(f"{len(companies)} companies, {len(have_filings)} filings and {len(have_releases)} releases on file", file=sys.stderr)

    caps = {}
    r = get(WEB, "https://api.nasdaq.com/api/screener/stocks?tableonly=true&download=true", pause=0)
    try:
        for row in r.json()["data"]["rows"]:
            try:
                caps[row["symbol"].upper().replace("/", ".")] = float(row["marketCap"])
            except (TypeError, ValueError):
                pass
    except Exception:
        print("Nasdaq screener unavailable, market caps left as they are", file=sys.stderr)

    sql, n_cap, n_fil, n_rel, errors = [], 0, 0, 0, 0
    for n, c in enumerate(companies, 1):
        t, cik = c["ticker"], c["cik"]
        cap = caps.get(t) or caps.get(t.replace("-", "."))
        if cap:
            sql.append(f"UPDATE companies SET mcap = {round(cap)}, price_asof = {q(today)}, updated = {q(today)} WHERE ticker = {q(t)};")
            n_cap += 1
        if not cik:
            continue
        try:
            sub = get(SEC, f"https://data.sec.gov/submissions/CIK{int(cik):010d}.json")
            if not sub:
                continue
            f = sub.json()["filings"]["recent"]
            for i, form in enumerate(f["form"]):
                if f["filingDate"][i] < since:
                    break
                if form not in ("8-K", "6-K"):
                    continue
                acc = f["accessionNumber"][i]
                nod = digits(acc)
                items = ",".join(x.strip() for x in (f["items"][i] or "").split(",") if x.strip())
                d = f["filingDate"][i]
                if (t, nod) in have_filings:
                    continue  # already loaded, and its release (if any) with it
                sql.append("INSERT INTO filings (ticker, date, form, items, acc) VALUES "
                           f"({q(t)}, {q(d)}, {q(form)}, {q(items)}, {q(acc if dashed else nod)});")
                have_filings.add((t, nod)); n_fil += 1
                if (t, nod) not in have_releases:
                    rel = release_for(cik, nod)
                    if rel:
                        sql.append("INSERT INTO releases (ticker, date, form, items, title, url) VALUES "
                                   f"({q(t)}, {q(d)}, {q(form)}, {q(items)}, {q(rel[0])}, {q(rel[1])});")
                        have_releases.add((t, nod)); n_rel += 1
        except Exception as e:  # one bad company never kills the run
            errors += 1
            print(f"{t}: {type(e).__name__} {e}", file=sys.stderr)
        if n % 100 == 0:
            print(f"{n}/{len(companies)}", file=sys.stderr)

    # Drop exhibits that are not press releases, then point each company at its newest release
    sql.append(BAD_RELEASE_SQL)
    sql.append("UPDATE companies SET last_release = (SELECT MAX(date) FROM releases r WHERE r.ticker = companies.ticker);")
    (OUT / "refresh.sql").write_text("\n".join(sql) + "\n")
    summary = {"asof": today, "companies": len(companies), "caps_updated": n_cap,
               "new_filings": n_fil, "new_releases": n_rel, "errors": errors}
    (OUT / "refresh_summary.json").write_text(json.dumps(summary))
    print(json.dumps(summary), file=sys.stderr)
    if errors > len(companies) * 0.2:
        sys.exit("More than 20% of companies failed. Not writing a partial refresh.")


if __name__ == "__main__":
    main()

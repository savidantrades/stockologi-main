"""Sleeper Score for the Stockologi directory.

Sleeper = real news flow, little market attention. Score 0 to 100, higher = more of a sleeper.
Each part is a percentile rank across every scored company in the directory:
  News flow  40%  material 8-K / 6-K filings in the last 90 days (more = higher). Contracts, deals and
                  acquisitions count 1, financings 0.5. Results count once per window, "other events"
                  (often dividends and buybacks) at most 1.0, foreign 6-Ks 0.5 each up to 2.0.
  Reaction   30%  avg next session volume vs its 20 day average after those filings (less = higher)
  Turnover   30%  days to turn over: market cap / avg daily dollar volume, 30 sessions (more = higher)

Gates (no score): under 1.0 news points in 90 days (one results release qualifies), price under $1,
or under $500K average daily dollar volume.
Flags (scored, kept off the leaderboard): bankruptcy, debt acceleration, delisting notice,
impairment, non reliance on past financials, in the last 90 days.

Sources: SEC EDGAR submissions (filings), Yahoo Finance daily bars (price, volume),
Nasdaq screener (market cap, falls back to the directory snapshot).
Output: out/sleeper_scores.json, out/sleeper_scores.csv, out/sleeper_scores.sql (D1 upsert).

Run: python3 scripts/sleeper_score.py [--limit N]
"""
import csv, json, re, statistics, sys, time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

NY = ZoneInfo("America/New_York")
OUT = Path(__file__).resolve().parent / "out"
WEIGHTS = {"news": 0.40, "reaction": 0.30, "turnover": 0.30}
LOOKBACK_DAYS = 90
MIN_FILINGS = 1.0
MIN_PRICE = 1.0
MIN_DOLLAR_VOL = 500_000

# 8-K items that count as real news, and what each filing is worth. A filing counts once, at its best item.
ITEM_WEIGHT = {"1.01": 1.0, "2.01": 1.0, "2.02": 1.0, "2.03": 0.5, "3.02": 0.5, "8.01": 0.5}
MATERIAL = set(ITEM_WEIGHT)
# Caps per 90 day window, so routine filings cannot pile up into "news":
# results once a quarter (royalty trusts file monthly), "other events" (dividends, buybacks) and 6-Ks capped.
CAP_RESULTS = 1.0     # total weight from filings whose best item is 2.02
CAP_OTHER = 1.0       # total weight from filings whose best item is 8.01
CAP_6K = 2.0          # 6-Ks count 0.5 each, at most 2.0
# No management story to tell: royalty trusts and blank check shells stay off the board.
EXCLUDE_SIC = {"6792": "Royalty trust", "6770": "Blank check company"}
# 8-K items that keep a company off the leaderboard
RED = {"1.03": "Bankruptcy or receivership", "2.04": "Debt acceleration", "2.06": "Asset impairment",
       "3.01": "Listing standards notice", "4.02": "Past financials unreliable"}

SEC = requests.Session(); SEC.headers.update({"User-Agent": "Stockologi research hello@stockologi.net"})
WEB = requests.Session(); WEB.headers.update({"User-Agent": "Mozilla/5.0", "Accept": "application/json"})


def get(sess, url, pause=0.0, **kw):
    for i in range(4):
        try:
            r = sess.get(url, timeout=40, **kw)
            if r.status_code == 200:
                if pause:
                    time.sleep(pause)
                return r
            if r.status_code == 404:
                return None
        except requests.RequestException:
            pass
        time.sleep(2 * (i + 1))
    return None


def directory_tickers():
    xml = get(WEB, "https://stockologi.com/sitemap.xml").text
    return sorted(set(re.findall(r"/t/([A-Z0-9.\-]+)<", xml)))


def nasdaq_caps():
    r = get(WEB, "https://api.nasdaq.com/api/screener/stocks?tableonly=true&download=true")
    caps = {}
    try:
        for row in r.json()["data"]["rows"]:
            try:
                caps[row["symbol"].upper().replace("/", ".")] = float(row["marketCap"])
            except (TypeError, ValueError):
                pass
    except Exception:
        pass
    return caps


def snapshot_cap(t):
    r = get(WEB, f"https://stockologi.com/t/{t}.md")
    m = r and re.search(r"Market cap snapshot: \$([\d.]+)([MB])", r.text)
    if not m:
        return None
    return float(m.group(1)) * (1e9 if m.group(2) == "B" else 1e6)


def bars(t):
    r = get(WEB, f"https://query1.finance.yahoo.com/v8/finance/chart/{t.replace('.', '-')}",
            params={"range": "6mo", "interval": "1d"})
    try:
        res = r.json()["chart"]["result"][0]
        q = res["indicators"]["quote"][0]
        out = [(datetime.fromtimestamp(ts, timezone.utc).astimezone(NY).date(), c, v)
               for ts, c, v in zip(res["timestamp"], q["close"], q["volume"]) if c and v is not None]
        if len(out) >= 40:
            return out
    except Exception:
        pass
    return stooq_bars(t)


def stooq_bars(t):
    """Fallback when Yahoo blocks the runner: Stooq daily CSV, last ~6 months."""
    r = get(WEB, "https://stooq.com/q/d/l/", params={"s": f"{t.replace('.', '-').lower()}.us", "i": "d",
                                                    "d1": (date.today() - timedelta(days=185)).strftime("%Y%m%d")})
    out = []
    for line in (r.text.splitlines()[1:] if r else []):
        p = line.split(",")
        try:
            out.append((date.fromisoformat(p[0]), float(p[4]), float(p[5])))
        except (IndexError, ValueError):
            pass
    return out


def filings(cik, since):
    r = get(SEC, f"https://data.sec.gov/submissions/CIK{int(cik):010d}.json", pause=0.11)
    if not r:
        return [], ""
    j = r.json()
    f = j["filings"]["recent"]
    out = []
    for i, form in enumerate(f["form"]):
        if f["filingDate"][i] < since:
            break
        if form not in ("8-K", "6-K"):
            continue
        acc = datetime.fromisoformat(f["acceptanceDateTime"][i].replace("Z", "+00:00")).astimezone(NY)
        items = [x.strip() for x in (f["items"][i] or "").split(",") if x.strip()]
        out.append({"date": f["filingDate"][i], "form": form, "items": items, "accepted": acc})
    return out, str(j.get("sic") or "")


def pct_ranks(values, reverse=False):
    """Percentile rank 0..100 for each value (ties share the average rank)."""
    order = sorted(range(len(values)), key=lambda i: values[i], reverse=reverse)
    ranks = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        avg = (i + j) / 2
        for k in range(i, j + 1):
            ranks[order[k]] = 100.0 * avg / max(len(values) - 1, 1)
        i = j + 1
    return ranks


def score_one(t, cik, cap, since):
    rec = {"ticker": t, "cik": cik, "status": "scored", "reason": "", "flags": []}
    if not cik:
        return {**rec, "status": "no_score", "reason": "No SEC filer id"}
    fl, sic = filings(cik, since)
    if sic in EXCLUDE_SIC:
        return {**rec, "status": "no_score", "reason": EXCLUDE_SIC[sic]}
    b = bars(t)
    if len(b) < 40:
        return {**rec, "status": "no_score", "reason": "No price history"}
    sessions = [d for d, _, _ in b]
    price = b[-1][1]
    last30 = b[-30:]
    dollar_vol = statistics.mean(c * v for _, c, v in last30)

    used = {"2.02": 0.0, "8.01": 0.0, "6-K": 0.0, "other": 0.0}
    caps = {"2.02": CAP_RESULTS, "8.01": CAP_OTHER, "6-K": CAP_6K, "other": 99.0}
    reactions, moves = [], []
    for f in fl:  # newest first, so when a cap bites the most recent news is what counts
        red = [RED[x] for x in f["items"] if x in RED]
        if red:
            rec["flags"].extend(red)
        if f["form"] == "6-K":
            bucket, w = "6-K", 0.5
        else:
            hits = [x for x in f["items"] if x in MATERIAL]
            if not hits:
                continue
            best = max(hits, key=lambda x: ITEM_WEIGHT[x])
            w = ITEM_WEIGHT[best]
            bucket = best if best in ("2.02", "8.01") else "other"
        if used[bucket] + w > caps[bucket] + 1e-9:
            continue
        used[bucket] += w
        acc = f["accepted"]
        first = acc.date() + timedelta(days=1 if acc.hour >= 16 else 0)
        idx = next((i for i, d in enumerate(sessions) if d >= first), None)
        if idx is None or idx < 21:
            continue
        avg = statistics.mean(v for _, _, v in b[idx - 20: idx])
        if avg:
            reactions.append(b[idx][2] / avg)
            moves.append(abs(b[idx][1] / b[idx - 1][1] - 1) * 100)

    news = round(sum(used.values()), 1)
    rec.update({"price": round(price, 2), "mcap": round(cap) if cap else None,
                "dollar_vol": round(dollar_vol), "news": news, "sic": sic,
                "reaction_x": round(statistics.mean(reactions), 2) if reactions else None,
                "move_pct": round(statistics.mean(moves), 1) if moves else None,
                "turnover_days": round(cap / dollar_vol) if cap and dollar_vol else None,
                "flags": sorted(set(rec["flags"]))})
    if price < MIN_PRICE:
        return {**rec, "status": "no_score", "reason": "Price under $1"}
    if dollar_vol < MIN_DOLLAR_VOL:
        return {**rec, "status": "no_score", "reason": "Under $500K traded a day"}
    if news < MIN_FILINGS:
        return {**rec, "status": "no_score", "reason": "Not enough material news in 90 days"}
    if rec["reaction_x"] is None or rec["turnover_days"] is None:
        return {**rec, "status": "no_score", "reason": "Missing reaction or market cap data"}
    return rec


def main():
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else None
    OUT.mkdir(exist_ok=True)
    asof = date.today()
    since = (asof - timedelta(days=LOOKBACK_DAYS)).isoformat()

    tickers = directory_tickers()[:limit] if limit else directory_tickers()
    sec = get(SEC, "https://www.sec.gov/files/company_tickers.json").json().values()
    cikmap = {v["ticker"].upper(): v["cik_str"] for v in sec}
    caps = nasdaq_caps()
    print(f"{len(tickers)} tickers, {len(caps)} Nasdaq caps", file=sys.stderr)

    def cap_for(t):
        return caps.get(t) or caps.get(t.replace("-", ".")) or snapshot_cap(t)

    with ThreadPoolExecutor(6) as ex:
        capvals = list(ex.map(cap_for, tickers))

    recs = []
    for n, (t, cap) in enumerate(zip(tickers, capvals), 1):
        cik = cikmap.get(t) or cikmap.get(t.replace(".", "-"))
        try:
            recs.append(score_one(t, cik, cap, since))
        except Exception as e:  # one bad ticker never kills the run
            recs.append({"ticker": t, "status": "no_score", "reason": f"Error: {type(e).__name__}", "flags": []})
        if n % 100 == 0:
            print(f"{n}/{len(tickers)}", file=sys.stderr)

    # One company, one row: keep the most traded share class.
    best = {}
    for r in recs:
        if r["status"] == "scored" and r.get("cik"):
            if r["cik"] not in best or r["dollar_vol"] > best[r["cik"]]["dollar_vol"]:
                best[r["cik"]] = r
    for r in recs:
        if r["status"] == "scored" and r.get("cik") and best[r["cik"]] is not r:
            r.update(status="no_score", reason=f"Second share class of {best[r['cik']]['ticker']}")
    scored = [r for r in recs if r["status"] == "scored"]
    if not limit and len(scored) < 100:
        sys.exit(f"Only {len(scored)} companies scored. Price data is probably blocked. Keeping last week's scores.")
    news_p = pct_ranks([r["news"] for r in scored])
    react_p = pct_ranks([r["reaction_x"] for r in scored], reverse=True)   # lower reaction ranks higher
    turn_p = pct_ranks([r["turnover_days"] for r in scored])
    for r, a, b, c in zip(scored, news_p, react_p, turn_p):
        r["news_pct"], r["reaction_pct"], r["turnover_pct"] = round(a), round(b), round(c)
        r["score"] = round(WEIGHTS["news"] * a + WEIGHTS["reaction"] * b + WEIGHTS["turnover"] * c)
        r["leaderboard"] = not r["flags"]
    scored.sort(key=lambda r: -r["score"])
    for i, r in enumerate([r for r in scored if r["leaderboard"]], 1):
        r["rank"] = i

    meta = {"asof": asof.isoformat(), "lookback_days": LOOKBACK_DAYS, "weights": WEIGHTS,
            "directory": len(tickers), "scored": len(scored),
            "no_score": len(recs) - len(scored)}
    (OUT / "sleeper_scores.json").write_text(json.dumps({"meta": meta, "rows": scored + [r for r in recs if r["status"] != "scored"]}, indent=1, default=str))

    cols = ["rank", "ticker", "score", "news", "news_pct", "reaction_x", "reaction_pct", "turnover_days", "turnover_pct",
            "move_pct", "price", "mcap", "dollar_vol", "flags", "status", "reason"]
    with open(OUT / "sleeper_scores.csv", "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for r in scored + [r for r in recs if r["status"] != "scored"]:
            w.writerow({**r, "flags": "; ".join(r.get("flags", []))})

    def q(v):
        return "NULL" if v is None else (str(v) if isinstance(v, (int, float)) else "'" + str(v).replace("'", "''") + "'")
    sql = ["CREATE TABLE IF NOT EXISTS sleeper_scores (ticker TEXT PRIMARY KEY, asof TEXT, score INTEGER, rank INTEGER, "
           "news REAL, news_pct INTEGER, reaction_x REAL, reaction_pct INTEGER, turnover_days INTEGER, turnover_pct INTEGER, "
           "move_pct REAL, flags TEXT, status TEXT, reason TEXT);"]
    for r in scored + [r for r in recs if r["status"] != "scored"]:
        sql.append("INSERT OR REPLACE INTO sleeper_scores VALUES (" + ", ".join(q(x) for x in [
            r["ticker"], meta["asof"], r.get("score"), r.get("rank"), r.get("news"), r.get("news_pct"), r.get("reaction_x"),
            r.get("reaction_pct"), r.get("turnover_days"), r.get("turnover_pct"), r.get("move_pct"),
            "; ".join(r.get("flags", [])), r["status"], r.get("reason", "")]) + ");")
    # Replace rows in place, then drop tickers that left the directory. Never an empty table mid-write.
    sql.append(f"DELETE FROM sleeper_scores WHERE asof <> {q(meta['asof'])};")
    (OUT / "sleeper_scores.sql").write_text("\n".join(sql) + "\n")
    print(json.dumps(meta), file=sys.stderr)


if __name__ == "__main__":
    main()

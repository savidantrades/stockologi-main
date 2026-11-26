// Shared renderers for the Stockologi directory (Pages Functions).
// Pages, not the browser, builds every page so Google and AI agents get full HTML.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function fmtMcap(v) {
  if (!v) return 'n/a';
  return v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : `$${Math.round(v / 1e6)}M`;
}

export function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function cleanName(n) {
  return String(n || '')
    .replace(/\s+(Class [A-C] )?(Common Stock|Common Shares|Ordinary Shares?|Subordinate Voting Shares|Common Shares of Beneficial Interest)\b.*$/i, '')
    .trim();
}

// 8-K item codes in plain English. flag = worth a closer read.
export const ITEMS = {
  '1.01': ['Signed a material agreement'],
  '1.02': ['Ended a material agreement', 'flag'],
  '1.03': ['Bankruptcy or receivership', 'flag'],
  '1.05': ['Cybersecurity incident', 'flag'],
  '2.01': ['Closed an acquisition or sale'],
  '2.02': ['Reported results'],
  '2.03': ['Took on new debt'],
  '2.04': ['Debt acceleration triggered', 'flag'],
  '2.05': ['Restructuring or exit costs', 'flag'],
  '2.06': ['Asset impairment', 'flag'],
  '3.01': ['Listing standards notice', 'flag'],
  '3.02': ['Sold unregistered shares', 'flag'],
  '3.03': ['Changed shareholder rights'],
  '4.01': ['Changed auditor', 'flag'],
  '4.02': ['Past financials unreliable', 'flag'],
  '5.01': ['Change in control', 'flag'],
  '5.02': ['Director or officer change'],
  '5.03': ['Bylaws or fiscal year change'],
  '5.07': ['Shareholder vote results'],
  '7.01': ['Investor disclosure (Reg FD)'],
  '8.01': ['Other material event'],
};
export function itemTags(items) {
  return String(items || '').split(',').map((c) => c.trim()).filter((c) => ITEMS[c])
    .map((c) => `<span class="itag${ITEMS[c][1] ? ' flag' : ''}" title="Item ${c}">${ITEMS[c][0]}</span>`).join(' ');
}

const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">';

export function shell({ title, desc, canonical, head = '', body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="color-scheme" content="light">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical.startsWith('http') ? canonical : 'https://stockologi.com' + canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${FONTS}
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/sheet.css">
<link rel="stylesheet" href="/assets/ticker.css">
${head}
</head>
<body>
<nav>
  <a class="nav-logo" href="/">Stock<span>ologi</span></a>
  <div class="nav-links">
    <a class="hide-sm" href="/sleepers/">Sleepers</a>
    <a class="hide-sm" href="/t/">Directory</a>
    <a class="hide-sm" href="/orphan-sheet/">Orphan Sheet</a>
    <a class="hide-sm" href="/tools/">Tools</a>
    <a href="/t/#claim">For companies</a>
    <details class="nav-menu"><summary aria-label="Menu">Menu</summary><div class="nav-drop" onclick="this.parentNode.removeAttribute('open')"><a href="/sleepers/">Top Sleepers</a><a href="/t/">Directory</a><a href="/tools/">Tools</a><a href="/orphan-sheet/">Orphan Sheets</a><a href="/#index">The Index</a><a href="/t/#claim">For companies</a></div></details>
  </div>
</nav>
${body}
<footer>
  <div class="foot-row"><span>&copy; 2026 Stockologi</span><span>hello@stockologi.com</span></div>
  <p class="disclosure">Stockologi is independent retail media and entertainment. Nothing here is financial, investment, tax or legal advice, or a recommendation to buy or sell any security. Company data comes from public SEC filings and exchange data and may contain errors; always read the source filing. Prices and market caps are snapshots, not live quotes.</p>
</footer>
<script src="/assets/sheet.js"></script>
</body>
</html>`;
}

function captureForm(prefix, kind, ticker, label, okMsg, ghost = false, showTicker = false) {
  const tick = showTicker
    ? `<input type="text" id="${prefix}Ticker" value="${esc(ticker)}" placeholder="Ticker" maxlength="12">`
    : `<input type="hidden" id="${prefix}Ticker" value="${esc(ticker)}">`;
  return `<div class="capture">
      <div class="capture-form${ghost ? ' ghost' : ''}" id="${prefix}Form">
        <input type="email" id="${prefix}Email" placeholder="${kind === 'issuer' ? 'you@company.com' : 'you@email.com'}" autocomplete="email">
        ${tick}
        <button type="button" onclick="submitForm('${prefix}','${kind}')">${label}</button>
      </div>
      <div class="capture-success" id="${prefix}Success">&#10003; ${okMsg}</div>
      <div class="capture-error" id="${prefix}Error">Something broke. Email hello@stockologi.com.</div>
    </div>`;
}

export function claimBox(name, ticker) {
  return `<div class="issuer-strip" id="claim">
    <div class="kicker">For ${esc(name || 'public companies')}</div>
    <h3>${ticker ? 'Is this your company? Claim the page.' : 'Run IR at a listed company? Claim your page.'}</h3>
    <p>Add your IR contact and deck, flag anything we got wrong, and see how many investors are watching your ticker. Free.</p>
    ${captureForm('issuer', 'issuer', ticker || '', 'Claim', 'Got it. We will verify and reply from hello@stockologi.com.', true, true)}
    <p class="capture-note">Claiming a page does not change the score. Editorial is not for sale.</p>
  </div>`;
}

// ---------- Ask an AI ----------
// Opens the reader's own assistant with our agent readable page preloaded.
const AIS = [
  ['ChatGPT', 'https://chatgpt.com/?q='],
  ['Claude', 'https://claude.ai/new?q='],
  ['Perplexity', 'https://www.perplexity.ai/search?q='],
  ['Grok', 'https://grok.com/?q='],
];
export function askAi(title, sub, prompt) {
  const q = encodeURIComponent(prompt);
  return `<div class="ask">
    <h3>${esc(title)}</h3>
    <p>${esc(sub)}</p>
    <div class="ask-btns">${AIS.map(([n, u]) => `<a class="ask-btn" href="${u}${q}" target="_blank" rel="noopener nofollow">${n}</a>`).join('')}</div>
  </div>`;
}

// ---------- PR Tape block (full analysis) ----------
const PARTS = [['substance', 'Substance'], ['follow_through', 'Follow through'], ['consistency', 'Consistency'], ['cadence', 'Cadence'], ['transparency', 'Transparency']];
const STATUS = { delivered: 'Delivered', in_progress: 'In progress', quiet: 'Gone quiet', slipped: 'Slipped' };
const DIR = { advancing: '&#8599; Advancing', stalled: '&#8594; Stalled', reversing: '&#8600; Reversing' };

function tapeBlock(t, a, name) {
  const s = a.story_score, mix = a.mix, n = (mix.hard + mix.soft + mix.filler) || 1;
  const count = (k) => a.promises.filter((p) => p.status === k).length;
  return `
  <div class="kicker">PR Tape &middot; Last ${a.window.releases} releases</div>
  <h2>Ten press releases. <em>Sixty seconds.</em></h2>
  <p class="sub">We read every release so you don't have to. The score judges how well the company tells its story and whether it does what it says. It says nothing about whether the stock is cheap.</p>
  <div class="tape-hero">
    <div class="grade-box"><div class="grade">${esc(s.grade)}</div><div><div class="grade-num">${s.score} / 100</div><div class="grade-lbl">Story Score</div></div></div>
    <div class="sixty">
      <div class="lbl">The story in 60 seconds</div>
      <p>${esc(a.story_in_60_seconds)}</p>
      <div class="mixbar"><div class="h" style="width:${Math.round(mix.hard / n * 100)}%"></div><div class="s" style="width:${Math.round(mix.soft / n * 100)}%"></div><div class="f" style="width:${Math.round(mix.filler / n * 100)}%"></div></div>
      <div class="mixkey"><span><i style="background:var(--green)"></i>${mix.hard} hard news</span><span><i style="background:var(--gold-light)"></i>${mix.soft} soft</span><span><i style="background:var(--red)"></i>${mix.filler} filler</span></div>
    </div>
  </div>
  <h3 class="sec">How the score breaks down</h3>
  <div class="parts">${PARTS.map(([k, l]) => `
    <div class="part"><div class="part-name">${l}</div><div class="part-bar"><div class="track"><div class="fill" style="width:${s[k].pts * 5}%"></div></div>${s[k].pts}/20</div><div class="part-why">${esc(s[k].why)}</div></div>`).join('')}
  </div>
  <h3 class="sec">Promise tracker: what they said vs what happened</h3>
  <div class="table-wrap" style="margin-top:0"><table class="promises">
    <thead><tr><th>Said on</th><th>Promise</th><th>Status</th><th>What happened</th></tr></thead>
    <tbody>${a.promises.map((p) => `
      <tr><td class="d">${fmtDate(p.made_on)}</td><td class="p">${esc(p.promise)}</td><td><span class="pill ${p.status}">${STATUS[p.status]}</span></td><td>${esc(p.evidence)}${p.evidence_on ? ` <span class="d">(${fmtDate(p.evidence_on)})</span>` : ''}</td></tr>`).join('')}
    </tbody></table></div>
  <div class="tally"><span>${count('delivered')} delivered</span><span>${count('in_progress')} in progress</span><span>${count('quiet')} gone quiet</span><span>${count('slipped')} slipped</span></div>
  <h3 class="sec">Storylines</h3>
  <div class="threads">${a.threads.map((th) => `
    <div class="thread"><div class="dir ${th.direction}">${DIR[th.direction]}</div><h4>${esc(th.thread)}</h4><p>${esc(th.note)}</p></div>`).join('')}
  </div>
  <h3 class="sec">Green flags and red flags</h3>
  <div class="flags">
    <div class="flagcol g"><h4>Telling it well</h4><ul>${a.green_flags.map((g) => `<li>${esc(g)}</li>`).join('')}</ul></div>
    <div class="flagcol r"><h4>Read closer</h4><ul>${a.red_flags.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>
  </div>
  <h3 class="sec">What to watch next</h3>
  <ol class="next">${a.watch_next.map((w) => `<li>${esc(w)}</li>`).join('')}</ol>
  <h3 class="sec">The releases, newest first</h3>
  <ul class="tl">${a.timeline.map((x) => `
    <li><div class="row"><span class="date">${fmtDate(x.date)}</span><span class="type">${esc(x.type)}</span><span class="pill ${x.substance}">${x.substance}</span></div>
      <h4>${esc(x.headline)}</h4><p>${esc(x.what_changed)} <a class="src" href="${esc(x.url)}" rel="nofollow">Source filing</a></p></li>`).join('')}
  </ul>
  <p class="method">How this works: an AI analyst reads the last ${a.window.releases} press releases ${t} filed with the SEC (8-K and 6-K exhibits), tracks every forward target across them, and scores the story on five parts. Releases a company does not file with the SEC are not included yet. Every line traces to a linked filing. Not investment advice and not a rating of the stock. Stockologi received no compensation from ${esc(name)}.</p>`;
}

// ---------- Sleeper Score ----------
// Scored weekly by scripts/sleeper_score.py. s = sleeper_scores row, board = leaderboard size.
export const VESPER = 'Vesper, Stockologi’s AI managing director';
// Board order: themes first, finance last. Everything not listed sits in the middle.
export const CORE_SECTORS = ['Energy', 'Technology', 'Industrials', 'Basic Materials', 'Utilities', 'Telecommunications'];
export const LAST_SECTORS = ['Finance'];
export const sectorTier = (x) => (CORE_SECTORS.includes(x) ? 0 : LAST_SECTORS.includes(x) ? 2 : 1);
const SLEEPER_METHOD = 'News flow counts material events filed with the SEC (8-K, 6-K) in the last 90 days: contracts, deals and acquisitions count fully, financings half. Results count once a quarter, and routine filings such as dividend notices are capped, so filing more paperwork cannot buy a higher score. Reaction is the average next session volume against its 20 day average after those filings. Turnover is market cap divided by average daily dollar volume over 30 sessions. Each part is ranked against every scored company in the directory, then weighted 40 / 30 / 30. Companies with no material news in the window (one results release qualifies), a price under $1 or under $500K traded a day get no score. Companies with a bankruptcy, delisting notice, impairment or restatement filing in the window are scored but kept off the board.';

function sleeperParts(s) {
  const rows = [
    ['News flow', s.news_pct, `${s.news} news points from SEC filings in 90 days. More than ${s.news_pct}% of the directory.`],
    ['Reaction', s.reaction_pct, `Next session volume averaged ${s.reaction_x}x normal after news. Quieter than ${s.reaction_pct}% of the directory.`],
    ['Turnover', s.turnover_pct, `${Number(s.turnover_days).toLocaleString()} days to trade the whole company. Slower than ${s.turnover_pct}% of the directory.`],
  ];
  return `<div class="parts">${rows.map(([l, p, why]) => `
    <div class="part"><div class="part-name">${l}</div><div class="part-bar"><div class="track"><div class="fill" style="width:${p}%"></div></div>${p}</div><div class="part-why">${esc(why)}</div></div>`).join('')}
  </div>`;
}

export function sleeperBlock(t, s, place) {
  if (!s) return '';
  if (s.status !== 'scored') {
    return `
  <div class="kicker">Sleeper Score</div>
  <h2>No score <em>this week.</em></h2>
  <p class="sub">${esc(t)} is not scored right now: ${esc(String(s.reason || '').toLowerCase())}. Scores refresh weekly. <a href="/sleepers/">See the board</a>.</p>`;
  }
  const onBoard = s.rank != null && place;
  const where = place?.sector ? `in ${esc(place.sector)}` : 'overall';
  const boardUrl = place?.sector ? `/sleepers/?sector=${encodeURIComponent(place.sector)}` : '/sleepers/';
  return `
  <div class="kicker">Sleeper Score &middot; Scored by ${esc(VESPER)}</div>
  <h2>Real news. <em>Flat attention.</em></h2>
  <p class="sub">How much real news ${esc(t)} put out against how much the market traded it. Higher means more news and less attention. It says nothing about whether the stock is cheap.</p>
  <div class="tape-hero">
    <div class="grade-box"><div class="grade">${s.score}</div><div><div class="grade-num">/ 100</div><div class="grade-lbl">Sleeper Score</div></div></div>
    <div class="sixty">
      <div class="lbl">${onBoard ? `#${place.pos} of ${place.of} ${where}` : 'Scored, kept off the board'}</div>
      <p>${onBoard
        ? `${esc(t)} ranks #${place.pos} of ${place.of} ${where} on this week’s Top Sleepers board. <a href="${boardUrl}">See the ${place.sector ? esc(place.sector) + ' ' : ''}board</a>.`
        : `Kept off the board because of a recent filing worth a closer read: ${esc(s.flags)}.`}</p>
    </div>
  </div>
  <h3 class="sec">How the score breaks down</h3>
  ${sleeperParts(s)}
  <p class="method">How this works: ${SLEEPER_METHOD} As of ${fmtDate(s.asof)}. Measures attention against news flow. Not a rating, a recommendation or a view on the stock. Stockologi received no compensation from this company.</p>`;
}

// ---------- Top Sleepers board ----------
// groups = [{ title, note, rows, total, sector? }], numbered within each group.
function boardTable(rows) {
  return `<div class="table-wrap" style="margin-top:0"><table class="dir sleepers">
    <thead><tr><th>#</th><th>Ticker</th><th>Company</th><th>Score</th><th>News points, 90d</th><th>Next day volume</th><th>Days to turn over</th></tr></thead>
    <tbody>${rows.map((r, i) => `
      <tr><td class="d">${i + 1}</td><td><a class="sym-link" href="/t/${r.ticker}">${r.ticker}</a></td>
      <td><a href="/t/${r.ticker}">${esc(cleanName(r.name))}</a><div class="d">${esc(r.sector || '')} &middot; ${esc(r.sic_desc || r.industry || '')} &middot; ${fmtMcap(r.mcap)}</div></td>
      <td><b>${r.score}</b></td><td class="d">${r.news}</td><td class="d">${r.reaction_x}x</td><td class="d">${Number(r.turnover_days).toLocaleString()}</td></tr>`).join('')}
    </tbody></table></div>`;
}

export function sleepersPage({ groups, sectors, sector, asof, scored }) {
  const ordered = [...sectors].sort((a, b) => sectorTier(a.sector) - sectorTier(b.sector) || b.n - a.n);
  const chips = ordered.map((x) => `<a class="chip${x.sector === sector ? ' on' : ''}" href="/sleepers/?sector=${encodeURIComponent(x.sector)}">${esc(x.sector || 'Other')} <span>${x.n}</span></a>`).join('');
  const has = groups.some((g) => g.rows.length);
  const body = `
<header class="tk-head">
  <div class="kicker">Top Sleepers${asof ? ` &middot; Week of ${fmtDate(asof)}` : ''}</div>
  <h1 style="font-size:clamp(2.2rem,5vw,3.6rem);line-height:1.08;margin-bottom:1rem">Real news. Flat attention. <em style="color:var(--gold-light)">Wall Street is asleep on these.</em></h1>
  <p class="dek" style="max-width:680px">Every week ${esc(VESPER)}, scores the directory: how much real news a company filed in the last 90 days against how much the market traded it. Higher score, more news, less attention. Not a rating or a view on any stock.</p>
  <div class="chips"><a class="chip${!sector ? ' on' : ''}" href="/sleepers/">All</a>${chips}</div>
</header>
<div class="divider"></div>
<section class="tk">
  ${has ? groups.filter((g) => g.rows.length).map((g, i) => `
  <h3 class="sec"${i ? '' : ' style="margin-top:0"'}>${esc(g.title)} &middot; top ${g.rows.length} of ${g.total.toLocaleString()}</h3>
  ${g.note ? `<p class="sub" style="margin:-0.4rem 0 0.9rem">${g.note}</p>` : ''}
  ${boardTable(g.rows)}`).join('') : `
  <h2>The first board is <em>being scored.</em></h2>
  <p class="sub">Vesper publishes the first Top Sleepers board shortly. Every company in the directory, ranked.</p>`}
  <h3 class="sec">How the score works</h3>
  <p class="method" style="margin-top:0">${SLEEPER_METHOD}${scored ? ` This week ${scored.toLocaleString()} companies qualified for a score.` : ''} Money never changes a score or a rank.</p>
  ${claimBox('', '')}
</section>`;
  return shell({
    title: sector ? `Top Sleepers in ${sector}: real news, flat attention | Stockologi` : 'Top Sleepers: small and mid caps with real news and flat attention | Stockologi',
    desc: 'Every week Stockologi ranks US listed small and mid caps by real news filed against market attention. The Sleeper Score, scored by Vesper, Stockologi’s AI managing director.',
    canonical: sector ? `/sleepers/?sector=${encodeURIComponent(sector)}` : '/sleepers/',
    body,
  });
}

// ---------- Answer first: the lines AI engines lift ----------
// One canonical definition, word for word everywhere, so engines describe the score in our words.
export const SLEEPER_DEF = 'The Sleeper Score, published weekly by Stockologi, measures how much material news a company filed with the SEC in the last 90 days against how much the market traded it. Higher means more news and less attention. It is not a rating or a view on the stock.';

const plain = (items) => String(items || '').split(',').map((i) => ITEMS[i.trim()]?.[0]).filter(Boolean).join(', ').toLowerCase();
const daysAgo = (d) => (Date.now() - new Date(d + 'T00:00:00Z').getTime()) / 864e5;
const newest = (...ds) => ds.filter(Boolean).sort().pop() || null;

// Facts only, every number dated. Returns { brief, faq: [[q, a]], rows: [[label, value]] }.
function answerFacts(c, releases, filings, sleeper, place) {
  const t = c.ticker, name = cleanName(c.name);
  const tc = (x) => String(x || '').toLowerCase().replace(/\b[a-z]/g, (m) => m.toUpperCase());
  const where = [tc(c.city), c.state].filter(Boolean).join(', ');
  const what = c.sic_desc || c.industry || c.sector || 'public';
  const scored = sleeper && sleeper.status === 'scored';
  const recent = filings.filter((f) => /^(8-K|6-K)/.test(f.form) && daysAgo(f.date) <= 90);
  const lastRel = releases[0] || null;

  const s1 = `${name} (${c.exchange}: ${t}) is a${where ? ` ${where} based` : ''} company in ${what}${c.sic_desc ? ' (SEC industry code)' : ''}, with a market cap of ${fmtMcap(c.mcap)} as of ${fmtDate(c.price_asof)}.`;
  const s2 = lastRel
    ? `Its latest press release, on ${fmtDate(lastRel.date)}, was titled "${lastRel.title}"${recent.length ? `, and it filed ${recent.length} current report${recent.length > 1 ? 's' : ''} (8-K or 6-K) with the SEC in the last 90 days` : ''}.`
    : recent.length ? `It filed ${recent.length} current report${recent.length > 1 ? 's' : ''} (8-K or 6-K) with the SEC in the last 90 days.` : '';
  const s3 = scored
    ? `Its Stockologi Sleeper Score is ${sleeper.score} out of 100 as of ${fmtDate(sleeper.asof)}${sleeper.rank != null && place ? `, #${place.pos} of ${place.of} ${place.sector ? `in ${place.sector}` : 'overall'}` : ''}.`
    : '';
  const brief = [s1, s2, s3].filter(Boolean).join(' ');

  const faq = [];
  if (scored) {
    faq.push([`What is ${t}'s Sleeper Score?`,
      `${t} has a Sleeper Score of ${sleeper.score} out of 100 as of ${fmtDate(sleeper.asof)}. It filed ${sleeper.news} news points with the SEC in 90 days, and next session volume averaged ${sleeper.reaction_x}x normal after that news. ${SLEEPER_DEF}`]);
  }
  if (lastRel) {
    faq.push([`What did ${name} announce most recently?`,
      `On ${fmtDate(lastRel.date)}, ${name} released "${lastRel.title}"${plain(lastRel.items) ? ` (${plain(lastRel.items)})` : ''}. The full release is on SEC.gov.`]);
  }
  faq.push([`Is ${t} stock a buy?`,
    `Stockologi does not rate stocks or say whether to buy or sell them. This page tracks what ${name} has filed with the SEC and how much attention the market paid to it. Read the source filings and decide for yourself.`]);
  faq.push([`Where does this data come from?`,
    `Press releases and current reports come from SEC EDGAR filings. Market cap is a snapshot from exchange data as of ${fmtDate(c.price_asof)}, not a live quote. Stockologi received no compensation from ${name}.`]);

  const rows = [
    ['Ticker', `${c.exchange}: ${t}`],
    ['Industry', c.sic_desc || c.industry || ''],
    ['Headquarters', where],
    ['Market cap', `${fmtMcap(c.mcap)} (as of ${fmtDate(c.price_asof)})`],
    scored ? ['Sleeper Score', `${sleeper.score} / 100 (as of ${fmtDate(sleeper.asof)})`] : null,
    lastRel ? ['Latest release', fmtDate(lastRel.date)] : null,
    ['SEC reports, last 90 days', String(recent.length)],
  ].filter((r) => r && r[1]);

  const short = [s1, s3].filter(Boolean).join(' ');
  return { brief, short, faq, rows };
}

function answerBlock(t, f) {
  return `<section class="tk brief" id="brief">
  <div class="kicker">In brief</div>
  <h2>What is happening at ${esc(t)}?</h2>
  <p class="brief-lede">${esc(f.brief)}</p>
  <table class="brief-facts"><tbody>${f.rows.map(([l, v]) => `<tr><th scope="row">${esc(l)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
</section>`;
}

function faqBlock(f) {
  return `<section class="tk faq" id="faq">
  <div class="kicker muted">Questions people ask</div>
  ${f.faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('\n  ')}
</section>`;
}

// ---------- Ticker page ----------
export function tickerPage(c, releases, filings, tape, sleeper = null, place = null) {
  const t = c.ticker, name = cleanName(c.name);
  const a = tape ? JSON.parse(tape.data) : null;
  const facts = answerFacts(c, releases, filings, sleeper, place);
  const desc = facts.short;
  const flagged = filings.filter((f) => String(f.items).split(',').some((i) => ITEMS[i.trim()]?.[1]));

  const latest = releases.length ? `
  <h3 class="sec">Latest press releases</h3>
  <ul class="tl">${releases.map((r) => `
    <li><div class="row"><span class="date">${fmtDate(r.date)}</span>${itemTags(r.items)}</div>
      <h4>${esc(r.title)}</h4><p><a class="src" href="${esc(r.url)}" rel="nofollow">Read the release on SEC.gov</a></p></li>`).join('')}
  </ul>` : '';

  const filingRows = filings.length ? `
  <h3 class="sec">Recent SEC filings in plain English</h3>
  <div class="table-wrap" style="margin-top:0"><table class="promises">
    <thead><tr><th>Date</th><th>Form</th><th>What it says</th></tr></thead>
    <tbody>${filings.map((f) => `<tr><td class="d">${fmtDate(f.date)}</td><td class="d">${esc(f.form)}</td><td>${itemTags(f.items) || '<span class="d">Exhibit only</span>'}</td></tr>`).join('')}</tbody>
  </table></div>
  ${flagged.length ? `<p class="tally"><span style="color:var(--red)">${flagged.length} filing${flagged.length > 1 ? 's' : ''} worth a closer read</span></p>` : ''}` : '';

  const tapeSection = a ? tapeBlock(t, a, name) : `
  <div class="kicker">PR Tape</div>
  <h2>The full story is <em>being built.</em></h2>
  <p class="sub">PR Tape reads ${esc(name)}'s last ten press releases, tracks every promise against what happened, and grades how well the company tells its story. Watch ${t} and you get it the day it goes live.</p>`;

  const body = `
<header class="tk-head">
  <div class="tk-crumb"><a href="/t/">Directory</a> &middot; <a href="/t/?sector=${encodeURIComponent(c.sector || '')}">${esc(c.sector || 'Other')}</a> &middot; ${esc(c.sic_desc || c.industry || '')}</div>
  <div class="tk-title"><span class="sym">${t}</span><h1>${esc(name)}</h1></div>
  <div class="tk-facts">
    <span>${esc(c.exchange)}</span>
    <span>${esc([c.city, c.state].filter(Boolean).join(', '))}</span>
    <span>Mkt cap <b>${fmtMcap(c.mcap)}</b> (snapshot ${fmtDate(c.price_asof)})</span>
    ${sleeper && sleeper.status === 'scored' ? `<span><a href="#sleeper" style="color:inherit">Sleeper Score <b>${sleeper.score}</b></a></span>` : ''}
    ${a ? `<span>Story Score <b>${esc(a.story_score.grade)}</b></span>` : ''}
    <span><a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${c.cik}&type=8-K" rel="nofollow" style="color:inherit">All SEC filings</a></span>
  </div>
  <div class="watch">
    <div class="watch-copy"><b>Watch ${t}.</b> Get an email when a new release drops${a ? ', with the updated score' : ', plus the PR Tape when it goes live'}.</div>
    ${captureForm('watch', 'watch', t, 'Watch', `Watching ${t}. You will hear when it files.`)}
  </div>
</header>
<div class="divider"></div>
${answerBlock(t, facts)}
<div class="divider"></div>
${sleeper ? `<section class="tk" id="sleeper">${sleeperBlock(t, sleeper, place)}</section>
<div class="divider"></div>` : ''}
<section class="tk" id="tape">
  ${tapeSection}
  ${a ? '' : latest}
  ${filingRows}
</section>
<section class="tk" style="padding-top:0">
  ${askAi(`Ask an AI about ${t}`, `Opens your assistant with ${name}'s ${a ? 'press releases, filings and PR Tape' : 'press releases and filings'} already loaded.`,
    `Read https://stockologi.com/t/${t}.md which covers ${name} (${t}): its latest press releases, SEC filings in plain English${a ? ' and its PR Tape story score' : ''}. Give me a plain English summary of what the company is doing, what it has promised versus delivered, and anything worth a closer look. Then answer my follow up questions. Use only that page and the SEC filings it links. This is research, not investment advice.`)}
</section>
<div class="divider"></div>
${faqBlock(facts)}
<div class="divider"></div>
<section class="tk">
  <div class="kicker muted">More on ${t}</div>
  <div class="soon">
    ${sleeper ? '' : '<div><div class="tag">Coming soon</div><h4>Sleeper Score</h4><p>News flow against attention. Is the market asleep on real progress?</p></div>'}
    <div><div class="tag">Coming soon</div><h4>Who owns it</h4><p>Conviction funds split from market makers and quant shops.</p></div>
    <div><div class="tag">Coming soon</div><h4>Insider buys</h4><p>Open market purchases by officers and directors from Form 4.</p></div>
  </div>
  ${claimBox(name, t)}
</section>`;

  const url = `https://stockologi.com/t/${t}`;
  const modified = newest(c.updated, c.price_asof, sleeper?.asof, releases[0]?.date, filings[0]?.date);
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': url, url, name: `${t} ${name}`, description: facts.brief, dateModified: modified,
        publisher: { '@type': 'Organization', name: 'Stockologi', url: 'https://stockologi.com' },
        about: { '@type': 'Corporation', name, tickerSymbol: `${c.exchange}: ${t}`,
          address: c.city || c.state ? { '@type': 'PostalAddress', addressLocality: c.city || undefined, addressRegion: c.state || undefined } : undefined } },
      { '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity: facts.faq.map(([q, ans]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: ans } })) },
    ],
  };
  return shell({
    title: a ? `${t} press releases decoded | ${name} Story Score ${a.story_score.grade} | Stockologi` : `${t} ${name}: press releases and SEC filings in plain English | Stockologi`,
    desc, canonical: `/t/${t}`,
    head: `<link rel="alternate" type="text/markdown" href="/t/${t}.md"><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`,
    body,
  });
}

// ---------- Markdown twin for agents ----------
export function tickerMd(c, releases, filings, tape, sleeper = null, place = null) {
  const t = c.ticker, name = cleanName(c.name);
  const f = answerFacts(c, releases, filings, sleeper, place);
  const L = [`# ${t}: ${name}`, '', '## In brief', '', f.brief, '',
    ...f.rows.map(([l, v]) => `- ${l}: ${v}`), '',
    `Exchange: ${c.exchange}. Sector: ${c.sector}. Industry: ${c.sic_desc || c.industry}. HQ: ${[c.city, c.state].filter(Boolean).join(', ')}.`,
    `Market cap snapshot: ${fmtMcap(c.mcap)} as of ${c.price_asof}. Page: https://stockologi.com/t/${t}`, ''];
  if (sleeper && sleeper.status === 'scored') {
    L.push(`## Sleeper Score: ${sleeper.score}/100 (as of ${sleeper.asof})`, '',
      sleeper.rank != null && place ? `Ranked #${place.pos} of ${place.of} ${place.sector ? `in ${place.sector}` : 'overall'} on the Top Sleepers board (https://stockologi.com/sleepers/${place.sector ? `?sector=${encodeURIComponent(place.sector)}` : ''}).` : `Scored but kept off the board: ${sleeper.flags}.`,
      `- News flow: ${sleeper.news} news points from SEC filings in 90 days (percentile ${sleeper.news_pct})`,
      `- Reaction: next session volume ${sleeper.reaction_x}x normal after news (percentile ${sleeper.reaction_pct}, quieter ranks higher)`,
      `- Turnover: ${sleeper.turnover_days} days to trade the whole company (percentile ${sleeper.turnover_pct})`,
      SLEEPER_DEF, '');
  }
  if (tape) {
    const a = JSON.parse(tape.data), s = a.story_score;
    L.push(`## PR Tape Story Score: ${s.grade} (${s.score}/100)`, '', a.story_in_60_seconds, '');
    PARTS.forEach(([k, l]) => L.push(`- ${l}: ${s[k].pts}/20. ${s[k].why}`));
    L.push('', '## Promise tracker', '', ...a.promises.map((p) => `- ${p.made_on}: ${p.promise} | ${STATUS[p.status]} | ${p.evidence}`));
    L.push('', '## Red flags', '', ...a.red_flags.map((x) => `- ${x}`), '', '## Watch next', '', ...a.watch_next.map((x) => `- ${x}`), '');
  }
  if (releases.length) L.push('## Latest press releases', '', ...releases.map((r) => `- ${r.date}: ${r.title} (${r.url})`), '');
  if (filings.length) L.push('## Recent SEC filings', '', ...filings.map((x) => `- ${x.date} ${x.form}: ${String(x.items).split(',').map((i) => ITEMS[i.trim()]?.[0]).filter(Boolean).join('; ') || 'exhibit only'}`), '');
  L.push('## Questions people ask', '', ...f.faq.flatMap(([q, a]) => [`### ${q}`, '', a, '']));
  L.push('Not investment advice. Not a rating of the stock.');
  return L.join('\n') + '\n';
}

// ---------- Directory index ----------
export function directoryPage({ rows, sectors, sector, q, total }) {
  const chips = sectors.map((s) => `<a class="chip${s.sector === sector ? ' on' : ''}" href="/t/?sector=${encodeURIComponent(s.sector)}">${esc(s.sector || 'Other')} <span>${s.n}</span></a>`).join('');
  const heading = q ? `Results for "${esc(q)}"` : sector ? esc(sector) : 'Latest news across the directory';
  const body = `
<header class="tk-head">
  <div class="kicker">The Directory &middot; ${total.toLocaleString()} companies</div>
  <h1 style="font-size:clamp(2.2rem,5vw,3.6rem);line-height:1.08;margin-bottom:1rem">Every US listed small and mid cap. <em style="color:var(--gold-light)">Decoded.</em></h1>
  <p class="dek" style="max-width:640px">US and Canadian companies from $300M to $3B. Their latest press releases, their SEC filings in plain English, and the PR Tape story tracker. Free.</p>
  <form class="dir-search" action="/t/" method="get">
    <input type="search" name="q" value="${esc(q || '')}" placeholder="Search ticker or company" autocomplete="off">
    <button type="submit">Search</button>
  </form>
  <div class="chips"><a class="chip${!sector && !q ? ' on' : ''}" href="/t/">Latest</a>${chips}</div>
</header>
<div class="divider"></div>
<section class="tk">
  <h3 class="sec" style="margin-top:0">${heading}</h3>
  <div class="table-wrap" style="margin-top:0"><table class="dir">
    <thead><tr><th>Ticker</th><th>Company</th><th>Mkt cap</th><th>Latest release</th></tr></thead>
    <tbody>${rows.map((r) => `
      <tr><td><a class="sym-link" href="/t/${r.ticker}">${r.ticker}</a>${r.grade ? ` <span class="pill in_progress">${esc(r.grade)}</span>` : ''}</td>
      <td><a href="/t/${r.ticker}">${esc(cleanName(r.name))}</a><div class="d">${esc(r.sic_desc || r.industry || '')}</div></td>
      <td class="d">${fmtMcap(r.mcap)}</td>
      <td>${r.title ? `<span class="d">${fmtDate(r.rdate)}</span> ${esc(r.title.length > 110 ? r.title.slice(0, 108) + '...' : r.title)}` : '<span class="d">No filed release yet</span>'}</td></tr>`).join('') || '<tr class="empty-row"><td colspan="4">Nothing found.</td></tr>'}
    </tbody></table></div>
  ${askAi('Ask an AI about the directory', 'Opens your assistant with all ' + total.toLocaleString() + ' companies already loaded.',
    'Read https://stockologi.com/llms.txt which indexes Stockologi\'s directory of US listed small and mid caps ($300M to $3B). Each company has a page at https://stockologi.com/t/TICKER.md with its latest press releases and SEC filings in plain English. Help me find companies that match what I ask for, and cite the company pages you used. This is research, not investment advice.')}
  ${claimBox('', '')}
</section>`;
  return shell({
    title: sector ? `${sector} small and mid caps: press releases decoded | Stockologi Directory` : 'Small and mid cap directory: press releases and SEC filings decoded | Stockologi',
    desc: `${total} US and Canadian small and mid caps with their latest press releases, SEC filings in plain English, and PR Tape story scores.`,
    canonical: sector ? `/t/?sector=${encodeURIComponent(sector)}` : '/t/',
    body,
  });
}

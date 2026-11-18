// GET /t/GEVO     -> ticker page (HTML)
// GET /t/GEVO.md  -> agent readable markdown twin
import { tickerPage, tickerMd, shell, esc } from '../../lib/render.js';

const HDR = { 'Cache-Control': 'public, max-age=900' };

// Sleeper Score row plus board size. Empty if the table is not loaded yet, so pages never break.
async function sleeperFor(env, t) {
  try {
    const [s, b] = await Promise.all([
      env.DB.prepare('SELECT * FROM sleeper_scores WHERE ticker = ?').bind(t).first(),
      env.DB.prepare('SELECT COUNT(*) AS n FROM sleeper_scores WHERE rank IS NOT NULL').first(),
    ]);
    return { s: s || null, board: b?.n || 0 };
  } catch {
    return { s: null, board: 0 };
  }
}

export async function onRequestGet({ params, env }) {
  let raw = String(params.ticker || '');
  const wantMd = raw.toLowerCase().endsWith('.md');
  const t = raw.replace(/\.md$/i, '').toUpperCase().replace(/[^A-Z0-9.\-]/g, '');

  const c = await env.DB.prepare('SELECT * FROM companies WHERE ticker = ?').bind(t).first();
  if (!c) {
    return new Response(shell({
      title: `${t} not in the directory | Stockologi`, desc: 'Ticker not found.', canonical: '/t/',
      body: `<header class="tk-head"><div class="kicker">Not found</div><h1 style="font-size:2.4rem">${esc(t)} is not in the directory.</h1><p class="dek">We cover US listed US and Canadian companies from $300M to $3B. <a href="/t/">Search the directory</a>.</p></header>`,
    }), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const [rel, fil, tape, sl] = await Promise.all([
    env.DB.prepare('SELECT date, form, items, title, url FROM releases WHERE ticker = ? ORDER BY date DESC LIMIT 10').bind(t).all(),
    env.DB.prepare('SELECT date, form, items, acc FROM filings WHERE ticker = ? ORDER BY date DESC LIMIT 10').bind(t).all(),
    env.DB.prepare('SELECT * FROM pr_tape WHERE ticker = ?').bind(t).first(),
    sleeperFor(env, t),
  ]);

  if (wantMd) {
    return new Response(tickerMd(c, rel.results, fil.results, tape, sl.s, sl.board), { headers: { ...HDR, 'Content-Type': 'text/markdown; charset=utf-8' } });
  }
  return new Response(tickerPage(c, rel.results, fil.results, tape, sl.s, sl.board), { headers: { ...HDR, 'Content-Type': 'text/html; charset=utf-8' } });
}

// GET /t/                 -> latest releases across the directory
// GET /t/?sector=Energy   -> one sector, biggest first
// GET /t/?q=gevo          -> search ticker or name
import { directoryPage } from '../../lib/render.js';

const BASE = `SELECT c.ticker, c.name, c.mcap, c.sic_desc, c.industry, c.last_release AS rdate,
  (SELECT title FROM releases r WHERE r.ticker = c.ticker ORDER BY r.date DESC LIMIT 1) AS title,
  p.grade
  FROM companies c LEFT JOIN pr_tape p ON p.ticker = c.ticker`;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const sector = (url.searchParams.get('sector') || '').slice(0, 60);
  const q = (url.searchParams.get('q') || '').trim().slice(0, 60);

  let stmt;
  if (q) {
    const like = `%${q}%`;
    stmt = env.DB.prepare(`${BASE} WHERE c.ticker = ? OR c.ticker LIKE ? OR c.name LIKE ? ORDER BY (c.ticker = ?) DESC, c.mcap DESC LIMIT 100`)
      .bind(q.toUpperCase(), `${q.toUpperCase()}%`, like, q.toUpperCase());
  } else if (sector) {
    stmt = env.DB.prepare(`${BASE} WHERE c.sector = ? ORDER BY c.last_release DESC LIMIT 400`).bind(sector);
  } else {
    stmt = env.DB.prepare(`${BASE} WHERE c.last_release IS NOT NULL ORDER BY c.last_release DESC LIMIT 100`);
  }

  const [rows, sectors, total] = await Promise.all([
    stmt.all(),
    env.DB.prepare("SELECT sector, COUNT(*) AS n FROM companies WHERE sector <> '' GROUP BY sector ORDER BY n DESC").all(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM companies').first(),
  ]);

  // One exact ticker hit: go straight to the page
  if (q && rows.results.length === 1) {
    return Response.redirect(`${url.origin}/t/${rows.results[0].ticker}`, 302);
  }

  return new Response(directoryPage({ rows: rows.results, sectors: sectors.results, sector, q, total: total.n }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': q ? 'no-store' : 'public, max-age=900' },
  });
}

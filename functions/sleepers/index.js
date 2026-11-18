// GET /sleepers/                 -> Top Sleepers board, top 100
// GET /sleepers/?sector=Energy   -> board for one sector
import { sleepersPage } from '../../lib/render.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const sector = (url.searchParams.get('sector') || '').slice(0, 60);
  let rows = [], sectors = [], asof = null, board = 0, scored = 0;
  try {
    const where = sector ? 'AND c.sector = ?' : '';
    const stmt = env.DB.prepare(`SELECT s.*, c.name, c.mcap, c.sic_desc, c.industry, c.sector
      FROM sleeper_scores s JOIN companies c ON c.ticker = s.ticker
      WHERE s.rank IS NOT NULL ${where} ORDER BY s.rank LIMIT 100`);
    const [r, sec, meta] = await Promise.all([
      (sector ? stmt.bind(sector) : stmt).all(),
      env.DB.prepare(`SELECT c.sector, COUNT(*) AS n FROM sleeper_scores s JOIN companies c ON c.ticker = s.ticker
        WHERE s.rank IS NOT NULL AND c.sector <> '' GROUP BY c.sector ORDER BY n DESC`).all(),
      env.DB.prepare(`SELECT MAX(asof) AS asof, SUM(rank IS NOT NULL) AS board, SUM(status = 'scored') AS scored FROM sleeper_scores`).first(),
    ]);
    rows = r.results; sectors = sec.results;
    asof = meta?.asof; board = meta?.board || 0; scored = meta?.scored || 0;
    if (sector) board = sectors.find((x) => x.sector === sector)?.n || 0;
  } catch {
    // table not loaded yet: page shows the "being scored" state
  }
  return new Response(sleepersPage({ rows, sectors, sector, asof, board, scored }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=900' },
  });
}

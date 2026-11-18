// GET /sleepers/                 -> Top Sleepers board in three blocks: themes, everything else, finance last
// GET /sleepers/?sector=Energy   -> board for one sector
import { sleepersPage, CORE_SECTORS, LAST_SECTORS } from '../../lib/render.js';

const BASE = `SELECT s.*, c.name, c.mcap, c.sic_desc, c.industry, c.sector
  FROM sleeper_scores s JOIN companies c ON c.ticker = s.ticker WHERE s.rank IS NOT NULL`;
const COUNT = `SELECT COUNT(*) AS n FROM sleeper_scores s JOIN companies c ON c.ticker = s.ticker WHERE s.rank IS NOT NULL`;
const qs = (a) => a.map(() => '?').join(',');

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const sector = (url.searchParams.get('sector') || '').slice(0, 60);
  let groups = [], sectors = [], asof = null, scored = 0;
  try {
    const [sec, meta] = await Promise.all([
      env.DB.prepare(`SELECT c.sector, COUNT(*) AS n FROM sleeper_scores s JOIN companies c ON c.ticker = s.ticker
        WHERE s.rank IS NOT NULL AND c.sector <> '' GROUP BY c.sector ORDER BY n DESC`).all(),
      env.DB.prepare(`SELECT MAX(asof) AS asof, SUM(status = 'scored') AS scored FROM sleeper_scores`).first(),
    ]);
    sectors = sec.results; asof = meta?.asof; scored = meta?.scored || 0;

    if (sector) {
      const r = await env.DB.prepare(`${BASE} AND c.sector = ? ORDER BY s.rank LIMIT 100`).bind(sector).all();
      groups = [{ title: sector, rows: r.results, total: sectors.find((x) => x.sector === sector)?.n || 0 }];
    } else {
      const fixed = [...CORE_SECTORS, ...LAST_SECTORS];
      const blocks = [
        { title: 'Energy, tech, industrials, materials, utilities, telecom', where: `AND c.sector IN (${qs(CORE_SECTORS)})`, binds: CORE_SECTORS, limit: 60 },
        { title: 'Everything else', where: `AND COALESCE(c.sector,'') NOT IN (${qs(fixed)})`, binds: fixed, limit: 25 },
        { title: 'Finance and banks', where: `AND c.sector IN (${qs(LAST_SECTORS)})`, binds: LAST_SECTORS, limit: 15,
          note: 'Banks file routine 8-Ks all year, so they score high on news by default. They sit at the bottom.' },
      ];
      groups = await Promise.all(blocks.map(async (b) => {
        const [r, n] = await Promise.all([
          env.DB.prepare(`${BASE} ${b.where} ORDER BY s.rank LIMIT ${b.limit}`).bind(...b.binds).all(),
          env.DB.prepare(`${COUNT} ${b.where}`).bind(...b.binds).first(),
        ]);
        return { title: b.title, note: b.note, rows: r.results, total: n?.n || 0 };
      }));
    }
  } catch {
    // table not loaded yet: page shows the "being scored" state
  }
  return new Response(sleepersPage({ groups, sectors, sector, asof, scored }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=900' },
  });
}

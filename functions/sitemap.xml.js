// GET /sitemap.xml -> every ticker page plus the main pages
export async function onRequestGet({ env }) {
  const rows = await env.DB.prepare('SELECT ticker, COALESCE(last_release, updated) AS lm FROM companies ORDER BY ticker').all();
  const u = (loc, lm) => `<url><loc>https://stockologi.com${loc}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ''}</url>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${u('/')}
${u('/t/')}
${u('/orphan-sheet/')}
${rows.results.map((r) => u(`/t/${r.ticker}`, r.lm)).join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

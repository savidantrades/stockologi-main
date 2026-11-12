// GET /llms.txt -> map of the site for AI agents
import { cleanName } from '../lib/render.js';

export async function onRequestGet({ env }) {
  const rows = await env.DB.prepare('SELECT c.ticker, c.name, c.sector, p.grade FROM companies c LEFT JOIN pr_tape p ON p.ticker = c.ticker ORDER BY c.ticker').all();
  const L = [
    '# Stockologi',
    '',
    '> Independent retail research on US listed US and Canadian small and mid caps ($300M to $3B). Every company has a page with its latest press releases, its SEC filings in plain English, and where available a PR Tape: an AI read of its last ten press releases that tracks promises against delivery and grades how well the company tells its story. Not investment advice.',
    '',
    '## How to use',
    '- Each company has a markdown page at https://stockologi.com/t/{TICKER}.md',
    '- Human pages are at https://stockologi.com/t/{TICKER}',
    '- Directory and search: https://stockologi.com/t/',
    '- Weekly Orphan Sheet (overlooked names with real news): https://stockologi.com/orphan-sheet/',
    '',
    '## PR Tape scored companies',
    ...rows.results.filter((r) => r.grade).map((r) => `- [${r.ticker}: ${cleanName(r.name)}, Story Score ${r.grade}](https://stockologi.com/t/${r.ticker}.md)`),
    '',
    '## All companies',
    ...rows.results.map((r) => `- [${r.ticker}: ${cleanName(r.name)}](https://stockologi.com/t/${r.ticker}.md) ${r.sector || ''}`),
    '',
  ];
  return new Response(L.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

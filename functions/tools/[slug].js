// GET /tools/dividend-trackers     -> guide (HTML)
// GET /tools/dividend-trackers.md  -> agent readable markdown twin
import { guideBySlug, guidePage, guideMarkdown } from '../../lib/tools.js';

export async function onRequestGet({ params, request }) {
  const raw = String(params.slug || '').toLowerCase();
  const wantMd = raw.endsWith('.md');
  const slug = raw.replace(/\.md$/, '').replace(/[^a-z0-9-]/g, '');
  const g = guideBySlug(slug);
  if (!g) return Response.redirect(new URL('/tools/', request.url).toString(), 302);
  if (wantMd) {
    return new Response(guideMarkdown(g), { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
  }
  return new Response(guidePage(g), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

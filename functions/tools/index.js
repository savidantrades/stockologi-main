// GET /tools/ -> hub of neutral best of guides
import { hubPage } from '../../lib/tools.js';

export async function onRequestGet() {
  return new Response(hubPage(), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

// Host routing plus edge cache.
// ir.stockologi.com/            -> issuer page (ticker prefilled from ?t=)
// ir.stockologi.com/<anything>  -> 301 to the same path on stockologi.com (no duplicate site)
// stockologi.com/ir             -> 301 to ir.stockologi.com
//
// Edge cache: Pages Functions output is never cached by Cloudflare on its own, whatever Cache-Control
// says, so every crawler hit ran fresh D1 queries. D1 only changes in the weekly refresh, so pages that
// read it are kept in the colo cache for EDGE_TTL. Browsers still get max-age=900.
// Search (?q=) is never cached. Junk query strings are dropped from the key so bots can't bust it.
import { irPage } from '../lib/ir.js';

const IR_HOST = 'ir.stockologi.com';
const PASS = [/^\/coverage-request$/, /^\/assets\//, /^\/favicon/, /^\/robots\.txt$/];

const EDGE_TTL = 6 * 3600;
const BROWSER_CC = 'public, max-age=900';
const CACHE_PATHS = [/^\/t\//, /^\/sleepers\//, /^\/tools\//, /^\/sitemap\.xml$/, /^\/llms\.txt$/];
const KEY_PARAMS = ['sector', 't']; // the only query params that change a cached page

function cacheKey(url) {
  const k = new URL(url.origin + url.pathname);
  for (const p of KEY_PARAMS) {
    const v = url.searchParams.get(p);
    if (v) k.searchParams.set(p, v);
  }
  return new Request(k.toString(), { method: 'GET' });
}

async function edgeCached({ request, waitUntil }, produce) {
  const url = new URL(request.url);
  const key = cacheKey(url);
  const cache = caches.default;

  const hit = await cache.match(key);
  if (hit) {
    const r = new Response(hit.body, hit);
    r.headers.set('Cache-Control', BROWSER_CC);
    r.headers.set('X-Edge-Cache', 'HIT');
    return r;
  }

  const res = await produce();
  const cc = res.headers.get('Cache-Control') || '';
  const ok = (res.status === 200 && cc.includes('public')) || (res.status === 404 && url.pathname.startsWith('/t/'));
  if (!ok) return res;

  const stored = new Response(res.clone().body, res);
  stored.headers.set('Cache-Control', `public, max-age=${EDGE_TTL}`);
  waitUntil(cache.put(key, stored));

  const out = new Response(res.body, res);
  out.headers.set('X-Edge-Cache', 'MISS');
  return out;
}

export async function onRequest(ctx) {
  const { request, env, next } = ctx;
  const url = new URL(request.url);
  const isGet = request.method === 'GET';

  if (url.hostname === IR_HOST) {
    if (PASS.some((r) => r.test(url.pathname))) return next();
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const render = async () => {
        const ticker = (url.searchParams.get('t') || '').toUpperCase().replace(/[^A-Z0-9.\-]/g, '').slice(0, 12);
        let companies = 0;
        try { companies = (await env.DB.prepare('SELECT COUNT(*) AS n FROM companies').first())?.n || 0; } catch {}
        return new Response(irPage({ ticker, companies }), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': BROWSER_CC },
        });
      };
      return isGet ? edgeCached(ctx, render) : render();
    }
    return Response.redirect(`https://stockologi.com${url.pathname}${url.search}`, 301);
  }

  if (url.pathname === '/ir' || url.pathname === '/ir/') {
    return Response.redirect(`https://${IR_HOST}/${url.search}`, 301);
  }

  if (isGet && !url.searchParams.has('q') && CACHE_PATHS.some((r) => r.test(url.pathname))) {
    return edgeCached(ctx, () => next());
  }

  return next();
}

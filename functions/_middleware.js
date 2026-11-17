// Host routing.
// ir.stockologi.com/            -> issuer page (ticker prefilled from ?t=)
// ir.stockologi.com/<anything>  -> 301 to the same path on stockologi.com (no duplicate site)
// stockologi.com/ir             -> 301 to ir.stockologi.com
import { irPage } from '../lib/ir.js';

const IR_HOST = 'ir.stockologi.com';
const PASS = [/^\/coverage-request$/, /^\/assets\//, /^\/favicon/, /^\/robots\.txt$/];

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);

  if (url.hostname === IR_HOST) {
    if (PASS.some((r) => r.test(url.pathname))) return next();
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const ticker = (url.searchParams.get('t') || '').toUpperCase().replace(/[^A-Z0-9.\-]/g, '').slice(0, 12);
      let companies = 0;
      try { companies = (await env.DB.prepare('SELECT COUNT(*) AS n FROM companies').first())?.n || 0; } catch {}
      return new Response(irPage({ ticker, companies }), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=900' },
      });
    }
    return Response.redirect(`https://stockologi.com${url.pathname}${url.search}`, 301);
  }

  if (url.pathname === '/ir' || url.pathname === '/ir/') {
    return Response.redirect(`https://${IR_HOST}/${url.search}`, 301);
  }

  return next();
}

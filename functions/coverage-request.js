// POST /coverage-request
// Handles both forms on stockologi.com:
//   type "retail" -> Orphan Sheet signup
//   type "issuer" -> coverage submission (email + ticker)
// Env: BREVO_API_KEY (required), RETAIL_LIST_ID (optional, defaults to 2), ISSUER_LIST_ID (optional, defaults to 2)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const shell = (title, inner) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a08;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a08;padding:40px 20px;"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
  <tr><td style="padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.07);">
    <div style="font-family:monospace;font-size:11px;letter-spacing:0.2em;color:#c9a84c;text-transform:uppercase;margin-bottom:8px;">Stockologi &middot; The Orphan Sheet</div>
    <div style="font-size:24px;font-weight:600;color:#e8e6df;line-height:1.2;">${title}</div>
  </td></tr>
  <tr><td style="padding:24px 0;font-size:15px;color:#b0ada4;line-height:1.8;">${inner}</td></tr>
  <tr><td style="padding-top:20px;border-top:1px solid rgba(255,255,255,0.07);font-size:11px;color:#55534c;line-height:1.7;">
    Stockologi is independent retail media and entertainment, not financial advice. Sponsored content is always labelled with compensation disclosed.<br>
    Save <strong style="color:#7a7870;">hello@stockologi.com</strong> to your contacts so we don't land in spam.
  </td></tr>
</table></td></tr></table></body></html>`;

const RETAIL_EMAIL = shell('You\'re on the list.', `
  <p style="margin:0 0 16px;">Every Monday you get the Orphan Sheet: US and Canadian small and mid caps putting out real news while the market looks the other way.</p>
  <p style="margin:0 0 16px;">Each name comes with the bull case, the risks the bulls skip, and where it sits on the Orphan Index against the Russell 2000.</p>
  <p style="margin:0;">First sheet lands Monday.</p>`);

const issuerEmail = (ticker) => shell('Submission received.', `
  <p style="margin:0 0 16px;">Thanks for submitting ${ticker ? `<strong style="color:#e8e6df;">${ticker}</strong>` : 'your company'} to the Orphan Sheet.</p>
  <p style="margin:0 0 16px;">We screen for US and Canadian listings above $300M market cap with recent news the market has not priced in. If it fits, it goes in the queue and we will be in touch.</p>
  <p style="margin:0;">Editorial picks are not for sale. Any sponsored placement is a separate conversation and is always labelled as such.</p>`);

async function brevo(env, path, body) {
  const res = await fetch(`https://api.brevo.com/v3/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': env.BREVO_API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Brevo ${path} ${res.status}: ${text}`);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { email, type, ticker } = await request.json();
    const kind = type === 'issuer' ? 'issuer' : 'retail';
    const cleanTicker = (ticker || '').toString().toUpperCase().replace(/[^A-Z0-9.:\-]/g, '').slice(0, 12);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Invalid email' }, 400);

    const listId = Number(kind === 'issuer' ? env.ISSUER_LIST_ID || 2 : env.RETAIL_LIST_ID || 2);
    const source = kind === 'issuer'
      ? `stockologi.com coverage submission${cleanTicker ? ' ' + cleanTicker : ''}`
      : 'stockologi.com orphan sheet signup';

    await brevo(env, 'contacts', {
      email,
      attributes: { SOURCE: source },
      listIds: [listId],
      updateEnabled: true,
    });

    await brevo(env, 'smtp/email', {
      sender: { name: 'Stockologi', email: 'hello@stockologi.com' },
      to: [{ email }],
      subject: kind === 'issuer' ? `Orphan Sheet submission received${cleanTicker ? ': ' + cleanTicker : ''}` : 'You\'re on the Orphan Sheet list',
      htmlContent: kind === 'issuer' ? issuerEmail(cleanTicker) : RETAIL_EMAIL,
    });

    if (kind === 'issuer') {
      // Internal heads up so issuer submissions never sit unseen in a list
      await brevo(env, 'smtp/email', {
        sender: { name: 'Stockologi Site', email: 'hello@stockologi.com' },
        to: [{ email: 'hello@stockologi.com' }],
        replyTo: { email },
        subject: `New coverage submission: ${cleanTicker || 'no ticker'} from ${email}`,
        textContent: `Ticker: ${cleanTicker || 'not given'}\nEmail: ${email}\nTime: ${new Date().toISOString()}`,
      }).catch((e) => console.error(e));
    }

    return json({ success: true });
  } catch (err) {
    console.error(err);
    return json({ error: err.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

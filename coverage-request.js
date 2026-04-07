export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- ADD TO BREVO LIST #2 ---
    await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': env.BREVO_API_KEY
      },
      body: JSON.stringify({
        email,
        attributes: { SOURCE: 'stockologi.com coverage request' },
        listIds: [2],
        updateEnabled: true
      })
    });

    // --- SEND CONFIRMATION EMAIL ---
    const htmlEmail = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a08;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a08;padding:40px 20px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

      <tr><td style="padding-bottom:28px;border-bottom:1px solid rgba(255,255,255,0.07);">
        <div style="font-family:monospace;font-size:11px;letter-spacing:0.2em;color:#c9a84c;text-transform:uppercase;margin-bottom:8px;">Stockologi</div>
        <div style="font-size:24px;font-weight:600;color:#e8e6df;line-height:1.2;">Coverage Request Received</div>
      </td></tr>

      <tr><td style="padding:28px 0 20px;">
        <p style="font-size:15px;color:#b0ada4;line-height:1.8;margin:0 0 16px;">Thank you for your interest in Stockologi coverage. We've received your request and our team will be in touch within 24 hours.</p>
        <p style="font-size:15px;color:#b0ada4;line-height:1.8;margin:0 0 24px;">In the meantime, here's what to expect from a coverage cycle:</p>

        <div style="border-left:2px solid #c9a84c;padding:16px 20px;background:rgba(201,168,76,0.05);border-radius:0 4px 4px 0;margin-bottom:24px;">
          <div style="font-family:monospace;font-size:10px;letter-spacing:0.15em;color:#c9a84c;text-transform:uppercase;margin-bottom:12px;">What's included</div>
          <div style="font-size:13px;color:#b0ada4;line-height:2;">
            ✓ &nbsp;EWS signal activation — 15,000+ investors notified<br>
            ✓ &nbsp;CDF Research Brief — catalyst-driven, retail-ready<br>
            ✓ &nbsp;Direct email blast to verified investor list<br>
            ✓ &nbsp;TikTok, YouTube, Instagram & Reddit distribution<br>
            ✓ &nbsp;Sector exclusivity — one company per cycle<br>
            ✓ &nbsp;Newsletter front-of-book placement
          </div>
        </div>

        <div style="background:#161614;border:1px solid rgba(255,255,255,0.07);border-radius:4px;padding:20px;margin-bottom:24px;">
          <div style="font-family:monospace;font-size:10px;letter-spacing:0.15em;color:#7a7870;text-transform:uppercase;margin-bottom:12px;">// Live result — Reddit, March 2026</div>
          <div style="font-size:14px;color:#e8e6df;line-height:1.6;">118,000 views &nbsp;·&nbsp; 60 upvotes &nbsp;·&nbsp; 150 shares &nbsp;·&nbsp; 3 paragraphs &nbsp;·&nbsp; $0 ad spend.</div>
        </div>

        <p style="font-size:13px;color:#7a7870;line-height:1.7;margin:0;">Q2 slots are limited by design — one company per sector. We'll confirm availability for your sector when we connect.</p>
      </td></tr>

      <tr><td style="padding-top:20px;border-top:1px solid rgba(255,255,255,0.07);">
        <div style="font-family:monospace;font-size:10px;color:#3a3a35;letter-spacing:0.08em;text-transform:uppercase;line-height:1.8;">
          © 2026 Stockologi &nbsp;·&nbsp; Confidential — Authorized Recipients Only<br>
          Save <strong style="color:#4a4a40;">hello@stockologi.com</strong> to your contacts so you don't miss our reply.
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { name: 'Stockologi', email: 'hello@stockologi.com' },
        to: [{ email }],
        subject: 'Coverage Request Received — Stockologi Q2 2026',
        htmlContent: htmlEmail
      })
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

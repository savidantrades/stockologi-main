// Shared JS for Orphan Sheet pages: attribution, signups, share links.

// 1. Attribution. Keep the first touch for the session so a reader who
//    lands from Reddit and signs up two pages later is still credited.
(function () {
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('utm_source') && !sessionStorage.getItem('stk_ref')) {
      const ref = [q.get('utm_source'), q.get('utm_campaign'), q.get('utm_content')].filter(Boolean).join('/');
      sessionStorage.setItem('stk_ref', ref);
    }
    if (!sessionStorage.getItem('stk_page')) sessionStorage.setItem('stk_page', location.pathname);
  } catch (e) {}
})();

function stkRef() {
  try {
    return [sessionStorage.getItem('stk_ref') || 'direct', sessionStorage.getItem('stk_page') || location.pathname].join(' | ');
  } catch (e) { return 'direct | ' + location.pathname; }
}

// 2. Signups. Every form on the page has a prefix: <prefix>Form, <prefix>Email,
//    <prefix>Success, <prefix>Error. kind is "retail" or "issuer".
async function submitForm(prefix, kind) {
  kind = kind || 'retail';
  const email = document.getElementById(prefix + 'Email');
  const tickerEl = document.getElementById(prefix + 'Ticker');
  const form = document.getElementById(prefix + 'Form');
  const ok = document.getElementById(prefix + 'Success');
  const err = document.getElementById(prefix + 'Error');
  const btn = form.querySelector('button');
  const val = email.value.trim();

  err.style.display = 'none';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { email.focus(); form.style.borderColor = 'var(--red)'; return; }
  form.style.borderColor = '';

  const payload = { email: val, type: kind, ref: stkRef() };
  if (tickerEl) payload.ticker = tickerEl.value.trim().toUpperCase();

  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = 'Sending...';
  try {
    const res = await fetch('/coverage-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    form.style.display = 'none';
    ok.style.display = 'block';
  } catch (e) {
    console.error(e);
    btn.disabled = false;
    btn.textContent = label;
    err.style.display = 'block';
  }
}

// 3. Share links. Each company card gets a link straight to its section,
//    tagged so we can see when IR teams or readers pass it around.
function shareCompany(ticker) {
  const url = location.origin + location.pathname + '?utm_source=share&utm_campaign=company&utm_content=' + encodeURIComponent(ticker) + '#' + encodeURIComponent(ticker);
  const done = () => toast('Link to ' + ticker + ' copied');
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => prompt('Copy this link', url));
  else prompt('Copy this link', url);
}

function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 1800);
}

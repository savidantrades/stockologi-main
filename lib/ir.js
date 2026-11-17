// ir.stockologi.com: the issuer page every outreach email points to.
import { shell, esc } from './render.js';

// Audience numbers. Update from Reddit dashboards (user dashboard + subreddit Insights), past 12 months.
export const AUDIENCE = {
  asof: 'Nov 2026',
  postViews: '6.4M',      // views on our Reddit posts, past 12 months
  monthlyUniques: '17.1k', // avg monthly unique visitors, home subreddit
  members: '2.7k',         // home subreddit members
};

const CSS = `<style>
.ir-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 4px; overflow: hidden; margin-top: 1.5rem; }
.ir-cell { background: var(--off-black); padding: 1.4rem 1.5rem; }
.ir-cell h3 { font-size: 1.15rem; margin-bottom: 0.4rem; }
.ir-cell p { font-size: 0.88rem; color: var(--text-mid); line-height: 1.65; margin: 0; }
.ir-no { list-style: none; margin-top: 1rem; max-width: 620px; }
.ir-no li { font-size: 0.92rem; color: var(--text-mid); padding: 0.6rem 0 0.6rem 1.4rem; position: relative; border-bottom: 1px solid var(--border); }
.ir-no li::before { content: '\\2715'; position: absolute; left: 0; color: var(--red); font-size: 0.75rem; top: 0.75rem; }
.ir-asof { font-family: var(--mono); font-size: 0.68rem; color: var(--text-muted); margin-top: 0.6rem; }
@media (max-width: 700px) { .ir-grid { grid-template-columns: 1fr; } }
</style>`;

export function irPage({ ticker = '', companies = 0 }) {
  const t = esc(ticker);
  const page = ticker ? `stockologi.com/t/${t}` : 'stockologi.com/t/';
  const pageHref = ticker ? `/t/${t}` : '/t/';
  const body = `
<header class="tk-head">
  <div class="kicker">For investor relations</div>
  <h1 style="font-size:clamp(2.2rem,5vw,3.4rem);line-height:1.08;margin-bottom:1rem">You put out real news.<br><em>Retail scrolled past it.</em></h1>
  <p class="dek">The Orphan Sheet covers US and Canadian listed companies from $300M to $3B that have real news and flat attention. Every Monday, in front of a retail audience that reads past the headline.</p>
  <div class="stat-strip" style="margin-top:2rem">
    <div class="stat"><span class="stat-val">${AUDIENCE.postViews}</span><span class="stat-label">Reddit post views, 12 mo</span></div>
    <div class="stat"><span class="stat-val">${AUDIENCE.monthlyUniques}</span><span class="stat-label">Monthly unique visitors</span></div>
    <div class="stat"><span class="stat-val">${AUDIENCE.members}</span><span class="stat-label">Subreddit members</span></div>
    <div class="stat"><span class="stat-val">${companies ? companies.toLocaleString('en-US') : '1,200+'}</span><span class="stat-label">Companies tracked</span></div>
  </div>
  <p class="ir-asof">Reddit figures from our account and subreddit dashboards, past 12 months, as of ${AUDIENCE.asof}.</p>
</header>

<section style="padding-top:2rem">
  <div class="kicker">What you get. Free.</div>
  <h2>Data your IR firm doesn't have.</h2>
  <div class="ir-grid">
    <div class="ir-cell"><h3>Retail perception</h3><p>We ask retail investors to pick one stock: yours against your sector leaders. You see where you actually rank, not where your deck says you rank.</p></div>
    <div class="ir-cell"><h3>Release reaction tracking</h3><p>Every press release scored on next session price and volume reaction, benchmarked against the Russell 2000. You see which news moved the stock and which died on the wire.</p></div>
    <div class="ir-cell"><h3>Your ticker page</h3><p>Your last 10 releases, recent SEC filings and reaction tape at <a href="${pageHref}">${page}</a>. Built to be read by investors and by the AI assistants they ask.</p></div>
    <div class="ir-cell"><h3>A shot at the Orphan Sheet</h3><p>If the news is real and the attention is flat, you go in the queue for Monday. That is the only criterion.</p></div>
  </div>
</section>

<section style="padding-top:1rem">
  <div class="kicker">What we don't do</div>
  <ul class="ir-no">
    <li>No price targets, ratings, or buy and sell calls. Ever.</li>
    <li>Editorial picks are not for sale. Claiming your page does not change how we cover you.</li>
    <li>If an issuer or its agent ever pays for content, the post says so: who paid and how much, per Section 17(b).</li>
  </ul>

  <div class="issuer-strip" id="submit">
    <div class="kicker">Submit your company</div>
    <h3>Send us your ticker. Get the perception data.</h3>
    <p>We check the fit and reply from hello@stockologi.com. No call required.</p>
    <div class="capture">
      <div class="capture-form ghost" id="irForm">
        <input type="email" id="irEmail" placeholder="you@company.com" autocomplete="email">
        <input type="text" id="irTicker" value="${t}" placeholder="Ticker" maxlength="12">
        <button type="button" onclick="submitForm('ir','issuer')">Submit</button>
      </div>
      <div class="capture-success" id="irSuccess">&#10003; Got it. We'll reply from hello@stockologi.com.</div>
      <div class="capture-error" id="irError">Something broke. Email hello@stockologi.com with your ticker.</div>
      <p class="capture-note">Submission does not guarantee coverage.</p>
    </div>
  </div>
</section>`;

  return shell({
    title: ticker ? `${t} and the Orphan Sheet | Stockologi for IR` : 'Stockologi for investor relations | The Orphan Sheet',
    desc: 'Free retail perception data and press release reaction tracking for US and Canadian listed companies from $300M to $3B.',
    canonical: 'https://ir.stockologi.com/',
    head: CSS,
    body,
  });
}

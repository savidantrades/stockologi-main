// Renderers for /tools/ (neutral best of guides). Server rendered for Google and AI agents.
import { esc, shell, askAi } from './render.js';
import { YEAR, CHECKED, TOOLS, GUIDES } from './tools-data.js';

const SITE = 'https://stockologi.com';
const checkedTxt = new Date(CHECKED + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const ref = (u) => u + (u.includes('?') ? '&' : '?') + 'ref=stockologi';

export const guideBySlug = (slug) => GUIDES.find((g) => g.slug === slug);
export const guideTitle = (g) => `${g.title} ${YEAR}`;

const HEAD = '<link rel="stylesheet" href="/assets/tools.css">';

const POLICY = `<div class="tl-policy">
  <b>How this list works.</b> No affiliate links. No paid placement. Nobody paid to be on this page, and nobody can pay to move up it.
  Pricing shows the model only (free, freemium, paid) as of ${checkedTxt}. Prices change, so check the vendor's own pricing page before you pay.
  Descriptions are our summary of what each tool does, not a test of every feature. Spot an error? <a href="mailto:hello@stockologi.com?subject=Tools%20correction">Tell us</a>.
</div>`;

function jsonLd(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

export function guidePage(g) {
  const tools = g.ids.map((id) => ({ id, ...TOOLS[id] }));
  const others = GUIDES.filter((x) => x.slug !== g.slug);
  const title = guideTitle(g);
  const desc = `${tools.length} ${g.short.toLowerCase()} compared for ${YEAR}: what each does, who it is for, and the pricing model. No affiliate links, no paid placement.`;

  const ld = [
    { '@context': 'https://schema.org', '@type': 'ItemList', name: title, numberOfItems: tools.length,
      itemListElement: tools.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, url: t.url })) },
    { '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: g.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@context': 'https://schema.org', '@type': 'Article', headline: title, dateModified: CHECKED,
      author: { '@type': 'Organization', name: 'Stockologi', url: SITE }, publisher: { '@type': 'Organization', name: 'Stockologi', url: SITE } },
  ];

  const body = `
<header class="tk-head">
  <div class="tk-crumb"><a href="/">Stockologi</a> / <a href="/tools/">Tools</a> / ${esc(g.short)}</div>
  <div class="kicker">${YEAR} edition &middot; Updated ${checkedTxt}</div>
  <h1 class="tl-h1">${esc(g.title)} <em>${YEAR}</em></h1>
  <p class="dek tl-dek">${esc(g.intro)}</p>
</header>
<div class="divider"></div>
<section class="tk">
  <h3 class="sec" style="margin-top:0">At a glance</h3>
  <div class="table-wrap" style="margin-top:0"><table class="dir tl-table">
    <thead><tr><th>#</th><th>Tool</th><th>Best for</th><th>Pricing</th></tr></thead>
    <tbody>${tools.map((t, i) => `
      <tr><td class="d">${i + 1}</td><td><a href="#${t.id}">${esc(t.name)}</a></td><td>${esc(t.best)}</td><td><span class="tl-p ${t.p.toLowerCase().replace(/\s+/g, '')}">${esc(t.p)}</span></td></tr>`).join('')}
    </tbody></table></div>

  <h3 class="sec">Our take</h3>
  <p class="tl-take">${esc(g.pick)}</p>

  <h3 class="sec">The list</h3>
  <ol class="tl-list">${tools.map((t) => `
    <li id="${t.id}">
      <div class="tl-row"><h2>${esc(t.name)}</h2><span class="tl-p ${t.p.toLowerCase().replace(/\s+/g, '')}">${esc(t.p)}</span></div>
      <p>${esc(t.what)}</p>
      <dl><dt>Best for</dt><dd>${esc(t.best)}</dd><dt>Website</dt><dd><a href="${esc(ref(t.url))}" target="_blank" rel="noopener">${esc(host(t.url))}</a></dd></dl>
    </li>`).join('')}
  </ol>

  <h3 class="sec">FAQ</h3>
  <div class="tl-faq">${g.faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}</div>

  ${POLICY}

  ${askAi('Ask an AI to compare these', 'Opens your assistant with this guide loaded.',
    `Read ${SITE}/tools/${g.slug}.md which lists ${g.short.toLowerCase()} for investors in ${YEAR}. Help me pick the right one for my situation. Ask me what I hold and what I need first, and check current pricing on each vendor's own site. This is research, not investment advice.`)}

  <div class="tl-cta">
    <div><b>Built a tool for investors?</b> Submit it for review. Free, and listing is editorial only.</div>
    <a class="tl-btn" href="mailto:hello@stockologi.com?subject=Tool%20submission&body=Tool%20name%3A%0AURL%3A%0AWhich%20guide%3A%0AOne%20line%20on%20what%20it%20does%3A">Submit a tool</a>
  </div>

  <h3 class="sec">More guides</h3>
  <div class="chips">${others.map((x) => `<a class="chip" href="/tools/${x.slug}">${esc(x.short)}</a>`).join('')}</div>
</section>`;

  return shell({ title: `${title}: Compared, No Affiliate Links | Stockologi`, desc, canonical: `/tools/${g.slug}`, head: HEAD + ld.map(jsonLd).join(''), body });
}

export function guideMarkdown(g) {
  const tools = g.ids.map((id) => TOOLS[id]);
  return [
    `# ${guideTitle(g)}`,
    '',
    `> ${g.intro}`,
    '',
    `Updated ${checkedTxt}. Source: ${SITE}/tools/${g.slug}. No affiliate links and no paid placement. Pricing is the pricing model only; check the vendor's site for current prices.`,
    '',
    '## Our take',
    g.pick,
    '',
    '## The list',
    ...tools.map((t, i) => `${i + 1}. **${t.name}** (${t.p}): ${t.what} Best for: ${t.best}. ${t.url}`),
    '',
    '## FAQ',
    ...g.faq.flatMap(([q, a]) => [`### ${q}`, a, '']),
    'Stockologi is independent retail media. Not financial advice.',
    '',
  ].join('\n');
}

export function hubPage() {
  const count = new Set(GUIDES.flatMap((g) => g.ids)).size;
  const body = `
<header class="tk-head">
  <div class="tk-crumb"><a href="/">Stockologi</a> / Tools</div>
  <div class="kicker">${YEAR} edition &middot; ${GUIDES.length} guides &middot; ${count} tools</div>
  <h1 class="tl-h1">The best investing tools for ${YEAR}. <em>Nobody paid to be here.</em></h1>
  <p class="dek tl-dek">Most "best tools" lists are affiliate funnels ranked by commission. These are not. No affiliate links, no paid placement, and the vendor's own site linked every time.</p>
</header>
<div class="divider"></div>
<section class="tk">
  <div class="tl-grid">${GUIDES.map((g) => `
    <a class="tl-card" href="/tools/${g.slug}">
      <div class="tl-card-k">${g.ids.length} tools</div>
      <h2>${esc(g.title)} ${YEAR}</h2>
      <p>${esc(g.intro)}</p>
    </a>`).join('')}
  </div>
  ${POLICY}
  <div class="tl-cta">
    <div><b>Built a tool for investors?</b> Submit it for review. Free, and listing is editorial only.</div>
    <a class="tl-btn" href="mailto:hello@stockologi.com?subject=Tool%20submission&body=Tool%20name%3A%0AURL%3A%0AWhich%20guide%3A%0AOne%20line%20on%20what%20it%20does%3A">Submit a tool</a>
  </div>
</section>`;
  const ld = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `Best Investing Tools ${YEAR}`,
    hasPart: GUIDES.map((g) => ({ '@type': 'Article', headline: guideTitle(g), url: `${SITE}/tools/${g.slug}` })) };
  return shell({
    title: `Best Investing Tools ${YEAR}: ${GUIDES.length} Guides, No Affiliate Links | Stockologi`,
    desc: `${count} investing tools across ${GUIDES.length} guides for ${YEAR}: dividend trackers, screeners, ETF research, 13F trackers, AI research and more. No affiliate links, no paid placement.`,
    canonical: '/tools/', head: HEAD + jsonLd(ld), body,
  });
}

export function toolsLlms() {
  return [
    '## Investing tool guides',
    ...GUIDES.map((g) => `- [${guideTitle(g)}](${SITE}/tools/${g.slug}.md): ${g.ids.length} tools, no affiliate links`),
  ];
}

// ProteinOrNot.in — HTML templates.
// Pure functions: data in, HTML string out. No I/O, no globals mutated.
// Copy rule: neutral facts and maths only. No judgement words about brands or products.

// Base URL is a build setting: SITE_URL=https://ankit1000-wq.github.io/proteinornot node build.mjs
// Default (no env var) is the final domain root.
export const SITE = (process.env.SITE_URL || 'https://proteinornot.in').replace(/\/+$/, '');
// Path prefix for root-relative links, e.g. '/proteinornot' on a GitHub project page, '' on a custom domain.
export const BASE_PATH = new URL(SITE + '/').pathname.replace(/\/+$/, '');
// PLACEHOLDER: corrections inbox not set up yet. Replace once the mailbox exists.
export const CORRECTIONS_MAILTO = 'mailto:corrections@proteinornot.in?subject=Correction';
// PLACEHOLDER wording for the affiliate disclosure; have it reviewed before any affiliate links go live.
export const AFFILIATE_LINE = 'Some buy links may become affiliate links in future; this never changes rankings.';

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Inter:wght@400..700&display=swap';

export const CATEGORIES = {
  'bar': 'Protein bars',
  'chips-snacks': 'Chips & snacks',
  'makhana': 'Makhana',
  'cookies': 'Cookies',
  'paneer': 'Paneer',
  'curd-yogurt': 'Curd & Greek yogurt',
  'bread': 'Breads',
  'drink-shake': 'Drinks & shakes',
  'whey': 'Whey & protein powders',
  'peanut-butter': 'Peanut butter',
  'breakfast': 'Oats & muesli',
  'other': 'Other',
};

export const SORTS = {
  inr: { key: 'inr_per_10g_protein', dir: 1, label: '₹ per 10 g protein (low to high)' },
  p100: { key: 'protein_per_100kcal', dir: -1, label: 'Protein per 100 kcal (high to low)' },
  price: { key: 'price_inr', dir: 1, label: 'Pack price (low to high)' },
  pserv: { key: 'protein_serving', dir: -1, label: 'Protein per serving (high to low)' },
};

export const SEO_PAGES = [
  { slug: 'cheapest-protein-per-rupee', short: 'Cheapest protein per ₹' },
  { slug: 'best-high-protein-snacks-india', short: 'High-protein snacks' },
  { slug: 'best-protein-bars-under-100', short: 'Protein bars under ₹100' },
  { slug: 'high-protein-veg-foods', short: 'Veg protein' },
];

/* ---------------------------------------------------------------- helpers */

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const safeUrl = (u) => (typeof u === 'string' && /^https?:\/\/\S+$/i.test(u.trim()) ? u.trim() : '');
const catName = (c) => CATEGORIES[c] || CATEGORIES.other;
const DASH = '<span class="na" title="Not available">–</span>';

/** 9.5 -> "9.5", 20 -> "20", 7.25 -> "7.3" */
export function g(n, d = 1) {
  if (!isNum(n)) return null;
  const s = n.toFixed(d);
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}
/** Rupees in Indian grouping. d = decimals. */
export function inr(n, d = 0) {
  if (!isNum(n)) return null;
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}
const inrAuto = (n) => (isNum(n) ? inr(n, Number.isInteger(n) ? 0 : 2) : null);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return iso ? esc(iso) : 'date not recorded';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

const json = (o) =>
  JSON.stringify(o).replace(/</g, "\\u003c").replace(/[\u2028\u2029]/g, (c) => "\\u" + c.charCodeAt(0).toString(16));

/** A value wrapped in a link to its source. Missing source -> plain value with a marker. */
function src(url, inner, what) {
  const u = safeUrl(url);
  if (!u) return `${inner}<sup class="nosrc" title="Source link pending">?</sup>`;
  return `<a class="src" href="${esc(u)}" target="_blank" rel="nofollow noopener">${inner}<span class="sr-only"> (source: ${esc(what)}, opens in a new tab)</span></a>`;
}

export const hasMetrics = (p) =>
  isNum(p.protein_per_100kcal) && isNum(p.inr_per_10g_protein) && isNum(p.price_inr);

/** Sort helper: nulls always last, tie-break on protein per 100 kcal then name. */
export function sortBy(list, sortId = 'inr') {
  const s = SORTS[sortId] || SORTS.inr;
  return [...list].sort((a, b) => {
    // Products missing protein, kcal or price are listed after all ranked products.
    const ar = hasMetrics(a), br = hasMetrics(b);
    if (ar !== br) return ar ? -1 : 1;
    const av = a[s.key], bv = b[s.key];
    const an = isNum(av), bn = isNum(bv);
    if (an !== bn) return an ? -1 : 1;
    if (an && av !== bv) return (av - bv) * s.dir;
    const ap = isNum(a.protein_per_100kcal) ? a.protein_per_100kcal : -1;
    const bp = isNum(b.protein_per_100kcal) ? b.protein_per_100kcal : -1;
    if (ap !== bp) return bp - ap;
    return `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`);
  });
}

/** Rank of p within its category by a sort. Returns {rank, of} or null. */
export function categoryRank(p, all, sortId) {
  const key = SORTS[sortId].key;
  if (!hasMetrics(p)) return null;
  const peers = sortBy(all.filter((x) => x.category === p.category && hasMetrics(x)), sortId);
  const i = peers.findIndex((x) => x.id === p.id);
  return i < 0 ? null : { rank: i + 1, of: peers.length };
}

/* ------------------------------------------------------------ brand bits */

const MARK_SVG = `<svg class="logo-mark" viewBox="0 0 44 26" aria-hidden="true" focusable="false"><rect x="1.5" y="1.5" width="41" height="23" rx="11.5" fill="#FFC53D" stroke="#17150F" stroke-width="3"/><circle cx="30" cy="13" r="6.5" fill="#17150F"/></svg>`;

export function wordmark(tag = 'span') {
  return `<${tag} class="wordmark">${MARK_SVG}<span class="wm-text"><span class="wm-a">Protein</span><span class="wm-or">or</span><span class="wm-b">Not</span><span class="wm-tld">.in</span></span></${tag}>`;
}

const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44"><rect x="2" y="10" width="40" height="24" rx="12" fill="#FFC53D" stroke="#17150F" stroke-width="4"/><circle cx="30" cy="22" r="7" fill="#17150F"/></svg>`
  );

/** FSSAI-style diet mark: green square+circle (veg), brown square+triangle (non-veg); egg gets an amber ring. */
export function dietBadge(veg, { compact = false } = {}) {
  const map = {
    'veg': ['veg', 'Veg', '<circle cx="8" cy="8" r="3.6" fill="currentColor"/>'],
    'non-veg': ['nonveg', 'Non-veg', '<path d="M8 3.6 12.2 11.4H3.8Z" fill="currentColor"/>'],
    'egg': ['egg', 'Contains egg', '<ellipse cx="8" cy="8.3" rx="3" ry="3.8" fill="currentColor"/>'],
  };
  const [cls, label, shape] = map[veg] || ['unknown', 'Diet not stated', ''];
  const svg = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><rect x="1" y="1" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>${shape}</svg>`;
  return `<span class="diet diet-${cls}"${compact ? ` title="${label}"` : ''}>${svg}<span class="${compact ? 'sr-only' : 'diet-label'}">${label}</span></span>`;
}

function jainBadge(jain) {
  return jain === true ? '<span class="tag tag-jain">Jain-friendly per label</span>' : '';
}

/* ----------------------------------------------------------------- layout */

export function layout({
  title,
  description = '',
  canonicalPath = '/',
  ogImagePath = '/og/site.png',
  body = '',
  jsonLd = null,
  generated = '',
  noindex = false,
  scripts = ['/app.js'],
}) {
  const canonical = SITE + canonicalPath;
  const ogImage = SITE + ogImagePath;
  const ld = (Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [])
    .map((o) => `<script type="application/ld+json">${json(o)}</script>`)
    .join('\n');
  const nav = [
    ['/', 'Rankings'],
    ['/cheapest-protein-per-rupee/', 'Per ₹'],
    ['/best-high-protein-snacks-india/', 'Snacks'],
    ['/high-protein-veg-foods/', 'Veg'],
    ['/method/', 'Method'],
  ]
    .map(([href, label]) => `<li><a href="${href}"${href === canonicalPath ? ' aria-current="page"' : ''}>${label}</a></li>`)
    .join('');

  return `<!doctype html>
<html lang="en-IN" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="ProteinOrNot.in">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<meta name="theme-color" content="#FBF6EA">
<link rel="icon" href="${FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS_HREF}">
<link rel="stylesheet" href="/styles.css">
<script>document.documentElement.className='js'</script>
${ld}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="logo" href="/" aria-label="ProteinOrNot.in, home">${wordmark()}</a>
    <nav class="site-nav" aria-label="Main"><ul>${nav}</ul></nav>
  </div>
</header>
<main id="main">
${body}
</main>
${footer(generated)}
${scripts.map((s) => `<script src="${s}" defer></script>`).join('\n')}
</body>
</html>
`;
}

function footer(generated) {
  return `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="footer-brand">
      ${wordmark()}
      <p>Protein maths for packaged food in India. Numbers come from pack labels and store listings on the dates shown. Check the pack before you buy.</p>
      ${generated ? `<p class="footer-updated">Data updated ${fmtDate(generated)}</p>` : ''}
    </div>
    <nav aria-label="Rankings" class="footer-col">
      <h2>Rankings</h2>
      <ul>
        <li><a href="/">All products</a></li>
        ${SEO_PAGES.map((s) => `<li><a href="/${s.slug}/">${s.short}</a></li>`).join('')}
      </ul>
    </nav>
    <nav aria-label="About" class="footer-col">
      <h2>About</h2>
      <ul>
        <li><a href="/method/">How the numbers work</a></li>
        <li><a href="/disclaimer/">Disclaimer</a></li>
        <!-- PLACEHOLDER: corrections@proteinornot.in mailbox to be created -->
        <li><a href="${CORRECTIONS_MAILTO}">Report a correction</a></li>
      </ul>
    </nav>
  </div>
  <div class="wrap footer-legal">
    <!-- PLACEHOLDER wording: affiliate disclosure -->
    <p>${esc(AFFILIATE_LINE)}</p>
    <p>Not affiliated with any brand listed. Trademarks belong to their owners. Not medical or nutrition advice.</p>
  </div>
</footer>`;
}

/* --------------------------------------------------------------- pieces */

function newsletterBox() {
  return `<section class="newsletter" aria-labelledby="nl-title">
  <div class="nl-inner">
    <p class="kicker">Newsletter</p>
    <h2 id="nl-title">The Protein Ledger</h2>
    <p>One short email a week: new products added, price changes in ₹ per 10 g protein, and one chart. Free.</p>
    <!-- TODO: connect real newsletter provider (e.g. Buttondown/ConvertKit) -->
    <form class="nl-form" action="#" method="post" novalidate>
      <label for="nl-email" class="sr-only">Email address</label>
      <input id="nl-email" type="email" name="email" autocomplete="email" placeholder="you@example.com" required>
      <button type="submit" class="btn btn-ink">Subscribe</button>
      <p class="nl-msg" role="status" aria-live="polite"></p>
    </form>
    <p class="nl-fine">No spam. Unsubscribe in one click.</p>
  </div>
</section>`;
}

function seoLinks(currentSlug = '') {
  return `<section class="more-rankings wrap" aria-labelledby="more-title">
  <h2 id="more-title" class="section-title">More rankings</h2>
  <ul class="pill-links">
    ${SEO_PAGES.filter((s) => s.slug !== currentSlug)
      .map((s) => `<li><a href="/${s.slug}/">${s.short} <span aria-hidden="true">→</span></a></li>`)
      .join('')}
    ${currentSlug ? '<li><a href="/">All products <span aria-hidden="true">→</span></a></li>' : ''}
  </ul>
</section>`;
}

function productLabel(p, { link = true } = {}) {
  const inner = `<span class="p-brand">${esc(p.brand)}</span> <span class="p-name">${esc(p.name)}</span>`;
  return link ? `<a class="p-link" href="/p/${esc(p.id)}/">${inner}</a>` : inner;
}

function metricBar(value, max, cls) {
  if (!isNum(value) || !isNum(max) || max <= 0) return '';
  const w = Math.max(3, Math.min(100, (value / max) * 100));
  return `<span class="bar ${cls}" aria-hidden="true"><span style="width:${w.toFixed(1)}%"></span></span>`;
}

function maxOf(list, key) {
  return list.reduce((m, p) => (isNum(p[key]) && p[key] > m ? p[key] : m), 0);
}

/** Small card used for "similar products" and fallbacks. */
function miniCard(p) {
  return `<li class="mini-card">
  <a href="/p/${esc(p.id)}/">
    <span class="mini-top">${dietBadge(p.veg, { compact: true })}<span class="mini-cat">${esc(catName(p.category))}</span></span>
    <span class="mini-title"><span class="p-brand">${esc(p.brand)}</span> <span class="p-name">${esc(p.name)}</span></span>
    <span class="mini-nums">
      <span><b>${g(p.protein_per_100kcal) ?? '–'}${isNum(p.protein_per_100kcal) ? ' g' : ''}</b> protein / 100 kcal</span>
      <span><b>${inr(p.inr_per_10g_protein, 2) ?? '–'}</b> per 10 g protein</span>
    </span>
  </a>
</li>`;
}

/* ---------------------------------------------------------------- home */

function topFive(products) {
  const top = sortBy(products.filter(hasMetrics), 'inr').slice(0, 5);
  if (!top.length) return '';
  const max = Math.max(...top.map((p) => p.inr_per_10g_protein));
  return `<section class="top5 wrap" aria-labelledby="top5-title">
  <div class="section-head">
    <h2 id="top5-title" class="section-title">Best protein per ₹ this week</h2>
    <p class="section-sub">Rupees you pay for 10 g of protein, at the price seen. Shorter bar = fewer rupees.</p>
  </div>
  <ol class="top5-list">
    ${top
      .map(
        (p, i) => `<li class="top5-item${i === 0 ? ' is-first' : ''}">
      <span class="top5-rank" aria-hidden="true">${i + 1}</span>
      <div class="top5-body">
        <a class="top5-name" href="/p/${esc(p.id)}/"><span class="p-brand">${esc(p.brand)}</span> ${esc(p.name)}</a>
        <span class="top5-meta">${esc(catName(p.category))} · ${esc(p.pack_size)} · ${inrAuto(p.price_inr)} on ${esc(p.price_store)}</span>
        <span class="top5-bar" aria-hidden="true"><span style="width:${Math.max(6, (p.inr_per_10g_protein / max) * 100).toFixed(1)}%"></span></span>
      </div>
      <span class="top5-val"><b>${inr(p.inr_per_10g_protein, 2)}</b><small>per 10 g protein</small></span>
    </li>`
      )
      .join('')}
  </ol>
</section>`;
}

function rankRow(p, i, maxes) {
  const p100 = g(p.protein_per_100kcal);
  const per10 = inr(p.inr_per_10g_protein, 2);
  const pserv = g(p.protein_serving);
  const stores = new Set([p.price_store, ...(p.stores || []).map((s) => s.name)].filter(Boolean));
  return `<tr data-id="${esc(p.id)}" role="row">
  <td class="c-rank" role="cell"><span class="rank">${i + 1}</span></td>
  <th scope="row" class="c-prod" role="rowheader">
    ${productLabel(p)}
    <span class="p-meta">${dietBadge(p.veg, { compact: true })}${p.jain === true ? '<span class="tag tag-jain tag-sm">Jain</span>' : ''}<span class="p-pack">${esc(p.pack_size)}</span><span class="p-cat-m">${esc(catName(p.category))}</span></span>
  </th>
  <td class="c-cat" role="cell">${esc(catName(p.category))}</td>
  <td class="c-p100 c-num" role="cell" data-label="Protein / 100 kcal">${p100 ? `<span class="num">${p100}<small> g</small></span>` : DASH}${metricBar(p.protein_per_100kcal, maxes.p100, 'bar-p100')}</td>
  <td class="c-inr c-num" role="cell" data-label="₹ / 10 g protein">${per10 ? `<span class="num">${per10}</span>` : DASH}${metricBar(p.inr_per_10g_protein, maxes.inr, 'bar-inr')}</td>
  <td class="c-pserv c-num" role="cell" data-label="Protein / serving">${pserv ? `${pserv} g${isNum(p.serving_g) ? `<small class="sub"> in ${g(p.serving_g)} g</small>` : ''}` : DASH}</td>
  <td class="c-price c-num" role="cell" data-label="Pack price">${inrAuto(p.price_inr) ?? DASH}<small class="sub">${esc(p.price_store)}</small><span class="sr-only">Stores: ${esc([...stores].join(', '))}</span></td>
</tr>`;
}

export function homePage(products, meta = {}) {
  const sorted = sortBy(products, 'inr');
  const ranked = products.filter(hasMetrics);
  const maxes = { p100: maxOf(products, 'protein_per_100kcal'), inr: maxOf(products, 'inr_per_10g_protein') };
  const cats = Object.keys(CATEGORIES).filter((c) => products.some((p) => p.category === c));
  const stores = [...new Set(products.flatMap((p) => [p.price_store, ...(p.stores || []).map((s) => s.name)]).filter(Boolean))].sort();
  const maxPrice = Math.max(50, Math.ceil(maxOf(products, 'price_inr') / 50) * 50);
  const cheapest = sortBy(ranked, 'inr')[0];
  const densest = sortBy(ranked, 'p100')[0];

  const embedded = products.map((p) => ({
    id: p.id,
    brand: p.brand,
    name: p.name,
    category: p.category,
    veg: p.veg,
    jain: p.jain,
    price_inr: p.price_inr ?? null,
    protein_per_100kcal: p.protein_per_100kcal ?? null,
    inr_per_10g_protein: p.inr_per_10g_protein ?? null,
    protein_serving: p.protein_serving ?? null,
    stores: [...new Set([p.price_store, ...(p.stores || []).map((s) => s.name)].filter(Boolean))],
  }));

  return `
<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="kicker">Packaged food in India, by the numbers</p>
      <h1 class="hero-title">High protein?<br><span class="hero-or">Or not.</span></h1>
      <p class="hero-lede">We read the labels and do the maths. Every product gets two numbers: <strong>grams of protein per 100 kcal</strong> and <strong>rupees per 10 g of protein</strong>. Sorted, sourced, shareable.</p>
      <p class="hero-cta"><a class="btn btn-ink" href="#rankings">See the rankings</a> <a class="btn btn-ghost" href="/method/">How we calculate</a></p>
    </div>
    <dl class="hero-stats">
      <div><dt>Products tracked</dt><dd>${products.length}</dd></div>
      <div><dt>Categories</dt><dd>${cats.length}</dd></div>
      ${cheapest ? `<div><dt>Lowest ₹ per 10 g protein</dt><dd>${inr(cheapest.inr_per_10g_protein, 2)}</dd></div>` : ''}
      ${densest ? `<div><dt>Highest protein per 100 kcal</dt><dd>${g(densest.protein_per_100kcal)} g</dd></div>` : ''}
    </dl>
  </div>
  <div class="wrap legend">
    <div class="legend-item"><span class="legend-swatch sw-p100" aria-hidden="true"></span><p><b>Protein per 100 kcal</b> Higher number = more protein for the same calories.</p></div>
    <div class="legend-item"><span class="legend-swatch sw-inr" aria-hidden="true"></span><p><b>₹ per 10 g protein</b> Lower number = fewer rupees for each gram of protein.</p></div>
  </div>
</section>

${topFive(products)}

<section id="rankings" class="rankings wrap" aria-labelledby="rank-title">
  <div class="section-head">
    <h2 id="rank-title" class="section-title">All products</h2>
    <p class="section-sub">Prices as seen on the date listed on each product page${meta.generated ? `; data updated ${fmtDate(meta.generated)}` : ''}.</p>
  </div>

  <form id="filters" class="filters js-only" role="search" aria-label="Filter and sort products" action="#">
    <div class="f-row">
      <div class="f-field f-search">
        <label for="f-q">Search</label>
        <input id="f-q" name="q" type="search" placeholder="Brand or product" autocomplete="off">
      </div>
      <div class="f-field f-sort">
        <label for="f-sort">Sort by</label>
        <select id="f-sort" name="sort">
          ${Object.entries(SORTS).map(([k, s]) => `<option value="${k}">${esc(s.label)}</option>`).join('')}
        </select>
      </div>
    </div>
    <details class="f-more" id="f-more">
      <summary><span>Filters</span> <span class="f-active" id="f-active"></span></summary>
      <div class="f-grid">
        <fieldset class="f-field f-cats">
          <legend>Category</legend>
          <div class="chips">
            ${cats
              .map((c) => {
                const n = products.filter((p) => p.category === c).length;
                return `<label class="chip"><input type="checkbox" name="cat" value="${c}"><span>${esc(catName(c))} <small>${n}</small></span></label>`;
              })
              .join('')}
          </div>
        </fieldset>
        <fieldset class="f-field f-diet">
          <legend>Diet</legend>
          <div class="chips">
            ${[['', 'All'], ['veg', 'Veg'], ['egg', 'Egg'], ['non-veg', 'Non-veg']]
              .map(([v, l]) => `<label class="chip"><input type="radio" name="diet" value="${v}"${v === '' ? ' checked' : ''}><span>${l}</span></label>`)
              .join('')}
          </div>
        </fieldset>
        <div class="f-field f-budget">
          <label for="f-max">Max pack price <output id="f-max-out" for="f-max">Any</output></label>
          <input id="f-max" name="max" type="range" min="0" max="${maxPrice}" step="10" value="${maxPrice}">
        </div>
        <div class="f-field f-store">
          <label for="f-store">Store</label>
          <select id="f-store" name="store">
            <option value="">All stores</option>
            ${stores.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
          </select>
        </div>
        <div class="f-actions"><button type="reset" class="btn btn-ghost btn-sm">Reset all</button></div>
      </div>
    </details>
  </form>
  <p class="result-count" id="result-count" aria-live="polite">Showing ${products.length} of ${products.length} products</p>

  <div class="table-wrap">
    <table id="rank-table" class="rank-table" role="table">
      <caption class="sr-only" id="rank-caption">Products sorted by ${esc(SORTS.inr.label)}</caption>
      <thead role="rowgroup">
        <tr role="row">
          <th scope="col" class="c-rank" role="columnheader"><span aria-hidden="true">#</span><span class="sr-only">Position</span></th>
          <th scope="col" class="c-prod" role="columnheader">Product</th>
          <th scope="col" class="c-cat" role="columnheader">Category</th>
          <th scope="col" class="c-p100 c-num" role="columnheader" aria-sort="none"><button type="button" class="sort-btn" data-sort="p100">Protein<small>per 100 kcal</small></button></th>
          <th scope="col" class="c-inr c-num" role="columnheader" aria-sort="ascending"><button type="button" class="sort-btn" data-sort="inr">₹<small>per 10 g protein</small></button></th>
          <th scope="col" class="c-pserv c-num" role="columnheader" aria-sort="none"><button type="button" class="sort-btn" data-sort="pserv">Protein<small>per serving</small></button></th>
          <th scope="col" class="c-price c-num" role="columnheader" aria-sort="none"><button type="button" class="sort-btn" data-sort="price">Price<small>pack, store</small></button></th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        ${sorted.map((p, i) => rankRow(p, i, maxes)).join('')}
      </tbody>
    </table>
  </div>
  <div class="empty" id="empty" hidden>
    <p><b>No products match these filters.</b> Try a higher budget or fewer categories.</p>
    <button type="button" class="btn btn-ghost btn-sm" id="empty-reset">Reset filters</button>
  </div>
  <p class="table-note">– means the value is not yet verified. Tap a product for label values, sources and dates.</p>
</section>

<div class="wrap">${newsletterBox()}</div>
${seoLinks()}
<script type="application/json" id="data">${json(embedded)}</script>
`;
}

/* ------------------------------------------------------------- product */

export function productPage(p, all) {
  const cat = catName(p.category);
  const rInr = categoryRank(p, all, 'inr');
  const rP100 = categoryRank(p, all, 'p100');
  const nutUrl = safeUrl(p.nutrition_url);
  const priceUrl = safeUrl(p.price_url);
  const per100Basis = isNum(p.protein_100g) && isNum(p.kcal_100g);
  const flags = (p.flags || []).filter(Boolean);

  const protein = per100Basis ? p.protein_100g : p.protein_serving;
  const kcal = per100Basis ? p.kcal_100g : p.kcal_serving;
  const basisLabel = per100Basis ? 'per 100 g' : `per serving${isNum(p.serving_g) ? ` (${g(p.serving_g)} g)` : ''}`;

  const tiles = [];
  tiles.push(`<div class="tile tile-p100">
    <p class="tile-label">Protein per 100 kcal</p>
    <p class="tile-num">${isNum(p.protein_per_100kcal) ? src(nutUrl, `${g(p.protein_per_100kcal)}<small> g</small>`, 'nutrition label') : DASH}</p>
    <p class="tile-calc">${isNum(p.protein_per_100kcal) ? `${g(protein)} g protein ÷ ${g(kcal)} kcal × 100, ${basisLabel}` : 'Needs both protein and energy values'}</p>
  </div>`);
  tiles.push(`<div class="tile tile-inr">
    <p class="tile-label">₹ per 10 g protein</p>
    <p class="tile-num">${isNum(p.inr_per_10g_protein) ? src(priceUrl, inr(p.inr_per_10g_protein, 2), 'price listing') : DASH}</p>
    <p class="tile-calc">${isNum(p.inr_per_10g_protein) && isNum(p._total_protein_g) ? `${inrAuto(p.price_inr)} ÷ ${g(p._total_protein_g)} g protein in pack × 10` : 'Needs price and protein per pack'}</p>
  </div>`);
  tiles.push(`<div class="tile tile-serv">
    <p class="tile-label">Protein per serving</p>
    <p class="tile-num">${isNum(p.protein_serving) ? src(nutUrl, `${g(p.protein_serving)}<small> g</small>`, 'nutrition label') : DASH}</p>
    <p class="tile-calc">${isNum(p.serving_g) ? `Serving size ${g(p.serving_g)} g as stated on pack` : 'Serving size not stated'}${isNum(p.kcal_serving) ? `, ${g(p.kcal_serving)} kcal` : ''}</p>
  </div>`);

  const rankBits = [];
  if (rInr) rankBits.push(`<li><b>#${rInr.rank}</b> of ${rInr.of} ${esc(cat.toLowerCase())} by ₹ per 10 g protein</li>`);
  if (rP100) rankBits.push(`<li><b>#${rP100.rank}</b> of ${rP100.of} ${esc(cat.toLowerCase())} by protein per 100 kcal</li>`);

  const nutRow = (label, unit, k100, kServ) => {
    const v100 = isNum(p[k100]) ? `${g(p[k100])} ${unit}` : null;
    const vS = isNum(p[kServ]) ? `${g(p[kServ])} ${unit}` : null;
    const cell = (v) => (v ? src(nutUrl, v, 'nutrition label') : DASH);
    return `<tr><th scope="row">${label}</th><td>${cell(v100)}</td><td>${cell(vS)}</td></tr>`;
  };

  const buy = (p.stores || [])
    .map((s) => {
      const href = safeUrl(s.affiliate_url) || safeUrl(s.url);
      if (!href) return '';
      return `<a class="btn btn-buy" href="${esc(href)}" target="_blank" rel="nofollow sponsored noopener">View on ${esc(s.name)} <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></a>`;
    })
    .filter(Boolean)
    .join('');

  const sameCat = sortBy(all.filter((x) => x.id !== p.id && x.category === p.category), 'inr');
  const others = sortBy(all.filter((x) => x.id !== p.id && x.category !== p.category && hasMetrics(x)), 'inr');
  const similar = [...sameCat, ...others].slice(0, 4);

  const jainText = p.jain === true ? 'Yes, per label or listing' : p.jain === false ? 'No' : 'Not stated';

  return `
<nav class="crumbs wrap" aria-label="Breadcrumb"><ol><li><a href="/">Rankings</a></li><li><a href="/?cat=${esc(p.category)}">${esc(cat)}</a></li><li aria-current="page">${esc(p.name)}</li></ol></nav>

<article class="product wrap">
  <header class="product-head">
    <p class="kicker">${esc(cat)}</p>
    <h1 class="product-title"><span class="p-brand">${esc(p.brand)}</span> ${esc(p.name)}</h1>
    <p class="product-badges">${dietBadge(p.veg)}${jainBadge(p.jain)}<span class="tag">${esc(p.pack_size)}</span></p>
    ${rankBits.length ? `<ul class="rank-pills" aria-label="Rank in category">${rankBits.join('')}</ul>` : ''}
  </header>

  ${flags.length || p.notes ? `<aside class="flag-note" aria-label="Data notes">
    <p><b>Notes on this data.</b> How some values on this page were sourced or calculated:</p>
    ${flags.length ? `<ul>${flags.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
    ${p.notes ? `<p>${esc(p.notes)}</p>` : ''}
  </aside>` : ''}

  <section class="tiles" aria-label="Key numbers">${tiles.join('')}</section>

  <div class="product-grid">
    <section class="panel" aria-labelledby="nut-title">
      <h2 id="nut-title" class="panel-title">Nutrition (protein and energy)</h2>
      <table class="nut-table">
        <caption>From the nutrition label, checked ${fmtDate(p.nutrition_date)}. ${nutUrl ? `<a href="${esc(nutUrl)}" target="_blank" rel="nofollow noopener">Source ↗</a>` : 'Source link pending.'}</caption>
        <thead><tr><th scope="col"><span class="sr-only">Nutrient</span></th><th scope="col">Per 100 g</th><th scope="col">Per serving${isNum(p.serving_g) ? ` <small>(${g(p.serving_g)} g)</small>` : ''}</th></tr></thead>
        <tbody>
          ${nutRow('Protein', 'g', 'protein_100g', 'protein_serving')}
          ${nutRow('Energy', 'kcal', 'kcal_100g', 'kcal_serving')}
        </tbody>
      </table>
      <dl class="facts">
        <div><dt>Diet</dt><dd>${dietBadge(p.veg)}</dd></div>
        <div><dt>Jain</dt><dd>${jainText}</dd></div>
        <div><dt>Pack</dt><dd>${esc(p.pack_size)}${isNum(p.pack_g) ? ` (${g(p.pack_g)} g total)` : ''}</dd></div>
        <div><dt>Protein in pack</dt><dd>${isNum(p._total_protein_g) ? `${g(p._total_protein_g)} g` : DASH}</dd></div>
      </dl>
    </section>

    <section class="panel panel-price" aria-labelledby="price-title">
      <h2 id="price-title" class="panel-title">Price seen</h2>
      <p class="price-big">${isNum(p.price_inr) ? src(priceUrl, inrAuto(p.price_inr), 'price listing') : DASH}<small> for ${esc(p.pack_size)}</small></p>
      <p class="price-meta">On <b>${esc(p.price_store)}</b>, ${fmtDate(p.price_date)}${isNum(p.mrp_inr) && p.mrp_inr !== p.price_inr ? ` · MRP ${src(priceUrl, inrAuto(p.mrp_inr), 'price listing')}` : ''}${isNum(p.units) && p.units > 1 && isNum(p.price_per_unit_inr) ? ` · ${inr(p.price_per_unit_inr, 2)} per unit` : ''}</p>
      <p class="price-fine">Prices change often and vary by city and pincode. The ranking uses this price.</p>
      ${buy ? `<div class="buy">${buy}</div>` : ''}
      <p class="price-fine">${esc(AFFILIATE_LINE)}</p>
    </section>
  </div>

  <p class="product-foot">Spotted a different number on the pack? <a href="${CORRECTIONS_MAILTO}">Report a correction</a> and we will re-check it. See <a href="/method/">how the numbers work</a>.</p>
</article>

${similar.length ? `<section class="similar wrap" aria-labelledby="sim-title">
  <h2 id="sim-title" class="section-title">Similar products</h2>
  <ul class="mini-grid">${similar.map(miniCard).join('')}</ul>
</section>` : ''}
`;
}

/* ----------------------------------------------------------------- seo */

export function seoPage({ slug, title, h1, intro, products, explainer, metric = 'p100', generated = '' }) {
  const primary = metric === 'inr' ? 'inr' : 'p100';
  const list = sortBy(products.filter(hasMetrics), primary);
  const max = maxOf(list, primary === 'inr' ? 'inr_per_10g_protein' : 'protein_per_100kcal');
  const rows = list
    .map((p, i) => {
      const main =
        primary === 'inr'
          ? `<b>${inr(p.inr_per_10g_protein, 2)}</b><small>per 10 g protein</small>`
          : `<b>${g(p.protein_per_100kcal)} g</b><small>protein per 100 kcal</small>`;
      const second =
        primary === 'inr'
          ? `${g(p.protein_per_100kcal)} g protein / 100 kcal`
          : `${inr(p.inr_per_10g_protein, 2)} / 10 g protein`;
      const val = primary === 'inr' ? p.inr_per_10g_protein : p.protein_per_100kcal;
      return `<li class="seo-item">
      <span class="seo-rank" aria-hidden="true">${i + 1}</span>
      <div class="seo-body">
        <h3 class="seo-name"><a href="/p/${esc(p.id)}/"><span class="p-brand">${esc(p.brand)}</span> ${esc(p.name)}</a></h3>
        <p class="seo-meta">${dietBadge(p.veg, { compact: true })} ${esc(catName(p.category))} · ${esc(p.pack_size)} · ${inrAuto(p.price_inr)} on ${esc(p.price_store)}, ${fmtDate(p.price_date)} · ${second}</p>
        ${metricBar(val, max, primary === 'inr' ? 'bar-inr' : 'bar-p100')}
      </div>
      <p class="seo-val">${main}</p>
    </li>`;
    })
    .join('');

  return `
<nav class="crumbs wrap" aria-label="Breadcrumb"><ol><li><a href="/">Rankings</a></li><li aria-current="page">${esc(h1)}</li></ol></nav>
<article class="seo wrap">
  <header class="seo-head">
    <p class="kicker">Ranking · ${list.length} product${list.length === 1 ? '' : 's'}${generated ? ` · updated ${fmtDate(generated)}` : ''}</p>
    <h1 class="page-title">${esc(h1)}</h1>
    <p class="lede">${esc(intro)}</p>
    <p class="seo-sortnote">Sorted by <b>${esc(SORTS[primary].label)}</b>.</p>
  </header>
  ${list.length ? `<ol class="seo-list">${rows}</ol>` : '<p class="empty">No products in this ranking yet. Check back after the next data update.</p>'}
  <aside class="explainer" aria-labelledby="exp-title">
    <h2 id="exp-title">How this list is made</h2>
    ${(Array.isArray(explainer) ? explainer : [explainer]).filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join('')}
    <p>Full formulas and rounding rules are on the <a href="/method/">method page</a>. Spot an error? <a href="${CORRECTIONS_MAILTO}">Report a correction</a>.</p>
  </aside>
</article>
<div class="wrap">${newsletterBox()}</div>
${seoLinks(slug)}
`;
}

/* --------------------------------------------------------- static pages */

export function disclaimerPage() {
  return `
<article class="prose wrap">
  <p class="kicker">The fine print</p>
  <h1 class="page-title">Disclaimer</h1>
  <p class="lede">ProteinOrNot.in publishes arithmetic on publicly available information. It is a reference tool, not advice.</p>
  <h2>Where the numbers come from</h2>
  <p>Nutrition values are taken from product labels, brand websites or store listings. Prices are the prices we saw on a named store on a named date. Each product page links to these sources and shows the date they were checked.</p>
  <h2>What the numbers mean</h2>
  <p>Rankings are calculated from two ratios: grams of protein per 100 kcal, and rupees per 10 g of protein. They describe value for protein only. They do not describe taste, ingredients, quality, safety or suitability for any person, and they are not a rating of any brand.</p>
  <h2>Things change</h2>
  <p>Prices change often and vary by city, pincode, offer and pack size. Brands update recipes and labels. Always read the pack you are buying. If you find a difference, please <a href="${CORRECTIONS_MAILTO}">report a correction</a> and we will re-check and update the page.</p>
  <h2>Not medical or nutrition advice</h2>
  <p>Nothing on this site is medical, dietary or nutrition advice. Talk to a qualified professional about your own needs, allergies or conditions.</p>
  <h2>Brands and trademarks</h2>
  <p>ProteinOrNot.in is independent and is not affiliated with, endorsed by or sponsored by any brand or store listed. Brand names and trademarks belong to their owners and are used only to identify products.</p>
  <h2>Links and affiliate disclosure</h2>
  <!-- PLACEHOLDER wording: affiliate disclosure; review before affiliate links go live -->
  <p>${esc(AFFILIATE_LINE)} Store links are marked so search engines treat them as sponsored. Rankings are sorted only by the numbers shown.</p>
  <h2>Accuracy</h2>
  <p>We check our numbers carefully, but errors are possible. The site is provided as is, without warranties of any kind.</p>
</article>`;
}

export function aboutMethodPage() {
  return `
<article class="prose wrap">
  <p class="kicker">Method</p>
  <h1 class="page-title">How the numbers work</h1>
  <p class="lede">Two ratios, worked out the same way for every product, from the label and the price we saw. No scores, no weighting, no opinions.</p>

  <section class="formula">
    <h2>1. Protein per 100 kcal</h2>
    <p class="eq"><span>protein (g)</span> ÷ <span>energy (kcal)</span> × 100</p>
    <p>How much protein you get for every 100 calories. Higher means more protein for the same calories. We use the per 100 g values from the label. If the label only gives per-serving values, we use those; the ratio is the same either way.</p>
    <p class="example">Example: 20 g protein and 240 kcal per bar → 20 ÷ 240 × 100 = <b>8.3 g per 100 kcal</b>.</p>
  </section>

  <section class="formula">
    <h2>2. ₹ per 10 g protein</h2>
    <p class="eq"><span>pack price (₹)</span> ÷ <span>protein in whole pack (g)</span> × 10</p>
    <p>What you pay for every 10 g of protein at the price seen. Lower means fewer rupees per gram. Protein in the pack is protein per 100 g × pack weight ÷ 100. If the pack weight is not known, we use protein per serving × number of units.</p>
    <p class="example">Example: ₹540 for 6 bars of 60 g, 33.3 g protein per 100 g → 33.3 × 360 ÷ 100 = 119.88 g protein → 540 ÷ 119.88 × 10 = <b>₹45.05 per 10 g protein</b> (rounded only at the end).</p>
  </section>

  <section class="formula">
    <h2>3. Price per unit</h2>
    <p class="eq"><span>pack price (₹)</span> ÷ <span>units in pack</span></p>
    <p>Used for lists like protein bars under ₹100, so multi-packs are compared per bar.</p>
  </section>

  <h2>Rounding</h2>
  <p>Grams are rounded to 1 decimal place and rupees to 2 decimal places, after the calculation. Ties are broken by protein per 100 kcal, then alphabetically.</p>
  <h2>What gets ranked</h2>
  <p>Only products with a protein value, an energy value and a price are ranked. Products with a missing value still get a page, marked with a dash and a data note, until the value is verified.</p>
  <h2>Prices</h2>
  <p>Each price is the whole-pack price on one named store on one date, including any discount shown at the time. Delivery charges are not included. Prices go out of date quickly; the date is always shown next to the price.</p>
  <h2>Sources</h2>
  <p>Every number on a product page links to its source: the nutrition label or listing, and the price listing. If a source disagrees with the pack in your hand, the pack wins. Please <a href="${CORRECTIONS_MAILTO}">report a correction</a>.</p>
</article>`;
}

export function notFoundPage() {
  return `
<section class="notfound wrap">
  <p class="kicker">404</p>
  <h1 class="page-title">This page has 0 g protein.</h1>
  <p class="lede">It may have moved, or the link has a typo.</p>
  <p><a class="btn btn-ink" href="/">Back to the rankings</a></p>
</section>`;
}

/* ------------------------------------------------------------ OG cards */

const OG_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1200px;height:630px;overflow:hidden}
body{background:#FBF6EA;color:#17150F;font-family:"Inter",system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;position:relative}
.disp{font-family:"Bricolage Grotesque","Inter",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
.card{position:absolute;inset:0;padding:56px 64px 0;display:flex;flex-direction:column}
.dots{position:absolute;inset:0;background-image:radial-gradient(#E4DCC8 1.6px,transparent 1.6px);background-size:22px 22px;opacity:.9}
.top{position:relative;display:flex;justify-content:space-between;align-items:center}
.wm{display:flex;align-items:center;gap:14px;font-weight:800;font-size:34px;letter-spacing:-.02em}
.wm svg{width:58px;height:34px}
.wm .or{font-style:italic;font-weight:600;color:#B8341A;margin:0 4px;font-size:.8em}
.wm .tld{color:#6B6455;font-weight:600;font-size:.7em}
.pill{background:#17150F;color:#FBF6EA;border-radius:999px;padding:10px 22px;font-size:22px;font-weight:600}
.main{position:relative;display:flex;gap:48px;margin-top:40px;flex:1}
.left{flex:1;min-width:0}
.brand{font-size:28px;font-weight:600;color:#4D483C;margin-bottom:10px}
.name{font-size:60px;line-height:1.02;font-weight:800;letter-spacing:-.025em;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.meta{margin-top:22px;font-size:24px;color:#4D483C;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.meta .chip{border:2px solid #17150F;border-radius:8px;padding:4px 12px;font-weight:600;color:#17150F;background:#fff}
.veg{color:#0B7A3E}.nonveg{color:#8A3B12}.egg{color:#9A5B00}
.right{width:400px;display:flex;flex-direction:column;gap:18px}
.stat{background:#fff;border:3px solid #17150F;border-radius:20px;padding:20px 26px;box-shadow:8px 8px 0 #17150F}
.stat.y{background:#FFC53D}
.stat .n{font-size:84px;line-height:1;font-weight:800;letter-spacing:-.03em}
.stat .n small{font-size:40px}
.stat .l{font-size:22px;font-weight:600;margin-top:6px}
.foot{position:relative;margin:0 -64px;background:#17150F;color:#FBF6EA;padding:18px 64px;font-size:22px;display:flex;justify-content:space-between}
.foot b{color:#FFC53D}
`;

function ogDoc(title, inner) {
  return `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link rel="stylesheet" href="${FONTS_HREF}">
<style>${OG_CSS}</style></head><body><div class="dots"></div>${inner}</body></html>`;
}

const OG_WM = `<div class="wm disp"><svg viewBox="0 0 44 26"><rect x="1.5" y="1.5" width="41" height="23" rx="11.5" fill="#FFC53D" stroke="#17150F" stroke-width="3"/><circle cx="30" cy="13" r="6.5" fill="#17150F"/></svg><span>Protein<span class="or">or</span>Not<span class="tld">.in</span></span></div>`;

export function ogCard(p, all = []) {
  const r = all.length ? categoryRank(p, all, 'inr') : null;
  const diet = { veg: ['veg', 'Veg'], 'non-veg': ['nonveg', 'Non-veg'], egg: ['egg', 'Contains egg'] }[p.veg] || ['', ''];
  return ogDoc(
    `${p.brand} ${p.name}`,
    `<div class="card">
  <div class="top">${OG_WM}<span class="pill">${r ? `#${r.rank} of ${r.of} ${esc(catName(p.category).toLowerCase())} by ₹/10 g protein` : esc(catName(p.category))}</span></div>
  <div class="main">
    <div class="left">
      <p class="brand">${esc(p.brand)}</p>
      <p class="name disp">${esc(p.name)}</p>
      <p class="meta"><span class="chip">${esc(p.pack_size)}</span>${diet[1] ? `<span class="chip ${diet[0]}">● ${diet[1]}</span>` : ''}<span class="chip">${esc(catName(p.category))}</span></p>
    </div>
    <div class="right">
      <div class="stat y"><p class="n disp">${g(p.protein_per_100kcal) ?? '–'}<small> g</small></p><p class="l">protein per 100 kcal</p></div>
      <div class="stat"><p class="n disp">${inr(p.inr_per_10g_protein, 2) ?? '–'}</p><p class="l">per 10 g protein</p></div>
    </div>
  </div>
  <div class="foot"><span>Price ${inrAuto(p.price_inr) ?? '–'} on ${esc(p.price_store)}, seen ${fmtDate(p.price_date)}</span><b>proteinornot.in</b></div>
</div>`
  );
}

export function ogCardSite(products = []) {
  const top = sortBy(products.filter(hasMetrics), 'inr').slice(0, 3);
  return ogDoc(
    'ProteinOrNot.in',
    `<div class="card">
  <div class="top">${OG_WM}<span class="pill">${products.length ? `${products.length} products tracked` : 'Packaged food, India'}</span></div>
  <div class="main">
    <div class="left">
      <p class="name disp" style="font-size:96px;line-height:.95">High protein?<br><span style="color:#B8341A;font-style:italic">Or not.</span></p>
      <p class="meta" style="font-size:28px;margin-top:28px">Protein per 100 kcal and ₹ per 10 g protein, for packaged food in India.</p>
    </div>
    <div class="right" style="justify-content:center">
      ${top
        .map(
          (p, i) => `<div class="stat${i === 0 ? ' y' : ''}" style="padding:14px 22px"><p class="l" style="margin:0 0 4px;font-size:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${i + 1}. ${esc(p.brand)} ${esc(p.name)}</p><p class="n disp" style="font-size:48px">${inr(p.inr_per_10g_protein, 2)}<small style="font-size:22px"> / 10 g protein</small></p></div>`
        )
        .join('')}
    </div>
  </div>
  <div class="foot"><span>Sorted by numbers. Every number sourced.</span><b>proteinornot.in</b></div>
</div>`
  );
}

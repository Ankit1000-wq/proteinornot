#!/usr/bin/env node
// ProteinOrNot.in static build. Node 20 built-ins only.
// Usage: node build.mjs [data/products.json]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as T from './src/templates.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(ROOT, process.argv[2] || 'data/products.json');
const DIST = path.join(ROOT, 'dist');
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;
const absent = (v) => v === undefined || v === null || v === '';

/* -------------------------------------------------------------- data */

function derive(p) {
  const q = { units: 1, stores: [], flags: [], notes: '', jain: null, ...p };
  if (!isNum(q.units) || q.units < 1) q.units = 1;
  if (!T.CATEGORIES[q.category]) {
    console.warn(`! ${q.id}: unknown category "${q.category}", using "other"`);
    q.category = 'other';
  }

  const per100 = isNum(q.protein_100g) && isNum(q.kcal_100g) && q.kcal_100g > 0;
  const perServ = isNum(q.protein_serving) && isNum(q.kcal_serving) && q.kcal_serving > 0;
  if (absent(q.protein_per_100kcal)) {
    q.protein_per_100kcal = per100
      ? r1((q.protein_100g / q.kcal_100g) * 100)
      : perServ
        ? r1((q.protein_serving / q.kcal_serving) * 100)
        : null;
  }

  let total = null;
  if (isNum(q.protein_100g) && isNum(q.pack_g)) total = (q.protein_100g * q.pack_g) / 100;
  else if (isNum(q.protein_serving)) total = q.protein_serving * q.units;
  q._total_protein_g = isNum(total) ? r1(total) : null;

  if (absent(q.inr_per_10g_protein)) {
    q.inr_per_10g_protein = isNum(q.price_inr) && isNum(total) && total > 0 ? r2((q.price_inr / total) * 10) : null;
  }
  if (absent(q.price_per_unit_inr)) {
    q.price_per_unit_inr = isNum(q.price_inr) ? r2(q.price_inr / q.units) : null;
  }
  return q;
}

function load() {
  const raw = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const seen = new Set();
  const products = [];
  for (const p of raw.products || []) {
    if (!p || typeof p.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(p.id)) {
      console.warn(`! skipping product with missing/invalid id: ${JSON.stringify(p?.id)}`);
      continue;
    }
    if (seen.has(p.id)) {
      console.warn(`! skipping duplicate id ${p.id}`);
      continue;
    }
    seen.add(p.id);
    products.push(derive(p));
  }
  return { generated: raw.generated || new Date().toISOString().slice(0, 10), products };
}

/* ------------------------------------------------------------ output */

// Prefix root-relative URLs (href="/...", src="/...", action="/...") with the base path.
// og/*.html cards are rendered from file:// and are left untouched.
function withBase(rel, content) {
  if (!T.BASE_PATH || !rel.endsWith('.html') || rel.startsWith('og' + path.sep) || rel.startsWith('og/')) return content;
  return content.replace(/((?:href|src|action|srcset)=["'])\/(?!\/)/g, `$1${T.BASE_PATH}/`);
}

function write(rel, content) {
  content = withBase(rel, content);
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

const page = (dir, opts) => write(path.join(dir, 'index.html'), T.layout(opts));

function seoDefs(products, year) {
  const ranked = products.filter(T.hasMetrics);
  const unitPrice = (p) => (p.units > 1 && isNum(p.price_per_unit_inr) ? p.price_per_unit_inr : p.price_inr);
  return [
    {
      slug: 'best-high-protein-snacks-india',
      title: `High-protein snacks in India (${year}), ranked by protein per 100 kcal`,
      h1: 'High-protein snacks in India, ranked by protein per 100 kcal',
      intro: 'Protein bars, chips, makhana and cookies sold in India, sorted by how many grams of protein each gives per 100 kcal. Price per 10 g protein is shown alongside.',
      metric: 'p100',
      products: ranked.filter((p) => ['chips-snacks', 'makhana', 'bar', 'cookies'].includes(p.category)),
      explainer: [
        'Included: products in the protein bars, chips & snacks, makhana and cookies categories that have a protein value, an energy value and a price.',
        'Protein per 100 kcal = protein (g) ÷ energy (kcal) × 100, from the nutrition label.',
      ],
    },
    {
      slug: 'cheapest-protein-per-rupee',
      title: `Cheapest protein per rupee in India (${year}): ₹ per 10 g protein`,
      h1: 'Cheapest protein per rupee: ₹ per 10 g protein',
      intro: 'Every product we track, sorted by what you pay for 10 g of protein at the price seen. Lower number means fewer rupees per gram of protein.',
      metric: 'inr',
      products: ranked,
      explainer: [
        'Included: every tracked product with a protein value, an energy value and a price.',
        '₹ per 10 g protein = pack price ÷ total protein in the pack × 10. Total protein = protein per 100 g × pack weight ÷ 100.',
      ],
    },
    {
      slug: 'best-protein-bars-under-100',
      title: `Protein bars under ₹100 in India (${year}), ranked by protein per 100 kcal`,
      h1: 'Protein bars under ₹100, ranked by protein per 100 kcal',
      intro: 'Protein bars that cost ₹100 or less per bar at the price seen, sorted by grams of protein per 100 kcal. Multi-packs are compared per bar.',
      metric: 'p100',
      products: ranked.filter((p) => p.category === 'bar' && isNum(unitPrice(p)) && unitPrice(p) <= 100),
      explainer: [
        'Included: protein bars where pack price ÷ number of bars is ₹100 or less, with protein, energy and price present.',
        'Prices change often; a bar can move in or out of this list after a price update.',
      ],
    },
    {
      slug: 'high-protein-veg-foods',
      title: `High-protein vegetarian foods in India (${year}), ranked by protein per 100 kcal`,
      h1: 'High-protein vegetarian foods, ranked by protein per 100 kcal',
      intro: 'Packaged foods marked vegetarian (green dot) on the pack, sorted by grams of protein per 100 kcal. Egg products are not included.',
      metric: 'p100',
      products: ranked.filter((p) => p.veg === 'veg'),
      explainer: [
        'Included: products marked vegetarian on the label, with protein, energy and price present.',
        'Jain suitability is shown on each product page where the label or listing states it.',
      ],
    },
  ];
}

function renderOg(files) {
  if (!fs.existsSync(CHROME)) {
    console.log(`- ${CHROME} not found; skipping OG PNG render (og/*.html written)`);
    return;
  }
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pon-chrome-'));
  const base = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1200,630',
    '--virtual-time-budget=3000',
    `--user-data-dir=${profile}`,
  ];
  let ok = 0;
  let extra = [];
  for (const html of files) {
    const png = html.replace(/\.html$/, '.png');
    const args = [...base, ...extra, `--screenshot=${png}`, pathToFileURL(html).href];
    try {
      execFileSync(CHROME, args, { stdio: 'ignore', timeout: 30000 });
    } catch {
      // Containers often need --no-sandbox; retry once with it for the rest of the run.
      if (!extra.length) {
        extra = ['--no-sandbox'];
        try {
          execFileSync(CHROME, [...base, ...extra, `--screenshot=${png}`, pathToFileURL(html).href], { stdio: 'ignore', timeout: 30000 });
        } catch (e) {
          console.warn(`! OG render failed for ${path.basename(html)}: ${e.message.split('\n')[0]}`);
          continue;
        }
      } else {
        console.warn(`! OG render failed for ${path.basename(html)}`);
        continue;
      }
    }
    if (fs.existsSync(png)) ok++;
  }
  fs.rmSync(profile, { recursive: true, force: true });
  console.log(`- rendered ${ok}/${files.length} OG images`);
}

/* -------------------------------------------------------------- main */

function main() {
  const { generated, products } = load();
  const year = generated.slice(0, 4);
  console.log(`Building from ${path.relative(ROOT, DATA)}: ${products.length} products`);

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const urls = [];
  const common = { generated };

  // Home
  const ranked = products.filter(T.hasMetrics).length;
  page('', {
    ...common,
    title: 'ProteinOrNot.in: high-protein packaged food in India, ranked by ₹ per gram',
    description: `${products.length} high-protein packaged foods sold in India, compared on protein per 100 kcal and ₹ per 10 g protein. Every number linked to its source.`,
    canonicalPath: '/',
    ogImagePath: '/og/site.png',
    body: T.homePage(products, { generated, ranked }),
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'ProteinOrNot.in', url: T.SITE + '/' },
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'High-protein packaged foods ranked by ₹ per 10 g protein',
        itemListElement: T.sortBy(products.filter(T.hasMetrics), 'inr').map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${T.SITE}/p/${p.id}/`,
          name: `${p.brand} ${p.name}`,
        })),
      },
    ],
  });
  urls.push('/');

  // Product pages
  for (const p of products) {
    const bits = [
      isNum(p.protein_per_100kcal) && `${T.g(p.protein_per_100kcal)} g protein per 100 kcal`,
      isNum(p.inr_per_10g_protein) && `${T.inr(p.inr_per_10g_protein, 2)} per 10 g protein`,
      isNum(p.price_inr) && `${T.inr(p.price_inr)} on ${p.price_store}`,
    ].filter(Boolean);
    const offer = isNum(p.price_inr)
      ? { '@type': 'Offer', price: p.price_inr, priceCurrency: 'INR', ...(p.price_url ? { url: p.price_url } : {}) }
      : undefined;
    page(`p/${p.id}`, {
      ...common,
      title: `${p.brand} ${p.name}: protein per ₹ and per 100 kcal | ProteinOrNot.in`,
      description: `${p.brand} ${p.name} (${p.pack_size}): ${bits.join(', ')}. Sources and dates on the page.`,
      canonicalPath: `/p/${p.id}/`,
      ogImagePath: `/og/${p.id}.png`,
      body: T.productPage(p, products),
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: `${p.brand} ${p.name}`,
          brand: { '@type': 'Brand', name: p.brand },
          category: T.CATEGORIES[p.category],
          ...(offer ? { offers: offer } : {}),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Rankings', item: T.SITE + '/' },
            { '@type': 'ListItem', position: 2, name: `${p.brand} ${p.name}`, item: `${T.SITE}/p/${p.id}/` },
          ],
        },
      ],
    });
    urls.push(`/p/${p.id}/`);
  }

  // SEO ranking pages
  for (const d of seoDefs(products, year)) {
    const list = T.sortBy(d.products, d.metric);
    page(d.slug, {
      ...common,
      title: `${d.title} | ProteinOrNot.in`,
      description: d.intro,
      canonicalPath: `/${d.slug}/`,
      ogImagePath: '/og/site.png',
      body: T.seoPage({ ...d, generated }),
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: d.h1,
        itemListElement: list.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${T.SITE}/p/${p.id}/`, name: `${p.brand} ${p.name}` })),
      },
    });
    urls.push(`/${d.slug}/`);
  }

  // Static pages
  page('disclaimer', { ...common, title: 'Disclaimer | ProteinOrNot.in', description: 'Where the numbers on ProteinOrNot.in come from, what they mean, and what they do not mean.', canonicalPath: '/disclaimer/', body: T.disclaimerPage() });
  page('method', { ...common, title: 'How we calculate: protein per 100 kcal and ₹ per 10 g protein | ProteinOrNot.in', description: 'Formulas for protein per 100 kcal and ₹ per 10 g protein, with worked examples, rounding rules and how label values and Jain info are used.', canonicalPath: '/method/', body: T.aboutMethodPage() });
  page('disclosure', { ...common, title: 'Affiliate & sponsorship disclosure | ProteinOrNot.in', description: 'Store links may earn a commission in future. Rankings are pure maths from label values and prices, and are never paid for.', canonicalPath: '/disclosure/', body: T.disclosurePage() });
  urls.push('/method/', '/disclaimer/', '/disclosure/');
  write('404.html', T.layout({ ...common, title: 'Page not found | ProteinOrNot.in', description: 'Page not found.', canonicalPath: '/404.html', body: T.notFoundPage(), noindex: true }));

  // Assets
  fs.copyFileSync(path.join(ROOT, 'src/styles.css'), path.join(DIST, 'styles.css'));
  fs.copyFileSync(path.join(ROOT, 'src/app.js'), path.join(DIST, 'app.js'));

  // SEO plumbing
  write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${T.SITE}${u}</loc><lastmod>${generated}</lastmod></url>`)
      .join('\n')}\n</urlset>\n`
  );
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${T.SITE}/sitemap.xml\n`);

  // OG cards
  const ogFiles = [];
  const og = (name, html) => {
    write(`og/${name}.html`, html);
    ogFiles.push(path.join(DIST, 'og', `${name}.html`));
  };
  og('site', T.ogCardSite(products));
  for (const p of products) og(p.id, T.ogCard(p, products));

  console.log(`- wrote ${urls.length} pages + 404, sitemap, robots, ${ogFiles.length} OG cards to dist/`);
  if (!process.env.SKIP_OG) renderOg(ogFiles);
}

main();

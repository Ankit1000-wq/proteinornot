# Design + frontend brief for ProteinOrNot.in (v1, local static build)

You are the designer/frontend engineer. Work ONLY inside /workspace/proteinornot. No network access is needed: do NOT deploy, publish, sign up, install global packages, or contact anyone. Use only Node 20 built-ins (no npm dependencies) so the site builds with `node build.mjs`.

## Product
ProteinOrNot.in: a free site ranking "high protein" packaged foods sold in India by value (protein per 100 kcal, Rs per 10 g protein). Owner: Ankit, Mumbai. Traffic comes from Instagram/Reddit, so MOBILE-FIRST. Personality: fun, trustworthy, numbers-first, like a well-designed indie data site (think Pudding.cool / Our World in Data meets a cheeky Indian D2C brand). NOT a generic Bootstrap template.

LEGAL SAFETY (strict): neutral facts and maths only. Never use words like "fake", "misleading", "protein-washing", "scam", "worst", or any judgment of a brand. Copy must be neutral ("Protein per 100 kcal: 4.1 g"). Every number on product pages links to its source URL. Every page footer: "Report a correction" (mailto:corrections@proteinornot.in?subject=Correction — mark as placeholder in code comment), link to Disclaimer page, and an affiliate disclosure line ("Some buy links may become affiliate links in future; this never changes rankings." - placeholder wording).

## Deliverables
1. /workspace/proteinornot/DESIGN.md: brand personality, colour palette (hex, with contrast notes), typography (free Google Fonts, loaded via <link>; include system fallbacks), logo wordmark idea (render it in pure HTML/CSS/inline SVG, no image files), homepage layout, mobile table/card layout, product detail page, share card (OG image 1200x630) design, SEO page template, newsletter box.
2. /workspace/proteinornot/src/styles.css: the full stylesheet.
3. /workspace/proteinornot/src/templates.mjs: ES module exporting pure functions returning HTML strings:
   - layout({title, description, canonicalPath, ogImagePath, body, jsonLd})  -> full <html> doc with meta, OG/Twitter tags, canonical (base URL const SITE='https://proteinornot.in'), header nav, footer.
   - homePage(products, meta) -> hero + filter bar + sortable table (desktop) / cards (mobile) + newsletter box + "Best protein per Rs this week" block (top 5 by inr_per_10g_protein).
   - productPage(product, allProducts) -> detail page: key numbers big, rank within category, nutrition table with source links, price with store + date + source link, Buy buttons (use stores[].affiliate_url if non-empty else stores[].url; rel="nofollow sponsored noopener"), veg/Jain badges, flags note if any field unverified, similar products.
   - seoPage({slug, title, h1, intro, products, explainer}) -> generated ranking page (ordered list/table driven by data, short factual methodology explainer).
   - disclaimerPage(), aboutMethodPage() (how numbers are computed).
   - ogCard(product) -> standalone 1200x630 HTML page (inline CSS) for the share image; will be screenshotted by headless Chrome into /og/<id>.png. Also ogCardSite() for the homepage.
   - newsletter box: a <form> with action="#" and a clear `<!-- TODO: connect real newsletter provider (e.g. Buttondown/ConvertKit) -->` comment; JS shows a "Thanks, coming soon" message, sends nothing.
4. /workspace/proteinornot/src/app.js: client JS for the homepage: filters (category multi/select, veg/non-veg/egg, budget max price in Rs, store), sort (protein per 100 kcal desc, Rs per 10 g protein asc, price asc, protein per serving desc), search box, URL query-string state so filtered views are shareable, result count. Data embedded as JSON in the page (<script type="application/json" id="data">). Must work with JS; without JS the table still renders server-side (default sort Rs/10g protein asc).
5. /workspace/proteinornot/build.mjs: reads data/products.json, computes derived fields if absent, writes dist/: index.html, p/<id>/index.html, best-high-protein-snacks-india/, cheapest-protein-per-rupee/, best-protein-bars-under-100/, high-protein-veg-foods/, disclaimer/, method/, sitemap.xml, robots.txt, 404.html, styles.css, app.js, and og/<id>.html (+ og/site.html) card pages. Then (if /usr/bin/google-chrome exists) render each og/*.html to og/*.png via `google-chrome --headless=new --screenshot=... --window-size=1200,630 --hide-scrollbars file://...` (child_process). OG meta tags point to /og/<id>.png.
   SEO page rules (data-driven): snacks = categories chips-snacks, makhana, bar, cookies, sorted by protein_per_100kcal; cheapest = all, sorted by inr_per_10g_protein; bars under 100 = category bar with price_per_unit_inr <= 100 (fall back to price_inr if pack is single), sorted by protein_per_100kcal; veg = veg==="veg", sorted by protein_per_100kcal. Only products with protein, kcal and price present.

## Data schema (data/products.json = {"generated":"YYYY-MM-DD","products":[...]})
Each product:
{
 "id": "slug-unique",
 "brand": "", "name": "", "category": one of ["bar","chips-snacks","makhana","cookies","paneer","curd-yogurt","bread","drink-shake","whey","peanut-butter","other"],
 "pack_size": "e.g. 6 x 60 g", "pack_g": number|null (total grams or ml), "units": number (items in pack, default 1),
 "serving_g": number|null, "veg": "veg"|"non-veg"|"egg", "jain": true|false|null,
 "price_inr": number (price seen for whole pack), "mrp_inr": number|null, "price_store": "Amazon"|"Brand site"|"BigBasket"|..., "price_url": "", "price_date": "YYYY-MM-DD",
 "protein_100g": number|null, "kcal_100g": number|null, "protein_serving": number|null, "kcal_serving": number|null,
 "nutrition_url": "", "nutrition_date": "YYYY-MM-DD",
 "stores": [{"name":"Amazon","url":"","affiliate_url":""}],
 "image": null, "flags": ["e.g. kcal per serving only; per-100g derived"], "notes": ""
}
Derived (compute in build.mjs): protein_per_100kcal = protein/kcal*100 (use per-100g if present else per-serving); inr_per_10g_protein = price_inr / (total_protein_in_pack) * 10 where total protein = protein_100g * pack_g/100 (if pack_g known) else protein_serving*units; price_per_unit_inr = price_inr/units. Round to 1 decimal / 2 for Rs.
Categories display names: Protein bars, Chips & snacks, Makhana, Cookies, Paneer, Curd & Greek yogurt, Breads, Drinks & shakes, Whey, Peanut butter, Other.

Create /workspace/proteinornot/data/sample.json with ~8 clearly fictional sample products (brand "Sample Brand A" etc.) so you can build and check your design; build.mjs takes optional arg path: `node build.mjs data/sample.json`. Default path is data/products.json (being researched separately by another agent; don't create or edit products.json).

You may run `node build.mjs data/sample.json` and render screenshots with google-chrome headless to check your work visually (e.g. 1440x900 desktop and 390x844 mobile into /workspace/proteinornot/design/check-*.png) and iterate on the visuals. Keep pages fast: no frameworks, no external JS, fonts are the only external request. Accessibility: semantic HTML, focus states, AA contrast, table has proper th scope, cards are readable at 360px wide.

When done, print a short summary of files created and design decisions.

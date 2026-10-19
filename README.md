# ProteinOrNot.in — v1 (local build)

Static site generated from `data/products.json`. No npm dependencies (Node 20 built-ins only).

## Run locally
```
node build.mjs                        # builds dist/ for https://proteinornot.in (root)
python3 -m http.server 8080 -d dist   # then open http://localhost:8080
```
Base URL is a build setting (`SITE_URL`). Canonicals, OG tags, sitemap and all internal
links follow it, e.g. for the GitHub project page:
```
SITE_URL=https://ankit1000-wq.github.io/proteinornot node build.mjs
```
(For local preview, use the default root build; a subpath build expects to be served under /proteinornot/.)
Other env: `SKIP_OG=1` skips rendering share PNGs; `CHROME_PATH` overrides the Chrome binary.

## Deploy
GitHub Actions (`.github/workflows/pages.yml`) builds on every push to `main` and publishes `dist/` to GitHub Pages.
Repo variables: `SITE_URL` (default `https://ankit1000-wq.github.io/proteinornot`), `CUSTOM_DOMAIN` (writes `dist/CNAME` when set).
`node build.mjs data/sample.json` builds from fictional sample data (design testing only).
Screenshots: `node screens/shoot.mjs` (serves dist/ on a random port and writes PNGs to screens/).

## Files
- `DESIGN.md` — design system (written by Claude Code, headless, Opus).
- `src/templates.mjs`, `src/styles.css`, `src/app.js`, `build.mjs` — frontend + generator.
- `data/products.json` (source of truth) and `data/products.csv` (export).
- Research scripts and label photos are kept out of this repo.

## Data rules
- Prices: brand-site listing price on `price_date` (Shopify `products.json` feed / page JSON-LD).
- Nutrition: read from the label image on the brand's listing (`nutrition_url` points at that image); The Whole Truth uses the nutrition data on its product page.
- `flags` explain anything derived (per-100 g from per-serving, pack weight from label serving count, dry-basis protein, out of stock).
- `stores[].affiliate_url` is the placeholder for affiliate links (empty = plain link is used).


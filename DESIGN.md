# ProteinOrNot.in: design system (v1)

## 1. Personality

**"A nutrition label that learned to tell jokes, but only about itself."**

- **Numbers first.** The biggest thing on every screen is a number. Copy explains the number, never the brand.
- **Trustworthy.** Every number on a product page is a link to its source. Dates sit next to prices. Formulas are shown inline ("15 g ÷ 190 kcal × 100").
- **Fun, not snarky.** The cheek lives in the frame (the *Or not.* headline, the toggle logo, the 404 "This page has 0 g protein"), never in judgements of products. Product copy stays neutral: "Protein per 100 kcal: 4.1 g".
- **Visual reference.** Pudding.cool / Our World in Data for the data. A Mumbai D2C snack packet for the energy: warm paper, haldi yellow, chunky ink outlines, offset "sticker" shadows.

**Legal copy rules.** Never use "fake", "misleading", "protein-washing", "scam", "worst" or any brand judgement. Use: "higher / lower", "per 100 kcal", "price seen on <store>, <date>", "not yet verified". (Grep check: `grep -riE 'fake|misleading|protein-washing|scam|worst' src dist`.)

## 2. Colour

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--paper` | `#FBF6EA` | Page background (warm label paper) | n/a |
| `--card` | `#FFFFFF` | Cards, panels, table | n/a |
| `--ink` | `#17150F` | Text, 2px borders, shadows | 16.9:1 on paper |
| `--ink-2` | `#4D483C` | Secondary text | 8.4:1 on paper |
| `--ink-3` | `#6B6455` | Tertiary text, small labels | 5.4:1 on paper, 5.9:1 on white |
| `--haldi` | `#FFC53D` | Highlight fills: #1 rank, key tile, buy button. **Background only, never text on paper** | ink on haldi 11.6:1; haldi on ink 11.6:1 |
| `--haldi-soft` | `#FFF1C7` | Soft highlight (first row, price panel, data notes) | ink-2 on it 8.1:1 |
| `--chilli` | `#B8341A` | Accent text (kickers, *or*, link underlines) | 5.5:1 on paper |
| `--leaf` | `#0B7A3E` | Veg mark; protein-per-kcal bars | 5.0:1 on paper, 5.4:1 on white |
| `--nonveg` | `#8A3B12` | Non-veg mark (FSSAI brown) | 7.7:1 on white |
| `--egg` | `#8F5500` | Egg mark | 6.1:1 on white |
| `--bar-inr` | `#D98E04` | ₹-per-protein bars (decorative; the number is always printed beside it) | n/a |
| `--focus` | `#2457D6` | Focus ring (3px outline) | 5.7:1 on paper |

All text pairs pass WCAG AA (4.5:1). Colour never carries meaning alone: diet marks have shapes (square + circle for veg, square + triangle for non-veg) and text labels; bars always sit next to the printed number.

## 3. Typography

Loaded with one `<link>` from Google Fonts (`display=swap`), with system fallbacks:

- **Display: Bricolage Grotesque** (500 to 800, optical size 12 to 96). Quirky ink-trap grotesque for headlines and big numbers. It gives the D2C personality.
  Fallback: `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Body / data: Inter** (400 to 700), with `font-variant-numeric: tabular-nums` on every number column so digits line up.
  Fallback: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`

Scale (fluid with `clamp`): hero 2.7 to 5.6rem / page title 2 to 3.4rem / section 1.5 to 2.1rem / key-number tiles 2.8 to 4.2rem / body 1rem / labels 0.68 to 0.8rem uppercase, +0.05em tracking.

## 4. Logo / wordmark

Pure inline SVG + text, no image files (`wordmark()` in `templates.mjs`):

`[● toggle]  Protein`*`or`*`Not`.in

- **Mark:** a haldi-yellow toggle switch with an ink knob. "Protein or not" is a binary, like a switch. On hover the knob slides left (CSS transform; disabled under `prefers-reduced-motion`).
- **Word:** Bricolage 800. *or* is italic, smaller and chilli red; `.in` is small and muted.
- The favicon is the same toggle as an SVG data URI.

## 5. Homepage layout (mobile-first)

1. **Header:** wordmark plus a pill nav (Rankings · Per ₹ · Snacks · Veg · Method). On mobile the nav wraps under the logo as a horizontal scroll row; the current page is an ink-filled pill.
2. **Hero** on a dotted label-paper grid: kicker → **"High protein? *Or not.*"** (the *Or not.* in chilli italic with a haldi highlighter swipe) → one-line explainer naming the two metrics → CTAs. Next to it, 4 sticker stat cards (products tracked, categories, lowest ₹/10 g, highest g/100 kcal). Under it, a **legend** explaining the two metrics and their bar colours (green = protein per 100 kcal, haldi = ₹ per 10 g).
3. **Best protein per ₹ this week:** top 5 by `inr_per_10g_protein`. A list of cards with a bar chart: bar length = ₹ per 10 g (literal, so "shorter bar = fewer rupees"). #1 gets a haldi fill and an ink rank disc.
4. **All products:**
   - Filter box (JS only; hidden for no-JS): search + sort always visible; a `<details>` "Filters" drawer (open by default on ≥60em or when the URL has filters) with category chips (multi-select, with counts), diet chips (All/Veg/Egg/Non-veg), max-pack-price slider (shows "Any" / "up to ₹X"), and a store select. An "N on" badge shows active filters.
   - Live result count (`aria-live`).
   - Ranking table, server-rendered and sorted by ₹/10 g ascending, so it works without JS.
   - Empty state with a reset button.
5. **Newsletter box** ("The Protein Ledger"), then "More rankings" pill links to the SEO pages.
6. **Footer:** wordmark, data-updated date, ranking links, Method, Disclaimer, **Report a correction** (mailto placeholder), affiliate disclosure line, "not affiliated / not advice".

URL state: `?q=&cat=bar,makhana&diet=veg&max=200&store=Amazon&sort=p100`. Defaults are omitted, so links stay clean. The app uses `history.replaceState`, so filter changes don't spam the back button.

## 6. Table vs cards

One `<table>` (with `th scope`, a caption, `aria-sort` on sortable headers, and explicit ARIA roles so semantics survive the `display` change). It reflows by CSS only:

- **< 60em: cards.** Each `<tr>` becomes a CSS grid card:
  ```
  [rank]  Brand / Product name (link)
          ● diet · Jain · pack · category
          PROTEIN/100 KCAL   ₹/10 G PROTEIN     <- big Bricolage numbers + mini bars
          PROTEIN/SERVING    PACK PRICE store
  ```
  Labels come from `data-label` via `::before`. Readable at 360px (checked: `design/check-home-mobile-360.png`).
- **≥ 60em: a classic table** with a sticky ink header row. The header cells are sort buttons showing "↑ low first / ↓ high first". Numbers are right-aligned and tabular, with a mini bar under each metric. Rows get a haldi-soft hover.

Products missing protein, kcal or price show "–" and always sort after ranked products.

## 7. Product detail page

- Breadcrumb → kicker (category) → brand (small) + product name (big) → diet mark, Jain tag (only if the label says so), pack tag → **rank pills** ("#2 of 3 protein bars by ₹ per 10 g protein", "#1 of 3 … by protein per 100 kcal").
- **Data note** (haldi-soft, thick left rule) appears when `flags` or `notes` exist.
- **Three key-number tiles:** Protein per 100 kcal (haldi), ₹ per 10 g protein, protein per serving. Each big number is a dotted-underline link to its source, with the working shown under it ("₹99 ÷ 15 g protein in pack × 10").
- **Nutrition panel:** per 100 g / per serving table; every value links to `nutrition_url`; caption shows the checked date. Facts: diet, Jain (Yes / No / Not stated), pack, total protein in pack.
- **Price panel:** big price (linked to `price_url`), store, date, MRP, per-unit price; pincode caveat; **Buy buttons** (`affiliate_url` if set, else `url`; `rel="nofollow sponsored noopener"`); affiliate line.
- "Report a correction" line, then **Similar products** (same category first, then nearest by ₹/10 g; 4 mini cards).
- JSON-LD: `Product` (+ `Offer` in INR) and `BreadcrumbList`.

## 8. Share card (OG image, 1200 × 630)

Rendered from `og/<id>.html` to PNG by headless Chrome at build time.

```
┌──────────────────────────────────────────────────────────────┐
│ [toggle] ProteinorNot.in         ( #2 of 3 protein bars by ₹/10 g ) │
│                                                              │
│ Sample Brand B                    ┌───────────────────┐ haldi │
│ Whey Crisp Bar,                   │ 7.9 g              │       │
│ Cookies & Cream   (Bricolage 60)  │ protein per 100kcal│       │
│ [1×50 g] [● Veg] [Protein bars]   └───────────────────┘       │
│                                   ┌───────────────────┐ white │
│                                   │ ₹66.00             │       │
│                                   │ per 10 g protein   │       │
│                                   └───────────────────┘       │
│▓ Price ₹99 on BigBasket, seen 14 Oct 2026      proteinornot.in ▓│
└──────────────────────────────────────────────────────────────┘
```

Dotted paper background, sticker shadows, product name clamped to 3 lines. The price and date are always on the card, so a screenshot shared out of context still carries its date. The site card (`og/site.html`) uses the hero headline plus the top 3 by ₹/10 g.

## 9. SEO ranking page template

Breadcrumb → kicker ("Ranking · N products · updated <date>") → H1 → one-paragraph factual intro → "Sorted by …" pill → **ordered list of cards**: big rank number, brand/name link, meta line (diet, category, pack, price, store, date, secondary metric), bar, big primary metric → **"How this list is made"** dashed box (inclusion rule + formula + link to Method + correction link) → newsletter → links to the other rankings. JSON-LD `ItemList`. The first item gets the haldi-soft "sticker" treatment.

Pages and rules (built in `build.mjs`; only products with protein, kcal and price):

| Path | Filter | Sort |
|---|---|---|
| `/best-high-protein-snacks-india/` | bar, chips-snacks, makhana, cookies | protein per 100 kcal ↓ |
| `/cheapest-protein-per-rupee/` | all | ₹ per 10 g ↑ |
| `/best-protein-bars-under-100/` | bar, per-unit price ≤ ₹100 (pack price if single) | protein per 100 kcal ↓ |
| `/high-protein-veg-foods/` | veg === "veg" | protein per 100 kcal ↓ |

## 10. Newsletter box

An ink block with a haldi circle peeking from the top-right corner. Kicker "Newsletter", title **The Protein Ledger**, one-line promise, then a rounded email input + haldi "Subscribe" button. `<form action="#">` with `<!-- TODO: connect real newsletter provider -->`. JS intercepts submit, validates, and shows "Thanks, coming soon! … nothing was sent or stored." in a `role="status"` line. Nothing is sent.

## 11. Components and tokens

- Border 2px ink; radius 14px (cards) / 8px (inputs) / pill (buttons, chips); sticker shadow `4px 4px 0 ink` on hover and on the "featured" item.
- Buttons ≥ 44px tall; chips ≥ 38px with a full-size invisible input for tap area.
- Focus: 3px blue outline everywhere (haldi on dark surfaces). There is a skip link.
- Motion: tiny lift on hover; everything disabled under `prefers-reduced-motion`.
- Print: hides nav, filters, newsletter and buy buttons.

## 12. Performance

No framework, no external JS. One CSS file (~31 KB unminified, ~6 KB gzipped), one deferred JS file (~8 KB), and fonts as the only third-party request (with preconnect). The table is server-rendered; JS only reorders and hides existing rows (no re-templating client-side). Data is embedded as `<script type="application/json" id="data">`.

## 13. Placeholders to resolve before launch

- `corrections@proteinornot.in` mailbox (`CORRECTIONS_MAILTO` in `templates.mjs`).
- Affiliate disclosure wording (`AFFILIATE_LINE`).
- Newsletter provider (form in `newsletterBox()`, handler in `app.js`).
- Possible later: dark mode (tokens are already centralised), product images (`image` field is unused in v1).

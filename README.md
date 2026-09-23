# Erbalatte — nuovo sito (mockup)

A clickable mockup of the merged **erbalatte.it** (showcase) + **erbalatte.shop** (WooCommerce) site, built to present to the client. It's static HTML/CSS/JS, the 3D uses Three.js from a CDN, and there's no build step.

## Run it

```bash
node serve.mjs 5190
```

Then open http://localhost:5190. The 3D modules need a server; opening the files with `file://` won't work.

## Pages

| Page | What it shows |
|---|---|
| `index.html` | Home: cute 3D cow on her meadow (looks at you, grazes, follows the pointer), +19/+27/+25, "Si chiama Erbalatte perché", the journey in 6 steps, products, testimonials, shipping |
| `negozio.html` | Shop: rotatable 3D carton (Intero / Parz. scremato), stepped case-price ladder, cart drawer, checkout step (Stripe placeholder), FAQ |
| `storia.html` | **Scroll-driven 3D story**: meadow → the cow eats → care (sensor, hearts) → milking → packaging line → the carton; then history, team and the soil–animal–human balance |
| `professionisti.html` | B2B: testimonials ("Scelto da") + quote request form |
| `admin.html` | Admin preview: edit case prices and stock, then the shop and home update live in the same browser (localStorage) |

## Design direction (v2)

Clean and white, in the spirit of the original erbalatte.it, refined. The brand greens are #509A48 leaf, #8FBC8B sage and #BADDB6 mint, with #3F8438 used for accessible text. Type is Poppins: light headlines with semibold green emphasis. Buttons are pills and cards are soft. Drifting leaves echo the original bottle illustration. Carton red is used only for the semi-skimmed milk. The wow comes from the motion: a toon-shaded cute cow (`assets/js/cow.js`), the hero scene (`hero3d.js`) and the story (`story3d.js`).

The first, dark "enamel sign" version is archived in `.impeccable/v1/`.

Debug: add `?snap` to `storia.html` to make the camera jump without easing (useful for screenshots).

## Placeholders to confirm with the client

- Admin orders, KPIs, B2B requests: **demo data**.
- FAQ answers: to confirm (marked on page).
- University report PDF link: to add (the old site had a "Leggi il report" link).
- Semi-skimmed nutrition values: to copy from the pack. Only the Intero values (from the carton) are shown.
- Privacy / cookie / terms pages.

All prices, product names, claims (+19% protein, +27% vit. A, +25% vit. E), testimonials, history and contacts come from the current erbalatte.it / erbalatte.shop.

## Phase 2 (backend)

- Replace `assets/js/store.js` catalogue/cart with an API (products, tiers, stock, orders).
- Stripe Checkout / Payment Element for cards, Apple Pay and Google Pay; webhooks mark orders as paid.
- Real admin with authentication; order list, shipping status, B2B lead inbox.
- Header/footer (`assets/js/chrome.js`) become server-side partials.
- Pricing change vs. the current shop: the per-litre tier is applied to the **total cases in the cart** (Intero and semi-skimmed can be mixed). Confirm with the client.

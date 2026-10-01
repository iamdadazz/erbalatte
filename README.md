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
| `index.html` | Home: realistic 3D Friesian on her meadow (looks at you, grazes, follows the pointer), +19/+27/+25, the journey in 6 steps, products, testimonials, shipping |
| `storia.html` | **Scroll-driven 3D story**: meadow with the herd → breakfast → the barn with the herd (sensor, feed rail, straw) → a colourful milking parlour → packaging line → the cartons on a farmhouse table; then history and the soil–animal–human balance |
| `negozio.html` | Shop: rotatable 3D carton, stepped case-price ladder, **Acquista ora** (express checkout) and Aggiungi al carrello, cart drawer, checkout that creates a real (local) order |
| `blog.html` / `articolo.html?a=…` | Blog: the 20 posts from erbalatte.it/news rewritten, with categories, filters, sources, YouTube embed, share, reading progress |
| `registrati.html` / `accedi.html` / `account.html` | Registration (private or business: P.IVA, SDI/PEC; shipping address; consents), login, account with order history and shipment tracking |
| `professionisti.html` | B2B: testimonials ("Scelto da") + quote request form |
| `admin.html` | Admin: overview, **orders** (filters, search, CSV export, detail drawer: status, carrier, tracking number + link, notes, automatic customer email with preview and history), products and tiered prices, customers, email templates |

Everything is stored in the browser's localStorage, so it can be demoed end to end: register → buy now → see the order in the admin → mark it as shipped with BRT and a tracking number → the customer sees the tracking in their account. The emails are simulated (shown in the admin).

## Design direction (v2)

Clean and white, in the spirit of the original erbalatte.it, refined. v3 adds realistic cows (`buildRealCow` in `cow.js`), a herd, smooth scrolling (Lenis, desktop) and soft cross-page transitions. The brand greens are #509A48 leaf, #8FBC8B sage and #BADDB6 mint, with #3F8438 used for accessible text. Type is Poppins: light headlines with semibold green emphasis. Buttons are pills and cards are soft. Drifting leaves echo the original bottle illustration. Carton red is used only for the semi-skimmed milk. The wow comes from the motion: a toon-shaded cute cow (`assets/js/cow.js`), the hero scene (`hero3d.js`) and the story (`story3d.js`).

The first, dark "enamel sign" version is archived in `.impeccable/v1/`.

Debug: add `?snap` to `storia.html` to make the camera jump without easing (useful for screenshots).

## Placeholders to confirm with the client

- Seed orders (EL-1281…1284) and B2B requests in the admin: **demo data**. Orders placed in the shop are real within the browser.
- Emails: simulated. Phase 2 sends them via a transactional email service (e.g. Postmark, Resend) from the backend.
- Passwords are hashed in the browser for the demo only; phase 2 uses real server-side authentication.
- Blog: the 'Programma di Sviluppo Rurale 2023-2027' post needs the project details.
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

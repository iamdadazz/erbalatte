/* Erbalatte mockup — catalogue, cart, drawer, header, reveals.
   The catalogue lives in localStorage so the admin preview can edit
   prices and stock and the shop reflects them immediately. In phase 2
   this module is swapped for API calls (catalogue, cart, Stripe checkout). */

const CATALOG_KEY = 'erbalatte.catalog.v1';
const CART_KEY = 'erbalatte.cart.v1';

export const DEFAULT_CATALOG = {
  tiers: [
    { cases: 1, perLitre: 2.99 },
    { cases: 2, perLitre: 2.79 },
    { cases: 3, perLitre: 2.69 },
    { cases: 4, perLitre: 2.59 },
    { cases: 5, perLitre: 2.59 },
    { cases: 6, perLitre: 2.48 },
  ],
  litresPerCase: 12,
  products: {
    intero: {
      id: 'intero',
      name: 'Latte Intero UHT',
      short: 'Intero',
      tone: 'green',
      img: 'assets/img/Latte-intero-Agricoltura-simbiotica-Erbalatte-Fronte.webp',
      stock: 84,
      active: true,
      blurb: 'Il gusto pieno e dolce del latte di una volta. Ideale al naturale, nel cappuccino e in cucina.',
    },
    scremato: {
      id: 'scremato',
      name: 'Latte Parzialmente Scremato UHT',
      short: 'Parz. scremato',
      tone: 'rosa',
      img: 'assets/img/Latte-parzialmente-scremato-Agricoltura-simbiotica-Erbalatte-Fronte.webp',
      stock: 57,
      active: true,
      blurb: 'Più leggero, stesso profumo di prato. Per la colazione di tutti i giorni.',
    },
  },
};

const safe = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: keep in memory */ } },
};

let memCatalog = null;
export function getCatalog() {
  const stored = safe.get(CATALOG_KEY);
  if (stored && stored.tiers && stored.products) return stored;
  return memCatalog || structuredClone(DEFAULT_CATALOG);
}
export function saveCatalog(cat) {
  memCatalog = cat;
  safe.set(CATALOG_KEY, cat);
  window.dispatchEvent(new CustomEvent('catalog:change'));
}
export function resetCatalog() { saveCatalog(structuredClone(DEFAULT_CATALOG)); }

export const eur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
export const eurL = (n) => `${new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2 }).format(n)} €/L`;

export function tierFor(cases, cat = getCatalog()) {
  const sorted = [...cat.tiers].sort((a, b) => a.cases - b.cases);
  let t = sorted[0];
  for (const tier of sorted) if (cases >= tier.cases) t = tier;
  return t;
}
export function priceFor(cases, cat = getCatalog()) {
  const t = tierFor(cases, cat);
  return +(cases * cat.litresPerCase * t.perLitre).toFixed(2);
}

/* ---------- Cart ---------- */

let memCart = null;
export function getCart() { return safe.get(CART_KEY) || memCart || []; }
function setCart(c) { memCart = c; safe.set(CART_KEY, c); renderCart(); updateCount(true); }

export function addToCart(productId, cases) {
  const cart = getCart();
  const line = cart.find((l) => l.id === productId);
  if (line) line.cases = Math.min(line.cases + cases, 12);
  else cart.push({ id: productId, cases });
  setCart(cart);
  const p = getCatalog().products[productId];
  toast(`${p.name} · ${cases} ${cases === 1 ? 'cassa' : 'casse'} nel carrello`, { label: 'Vedi carrello', fn: openCart });
}

function cartTotals() {
  const cat = getCatalog();
  const cart = getCart();
  // per-litre tier is applied to the total number of cases in the order
  const totalCases = cart.reduce((s, l) => s + l.cases, 0);
  const tier = tierFor(totalCases, cat);
  const litres = totalCases * cat.litresPerCase;
  const subtotal = +(litres * tier.perLitre).toFixed(2);
  const base = +(litres * cat.tiers[0].perLitre).toFixed(2);
  return { cart, cat, totalCases, tier, litres, subtotal, saving: +(base - subtotal).toFixed(2) };
}

function updateCount(bump = false) {
  const n = getCart().reduce((s, l) => s + l.cases, 0);
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = n;
    el.dataset.empty = String(n === 0);
    if (bump && n) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  });
}

const ICON = {
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 018 0v3"/></svg>',
  carton: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><path d="M30 26h36v58H30zM30 26l6-12h24l6 12M44 8h8v6h-8z"/><path d="M40 52c4-8 12-8 16 0M48 60v12M40 66c3 3 5 4 8 4M56 66c-3 3-5 4-8 4"/></svg>',
};

function injectDrawer() {
  if (document.getElementById('cart')) return;
  document.body.insertAdjacentHTML('beforeend', `
  <div class="scrim" data-close-cart></div>
  <aside class="drawer" id="cart" role="dialog" aria-modal="true" aria-labelledby="cart-title" aria-hidden="true">
    <div class="drawer-head">
      <h2 id="cart-title" class="h2">Il tuo carrello</h2>
      <button class="icon-btn" data-close-cart aria-label="Chiudi carrello">${ICON.close}</button>
    </div>
    <div class="cart-view" style="display:contents">
      <div class="drawer-body" data-cart-lines></div>
      <div class="drawer-foot" data-cart-foot></div>
    </div>
    <form class="checkout drawer-body" data-checkout novalidate>
      <p class="muted" style="margin-top:14px">Spediamo in tutta Italia con corriere espresso.</p>
      <div class="field"><label for="co-name">Nome e cognome</label><input id="co-name" name="name" autocomplete="name" required placeholder="Maria Rossi"><span class="err">Inserisci il nome di chi riceve il pacco.</span></div>
      <div class="field"><label for="co-email">Email</label><input id="co-email" name="email" type="email" autocomplete="email" required placeholder="maria@esempio.it"><span class="err">Serve un'email valida per la conferma d'ordine.</span></div>
      <div class="field"><label for="co-addr">Indirizzo</label><input id="co-addr" name="addr" autocomplete="street-address" required placeholder="Via Roma 12"><span class="err">Inserisci via e numero civico.</span></div>
      <div class="row2">
        <div class="field"><label for="co-cap">CAP</label><input id="co-cap" name="cap" inputmode="numeric" autocomplete="postal-code" required pattern="[0-9]{5}" placeholder="12030"><span class="err">5 cifre.</span></div>
        <div class="field"><label for="co-city">Città</label><input id="co-city" name="city" autocomplete="address-level2" required placeholder="Savigliano"><span class="err">Inserisci la città.</span></div>
      </div>
      <div class="stripe-box">${ICON.lock}<span><b style="color:var(--ink)">Pagamento con carta, Apple Pay e Google Pay</b><br>Gestito da Stripe. Nel mockup il pagamento non è attivo: verrà collegato nella fase 2.</span></div>
      <div style="display:flex;gap:10px;padding-bottom:24px">
        <button type="button" class="btn btn--ghost" data-back style="color:var(--enamel)">Indietro</button>
        <button type="submit" class="btn btn--block" data-pay>Paga</button>
      </div>
    </form>
  </aside>
  <div class="toast" role="status" aria-live="polite"><span class="ok">${ICON.check}</span><span data-toast-text></span></div>`);
}

function renderCart() {
  const linesEl = document.querySelector('[data-cart-lines]');
  const footEl = document.querySelector('[data-cart-foot]');
  if (!linesEl) return;
  const { cart, cat, totalCases, tier, litres, subtotal, saving } = cartTotals();
  if (!cart.length) {
    linesEl.innerHTML = `<div class="empty">${ICON.carton}<b>Il carrello è vuoto</b>Una cassa sono 12 litri, con spedizione gratuita in tutta Italia.<div style="margin-top:22px"><a class="btn" href="negozio.html">Vai al negozio</a></div></div>`;
    footEl.innerHTML = '';
    footEl.hidden = true;
    return;
  }
  footEl.hidden = false;
  linesEl.innerHTML = cart.map((l) => {
    const p = cat.products[l.id];
    const lineTotal = +(l.cases * cat.litresPerCase * tier.perLitre).toFixed(2);
    return `<div class="line">
      <div class="thumb ${p.tone === 'rosa' ? 'rosa' : ''}"><img src="${p.img}" alt=""></div>
      <div>
        <b>${p.name}</b>
        <small class="num">${l.cases * cat.litresPerCase} litri · ${eurL(tier.perLitre)}</small>
        <div class="stepper" role="group" aria-label="Casse di ${p.name}">
          <button type="button" data-dec="${l.id}" aria-label="Una cassa in meno" ${l.cases <= 1 ? 'disabled' : ''}>−</button>
          <output aria-live="polite">${l.cases}</output>
          <button type="button" data-inc="${l.id}" aria-label="Una cassa in più" ${l.cases >= 12 ? 'disabled' : ''}>+</button>
        </div>
      </div>
      <div><div class="price num">${eur(lineTotal)}</div><button type="button" class="remove" data-remove="${l.id}">Rimuovi</button></div>
    </div>`;
  }).join('');
  const next = [...cat.tiers].sort((a, b) => a.cases - b.cases).find((t) => t.cases > totalCases && t.perLitre < tier.perLitre);
  footEl.innerHTML = `
    <div class="ship-bar">${ICON.truck}<span>Spedizione gratuita${next ? ` · con ${next.cases - totalCases} ${next.cases - totalCases === 1 ? 'cassa' : 'casse'} in più paghi ${eurL(next.perLitre)}` : ' · prezzo migliore raggiunto'}</span></div>
    <div class="totals">
      <div><span>${totalCases} ${totalCases === 1 ? 'cassa' : 'casse'} · ${litres} litri</span><span>${eurL(tier.perLitre)}</span></div>
      ${saving > 0 ? `<div style="color:var(--enamel)"><span>Risparmio sul prezzo base</span><span>− ${eur(saving)}</span></div>` : ''}
      <div><span>Spedizione</span><span>Gratis</span></div>
      <div class="grand"><span>Totale</span><span>${eur(subtotal)}</span></div>
    </div>
    <button class="btn btn--block" data-go-checkout>Procedi all'ordine</button>`;
}

let lastFocus = null;
export function openCart() {
  const d = document.getElementById('cart');
  lastFocus = document.activeElement;
  d.classList.remove('is-checkout');
  renderCart();
  d.classList.add('is-open');
  d.setAttribute('aria-hidden', 'false');
  document.querySelector('.scrim').classList.add('is-open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => d.querySelector('[data-close-cart]').focus(), 60);
}
function closeCart() {
  const d = document.getElementById('cart');
  d.classList.remove('is-open');
  d.setAttribute('aria-hidden', 'true');
  document.querySelector('.scrim').classList.remove('is-open');
  document.body.style.overflow = '';
  lastFocus?.focus?.();
}

function bindCart() {
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, a, [data-close-cart]');
    if (!t) return;
    if (t.matches('[data-open-cart]')) { e.preventDefault(); openCart(); }
    else if (t.matches('[data-close-cart]')) closeCart();
    else if (t.dataset.inc || t.dataset.dec) {
      const cart = getCart();
      const l = cart.find((x) => x.id === (t.dataset.inc || t.dataset.dec));
      if (l) l.cases = Math.max(1, Math.min(12, l.cases + (t.dataset.inc ? 1 : -1)));
      setCart(cart);
      document.querySelector(`[data-${t.dataset.inc ? 'inc' : 'dec'}="${l.id}"]`)?.focus();
    } else if (t.dataset.remove) setCart(getCart().filter((x) => x.id !== t.dataset.remove));
    else if (t.matches('[data-go-checkout]')) {
      const d = document.getElementById('cart');
      d.classList.add('is-checkout');
      d.querySelector('[data-pay]').textContent = `Paga ${eur(cartTotals().subtotal)}`;
      d.querySelector('#co-name').focus();
    } else if (t.matches('[data-back]')) document.getElementById('cart').classList.remove('is-checkout');
  });
  document.addEventListener('keydown', (e) => {
    const d = document.getElementById('cart');
    if (e.key === 'Escape' && d?.classList.contains('is-open')) closeCart();
    if (e.key === 'Tab' && d?.classList.contains('is-open')) {
      const f = [...d.querySelectorAll('button:not([disabled]), a[href], input, select, textarea')].filter((el) => el.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  });
  document.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-checkout]')) return;
    e.preventDefault();
    const form = e.target;
    let firstBad = null;
    form.querySelectorAll('input').forEach((i) => {
      const ok = i.checkValidity();
      i.setAttribute('aria-invalid', String(!ok));
      if (!ok && !firstBad) firstBad = i;
    });
    if (firstBad) { firstBad.focus(); return; }
    toast('Mockup: qui si aprirà il pagamento sicuro Stripe (fase 2).');
  });
}

/* ---------- Toast ---------- */

let toastTimer;
export function toast(text, action) {
  const t = document.querySelector('.toast');
  if (!t) return;
  t.querySelector('[data-toast-text]').innerHTML = '';
  t.querySelector('[data-toast-text]').append(text);
  t.querySelector('button')?.remove();
  if (action) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = action.label;
    b.addEventListener('click', () => { t.classList.remove('is-visible'); action.fn(); });
    t.append(b);
  }
  t.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-visible'), 4200);
}

/* ---------- Header, menu, reveals ---------- */

function bindChrome() {
  const header = document.querySelector('.site-header');
  const onScroll = () => header?.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const sheet = document.querySelector('.menu-sheet');
  document.querySelectorAll('[data-menu]').forEach((b) => b.addEventListener('click', () => {
    const open = !sheet.classList.contains('is-open');
    sheet.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    document.querySelectorAll('[data-menu]').forEach((x) => x.setAttribute('aria-expanded', String(open)));
    if (open) sheet.querySelector('a')?.focus();
  }));
  sheet?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { sheet.classList.remove('is-open'); document.body.style.overflow = ''; }));

  // drifting leaves: <div class="leaves" data-leaves="14"></div>
  const tones = ['#509A48', '#8FBC8B', '#BADDB6', '#6FB165', '#3F8438'];
  document.querySelectorAll('[data-leaves]').forEach((box) => {
    const n = +box.dataset.leaves || 10;
    let seed = n * 7.13;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    box.innerHTML = Array.from({ length: n }, () => {
      const edge = rnd() < 0.5 ? rnd() * 5 : 95 + rnd() * 5; // keep leaves to the sides, away from copy
      return `<i style="left:${edge.toFixed(1)}%;top:${(rnd() * 90).toFixed(1)}%;--s:${(10 + rnd() * 18).toFixed(0)}px;--c:${tones[(rnd() * tones.length) | 0]};--r:${(rnd() * 360).toFixed(0)}deg;--o:${(0.35 + rnd() * 0.5).toFixed(2)};--d:${(7 + rnd() * 6).toFixed(1)}s;--dl:${(-rnd() * 8).toFixed(1)}s;--dx:${((rnd() - 0.5) * 30).toFixed(0)}px;--dy:${(-10 - rnd() * 24).toFixed(0)}px;--dr:${((rnd() - 0.5) * 50).toFixed(0)}deg"></i>`;
    }).join('');
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
}

document.documentElement.classList.add('js');
injectDrawer();
bindCart();
bindChrome();
updateCount();
renderCart();
window.addEventListener('storage', () => { updateCount(); renderCart(); });

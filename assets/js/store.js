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

/* ---------- Accounts (mockup: localStorage; phase 2: real auth backend) ---------- */

const USERS_KEY = 'erbalatte.users.v1';
const SESSION_KEY = 'erbalatte.session.v1';

async function hashPw(pw) {
  // never keep the password itself, even in the demo
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('erbalatte:' + pw));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export const getUsers = () => safe.get(USERS_KEY) || [];
export function currentUser() {
  const email = safe.get(SESSION_KEY);
  return email ? getUsers().find((u) => u.email === email) || null : null;
}
export async function register(data) {
  const users = getUsers();
  const email = data.email.trim().toLowerCase();
  if (users.some((u) => u.email === email)) throw new Error('exists');
  const { password, password2, ...rest } = data;
  const user = { ...rest, email, pw: await hashPw(password), createdAt: new Date().toISOString() };
  users.push(user);
  safe.set(USERS_KEY, users);
  safe.set(SESSION_KEY, email);
  return user;
}
export async function login(email, password) {
  const u = getUsers().find((x) => x.email === email.trim().toLowerCase());
  if (!u || u.pw !== await hashPw(password)) throw new Error('invalid');
  safe.set(SESSION_KEY, u.email);
  return u;
}
export function logout() { try { localStorage.removeItem(SESSION_KEY); } catch {} }
export function updateUser(patch) {
  const users = getUsers();
  const i = users.findIndex((u) => u.email === safe.get(SESSION_KEY));
  if (i < 0) return null;
  users[i] = { ...users[i], ...patch };
  safe.set(USERS_KEY, users);
  return users[i];
}

/* ---------- Orders, shipping statuses, customer emails ---------- */

const ORDERS_KEY = 'erbalatte.orders.v1';
export const STATUSES = [
  { id: 'ricevuto', label: 'Ricevuto', tone: 'new' },
  { id: 'pagato', label: 'Pagato', tone: 'paid' },
  { id: 'preparazione', label: 'In preparazione', tone: 'prep' },
  { id: 'spedito', label: 'Spedito', tone: 'ship' },
  { id: 'consegna', label: 'In consegna', tone: 'ship' },
  { id: 'consegnato', label: 'Consegnato', tone: 'done' },
  { id: 'annullato', label: 'Annullato', tone: 'void' },
];
export const statusLabel = (id) => STATUSES.find((s) => s.id === id)?.label || id;
export const CARRIERS = {
  BRT: 'https://vas.brt.it/vas/sped_det_show.hsm?brtCode={n}',
  GLS: 'https://www.gls-italy.com/it/servizi-online/ricerca-spedizioni?match={n}',
  SDA: 'https://www.sda.it/wps/portal/Servizi_online/dettaglio-spedizione?locale=it&tracing.letteraVettura={n}',
  'Poste Italiane': 'https://www.poste.it/cerca/index.html#/risultati-spedizioni/{n}',
  DHL: 'https://www.dhl.com/it-it/home/tracking.html?tracking-id={n}',
};
export const trackingUrl = (carrier, n) => (CARRIERS[carrier] && n ? CARRIERS[carrier].replace('{n}', encodeURIComponent(n)) : '');

function seedOrders() {
  const d = (days, h = 10) => { const x = new Date(); x.setDate(x.getDate() - days); x.setHours(h, 12, 0, 0); return x.toISOString(); };
  const mk = (n, days, name, email, city, lines, status, extra = {}) => {
    const cases = lines.reduce((s, l) => s + l.cases, 0);
    const tier = tierFor(cases);
    const order = {
      id: 'EL-' + n, createdAt: d(days), demo: true,
      customer: { name, email, phone: '' },
      address: { street: 'Via Roma 1', cap: '10100', city, prov: '' },
      lines, cases, perLitre: tier.perLitre, total: +(cases * 12 * tier.perLitre).toFixed(2),
      status, carrier: '', tracking: '', history: [{ status: 'ricevuto', at: d(days) }], emails: [],
      ...extra,
    };
    if (status !== 'ricevuto') order.history.push({ status: 'pagato', at: d(days, 11) });
    if (['spedito', 'consegnato'].includes(status)) order.history.push({ status, at: d(Math.max(0, days - 1), 15) });
    return order;
  };
  return [
    mk(1284, 0, 'Giulia M.', 'giulia@esempio.it', 'Torino', [{ id: 'intero', cases: 2 }], 'pagato'),
    mk(1283, 1, 'Marco R.', 'marco@esempio.it', 'Milano', [{ id: 'scremato', cases: 1 }], 'preparazione'),
    mk(1282, 2, 'Elena B.', 'elena@esempio.it', 'Cuneo', [{ id: 'intero', cases: 4 }, { id: 'scremato', cases: 2 }], 'spedito', { carrier: 'BRT', tracking: '1234567890' }),
    mk(1281, 5, 'Paolo T.', 'paolo@esempio.it', 'Genova', [{ id: 'intero', cases: 3 }], 'consegnato', { carrier: 'GLS', tracking: 'GL98765432' }),
  ];
}
export function getOrders() {
  let o = safe.get(ORDERS_KEY);
  if (!o) { o = seedOrders(); safe.set(ORDERS_KEY, o); }
  return o;
}
function saveOrders(o) { safe.set(ORDERS_KEY, o); window.dispatchEvent(new CustomEvent('orders:change')); }

/* The emails a real backend would send on each change (phase 2: transactional email service). */
export function composeEmail(order, kind) {
  const first = (order.customer.name || '').split(' ')[0] || 'ciao';
  const items = order.lines.map((l) => `• ${getCatalog().products[l.id]?.name || l.id} × ${l.cases} ${l.cases === 1 ? 'cassa' : 'casse'}`).join('\n');
  const track = order.tracking ? `\n\nCorriere: ${order.carrier}\nNumero di spedizione: ${order.tracking}${trackingUrl(order.carrier, order.tracking) ? `\nSegui il pacco: ${trackingUrl(order.carrier, order.tracking)}` : ''}` : '';
  const T = {
    ricevuto: ['Abbiamo ricevuto il tuo ordine', `abbiamo ricevuto il tuo ordine ${order.id}. Ti scriviamo appena il pagamento è confermato.`],
    pagato: [`Grazie! Ordine ${order.id} confermato`, `grazie per aver scelto Erbalatte! Il tuo ordine ${order.id} è confermato:\n\n${items}\n\nTotale: ${eur(order.total)} · spedizione gratuita.`],
    preparazione: [`Stiamo preparando il tuo ordine ${order.id}`, `stiamo preparando le tue casse di Erbalatte. Ti avvisiamo appena partono.`],
    spedito: [`Il tuo Erbalatte è in viaggio`, `il tuo ordine ${order.id} è stato affidato al corriere.${track}`],
    consegna: [`Oggi arriva il tuo Erbalatte`, `il corriere ha in consegna il tuo ordine ${order.id}: arriverà nelle prossime ore.${track}`],
    consegnato: [`Ordine ${order.id} consegnato`, `il tuo ordine è stato consegnato. Buona colazione, e grazie da tutta la famiglia Bergese!`],
    annullato: [`Ordine ${order.id} annullato`, `il tuo ordine ${order.id} è stato annullato. Per qualsiasi domanda rispondi a questa email o chiamaci al 342 669 5924.`],
    tracking: [`Aggiornamento spedizione ${order.id}`, `abbiamo aggiornato i dati di spedizione del tuo ordine.${track}`],
  }[kind];
  return { to: order.customer.email, subject: T[0], body: `Ciao ${first},\n\n${T[1]}\n\nLa famiglia Bergese · Erbalatte\nVia Massao 3, Monasterolo di Savigliano (CN)` };
}

export function createOrder(lines, customer, address) {
  const cat = getCatalog();
  const cases = lines.reduce((s, l) => s + l.cases, 0);
  const tier = tierFor(cases, cat);
  const orders = getOrders();
  const n = Math.max(1284, ...orders.map((o) => +o.id.split('-')[1] || 0)) + 1;
  const now = new Date().toISOString();
  const order = {
    id: 'EL-' + n, createdAt: now, customer, address, lines: lines.map((l) => ({ ...l })), cases,
    perLitre: tier.perLitre, total: +(cases * cat.litresPerCase * tier.perLitre).toFixed(2),
    status: 'pagato', carrier: '', tracking: '',
    history: [{ status: 'ricevuto', at: now }, { status: 'pagato', at: now }], emails: [],
  };
  order.emails.push({ ...composeEmail(order, 'pagato'), at: now, kind: 'pagato' });
  // stock goes down per product
  lines.forEach((l) => { if (cat.products[l.id]) cat.products[l.id].stock = Math.max(0, cat.products[l.id].stock - l.cases); });
  saveCatalog(cat);
  orders.unshift(order);
  saveOrders(orders);
  return order;
}

/* Admin: change status and/or shipping data; returns the email that was "sent" (or null). */
export function updateOrder(id, patch, { notify = true } = {}) {
  const orders = getOrders();
  const o = orders.find((x) => x.id === id);
  if (!o) return null;
  const now = new Date().toISOString();
  const statusChanged = patch.status && patch.status !== o.status;
  const trackChanged = (patch.tracking ?? o.tracking) !== o.tracking || (patch.carrier ?? o.carrier) !== o.carrier;
  Object.assign(o, patch);
  if (statusChanged) o.history.push({ status: o.status, at: now, note: patch.note || '' });
  let email = null;
  if (notify && (statusChanged || (trackChanged && o.tracking))) {
    email = { ...composeEmail(o, statusChanged ? o.status : 'tracking'), at: now, kind: statusChanged ? o.status : 'tracking' };
    o.emails.push(email);
  }
  saveOrders(orders);
  return email;
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

/* Buy now: an express checkout for one product, leaving the saved cart untouched. */
let express = null;
export function buyNow(productId, cases) {
  express = [{ id: productId, cases }];
  openCart();
  goCheckout();
}

function cartTotals(lines) {
  const cat = getCatalog();
  const cart = lines || express || getCart();
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
    <div class="cart-view">
      <div class="drawer-body" data-cart-lines></div>
      <div class="drawer-foot" data-cart-foot></div>
    </div>
    <form class="checkout drawer-body" data-checkout novalidate>
      <div class="co-summary" data-co-summary></div>
      <p class="co-login" data-co-login><a href="accedi.html">Accedi</a> per usare i dati salvati, oppure continua come ospite.</p>
      <div class="field"><label for="co-name">Nome e cognome</label><input id="co-name" name="name" autocomplete="name" required placeholder="Maria Rossi"><span class="err">Inserisci il nome di chi riceve il pacco.</span></div>
      <div class="row2">
        <div class="field"><label for="co-email">Email</label><input id="co-email" name="email" type="email" autocomplete="email" required placeholder="maria@esempio.it"><span class="err">Serve un'email valida per la conferma d'ordine.</span></div>
        <div class="field"><label for="co-phone">Telefono</label><input id="co-phone" name="phone" type="tel" autocomplete="tel" required placeholder="333 123 4567"><span class="err">Il corriere ti chiama se serve.</span></div>
      </div>
      <div class="field"><label for="co-addr">Indirizzo</label><input id="co-addr" name="street" autocomplete="street-address" required placeholder="Via Roma 12"><span class="err">Inserisci via e numero civico.</span></div>
      <div class="row3">
        <div class="field"><label for="co-cap">CAP</label><input id="co-cap" name="cap" inputmode="numeric" autocomplete="postal-code" required pattern="[0-9]{5}" placeholder="12030"><span class="err">5 cifre.</span></div>
        <div class="field"><label for="co-city">Città</label><input id="co-city" name="city" autocomplete="address-level2" required placeholder="Savigliano"><span class="err">Inserisci la città.</span></div>
        <div class="field"><label for="co-prov">Prov.</label><input id="co-prov" name="prov" autocomplete="address-level1" required maxlength="2" placeholder="CN" style="text-transform:uppercase"><span class="err">Sigla.</span></div>
      </div>
      <div class="stripe-box">${ICON.lock}<span><b style="color:var(--ink)">Pagamento con carta, Apple Pay e Google Pay</b><br>Gestito da Stripe. Nel mockup il pagamento è simulato: l'ordine viene creato e lo trovi nell'area riservata.</span></div>
      <div style="display:flex;gap:10px;padding-bottom:24px">
        <button type="button" class="btn btn--ghost" data-back>Indietro</button>
        <button type="submit" class="btn btn--block" data-pay>Paga</button>
      </div>
    </form>
    <div class="co-done drawer-body" data-co-done></div>
  </aside>
  <div class="toast" role="status" aria-live="polite"><span class="ok">${ICON.check}</span><span data-toast-text></span></div>`);
}

function renderCart() {
  const linesEl = document.querySelector('[data-cart-lines]');
  const footEl = document.querySelector('[data-cart-foot]');
  if (!linesEl) return;
  const { cart, cat, totalCases, tier, litres, subtotal, saving } = cartTotals(getCart());
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

function goCheckout() {
  const d = document.getElementById('cart');
  const { cart, cat, totalCases, tier, subtotal } = cartTotals();
  d.classList.remove('is-done');
  d.classList.add('is-checkout');
  d.querySelector('[data-co-summary]').innerHTML = `
    ${cart.map((l) => `<div><span>${cat.products[l.id].name} × ${l.cases}</span><span class="num">${eur(l.cases * cat.litresPerCase * tier.perLitre)}</span></div>`).join('')}
    <div class="co-total"><span>${totalCases * cat.litresPerCase} litri · spedizione gratuita</span><b class="num">${eur(subtotal)}</b></div>`;
  d.querySelector('[data-pay]').textContent = `Paga ${eur(subtotal)}`;
  const u = currentUser();
  d.querySelector('[data-co-login]').hidden = !!u;
  if (u) {
    const f = d.querySelector('[data-checkout]');
    const set = (n, v) => { if (v && !f.elements[n].value) f.elements[n].value = v; };
    set('name', `${u.firstName || ''} ${u.lastName || ''}`.trim()); set('email', u.email); set('phone', u.phone);
    set('street', [u.street, u.number].filter(Boolean).join(' ')); set('cap', u.cap); set('city', u.city); set('prov', u.prov);
  }
  setTimeout(() => d.querySelector(u ? '[data-pay]' : '#co-name').focus(), 80);
}

let lastFocus = null;
export function openCart() {
  const d = document.getElementById('cart');
  lastFocus = document.activeElement;
  d.classList.remove('is-checkout', 'is-done');
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
  express = null;
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
    else if (t.matches('[data-go-checkout]')) goCheckout();
    else if (t.matches('[data-back]')) {
      if (express) { express = null; closeCart(); return; } // buy-now: back means back to the product
      document.getElementById('cart').classList.remove('is-checkout');
    }
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
    const v = Object.fromEntries(new FormData(form));
    const lines = cartTotals().cart;
    const btn = form.querySelector('[data-pay]');
    btn.disabled = true; btn.textContent = 'Pagamento in corso…';
    setTimeout(() => {
      const order = createOrder(lines,
        { name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim() },
        { street: v.street.trim(), cap: v.cap, city: v.city.trim(), prov: v.prov.toUpperCase() });
      if (!express) setCart([]);
      express = null;
      btn.disabled = false;
      const d = document.getElementById('cart');
      d.classList.remove('is-checkout');
      d.classList.add('is-done');
      d.querySelector('[data-co-done]').innerHTML = `
        <div class="done-mark">${ICON.check}</div>
        <h3>Grazie, ordine confermato!</h3>
        <p class="muted">Ordine <b>${order.id}</b> · ${eur(order.total)}<br>Ti abbiamo inviato la conferma a <b>${order.customer.email}</b>. Quando le casse partono ricevi un'email con il numero di spedizione.</p>
        <div class="done-actions">
          ${currentUser() ? '<a class="btn btn--block" href="account.html#ordini">Segui il tuo ordine</a>' : '<a class="btn btn--block" href="registrati.html">Crea un account per seguire l\'ordine</a>'}
          <button type="button" class="btn btn--ghost btn--block" data-close-cart>Continua a navigare</button>
        </div>`;
      d.querySelector('.done-mark')?.focus?.();
    }, 900);
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

/* Fluid scroll on desktop pointers (touch keeps native momentum). */
async function smoothScroll() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  try {
    const { default: Lenis } = await import('https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.mjs');
    const lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.9, anchors: { offset: -90 } });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    // drawers and the mobile sheet lock the page while open
    new MutationObserver(() => (document.body.style.overflow === 'hidden' ? lenis.stop() : lenis.start()))
      .observe(document.body, { attributes: true, attributeFilter: ['style'] });
    window.__lenis = lenis;
  } catch { /* offline or blocked CDN: native scroll is fine */ }
}

function markAccount() {
  const u = currentUser();
  document.querySelectorAll('[data-account]').forEach((a) => {
    a.href = u ? 'account.html' : 'accedi.html';
    a.setAttribute('aria-label', u ? `Il tuo account, ${u.firstName || u.email}` : 'Accedi o registrati');
    a.classList.toggle('is-in', !!u);
  });
}

document.documentElement.classList.add('js');
injectDrawer();
smoothScroll();
markAccount();
bindCart();
bindChrome();
updateCount();
renderCart();
window.addEventListener('storage', () => { updateCount(); renderCart(); });

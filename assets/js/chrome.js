/* Shared header / footer, written synchronously where the script tag sits:
   <script src="assets/js/chrome.js" data-part="header" data-page="negozio"></script>
   In the production build these become server-side partials. */
(function () {
  var s = document.currentScript;
  var part = s.dataset.part;
  var page = s.dataset.page || '';
  var cur = function (p) { return page === p ? ' aria-current="page"' : ''; };
  var cart = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 5h2l2.2 10.2a1.5 1.5 0 001.5 1.2h7.9a1.5 1.5 0 001.5-1.1L20.5 8.5H7"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>';

  var header =
    '<a class="skip" href="#main">Vai al contenuto</a>' +
    '<div class="topline"><div class="wrap">' +
      '<span>Spedizione <b>gratuita</b> in tutta Italia</span>' +
      '<span class="hide-sm"><a href="tel:+393426695924">342 669 5924</a> · <a href="mailto:info@erbalatte.it">info@erbalatte.it</a></span>' +
    '</div></div>' +
    '<header class="site-header"><div class="wrap">' +
      '<a class="brand" href="index.html" aria-label="Erbalatte, home"><img src="assets/img/erbalatte.png" alt="erbalatte" width="114" height="48"></a>' +
      '<nav class="nav" aria-label="Principale">' +
        '<a href="storia.html"' + cur('storia') + '>La nostra storia</a>' +
        '<a href="index.html#latte"' + cur('latte') + '>Il latte</a>' +
        '<a href="negozio.html"' + cur('negozio') + '>Negozio</a>' +
        '<a href="professionisti.html"' + cur('professionisti') + '>Professionisti</a>' +
      '</nav>' +
      '<div class="header-actions">' +
        (page === 'negozio' ? '' : '<a class="btn header-order" href="negozio.html">Ordina</a>') +
        '<button class="icon-btn" data-open-cart aria-label="Apri carrello">' + cart +
          '<span class="cart-count" data-cart-count data-empty="true">0</span></button>' +
        '<button class="icon-btn menu-btn" data-menu aria-expanded="false" aria-controls="menu" aria-label="Menu">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8h16M4 16h16"/></svg></button>' +
      '</div>' +
    '</div></header>' +
    '<div class="menu-sheet" id="menu">' +
      '<div class="sheet-top"><img src="assets/img/erbalatte.png" alt="erbalatte">' +
      '<button class="icon-btn" data-menu aria-label="Chiudi menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<nav aria-label="Menu mobile">' +
        '<a href="index.html">Home</a><a href="storia.html">La nostra storia</a><a href="index.html#latte">Il latte</a>' +
        '<a href="negozio.html">Negozio</a><a href="professionisti.html">Professionisti</a>' +
      '</nav>' +
      '<div class="sheet-foot">342 669 5924 · info@erbalatte.it<br>Via Massao 3, Monasterolo di Savigliano (CN)</div>' +
    '</div>';

  var footer =
    '<footer class="site-footer"><div class="wrap">' +
      '<div class="footer-top">' +
        '<div>' +
          '<img class="logo" src="assets/img/erbalatte.png" alt="erbalatte">' +
          '<p style="max-width:34ch">Latte da Agricoltura Simbiotica.<br>Azienda Agricola La Corte, Monasterolo di Savigliano (CN).</p>' +
          '<div class="socials">' +
            '<a href="https://www.instagram.com/erbalatte_/" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor"/></svg></a>' +
            '<a href="https://www.facebook.com/Erbalatte" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21z"/></svg></a>' +
            '<a href="https://www.tiktok.com/@erbalatte_" aria-label="TikTok"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 3h-3v12.2a2.7 2.7 0 11-2.7-2.7c.3 0 .5 0 .8.1V9.5a5.8 5.8 0 105 5.7V9.1a7.3 7.3 0 004.3 1.4v-3a4.3 4.3 0 01-4.4-4.5z"/></svg></a>' +
          '</div>' +
        '</div>' +
        '<div><h4>Erbalatte</h4><ul><li><a href="storia.html">La nostra storia</a></li><li><a href="index.html#latte">Il latte</a></li><li><a href="professionisti.html">Scelto da</a></li></ul></div>' +
        '<div><h4>Negozio</h4><ul><li><a href="negozio.html">Tutti i prodotti</a></li><li><a href="#" data-open-cart>Carrello</a></li><li><a href="negozio.html#faq">Spedizioni e FAQ</a></li></ul></div>' +
        '<div><h4>Contatti</h4><ul><li><a href="tel:+393426695924">342 669 5924</a></li><li><a href="mailto:info@erbalatte.it">info@erbalatte.it</a></li><li><span class="muted" style="font-size:.95rem">Via Massao 3<br>12030 Monasterolo di Savigliano (CN)</span></li></ul></div>' +
      '</div>' +
      '<div class="footer-bottom"><span>© Erbalatte · Azienda Agricola La Corte</span>' +
      '<span><a href="#">Privacy</a> · <a href="#">Cookie</a> · <a href="#">Termini e condizioni</a> · <a href="admin.html">Area riservata</a></span></div>' +
    '</div></footer>';

  s.insertAdjacentHTML('beforebegin', part === 'footer' ? footer : header);
})();

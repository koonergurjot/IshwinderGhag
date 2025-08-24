
/*! onepager.js — generate a printable one‑pager from a listing card */
(function(){
  function collect(card){
    return {
      title: card.querySelector('[data-title], .js-title')?.textContent?.trim() || 'Listing',
      price: card.querySelector('[data-price], .js-price')?.textContent?.trim() || '',
      address: card.querySelector('[data-address], .js-address')?.textContent?.trim() || '',
      details: card.querySelector('[data-details], .js-details')?.textContent?.trim() || '',
      hero: card.querySelector('img')?.currentSrc || '',
      badge: card.querySelector('[data-badge]')?.textContent?.trim() || '',
      url: location.href
    };
  }

  function generate(data){
    const cssUrl = (document.querySelector('link[href*="print-onepager.css"]')?.href) || '/css/print-onepager.css';
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(data.title)} — One‑pager</title>
  <link rel="stylesheet" href="${cssUrl}">
</head>
<body>
  <header class="header">
    <div class="brand">
      <img src="/assets/avatar.png" alt="" width="28" height="28">
      <div><strong>${document.title||'Real Estate'}</strong><div class="meta">${new Date().toLocaleDateString()}</div></div>
    </div>
    <span class="badge">${escapeHtml(data.badge || 'Featured')}</span>
  </header>

  <h1>${escapeHtml(data.title)}</h1>
  <div class="meta">${escapeHtml(data.address)} ${data.price?'• '+escapeHtml(data.price):''}</div>

  <img class="hero" src="${data.hero}" alt="" width="1280" height="720">

  <section class="section">
    <h2>Property details</h2>
    <div class="kv">
      <dt>Price</dt><dd>${escapeHtml(data.price)||'—'}</dd>
      <dt>Address</dt><dd>${escapeHtml(data.address)||'—'}</dd>
      <dt>Link</dt><dd>${escapeHtml(data.url)}</dd>
    </div>
  </section>

  ${data.details? `<section class="section"><h2>Description</h2><p>${escapeHtml(data.details)}</p></section>` : ''}

  <footer>Generated from ${escapeHtml(location.hostname)} • ${new Date().toLocaleString()}</footer>
  <script>setTimeout(()=>window.print(), 250)</script>
</body>
</html>`;
    const w = window.open('', '_blank', 'noopener,noreferrer');
    w.document.open(); w.document.write(html); w.document.close();
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

  function onClick(e){
    const btn = e.target.closest('.js-onepager');
    if(!btn) return;
    e.preventDefault();
    const card = btn.closest('[data-id]');
    const data = collect(card);
    generate(data);
  }

  function initOnePager(){
    document.addEventListener('click', onClick);
  }

  window.initOnePager = initOnePager;
})();

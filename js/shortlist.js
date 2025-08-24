
/*! shortlist.js — simple localStorage "saved listings" with ⭐ toggle */
(function(){
  const KEY = 'shortlistV1';

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY))||{} }catch{ return {} } }
  function save(data){ localStorage.setItem(KEY, JSON.stringify(data)); }

  function toggle(card){
    const id = card.dataset.id;
    if(!id) return;
    const data = load();
    if(data[id]){ delete data[id]; updateUI(card, false); }
    else{
      const payload = extract(card);
      data[id] = payload;
      updateUI(card, true);
    }
    save(data);
    renderShortlist();
  }

  function extract(card){
    const title = card.querySelector('[data-title], .js-title')?.textContent?.trim() || 'Listing';
    const price = card.querySelector('[data-price], .js-price')?.textContent?.trim() || '';
    const img = card.querySelector('img')?.currentSrc || '';
    const url = card.querySelector('a[href^="http"], a[href^="/"], .js-view')?.href || '#';
    return { id: card.dataset.id, title, price, img, url };
  }

  function updateUI(card, saved){
    const btn = card.querySelector('.js-save-listing');
    if(!btn) return;
    btn.setAttribute('aria-pressed', saved?'true':'false');
    btn.classList.toggle('is-saved', !!saved);
    const icon = btn.querySelector('svg');
    if(icon){ icon.style.fillOpacity = saved ? '1' : '0'; }
  }

  function hydrate(){
    const data = load();
    document.querySelectorAll('[data-id]').forEach(card=>{
      updateUI(card, !!data[card.dataset.id]);
    });
  }

  function renderShortlist(){
    const mount = document.getElementById('shortlist-cards');
    if(!mount) return;
    const data = load();
    const items = Object.values(data);
    mount.innerHTML = items.length ? items.map(tpl).join('') :
      `<p class="small">No saved listings yet. Tap the ⭐ on any card to add it here.</p>`;
  }

  function tpl(it){
    return `
    <article class="card col-6" data-id="${it.id}">
      <img src="${it.img}" alt="" class="listing-photo">
      <div class="card-body">
        <h3 class="m-0">${it.title}</h3>
        <div class="meta">${it.price}</div>
        <div class="py-3">
          <a class="btn" href="${it.url}">View details</a>
          <button class="btn ghost js-remove" data-id="${it.id}">Remove</button>
        </div>
      </div>
    </article>`;
  }

  function onClick(e){
    const star = e.target.closest('.js-save-listing');
    if(star){
      e.preventDefault();
      const card = star.closest('[data-id]');
      if(card) toggle(card);
    }
    const rm = e.target.closest('.js-remove');
    if(rm){
      const id = rm.dataset.id;
      const data = load(); delete data[id]; save(data);
      renderShortlist(); hydrate();
    }
  }

  function initShortlist(){
    document.addEventListener('click', onClick);
    hydrate(); renderShortlist();
  }

  // minimal star button CSS (uses currentColor for stroke)
  const css = `
  .js-save-listing{border:1px solid var(--line); background: color-mix(in oklab, var(--paper) 90%, transparent)}
  .js-save-listing svg{width:18px;height:18px;stroke:currentColor;fill:#d71920;fill-opacity:0}
  .js-save-listing.is-saved svg{fill-opacity:1}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  window.initShortlist = initShortlist;
})();


/*! shortlist.js — simple localStorage "saved listings" with ⭐ toggle */
(function(){
  const KEY = 'shortlistV1';
  let bound = false;

  const safeStorage = (()=>{
    let warned = false;
    let toast = null;

    function showToast(){
      if(toast) return toast;
      toast = document.createElement('div');
      toast.className = 'storage-toast';
      toast.setAttribute('role', 'status');
      toast.textContent = 'Saved listings are unavailable in this browser.';
      document.body.appendChild(toast);
      requestAnimationFrame(()=>toast.classList.add('is-visible'));
      return toast;
    }

    function warn(e){
      console.warn('Storage access failed', e);
      if(!warned){ warned = true; showToast(); }
    }

    return {
      get(key){
        try{ return localStorage.getItem(key); }
        catch(e){ warn(e); return null; }
      },
      set(key, value){
        try{ localStorage.setItem(key, value); return true; }
        catch(e){ warn(e); return false; }
      },
      remove(key){
        try{ localStorage.removeItem(key); return true; }
        catch(e){ warn(e); return false; }
      }
    };
  })();

  function load(){
    const raw = safeStorage.get(KEY);
    if(!raw) return {};
    try{ return JSON.parse(raw) || {}; }
    catch{ return {}; }
  }
  function save(data){ return safeStorage.set(KEY, JSON.stringify(data)); }

  function toggle(card){
    const id = card.dataset.id;
    if(!id) return;
    const data = load();
    if(data[id]){
      const prev = data[id];
      delete data[id];
      if(!save(data)){ data[id] = prev; return; }
      updateUI(card, false);
    }
    else{
      const payload = extract(card);
      data[id] = payload;
      if(!save(data)){ delete data[id]; return; }
      updateUI(card, true);
    }
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
      const data = load();
      const prev = data[id];
      delete data[id];
      if(!save(data)){ data[id] = prev; return; }
      renderShortlist();
      hydrate();
    }
  }

  function initShortlist(){
    if(!bound){
      document.addEventListener('click', onClick);
      bound = true;
    }
    hydrate(); renderShortlist();
  }

  // minimal star button CSS (uses currentColor for stroke)
  const css = `
  .js-save-listing{border:1px solid var(--line); background: color-mix(in oklab, var(--paper) 90%, transparent)}
  .js-save-listing svg{width:18px;height:18px;stroke:currentColor;fill:#d71920;fill-opacity:0}
  .js-save-listing.is-saved svg{fill-opacity:1}
  .storage-toast{position:fixed;bottom:1.25rem;right:1.25rem;padding:.75rem 1rem;border-radius:.75rem;background:color-mix(in oklab, var(--ink) 85%, transparent);color:var(--paper, #fff);font-size:.875rem;box-shadow:0 0.75rem 1.5rem rgba(0,0,0,.2);opacity:0;transform:translateY(12px);transition:opacity .3s ease, transform .3s ease;pointer-events:none;z-index:999}
  .storage-toast.is-visible{opacity:1;transform:translateY(0)}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  window.initShortlist = initShortlist;
})();

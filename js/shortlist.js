
/*! shortlist.js — simple localStorage "saved listings" with ⭐ toggle */
(function(){
  const KEY = 'shortlistV1';
  let bound = false;

  const toastManager = (()=>{
    let storageToast = null;
    let shareToast = null;
    let shareTimer = null;

    function ensureStorageToast(){
      if(storageToast) return storageToast;
      storageToast = document.createElement('div');
      storageToast.className = 'storage-toast';
      storageToast.setAttribute('role', 'status');
      storageToast.textContent = 'Saved listings are unavailable in this browser.';
      document.body.appendChild(storageToast);
      requestAnimationFrame(()=>storageToast.classList.add('is-visible'));
      return storageToast;
    }

    function showShareError(message){
      if(!shareToast){
        shareToast = document.createElement('div');
        shareToast.className = 'storage-toast shortlist-toast-error';
        shareToast.setAttribute('role', 'status');
        document.body.appendChild(shareToast);
      }
      shareToast.textContent = message;
      requestAnimationFrame(()=>shareToast.classList.add('is-visible'));
      if(shareTimer) clearTimeout(shareTimer);
      shareTimer = setTimeout(()=>{
        shareToast.classList.remove('is-visible');
      }, 4000);
    }

    return {
      warnStorage(){ ensureStorageToast(); },
      shareError(message){ showShareError(message); }
    };
  })();

  const safeStorage = (()=>{
    let warned = false;

    function warn(e){
      console.warn('Storage access failed', e);
      if(!warned){ warned = true; toastManager.warnStorage(); }
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

  const shareState = { loading:false, url:'', expiresAt:null };
  const shareUI = { button:null, output:null, bound:false };

  function getShareElements(){
    if(!shareUI.button){ shareUI.button = document.getElementById('shortlist-share'); }
    if(!shareUI.output){ shareUI.output = document.getElementById('shortlist-share-output'); }
    if(shareUI.button && !shareUI.bound){
      shareUI.button.addEventListener('click', onShareClick);
      shareUI.bound = true;
    }
    if(shareUI.output && !shareUI.output.dataset.bound){
      shareUI.output.addEventListener('click', onShareOutputClick);
      shareUI.output.dataset.bound = 'true';
    }
    return shareUI;
  }

  function updateShareAvailability(items){
    const { button, output } = getShareElements();
    if(!button) return;
    const hasItems = items.length > 0;
    const isDisabled = !hasItems || shareState.loading;
    button.disabled = isDisabled;
    button.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    button.setAttribute('aria-busy', shareState.loading ? 'true' : 'false');
    button.textContent = shareState.loading ? 'Generating…' : 'Share shortlist';
    if(!hasItems){
      shareState.url = '';
      shareState.expiresAt = null;
      if(output){ output.innerHTML = ''; }
    }
  }

  function showShareMessage(message){
    const { output } = getShareElements();
    if(!output) return;
    if(!message){ output.innerHTML = ''; return; }
    output.innerHTML = `<p class="small">${escapeHtml(message)}</p>`;
  }

  function formatExpiry(expiresAt){
    if(!expiresAt) return '';
    const expiry = new Date(expiresAt);
    if(Number.isNaN(expiry.getTime())) return '';
    const diff = expiry.getTime() - Date.now();
    if(diff <= 0) return 'now';
    const minutes = Math.round(diff / 60000);
    if(minutes < 60) return `in ${minutes} minute${minutes===1?'':'s'} (${expiry.toLocaleString()})`;
    const hours = Math.round(diff / 3600000);
    if(hours < 48) return `in ${hours} hour${hours===1?'':'s'} (${expiry.toLocaleString()})`;
    const days = Math.round(diff / 86400000);
    return `in ${days} day${days===1?'':'s'} (${expiry.toLocaleString()})`;
  }

  function displayShareResult(url, expiresAt, count){
    const { output } = getShareElements();
    if(!output) return;
    const expiryText = formatExpiry(expiresAt);
    shareState.url = url;
    shareState.expiresAt = expiresAt;
    const emailSubject = encodeURIComponent('Shared shortlist');
    const emailBody = encodeURIComponent(`Here’s a shortlist of ${count} listing${count===1?'':'s'}: ${url}`);
    const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`Check out these listings: ${url}`)}`;
    const safeUrl = escapeHtml(url);
    const attrUrl = escapeAttr(url);
    const emailHref = escapeAttr(`mailto:?subject=${emailSubject}&body=${emailBody}`);
    const whatsappAttr = escapeAttr(whatsappHref);
    output.innerHTML = `
      <div class="card" style="padding: 1rem;">
        <p class="m-0"><strong>Share link</strong></p>
        <p class="m-0" style="word-break: break-word;"><a href="${attrUrl}" target="_blank" rel="noopener">${safeUrl}</a></p>
        ${expiryText ? `<p class="m-0 small">Link expires ${escapeHtml(expiryText)}.</p>` : ''}
        <div class="py-3 flex flex-wrap gap-2">
          <button class="btn ghost" type="button" data-share-copy>Copy link</button>
          <a class="btn ghost" data-share-email href="${emailHref}">Email</a>
          <a class="btn ghost" data-share-whatsapp href="${whatsappAttr}" target="_blank" rel="noopener">WhatsApp</a>
        </div>
      </div>
    `;
  }

  async function onShareClick(e){
    e.preventDefault();
    const data = load();
    const items = Object.values(data);
    if(!items.length){
      showShareMessage('Save at least one listing to share.');
      return;
    }
    shareState.loading = true;
    updateShareAvailability(items);
    showShareMessage('Generating share link…');
    try{
      const payload = {
        ids: items.map(item=>item.id),
        listings: items
      };
      const res = await fetch('/.netlify/functions/shortlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({ success:false }));
      if(!res.ok || !json?.success){
        const msg = json?.error || `Request failed with status ${res.status}`;
        throw new Error(msg);
      }
      const slug = json.slug;
      const expiresAt = json.expiresAt;
      const shareUrl = `${window.location.origin}/shortlist.html?id=${encodeURIComponent(slug)}`;
      displayShareResult(shareUrl, expiresAt, items.length);
    }catch(error){
      console.error('Shortlist share failed', error);
      toastManager.shareError('Unable to share shortlist. Please try again.');
      showShareMessage('Unable to generate a share link. Please try again.');
    }finally{
      shareState.loading = false;
      updateShareAvailability(Object.values(load()));
    }
  }

  function onShareOutputClick(e){
    const copyBtn = e.target.closest('[data-share-copy]');
    if(copyBtn){
      e.preventDefault();
      if(!shareState.url){
        toastManager.shareError('Share link unavailable. Try generating a new link.');
        return;
      }
      if(navigator.clipboard?.writeText){
        navigator.clipboard.writeText(shareState.url)
          .then(()=>{
            const original = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(()=>{ copyBtn.textContent = original; }, 2000);
          })
          .catch(()=>{
            toastManager.shareError('Copy failed. Use your browser menu to copy the link.');
          });
      }else{
        toastManager.shareError('Copy is not supported in this browser.');
      }
      return;
    }
  }

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
    updateShareAvailability(Object.values(data));
  }

  function renderShortlist(){
    const mount = document.getElementById('shortlist-cards');
    if(!mount) return;
    const data = load();
    const items = Object.values(data);
    mount.innerHTML = items.length ? items.map(tpl).join('') :
      `<p class="small">No saved listings yet. Tap the ⭐ on any card to add it here.</p>`;
    updateShareAvailability(items);
  }

  function escapeHtml(value){
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value){
    return escapeHtml(value).replace(/`/g, '&#96;');
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
    getShareElements();
    hydrate(); renderShortlist();
  }

  // minimal star button CSS (uses currentColor for stroke)
  const css = `
  .js-save-listing{border:1px solid var(--line); background: color-mix(in oklab, var(--paper) 90%, transparent)}
  .js-save-listing svg{width:18px;height:18px;stroke:currentColor;fill:#d71920;fill-opacity:0}
  .js-save-listing.is-saved svg{fill-opacity:1}
  .storage-toast{position:fixed;bottom:1.25rem;right:1.25rem;padding:.75rem 1rem;border-radius:.75rem;background:color-mix(in oklab, var(--ink) 85%, transparent);color:var(--paper, #fff);font-size:.875rem;box-shadow:0 0.75rem 1.5rem rgba(0,0,0,.2);opacity:0;transform:translateY(12px);transition:opacity .3s ease, transform .3s ease;pointer-events:none;z-index:999}
  .storage-toast.is-visible{opacity:1;transform:translateY(0)}
  .shortlist-toast-error{bottom:calc(1.25rem + 3.5rem)}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  window.initShortlist = initShortlist;
})();

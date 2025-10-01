/*! shortlist-share.js — hydrates shared shortlist pages */
(function(){
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('id') || params.get('share');
  const mount = document.getElementById('shared-shortlist');
  const statusEl = document.getElementById('shared-shortlist-status');
  const metaEl = document.getElementById('shared-shortlist-meta');

  if(!mount){ return; }

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

  function setStatus(message){
    if(statusEl){ statusEl.textContent = message; }
  }

  function renderListings(listings){
    if(!Array.isArray(listings) || !listings.length){
      mount.innerHTML = '<p class="small">This shortlist is empty.</p>';
      return;
    }
    mount.innerHTML = listings.map(cardTpl).join('');
    window.initShortlist?.();
  }

  function cardTpl(item){
    const itemId = item && item.id != null ? String(item.id) : '';
    const title = escapeHtml(item.title || 'Listing');
    const detailUrl = escapeAttr(item.url || `/listings/${encodeURIComponent(itemId)}/`);
    const price = item.priceDisplay || (typeof item.price === 'number' ? `$${item.price.toLocaleString()}` : '');
    const typeCity = [item.type, item.city].filter(Boolean).join(' • ');
    const details = item.details ? `<p class="m-0 small">${escapeHtml(item.details)}</p>` : '';
    const address = item.address ? `<p class="m-0 small">${escapeHtml(item.address)}</p>` : '';
    const webp = item.webp && item.webp.endsWith('.webp')
      ? `<source type="image/webp" srcset="${escapeAttr(item.webp)}">`
      : '';
    const cover = escapeAttr(item.cover || item.img || '');
    const aria = escapeAttr(`View ${item.title || 'listing'} details`);
    return `
    <article class="card col-12" data-id="${escapeHtml(itemId)}">
      <a href="${detailUrl}" class="block" aria-label="${aria}">
        <picture>
          ${webp}
          <img class="listing-photo" src="${cover}" alt="${title}">
        </picture>
      </a>
      <div class="card-body">
        <h3 class="m-0">${title}</h3>
        ${typeCity ? `<div class="meta">${escapeHtml(typeCity)}</div>` : ''}
        ${price ? `<div class="price">${escapeHtml(price)}</div>` : ''}
        ${details}
        ${address}
        <div class="py-3 flex flex-wrap gap-2">
          <a class="btn" href="${detailUrl}">View details</a>
          <button class="btn js-save-listing" aria-pressed="false" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.27l6.18 3.73-1.64-7.03L21.5 9.24l-7.19-.61L12 2 9.69 8.63 2.5 9.24l4.96 4.73L5.82 21z"/></svg>
            Save
          </button>
        </div>
      </div>
    </article>
    `;
  }

  function formatRelative(diffMs){
    if(diffMs <= 0) return 'now';
    const minutes = Math.round(diffMs / 60000);
    if(minutes < 60) return `in ${minutes} minute${minutes === 1 ? '' : 's'}`;
    const hours = Math.round(diffMs / 3600000);
    if(hours < 48) return `in ${hours} hour${hours === 1 ? '' : 's'}`;
    const days = Math.round(diffMs / 86400000);
    return `in ${days} day${days === 1 ? '' : 's'}`;
  }

  function hydrateMeta(data){
    if(!metaEl) return;
    const count = Number(data?.count ?? (data?.listings?.length || 0));
    const parts = [];
    if(count){ parts.push(`${count} saved listing${count === 1 ? '' : 's'}.`); }
    if(data?.createdAt){
      const created = new Date(data.createdAt);
      if(!Number.isNaN(created.getTime())){
        parts.push(`Shared ${created.toLocaleString()}.`);
      }
    }
    if(data?.expiresAt){
      const expiry = new Date(data.expiresAt);
      if(!Number.isNaN(expiry.getTime())){
        const diff = expiry.getTime() - Date.now();
        const rel = formatRelative(diff);
        parts.push(diff <= 0
          ? 'Link has expired.'
          : `Link expires ${rel} (${expiry.toLocaleString()}).`);
      }
    }
    metaEl.textContent = parts.join(' ') || '';
  }

  async function hydrate(){
    if(!slug){
      setStatus('Shortlist link is missing.');
      mount.innerHTML = '';
      return;
    }
    setStatus('Loading shortlist…');
    try{
      const res = await fetch(`/.netlify/functions/shortlist?id=${encodeURIComponent(slug)}`);
      if(res.status === 404){
        setStatus('This shortlist is unavailable. It may have expired or the link is incorrect.');
        mount.innerHTML = '';
        return;
      }
      if(!res.ok){
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data = await res.json();
      if(!Array.isArray(data?.listings) || !data.listings.length){
        setStatus('This shortlist is empty.');
        renderListings([]);
        hydrateMeta(data);
        return;
      }
      setStatus('');
      renderListings(data.listings);
      hydrateMeta(data);
    }catch(error){
      console.error('Failed to load shared shortlist', error);
      setStatus('We couldn’t load this shortlist right now. Please try again later or request a new link.');
    }
  }

  hydrate();
})();

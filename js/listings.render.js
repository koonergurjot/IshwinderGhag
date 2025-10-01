
/*! listings.render.js — renders filters, cards, and a Leaflet map */
(function(){
  const $$  = (s, r=document)=>Array.from(r.querySelectorAll(s));
  const $   = (s, r=document)=>r.querySelector(s);

  function currency(n){ return n.toLocaleString(undefined,{style:'currency',currency:'CAD',maximumFractionDigits:0}); }

  let updateListenerBound = false;

  function renderUI(mountSelector){
    const mount = $(mountSelector);
    if(!mount) return;
    mount.innerHTML = `
      <section class="container">
        <div class="section-title"><h2>Find a Property</h2>
          <span class="small">Filter by price, type, and city</span>
        </div>

        <div class="card" style="padding: .75rem;">
          <div class="form-row">
            <label>Type
              <select id="f-type">
                <option value="">Any</option>
                <option>Residential</option>
                <option>Commercial</option>
                <option>Industrial</option>
              </select>
            </label>
            <label>City
              <select id="f-city">
                <option value="">Any</option>
                <option>Surrey</option>
                <option>Langley</option>
                <option>Abbotsford</option>
              </select>
            </label>
            <label>Max price
              <input type="number" id="f-price" placeholder="e.g. 2000000">
            </label>
            <label>Search
              <input type="text" id="f-q" placeholder="title, address...">
            </label>
          </div>
          <div class="py-3">
            <button class="btn" id="f-apply">Apply filters</button>
            <button class="btn ghost" id="f-clear">Reset</button>
          </div>
        </div>
      </section>

      <section class="container" style="display:grid; grid-template-columns: 1.1fr .9fr; gap: 1rem;">
        <div>
          <div class="small" id="detail-links" aria-live="polite">Loading listings…</div>
          <div class="grid" id="cards"></div>
        </div>
        <div>
          <div id="map" style="width:100%; height: 520px; border-radius: 12px; border:1px solid var(--line);"></div>
        </div>
      </section>
    `;
    bind();
    render();
    if(!updateListenerBound){
      window.addEventListener('listings:updated', render);
      updateListenerBound = true;
    }
  }

  let state = {type:'',city:'',price:'',q:''}, map, markers=[];

  function bind(){
    $('#f-apply').addEventListener('click', ()=>{
      state = {
        type: $('#f-type').value.trim(),
        city: $('#f-city').value.trim(),
        price: $('#f-price').value.trim(),
        q: $('#f-q').value.trim().toLowerCase(),
      };
      render();
    });
    $('#f-clear').addEventListener('click', ()=>{
      $('#f-type').value = $('#f-city').value = $('#f-price').value = $('#f-q').value = '';
      state = {type:'',city:'',price:'',q:''};
      render();
    });

    // Init Leaflet map if available
    if(window.L && !map){
      map = L.map('map', { scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);
    } else {
      const m = $('#map');
      if(m) m.innerHTML = '<div class="small">Map will load when Leaflet is available.</div>';
    }
  }

  function filterList(){
    let list = (window.LISTINGS||[]).slice();
    if(state.type) list = list.filter(i=>i.type===state.type);
    if(state.city) list = list.filter(i=>i.city===state.city);
    if(state.price){
      const cap = Number(state.price)||0;
      if(cap>0) list = list.filter(i=>i.price <= cap);
    }
    if(state.q){
      list = list.filter(i=>[i.title,i.address,i.city,i.type].join(' ').toLowerCase().includes(state.q));
    }
    return list;
  }

  function render(){
    const list = filterList();
    const grid = $('#cards');
    grid.innerHTML = list.map(cardTpl).join('') || '<p class="small">No matches. Try clearing filters.</p>';

    const detailLinks = $('#detail-links');
    const allListings = window.LISTINGS || [];
    if(detailLinks){
      if(allListings.length){
        const links = allListings.map(item=>`<a href="/listings/${encodeURIComponent(item.id)}/">${item.title}</a>`).join(' • ');
        detailLinks.innerHTML = `Listing detail pages: ${links}`;
      } else {
        detailLinks.textContent = 'Listing details coming soon. Check back shortly.';
      }
    }

    // lightbox hydration and shortlist state
    window.initLightbox?.();
    window.initShortlist?.();

    // map markers
    if(map){
      markers.forEach(m=>m.remove());
      markers = [];
      if(list.length){
        const group = [];
        list.forEach(it=>{
          if(!it.coords) return;
          const m = L.marker(it.coords).addTo(map).bindPopup(`<strong>${it.title}</strong><br>${it.address}<br>${currency(it.price)}`);
          markers.push(m);
          group.push(it.coords);
        });
        if(group.length){ map.fitBounds(group, {padding:[30,30]}); }
      }
    }
  }

  function cardTpl(it){
    const img = it.cover;
    const webp = it.webp && it.webp.endsWith('.webp') ? it.webp : null;
    const detailUrl = `/listings/${encodeURIComponent(it.id)}/`;
    return `
    <article class="card col-12" data-id="${it.id}">
      <a href="${detailUrl}" class="block" aria-label="View ${it.title} details">
        <picture>
          ${webp ? `<source type="image/webp" srcset="${webp}">` : ''}
          <img class="listing-photo" src="${img}" alt="${it.title}">
        </picture>
      </a>
      <div class="card-body">
        <h3 class="m-0 js-title" data-title>${it.title}</h3>
        <div class="meta">${it.type} • ${it.city}</div>
        <div class="price js-price" data-price="${it.priceDisplay||currency(it.price)}">${it.priceDisplay||currency(it.price)}</div>
        <p class="m-0 js-details" data-details>${it.details||''}</p>
        <p class="m-0 small js-address" data-address>${it.address||''}</p>
        <div class="py-3 flex flex-wrap gap-2">
          <a class="btn" href="${detailUrl}">View details</a>
          <button class="btn js-save-listing" aria-pressed="false" title="Save to Shortlist">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.27l6.18 3.73-1.64-7.03L21.5 9.24l-7.19-.61L12 2 9.69 8.63 2.5 9.24l4.96 4.73L5.82 21z"/></svg>
            Save
          </button>
          <button class="btn ghost js-onepager">Download 1‑pager</button>
        </div>
      </div>
    </article>
    `;
  }

  window.renderListingsUI = renderUI;
})();

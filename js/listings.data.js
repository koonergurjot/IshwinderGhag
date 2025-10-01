
/*! listings.data.js — single source of truth for properties */
(function(){
  const SOURCE = '/data/listings.json';
  window.LISTINGS = window.LISTINGS || [];

  async function loadListings(){
    try {
      const res = await fetch(SOURCE, {cache: 'no-store'});
      if(!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      if(!Array.isArray(data)) throw new Error('Listings payload must be an array.');
      window.LISTINGS = data;
      window.dispatchEvent(new CustomEvent('listings:updated', {detail: data}));
    } catch(err){
      console.error('Failed to load listings inventory', err);
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', loadListings, {once: true});
  } else {
    loadListings();
  }
})();

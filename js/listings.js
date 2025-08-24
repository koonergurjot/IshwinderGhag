
/*! listings.js — optional data-driven cards (replace static markup if desired) */
window.LISTINGS = [
  {
    id: "123",
    title: "123 Example Ave",
    price: "$1,249,900",
    address: "123 Example Ave, Surrey, BC",
    cover: "/assets/listings/123/cover.jpg",
    gallery: [
      "/assets/listings/123/cover.jpg",
      "/assets/listings/123/cover.webp"
    ],
    details: "4 bed • 3 bath • 2,100 sqft • Lot 4,000 sqft",
    badge: "New"
  }
];

// Example renderer (call renderListings('#featured'))
function renderListings(selector){
  const mount = document.querySelector(selector);
  if(!mount) return;
  mount.innerHTML = window.LISTINGS.map(item=>`
    <article class="card col-6" data-id="${item.id}">
      <a href="${item.gallery[0]}" data-gallery class="block">
        <picture>
          <source type="image/webp" srcset="${item.cover.replace('.jpg','.webp')}">
          <img class="listing-photo" src="${item.cover}" alt="${item.title}">
        </picture>
      </a>
      <div class="card-body">
        <h3 class="m-0 js-title" data-title>${item.title}</h3>
        <div class="meta js-price" data-price>${item.price}</div>
        <p class="m-0 js-details" data-details>${item.details}</p>
        <div class="py-3">
          <button class="btn js-save-listing" aria-pressed="false" title="Save to Shortlist">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.27l6.18 3.73-1.64-7.03L21.5 9.24l-7.19-.61L12 2 9.69 8.63 2.5 9.24l4.96 4.73L5.82 21z"/></svg>
            Save
          </button>
          <button class="btn ghost js-onepager">Download 1‑pager</button>
        </div>
      </div>
    </article>
  `).join('');
}

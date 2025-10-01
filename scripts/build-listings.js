#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'listings.json');
const LISTINGS_DIR = path.join(ROOT, 'listings');
const API_DIR = path.join(ROOT, 'public', 'api', 'listings');

function formatCurrency(amount, currencyDisplay){
  if(currencyDisplay) return currencyDisplay;
  if(typeof amount !== 'number') return '';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0
  }).format(amount);
}

function listingDescription(listing){
  if(listing.details) return listing.details;
  return `${listing.type||'Property'} in ${listing.city||'British Columbia'}`;
}

function renderGallery(listing){
  const gallery = Array.isArray(listing.gallery) ? listing.gallery : [];
  if(!gallery.length) return '';
  return `
    <div class="gallery">
      ${gallery.map((src, idx)=>`
        <figure class="gallery-item">
          <img src="${src}" alt="${listing.title} photo ${idx+1}" loading="lazy">
        </figure>
      `).join('')}
    </div>
  `;
}

function renderHtml(listing){
  const price = formatCurrency(listing.price, listing.priceDisplay);
  const description = listingDescription(listing);
  const canonical = `https://ishwinderghag.com/listings/${listing.id}/`;
  const hero = listing.cover || (listing.gallery && listing.gallery[0]) || '/assets/ishwinder/hero-1280.jpg';
  const galleryMarkup = renderGallery(listing);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    'name': listing.title,
    'description': description,
    'url': canonical,
    'image': galleryMarkup ? (listing.gallery || []) : [hero],
    'offers': {
      '@type': 'Offer',
      'price': listing.price,
      'priceCurrency': 'CAD'
    },
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': listing.address,
      'addressLocality': listing.city,
      'addressRegion': 'BC',
      'addressCountry': 'CA'
    }
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${listing.title} | Ishwinder Ghag Listings</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${listing.title} | Ishwinder Ghag">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${hero}">
  <meta property="og:url" content="${canonical}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/styles/main.css">
  <style>
    .detail-hero{position:relative; border-radius:16px; overflow:hidden; margin-bottom:2rem;}
    .detail-hero img{width:100%; height:auto; display:block;}
    .detail-header{display:flex; flex-direction:column; gap:.75rem; margin-bottom:1.5rem;}
    .gallery{display:grid; gap:1rem; grid-template-columns:repeat(auto-fit,minmax(240px,1fr));}
    .gallery-item{border-radius:12px; overflow:hidden; background:#f5f5f5;}
    .gallery-item img{width:100%; height:100%; object-fit:cover; display:block;}
    .cta-group{display:flex; flex-wrap:wrap; gap:.75rem; margin-top:1rem;}
  </style>
</head>
<body>
  <a class="visually-hidden" href="#main">Skip to content</a>
  <header class="container" style="padding-top:2rem;">
    <a href="/" class="small">← Back to homepage</a>
    <h1 class="m-0">${listing.title}</h1>
    <p class="small m-0">${listing.address || ''}</p>
  </header>
  <main id="main" class="container" style="padding-bottom:3rem;">
    <div class="detail-hero">
      <img src="${hero}" alt="${listing.title}" loading="eager">
    </div>
    <div class="detail-header">
      <span class="pill">${listing.type || 'Property'} • ${listing.city || ''}</span>
      <div class="price" style="font-size:1.75rem; font-weight:600;">${price}</div>
      <p>${description}</p>
      <div class="cta-group">
        <a class="btn" href="mailto:ishwinderghag@gmail.com?subject=${encodeURIComponent('Inquiry about ' + listing.title)}">Request more information</a>
        <a class="btn ghost" href="tel:+16045374334">Call 604-537-4334</a>
      </div>
    </div>
    ${galleryMarkup}
    <section aria-labelledby="listing-facts" style="margin-top:2.5rem;">
      <h2 id="listing-facts">Property details</h2>
      <ul class="small" style="line-height:1.6; padding-left:1.25rem;">
        ${listing.details ? `<li>${listing.details}</li>` : ''}
        ${listing.badge ? `<li>Status: ${listing.badge}</li>` : ''}
        <li>City: ${listing.city || '—'}</li>
        <li>Type: ${listing.type || '—'}</li>
        ${listing.coords ? `<li>Latitude: ${listing.coords[0]}, Longitude: ${listing.coords[1]}</li>` : ''}
      </ul>
    </section>
  </main>
  <footer class="container" style="padding-bottom:2rem;">
    <p class="small">Royal LePage Global Force Realty • Ishwinder Ghag Personal Real Estate Corporation</p>
  </footer>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</body>
</html>`;
}

async function ensureDir(dir){
  await fs.mkdir(dir, {recursive: true});
}

async function build(){
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  const listings = JSON.parse(raw);
  if(!Array.isArray(listings)){
    throw new Error('Expected an array of listings');
  }

  await fs.rm(LISTINGS_DIR, {recursive: true, force: true});
  await fs.rm(API_DIR, {recursive: true, force: true});
  await ensureDir(LISTINGS_DIR);
  await ensureDir(API_DIR);

  const timestamp = new Date().toISOString();

  for(const listing of listings){
    if(!listing.id) continue;
    const dir = path.join(LISTINGS_DIR, listing.id);
    await ensureDir(dir);
    const htmlPath = path.join(dir, 'index.html');
    await fs.writeFile(htmlPath, renderHtml(listing));

    const apiPath = path.join(API_DIR, `${listing.id}.json`);
    const payload = {...listing, generatedAt: timestamp};
    await fs.writeFile(apiPath, JSON.stringify(payload, null, 2));
  }

  const indexPath = path.join(API_DIR, 'index.json');
  await fs.writeFile(indexPath, JSON.stringify({generatedAt: timestamp, listings}, null, 2));

  console.log(`Generated ${listings.length} listing page(s).`);
}

build().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

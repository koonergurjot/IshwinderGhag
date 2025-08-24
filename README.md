
# Drop‑in Upgrade Pack

This zip contains everything to improve visuals, images, and UX without a build step.

## What’s inside
- `styles/main.css` — visual refresh (replace your existing `styles/main.css`)
- `assets/` — favicon, avatar, OG image, sample listing images (move your real photos here later)
- `js/` — lightbox (gallery), shortlist ⭐ (saved listings), one‑pager generator, spam‑guard
- `css/print-onepager.css` — print styles for the one‑pager
- `docs/index-snippets.html` — copy‑paste head + script tags and example card markup

## Install (90 seconds)
1) Unzip into your project root. Keep the same folder names.
2) Overwrite your existing `styles/main.css` with the one in this pack.
3) Open `docs/index-snippets.html` and copy:
   - the `<head>` additions (preconnect, favicon, OG tags)
   - the `<script>` tags before `</body>`
   - the **example card markup** (or wire `js/listings.js` to render from data)
4) Replace the placeholder images in `/assets/listings/*` with your real photos.
5) Reload — you should see: sharper UI, working lightbox, ⭐ saves, 1‑pager download, and harder‑to‑spam forms.

## Notes
- Saved listings are stored in `localStorage` (per browser).
- The one‑pager opens a new tab and auto‑prints. Customize fields in `js/onepager.js`.
- Spam‑guard adds a honeypot and a 3‑second minimum time-to-submit. You can adjust in `js/forms.js`.

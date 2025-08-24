
# Visual Refresh — How to Apply

This is a **drop‑in stylesheet** to polish the look & feel without changing your HTML.

## Quick install
1) Put `main.css` in your project at `styles/main.css` (replace the existing one).
2) Make sure your `<head>` keeps the line:
```html
<link rel="stylesheet" href="styles/main.css">
```
3) Reload. The grid, cards, carousel, buttons, and forms will look cleaner, with better mobile layout and a sticky, blurred header.

## What changed
- Responsive columns: `.col-6` / `.col-4` collapse to full‑width under 900px (no more squished cards on phones).
- Sticky header with backdrop blur and active nav highlights.
- Carousel image height is clamped (`46vh–70vh`) to avoid jumpiness.
- Stronger cards (rounded, subtle shadow, hover lift).
- Unified buttons (`.btn`, `.btn.ghost`) and radio pills (`.pill`).
- Inputs/selects/textarea styled consistently.
- Better focus rings + skip link for a11y.
- Works in both light & dark via `[data-theme="dark"]`.

If you want me to also split the long `index.html` into components and move listing data to JSON so the cards render from data (less copy/paste), I can generate that too.

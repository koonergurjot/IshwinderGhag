
/*! lightbox.js — tiny, dependency‑free lightbox for image galleries */
(function(){
  let overlay, img, prevBtn, nextBtn, closeBtn, caption, items=[], index=0, lastFocus=null;

  function create(){
    overlay = document.createElement('div');
    overlay.className = 'lb-backdrop';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.innerHTML = `
      <div class="lb-wrap" tabindex="-1">
        <button class="lb-close" aria-label="Close (Esc)">×</button>
        <button class="lb-prev" aria-label="Previous">‹</button>
        <img class="lb-img" alt="">
        <button class="lb-next" aria-label="Next">›</button>
        <div class="lb-caption" aria-live="polite"></div>
      </div>`;
    document.body.appendChild(overlay);
    img = overlay.querySelector('.lb-img');
    prevBtn = overlay.querySelector('.lb-prev');
    nextBtn = overlay.querySelector('.lb-next');
    closeBtn = overlay.querySelector('.lb-close');
    caption = overlay.querySelector('.lb-caption');

    overlay.addEventListener('click', e=>{ if(e.target===overlay) close(); });
    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', ()=>show(index-1));
    nextBtn.addEventListener('click', ()=>show(index+1));
    document.addEventListener('keydown', e=>{
      if(!overlay || overlay.style.display!=='block') return;
      if(e.key==='Escape') close();
      if(e.key==='ArrowLeft') show(index-1);
      if(e.key==='ArrowRight') show(index+1);
      if(e.key==='Tab'){ // focus trap
        const f = [closeBtn, prevBtn, nextBtn];
        const i = f.indexOf(document.activeElement);
        if(e.shiftKey){ if(i<=0){ e.preventDefault(); f[f.length-1].focus(); } }
        else { if(i===f.length-1){ e.preventDefault(); f[0].focus(); } }
      }
    });
  }

  function open(list, start=0){
    if(!overlay) create();
    lastFocus = document.activeElement;
    items = list;
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
    show(start);
    closeBtn.focus();
  }

  function close(){
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    if(lastFocus) lastFocus.focus();
  }

  function show(i){
    if(!items.length) return;
    index = (i+items.length)%items.length;
    const it = items[index];
    img.src = it.src;
    img.alt = it.alt || '';
    caption.textContent = it.caption || '';
  }

  // Public initializer: attach to any [data-gallery] container
  function initLightbox(){
    document.querySelectorAll('[data-gallery]').forEach(gal=>{
      gal.addEventListener('click', e=>{
        const a = e.target.closest('a, img');
        if(!a || !gal.contains(a)) return;
        const group = Array.from(gal.querySelectorAll('a[href$=".jpg"],a[href$=".jpeg"],a[href$=".png"],a[href$=".webp"],a[href$=".avif"],img[data-full]'));
        const items = group.map(el=>{
          if(el.tagName==='IMG'){
            return { src: el.dataset.full || el.src, alt: el.alt||'', caption: el.dataset.caption||'' };
          }else{
            const img = el.querySelector('img');
            return { src: el.href, alt: img?img.alt:'', caption: el.dataset.caption||img?.alt||'' };
          }
        });
        let start = group.indexOf(a);
        if(start<0 && a.tagName==='IMG'){ start = group.indexOf(a); }
        if(start<0) return;
        e.preventDefault();
        open(items, start);
      });
    });
  }

  // minimal styles
  const css = `
  .lb-backdrop{position:fixed;inset:0;background:rgba(5,10,20,.72);display:none;z-index:60}
  .lb-wrap{position:absolute;inset:0;display:grid;grid-template-areas:'prev img close''prev img next''caption caption caption';grid-template-columns:auto 1fr auto;place-items:center;padding:2rem}
  .lb-img{grid-area:img;max-width:90vw;max-height:80vh;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5)}
  .lb-prev,.lb-next,.lb-close{background:rgba(255,255,255,.92);border:1px solid #e5e7eb;border-radius:999px;width:44px;height:44px;font-size:24px;line-height:1;display:grid;place-items:center;cursor:pointer}
  .lb-prev{grid-area:prev}
  .lb-next{grid-area:next}
  .lb-close{grid-area:close}
  .lb-caption{grid-area:caption;color:#e7eefc;margin-top:8px;text-align:center}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  window.initLightbox = initLightbox;
})();

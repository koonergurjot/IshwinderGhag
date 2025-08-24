
/*! forms.js — spam hardening: honeypot + time to submit + optional hCaptcha */
(function(){
  function initForms(){
    document.querySelectorAll('form[data-spam-protect]').forEach(form=>{
      // honeypot
      let hp = form.querySelector('input[name="website"]');
      if(!hp){
        hp = document.createElement('input');
        hp.type = 'text'; hp.name = 'website'; hp.autocomplete = 'off';
        hp.tabIndex = -1; hp.setAttribute('aria-hidden','true');
        hp.style.cssText = 'position:absolute; left:-9999px; width:1px; height:1px; opacity:0;';
        form.appendChild(hp);
      }
      // time to value
      const started = Date.now();
      let ttv = form.querySelector('input[name="ttv"]');
      if(!ttv){
        ttv = document.createElement('input'); ttv.type='hidden'; ttv.name='ttv'; form.appendChild(ttv);
      }
      form.addEventListener('submit', e=>{
        ttv.value = String(Date.now() - started);
        if(hp.value){ e.preventDefault(); return; } // bot filled honeypot
        if(Number(ttv.value) < 3000){ // <3s -> likely bot
          e.preventDefault();
          alert('Please take a moment before submitting.'); // or show inline message
          return;
        }
        // If using Netlify, these fields will be sent along. You can check ttv>3000 server-side.
      }, {capture:true});
    });
  }
  window.initForms = initForms;
})();

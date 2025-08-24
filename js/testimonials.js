
/*! testimonials.js — simple auto-rotating testimonials strip */
(function(){
  const DATA = [
    { quote: "Professional, responsive, and results‑driven. Sold over asking.", name: "Parm S." },
    { quote: "Found us the perfect industrial bay in days.", name: "Aman D." },
    { quote: "Clear strategy and great negotiation.", name: "Ritu & Nav." }
  ];
  function initTestimonials(){
    const root = document.getElementById('testimonials');
    if(!root) return;
    root.innerHTML = `
      <section class="container">
        <div class="section-title"><h2>What clients say</h2><span class="small">A few recent notes</span></div>
        <div class="card" id="t-wrap" style="padding:1rem;min-height:120px;display:flex;align-items:center;justify-content:center;text-align:center">
          <blockquote class="m-0" id="t-quote" style="font-size:1.1rem"></blockquote>
        </div>
      </section>`;
    let i=0; const el = document.getElementById('t-quote');
    function show(){ el.textContent = `“${DATA[i].quote}” — ${DATA[i].name}`; }
    show();
    setInterval(()=>{ i=(i+1)%DATA.length; show(); }, 4000);
  }
  window.initTestimonials = initTestimonials;
})();

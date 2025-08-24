
/*! quiz.js — routes users to the right CTA based on intent */
(function(){
  function initQuiz(){
    const root = document.getElementById('lead-quiz');
    if(!root) return;
    root.innerHTML = `
      <section class="container">
        <div class="section-title"><h2>Quick Start</h2><span class="small">Tell us who you are</span></div>
        <div class="card" style="padding:1rem">
          <div class="pill"><input type="radio" name="role" value="buyer" id="q-buyer"><label for="q-buyer">Buyer</label></div>
          <div class="pill"><input type="radio" name="role" value="seller" id="q-seller"><label for="q-seller">Seller</label></div>
          <div class="pill"><input type="radio" name="role" value="investor" id="q-investor"><label for="q-investor">Investor</label></div>
          <div class="mt-3">
            <button class="btn" id="q-go">Get my next step</button>
          </div>
          <div class="mt-3" id="q-result"></div>
        </div>
      </section>
    `;
    root.querySelector('#q-go').addEventListener('click', ()=>{
      const val = (root.querySelector('input[name="role"]:checked')||{}).value;
      const res = root.querySelector('#q-result');
      if(!val){ res.innerHTML = '<p class="small">Please pick an option.</p>'; return; }
      const map = {
        buyer:   { text: 'Book a viewing or get pre‑approval guidance.', href: '#contact' },
        seller:  { text: 'Get a free home valuation and listing plan.', href: '#contact' },
        investor:{ text: 'See cap rates and cash‑flow projections.', href: '#tools' }
      };
      const pick = map[val];
      res.innerHTML = `
        <div class="card" style="padding: .75rem">
          <p class="m-0"><strong>${pick.text}</strong></p>
          <div class="mt-3">
            <a class="btn" href="${pick.href}">Continue</a>
            <a class="btn ghost" href="https://wa.me/16045374334?text=Hi%2C%20I%27m%20a%20${val}%20and%20I%27d%20like%20to%20discuss.">WhatsApp Ishwinder</a>
          </div>
        </div>`;
    });
  }
  window.initQuiz = initQuiz;
})();

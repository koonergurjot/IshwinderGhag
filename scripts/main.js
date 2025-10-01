      const safeStorage = (()=>{
        let warned = false;
        function warn(e){
          if(!warned){
            warned = true;
            console.warn('Storage access failed', e);
            alert('Storage features are disabled in your browser.');
          }
        }
        return {
          get(key){
            try{ return localStorage.getItem(key); }
            catch(e){ warn(e); return null; }
          },
          set(key, value){
            try{ localStorage.setItem(key, value); }
            catch(e){ warn(e); }
          },
          remove(key){
            try{ localStorage.removeItem(key); }
            catch(e){ warn(e); }
          }
        };
      })();

      const safeClipboard = {
        async write(text){
          try{
            if(!navigator.clipboard) throw new Error('Clipboard API unavailable');
            await navigator.clipboard.writeText(text);
          }catch(e){
            console.warn('Clipboard write failed', e);
            alert('Clipboard unavailable');
            throw e;
          }
        }
      };

      // Respect stored theme preference
      (function(){
        const stored = safeStorage.get('theme');
        if(stored === 'dark'){ document.documentElement.setAttribute('data-theme','dark'); }
      })();

    // Year
    document.getElementById('year').textContent = new Date().getFullYear();

    // Theme toggle
    const themeBtn = document.getElementById('themeToggle');
    if(themeBtn){
      themeBtn.addEventListener('click',()=>{
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if(isDark){ document.documentElement.removeAttribute('data-theme'); safeStorage.remove('theme'); themeBtn.setAttribute('aria-pressed','false'); }
        else { document.documentElement.setAttribute('data-theme','dark'); safeStorage.set('theme','dark'); themeBtn.setAttribute('aria-pressed','true'); }
      });
    }

    // Simple carousel with controls + keyboard + pause + a11y states
    (function(){
      const root = document.getElementById('carousel');
      if(!root) return;
      const slides = root.querySelector('.slides');
      const frames = Array.from(slides.children);
      const total = frames.length;
      let i = 0;
      let playing = true;
      let timer = null;

      function setA11y(idx){
        frames.forEach((el, j)=>{
          el.setAttribute('aria-hidden', j===idx ? 'false' : 'true');
          el.setAttribute('aria-label', `Slide ${j+1} of ${total}`);
        });
      }
      function go(n){
        i = (n + total) % total;
        slides.style.transform = 'translateX(' + (-i*100) + '%)';
        setA11y(i);
      }
      function play(){ playing = true; timer = setInterval(()=>go(i+1), 3500); }
      function pause(){ playing = false; clearInterval(timer); timer = null; }

      // Autoplay (respect reduced motion)
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches){ play(); }
      setA11y(0);

      // Controls
      root.querySelector('#prevSlide').addEventListener('click',()=>{ pause(); go(i-1); });
      root.querySelector('#nextSlide').addEventListener('click',()=>{ pause(); go(i+1); });
      const pp = root.querySelector('#pausePlay');
      pp.addEventListener('click',()=>{
        if (playing){ pause(); pp.setAttribute('aria-pressed','true'); pp.textContent='Play'; pp.setAttribute('aria-label','Play autoplay'); }
        else { play(); pp.setAttribute('aria-pressed','false'); pp.textContent='Pause'; pp.setAttribute('aria-label','Pause autoplay'); }
      });

      // Keyboard support
      root.addEventListener('keydown', (e)=>{
        if(e.key==='ArrowRight'){ pause(); go(i+1); }
        if(e.key==='ArrowLeft'){ pause(); go(i-1); }
      });
    })();

    // Reveal on scroll
    const io = new IntersectionObserver((entries)=>{
      for(const e of entries){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} }
    }, {threshold: .12});
    document.querySelectorAll('.fade-up').forEach(el=>io.observe(el));

    // Scrollspy for nav highlights
    (function(){
      const links = Array.from(document.querySelectorAll('nav a[href^="#"]'));
      const map = new Map(links.map(a=>[a.getAttribute('href'), a]));
      const obs = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          const id = '#' + entry.target.id;
          const link = map.get(id);
          if(link){ link.setAttribute('aria-current', entry.isIntersecting ? 'true' : 'false'); }
        });
      }, {rootMargin: '-50% 0px -45% 0px', threshold: [0,1]});
      document.querySelectorAll('main section[id]').forEach(sec=>obs.observe(sec));
    })();

    function trapFocus(modal){
      const focusable = modal.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
      const first = focusable[0];
      const last = focusable[focusable.length-1];
      const prev = document.activeElement;
      function loop(e){
        if(e.key==='Tab'){
          if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
          else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
        }
      }
      modal.addEventListener('keydown', loop);
      modal.addEventListener('close',()=>{ modal.removeEventListener('keydown', loop); prev&&prev.focus(); });
      first&&first.focus();
    }

    // Privacy / Terms tiny modal handler
    (function(){
      const modal = document.getElementById('policyModal');
      const privacy = document.getElementById('openPrivacy');
      const terms = document.getElementById('openTerms');
      const title = document.getElementById('policyTitle');
      const pContent = document.getElementById('privacyContent');
      const tContent = document.getElementById('termsContent');
      function open(type){
        const isPrivacy = type==='privacy';
        title.textContent = isPrivacy ? 'Privacy' : 'Terms';
        pContent.hidden = !isPrivacy; tContent.hidden = isPrivacy;
        modal.showModal();
        trapFocus(modal);
      }
      privacy.addEventListener('click',(e)=>{ e.preventDefault(); open('privacy'); });
      terms.addEventListener('click',(e)=>{ e.preventDefault(); open('terms'); });
    })();
      // Calculators, widgets & quiz
    (function(){
      function sanitize(str){
        const div=document.createElement('div');
        div.textContent=str==null?'':String(str);
        return div.textContent;
      }
      function sanitizeNumberString(str){
        return (str||'').match(/^(-?\d*(?:\.\d*)?)$/)?.[1] ?? '';
      }
      function parseNum(val){
        const clean = sanitizeNumberString(val);
        if(clean==='') return 0;
        return parseFloat(clean) || 0;
      }
      function attachNumericSanitizer(el){
        if(!el) return;
        el.addEventListener('input',()=>{
          const clean=sanitizeNumberString(el.value);
          if(el.value!==clean) el.value=clean;
        });
      }
      function clear(el){ while(el && el.firstChild) el.removeChild(el.firstChild); }

      // Cap rate
      const noi = document.getElementById('noi');
      const price = document.getElementById('capPrice');
      const capOut = document.getElementById('capResult');
      function cap(){
        const n = parseFloat(noi.value||'');
        const p = parseFloat(price.value||'');
        if(n>0 && p>0){ capOut.textContent = `Cap Rate: ${(n/p*100).toFixed(2)}%`; }
        else capOut.textContent = 'Cap Rate: —';
      }
      [noi,price].forEach(el=>el&&el.addEventListener('input',cap));

      // Mortgage (simple fixed payment)
      const mPrice = document.getElementById('mPrice');
      const down = document.getElementById('down');
      const rate = document.getElementById('rate');
      const amort = document.getElementById('amort');
      const mOut = document.getElementById('mortResult');
      function mort(){
        const P = Math.max(0,(parseFloat(mPrice.value||'')||0) * (1 - (parseFloat(down.value||'0')/100)));
        const r = (parseFloat(rate.value||'0')/100)/12;
        const n = (parseInt(amort.value||'25',10))*12;
        if(P>0 && r>0 && n>0){
          const M = P * (r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1);
          mOut.textContent = `Monthly Payment: $${M.toLocaleString(undefined,{maximumFractionDigits:0})}`;
        }else{
          mOut.textContent = 'Monthly Payment: —';
        }
      }
      ;[mPrice,down,rate,amort].forEach(el=>el&&el.addEventListener('input',mort));

      // Call for Offers countdown
      const cfo = document.getElementById('cfo');
      const cfoOut = document.getElementById('cfoCountdown');
      const shareBtn = document.getElementById('shareCFO');
      if(shareBtn && !navigator.clipboard){ shareBtn.style.display='none'; }
      let cfoTimer=null;
      function tick(){
        if(!cfo.value){ cfoOut.textContent='Set a deadline to start the live countdown.'; return; }
        const t = new Date(cfo.value).getTime();
        const now = Date.now();
        const diff = t-now;
        if(diff<=0){ cfoOut.textContent = 'Offer window closed.'; clearInterval(cfoTimer); return; }
        const d=Math.floor(diff/86400000), h=Math.floor(diff%86400000/3600000), m=Math.floor(diff%3600000/60000), s=Math.floor(diff%60000/1000);
        cfoOut.textContent = `${d}d ${h}h ${m}m ${s}s remaining`;
      }
      cfo&&cfo.addEventListener('input',()=>{clearInterval(cfoTimer); tick(); cfoTimer=setInterval(tick,1000)});
      shareBtn&&shareBtn.addEventListener('click',()=>{
        const text = cfo.value ? `Call for Offers closes ${new Date(cfo.value).toLocaleString()}` : 'Call for Offers date coming soon.';
        safeClipboard.write(text).then(()=>{ shareBtn.textContent='Copied!'; setTimeout(()=>shareBtn.textContent='Copy share text',1200); }).catch(()=>{});
      });

      // Policy Watch (editable items)
      const policyItems = [
        {title:'Brookswood‑Booth NCP: Phase 2 staff report', note:'Target Q4 review; servicing strategy update forthcoming.'},
        {title:'Campbell Heights expansion', note:'Adjacent parcels at 3rd reading; utilities to lot line.'},
        {title:'Bank of Canada rate', note:'Monitoring for cap rate/yield shifts; update quarterly.'}
      ];
      const list = document.getElementById('policyList');
      if(list){
        policyItems.forEach(i=>{
          const li = document.createElement('li');
          const strong = document.createElement('strong');
          strong.textContent = i.title;
          li.append(strong, ` — ${i.note}`);
          list.appendChild(li);
        });
      }

      // NDA gating (demo code — replace with real VDR)
      const ndaBtn = document.getElementById('openNDA');
      const ndaModal = document.getElementById('ndaModal');
      const unlock = document.getElementById('unlockNDA');
      ndaBtn&&ndaBtn.addEventListener('click',()=>{ ndaModal.showModal(); trapFocus(ndaModal); });
      unlock&&unlock.addEventListener('click',(e)=>{
        e.preventDefault();
        const code = (document.getElementById('ndaCode')||{}).value || '';
        const ok = code.trim() === 'DEMO2024';
        document.getElementById('ndaError').style.display = ok ? 'none':'block';
        const links = document.getElementById('dataLinks');
        if(ok){ links.style.display='block'; }
      });

      // ===== Auto‑qualify quiz =====
      const form = document.getElementById('intentForm');
      const ctas = document.getElementById('intentCtas');
      const note = document.getElementById('intentNext');
      const ctOwner = document.getElementById('ctOwner');
      const ctInvestor = document.getElementById('ctInvestor');
      const ctDeveloper = document.getElementById('ctDeveloper');
      const intentHidden = document.getElementById('intentHidden');
      const gcIntent = document.getElementById('gcIntent');
      const ownerTour = document.getElementById('ownerTour');
      const ndaFromQuiz = document.getElementById('openNDAFromQuiz');
      function showIntent(v){
        if(!v) return;
        safeStorage.set('intent', v);
        if(intentHidden) intentHidden.value = v;
        if(gcIntent) gcIntent.value = v;
        ctas.style.display = 'block';
        ctOwner.hidden = v!=='owner';
        ctInvestor.hidden = v!=='investor';
        ctDeveloper.hidden = v!=='developer';
        note.textContent = v==='owner' ? 'Great — let’s book a tour or browse owner‑user listings.' : v==='investor' ? 'Perfect — request comps or run quick returns.' : 'Let’s line up a site review or open the data room.';
        if(ownerTour){ ownerTour.href = 'mailto:ishwinderghag@gmail.com?subject=' + encodeURIComponent(`${v==='owner'?'Owner‑User':'General'} Tour Request`) + '&body=' + encodeURIComponent('Hi Ishwinder,

I am an ' + v + ' interested in touring...'); }
      }
      if(form){
        form.addEventListener('change', (e)=>{ if(e.target && e.target.name==='intent'){ showIntent(e.target.value); } });
        // preload saved
        const saved = safeStorage.get('intent');
        if(saved){ const el=form.querySelector(`input[value="${saved}"]`); if(el){ el.checked=true; showIntent(saved);} }
      }
      ndaFromQuiz&&ndaFromQuiz.addEventListener('click',()=>{ const m=document.getElementById('ndaModal'); if(m){ m.showModal(); trapFocus(m); } });

      // ===== Land‑Assembly Split Tool =====
      const laTotal = document.getElementById('laTotal');
      const laCount = document.getElementById('laCount');
      const laShares = document.getElementById('laShares');
      const laTable = document.getElementById('laTable');
      const laCopy = document.getElementById('laCopy');
      if(laCopy && !navigator.clipboard){ laCopy.style.display='none'; }
      function renderShareInputs(n){
        const method = (document.querySelector('input[name="laMethod"]:checked')||{}).value || 'equal';
        clear(laShares);
        if(method==='share'){
          const wrap = document.createElement('div');
          wrap.className='grid';
          for(let i=1;i<=n;i++){
            const p=document.createElement('p');
            p.className='col-4';
            const label=document.createElement('label');
            label.textContent=sanitize(`Share #${i}`);
            const input=document.createElement('input');
            input.type='number';
            input.step='0.01';
            input.value='1';
            input.id='laS'+i;
            attachNumericSanitizer(input);
            p.appendChild(label);
            p.appendChild(input);
            wrap.appendChild(p);
          }
          laShares.appendChild(wrap);
          const hint=document.createElement('p');
          hint.className='small';
          hint.textContent='Enter frontage/area weights (any units). Amounts are proportional to these shares.';
          laShares.appendChild(hint);
        }
      }
      function currency(x){ return '$' + (x||0).toLocaleString(undefined,{maximumFractionDigits:0}); }
      function laCalc(){
        const total = parseNum(laTotal.value);
        const n = Math.max(1, parseInt(parseNum(laCount.value)||1,10));
        const method = (document.querySelector('input[name="laMethod"]:checked')||{}).value || 'equal';
        let shares = new Array(n).fill(1);
        if(method==='share'){
          shares = shares.map((_,i)=>parseNum((document.getElementById('laS'+(i+1))||{}).value));
          const sum = shares.reduce((a,b)=>a+b,0)||1; shares = shares.map(s=>s/sum);
        }else{ shares = shares.map(()=>1/n); }
        clear(laTable);
        const table=document.createElement('table');
        table.style.width='100%';
        table.style.borderCollapse='collapse';
        const thead=document.createElement('thead');
        const headRow=document.createElement('tr');
        ['Owner','Share','Amount'].forEach((h,idx)=>{
          const th=document.createElement('th');
          th.style.textAlign=idx===2?'right':'left';
          th.textContent=sanitize(h);
          headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);
        const tbody=document.createElement('tbody');
        shares.forEach((s,i)=>{
          const amt = total*s;
          const tr=document.createElement('tr');
          const tdOwner=document.createElement('td');
          tdOwner.textContent=sanitize(`Owner ${i+1}`);
          const tdShare=document.createElement('td');
          tdShare.textContent=sanitize(`${(s*100).toFixed(2)}%`);
          const tdAmount=document.createElement('td');
          tdAmount.style.textAlign='right';
          tdAmount.textContent=sanitize(currency(amt));
          tr.appendChild(tdOwner);
          tr.appendChild(tdShare);
          tr.appendChild(tdAmount);
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        laTable.appendChild(table);
      }
      attachNumericSanitizer(laTotal);
      attachNumericSanitizer(laCount);
      if(laCount){ laCount.addEventListener('input',()=>{ renderShareInputs(Math.max(1,parseInt(parseNum(laCount.value)||1,10))); laCalc(); }); }
      document.querySelectorAll('input[name="laMethod"]').forEach(r=>r.addEventListener('change',()=>{ renderShareInputs(Math.max(1,parseInt(parseNum(laCount.value)||1,10))); laCalc(); }));
      laTotal&&laTotal.addEventListener('input',laCalc);
      laShares.addEventListener('input', (e)=>{ if(e.target && e.target.tagName==='INPUT') laCalc(); });
      laCopy&&laCopy.addEventListener('click',()=>{
        const txt = laTable.textContent||'';
        safeClipboard.write(txt).then(()=>{ laCopy.textContent='Copied!'; setTimeout(()=>laCopy.textContent='Copy summary',1200); }).catch(()=>{});
      });
      // init
      if(laCount){ renderShareInputs(parseInt(laCount.value,10)); laCalc(); }

      // ===== Strata vs Lease =====
      const svlSize=document.getElementById('svlSize');
      const svlPrice=document.getElementById('svlPrice');
      const svlDown=document.getElementById('svlDown');
      const svlRate=document.getElementById('svlRate');
      const svlAmort=document.getElementById('svlAmort');
      const svlStrata=document.getElementById('svlStrata');
      const svlTax=document.getElementById('svlTax');
      const svlNet=document.getElementById('svlNet');
      const svlOp=document.getElementById('svlOp');
      const svlOut=document.getElementById('svlOut');
      [svlSize,svlPrice,svlDown,svlRate,svlAmort,svlStrata,svlTax,svlNet,svlOp].forEach(attachNumericSanitizer);
      function payment(P,r,years){ const i=r/12; const n=years*12; return (i>0)? P * (i*Math.pow(1+i,n))/(Math.pow(1+i,n)-1):(P/n); }
      function svl(){
        const size=parseNum(svlSize.value);
        const price=parseNum(svlPrice.value);
        const down=parseNum(svlDown.value);
        const rate=parseNum(svlRate.value)/100;
        const years=parseNum(svlAmort.value)||25;
        const strata=parseNum(svlStrata.value);
        const taxA=parseNum(svlTax.value);
        const net=parseNum(svlNet.value);
        const op=parseNum(svlOp.value);
        const loan = price * (1 - down/100);
        const monthlyBuy = payment(loan, rate, years) + strata + (taxA/12);
        const monthlyLease = (size * (net+op)) / 12;
        const diff = monthlyBuy - monthlyLease;
        svlOut.textContent = sanitize(`Own: ${currency(monthlyBuy)} /mo • Lease: ${currency(monthlyLease)} /mo • Diff: ${diff>=0?'+':''}${currency(diff)} per month`);
      }
      [svlSize,svlPrice,svlDown,svlRate,svlAmort,svlStrata,svlTax,svlNet,svlOp].forEach(el=>el&&el.addEventListener('input',svl));
      svl();

      // ===== Yield on Cost =====
      const yNoi=document.getElementById('yocNoi');
      const yCost=document.getElementById('yocCost');
      const yTarget=document.getElementById('yocTarget');
      const yOut=document.getElementById('yocOut');
      function yoc(){
        const noi=+yNoi.value||0; const cost=+yCost.value||0; const tgt=(+yTarget.value||0)/100; if(noi>0 && cost>0){ const y=noi/cost; const bp=((y - tgt)*10000); yOut.textContent = `YoC: ${(y*100).toFixed(2)}% (${bp>=0?'+':''}${bp.toFixed(0)} bps vs target)`; } else { yOut.textContent='YoC: —'; }
      }
      [yNoi,yCost,yTarget].forEach(el=>el&&el.addEventListener('input',yoc));
      yoc();
    })();

    // Contact form submission
    (()=>{
      const form = document.getElementById('contactForm');
      const result = document.getElementById('contactResult');
      if(!form) return;
      form.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        result.textContent = 'Sending…';
        try {
          const endpoint = new URL('/.netlify/functions/contact', window.location.origin);
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          const json = await res.json();
          if(json.success){
            result.textContent = 'Message sent successfully.';
            form.reset();
          }else{
            throw new Error(json.error||'Error');
          }
        } catch(err){
          result.textContent = 'Unable to send — ';
          const link = document.createElement('a');
          link.href = 'mailto:ishwinderghag@gmail.com';
          link.textContent = 'email me instead';
          result.append(link, '.');
        }
      });
    })();


/*! testimonials.js — inject testimonials grid */
(function(){
  const testimonials = [
    {
      quote: 'Ishwinder navigated a complex land assembly for us and brought qualified developers to the table faster than expected.',
      name: 'Paramjit S.',
      role: 'Director, Fraser Valley Holdings'
    },
    {
      quote: 'From underwriting to tours, his industrial disposition process was buttoned up and delivered the certainty our vendors needed.',
      name: 'Melanie R.',
      role: 'Asset Manager, Metro Vancouver Industrial REIT'
    },
    {
      quote: 'He translated municipal policy into a clear path forward and kept our stakeholders aligned through every milestone.',
      name: 'Daniel K.',
      role: 'Principal, North Shore Development Group'
    }
  ];

  function createCard({ quote, name, role }){
    const card = document.createElement('article');
    card.className = 'card col-4 fade-up testimonial-card';

    const body = document.createElement('div');
    body.className = 'card-body';

    const quoteEl = document.createElement('p');
    quoteEl.className = 'testimonial-quote';
    quoteEl.textContent = quote;

    const author = document.createElement('div');
    author.className = 'testimonial-author';

    const nameEl = document.createElement('span');
    nameEl.className = 'testimonial-name';
    nameEl.textContent = name;

    const roleEl = document.createElement('span');
    roleEl.className = 'small testimonial-role';
    roleEl.textContent = role;

    author.append(nameEl, roleEl);
    body.append(quoteEl, author);
    card.append(body);

    return card;
  }

  function buildSection(section){
    const container = document.createElement('div');
    container.className = 'container';

    const title = document.createElement('div');
    title.className = 'section-title';

    const heading = document.createElement('h2');
    heading.textContent = 'Testimonials';
    title.appendChild(heading);

    const subhead = document.createElement('div');
    subhead.className = 'small testimonial-subhead';
    subhead.textContent = 'What clients and partners say.';
    title.appendChild(subhead);

    const grid = document.createElement('div');
    grid.className = 'grid testimonials-grid';

    testimonials.forEach((item) => {
      grid.appendChild(createCard(item));
    });

    container.append(title, grid);
    section.appendChild(container);
    section.dataset.enhanced = 'true';
  }

  function initTestimonials(){
    const section = document.getElementById('testimonials');
    if(!section || section.dataset.enhanced === 'true') return;
    buildSection(section);
  }

  window.initTestimonials = initTestimonials;
})();

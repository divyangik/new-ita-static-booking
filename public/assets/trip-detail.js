(() => {
  const select = (selector, root = document) => root.querySelector(selector);
  const selectAll = (selector, root = document) => [...root.querySelectorAll(selector)];

  const highlightLinks = (links, rootMargin) => {
    const targets = links.map(link => select(link.getAttribute('href'))).filter(Boolean);
    if (!targets.length) return null;
    const visible = new Set();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      const current = targets.find(target => visible.has(target));
      links.forEach(link => link.classList.toggle('on', !!current && link.getAttribute('href') === '#' + current.id));
    }, { rootMargin });
    targets.forEach(target => observer.observe(target));
    return observer;
  };
  const sectionObserver = highlightLinks(selectAll('.td-subnav-links a'), '-45% 0px -50% 0px');
  const dayObserver = highlightLinks(selectAll('.td-days-nav a'), '-40% 0px -55% 0px');

  selectAll('.td-subnav-links a').forEach(link => link.addEventListener('focus', () => link.scrollIntoView({ block: 'nearest', inline: 'nearest' })));

  const mobar = select('.td-mobar');
  const hero = select('.td-hero');
  const reserve = select('#inquiry');
  let mobarObserver;
  if (mobar && hero && reserve) {
    const state = { hero: true, reserve: false };
    mobarObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { state[entry.target === hero ? 'hero' : 'reserve'] = entry.isIntersecting; });
      mobar.classList.toggle('on', !state.hero && !state.reserve);
    });
    mobarObserver.observe(hero);
    mobarObserver.observe(reserve);
  }

  const lightbox = select('.td-lightbox');
  const shots = selectAll('.td-shot');
  if (lightbox && shots.length && typeof lightbox.showModal === 'function') {
    const image = select('img', lightbox);
    const caption = select('figcaption', lightbox);
    let index = 0;
    let returnFocus;
    const show = next => {
      index = (next + shots.length) % shots.length;
      const shot = shots[index];
      image.src = `/.netlify/images?url=${encodeURIComponent(shot.dataset.full)}&w=1800&q=82`;
      image.alt = select('img', shot).alt;
      caption.textContent = `${shot.dataset.caption} · ${index + 1} / ${shots.length}`;
    };
    shots.forEach((shot, shotIndex) => shot.addEventListener('click', () => {
      returnFocus = shot;
      show(shotIndex);
      lightbox.showModal();
    }));
    select('.td-lb-x', lightbox).addEventListener('click', () => lightbox.close());
    select('.td-lb-nav.prev', lightbox).addEventListener('click', () => show(index - 1));
    select('.td-lb-nav.next', lightbox).addEventListener('click', () => show(index + 1));
    lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
    lightbox.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') show(index - 1);
      if (event.key === 'ArrowRight') show(index + 1);
    });
    lightbox.addEventListener('close', () => returnFocus?.focus());
  } else shots.forEach(shot => shot.addEventListener('click', () => window.open(shot.dataset.full, '_blank', 'noopener')));

  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    sectionObserver?.disconnect();
    dayObserver?.disconnect();
    mobarObserver?.disconnect();
  }, { once: true });
})();

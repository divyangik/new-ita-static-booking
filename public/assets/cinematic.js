(() => {
  document.documentElement.classList.remove('motion-pending');
  const select = (selector, root = document) => root.querySelector(selector);
  const selectAll = (selector, root = document) => [...root.querySelectorAll(selector)];
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const burger = select('.burger');
  const drawer = select('.drawer');
  let menuReturnFocus;
  const synchronizeMenu = () => {
    const open = document.body.classList.contains('menu');
    burger?.setAttribute('aria-expanded', String(open));
    burger?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (drawer) drawer.inert = !open;
    ['main', '.ftr', '.hdr .cta', '.hdr .logo', '.hdr .nav', '.fab'].forEach(selector => {
      const element = select(selector);
      if (element) element.inert = open;
    });
    if (open) {
      menuReturnFocus = document.activeElement;
      select('a', drawer)?.focus();
    } else if (drawer?.contains(document.activeElement)) {
      (menuReturnFocus || burger)?.focus();
    }
  };
  const menuObserver = new MutationObserver(synchronizeMenu);
  menuObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const keyboardHandler = event => {
    if (document.body.classList.contains('menu')) {
      if (event.key === 'Escape') document.body.classList.remove('menu');
      if (event.key === 'Tab') {
        const elements = [burger, ...selectAll('a, button', drawer)].filter(Boolean);
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    const modal = select('#modal.open');
    if (event.key === 'Tab' && modal) { event.preventDefault(); select('.x', modal)?.focus(); }
  };
  document.addEventListener('keydown', keyboardHandler);
  const modal = select('#modal');
  if (modal) { modal.inert = true; modal.setAttribute('aria-hidden', 'true'); }
  let modalReturnFocus;
  const modalObserver = modal ? new MutationObserver(() => {
    if (modal.classList.contains('open')) {
      modalReturnFocus = document.activeElement;
      modal.inert = false;
      modal.setAttribute('aria-hidden', 'false');
      select('.x', modal)?.focus();
      document.body.style.overflow = 'hidden';
      select('main').inert = true;
      select('.hdr').inert = true;
      select('.ftr').inert = true;
    } else {
      modal.inert = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      select('main').inert = false;
      select('.hdr').inert = false;
      select('.ftr').inert = false;
      modalReturnFocus?.focus();
    }
  }) : null;
  modalObserver?.observe(modal, { attributes: true, attributeFilter: ['class'] });
  selectAll('.field input[name="phone"]').forEach(input => { input.type = 'tel'; input.autocomplete = 'tel'; });
  selectAll('.field input[name="name"]').forEach(input => input.autocomplete = 'name');
  selectAll('.field input[name="email"]').forEach(input => input.autocomplete = 'email');
  selectAll('.ctl > .lbl').forEach(label => {
    const group = label.nextElementSibling;
    if (group) { group.setAttribute('role', 'group'); group.setAttribute('aria-label', label.textContent); }
  });
  selectAll('.seg').forEach(group => {
    const synchronize = () => selectAll('button', group).forEach(button => button.setAttribute('aria-pressed', String(button.classList.contains('on'))));
    synchronize();
    group.addEventListener('click', synchronize);
  });
  const miniRange = select('#m-pax');
  if (miniRange) { miniRange.setAttribute('aria-label', 'Number of travelers'); miniRange.addEventListener('input', () => miniRange.setAttribute('aria-valuetext', `${miniRange.value} travelers`)); }

  let destinationTrigger;
  let collectionTrigger;
  let sceneIndex = 0;
  let collectionIndex = 0;
  const scenes = selectAll('.destination-scene');
  const collectionImages = selectAll('.collection-image');
  if (!window.gsap || !window.ScrollTrigger) {
    selectAll('[data-destination]').forEach(button => button.addEventListener('click', () => switchScene(+button.dataset.destination)));
    selectAll('[data-collection]').forEach(button => button.addEventListener('click', () => switchCollection(+button.dataset.collection)));
    return;
  }
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  function updateSceneAccessibility(index) {
    sceneIndex = index;
    scenes.forEach((scene, position) => {
      const active = position === index;
      scene.classList.toggle('is-active', active);
      scene.setAttribute('aria-hidden', String(!active));
      scene.inert = !active;
    });
    selectAll('[data-destination]').forEach(button => button.setAttribute('aria-pressed', String(+button.dataset.destination === index)));
  }
  function switchScene(index) {
    if (destinationTrigger && !motionPreference.matches) {
      window.scrollTo({ top: destinationTrigger.start + (destinationTrigger.end - destinationTrigger.start) * [0.02, 0.5, 0.98][index], behavior: 'smooth' });
      return;
    }
    updateSceneAccessibility(index);
    if (window.gsap && window.ScrollTrigger && !motionPreference.matches) {
      gsap.to(scenes, { autoAlpha: position => position === index ? 1 : 0, duration: .7, overwrite: true });
      gsap.fromTo(select('.destination-image', scenes[index]), { scale: 1.06 }, { scale: 1, duration: 1.5, overwrite: true });
      gsap.fromTo(select('.destination-copy', scenes[index]), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .8, overwrite: true });
      gsap.to('.route-progress span', { scaleX: index / 2, duration: .7 });
    } else scenes.forEach((scene, position) => { scene.style.opacity = position === index ? '1' : '0'; scene.style.visibility = position === index ? 'visible' : 'hidden'; });
  }
  function updateCollectionAccessibility(index) {
    collectionIndex = index;
    collectionImages.forEach((image, position) => { image.classList.toggle('is-active', index === position); image.setAttribute('aria-hidden', String(index !== position)); });
    selectAll('[data-collection]').forEach(button => button.setAttribute('aria-pressed', String(+button.dataset.collection === index)));
  }
  function switchCollection(index) {
    if (collectionTrigger && !motionPreference.matches) {
      window.scrollTo({ top: collectionTrigger.start + (collectionTrigger.end - collectionTrigger.start) * (index ? .94 : .02), behavior: 'smooth' });
      return;
    }
    updateCollectionAccessibility(index);
    if (window.gsap && window.ScrollTrigger && !motionPreference.matches) {
      gsap.to(collectionImages, { autoAlpha: position => position === index ? 1 : 0, duration: .8, overwrite: true });
      gsap.fromTo(select('img', collectionImages[index]), { scale: 1.05 }, { scale: 1, duration: 1.6, overwrite: true });
    } else collectionImages.forEach((image, position) => { image.style.opacity = position === index ? '1' : '0'; image.style.visibility = position === index ? 'visible' : 'hidden'; });
  }
  selectAll('[data-destination]').forEach(button => button.addEventListener('click', () => switchScene(+button.dataset.destination)));
  selectAll('[data-collection]').forEach(button => button.addEventListener('click', () => switchCollection(+button.dataset.collection)));

  const splitHeading = heading => {
    if (heading.querySelector('.word')) return;
    const walk = node => [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(word => {
          if (/^\s*$/.test(word)) { fragment.append(word); return; }
          const mask = document.createElement('span');
          mask.className = 'word';
          const text = document.createElement('span');
          text.textContent = word;
          mask.append(text);
          fragment.append(mask);
        });
        child.replaceWith(fragment);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') walk(child);
    });
    walk(heading);
  };
  selectAll('.h2, .architecture-copy h2, .collection-copy h2, .cta-big h2').forEach(splitHeading);
  const media = gsap.matchMedia();
  media.add({ desktop: '(min-width: 1024px)', mobile: '(max-width: 1023px)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
    const { desktop, reduced } = context.conditions;
    destinationTrigger = null;
    collectionTrigger = null;
    if (reduced) {
      updateSceneAccessibility(sceneIndex);
      updateCollectionAccessibility(collectionIndex);
      return;
    }
    const entrance = (target, values, trigger = target) => gsap.from(target, { ...values, scrollTrigger: { trigger, start: 'top 88%', once: true } });
    const headingReveal = heading => entrance(selectAll('.word > span', heading), { yPercent: 115, stagger: .035, duration: 1.1, ease: 'power3.out' }, heading);
    selectAll('.h2, .architecture-copy h2, .collection-copy h2, .cta-big h2').forEach(headingReveal);
    const hero = select('.hero');
    if (hero) {
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro.from('.hero-eyebrow', { opacity: 0, y: 12, duration: .9 }, .15)
        .from('.hero h1 .word > span', { yPercent: 110, stagger: .065, duration: 1.25 }, .35)
        .from('.hero .lead', { opacity: 0, y: 20, duration: 1 }, .95)
        .from('.hero .actions > a', { opacity: 0, y: 20, stagger: .12, duration: .8 }, 1.2)
        .from('.hero .tags, .hero-bottom', { opacity: 0, duration: 1 }, 1.65)
        .from('.earth-visual', { opacity: 0, scale: .92, duration: 2.1, ease: 'power2.out' }, .2)
        .from('.hero-orbits', { opacity: 0, rotation: -40, duration: 2 }, .55);
      if (desktop) {
        gsap.to('.earth-visual', { y: 120, scale: 1.15, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 } });
        gsap.to('.hero .wrap', { y: -65, opacity: .15, ease: 'none', scrollTrigger: { trigger: hero, start: '15% top', end: 'bottom top', scrub: 1 } });
      }
    }
    if (select('.marquee')) gsap.to('.marquee .track', { x: -350, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: 1 } });
    selectAll('.div').forEach((card, index) => {
      entrance(card, { y: 50, duration: 1.1, delay: index % 2 * .12, ease: 'power3.out' });
      entrance(select('img', card), { clipPath: 'inset(0 0 100% 0)', scale: 1.12, duration: 1.5, ease: 'power3.inOut' }, card);
    });
    if (scenes.length && desktop) {
      updateSceneAccessibility(0);
      gsap.set(scenes, { autoAlpha: 0, clipPath: 'none' });
      gsap.set(scenes[0], { autoAlpha: 1 });
      const timeline = gsap.timeline({ scrollTrigger: { trigger: '.destination-stage', start: 'top top', end: '+=190%', pin: true, scrub: .8, anticipatePin: 1, invalidateOnRefresh: true, onUpdate: self => {
        const next = self.progress < .32 ? 0 : self.progress < .69 ? 1 : 2;
        if (next !== sceneIndex) updateSceneAccessibility(next);
      } } });
      scenes.forEach((scene, index) => {
        timeline.fromTo(select('.destination-image', scene), { scale: 1.1 }, { scale: 1, duration: 1.05, ease: 'none' }, index * .95);
        if (index) {
          const position = index * .95 - .3;
          timeline.fromTo(scene, { autoAlpha: 0, clipPath: 'circle(5% at 72% 45%)' }, { autoAlpha: 1, clipPath: 'circle(150% at 72% 45%)', duration: .55, ease: 'power2.inOut' }, position)
            .to(scenes[index - 1], { autoAlpha: 0, duration: .4 }, position + .2)
            .fromTo(selectAll('.destination-copy > *', scene), { y: 35, opacity: 0 }, { y: 0, opacity: 1, stagger: .07, duration: .35 }, position + .25);
        }
      });
      timeline.fromTo('.route-progress span', { scaleX: 0 }, { scaleX: 1, duration: timeline.duration(), ease: 'none' }, 0);
      destinationTrigger = timeline.scrollTrigger;
    } else if (scenes.length) {
      updateSceneAccessibility(sceneIndex);
      entrance('.destination-stage', { clipPath: 'inset(10% 5% 10% 5%)', duration: 1.1, ease: 'power2.out' });
    }
    selectAll('.architecture-section').forEach(section => {
      entrance(select('.property-frame', section), { clipPath: 'inset(0 0 100% 0)', duration: 1.4, ease: 'power3.inOut' }, section);
      entrance(select('.property-detail', section), { y: 60, opacity: 0, duration: 1.2, delay: .3 }, section);
      entrance(select('.property-caption', section), { y: 15, opacity: 0, duration: .8, delay: .4 }, section);
      const architecturalPath = select('.architecture-lines path', section);
      const pathLength = architecturalPath.getTotalLength();
      gsap.fromTo(architecturalPath, { strokeDasharray: pathLength, strokeDashoffset: pathLength }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: section, start: 'top 80%', end: 'bottom 30%', scrub: 1.2 } });
      if (desktop) gsap.fromTo(select('.property-frame img', section), { scale: 1.18, yPercent: -5 }, { scale: 1.12, yPercent: 5, ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 1 } });
    });
    if (collectionImages.length) {
      updateCollectionAccessibility(0);
      entrance('.gold-rule', { scaleX: 0, duration: 1.5, ease: 'power2.inOut' }, '.collection-section');
      if (desktop) {
        gsap.set(collectionImages, { autoAlpha: 0 });
        gsap.set(collectionImages[0], { autoAlpha: 1 });
        const timeline = gsap.timeline({ scrollTrigger: { trigger: '.collection-stage', start: 'top top', end: '+=100%', pin: true, scrub: .9, anticipatePin: 1, onUpdate: self => {
          const next = self.progress > .55 ? 1 : 0;
          if (next !== collectionIndex) updateCollectionAccessibility(next);
        } } });
        timeline.fromTo(select('img', collectionImages[0]), { scale: 1.12 }, { scale: 1, duration: 1, ease: 'none' }, 0)
          .fromTo(collectionImages[1], { autoAlpha: 0, clipPath: 'inset(100% 0 0 0)' }, { autoAlpha: 1, clipPath: 'inset(0% 0 0 0)', duration: .4, ease: 'power2.inOut' }, .35)
          .fromTo(select('img', collectionImages[1]), { scale: 1.12 }, { scale: 1, duration: .65, ease: 'none' }, .35);
        collectionTrigger = timeline.scrollTrigger;
      } else entrance('.collection-visual', { clipPath: 'inset(0 0 100% 0)', duration: 1.4, ease: 'power3.inOut' }, '.collection-visual');
    }
    selectAll('.stat').forEach((stat, index) => entrance(stat, { y: 30, opacity: 0, duration: .8, delay: index * .12 }, stat.parentElement));
    selectAll('.impact-orbit path').forEach(path => {
      const length = path.getTotalLength();
      gsap.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, scrollTrigger: { trigger: path.closest('section'), start: 'top 90%', end: 'bottom 40%', scrub: 1 } });
    });
    selectAll('.step').forEach((step, index) => entrance(step, { y: 35, opacity: 0, duration: .9, delay: index * .13 }, step.parentElement));
    selectAll('.rail').forEach(rail => {
      entrance(selectAll('.trip', rail), { x: desktop ? 65 : 20, y: 25, opacity: 0, stagger: .09, duration: 1.1, ease: 'power3.out' }, rail);
    });
    selectAll('.mini, .calc-in, .calc-out').forEach(panel => {
      entrance(panel, { y: 65, rotationX: desktop ? 6 : 0, transformPerspective: 1000, opacity: 0, duration: 1.2, ease: 'power3.out' }, panel);
      entrance(selectAll('.ctl', panel), { y: 16, opacity: 0, stagger: .06, duration: .8 }, panel);
    });
    selectAll('.member').forEach((member, index) => {
      entrance(select('.ph', member), { clipPath: 'inset(0 0 100% 0)', duration: 1.15, ease: 'power3.inOut' }, member);
      entrance(selectAll('h4, p', member), { y: 20, opacity: 0, stagger: .12, duration: .85, delay: .2 }, member);
      if (desktop) gsap.fromTo(select('.ph img', member), { scale: 1.12, yPercent: -3 }, { yPercent: 3, scale: 1.08, ease: 'none', scrollTrigger: { trigger: member, start: 'top bottom', end: 'bottom top', scrub: 1.3 } });
    });
    selectAll('.review').forEach((review, index) => {
      entrance(review, { x: index % 2 ? 40 : -40, opacity: 0, duration: 1.2, ease: 'power3.out' }, review);
      entrance(selectAll('.stars, q, .who', review), { y: 20, opacity: 0, stagger: .17, duration: .9 }, review);
    });
    selectAll('[data-chapter="business"] .card, .partner').forEach((card, index) => entrance(card, { clipPath: 'inset(0 100% 0 0)', duration: 1.2, delay: index * .08, ease: 'power3.inOut' }, card));
    selectAll('.contact-grid .form').forEach(form => {
      entrance(form, { y: 45, opacity: 0, duration: 1.3 }, form);
      entrance(selectAll('.field', form), { y: 15, opacity: 0, stagger: .05, duration: .7 }, form);
    });
    if (select('#inquiry')) gsap.fromTo('#inquiry', { '--inquiry-line': 0 }, { '--inquiry-line': 1, duration: 1.6, ease: 'power2.inOut', scrollTrigger: { trigger: '#inquiry', start: 'top 88%', once: true } });
    gsap.fromTo('.ftr .top', { '--footer-rule': 0 }, { '--footer-rule': 1, duration: 1.8, ease: 'power2.inOut', scrollTrigger: { trigger: '.ftr', start: 'top 85%', once: true } });
    entrance('.ftr .top > div', { y: 30, opacity: 0, stagger: .12, duration: 1 }, '.ftr');
    entrance('.ftr .giant', { yPercent: 20, opacity: 0, duration: 1.3 }, '.ftr .giant');
    selectAll('body[data-page] .sec').forEach(section => {
      if (section.querySelector('.member, .trip, .mini, .calc, .review, .contact-grid, .stat, .step')) return;
      entrance(selectAll('.rv', section).filter(element => !element.matches('.h2') && !element.closest('.h2')), { y: 22, opacity: 0, stagger: .04, duration: .9 }, section);
    });
    return () => { destinationTrigger = null; collectionTrigger = null; };
  });
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', refresh, { once: true });
  document.fonts?.ready.then(refresh);
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    media.revert();
    menuObserver.disconnect();
    modalObserver?.disconnect();
    document.removeEventListener('keydown', keyboardHandler);
    window.removeEventListener('load', refresh);
  }, { once: true });
})();

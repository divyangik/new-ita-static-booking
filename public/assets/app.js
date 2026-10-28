/* ITA Global — interactions */
(() => {
const WA = '12132936422';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = n => '$' + Math.round(n).toLocaleString('en-US');
const waLink = msg => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
window.ITA = { waLink, fmt };

/* ---------- header ---------- */
const hdr = $('.hdr');
const darkTop = document.body.dataset.top !== 'light';
let lastY = 0;
const onScroll = () => {
  const y = scrollY;
  hdr.classList.toggle('solid', y > 40 || !darkTop);
  hdr.classList.toggle('hide', y > 500 && y > lastY && !document.body.classList.contains('menu'));
  lastY = y;
};
addEventListener('scroll', onScroll, { passive: true }); onScroll();
$('.burger')?.addEventListener('click', () => document.body.classList.toggle('menu'));
$$('.drawer a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu')));

/* ---------- WhatsApp links ---------- */
$$('[data-wa]').forEach(a => {
  a.href = waLink(a.dataset.wa || "Hi ITA Global! I'd like to plan a journey.");
  a.target = '_blank'; a.rel = 'noopener';
});
const fab = $('.fab');
if (fab) setTimeout(() => { fab.classList.add('show-tip'); setTimeout(() => fab.classList.remove('show-tip'), 5000); }, 4000);

/* ---------- split headline words ---------- */
$$('[data-split]').forEach(el => {
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(w => {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.append(' '); return; }
          const o = document.createElement('span'); o.className = 'word';
          const i = document.createElement('span'); i.textContent = w; o.append(i); frag.append(o);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
  };
  walk(el);
  $$('.word>span', el).forEach((s, i) => s.style.transitionDelay = (0.1 + i * 0.06) + 's');
});
requestAnimationFrame(() => setTimeout(() => document.body.classList.add('ready'), 60));

/* ---------- reveal + counters ---------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in'); io.unobserve(e.target);
  if (e.target.matches('[data-count]')) count(e.target);
}), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
const observe = root => $$('.rv,.clip,[data-count]', root).forEach(el => io.observe(el));
observe(document);
function count(el) {
  const to = +el.dataset.count, dur = 1800, t0 = performance.now(), pre = el.dataset.pre || '';
  const sup = el.querySelector('sup')?.outerHTML || '';
  if (reducedMotion.matches) { el.innerHTML = pre + to.toLocaleString('en-US') + sup; return; }
  const step = t => {
    const p = Math.min(1, (t - t0) / dur), v = to * (1 - Math.pow(1 - p, 4));
    el.innerHTML = pre + Math.round(v).toLocaleString('en-US') + sup;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* scroll-lit words in band */
$$('.band[data-lit]').forEach(b => {
  const words = [];
  const walk = node => [...node.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      const f = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(w => {
        if (/^\s*$/.test(w)) { f.append(w); return; }
        const s = document.createElement('span'); s.className = 'dim'; s.textContent = w; words.push(s); f.append(s);
      });
      n.replaceWith(f);
    } else if (n.nodeType === 1) walk(n);
  });
  walk(b);
  const lit = () => {
    if (reducedMotion.matches) { words.forEach(word => word.style.opacity = 1); return; }
    const r = b.getBoundingClientRect(), vh = innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
    const k = Math.floor(p * words.length * 1.15);
    words.forEach((w, i) => w.style.opacity = i < k ? 1 : .22);
  };
  addEventListener('scroll', lit, { passive: true }); lit();
});

/* ---------- pixel globe (hero) ---------- */
const cv = $('#globe');
if (cv && window.ITA_LAND) {
  const ctx = cv.getContext('2d');
  const DPR = Math.min(devicePixelRatio || 1, 1.5);
  let W, R, visible = true, rot = -2.1, raf;
  const size = () => { W = cv.clientWidth; cv.width = cv.height = W * DPR; R = W * 0.4; };
  size(); addEventListener('resize', size);
  const col = (lon, lat) => {
    if (lat > 58 && lon > -75 && lon < -10) return '#d9b75a';            // Greenland
    if (lon < -30 && lat > 12) return '#c9606a';                         // North America
    if (lon < -30 && lat <= 12) return lat > 7 ? '#c9606a' : '#8fb878';  // Central / South America
    if (lon >= -30 && lon < 45 && lat > 36) return '#5f9fcf';            // Europe
    if (lon >= -30 && lon < 52 && lat <= 36) return '#d98a5b';           // Africa / Middle East
    if (lon > 110 && lat < -8) return '#7b6aa8';                         // Oceania
    return '#7b83c9';                                                    // Asia
  };
  const P = ITA_LAND.map(([lon, lat]) => {
    const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    return { x: Math.cos(la) * Math.sin(lo), y: -Math.sin(la), z: Math.cos(la) * Math.cos(lo), c: col(lon, lat) };
  });
  // operating hubs: LA, Panama, San Salvador, Managua
  const hubs = [[-117.6, 34.1], [-79.5, 9], [-89.2, 13.7], [-86.3, 12.1]].map(([lon, lat]) => {
    const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    return { x: Math.cos(la) * Math.sin(lo), y: -Math.sin(la), z: Math.cos(la) * Math.cos(lo) };
  });
  const tilt = -0.32, ct = Math.cos(tilt), st = Math.sin(tilt);
  const proj = (p, cr, sr) => {
    let x = p.x * cr - p.z * sr, z = p.x * sr + p.z * cr, y = p.y;
    const y2 = y * ct - z * st, z2 = y * st + z * ct;
    return [x, y2, z2];
  };
  let mx = 0, t0 = performance.now();
  addEventListener('pointermove', e => { mx = (e.clientX / innerWidth - 0.5); }, { passive: true });
  const draw = t => {
    raf = null;
    if (!visible) return;
    rot += 0.0016 + mx * 0.004;
    const c = W / 2 * DPR, r = R * DPR, cr = Math.cos(rot), sr = Math.sin(rot);
    ctx.clearRect(0, 0, cv.width, cv.height);
    // atmosphere
    const g = ctx.createRadialGradient(c, c, r * 0.6, c, c, r * 1.25);
    g.addColorStop(0, 'rgba(60,80,220,.0)'); g.addColorStop(.78, 'rgba(70,90,230,.16)'); g.addColorStop(1, 'rgba(70,90,230,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, r * 1.25, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = DPR; ctx.beginPath(); ctx.arc(c, c, r, 0, 7); ctx.stroke();
    const s = Math.max(2, r * 0.012);
    for (const p of P) {
      const [x, y, z] = proj(p, cr, sr);
      if (z < -0.05) { ctx.globalAlpha = 0.07; ctx.fillStyle = '#9aa3ff'; }
      else { ctx.globalAlpha = 0.35 + z * 0.65; ctx.fillStyle = p.c; }
      const k = z < 0 ? s * 0.6 : s * (0.75 + z * 0.35);
      ctx.fillRect(c + x * r - k / 2, c + y * r - k / 2, k, k);
    }
    // hub pulses
    const ph = ((t - t0) / 1600) % 1;
    hubs.forEach((h, i) => {
      const [x, y, z] = proj(h, cr, sr);
      if (z < 0.05) return;
      const px = c + x * r, py = c + y * r, q = (ph + i * 0.25) % 1;
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, 3.2 * DPR, 0, 7); ctx.fill();
      ctx.globalAlpha = (1 - q) * 0.8; ctx.strokeStyle = '#e3959b'; ctx.lineWidth = 1.5 * DPR;
      ctx.beginPath(); ctx.arc(px, py, (4 + q * 18) * DPR, 0, 7); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(draw);
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(draw); }).observe(cv);
  raf = requestAnimationFrame(draw);
  setTimeout(() => cv.classList.add('on'), 200);
}

/* ---------- flat dot map (regions) ---------- */
const mapc = $('#worldmap');
if (mapc && window.ITA_LAND) {
  const ctx = mapc.getContext('2d'), DPR = Math.min(devicePixelRatio || 1, 2);
  const hubs = [['Southern California', -117.6, 34.1], ['Panama City', -79.5, 9], ['San Salvador', -89.2, 13.7], ['Managua', -86.3, 12.1]];
  const reach = { LA: '#d6b477', EU: '#7696a9', AS: '#aabcb1', AF: '#c9aa70' };
  const regionOf = (lon, lat) => lon < -30 ? 'LA' : (lon < 45 && lat > 36) ? 'EU' : (lon < 52) ? 'AF' : 'AS';
  let t0 = performance.now(), vis = false;
  const draw = t => {
    const W = mapc.clientWidth, H = W * 0.46;
    if (mapc.width !== W * DPR) { mapc.width = W * DPR; mapc.height = H * DPR; }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
    const X = lon => (lon + 170) / 360 * W, Y = lat => (80 - lat) / 140 * H, s = Math.max(2, W / 330);
    for (const [lon, lat] of ITA_LAND) {
      const r = regionOf(lon, lat);
      ctx.globalAlpha = .9; ctx.fillStyle = reach[r];
      ctx.fillRect(X(lon) - s / 2, Y(lat) - s / 2, s, s);
    }
    const q = ((t - t0) / 1800) % 1;
    hubs.forEach(([n, lon, lat], i) => {
      const x = X(lon), y = Y(lat), k = (q + i * .25) % 1;
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 5 + k * 22, 0, 7); ctx.stroke();
    });
    // arcs from Panama to the world
    const from = [X(-79.5), Y(9)];
    [[12.5, 41.9], [-9.1, 38.7], [139.7, 35.7], [31.2, 30], [115.2, -8.4], [100.5, 13.7], [36.8, -3.4], [-74, 4.7]].forEach(([lon, lat], i) => {
      const to = [X(lon), Y(lat)], mxp = (from[0] + to[0]) / 2, myp = Math.min(from[1], to[1]) - Math.abs(to[0] - from[0]) * .22;
      ctx.globalAlpha = .35; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(...from); ctx.quadraticCurveTo(mxp, myp, ...to); ctx.stroke(); ctx.setLineDash([]);
      const p = ((t - t0) / 3200 + i * .13) % 1, u = 1 - p;
      const bx = u * u * from[0] + 2 * u * p * mxp + p * p * to[0], by = u * u * from[1] + 2 * u * p * myp + p * p * to[1];
      ctx.globalAlpha = 1; ctx.fillStyle = '#d6b477'; ctx.beginPath(); ctx.arc(bx, by, 2.6, 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (vis && !reducedMotion.matches) requestAnimationFrame(draw);
  };
  new IntersectionObserver(([e]) => { const was = vis; vis = e.isIntersecting; if (vis && !was) requestAnimationFrame(draw); }).observe(mapc);
  addEventListener('resize', () => requestAnimationFrame(draw));
}

/* ---------- trips ---------- */
const tripPages = {
  'boquete-panama-real-estate-lifestyle-discovery-1': '/trips/boquete-panama-real-estate-lifestyle-discovery',
  'japan-a-journey-through-cultural-depth-timeless-elegance-1': '/trips/japan-a-journey-through-cultural-depth-timeless-elegance'
};
const tripLink = t => tripPages[t.id] ? `href="${tripPages[t.id]}"` : `href="${t.url}" target="_blank" rel="noopener"`;
const tripCard = t => `
  <a class="trip rv" ${tripLink(t)}>
    <div class="ph"><img src="/${t.img}" alt="${t.title.replace(/"/g, '')}" loading="lazy" width="800" height="1000"><span class="badge">${t.region}</span></div>
    <div class="body"><small class="trip-category">${t.cat}</small>
      <h4>${t.title}</h4>
      <div class="meta"><span class="price">${t.cat === 'Day Experience' ? '' : 'from '}<b>${fmt(t.price)}</b>${t.price > 400 ? ' pp' : ''}</span><span class="ar" aria-hidden="true">↗</span></div>
    </div></a>`;
$$('[data-rail]').forEach(el => {
  const f = el.dataset.rail, ids = (el.dataset.ids || '').split(',').filter(Boolean);
  const exclude = el.dataset.exclude;
  let list = ITA_TRIPS.filter(t => (!f || f === 'all' || t.cat === f || t.region === f) && t.id !== exclude);
  if (ids.length) list = ids.map(i => ITA_TRIPS.find(t => t.id.startsWith(i))).filter(Boolean);
  el.innerHTML = list.slice(0, +el.dataset.max || 12).map(tripCard).join('');
  observe(el);
});
$$('[data-rail-nav]').forEach(n => {
  const rail = $(n.dataset.railNav);
  n.querySelectorAll('button').forEach((b, i) => b.addEventListener('click', () => rail.scrollBy({ left: (i ? 1 : -1) * rail.clientWidth * .8, behavior: 'smooth' })));
});
const grid = $('#trip-grid');
if (grid) {
  const st = { region: 'all', cat: new URLSearchParams(location.search).get('cat') || 'all', q: '', sort: 'featured' };
  const mk = (box, key, vals) => {
    box.innerHTML = vals.map(v => `<button type="button" data-v="${v}" class="${st[key] === v ? 'on' : ''}" aria-pressed="${st[key] === v}">${v === 'all' ? 'All' : v}</button>`).join('');
    box.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st[key] = b.dataset.v; $$('button', box).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); }); render(); });
  };
  mk($('#f-region'), 'region', ['all', 'Latin America', 'Caribbean', 'Europe', 'Asia', 'Africa']);
  mk($('#f-cat'), 'cat', ['all', 'Group & Leisure', 'Luxuria', 'Real Estate', 'Incentive', 'Day Experience']);
  $('#f-q').addEventListener('input', e => { st.q = e.target.value.toLowerCase(); render(); });
  $('#f-sort').addEventListener('change', e => { st.sort = e.target.value; render(); });
  function render() {
    let l = ITA_TRIPS.filter(t => (st.region === 'all' || t.region === st.region) && (st.cat === 'all' || t.cat === st.cat) && (!st.q || t.title.toLowerCase().includes(st.q)));
    if (st.sort === 'low') l = [...l].sort((a, b) => a.price - b.price);
    if (st.sort === 'high') l = [...l].sort((a, b) => b.price - a.price);
    grid.innerHTML = l.map(tripCard).join('') || '<p class="muted">No journeys match — tell us what you have in mind and we will design it.</p>';
    $('#f-count').textContent = l.length + (l.length === 1 ? ' journey' : ' journeys');
    observe(grid);
  }
  render();
}

/* ---------- team modal ---------- */
const modal = $('#modal');
if (modal) {
  const close = () => modal.classList.remove('open');
  $$('.member').forEach(m => m.addEventListener('click', () => {
    $('img', modal).src = m.dataset.img; $('h3', modal).textContent = m.dataset.name;
    $('.role', modal).textContent = m.dataset.role; $('p', modal).textContent = m.dataset.bio;
    modal.classList.add('open');
  }));
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('.x')) close(); });
  addEventListener('keydown', e => e.key === 'Escape' && close());
}

/* ---------- FAQ ---------- */
const faqBox = $('#faq-list');
if (faqBox && window.ITA_FAQ) {
  const cats = $('#faq-cats'); let cur = 'all', q = '';
  const total = ITA_FAQ.reduce((a, c) => a + c.items.length, 0);
  cats.innerHTML = `<button class="on" data-c="all">All topics <span>${total}</span></button>` + ITA_FAQ.map(c => `<button data-c="${c.cat}">${c.cat} <span>${c.items.length}</span></button>`).join('');
  cats.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; cur = b.dataset.c; $$('button', cats).forEach(x => x.classList.toggle('on', x === b)); render(); });
  $('#faq-q').addEventListener('input', e => { q = e.target.value.toLowerCase(); render(); });
  const render = () => {
    let h = '', n = 0;
    ITA_FAQ.forEach(c => {
      if (cur !== 'all' && c.cat !== cur) return;
      const it = c.items.filter(i => !q || (i.q + i.a).toLowerCase().includes(q));
      if (!it.length) return; n += it.length;
      h += `<div class="qa-cat">${c.cat}</div>` + it.map(i => `<details class="qa"><summary>${i.q}<i></i></summary><div class="a">${i.a}</div></details>`).join('');
    });
    faqBox.innerHTML = h || '<p class="muted" style="padding:30px 0">No answers found — ask us directly on WhatsApp.</p>';
    $('#faq-n').textContent = n;
  };
  render();
}

/* ---------- forms (Netlify) ---------- */
$$('form[data-netlify]').forEach(f => f.addEventListener('submit', async e => {
  e.preventDefault();
  if (!f.reportValidity()) return;
  const btn = f.querySelector('[type=submit]');
  const originalContent = btn.innerHTML;
  btn.disabled = true; btn.style.opacity = .6; btn.textContent = 'Sending…';
  let error = f.querySelector('.form-error');
  if (error) error.remove();
  f.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(f)).toString() });
    if (!response.ok) throw new Error('Submission unavailable');
    f.classList.add('sent');
    const success = f.nextElementSibling;
    if (success) {
      success.setAttribute('role', 'status');
      success.tabIndex = -1;
      success.focus({ preventScroll: true });
      success.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
    }
  } catch {
    error = document.createElement('p');
    error.className = 'form-error full';
    error.setAttribute('role', 'alert');
    error.textContent = 'Your message has not been sent. Please try again, or contact us directly at travel@itaglobal.com.';
    f.append(error);
  } finally {
    btn.disabled = false; btn.style.opacity = ''; btn.innerHTML = originalContent;
    f.removeAttribute('aria-busy');
  }
}));

/* ---------- range fill ---------- */
const fill = r => r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%');
$$('input[type=range]').forEach(r => { fill(r); r.addEventListener('input', () => fill(r)); });

/* ---------- segmented buttons helper ---------- */
const segVal = seg => $('button.on', seg)?.dataset.v;
$$('.seg').forEach(seg => seg.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  $$('button', seg).forEach(x => x.classList.toggle('on', x === b));
  seg.dispatchEvent(new Event('change', { bubbles: true }));
}));
$$('.tabs').forEach(t => t.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  $$('button', t).forEach(x => x.classList.toggle('on', x === b));
  $$('.pane').forEach(p => p.classList.toggle('on', p.id === b.dataset.pane));
  history.replaceState(null, '', '#' + b.dataset.pane);
}));
const hashPane = location.hash.slice(1);
if (hashPane && $('#' + hashPane + '.pane')) $(`.tabs button[data-pane="${hashPane}"]`)?.click();

/* ---------- calculators ----------
   Base prices = medians of ITA Global's published per-person trip prices by region (≈ 6–8 day programs). */
const BASE = { 'Latin America': 2500, 'Caribbean': 2795, 'Europe': 5495, 'Asia': 5320, 'Africa': 7095 };
const TYPE = { leisure: 1, luxuria: 1.84, realestate: 0.92, incentive: 1.05 };
const tierMul = { essential: 0.86, signature: 1, private: 1.32 };
const nightsMul = n => 0.35 + 0.65 * (n / 6);
const groupDisc = n => n >= 40 ? .10 : n >= 20 ? .08 : n >= 10 ? .05 : 0;
const numberFrames = new WeakMap();
const animNum = (el, v) => {
  cancelAnimationFrame(numberFrames.get(el));
  const from = Number(el.textContent.replace(/[^\d.-]/g, '')) || 0;
  const t0 = performance.now(); el.dataset.v = v;
  if (reducedMotion.matches) { el.textContent = fmt(v); return; }
  const st = t => { const progress = Math.min(1, (t - t0) / 500), eased = 1 - Math.pow(1 - progress, 3); el.textContent = fmt(from + (v - from) * eased); if (progress < 1) numberFrames.set(el, requestAnimationFrame(st)); };
  numberFrames.set(el, requestAnimationFrame(st));
};

/* trip estimator */
const tc = $('#calc-trip');
if (tc) {
  const run = () => {
    const type = segVal($('#t-type', tc)), region = segVal($('#t-region', tc)), tier = segVal($('#t-tier', tc));
    const pax = +$('#t-pax', tc).value, nights = +$('#t-nights', tc).value;
    $('#t-pax-o', tc).textContent = pax + (pax === 1 ? ' traveler' : ' travelers');
    $('#t-nights-o', tc).textContent = nights + ' nights';
    let pp = BASE[region] * TYPE[type] * tierMul[tier] * nightsMul(nights);
    const solo = $('#t-solo', tc).checked && pax === 1 ? pp * 0.22 : 0;
    const disc = groupDisc(pax);
    let core = (pp + solo) * pax * (1 - disc);
    const transfers = $('#t-transfer', tc).checked ? (250 + 200) * Math.ceil(pax / 6) : 0;
    const spec = $('#t-spec', tc).checked ? 500 : 0;
    const ext = $('#t-ext', tc).checked ? 795 * pax : 0;
    const ins = $('#t-ins', tc).checked ? core * 0.06 : 0;
    const total = core + transfers + spec + ext + ins;
    animNum($('#o-total', tc), total);
    $('#o-pp', tc).textContent = fmt(total / pax);
    $('#o-core', tc).textContent = fmt(core);
    $('#o-disc', tc).textContent = disc ? `−${Math.round(disc * 100)}% applied` : 'from 10 travelers';
    $('#o-add', tc).textContent = fmt(transfers + spec + ext + ins);
    $('#o-dep', tc).textContent = fmt(Math.min(total, 1000 * pax));
    const parts = [core, transfers + spec, ext, ins], sum = parts.reduce((a, b) => a + b, 0) || 1;
    $$('.bar i', tc).forEach((b, i) => b.style.flexGrow = Math.max(parts[i] / sum, parts[i] ? .02 : 0));
    const label = { leisure: 'Group & Leisure', luxuria: 'Luxuria private journey', realestate: 'Real Estate Discovery', incentive: 'Corporate Incentive' }[type];
    const msg = `Hi ITA Global! I used your trip estimator:\n• ${label} — ${region}\n• ${pax} traveler(s), ${nights} nights, ${tier} level\n• Estimate: ${fmt(total)} (${fmt(total / pax)} pp)\nCan we talk about the details?`;
    $$('[data-wa-calc]', tc).forEach(a => { a.href = waLink(msg); a.target = '_blank'; });
    const mb = $('#mobar-trip'); if (mb) $('b', mb).textContent = fmt(total);
  };
  tc.addEventListener('input', run); tc.addEventListener('change', run); run();
}

const mobar = $('#mobar-trip');
if (mobar) {
  const out = $('#calc-trip .calc-out'), inp = $('#calc-trip .calc-in');
  const upd = () => { const a = inp.getBoundingClientRect(), b = out.getBoundingClientRect(); mobar.classList.toggle('on', $('#p-trip').classList.contains('on') && a.top < innerHeight * .6 && b.top > innerHeight * .9); };
  addEventListener('scroll', upd, { passive: true }); document.addEventListener('click', () => setTimeout(upd, 50)); upd();
  mobar.addEventListener('click', () => out.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}
/* real estate fee */
const rc = $('#calc-re');
if (rc) {
  const run = () => {
    const price = +$('#r-price', rc).value, pct = +$('#r-pct', rc).value;
    $('#r-price-o', rc).textContent = fmt(price);
    $('#r-pct-o', rc).textContent = pct.toFixed(2).replace(/0$/, '') + '%';
    const fee = price * pct / 100;
    const trip = $('#r-trip', rc).checked ? 2250 * +segVal($('#r-who', rc)) : 0;
    animNum($('#r-fee', rc), fee);
    $('#r-trip-o', rc).textContent = fmt(trip);
    $('#r-all', rc).textContent = fmt(fee + trip);
    $('#r-share', rc).textContent = ((fee + trip) / price * 100).toFixed(2) + '% of purchase price';
    const msg = `Hi ITA Global! I'm exploring an international property around ${fmt(price)}. Estimated success fee ${pct}% ≈ ${fmt(fee)}. I'd like a private consultation.`;
    $$('[data-wa-calc]', rc).forEach(a => { a.href = waLink(msg); a.target = '_blank'; });
  };
  rc.addEventListener('input', run); rc.addEventListener('change', run); run();
}

/* incentive program */
const ic = $('#calc-inc');
if (ic) {
  const run = () => {
    const n = +$('#i-pax', ic).value, nights = +$('#i-nights', ic).value, region = segVal($('#i-region', ic)), lvl = segVal($('#i-lvl', ic));
    $('#i-pax-o', ic).textContent = n + ' attendees'; $('#i-nights-o', ic).textContent = nights + ' nights';
    const pp = BASE[region] * TYPE.incentive * { team: .9, club: 1.35, exec: 1.8 }[lvl] * nightsMul(nights) * (1 - groupDisc(n));
    const prog = n * pp;
    const gala = $('#i-gala', ic).checked ? n * 180 : 0;
    const impact = $('#i-impact', ic).checked ? n * +$('#i-tree', ic).value : 0;
    const total = prog + gala + impact;
    animNum($('#i-total', ic), total);
    $('#i-pp', ic).textContent = fmt(total / n);
    $('#i-prog', ic).textContent = fmt(prog);
    $('#i-extra', ic).textContent = fmt(gala + impact);
    $('#i-tree-o', ic).textContent = fmt(+$('#i-tree', ic).value);
    const msg = `Hi ITA Global! We're planning an incentive program: ${n} attendees, ${nights} nights, ${region}. Estimator budget ≈ ${fmt(total)}. Can you send an RFP response?`;
    $$('[data-wa-calc]', ic).forEach(a => { a.href = waLink(msg); a.target = '_blank'; });
  };
  ic.addEventListener('input', run); ic.addEventListener('change', run); run();
}

/* home mini estimator */
const mc = $('#mini');
if (mc) {
  const run = () => {
    const region = segVal($('#m-region', mc)), pax = +$('#m-pax', mc).value;
    $('#m-pax-o', mc).textContent = pax + (pax === 1 ? ' traveler' : ' travelers');
    const t = BASE[region] * pax * (1 - groupDisc(pax));
    animNum($('#m-total', mc), t);
  };
  mc.addEventListener('input', run); mc.addEventListener('change', run); run();
}
})();

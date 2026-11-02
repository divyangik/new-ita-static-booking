// ITA trip booking widget. Everything shown here comes from the ITA admin app.
(() => {
  const mounts = [...document.querySelectorAll('[data-ita-booking]')];
  const api = window.ITAServices && window.ITAServices.api;
  if (!mounts.length || !api) return;

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = value => Number(value) || 0;
  const money = (value, currency = 'USD') => {
    const whole = Math.abs(value - Math.round(value)) < 0.005;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 }).format(value);
  };
  const dmy = iso => { const [y, m, d] = String(iso).split('-'); return `${Number(d)}-${MONTHS[Number(m) - 1]}-${y}`; };
  const dayDiff = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 864e5);
  const isoToday = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const isoTomorrow = () => { const d = new Date(isoToday() + 'T12:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phonePattern = /^[+()\-.\s\d]{7,20}$/;
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  const icons = {
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6"/></svg>',
    room: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18V7"/><path d="M3 14h18v4"/><path d="M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.6"/></svg>',
    child: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="9" r="2.8"/><path d="M7 20c0-3 2.2-4.6 5-4.6s5 1.6 5 4.6"/></svg>',
    extra: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.4 5.2 5.6.7-4.1 3.9 1.1 5.6L12 15.6 7 18.4l1.1-5.6L4 8.9l5.6-.7z"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>'
  };

  const svg = body => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const iconLibrary = {
    spa: svg('<path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14z"/><path d="M5 19c3-5 6-8 10-10"/>'),
    paw: svg('<circle cx="6.5" cy="10" r="1.7"/><circle cx="10" cy="6" r="1.7"/><circle cx="14" cy="6" r="1.7"/><circle cx="17.5" cy="10" r="1.7"/><path d="M8 17c0-2.5 2-4.5 4-4.5s4 2 4 4.5c0 1.7-1.5 2.5-4 2.5s-4-.8-4-2.5z"/>'),
    moon: icons.moon,
    car: svg('<path d="M4 15v-3l2-5h12l2 5v3"/><path d="M3 15h18v3H3z"/><circle cx="7.5" cy="18" r="1.2"/><circle cx="16.5" cy="18" r="1.2"/>'),
    food: svg('<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 3c-2 2-3 5-3 8h3v10"/>'),
    wine: svg('<path d="M8 3h8l-.5 6a3.5 3.5 0 0 1-7 0z"/><path d="M12 12.5V20M8.5 20h7"/>'),
    compass: svg('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
    plane: svg('<path d="M3 13l18-7-5 14-3.5-5.5z"/><path d="M12.5 14.5 21 6"/>'),
    shield: svg('<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="m9 12 2 2 4-4"/>'),
    camera: svg('<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.2"/>'),
    bike: svg('<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-8h5l3 8M10 8l3 8"/>'),
    snow: svg('<path d="M12 3v18M4 7.5l16 9M20 7.5l-16 9"/>'),
    flag: svg('<path d="M6 21V4M6 5l11 3-11 4"/>'),
    wifi: svg('<path d="M3 9c5.5-5 12.5-5 18 0M6 12.5c3.5-3 8.5-3 12 0M9.2 16c1.7-1.4 3.9-1.4 5.6 0"/><circle cx="12" cy="19" r=".8"/>'),
    gift: svg('<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M12 9v11M4 13h16M12 9c-3-4-6-2-4.5 0M12 9c3-4 6-2 4.5 0"/>'),
    boat: svg('<path d="M4 15l2 4h12l2-4z"/><path d="M12 3v12M12 4l6 8h-6"/>'),
    crown: svg('<path d="M4 8l4 4 4-7 4 7 4-4-2 10H6z"/>'),
    book: svg('<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M8 17h10"/>'),
    heart: svg('<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>'),
    sparkle: svg('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>')
  };
  // A different icon and soft color for each extra, chosen from its name
  const iconRules = [
    [/spa|massage|wellness|relax|sauna/i, 'spa'], [/pet|dog|cat|animal/i, 'paw'], [/night|hotel|stay|room|lodging/i, 'moon'],
    [/transfer|airport|pick.?up|car|taxi|transport|shuttle|chauffeur/i, 'car'], [/meal|dinner|lunch|breakfast|food|dining|cuisine|cook/i, 'food'],
    [/wine|drink|bar|cocktail|tasting|beer/i, 'wine'], [/guide|tour|excursion|experience|activity|trek|hike/i, 'compass'],
    [/flight|fly|plane|air(?!port)/i, 'plane'], [/insur|protect|cover/i, 'shield'], [/photo|camera|video|film/i, 'camera'],
    [/bike|cycl/i, 'bike'], [/ski|snow/i, 'snow'], [/golf/i, 'flag'], [/wi-?fi|sim|internet|data/i, 'wifi'],
    [/gift|souvenir|welcome|hamper/i, 'gift'], [/boat|cruise|ferry|sail|yacht/i, 'boat'], [/upgrade|vip|premium|luxury|first.?class/i, 'crown'],
    [/class|lesson|workshop|course|learn/i, 'book']
  ];
  const tones = [['#fdecee', '#c9606a'], ['#e8f1fb', '#3c78b5'], ['#e9f4e3', '#5a8a43'], ['#fbf1de', '#b27a1f'], ['#efeaf8', '#6a58a0'], ['#e4f3f1', '#2f8a80']];
  const fallbackIcons = ['sparkle', 'gift', 'heart', 'crown'];
  const extraLook = (name, position) => {
    const rule = iconRules.find(([pattern]) => pattern.test(name));
    const tone = tones[position % tones.length];
    return { icon: iconLibrary[rule ? rule[1] : fallbackIcons[position % fallbackIcons.length]], bg: tone[0], fg: tone[1] };
  };
  const fieldIcons = {
    user: icons.user,
    mail: icons.mail,
    phone: svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
    chat: svg('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>'),
    calendar: svg('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
    people: svg('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.6c3 .1 5 1.9 5 5.4"/>'),
    arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>')
  };
  const heroImage = (() => {
    const meta = document.querySelector('meta[property="og:image"]');
    const el = document.querySelector('.td-hero-media img, .td-hero img');
    const raw = (meta && meta.content) || (el && (el.currentSrc || el.src)) || '';
    try { return raw ? new URL(raw, location.href).href : ''; } catch (urlError) { return ''; }
  })();

  let dialogCount = 0;

  // ---------- facts list under the price (Duration, destinations, hotels) ----------
  const renderTripCard = (mount, trip) => {
    const root = mount.closest('.td-book-card');
    const card = trip && trip.card;
    if (!root || !card) return;
    const currency = card.currency || 'USD';

    if (card.from_price) {
      const top = root.querySelector('.td-book-top');
      if (top) top.innerHTML = `<small>From</small><b>${money(card.from_price, currency)}</b><span>per person</span>`;
      document.querySelectorAll('.td-subnav-cta b, .td-mobar b').forEach(el => { el.textContent = money(card.from_price, currency); });
    }
    const note = root.querySelector('.td-book-note');
    if (note) {
      note.textContent = card.price_note ? `*${card.price_note.replace(/^\*/, '')}` : '';
      note.hidden = !card.price_note;
    }
    // The old fixed route box is replaced by the live route box inside the widget
    root.querySelectorAll('.td-route').forEach(el => el.remove());

    const list = root.querySelector('.td-book-list');
    if (list) list.innerHTML = '';
  };

  const init = async mount => {
    const productId = (mount.dataset.productId || '').trim();
    if (!productId) return;

    let trip;
    try {
      trip = await api.getTrip(productId);
    } catch (loadError) {
      console.warn('ITA booking is not available right now.', loadError);
      return;
    }
    if (!trip || !trip.view || !trip.trip) return;
    renderTripCard(mount, trip);

    // ---------- data from the admin app ----------
    const T = trip.trip;
    const currency = trip.currency || T.pricing.currency || 'USD';
    const title = trip.title || mount.dataset.title || 'this journey';
    const today = isoToday();
    const openDates = (trip.dates || []).filter(d =>
      ['Available', 'Guaranteed'].includes(d.status) && String(d.departure_date) > today && !(d.seats_total > 0 && d.seats_available <= 0));
    const fixedMode = openDates.length > 0;
    const minGuests = Math.max(1, num(T.capacity.min_group_size));
    const ROW_MAX = 20;
    const addons = (trip.addons || []).filter(a => a.visible !== false);
    const depositPer = num(T.payment.deposit_amount);
    const installments = Math.max(1, num(T.payment.installments));
    const startCity = T.info.start_city || T.info.departure_city || '';
    const endCity = T.info.end_city || startCity;
    const defaultDate = openDates.find(d => d.is_default) || openDates[0] || null;

    // Rows of Guests & Rooms: one per package type selected in the admin (or a plain Traveler row)
    const childType = (T.traveller_types || []).find(t => /^child/i.test(t.value || t.name)) || null;
    const isCouple = t => /^couple/i.test(t.value || t.name);
    const packageKinds = (T.package_types || []).length
      ? T.package_types.map(t => ({ key: `pkg:${t.value || t.name}`, type: isCouple(t) ? 'couple' : 'adult', label: t.name, name: t.name, sub: t.message || (isCouple(t) ? 'Couple room' : 'Double Occupancy'), mult: isCouple(t) ? 2 : 1, icon: icons.user }))
      : [{ key: 'adult', type: 'adult', label: '', name: 'Traveler', sub: 'Double Occupancy', mult: 1, icon: icons.user }];
    const singleKind = { key: 'single', type: 'single', label: '', name: T.capacity.private_rooms_type || 'Private room', mult: 1, icon: icons.room };
    const childKind = childType && T.capacity.child_allowed ? { key: 'child', type: 'child', label: '', name: T.capacity.child_room_type || childType.name || 'Child', sub: childType.message || 'Price per child', mult: 1, icon: icons.child } : null;

    const state = {
      dateId: defaultDate ? String(defaultDate.id) : '',
      from: '', to: '',
      counts: {},
      addons: {},
      pay: depositPer > 0 && !T.payment.preselect_full_payment ? 'deposit' : 'full',
      error: ''
    };
    state.counts[packageKinds[0].key] = Math.max(1, Math.ceil(minGuests / packageKinds[0].mult));

    const date = () => openDates.find(d => String(d.id) === state.dateId) || null;
    const cleanLabel = text => (text && !/^(n\/?a|none|null|-+|—)$/i.test(String(text).trim()) ? String(text).trim() : '');
    // "44 Days, 43 Nights", worked out from the chosen tour date. Without a date, the admin's duration is used.
    const durationText = () => {
      const d = date();
      if (d) { const nights = dayDiff(d.departure_date, d.return_date); return `${plural(nights + 1, 'Day')}, ${plural(nights, 'Night')}`; }
      return cleanLabel(T.info.duration_label) || (T.info.days ? `${plural(T.info.days, 'Day')}${T.info.nights ? `, ${plural(T.info.nights, 'Night')}` : ''}` : '');
    };
    const factsList = () => { const card = mount.closest('.td-book-card'); return card ? card.querySelector('.td-book-list') : null; };
    const setDurationFact = text => {
      const list = factsList();
      if (!list) return;
      let item = list.querySelector('[data-fact="duration"]');
      if (!text) { if (item) item.remove(); return; }
      if (!item) { item = document.createElement('li'); item.dataset.fact = 'duration'; item.innerHTML = '<span>Duration</span><b></b>'; list.prepend(item); }
      item.querySelector('b').textContent = text;
    };
    const allKinds = () => [...packageKinds, singleKind, childKind].filter(Boolean);
    const qtyOf = kind => state.counts[kind.key] || 0;
    const travelers = () => allKinds().reduce((n, kind) => n + qtyOf(kind) * kind.mult, 0);
    const adultCount = () => allKinds().filter(kind => kind.type !== 'child').reduce((n, kind) => n + qtyOf(kind) * kind.mult, 0);
    const pricePer = (kind, u) => (kind.type === 'couple' ? u.adult * 2 : kind.type === 'single' ? u.adult + u.single : kind.type === 'child' ? u.child : u.adult);
    const seatLimit = () => { const d = date(); return d && d.seats_total > 0 ? d.seats_available : Infinity; };
    const guestCap = () => seatLimit();
    // The admin sets the maximum in the dashboard (Max quantity). 0 means no limit, up to a safety cap.
    const addonMax = addon => (num(addon.max_qty) > 0 ? num(addon.max_qty) : 20);
    const unitPrices = () => {
      const d = date();
      const p = num(T.pricing.price_per_person);
      if (d) { const adult = num(d.adult_price) || p; return { adult, child: num(d.child_price) || adult, single: num(d.single_supplement) }; }
      return { adult: p, child: p, single: 0 };
    };
    const estimate = () => {
      const d = date();
      if (!d) return null;
      const u = unitPrices();
      let total = allKinds().reduce((sum, kind) => sum + qtyOf(kind) * pricePer(kind, u), 0);
      addons.forEach(a => { total += (state.addons[a.id] || 0) * num(a.price); });
      const deposit = depositPer * travelers();
      const due = state.pay === 'deposit' && deposit > 0 ? Math.min(deposit, total) : total;
      const depositNow = deposit > 0 ? Math.min(deposit, total) : 0;
      return { total, due, balance: total - due, depositNow, depositBalance: total - depositNow };
    };
    const travelerSummary = () => allKinds().filter(kind => qtyOf(kind) > 0)
      .map(kind => `${qtyOf(kind)} ${kind.name}${kind.type === 'couple' ? ' (2 travelers)' : ''}`).join(', ');
    const extrasSummary = () => addons.filter(a => state.addons[a.id] > 0).map(a => `${state.addons[a.id]} × ${a.addon_name}`).join(', ');
    const buildPayload = contact => ({
      shopify_product_id: productId,
      date_id: date() ? date().id : null,
      rows: allKinds().filter(kind => qtyOf(kind) > 0).map(kind => ({ type: kind.type, qty: qtyOf(kind), ...(kind.label ? { label: kind.label } : {}) })),
      addons: addons.filter(a => state.addons[a.id] > 0).map(a => ({ id: a.id, qty: state.addons[a.id] })),
      payment_type: state.pay === 'full' ? 'full' : 'deposit',
      contact
    });

    // ---------- the widget (inline in the page) ----------
    const stepper = (label, attrs, count, canDown, canUp) => `
      <div class="tw-step" role="group" aria-label="${esc(label)}">
        <button type="button" ${attrs} data-d="-1" ${canDown ? '' : 'disabled'} aria-label="Fewer: ${esc(label)}">−</button>
        <output aria-live="polite">${count}</output>
        <button type="button" ${attrs} data-d="1" ${canUp ? '' : 'disabled'} aria-label="More: ${esc(label)}">+</button>
      </div>`;

    const row = ({ icon, tone, name, sub, price, step }) => `
      <div class="tw-row">
        <span class="tw-ico" ${tone ? `style="${tone}"` : ''}>${icon}</span>
        <div class="tw-rt"><b>${esc(name)}</b><small>${esc(sub)}</small></div>
        ${price ? `<span class="tw-rp">${esc(price)}</span>` : ''}
        ${step}
      </div>`;

    const widgetView = () => {
      const d = date();
      const u = unitPrices();
      const n = travelers();
      const cap = guestCap();
      const est = estimate();
      const duration = durationText();

      const dateBlock = fixedMode ? `
        <label class="tw-field"><span>Tour date</span>
          <select name="dateId" data-fk="date">${openDates.map(x => `<option value="${x.id}" ${String(x.id) === state.dateId ? 'selected' : ''}>${dmy(x.departure_date)}${x.status === 'Guaranteed' ? ' · Guaranteed departure' : ''}</option>`).join('')}</select>
        </label>
        ${d && d.seats_total > 0 && d.seats_available <= 10 ? `<p class="tw-seats">Only ${plural(d.seats_available, 'seat')} left on this date</p>` : ''}`
        : `<div class="tw-dates">
            <label class="tw-field"><span>From</span><input type="date" name="from" data-fk="from" min="${isoTomorrow()}" value="${esc(state.from)}"></label>
            <label class="tw-field"><span>To</span><input type="date" name="to" data-fk="to" min="${esc(state.from || isoTomorrow())}" value="${esc(state.to)}"></label>
          </div>
          <p class="tw-hint">No fixed departures yet. Choose the dates you prefer and we will confirm availability and price.</p>`;

      const route = !(startCity || endCity) ? '' : `
        <div class="tw-route" aria-label="Tour route">
          <div class="tw-city"><b>${esc(startCity || '—')}</b>${d ? `<span>${dmy(d.departure_date)}</span>` : ''}<small>Tour starts</small></div>
          <div class="tw-line"><em>${esc(duration)}</em><i></i></div>
          <div class="tw-city end"><b>${esc(endCity || '—')}</b>${d ? `<span>${dmy(d.return_date)}</span>` : ''}<small>Tour ends</small></div>
        </div>`;

      const visibleKinds = allKinds().filter(kind => kind !== singleKind || (d && u.single > 0));
      const guestRows = visibleKinds.map(kind => {
        const price = pricePer(kind, u);
        const sub = kind === singleKind ? `Single occupancy · +${money(u.single, currency)} supplement` : kind.sub;
        return row({ icon: kind.icon, name: kind.name, sub, price: price > 0 ? money(price, currency) : '',
          step: stepper(kind.name, `data-guest="${esc(kind.key)}"`, qtyOf(kind), qtyOf(kind) > 0 && n - kind.mult >= minGuests, qtyOf(kind) < ROW_MAX && n + kind.mult <= cap) });
      });

      const extras = addons.length ? `
        <section class="tw-sec">
          <div class="tw-sec-head"><h4>Extras</h4><span>Optional</span></div>
          ${addons.map((a, position) => {
            const qty = state.addons[a.id] || 0;
            const look = extraLook(a.addon_name, position);
            const limit = num(a.max_qty) > 0 ? `Up to ${num(a.max_qty)}` : '';
            const sub = [a.description, limit].filter(Boolean).join(' · ') || 'Optional extra';
            return row({ icon: look.icon, tone: `background:${look.bg};color:${look.fg};border-color:transparent`, name: a.addon_name, sub, price: money(num(a.price), currency),
              step: stepper(a.addon_name, `data-addon="${esc(a.id)}"`, qty, qty > 0, qty < addonMax(a)) });
          }).join('')}
        </section>` : '';

      const payment = !fixedMode ? '' : `
        <section class="tw-sec">
          <div class="tw-sec-head"><h4>Payment</h4></div>
          <div class="tw-pay">
            ${depositPer > 0 ? `
            <label class="tw-opt ${state.pay === 'deposit' ? 'is-on' : ''}">
              <input type="radio" name="pay" value="deposit" data-fk="pay-deposit" ${state.pay === 'deposit' ? 'checked' : ''}>
              <span class="tw-opt-main"><b>${esc(T.payment.option_label || 'I want to Deposit')}</b>
                <small>${est ? `${money(est.depositBalance, currency)} balance paid later.` : 'Balance paid later.'}${installments > 1 && est && est.depositBalance > 0 ? `<br>(You can pay it in easy installments like ${money(est.depositBalance / installments, currency)} × ${installments})` : ''}</small></span>
              <span class="tw-opt-amt">${est ? money(est.depositNow, currency) : money(depositPer * n, currency)}</span>
            </label>` : ''}
            <label class="tw-opt ${state.pay === 'full' ? 'is-on' : ''}">
              <input type="radio" name="pay" value="full" data-fk="pay-full" ${state.pay === 'full' ? 'checked' : ''}>
              <span class="tw-opt-main"><b>Full Price</b><small>I want to pay full payment.</small>${T.payment.show_deal_price_badge ? '<em class="tw-badge">Best price</em>' : ''}</span>
              <span class="tw-opt-amt">${est ? money(est.total, currency) : '—'}</span>
            </label>
          </div>
        </section>`;

      const totalBar = fixedMode && est ? `
        <div class="tw-total"><span>Trip total</span><b>${money(est.total, currency)}</b></div>
        <p class="tw-due">Due now: <b>${money(est.due, currency)}</b>${est.balance > 0 ? ` · Balance ${money(est.balance, currency)}` : ''}</p>` : '';

      const primaryLabel = fixedMode ? (T.cta.primary_label || 'Book now') : 'Send enquiry';
      const secondaryLabel = T.cta.secondary_label || 'Enquiry Now';
      return `
        <div class="tw">
          ${T.info.departure_city ? `<p class="tw-dep">Departure city <b>${esc(T.info.departure_city)}</b></p>` : ''}
          ${dateBlock}
          ${route}
          <section class="tw-sec">
            <div class="tw-sec-head"><h4>Guests &amp; Rooms</h4></div>
            ${guestRows.join('')}
            <p class="tw-count">${plural(n, 'Traveler')}</p>
          </section>
          ${extras}
          ${payment}
          ${totalBar}
          ${state.error ? `<p class="tw-err" role="alert">${esc(state.error)}</p>` : ''}
          <div class="tw-actions">
            ${fixedMode ? `<button type="button" class="tw-btn tw-ghost" data-act="enquiry">${esc(secondaryLabel)}</button>` : ''}
            <button type="button" class="tw-btn tw-primary" data-act="${fixedMode ? 'reserve' : 'enquiry'}">${esc(primaryLabel)}</button>
          </div>
          ${T.has_itinerary_pdf ? `<button type="button" class="tw-link" data-act="itinerary">${icons.mail}<span>Email itinerary</span></button>` : ''}
        </div>`;
    };

    const renderWidget = () => {
      const focusKey = document.activeElement && mount.contains(document.activeElement) ? document.activeElement.dataset.fk : null;
      mount.innerHTML = widgetView();
      if (focusKey) { const el = mount.querySelector(`[data-fk="${focusKey}"]`); if (el) el.focus(); }
      setDurationFact(durationText());
    };

    // ---------- the pop-up (details, review, enquiry, itinerary) ----------
    const dialogId = `tw-dialog-${++dialogCount}`;
    const dialog = document.createElement('dialog');
    dialog.className = 'tw-dialog';
    dialog.id = dialogId;
    dialog.setAttribute('aria-labelledby', `${dialogId}-title`);
    document.body.append(dialog);

    const dlg = { mode: 'reserve', step: 'details', name: '', email: '', phone: '', message: '', policy: false, errors: {}, error: '', busy: false, quote: null, done: '' };
    const dField = (label, name, type, icon, extra = '') => `
      <label class="tw-f">
        <span class="tw-f-l">${label}</span>
        <span class="tw-f-w ${dlg.errors[name] ? 'is-bad' : ''}"><i class="tw-f-i">${fieldIcons[icon]}</i>
          <input type="${type}" name="${name}" data-fk="${name}" value="${esc(dlg[name])}" ${extra} ${dlg.errors[name] ? 'aria-invalid="true"' : ''}></span>
        ${dlg.errors[name] ? `<em class="tw-ferr">${esc(dlg.errors[name])}</em>` : ''}
      </label>`;

    const selectionRows = () => {
      const d = date();
      return [
        fixedMode && d ? ['calendar', `${dmy(d.departure_date)} → ${dmy(d.return_date)}`] : (state.from && state.to ? ['calendar', `${dmy(state.from)} → ${dmy(state.to)}`] : null),
        ['people', travelerSummary()],
        extrasSummary() ? ['sparkle', extrasSummary()] : null
      ].filter(Boolean);
    };
    const selectionSummary = () => {
      const d = date();
      const parts = [['Trip', title], ...selectionRows().map(([kind, text]) => [kind === 'calendar' ? (fixedMode && d ? 'Tour date' : 'Preferred dates') : kind === 'people' ? 'Travelers' : 'Extras', text])];
      return `<dl class="tw-sum">${parts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
    };
    const selectionChips = () => `<ul class="tw-sumchips" aria-label="Your selection">${selectionRows().map(([kind, text]) => `<li><span>${iconLibrary[kind] || fieldIcons[kind]}</span>${esc(text)}</li>`).join('')}</ul>`;

    const banner = (kicker, heading) => `
      <header class="tw-hero" ${heroImage ? `style="background-image:linear-gradient(180deg,rgba(7,12,43,.15),rgba(7,12,43,.78)),url('${esc(heroImage)}')"` : ''}>
        <button type="button" class="tw-x" data-d-act="close" aria-label="Close">✕</button>
        <small>${esc(kicker)}</small>
        <h3 class="tw-d-title" tabindex="-1" id="${dialogId}-title">${esc(heading)}</h3>
        <p>${esc(title)}</p>
      </header>`;

    const reviewView = () => {
      const q = dlg.quote;
      return `
        <h3 class="tw-d-title" tabindex="-1" id="${dialogId}-title">Review your booking</h3>
        ${selectionSummary()}
        <ul class="tw-lines">${q.lines.map(l => `<li><span>${esc(l.label)} × ${l.qty}</span><b>${money(num(l.amount), currency)}</b></li>`).join('')}</ul>
        <div class="tw-total"><span>Trip total</span><b>${money(num(q.total), currency)}</b></div>
        <div class="tw-total due"><span>${q.payment_type === 'deposit' ? 'Deposit due now' : 'Due now'}</span><b>${money(num(q.due_now), currency)}</b></div>
        ${num(q.balance) > 0 ? `<p class="tw-hint">The remaining ${money(num(q.balance), currency)} is arranged with your ITA Global specialist.</p>` : ''}
        ${dlg.error ? `<p class="tw-err" role="alert">${esc(dlg.error)}</p>` : ''}
        <div class="tw-actions">
          <button type="button" class="tw-btn tw-ghost" data-d-act="back" ${dlg.busy ? 'disabled' : ''}>Edit details</button>
          <button type="button" class="tw-btn tw-primary" data-d-act="pay" ${dlg.busy ? 'disabled' : ''}>${dlg.busy ? 'Opening secure checkout…' : `Continue to payment · ${money(num(q.due_now), currency)}`}</button>
        </div>`;
    };

    const dialogView = () => {
      const close = '<button type="button" class="tw-x tw-x-plain" data-d-act="close" aria-label="Close">✕</button>';
      if (dlg.done) {
        return `<div class="tw-d-body tw-done">${close}<span class="tw-done-ico">${icons.check}</span><h3 class="tw-d-title" tabindex="-1" id="${dialogId}-title">${dlg.mode === 'itinerary' ? 'Itinerary on its way' : 'Enquiry sent'}</h3><p>${esc(dlg.done)}</p><button type="button" class="tw-btn tw-primary" data-d-act="close">Close</button></div>`;
      }
      if (dlg.mode === 'reserve' && dlg.step === 'review' && dlg.quote) return `<div class="tw-d-body">${close}${reviewView()}</div>`;
      const error = dlg.error ? `<p class="tw-err" role="alert">${esc(dlg.error)}</p>` : '';
      if (dlg.mode === 'itinerary') {
        return `${banner('Itinerary', 'Get the day-by-day plan')}
          <form class="tw-d-body" novalidate>
            <p class="tw-lead">We will email the full itinerary to your inbox.</p>
            ${dField('Your name (optional)', 'name', 'text', 'user', 'autocomplete="name" placeholder="Jane Smith"')}
            ${dField('Email', 'email', 'email', 'mail', 'autocomplete="email" inputmode="email" placeholder="jane@example.com"')}
            ${error}
            <button type="submit" class="tw-btn tw-primary tw-wide" ${dlg.busy ? 'disabled' : ''}>${dlg.busy ? 'Sending…' : `Send itinerary <i class="tw-btn-i">${fieldIcons.arrow}</i>`}</button>
          </form>`;
      }
      const isEnquiry = dlg.mode === 'enquiry';
      return `${banner(isEnquiry ? 'Enquiry' : 'Reserve', isEnquiry ? 'Tell us about your journey' : 'Your details')}
        <form class="tw-d-body" novalidate>
          ${isEnquiry ? '<p class="tw-lead">Share a few details and a specialist will get back to you.</p>' : ''}
          ${selectionChips()}
          <div class="tw-f-grid">
            ${dField('Full name', 'name', 'text', 'user', 'autocomplete="name" placeholder="Jane Smith"')}
            ${dField('Phone / WhatsApp', 'phone', 'tel', 'phone', 'autocomplete="tel" inputmode="tel" placeholder="+1 555 010 0000"')}
          </div>
          ${dField('Email', 'email', 'email', 'mail', 'autocomplete="email" inputmode="email" placeholder="jane@example.com"')}
          ${isEnquiry ? `<label class="tw-f"><span class="tw-f-l">Your message <em class="tw-opt-tag">optional</em></span>
              <span class="tw-f-w tw-f-area"><i class="tw-f-i">${fieldIcons.chat}</i><textarea name="message" data-fk="message" rows="4" placeholder="Dates, special requests, questions…">${esc(dlg.message)}</textarea></span></label>`
            : `<label class="tw-check"><input type="checkbox" name="policy" data-fk="policy" ${dlg.policy ? 'checked' : ''} ${dlg.errors.policy ? 'aria-invalid="true"' : ''}><span>I have read the <a href="#policies" data-policy>cancellation policy</a> for this journey.</span></label>${dlg.errors.policy ? `<em class="tw-ferr">${esc(dlg.errors.policy)}</em>` : ''}`}
          ${error}
          <button type="submit" class="tw-btn tw-primary tw-wide" ${dlg.busy ? 'disabled' : ''}>${dlg.busy ? 'Please wait…' : `${isEnquiry ? 'Send enquiry' : 'Review booking'} <i class="tw-btn-i">${fieldIcons.arrow}</i>`}</button>
        </form>`;
    };

    const renderDialog = focusSelector => {
      const focusKey = document.activeElement && dialog.contains(document.activeElement) ? document.activeElement.dataset.fk : null;
      dialog.innerHTML = dialogView();
      const target = (focusSelector && dialog.querySelector(focusSelector)) || (focusKey && dialog.querySelector(`[data-fk="${focusKey}"]`));
      if (target) target.focus();
    };

    const openDialog = mode => {
      Object.assign(dlg, { mode, step: 'details', errors: {}, error: '', busy: false, quote: null, done: '' });
      document.documentElement.classList.add('tw-lock');
      renderDialog();
      if (!dialog.open) dialog.showModal();
      const first = dialog.querySelector('[data-fk="name"], [data-fk="email"]') || dialog.querySelector('.tw-d-title');
      if (first) first.focus();
    };
    dialog.addEventListener('close', () => document.documentElement.classList.remove('tw-lock'));
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

    const validateContact = needPhone => {
      const errors = {};
      if (dlg.mode !== 'itinerary' && !dlg.name.trim()) errors.name = 'Add your full name.';
      if (!emailPattern.test(dlg.email.trim())) errors.email = 'Add a valid email address, e.g. jane@company.com.';
      if (needPhone && (!phonePattern.test(dlg.phone.trim()) || dlg.phone.replace(/\D/g, '').length < 7)) errors.phone = 'Add a phone or WhatsApp number with country code.';
      return errors;
    };

    const enquiryMessage = () => {
      const d = date();
      const lines = [`Trip: ${title}`];
      if (fixedMode && d) lines.push(`Tour date: ${dmy(d.departure_date)} to ${dmy(d.return_date)}`);
      else lines.push(state.from && state.to ? `Preferred dates: ${dmy(state.from)} to ${dmy(state.to)}` : 'Preferred dates: not chosen yet');
      lines.push(`Travelers: ${travelerSummary()}`);
      if (extrasSummary()) lines.push(`Extras: ${extrasSummary()}`);
      const est = estimate();
      if (fixedMode && est) lines.push(`Estimated total: ${money(est.total, currency)} (${state.pay === 'deposit' ? 'deposit' : 'full payment'} preferred)`);
      if (dlg.message.trim()) lines.push('', `Message: ${dlg.message.trim()}`);
      return lines.join('\n');
    };

    const submitDialog = async () => {
      if (dlg.busy) return;
      const needPhone = dlg.mode !== 'itinerary';
      const errors = validateContact(needPhone);
      if (dlg.mode === 'reserve' && !dlg.policy) errors.policy = 'Please confirm you have read the cancellation policy.';
      dlg.errors = errors;
      dlg.error = '';
      if (Object.keys(errors).length) { renderDialog(`[name="${Object.keys(errors)[0]}"]`); return; }
      dlg.busy = true;
      renderDialog();
      try {
        if (dlg.mode === 'enquiry') {
          await api.enquiry({ shopify_product_id: productId, name: dlg.name.trim(), email: dlg.email.trim(), phone: dlg.phone.trim(), message: enquiryMessage() });
          dlg.done = 'Thank you. A specialist will reply to you shortly.';
        } else if (dlg.mode === 'itinerary') {
          await api.itinerary({ shopify_product_id: productId, name: dlg.name.trim(), email: dlg.email.trim() });
          dlg.done = `We sent the itinerary to ${dlg.email.trim()}. Please check your inbox.`;
        } else {
          dlg.quote = await api.quote(buildPayload({ name: dlg.name.trim(), email: dlg.email.trim(), phone: dlg.phone.trim() }));
          dlg.step = 'review';
        }
      } catch (failure) {
        dlg.error = failure.message || 'Something went wrong. Nothing was charged. Please try again.';
      }
      dlg.busy = false;
      renderDialog('.tw-d-title');
    };

    const startPayment = async () => {
      if (dlg.busy) return;
      dlg.busy = true; dlg.error = '';
      renderDialog();
      try {
        const result = await api.checkout(buildPayload({ name: dlg.name.trim(), email: dlg.email.trim(), phone: dlg.phone.trim() }));
        if (!result || !/^https:\/\//.test(result.checkout_url || '')) throw new Error('Checkout could not be started. Nothing was charged. Please try again.');
        window.location.assign(result.checkout_url);
      } catch (failure) {
        dlg.busy = false;
        dlg.error = failure.message || 'Checkout could not be started. Nothing was charged.';
        renderDialog();
      }
    };

    dialog.addEventListener('input', event => {
      const field = event.target;
      if (field.name in dlg && field.type !== 'checkbox') dlg[field.name] = field.value;
      if (field.name === 'policy') { dlg.policy = field.checked; if (field.checked && dlg.errors.policy) { delete dlg.errors.policy; } }
    });
    dialog.addEventListener('submit', event => { event.preventDefault(); submitDialog(); });
    dialog.addEventListener('click', event => {
      const policyLink = event.target.closest('[data-policy]');
      if (policyLink) {
        event.preventDefault();
        dialog.close();
        const target = document.querySelector('#policies');
        if (target) target.scrollIntoView({ behavior: 'smooth' }); else window.location.hash = 'policies';
        return;
      }
      const button = event.target.closest('[data-d-act]');
      if (!button) return;
      const action = button.dataset.dAct;
      if (action === 'close') dialog.close();
      if (action === 'back') { dlg.step = 'details'; dlg.error = ''; renderDialog('[data-fk="name"]'); }
      if (action === 'pay') startPayment();
    });

    // ---------- widget events ----------
    const checkReady = () => {
      if (fixedMode) {
        if (!date()) return 'Please choose a tour date.';
      } else {
        if (!state.from || !state.to) return 'Please choose your From and To dates.';
        if (state.to < state.from) return 'The end date must be after the start date.';
      }
      if (travelers() < minGuests) return `Please choose at least ${plural(minGuests, 'traveler')}.`;
      if (adultCount() < 1) return 'At least one adult is needed.';
      return '';
    };

    mount.addEventListener('click', event => {
      const guest = event.target.closest('[data-guest]');
      if (guest) {
        const kind = allKinds().find(k => k.key === guest.dataset.guest);
        const delta = Number(guest.dataset.d);
        if (kind) {
          const next = qtyOf(kind) + delta;
          const total = travelers() + delta * kind.mult;
          if (next >= 0 && next <= ROW_MAX && total >= minGuests && total <= guestCap()) state.counts[kind.key] = next;
        }
        state.error = '';
        renderWidget();
        return;
      }
      const extra = event.target.closest('[data-addon]');
      if (extra) {
        const addon = addons.find(a => String(a.id) === extra.dataset.addon);
        if (!addon) return;
        const next = (state.addons[addon.id] || 0) + Number(extra.dataset.d);
        if (next >= 0 && next <= addonMax(addon)) state.addons[addon.id] = next;
        renderWidget();
        return;
      }
      const action = event.target.closest('[data-act]');
      if (!action) return;
      if (action.dataset.act === 'itinerary') { openDialog('itinerary'); return; }
      const problem = checkReady();
      if (problem && action.dataset.act === 'reserve') { state.error = problem; renderWidget(); return; }
      state.error = '';
      renderWidget();
      openDialog(action.dataset.act === 'reserve' ? 'reserve' : 'enquiry');
    });

    mount.addEventListener('input', event => {
      const field = event.target;
      if (field.name === 'dateId') {
        state.dateId = field.value;
        const d = date();
        if (d && !(num(d.single_supplement) > 0)) state.counts.single = 0;
        const first = packageKinds[0];
        while (travelers() > guestCap() && qtyOf(first) > 1) state.counts[first.key] -= 1;
      } else if (field.name === 'pay') {
        state.pay = field.value;
      } else if (field.name === 'from' || field.name === 'to') {
        state[field.name] = field.value;
        if (state.to && state.from && state.to < state.from) state.to = state.from;
      } else return;
      state.error = '';
      renderWidget();
    });

    renderWidget();
  };

  mounts.forEach(init);
})();
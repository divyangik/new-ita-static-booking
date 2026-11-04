// Cart page: review trips, switch deposit / full payment, change travelers, then go to Shopify checkout.
(() => {
  const root = document.querySelector('[data-ita-cart]');
  const cart = window.ITACart;
  if (!root || !cart) return;
  const { money, plural, esc, datesText, routeText } = cart.format;
  const num = value => Number(value) || 0;
  const TERMS_URL = 'https://itaglobal.com/pages/terms-conditions';
  const MAX_TRAVELERS = 20;

  const svg = body => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const icon = {
    calendar: svg('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
    pin: svg('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
    clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    people: svg('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.6c3 .1 5 1.9 5 5.4"/>'),
    trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    shield: svg('<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="m9 12 2 2 4-4"/>'),
    chat: svg('<path d="M4 5h16v11H9l-5 4z"/>'),
    bag: svg('<path d="M6 7h12l1 13H5z"/><path d="M9 7V6a3 3 0 0 1 6 0v1"/>'),
    arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    chevron: svg('<path d="m6 9 6 6 6-6"/>')
  };

  const state = { agreed: false, error: '', busy: false, open: {}, guestsOpen: {}, errors: {} };
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phoneOk = value => /^[+()\-.\s\d]{7,20}$/.test(value) && value.replace(/\D/g, '').length >= 7;

  const guestErrors = item => {
    const errors = {};
    cart.guestsOf(item).forEach((guest, index) => {
      if (!guest.name) errors[`${index}_name`] = index === 0 ? 'Add the lead traveler’s full name.' : `Add the full name of traveler ${index + 1}.`;
      if (index === 0 && !emailPattern.test(guest.email)) errors['0_email'] = 'Add a valid email, e.g. jane@company.com.';
      if (index === 0 && !phoneOk(guest.phone)) errors['0_phone'] = 'Add a phone / WhatsApp number with country code.';
      if (index > 0 && guest.email && !emailPattern.test(guest.email)) errors[`${index}_email`] = 'Check this email address.';
      if (index > 0 && guest.phone && !phoneOk(guest.phone)) errors[`${index}_phone`] = 'Check this phone number.';
    });
    return errors;
  };
  const guestProgress = item => {
    const guests = cart.guestsOf(item);
    const errors = guestErrors(item);
    const done = guests.filter((guest, index) => !Object.keys(errors).some(field => field.startsWith(`${index}_`))).length;
    return { done, total: guests.length, complete: done === guests.length };
  };

  const guestsView = item => {
    const guests = cart.guestsOf(item);
    const progress = guestProgress(item);
    const errors = state.errors[item.key] || {};
    const open = state.guestsOpen[item.key] !== undefined ? state.guestsOpen[item.key] : !progress.complete;
    const field = (index, key, label, type, attrs, required) => {
      const error = errors[`${index}_${key}`];
      return `<label class="ic-f ${key === 'name' ? 'wide' : ''}"><span>${label}${required ? '' : ' <em>optional</em>'}</span>
        <input type="${type}" data-guest="${index}" data-field="${key}" value="${esc(guests[index][key])}" ${attrs} ${error ? 'aria-invalid="true"' : ''}>
        ${error ? `<small class="ic-ferr">${esc(error)}</small>` : ''}</label>`;
    };
    return `
      <section class="ic-guests ${progress.complete ? 'is-done' : ''}">
        <button type="button" class="ic-guests-head" data-act="guests" aria-expanded="${open}">
          ${icon.people}<b>Traveler details</b>
          <span class="ic-chip" data-guest-chip>${progress.complete ? '✓ All added' : `${progress.done} of ${progress.total} added`}</span>${icon.chevron}
        </button>
        <div class="ic-guests-body" ${open ? '' : 'hidden'}>
          <p class="ic-guests-lead">Names exactly as on each passport. We use the lead traveler’s email and phone for all booking updates.</p>
          ${guests.map((guest, index) => `
            <fieldset class="ic-guest">
              <legend>Traveler ${index + 1}${index === 0 ? ' <span>Lead traveler</span>' : ''}</legend>
              <div class="ic-fgrid">
                ${field(index, 'name', 'Full name', 'text', `autocomplete="${index === 0 ? 'name' : 'off'}" placeholder="As on passport"`, true)}
                ${field(index, 'email', 'Email', 'email', `inputmode="email" ${index === 0 ? 'autocomplete="email"' : 'autocomplete="off"'} placeholder="name@example.com"`, index === 0)}
                ${field(index, 'phone', 'Phone / WhatsApp', 'tel', `inputmode="tel" ${index === 0 ? 'autocomplete="tel"' : 'autocomplete="off"'} placeholder="+1 555 010 0000"`, index === 0)}
              </div>
            </fieldset>`).join('')}
        </div>
      </section>`;
  };

  const itemView = item => {
    const c = cart.calc(item);
    const currency = item.currency || 'USD';
    const step = Math.max(1, num(item.step));
    const min = Math.max(step, num(item.minTravelers) || 1);
    const hasDeposit = !!(item.deposit && item.depositVariant);
    const route = routeText(item).replace(' - ', ' → ');
    const extras = (item.extras || []).filter(extra => num(extra.qty) > 0);
    const unitWord = item.unit && num(item.unit.mult) > 1 ? item.unit.label : 'traveler';
    const unitCount = item.unit && num(item.unit.mult) > 1 ? Math.ceil(c.travelers / item.unit.mult) : c.travelers;
    const open = !!state.open[item.key];
    return `
      <article class="ic-item" data-key="${esc(item.key)}">
        <a class="ic-media" href="${esc(item.url || '#')}" tabindex="-1" aria-hidden="true">${item.image ? `<img src="${esc(item.image)}" alt="" loading="lazy">` : `<span>${icon.bag}</span>`}</a>
        <div class="ic-body">
          <div class="ic-top">
            <div>
              <h3 class="ic-title"><a href="${esc(item.url || '#')}">${esc(item.title)}</a></h3>
              <ul class="ic-meta">
                <li>${icon.calendar}<span>${esc(datesText(item))}</span></li>
                ${route ? `<li>${icon.pin}<span>${esc(route)}</span></li>` : ''}
                ${item.duration ? `<li>${icon.clock}<span>${esc(item.duration)}</span></li>` : ''}
              </ul>
            </div>
            <button type="button" class="ic-remove" data-act="remove" aria-label="Remove ${esc(item.title)}">${icon.trash}<span>Remove</span></button>
          </div>

          <div class="ic-controls">
            <div class="ic-qty">
              <span class="ic-label">${icon.people}Travelers</span>
              <div class="ic-step" role="group" aria-label="Travelers">
                <button type="button" data-act="qty" data-d="-${step}" ${c.travelers - step < min ? 'disabled' : ''} aria-label="Fewer travelers">−</button>
                <output aria-live="polite">${c.travelers}</output>
                <button type="button" data-act="qty" data-d="${step}" ${c.travelers + step > MAX_TRAVELERS ? 'disabled' : ''} aria-label="More travelers">+</button>
              </div>
              ${unitWord !== 'traveler' ? `<small>${esc(plural(unitCount, unitWord))}</small>` : ''}
            </div>
            ${hasDeposit ? `
            <div class="ic-pay" role="radiogroup" aria-label="Payment for ${esc(item.title)}">
              <button type="button" role="radio" aria-checked="${c.payDeposit}" class="${c.payDeposit ? 'is-on' : ''}" data-act="pay" data-pay="deposit">
                <small>Pay deposit</small><b>${money(num(item.deposit.amount) * c.travelers, currency)}</b></button>
              <button type="button" role="radio" aria-checked="${!c.payDeposit}" class="${!c.payDeposit ? 'is-on' : ''}" data-act="pay" data-pay="full">
                <small>Pay in full</small><b>${money(c.total, currency)}</b></button>
            </div>` : ''}
          </div>

          ${c.payDeposit && c.balance > 0 ? `<p class="ic-note">${money(c.balance, currency)} balance paid later${c.installments > 1 ? ` — easy installments like <b>${money(c.balance / c.installments, currency)} × ${c.installments}</b>` : ''}.</p>` : ''}

          ${guestsView(item)}

          <div class="ic-foot">
            <button type="button" class="ic-toggle" data-act="toggle" aria-expanded="${open}">Price details ${icon.chevron}</button>
            <div class="ic-price"><small>${c.payDeposit ? 'Due today' : 'Trip total'}</small><b>${money(c.payDeposit ? c.dueNow : c.total, currency)}</b>${c.payDeposit ? `<span>of ${money(c.total, currency)}</span>` : ''}</div>
          </div>
          <dl class="ic-lines" ${open ? '' : 'hidden'}>
            <div><dt>Package price × ${c.travelers}</dt><dd>${money(num(item.unitPrice), currency)} × ${c.travelers} = ${money(c.base, currency)}</dd></div>
            ${extras.map(extra => `<div><dt>${esc(extra.name)} × ${extra.qty}${extra.variant ? '' : ' <em>confirmed by our team</em>'}</dt><dd>${money(num(extra.price) * num(extra.qty), currency)}</dd></div>`).join('')}
            <div class="tot"><dt>Trip total</dt><dd>${money(c.total, currency)}</dd></div>
            <div><dt>${c.payDeposit ? 'Deposit paid today' : 'Paid today'}</dt><dd>${money(c.dueNow, currency)}</dd></div>
            ${c.balance > 0 ? `<div><dt>${c.payDeposit ? 'Balance paid later' : 'Extras to confirm'}</dt><dd>${money(c.balance, currency)}</dd></div>` : ''}
          </dl>
        </div>
      </article>`;
  };

  const summaryView = items => {
    const sum = cart.totals(items);
    const currency = (items[0] && items[0].currency) || 'USD';
    return `
      <aside class="ic-sum" aria-labelledby="ic-sum-title">
        <h2 id="ic-sum-title">Order summary</h2>
        <ul class="ic-sum-trips">${items.map(item => `<li><span>${esc(item.title)}<small>${esc(plural(cart.calc(item).travelers, 'traveler'))} · ${cart.calc(item).payDeposit ? 'Deposit' : 'Full payment'}</small></span><b>${money(cart.calc(item).dueNow, currency)}</b></li>`).join('')}</ul>
        <dl class="ic-sum-lines">
          <div><dt>Trip total</dt><dd>${money(sum.total, currency)}</dd></div>
          ${sum.balance > 0 ? `<div><dt>Paid later</dt><dd>${money(sum.balance, currency)}</dd></div>` : ''}
          <div class="due"><dt>Due today</dt><dd>${money(sum.dueNow, currency)}</dd></div>
        </dl>
        <label class="ic-agree ${state.error && !state.agreed ? 'is-bad' : ''}"><input type="checkbox" data-act="agree" ${state.agreed ? 'checked' : ''}>
          <span>I agree with the <a href="${TERMS_URL}" target="_blank" rel="noopener">Terms &amp; Conditions</a> and each journey's cancellation policy.</span></label>
        ${state.error ? `<p class="ic-err" role="alert">${esc(state.error)}</p>` : ''}
        <button type="button" class="ic-checkout" data-act="checkout" ${state.busy ? 'disabled' : ''}>${icon.lock}<span>${state.busy ? 'Opening secure checkout…' : `Secure checkout · ${money(sum.dueNow, currency)}`}</span></button>
        <a class="ic-continue" href="/journeys">Continue exploring journeys</a>
        <ul class="ic-trust">
          <li>${icon.shield}<span>Payment is processed on our secure Shopify checkout.</span></li>
          <li>${icon.chat}<span>A travel specialist confirms every booking with you personally.</span></li>
        </ul>
      </aside>
      <div class="ic-bar" aria-hidden="true"><span><small>Due today</small><b>${money(sum.dueNow, currency)}</b></span><button type="button" data-act="jump" tabindex="-1">Checkout</button></div>`;
  };

  const emptyView = () => `
    <div class="ic-empty">
      <span class="ic-empty-ico">${icon.bag}</span>
      <h2>Your cart is empty</h2>
      <p>Choose a journey, pick your date and travelers, then add it here to check out.</p>
      <a class="ic-checkout ic-inline" href="/journeys"><span>Explore journeys</span>${icon.arrow}</a>
    </div>`;

  const render = () => {
    const items = cart.items();
    const count = document.querySelector('[data-cart-title-count]');
    if (count) count.textContent = items.length ? plural(items.length, 'journey') : 'No journeys yet';
    root.classList.toggle('is-empty', !items.length);
    root.innerHTML = items.length
      ? `<div class="ic-list">${items.map(itemView).join('')}</div>${summaryView(items)}`
      : emptyView();
  };

  root.addEventListener('click', event => {
    const control = event.target.closest('[data-act]');
    if (!control) return;
    const article = control.closest('[data-key]');
    const key = article && article.dataset.key;
    const item = key ? cart.items().find(entry => entry.key === key) : null;
    const act = control.dataset.act;
    if (act === 'remove' && item) {
      article.classList.add('is-leaving');
      setTimeout(() => cart.remove(key), 180);
      return;
    }
    if (act === 'qty' && item) {
      const step = Math.max(1, num(item.step));
      const min = Math.max(step, num(item.minTravelers) || 1);
      const next = num(item.travelers) + Number(control.dataset.d);
      if (next >= min && next <= MAX_TRAVELERS) cart.update(key, { travelers: next });
      return;
    }
    if (act === 'pay' && item) { cart.update(key, { payment: control.dataset.pay }); return; }
    if (act === 'toggle' && key) { state.open[key] = !state.open[key]; render(); return; }
    if (act === 'guests' && key) { state.guestsOpen[key] = control.getAttribute('aria-expanded') !== 'true'; render(); return; }
    if (act === 'jump') { const button = root.querySelector('.ic-checkout'); if (button) { button.scrollIntoView({ behavior: 'smooth', block: 'center' }); button.focus({ preventScroll: true }); } return; }
    if (act === 'checkout') {
      const items = cart.items();
      let firstBad = null;
      state.errors = {};
      items.forEach(entry => {
        const errors = guestErrors(entry);
        if (Object.keys(errors).length) {
          state.errors[entry.key] = errors;
          state.guestsOpen[entry.key] = true;
          if (!firstBad) firstBad = [entry.key, Object.keys(errors)[0]];
        }
      });
      if (firstBad) {
        state.error = 'Please add the traveler details for each journey.';
        render();
        const [badKey, badField] = firstBad;
        const [index, name] = badField.split('_');
        const input = root.querySelector(`[data-key="${badKey}"] [data-guest="${index}"][data-field="${name}"]`);
        if (input) { input.scrollIntoView({ behavior: 'smooth', block: 'center' }); input.focus({ preventScroll: true }); }
        return;
      }
      if (!state.agreed) { state.error = 'Please agree to the Terms & Conditions to continue.'; render(); root.querySelector('.ic-agree input').focus(); return; }
      const stores = new Set(items.map(entry => entry.store));
      const url = stores.size === 1 ? cart.checkoutUrl(items) : '';
      if (!url) { state.error = 'Checkout could not be started for these journeys. Please send us an enquiry and we will help you book.'; render(); return; }
      state.busy = true; state.error = ''; render();
      window.location.assign(url);
    }
  });
  root.addEventListener('input', event => {
    const input = event.target;
    if (input.dataset.guest === undefined) return;
    const article = input.closest('[data-key]');
    const key = article.dataset.key;
    const item = cart.items().find(entry => entry.key === key);
    if (!item) return;
    const guests = cart.guestsOf(item);
    guests[Number(input.dataset.guest)][input.dataset.field] = input.value;
    cart.update(key, { guests }, { silent: true });
    const fieldKey = `${input.dataset.guest}_${input.dataset.field}`;
    if (state.errors[key] && state.errors[key][fieldKey] && !guestErrors({ ...item, guests })[fieldKey]) {
      delete state.errors[key][fieldKey];
      input.removeAttribute('aria-invalid');
      const message = input.parentElement.querySelector('.ic-ferr');
      if (message) message.remove();
    }
    const progress = guestProgress({ ...item, guests });
    const chip = article.querySelector('[data-guest-chip]');
    if (chip) chip.textContent = progress.complete ? '✓ All added' : `${progress.done} of ${progress.total} added`;
    article.querySelector('.ic-guests').classList.toggle('is-done', progress.complete);
  });
  root.addEventListener('change', event => {
    if (event.target.dataset.act === 'agree') { state.agreed = event.target.checked; if (state.agreed) state.error = ''; render(); root.querySelector('.ic-agree input').focus(); }
  });
  window.addEventListener('pageshow', () => { state.busy = false; render(); });

  cart.onChange(render);
  render();
})();
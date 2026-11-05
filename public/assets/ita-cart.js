// ITA cart: trips saved in this browser, checked out together on Shopify.
(() => {
  const STORAGE_KEY = 'ita-cart-v1';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const num = value => Number(value) || 0;
  const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (value, currency = 'USD') => {
    const whole = Math.abs(value - Math.round(value)) < 0.005;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 }).format(value);
  };
  const dmy = iso => { const [y, m, d] = String(iso || '').split('-'); return y && m && d ? `${Number(d)}-${MONTHS[Number(m) - 1]}-${y}` : ''; };
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  let memory = [];
  const read = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      memory = Array.isArray(items) ? items : [];
    } catch (storageError) { /* storage blocked: keep the in-page copy */ }
    return memory.slice();
  };
  const listeners = new Set();
  const write = (items, silent) => {
    memory = items.slice();
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory)); } catch (storageError) { /* storage blocked */ }
    if (!silent) listeners.forEach(listener => listener(memory.slice()));
    updateBadges();
  };

  // ---------- price maths for one trip ----------
  const calc = item => {
    const travelers = Math.max(1, num(item.travelers));
    const base = num(item.unitPrice) * travelers;
    const extras = (item.extras || []).filter(extra => num(extra.qty) > 0);
    const extrasTotal = extras.reduce((sum, extra) => sum + num(extra.price) * num(extra.qty), 0);
    const total = base + extrasTotal;
    const deposit = item.deposit && num(item.deposit.amount) > 0 && item.depositVariant ? item.deposit : null;
    const payDeposit = !!deposit && item.payment === 'deposit';
    if (payDeposit) {
      const dueNow = Math.min(num(deposit.amount) * travelers, total);
      const installments = Math.max(1, num(deposit.installments));
      return { travelers, base, extrasTotal, total, dueNow, balance: total - dueNow, payDeposit, installments, depositPer: num(deposit.amount),
        lines: [{ variant: String(item.depositVariant), gid: item.depositVariantGid || '', qty: travelers, main: true }] };
    }
    const charged = extras.filter(extra => extra.variant);
    const unpaidExtras = extras.filter(extra => !extra.variant).reduce((sum, extra) => sum + num(extra.price) * num(extra.qty), 0);
    return { travelers, base, extrasTotal, total, dueNow: total - unpaidExtras, balance: unpaidExtras, payDeposit, installments: 1, depositPer: deposit ? num(deposit.amount) : 0,
      lines: [{ variant: String(item.variant), gid: item.variantGid || '', qty: travelers, main: true }, ...charged.map(extra => ({ variant: String(extra.variant), gid: extra.variantGid || '', qty: num(extra.qty), extra: extra.name }))] };
  };

  const totals = items => items.reduce((sum, item) => {
    const c = calc(item);
    return { total: sum.total + c.total, dueNow: sum.dueNow + c.dueNow, balance: sum.balance + c.balance, travelers: sum.travelers + c.travelers };
  }, { total: 0, dueNow: 0, balance: 0, travelers: 0 });

  const datesText = item => {
    if (item.dateLabel) return item.dateLabel;
    if (item.from && item.to) return `${dmy(item.from)} to ${dmy(item.to)}`;
    return 'To be confirmed';
  };
  const routeText = item => [item.startCity, item.endCity].filter(Boolean).join(' - ');
  const travelersText = item => {
    const count = Math.max(1, num(item.travelers));
    const unit = item.unit && num(item.unit.mult) > 1 ? item.unit : null;
    return unit ? `${count} (${plural(Math.ceil(count / unit.mult), unit.label)})` : String(count);
  };
  const guestsOf = item => {
    const count = Math.max(1, num(item.travelers));
    const list = Array.isArray(item.guests) ? item.guests.slice(0, count) : [];
    while (list.length < count) list.push({ name: '', email: '', phone: '' });
    return list.map(guest => ({ name: String(guest.name || '').trim(), email: String(guest.email || '').trim(), phone: String(guest.phone || '').trim() }));
  };
  const extrasText = item => (item.extras || []).filter(extra => num(extra.qty) > 0).map(extra => `${extra.qty} x ${extra.name}`).join(', ');

  // Details written on the Shopify order for one trip
  const paymentText = item => {
    const c = calc(item);
    const currency = item.currency || 'USD';
    if (c.payDeposit) {
      const plan = c.installments > 1 && c.balance > 0 ? ` (${c.installments} x ${money(c.balance / c.installments, currency)})` : '';
      return `Deposit ${money(c.dueNow, currency)} paid of ${money(c.total, currency)} · Balance ${money(c.balance, currency)} later${plan}`;
    }
    return c.balance > 0
      ? `Full payment ${money(c.dueNow, currency)} · Extras ${money(c.balance, currency)} to confirm`
      : `Full payment ${money(c.total, currency)}`;
  };
  const contactText = guest => [guest.name, guest.email, guest.phone].filter(Boolean).join(' · ');

  const details = item => {
    const currency = item.currency || 'USD';
    const guests = guestsOf(item);
    const names = guests.map(guest => guest.name).filter(Boolean);
    const out = {
      'Tour Dates': datesText(item),
      ...(routeText(item) ? { 'Tour Start and End City': routeText(item) } : {}),
      'Travelers': `${travelersText(item)}${names.length ? ` — ${names.join(', ')}` : ''}`,
      ...(guests[0] && (guests[0].email || guests[0].phone) ? { 'Lead Traveler': contactText(guests[0]) } : {}),
      'Package Price': `${money(num(item.unitPrice), currency)} per traveler`
    };
    if (extrasText(item)) out['Extras'] = extrasText(item);
    out['Payment'] = paymentText(item);
    return out;
  };

  // Base64 (URL-safe) JSON with no padding characters, as Shopify cart links expect
  const encodeProperties = object => {
    let json = JSON.stringify(object);
    const bytes = () => new TextEncoder().encode(json);
    while (bytes().length % 3 !== 0) json += ' ';
    let binary = '';
    bytes().forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_');
  };

  const checkoutUrl = (items, email) => {
    if (!items.length) return '';
    const store = items[0].store;
    const counts = new Map();
    items.forEach(item => calc(item).lines.forEach(line => {
      if (!/^\d{6,}$/.test(line.variant)) return;
      counts.set(line.variant, (counts.get(line.variant) || 0) + line.qty);
    }));
    if (!counts.size) return '';
    const path = [...counts].map(([variant, qty]) => `${variant}:${qty}`).join(',');
    const sum = totals(items);
    const currency = items[0].currency || 'USD';
    const params = [];
    const add = (key, value) => params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    params.push(`properties=${encodeProperties(details(items[0]))}`);
    items.forEach((item, index) => {
      const lines = Object.entries(details(item)).filter(([key]) => key !== 'Lead Traveler').map(([key, value]) => `${key}: ${value}`).join(' | ');
      add(`attributes[Trip ${index + 1}]`, `${item.title} | ${lines}`);
      guestsOf(item).forEach((guest, guestIndex) => {
        if (contactText(guest)) add(`attributes[Trip ${index + 1} - Traveler ${guestIndex + 1}${guestIndex === 0 ? ' (Lead)' : ''}]`, contactText(guest));
      });
    });
    add('attributes[Order Total]', money(sum.total, currency));
    add('attributes[Paid At Checkout]', money(sum.dueNow, currency));
    if (sum.balance > 0) add('attributes[Balance Due Later]', money(sum.balance, currency));
    add('note', items.map(item => `${item.title} | ${datesText(item)} | ${plural(calc(item).travelers, 'traveler')} | ${calc(item).payDeposit ? 'Deposit' : 'Full payment'}`).join('\n'));
    const lead = guestsOf(items[0])[0];
    const contactEmail = email || (lead && lead.email);
    if (contactEmail) add('checkout[email]', contactEmail);
    return `https://${store}/cart/${path}?${params.join('&')}`;
  };

  // Shopify Cart API checkout: every trip line carries its own details. Falls back to a cart link.
  const checkout = async items => {
    const shopify = window.ITAShopify;
    const lines = [];
    items.forEach(item => calc(item).lines.forEach(line => lines.push({ item, line })));
    const ready = shopify && lines.length && lines.every(({ line }) => line.gid) && items.every(item => item.store === shopify.settings.store);
    if (ready) {
      try {
        const sum = totals(items);
        const currency = items[0].currency || 'USD';
        const lead = guestsOf(items[0])[0];
        return await shopify.createCheckout({
          lines: lines.map(({ item, line }) => ({
            merchandiseId: line.gid,
            quantity: line.qty,
            attributes: line.main
              ? [...Object.entries(details(item)), ...guestsOf(item).slice(1).map((guest, index) => [`Traveler ${index + 2}`, contactText(guest)])]
              : [['For Trip', item.title], ['Tour Dates', datesText(item)]]
          })),
          attributes: [
            ['Order Total', money(sum.total, currency)],
            ['Paid At Checkout', money(sum.dueNow, currency)],
            ...(sum.balance > 0 ? [['Balance Due Later', money(sum.balance, currency)]] : [])
          ],
          note: items.map(item => `${item.title} | ${datesText(item)} | ${plural(calc(item).travelers, 'traveler')} | ${calc(item).payDeposit ? 'Deposit' : 'Full payment'}`).join('\n'),
          email: lead ? lead.email : ''
        });
      } catch (cartError) {
        console.warn('Shopify Cart API checkout failed. Using a cart link instead.', cartError);
      }
    }
    return checkoutUrl(items);
  };

  // ---------- public actions ----------
  const sameTrip = (a, b) => a.productId === b.productId && (a.from || '') === (b.from || '') && (a.to || '') === (b.to || '') && (a.dateLabel || '') === (b.dateLabel || '');
  const add = item => {
    const items = read();
    const entry = { ...item, key: item.key || `${item.productId}-${Date.now().toString(36)}`, addedAt: new Date().toISOString() };
    const at = items.findIndex(existing => sameTrip(existing, entry));
    if (at >= 0) { entry.key = items[at].key; if (!entry.guests && items[at].guests) entry.guests = items[at].guests; items[at] = entry; } else items.push(entry);
    write(items);
    return entry;
  };
  const update = (key, changes, options = {}) => write(read().map(item => (item.key === key ? { ...item, ...changes } : item)), !!options.silent);
  const remove = key => write(read().filter(item => item.key !== key));
  const clear = () => write([]);
  const count = () => read().length;

  // ---------- header cart icon ----------
  const bagIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 7h12l1 13H5z"/><path d="M9 7V6a3 3 0 0 1 6 0v1"/></svg>';
  const updateBadges = () => {
    const n = memory.length;
    document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = n; el.hidden = n === 0; });
    document.querySelectorAll('.hdr-cart').forEach(el => el.setAttribute('aria-label', n ? `Cart, ${plural(n, 'trip')}` : 'Cart'));
  };
  const mountHeaderIcon = () => {
    const header = document.querySelector('.hdr .wrap');
    if (!header || header.querySelector('.hdr-cart')) return;
    const link = document.createElement('a');
    link.className = 'hdr-cart';
    link.href = '/cart';
    link.innerHTML = `${bagIcon}<span class="hdr-cart-n" data-cart-count hidden>0</span>`;
    const burger = header.querySelector('.burger');
    const cta = header.querySelector('.cta');
    if (cta) cta.after(link); else if (burger) burger.before(link); else header.append(link);
  };

  // ---------- "added to cart" panel ----------
  let panel;
  const showAdded = item => {
    const c = calc(item);
    const currency = item.currency || 'USD';
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'ita-added';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'false');
      panel.setAttribute('aria-labelledby', 'ita-added-title');
      document.body.append(panel);
      panel.addEventListener('click', event => { if (event.target.closest('[data-added-close]')) hideAdded(); });
      document.addEventListener('keydown', event => { if (event.key === 'Escape') hideAdded(); });
    }
    panel.innerHTML = `
      <div class="ita-added-head"><span class="ita-added-ok" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg></span>
        <b id="ita-added-title">Added to your cart</b><button type="button" class="ita-added-x" data-added-close aria-label="Close">✕</button></div>
      <div class="ita-added-trip">${item.image ? `<img src="${esc(item.image)}" alt="">` : ''}
        <div><b>${esc(item.title)}</b><small>${esc(datesText(item))} · ${esc(plural(c.travelers, 'traveler'))}</small>
        <small>${c.payDeposit ? `Deposit today <strong>${money(c.dueNow, currency)}</strong>` : `Total <strong>${money(c.total, currency)}</strong>`}</small></div></div>
      <div class="ita-added-actions"><a class="ita-added-btn primary" href="/cart">View cart &amp; checkout</a><button type="button" class="ita-added-btn" data-added-close>Keep exploring</button></div>`;
    panel.classList.add('is-open');
    const go = panel.querySelector('.ita-added-btn.primary');
    if (go) go.focus({ preventScroll: true });
  };
  const hideAdded = () => { if (panel) panel.classList.remove('is-open'); };

  read();
  const start = () => { mountHeaderIcon(); updateBadges(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) { read(); updateBadges(); listeners.forEach(listener => listener(memory.slice())); } });

  window.ITACart = Object.freeze({
    items: read, add, update, remove, clear, count, calc, totals, details, checkout, checkoutUrl, showAdded, guestsOf,
    onChange: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    format: { money, dmy, plural, esc, datesText, routeText, travelersText, extrasText }
  });
})();
// Shopify-only booking. No custom app, no backend.
// Book now -> Shopify checkout, full payment once (a real Shopify order, with all traveler details on it).
// Enquiry -> email (Web3Forms).
(() => {
  const mountFor = productId => document.querySelector(`[data-ita-booking][data-product-id="${productId}"]`);

  // Per-trip details, keyed by Shopify product ID. A trip with no entry here uses the preferred From/To dates.
  // Extras are calculated in the widget. An extra with a Shopify variant ID is also charged at checkout;
  // one without is written on the order and confirmed by the ITA team.
  const tripConfigs = {
    '15449689129256': {
      departureCity: 'Tokyo', startCity: 'Tokyo', endCity: 'Kyoto',
      dates: [{ from: '2027-03-24', to: '2027-04-02' }, { from: '2027-04-02', to: '2027-04-11' }],
      addons: [{ id: 'extra-night', name: 'Extra Night', price: 500, maxQty: 0, description: '', variant: '' }]
    }
  };
  tripConfigs['15462490374440'] = {
    departureCity: 'Bangkok', startCity: 'Bangkok', endCity: 'Phuket',
    dates: [{ from: '2027-11-02', to: '2027-11-11' }],
    packageTypes: [{ name: 'Couple', message: 'Double Occupancy' }],
    minGroup: 2,
    addons: []
  };
  const configFor = productId => tripConfigs[productId] || { dates: [], addons: [] };
  const activeAddons = config => config.addons || [];

  const priceFromPage = () => {
    const el = document.querySelector('.td-book-top b');
    const value = el ? Number(String(el.textContent).replace(/[^0-9.]/g, '')) : 0;
    return value > 0 ? value : 0;
  };

  const emptyTrip = (mount, price) => {
    const currency = mount.dataset.currency || 'USD';
    const config = configFor(mount.dataset.productId);
    return {
      view: true,
      shopify: true,
      title: mount.dataset.title || '',
      currency,
      card: null,
      dates: (config.dates || []).map((date, index) => ({
        id: date.from, departure_date: date.from, return_date: date.to, status: 'Available',
        adult_price: 0, child_price: 0, single_supplement: 0, seats_total: 0, seats_available: 0, is_default: index === 0
      })),
      addons: activeAddons(config).map((addon, index) => ({
        id: addon.id, addon_name: addon.name, description: addon.description || '', price: addon.price, max_qty: addon.maxQty || 0, visible: true, display_order: index
      })),
      trip: {
        pricing: { price_per_person: price, currency },
        capacity: {
          min_group_size: config.minGroup || 1, child_allowed: false,
          private_rooms_type: '', private_rooms_count: 0, private_rooms_price: 0,
          couple_room_type: '', couple_room_count: 0, couple_room_price: 0,
          child_room_type: '', child_room_count: 0, child_room_price: 0
        },
        payment: { deposit_amount: 0, installments: 1, preselect_full_payment: false, option_label: 'I want to Deposit', show_deal_price_badge: false },
        info: { start_city: config.startCity || '', end_city: config.endCity || '', departure_city: config.departureCity || '', duration_label: '', days: 0, nights: 0 },
        traveller_types: [], package_types: (config.packageTypes || []).map(type => ({ name: type.name, value: type.name.toLowerCase(), message: type.message || '' })), tour_types: [], included: [],
        cta: { primary_label: 'Book now', secondary_label: 'Enquiry Now' },
        has_itinerary_pdf: false
      }
    };
  };

  const getTrip = async productId => {
    const mount = mountFor(productId);
    const price = priceFromPage();
    if (!mount || !mount.dataset.store || !/^\d{6,}$/.test(mount.dataset.variant || '') || !price) {
      const error = new Error('Booking is not set up for this trip yet.');
      error.code = 'not_configured';
      throw error;
    }
    return emptyTrip(mount, price);
  };

  const travelerCount = body => (body.travelers && body.travelers.length) || 1;

  const addonsOf = body => {
    const config = configFor(body.shopify_product_id);
    return (body.addons || []).map(chosen => {
      const addon = activeAddons(config).find(item => item.id === String(chosen.id));
      return addon ? { ...addon, qty: Number(chosen.qty) || 0 } : null;
    }).filter(addon => addon && addon.qty > 0);
  };

  const quote = async body => {
    const price = priceFromPage();
    const count = travelerCount(body);
    const lines = [{ label: 'Traveler', qty: count, amount: price * count }];
    addonsOf(body).forEach(addon => lines.push({ label: addon.name, qty: addon.qty, amount: addon.price * addon.qty }));
    const total = lines.reduce((sum, line) => sum + line.amount, 0);
    const later = addonsOf(body).filter(addon => !addon.variant).reduce((sum, addon) => sum + addon.price * addon.qty, 0);
    return { lines, total, due_now: total - later, balance: later, payment_type: 'full' };
  };

  const dateText = body => {
    if (body.date_id) {
      const date = (configFor(body.shopify_product_id).dates || []).find(item => item.from === String(body.date_id));
      if (date) return `${date.from} to ${date.to}`;
    }
    return body.dates && body.dates.from && body.dates.to ? `${body.dates.from} to ${body.dates.to}` : 'Not chosen';
  };

  // Shopify cart link: variant x travelers. Everything else goes on the order as "Additional details".
  const checkout = async body => {
    const mount = mountFor(body.shopify_product_id);
    const store = mount.dataset.store;
    const variant = mount.dataset.variant;
    const count = travelerCount(body);
    const q = await quote(body);

    const attributes = {
      'Trip': mount.dataset.title || '',
      [body.date_id ? 'Tour date' : 'Preferred dates']: dateText(body),
      'Travelers': String(count),
      'Trip total': `${q.total} ${mount.dataset.currency || 'USD'}`,
      'Paid at checkout': `${q.due_now} ${mount.dataset.currency || 'USD'}`
    };
    const extras = addonsOf(body);
    if (extras.length) attributes['Extras'] = extras.map(addon => `${addon.qty} x ${addon.name}`).join(', ');
    if (q.balance > 0) attributes['Extras to confirm'] = `${q.balance} ${mount.dataset.currency || 'USD'} (not charged at checkout)`;
    (body.travelers || []).forEach((traveler, index) => {
      attributes[`Traveler ${index + 1}`] = [traveler.name, traveler.email, traveler.phone, traveler.type].filter(Boolean).join(' | ');
    });

    const params = [];
    Object.keys(attributes).forEach(key => params.push(`${encodeURIComponent(`attributes[${key}]`)}=${encodeURIComponent(attributes[key])}`));
    params.push(`note=${encodeURIComponent(`${attributes['Trip']} | ${dateText(body)} | ${count} traveler(s)`)}`);
    if (body.contact && body.contact.email) params.push(`${encodeURIComponent('checkout[email]')}=${encodeURIComponent(body.contact.email)}`);

    const items = [`${variant}:${count}`, ...extras.filter(addon => addon.variant).map(addon => `${addon.variant}:${addon.qty}`)].join(',');
    return { checkout_url: `https://${store}/cart/${items}?${params.join('&')}` };
  };

  // Enquiries are emailed through Web3Forms (no backend). Paste the Access Key you get by email from https://web3forms.com
  const accessKey = '58439164-9998-4dda-8841-e734239117e6';

  const postForm = async fields => {
    const failure = new Error('We could not send your message. Please try again.');
    if (!/^[0-9a-f-]{20,}$/i.test(accessKey)) {
      console.warn('Web3Forms access key is not set in ita-services.js');
      throw failure;
    }
    let response;
    try {
      response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `New enquiry: ${fields.trip}`,
          from_name: 'ITA Global website',
          ...fields
        })
      });
    } catch (networkFailure) {
      console.warn('Enquiry request was blocked or could not connect.', networkFailure);
      throw new Error('Could not connect to the email service. Please check your internet or turn off ad-blockers, then try again.');
    }
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || result.success !== true) {
      console.warn('Enquiry email service replied:', response.status, result);
      throw new Error(result && result.message ? `Email service says: ${result.message}` : `${failure.message} (code ${response.status})`);
    }
    return { ok: true };
  };

  const trackedTrip = productId => { const mount = mountFor(productId); return mount ? mount.dataset.title || '' : ''; };

  const enquiry = body => postForm({ trip: trackedTrip(body.shopify_product_id), name: body.name, email: body.email, phone: body.phone || '', message: body.message || '' });
  const itinerary = body => postForm({ trip: trackedTrip(body.shopify_product_id), name: body.name, email: body.email, phone: '', message: 'Please send me the itinerary.' });

  const api = { configured: true, getTrip, quote, checkout, enquiry, itinerary };
  window.ITAServices = Object.freeze({ config: Object.freeze({ mode: 'shopify' }), api: Object.freeze(api) });
})();
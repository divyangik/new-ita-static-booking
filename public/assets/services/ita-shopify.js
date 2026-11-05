// Live trip data from Shopify (Storefront API): title, image, price, Full Price / Deposit variants,
// tour dates, cities, installments and extras. Also creates the Shopify checkout for the cart.
// To switch stores (test -> live), change SETTINGS only.
(() => {
  const SETTINGS = Object.freeze({
    store: 'ita3-0.myshopify.com',
    token: 'a9719ae28d97260d96a7da57eb48c722',
    version: '2026-04',
    namespace: 'custom'
  });

  const FIELDS = ['start_city', 'end_city', 'departure_city', 'tour_dates', 'date_label', 'installments', 'preselect_full', 'price_unit', 'min_travelers', 'extras'];
  const VARIANT_FIELDS = 'id title availableForSale price { amount currencyCode } selectedOptions { name value } product { title }';
  const PRODUCT_QUERY = `query TripBooking($handle: String!) {
    product(handle: $handle) {
      id title handle
      featuredImage { url altText }
      variants(first: 20) { nodes { ${VARIANT_FIELDS} } }
      metafields(identifiers: [${FIELDS.map(key => `{ namespace: "${SETTINGS.namespace}", key: "${key}" }`).join(', ')}]) {
        key type value
        reference { ... on ProductVariant { ${VARIANT_FIELDS} } }
        references(first: 20) { nodes { ... on ProductVariant { ${VARIANT_FIELDS} } } }
      }
    }
  }`;
  const CART_MUTATION = `mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) { cart { id checkoutUrl } userErrors { field message } }
  }`;

  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const pad = value => String(value).padStart(2, '0');
  const numericId = gid => String(gid || '').split('/').pop();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const request = async (query, variables) => {
    const response = await fetch(`https://${SETTINGS.store}/api/${SETTINGS.version}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Shopify-Storefront-Access-Token': SETTINGS.token },
      body: JSON.stringify({ query, variables })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.errors) {
      const detail = payload && payload.errors ? payload.errors.map(item => item.message).join('; ') : `HTTP ${response.status}`;
      throw new Error(`Shopify Storefront API: ${detail}`);
    }
    return payload.data;
  };

  const toIso = text => {
    const value = String(text || '').trim();
    let match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) return `${match[1]}-${pad(match[2])}-${pad(match[3])}`;
    match = value.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[A-Za-z]*[-\s,]+(\d{4})$/);
    if (match && MONTHS[match[2].toLowerCase()]) return `${match[3]}-${pad(MONTHS[match[2].toLowerCase()])}-${pad(match[1])}`;
    return '';
  };
  const listValues = field => {
    if (!field || field.value == null || field.value === '') return [];
    if (String(field.type || '').startsWith('list.')) {
      try { const parsed = JSON.parse(field.value); return Array.isArray(parsed) ? parsed : []; } catch (parseError) { return []; }
    }
    return [field.value];
  };
  const parseDates = field => listValues(field).map(text => {
    const parts = String(text).split(/\s+(?:to|→|–|-)\s+/i);
    const from = toIso(parts[0]);
    const to = toIso(parts[1]);
    return from && to && to >= from ? { from, to } : null;
  }).filter(Boolean).sort((a, b) => a.from.localeCompare(b.from));

  const isDeposit = variant => /deposit/i.test([variant.title, ...(variant.selectedOptions || []).map(option => option.value)].join(' '));
  const variantName = variant => {
    const productTitle = (variant.product && variant.product.title) || '';
    const title = variant.title && !/^default title$/i.test(variant.title) ? variant.title : '';
    return productTitle && title ? `${productTitle} – ${title}` : productTitle || title || 'Extra';
  };

  const toConfig = product => {
    const meta = {};
    (product.metafields || []).filter(Boolean).forEach(field => { meta[field.key] = field; });
    const text = key => (meta[key] && meta[key].value ? String(meta[key].value).trim() : '');
    const integer = key => { const value = parseInt(text(key), 10); return Number.isFinite(value) ? value : 0; };
    const variants = (product.variants && product.variants.nodes) || [];
    const full = variants.find(variant => !isDeposit(variant)) || null;
    const deposit = variants.find(isDeposit) || null;
    if (!full) return null;
    const unitLabel = text('price_unit');
    const couple = /couple/i.test(unitLabel);
    const extrasField = meta.extras;
    const extraVariants = extrasField
      ? [...((extrasField.references && extrasField.references.nodes) || []), ...(extrasField.reference ? [extrasField.reference] : [])].filter(item => item && item.id)
      : [];
    return {
      source: 'shopify',
      handle: product.handle,
      title: product.title,
      image: product.featuredImage ? product.featuredImage.url : '',
      store: SETTINGS.store,
      currency: full.price.currencyCode || 'USD',
      price: Number(full.price.amount) || 0,
      variant: numericId(full.id),
      variantGid: full.id,
      available: full.availableForSale !== false,
      startCity: text('start_city'),
      endCity: text('end_city'),
      departureCity: text('departure_city'),
      dateLabel: text('date_label'),
      dates: parseDates(meta.tour_dates),
      minGroup: integer('min_travelers') || (couple ? 2 : 1),
      priceUnit: unitLabel ? { label: unitLabel.toLowerCase(), mult: couple ? 2 : 1 } : null,
      packageTypes: couple ? [{ name: 'Couple', message: 'Double Occupancy' }] : [],
      deposit: deposit && Number(deposit.price.amount) > 0 && deposit.availableForSale !== false ? {
        amount: Number(deposit.price.amount),
        installments: integer('installments') || 1,
        variant: numericId(deposit.id),
        variantGid: deposit.id,
        preselectFull: text('preselect_full') === 'true'
      } : null,
      addons: extraVariants.map(variant => ({
        id: numericId(variant.id),
        name: variantName(variant),
        price: Number(variant.price.amount) || 0,
        maxQty: 0,
        description: '',
        variant: numericId(variant.id),
        variantGid: variant.id
      }))
    };
  };

  const cache = {};
  const product = handle => {
    const key = String(handle || '').trim();
    if (!key) return Promise.resolve(null);
    if (!cache[key]) {
      cache[key] = request(PRODUCT_QUERY, { handle: key })
        .then(data => (data && data.product ? toConfig(data.product) : null))
        .catch(error => { delete cache[key]; throw error; });
    }
    return cache[key];
  };

  const clean = pairs => pairs
    .filter(([key, value]) => key && value != null && String(value).trim() !== '')
    .map(([key, value]) => ({ key: String(key).slice(0, 250), value: String(value).slice(0, 2000) }));

  const createCheckout = async ({ lines, attributes = [], note = '', email = '' }) => {
    const input = {
      lines: lines.map(line => ({ merchandiseId: line.merchandiseId, quantity: line.quantity, attributes: clean(line.attributes || []) })),
      attributes: clean(attributes),
      ...(note ? { note } : {}),
      ...(emailPattern.test(email) ? { buyerIdentity: { email } } : {})
    };
    const data = await request(CART_MUTATION, { input });
    const result = data && data.cartCreate;
    if (!result || (result.userErrors && result.userErrors.length) || !result.cart || !/^https:\/\//.test(result.cart.checkoutUrl || '')) {
      const message = result && result.userErrors && result.userErrors.length ? result.userErrors.map(item => item.message).join('; ') : 'No checkout URL';
      throw new Error(`Shopify cart: ${message}`);
    }
    return result.cart.checkoutUrl;
  };

  window.ITAShopify = Object.freeze({ settings: SETTINGS, product, createCheckout, toConfig });
})();
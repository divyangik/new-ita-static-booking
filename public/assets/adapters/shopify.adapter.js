(() => {
  const bookableStatuses = ['Available', 'Guaranteed'];

  const todayIso = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };

  const requestJson = async (url, init) => {
    let response;
    try {
      response = await fetch(url, init);
    } catch (networkFailure) {
      const error = new Error('We could not reach the booking service. Nothing was charged. Please try again.');
      error.code = 'network';
      throw error;
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error((payload && payload.error) || 'The booking service did not respond. Nothing was charged.');
      error.code = 'service_error';
      error.status = response.status;
      throw error;
    }
    return payload;
  };

  const isOpenDeparture = departure =>
    bookableStatuses.includes(departure.status) &&
    String(departure.departure_date) > todayIso() &&
    !(departure.seats_total > 0 && departure.seats_available <= 0);

  // One request per trip, shared by the card and the booking box
  const tripCache = {};
  const getTrip = (productId, apiBase) => {
    const key = `${apiBase}|${productId}`;
    if (!tripCache[key]) {
      tripCache[key] = requestJson(`${apiBase}/api/booking?shopify_product_id=${encodeURIComponent(productId)}`)
        .catch(error => { delete tripCache[key]; throw error; });
    }
    return tripCache[key];
  };

  // Details for the trip card (price, duration, cities, dates...). Works even when no dates are open.
  const loadCard = async (baseions, apiBase) => {
    const productId = baseions.commerce.productId;
    if (!productId) return null;
    const trip = await getTrip(productId, apiBase);
    return trip && trip.view && trip.card ? trip.card : null;
  };

  const loadions = async (baseions, apiBase) => {
    const productId = baseions.commerce.productId;
    if (!productId) return null;

    const trip = await getTrip(productId, apiBase);
    if (!trip || !trip.view) return null;

    // One entry per open departure date, with the prices set in the admin app
    const departures = {};
    (trip.dates || []).filter(isOpenDeparture).forEach(departure => {
      if (departures[departure.departure_date]) return;
      departures[departure.departure_date] = {
        id: departure.id,
        adultPrice: Number(departure.adult_price || 0),
        childPrice: Number(departure.child_price || 0) || null,
        singleSupplement: Number(departure.single_supplement || 0)
      };
    });
    const fixedDepartures = Object.keys(departures).sort();
    if (!fixedDepartures.length) return null;
    const departureIds = {};
    fixedDepartures.forEach(date => { departureIds[date] = departures[date].id; });

    const maxTravelers = Number(trip.max_group_size) > 0 ? Number(trip.max_group_size) : baseions.maxTravelers;
    const minTravelers = Math.min(Math.max(Number(trip.min_group_size) || 1, 1), maxTravelers);

    // Extras (add-ons) that are switched on in the admin app
    const addons = (trip.addons || [])
      .filter(addon => addon.visible !== false)
      .sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0))
      .map(addon => ({
        id: addon.id,
        name: addon.addon_name,
        description: addon.description || '',
        price: Number(addon.price || 0)
      }));

    return {
      ...baseions,
      rich: true,
      card: trip.card || null,
      tripTitle: trip.title || baseions.tripTitle,
      depositPerTraveler: Number(trip.deposit_per_person || 0),
      currency: trip.currency || baseions.currency,
      minTravelers,
      maxTravelers,
      childAllowed: trip.child_allowed !== false,
      fixedDepartures,
      departures,
      addons,
      isSample: false,
      commerce: { ...baseions.commerce, departureIds }
    };
  };

  const payloadFor = (request, intent) => {
    const departureId = request.commerce.departureIds[request.startDate];
    if (!departureId) {
      const error = new Error('Please choose one of the available departures.');
      error.code = 'invalid_departure';
      throw error;
    }
    const counts = request.counts || { adult: request.travelers, single: 0, child: 0 };
    const rows = ['adult', 'single', 'child']
      .filter(type => counts[type] > 0)
      .map(type => ({ type, qty: counts[type] }));
    return {
      intent,
      shopify_product_id: request.commerce.productId,
      date_id: departureId,
      rows,
      addons: (request.addons || []).filter(addon => addon.qty > 0),
      payment_type: request.paymentType === 'full' ? 'full' : 'deposit',
      contact: request.lead
    };
  };

  // Asks the server for the real price. Nothing is created.
  const quote = async (request, apiBase) => {
    const result = await requestJson(`${apiBase}/api/booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadFor(request, 'quote'))
    });
    if (!result || !result.quote) {
      const error = new Error('We could not work out the price. Please try again.');
      error.code = 'no_quote';
      throw error;
    }
    return result.quote;
  };

  const createDepositReservation = async (request, apiBase) => {
    const result = await requestJson(`${apiBase}/api/booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadFor(request, 'checkout'))
    });

    if (!result || !/^https:\/\//.test(result.checkout_url || '')) {
      const error = new Error('Checkout could not be started. Nothing was charged. Please try again.');
      error.code = 'no_checkout_url';
      throw error;
    }

    return {
      reference: result.order_name || '',
      status: 'awaiting_payment',
      isSample: false,
      redirectUrl: result.checkout_url,
      tripId: request.tripId,
      tripTitle: request.tripTitle,
      startDate: request.startDate,
      travelers: request.travelers,
      depositPerTraveler: request.depositPerTraveler,
      depositDue: Number(result.quote && result.quote.due_now) || request.depositPerTraveler * request.travelers,
      currency: request.currency,
      createdAt: new Date().toISOString()
    };
  };

  window.ITAShopify = Object.assign(window.ITAShopify || {}, {
    booking: { loadions, loadCard, quote, createDepositReservation }
  });
})();
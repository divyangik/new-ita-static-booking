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

  const loadOptions = async (baseOptions, apiBase) => {
    const productId = baseOptions.commerce.productId;
    if (!productId) return null;

    const trip = await requestJson(`${apiBase}/api/booking?shopify_product_id=${encodeURIComponent(productId)}`);
    if (!trip || !trip.view) return null;

    const departureIds = {};
    (trip.dates || []).filter(isOpenDeparture).forEach(departure => {
      if (!departureIds[departure.departure_date]) departureIds[departure.departure_date] = departure.id;
    });
    const fixedDepartures = Object.keys(departureIds).sort();
    if (!fixedDepartures.length) return null;

    const maxTravelers = Number(trip.max_group_size) > 0 ? Number(trip.max_group_size) : baseOptions.maxTravelers;
    const minTravelers = Math.min(Math.max(Number(trip.min_group_size) || 1, 1), maxTravelers);

    return {
      ...baseOptions,
      tripTitle: trip.title || baseOptions.tripTitle,
      depositPerTraveler: Number(trip.deposit_per_person || 0),
      currency: trip.currency || baseOptions.currency,
      minTravelers,
      maxTravelers,
      fixedDepartures,
      isSample: false,
      commerce: { ...baseOptions.commerce, departureIds }
    };
  };

  const createDepositReservation = async (request, apiBase) => {
    const departureId = request.commerce.departureIds[request.startDate];
    if (!departureId) {
      const error = new Error('Please choose one of the available departures.');
      error.code = 'invalid_departure';
      throw error;
    }

    const result = await requestJson(`${apiBase}/api/booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'checkout',
        shopify_product_id: request.commerce.productId,
        date_id: departureId,
        rows: [{ type: 'adult', qty: request.travelers }],
        payment_type: 'deposit',
        contact: request.lead
      })
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
    booking: { loadOptions, createDepositReservation }
  });
})();
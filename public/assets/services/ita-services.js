// Talks to the ITA admin app (ita-package-manager). One place for the web address.
(() => {
  // 1) Paste your live admin app URL here (no slash at the end), e.g. https://ita-package-manager.onrender.com
  const liveApiBase = 'https://REPLACE-WITH-YOUR-ADMIN-APP-URL';
  // 2) On your own computer this fixed port is used (see vite.config.js in the admin app).
  const localApiBase = 'http://localhost:3100';

  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  const apiBase = isLocal ? localApiBase : liveApiBase;
  const configured = /^https?:\/\//.test(apiBase) && !apiBase.includes('REPLACE-WITH');

  const request = async (path, init) => {
    if (!configured) {
      const error = new Error('Booking is not connected yet.');
      error.code = 'not_configured';
      throw error;
    }
    let response;
    try {
      response = await fetch(apiBase + path, init);
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

  const post = (path, body) => request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const tripCache = {};
  const api = {
    configured,
    getTrip: productId => {
      if (!tripCache[productId]) {
        tripCache[productId] = request(`/api/booking?shopify_product_id=${encodeURIComponent(productId)}`)
          .catch(error => { delete tripCache[productId]; throw error; });
      }
      return tripCache[productId];
    },
    quote: body => post('/api/booking', { ...body, intent: 'quote' }).then(result => result.quote),
    checkout: body => post('/api/booking', { ...body, intent: 'checkout' }),
    enquiry: body => post('/api/enquiry', body),
    itinerary: body => post('/api/itinerary', body)
  };

  window.ITAServices = Object.freeze({ config: Object.freeze({ apiBase }), api: Object.freeze(api) });
})();
(() => {
  const config = Object.freeze({
    dataMode: 'mock'
  });

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const phonePattern = /^[+()\-.\s\d]{7,20}$/;

  const todayIso = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  const addDaysIso = (iso, days) => {
    const date = new Date(iso + 'T12:00:00');
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };

  const readBookingOptions = mount => {
    const dataset = mount.dataset;
    const earliestStart = addDaysIso(todayIso(), 1);
    return {
      tripId: (dataset.trip || '').trim(),
      tripTitle: dataset.title || 'Your journey',
      depositPerTraveler: Number(dataset.deposit || 0),
      currency: dataset.currency || 'USD',
      minTravelers: 1,
      maxTravelers: Number(dataset.max || 10),
      fixedDepartures: (dataset.dates || '').split(',').map(date => date.trim()).filter(Boolean),
      earliestStart,
      latestStart: addDaysIso(earliestStart, 730),
      commerce: { store: (dataset.store || '').trim(), variantId: (dataset.variant || '').trim() }
    };
  };

  const validateDepositRequest = (request, options) => {
    const errors = {};
    if (!request.startDate) errors.startDate = options.fixedDepartures.length ? 'Choose a departure.' : 'Choose a preferred start date.';
    else if (!options.fixedDepartures.length && (request.startDate < options.earliestStart || request.startDate > options.latestStart)) errors.startDate = 'Choose a date between tomorrow and two years from now.';
    if (!request.lead.name.trim()) errors.name = 'Add the lead traveler’s full name.';
    if (!emailPattern.test(request.lead.email.trim())) errors.email = 'Add a valid email address, e.g. jane@company.com.';
    if (!phonePattern.test(request.lead.phone.trim()) || request.lead.phone.replace(/\D/g, '').length < 7) errors.phone = 'Add a phone or WhatsApp number with country code.';
    if (!(request.travelers >= options.minTravelers && request.travelers <= options.maxTravelers)) errors.travelers = `Choose between ${options.minTravelers} and ${options.maxTravelers} travelers.`;
    return errors;
  };

  const adapters = {
    mock: {
      createDepositReservation: request => window.ITAMock.booking.createDepositReservation(request)
    }
  };

  const activeAdapter = () => {
    const adapter = adapters[config.dataMode];
    if (!adapter) throw new Error(`No data adapter is configured for mode "${config.dataMode}".`);
    return adapter;
  };

  window.ITAServices = Object.freeze({
    config,
    booking: Object.freeze({
      readBookingOptions,
      validateDepositRequest,
      createDepositReservation: request => activeAdapter().createDepositReservation(request)
    })
  });
})();

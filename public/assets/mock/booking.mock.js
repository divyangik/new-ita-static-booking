(() => {
  const SAMPLE_LATENCY_MS = 1100;
  const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  const forcedOutcome = () => new URLSearchParams(location.search).get('mock');

  const sampleReference = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const values = crypto.getRandomValues(new Uint8Array(6));
    return 'SAMPLE-' + [...values].map(value => alphabet[value % alphabet.length]).join('');
  };

  const createDepositReservation = async request => {
    await wait(SAMPLE_LATENCY_MS);
    if (forcedOutcome() === 'fail') {
      const error = new Error('The sample payment service is unavailable. Nothing was charged.');
      error.code = 'sample_failure';
      throw error;
    }
    return {
      reference: sampleReference(),
      status: 'sample',
      isSample: true,
      tripId: request.tripId,
      tripTitle: request.tripTitle,
      startDate: request.startDate,
      travelers: request.travelers,
      depositPerTraveler: request.depositPerTraveler,
      depositDue: request.depositPerTraveler * request.travelers,
      currency: request.currency,
      createdAt: new Date().toISOString()
    };
  };

  window.ITAMock = Object.assign(window.ITAMock || {}, {
    booking: { createDepositReservation }
  });
})();

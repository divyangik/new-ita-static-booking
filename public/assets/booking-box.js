(() => {
  const mounts = [...document.querySelectorAll('[data-ita-booking]')];
  const services = window.ITAServices;
  if (!mounts.length || !services) return;

  const money = (value, currency) => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  const escapeHtml = text => String(text ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const longDate = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const steps = [['details', 'Details'], ['review', 'Review'], ['done', 'Confirmation']];
  let dialogCount = 0;

  const init = mount => {
    const options = services.booking.readBookingOptions(mount);
    if (!(options.depositPerTraveler > 0)) return;
    const dialogId = `bb-dialog-${++dialogCount}`;

    const blankState = () => ({ step: 'details', startDate: '', travelers: 2, name: '', email: '', phone: '', policyAccepted: false, errors: {}, submitError: '', result: null, busy: false });
    let state = blankState();
    state.travelers = Math.min(2, options.maxTravelers);

    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = 'btn bb-open';
    openButton.setAttribute('aria-haspopup', 'dialog');
    openButton.setAttribute('aria-controls', dialogId);
    openButton.innerHTML = 'Reserve with a deposit <span class="arr">→</span>';
    const sampleNote = document.createElement('p');
    sampleNote.className = 'bb-mount-note';
    sampleNote.textContent = 'Sample booking mode · no payment is taken';
    mount.append(openButton, sampleNote);

    const dialog = document.createElement('dialog');
    dialog.className = 'bb-dialog';
    dialog.id = dialogId;
    dialog.setAttribute('aria-labelledby', `${dialogId}-title`);
    dialog.innerHTML = `<div class="bb-shell">
      <header class="bb-head">
        <div><small>Reserve with a deposit</small><h3 id="${dialogId}-title">${escapeHtml(options.tripTitle)}</h3></div>
        <button type="button" class="bb-x" data-close aria-label="Close">✕</button>
      </header>
      <p class="bb-sample" role="note"><b>Sample mode</b> No payment is taken and no booking is created. Shopify checkout will be connected in a later phase.</p>
      <ol class="bb-steps" aria-label="Booking progress"></ol>
      <div class="bb-body"></div>
    </div>`;
    document.body.appendChild(dialog);
    const stepList = dialog.querySelector('.bb-steps');
    let focusAfterClose = null;
    let scrollAfterClose = null;
    const body = dialog.querySelector('.bb-body');

    const depositDue = () => options.depositPerTraveler * state.travelers;
    const request = () => ({
      tripId: options.tripId,
      tripTitle: options.tripTitle,
      startDate: state.startDate,
      travelers: state.travelers,
      depositPerTraveler: options.depositPerTraveler,
      currency: options.currency,
      lead: { name: state.name.trim(), email: state.email.trim(), phone: state.phone.trim() },
      commerce: options.commerce
    });

    const renderSteps = () => {
      const activeIndex = steps.findIndex(([key]) => key === state.step);
      stepList.innerHTML = steps.map(([key, label], index) => `<li class="${index < activeIndex ? 'is-done' : ''} ${index === activeIndex ? 'is-current' : ''}" ${index === activeIndex ? 'aria-current="step"' : ''}><span>${index + 1}</span>${label}</li>`).join('');
    };

    const fieldError = key => state.errors[key] ? `<span class="bb-field-error" id="${dialogId}-${key}-error">${escapeHtml(state.errors[key])}</span>` : '';
    const invalidAttributes = key => state.errors[key] ? `aria-invalid="true" aria-describedby="${dialogId}-${key}-error"` : '';

    const detailsMarkup = () => {
      const dateField = options.fixedDepartures.length
        ? `<label class="bb-field"><span>Departure date</span><select name="startDate" ${invalidAttributes('startDate')}><option value="">Choose a departure</option>${options.fixedDepartures.map(date => `<option value="${date}" ${date === state.startDate ? 'selected' : ''}>${longDate(date)}</option>`).join('')}</select>${fieldError('startDate')}</label>`
        : `<label class="bb-field"><span>Preferred start date</span><input name="startDate" type="date" min="${options.earliestStart}" max="${options.latestStart}" value="${escapeHtml(state.startDate)}" required ${invalidAttributes('startDate')}>${fieldError('startDate')}<small class="bb-help">Dates are arranged privately. A specialist confirms availability.</small></label>`;
      return `<form class="bb-form" data-step="details" novalidate>
        <h4 class="bb-step-title" tabindex="-1">Journey details</h4>
        ${dateField}
        <div class="bb-group">
          <div class="bb-row"><span id="${dialogId}-travelers-label">Travelers<small>${money(options.depositPerTraveler, options.currency)} deposit per traveler</small></span>
          <div class="bb-step" role="group" aria-labelledby="${dialogId}-travelers-label">
            <button type="button" data-delta="-1" aria-label="Fewer travelers">−</button>
            <output aria-live="polite" data-travelers>${state.travelers}</output>
            <button type="button" data-delta="1" aria-label="More travelers">+</button>
          </div></div>
          <small class="bb-help" data-traveler-limit>${options.minTravelers}–${options.maxTravelers} travelers per reservation.</small>
          ${fieldError('travelers')}
        </div>
        <div class="bb-group"><h4>Lead traveler</h4>
          <label class="bb-field"><span>Full name</span><input name="name" autocomplete="name" value="${escapeHtml(state.name)}" required ${invalidAttributes('name')}>${fieldError('name')}</label>
          <label class="bb-field"><span>Email</span><input name="email" type="email" inputmode="email" autocomplete="email" value="${escapeHtml(state.email)}" required ${invalidAttributes('email')}>${fieldError('email')}</label>
          <label class="bb-field"><span>Phone / WhatsApp</span><input name="phone" type="tel" autocomplete="tel" placeholder="+1 555 010 0000" value="${escapeHtml(state.phone)}" required ${invalidAttributes('phone')}>${fieldError('phone')}</label>
        </div>
        <div class="bb-summary" aria-live="polite">
          <div class="bb-total due"><span>Deposit due now</span><b data-due>${money(depositDue(), options.currency)}</b></div>
          <p class="bb-hint">The remaining balance is arranged with your ITA Global specialist.</p>
        </div>
        <div class="bb-actions"><button type="submit" class="btn bb-primary">Review reservation <span class="arr">→</span></button></div>
      </form>`;
    };

    const reviewMarkup = () => `<form class="bb-form" data-step="review" novalidate>
      <h4 class="bb-step-title" tabindex="-1">Review your reservation</h4>
      <dl class="bb-review">
        <div><dt>Journey</dt><dd>${escapeHtml(options.tripTitle)}</dd></div>
        <div><dt>${options.fixedDepartures.length ? 'Departure' : 'Preferred start'}</dt><dd>${escapeHtml(longDate(state.startDate))}</dd></div>
        <div><dt>Travelers</dt><dd>${state.travelers}</dd></div>
        <div><dt>Lead traveler</dt><dd>${escapeHtml(state.name.trim())}</dd></div>
        <div><dt>Email</dt><dd>${escapeHtml(state.email.trim())}</dd></div>
        <div><dt>Phone</dt><dd>${escapeHtml(state.phone.trim())}</dd></div>
      </dl>
      <button type="button" class="bb-link" data-go="details">Edit details</button>
      <div class="bb-summary">
        <ul class="bb-lines"><li><span>${money(options.depositPerTraveler, options.currency)} × ${state.travelers} traveler${state.travelers === 1 ? '' : 's'}</span><span>${money(depositDue(), options.currency)}</span></li></ul>
        <div class="bb-total due"><span>Deposit due now</span><b>${money(depositDue(), options.currency)}</b></div>
        <p class="bb-hint">The remaining balance is arranged with your ITA Global specialist.</p>
      </div>
      <label class="bb-check"><input type="checkbox" name="policyAccepted" ${state.policyAccepted ? 'checked' : ''} ${invalidAttributes('policyAccepted')}><span>I have read the <a href="#policies" data-policy>cancellation policy</a> for this journey.</span></label>
      ${fieldError('policyAccepted')}
      ${state.submitError ? `<div class="bb-alert" role="alert"><b>Reservation not completed.</b> ${escapeHtml(state.submitError)} Your details are kept, so you can try again.</div>` : ''}
      <div class="bb-actions split">
        <button type="button" class="btn ghost bb-secondary" data-go="details" ${state.busy ? 'disabled' : ''}>Back</button>
        <button type="submit" class="btn bb-primary" ${state.busy ? 'disabled aria-busy="true"' : ''}>${state.busy ? '<span class="bb-spinner" aria-hidden="true"></span>Confirming…' : (state.submitError ? 'Try again' : `Confirm sample deposit · ${money(depositDue(), options.currency)}`)}</button>
      </div>
      <p class="bb-hint center" aria-live="polite" data-status tabindex="-1">${state.busy ? 'Confirming your sample reservation…' : 'Sample mode: confirming does not charge you or create a booking.'}</p>
    </form>`;

    const doneMarkup = () => {
      const result = state.result;
      return `<div class="bb-done">
        <span class="bb-done-mark" aria-hidden="true">✓</span>
        <h4 class="bb-step-title" tabindex="-1">Sample reservation complete</h4>
        <p>This is a demonstration only. No payment was taken and no booking was created.</p>
        <dl class="bb-review">
          <div><dt>Sample reference</dt><dd><b>${escapeHtml(result.reference)}</b></dd></div>
          <div><dt>Journey</dt><dd>${escapeHtml(result.tripTitle)}</dd></div>
          <div><dt>Preferred start</dt><dd>${escapeHtml(longDate(result.startDate))}</dd></div>
          <div><dt>Travelers</dt><dd>${result.travelers}</dd></div>
          <div><dt>Sample deposit</dt><dd>${money(result.depositDue, result.currency)}</dd></div>
        </dl>
        <p class="bb-hint">When checkout is connected, this step will hand over to Shopify’s secure payment page and a specialist will confirm availability.</p>
        <div class="bb-actions"><button type="button" class="btn bb-primary" data-close>Done</button></div>
      </div>`;
    };

    const render = focusTarget => {
      renderSteps();
      body.innerHTML = state.step === 'details' ? detailsMarkup() : state.step === 'review' ? reviewMarkup() : doneMarkup();
      body.scrollTop = 0;
      dialog.querySelector('.bb-shell').scrollTop = 0;
      const target = focusTarget ? body.querySelector(focusTarget) : body.querySelector('.bb-step-title');
      target?.focus({ preventScroll: false });
    };

    const updateTravelerDisplay = () => {
      body.querySelector('[data-travelers]').textContent = state.travelers;
      body.querySelector('[data-due]').textContent = money(depositDue(), options.currency);
      body.querySelectorAll('[data-delta]').forEach(button => {
        const delta = Number(button.dataset.delta);
        button.disabled = delta < 0 ? state.travelers <= options.minTravelers : state.travelers >= options.maxTravelers;
      });
    };

    const clearFieldError = name => {
      if (!state.errors[name]) return;
      delete state.errors[name];
      const field = body.querySelector(`[name="${name}"]`);
      field?.removeAttribute('aria-invalid');
      field?.removeAttribute('aria-describedby');
      body.querySelector(`#${dialogId}-${name}-error`)?.remove();
    };

    const submitDetails = () => {
      const errors = services.booking.validateDepositRequest(request(), options);
      state.errors = errors;
      const firstInvalid = ['startDate', 'name', 'email', 'phone'].find(key => errors[key]);
      if (Object.keys(errors).length) { render(firstInvalid ? `[name="${firstInvalid}"]` : '[data-delta]'); updateTravelerDisplay(); return; }
      state.step = 'review';
      state.submitError = '';
      render();
    };

    const submitReview = async () => {
      if (state.busy) return;
      if (!state.policyAccepted) {
        state.errors = { policyAccepted: 'Please confirm you have read the cancellation policy.' };
        render('[name="policyAccepted"]');
        return;
      }
      state.errors = {};
      state.busy = true;
      state.submitError = '';
      render('[data-status]');
      try {
        state.result = await services.booking.createDepositReservation(request());
        state.busy = false;
        state.step = 'done';
        render();
      } catch (error) {
        state.busy = false;
        state.submitError = error?.message || 'The service did not respond. Nothing was charged.';
        render('.bb-primary');
      }
    };

    const openDialog = () => {
      if (state.step === 'done') state = blankState();
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
      document.documentElement.classList.add('bb-lock');
      render(state.step === 'details' ? '[name="startDate"]' : null);
      if (state.step === 'details') updateTravelerDisplay();
    };

    const closeDialog = () => {
      if (state.busy) return;
      if (dialog.open && typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
    };

    dialog.addEventListener('cancel', event => { if (state.busy) event.preventDefault(); });
    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('bb-lock');
      if (state.step === 'done') state = blankState();
      const target = focusAfterClose || openButton;
      focusAfterClose = null;
      target.focus({ preventScroll: target !== openButton });
      if (scrollAfterClose) {
        scrollAfterClose.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        scrollAfterClose = null;
      }
    });

    dialog.addEventListener('click', event => {
      if (event.target === dialog || event.target.closest('[data-close]')) { closeDialog(); return; }
      const policyLink = event.target.closest('[data-policy]');
      if (policyLink) {
        event.preventDefault();
        const policies = document.querySelector('#policies');
        if (policies) {
          const heading = policies.querySelector('h2') || policies;
          heading.tabIndex = -1;
          focusAfterClose = heading;
          scrollAfterClose = policies;
        }
        closeDialog();
        return;
      }
      const stepButton = event.target.closest('[data-delta]');
      if (stepButton) {
        state.travelers = Math.max(options.minTravelers, Math.min(options.maxTravelers, state.travelers + Number(stepButton.dataset.delta)));
        clearFieldError('travelers');
        updateTravelerDisplay();
        if (stepButton.disabled) body.querySelector(`[data-delta="${-Number(stepButton.dataset.delta)}"]`)?.focus();
        return;
      }
      const goButton = event.target.closest('[data-go]');
      if (goButton && !state.busy) {
        state.step = goButton.dataset.go;
        state.errors = {};
        render(state.step === 'details' ? '[name="startDate"]' : null);
        if (state.step === 'details') updateTravelerDisplay();
      }
    });

    dialog.addEventListener('input', event => {
      const { name, type, checked, value } = event.target;
      if (!(name in state)) return;
      state[name] = type === 'checkbox' ? checked : value;
      clearFieldError(name);
    });
    dialog.addEventListener('change', event => {
      if (event.target.name === 'startDate') { state.startDate = event.target.value; clearFieldError('startDate'); }
      if (event.target.name === 'policyAccepted') { state.policyAccepted = event.target.checked; clearFieldError('policyAccepted'); }
    });

    dialog.addEventListener('submit', event => {
      event.preventDefault();
      const step = event.target.dataset.step;
      if (step === 'details') submitDetails();
      if (step === 'review') submitReview();
    });

    openButton.addEventListener('click', openDialog);
  };

  mounts.forEach(init);
})();

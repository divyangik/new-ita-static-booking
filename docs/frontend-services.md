# Frontend data layer (Phase 1: mock mode)

Scope so far: the Boquete and Japan trip detail pages only.

## Files

| File | Role |
|---|---|
| `public/assets/services/ita-services.js` | The only API the UI calls. Exposes `window.ITAServices.booking` and `config.dataMode` (currently `'mock'`). |
| `public/assets/mock/booking.mock.js` | Sample adapter. Waits ~1.1 s, returns a `SAMPLE-XXXXXX` reference. Nothing is stored, sent or charged. |
| `public/assets/booking-box.js` / `.css` | "Reserve with a deposit" dialog: Details → Review → Confirmation, with loading, validation, success and failure states. |

The trip pages load them in this order (all `defer`): `mock/booking.mock.js`, `services/ita-services.js`, `booking-box.js`.

## Service contract

```
ITAServices.booking.readBookingOptions(mountElement) -> BookingOptions
ITAServices.booking.validateDepositRequest(request, options) -> { field: message }
ITAServices.booking.createDepositReservation(request) -> Promise<Reservation>
```

`request`:

```
{ tripId, tripTitle, startDate: 'YYYY-MM-DD', travelers, depositPerTraveler, currency,
  lead: { name, email, phone },
  commerce: { store, variantId } }   // from data-store / data-variant on the mount, unused in mock mode
```

`Reservation` (resolve):

```
{ reference, status, isSample, tripId, tripTitle, startDate, travelers,
  depositPerTraveler, depositDue, currency, createdAt }
```

On failure, reject with an `Error` whose `message` is safe to show the customer (optional `code`). The dialog shows it, keeps the customer's details and offers "Try again".

## Testing the failure state

Append `?mock=fail` to either trip URL. Confirming then shows the error alert and the retry button.

## Phase 3 (not implemented)

1. Add an adapter next to `mock` in `ita-services.js`, e.g. `packageManager`, that calls the ITA Package Manager API (Remix/FastAPI) and/or builds the Shopify checkout hand-off from `request.commerce`.
2. Switch `config.dataMode`.
3. Keep the UI untouched. It only depends on the contract above.

Booking options (deposit, currency, max travelers, fixed departures) currently come from `data-*` attributes on `[data-ita-booking]`. In Phase 3, `readBookingOptions` can fetch them from the API by `data-trip` instead.

## Images

Photos on both trip pages are served from `img/trips/<trip>/opt/<name>-{800,1600[,2400]}.jpg` via `srcset`. Originals are kept, and the lightbox still opens originals through Netlify Image CDN.

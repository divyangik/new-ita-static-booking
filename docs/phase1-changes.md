# Phase 1 changes: Boquete & Japan trip detail pages

## Modified files (5)
- `public/trips/boquete-panama-real-estate-lifestyle-discovery.html`: responsive images, `data-trip` on the booking mount, new scripts, CSS cache-busting.
- `public/trips/japan-a-journey-through-cultural-depth-timeless-elegance.html`: same changes, plus:
  - hero image is now `kyoto-yasaka.jpg`
  - Day 1 image is now `tokyo-temple.jpg`
  - the booking card's "Reserve your place" button is outlined (wording unchanged)
- `public/assets/booking-box.js`: deposit dialog rewritten for sample mode (no Shopify redirect).
- `public/assets/booking-box.css`: dialog styles.
- `public/assets/trip-detail.css`: scroll offset for `#highlights`.

## New files
- `public/assets/services/ita-services.js`: data-access layer used by the dialog.
- `public/assets/mock/booking.mock.js`: sample-data adapter.
- `public/img/trips/japan/opt/` (29 files) and `public/img/trips/boquete/opt/` (37 files): resized copies of the original photos.
- `docs/frontend-services.md`: service contract and Phase 3 notes.
- `docs/phase1-changes.md`: this file.

## Not changed
`netlify.toml`, `public/assets/app.js`, `public/assets/data.js`, `cinematic.*`, `style.css`, all 15 other pages and all original images. `tokyo-arrival.jpg` and `cover.jpg` remain in `img/trips/japan/`. `cover.jpg` is still the Japan page's social-share (`og:image`) picture.

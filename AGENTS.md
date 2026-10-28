# Project guidance

## Architecture

This is a static multi-page ITA Global website. Netlify publishes `public` without a build command and serves the `.html` pages at clean paths. Do not migrate the site to a framework or replace working tools with mockups unless explicitly requested.

## Key directories

- `public/*.html` contains all 15 original routes and static forms available to Netlify's form parser.
- `public/assets/style.css` is the recovered baseline stylesheet. `cinematic.css` layers the luxury brand system and responsive layout on top of it.
- `public/assets/app.js` retains original catalog filtering, trip cards, FAQs, profiles, calculators and submission behavior.
- `public/assets/cinematic.js` owns GSAP/ScrollTrigger choreography and keyboard/focus enhancements.
- `public/assets/earth.js` imports locally hosted Three.js from `assets/vendor` and owns WebGL resources.
- `public/assets/data.js` is the original static catalog and reference data; it is not persistent application storage.
- `public/trips/*.html` holds in-site journey detail pages. Map a catalog `id` to its page in the `tripPages` object in `app.js` so cards open it instead of the external store URL. Detail styling and behavior live in `assets/trip-detail.css` and `assets/trip-detail.js` (`td-` class prefix); photographs for each journey sit in `public/img/trips/<journey>/`.
- `public/img` contains brand imagery and locally hosted source photographs; HTML photographs use Netlify Image CDN.

## Conventions

Use vanilla JavaScript and progressive enhancement. Keep modifications surgical and preserve routes, published copy, testimonials, prices, calculator IDs and form field names. Use meaningful variable names and no new inline code comments. Use CSS custom properties and the established navy, ivory, forest and muted champagne palette.

Keep original calculator formulas authoritative. Regional rates, travel multipliers, group discounts, transfer costs, extension prices and advisory fees must not change as part of a visual redesign. Numeric animation may change presentation, never calculation results. Metrics must be sourced from original content, not invented.

## Visual system notes

- Type sizes come from the `--fs-*` tokens at the top of `cinematic.css`. Navigation is 15px, supporting text never drops below 10–11px even on phones, and form inputs stay at 16px so iOS does not zoom.
- The desktop navigation collapses into the drawer at 1180px and below.
- Inner-page heroes use a `.phero-art` layer (ambient glows, orbit ring and a page-specific photo, world map or SVG motif). Photo heroes use `--hero-image`, `--hero-image-sm` and `--hero-pos` custom properties on the section and load through Netlify Image CDN.
- The homepage globe destinations, routes and label placement live in the `destinations` and `routePairs` arrays in `earth.js`. Coordinates must be real latitude/longitude values. Routes marked `secondary` and second-tier labels are hidden on screens 640px wide or smaller.
- Journeys search/filter markup keeps the IDs `f-q`, `f-sort`, `f-region`, `f-cat` and `f-count` that `app.js` depends on. Category tile icons are CSS-only and keyed on each button's `data-v`.
- Destination headings keep the comma in the city's text node (`Bali,<em> differently.</em>`) so the line break never lands before the comma.

## Motion and accessibility

Use GSAP matchMedia contexts and clean them up when leaving the page. Limit pinning to the destination and collection sections on desktop at least 1024px wide. Preserve native scrolling and keyboard operation. Reduced-motion mode must remain functional and avoid scroll pinning, parallax, count-up animation and continuous globe movement. Keep hidden scene links inert, restore dialog focus and preserve mobile menu focus containment.

The globe must keep its CSS fallback, pause when offscreen or when the document is hidden, cap pixel density and dispose of GPU resources and observers on navigation. Do not depend on remote runtime libraries; GSAP and Three.js are hosted locally.

## Forms and storage

Inquiry forms and the newsletter submit to Netlify Forms using URL-encoded AJAX requests. Show success only when the response is successful; preserve input on error. Keep static `data-netlify` declarations, hidden `form-name` fields and honeypots. If form integration changes, read the Netlify Forms skill and run its activation script. Configure notifications through Netlify settings, not by embedding secrets.

This site does not need an application database. Use the Netlify database/storage skills if new persistent structured data or file storage is introduced. Never store user submissions in local JSON files or in-memory arrays.

## Configuration and validation

`netlify.toml` publishes `public` directly. There is no bundler or compile step. The environment's project instructions prohibit running build, test or development-server validation commands during implementation; deployment validation is handled by the platform. Review edited source and disclose browser/deployment checks that remain outstanding.

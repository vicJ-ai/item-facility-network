# ITEM Locations Network

A responsive React + TypeScript facility-network prototype. It uses real Leaflet mapping with Esri street and satellite tiles, plus the supplied ITEM logo, palette, and Satoshi typography.

## Data boundary

This is a screenshot-based interface prototype, not a live WMS, YMS, facility, inventory, or operations product. The roster contains 29 facility addresses: the original 17, ten UF/CUBEWORKS additions supplied on 2026-09-28, Garden City from its official facility sheet, and University Park supplied on 2026-10-01. Source spelling and later user-confirmed address corrections are preserved with provenance notes.

Twenty-six of the 27 original roster records carry status `Active`; the user set Facility 23, Houston Navigation, to `Unassigned` on 2026-10-01. Facility 29, University Park (`701 S Central Ave, University Park, IL 60484`), was added on 2026-10-01 with only its address, so it is also `Unassigned` and still has no photo, plan, or hours. It has since gained contacts and square footage, and on 2026-10-02 it joined the Illinois Dashboard region and the Preview tour beside Joliet. Facility 28, Garden City (`140 Prosperity Dr, Garden City, GA 31408`), was added from the official 804 – Garden City facility sheet; that sheet states no status, facility type, or operating hours, so the record is `Unassigned`, shows "Type not specified" and "Hours not provided", and is left out of the open-now count. Users can change the local working status to Unassigned, Active, Coming Soon, or Planned; a changed value is stored only in browser localStorage under `facility-status-assignments-v3`. Sixteen facilities have supplied site plans and sourced plan facts; the City Park, Garden City, Jacksonville, Pooler Seabrook, Roanoke, and Summerville plans come from the official one-page facility sheets in `extra_resources/Facility information/`. Those facts describe the supplied drawing or user statement, not current availability or operating capacity, and missing values are not inferred. Operational details are not connected to a live system.

28 of the 29 roster records show media (University Park shows the photo-unavailable state): twelve records use official UNIS directory media, fifteen use user-provided photos, and Garden City uses the building photo from its official facility sheet. Four of the ten additions have exact address matches in the official directory: West Sacramento, Sparks, Navigation Boulevard in Houston, and Delp Street in Memphis. Their images are address-correlated listing media and do not independently prove building identity. The other six additions (Waddell, Ontario, Kent, Salt Lake City, Somerset, and Plano) have no exact official directory match and use user-provided photos supplied on 2026-09-29. Existing user-photo limitations remain unchanged. Each media record uses a deterministic local square roster thumbnail and a separate uncropped detail asset. URLs or source markers, alt text, retrieval date, dimensions, match rationale, and limitations are recorded in `src/data/facility-media.ts` and [PHOTO-PROVENANCE.md](./PHOTO-PROVENANCE.md). No stock, neighboring-facility, or uncertain building image is substituted.

Thirteen facilities also have separate user-supplied galleries totaling 44 photos; Jacksonville and Summerville use the official facility-sheet exterior photo as their cover, and Citypark uses its brochure exterior. These galleries do not replace the target's 17 roster/detail media records: both are shown separately in the Photos tab with their own provenance. Facility 07 Seabrook retains its user-provided screenshot record and has no substituted gallery; its site plan comes from the official 823 – Pooler sheet. Gallery metadata lives in `src/data/facility-user-photos.ts`; plan assets and facts live in `src/data/facility-site-plans.ts`.

The Documents tab generates a four-page US-letter facility profile in the browser from the selected facility's current data. Public profiles omit Operations contacts and state that administrator access is required. An approved signed-in administrator receives the selected facility's guarded contact record and the PDF includes every confidently matched role, name, email, supplied phone, and source-row attribution; unmatched facilities show a concise review state. Staff portraits are never fetched or embedded by PDF generation. The remaining pages retain the supplied plan or explicit missing-plan state, sourced facts and operating hours, and the selected facility's facility-photo gallery or existing media record.

The Tennessee address intentionally remains `4550 Quality Drive, TN` because no city or ZIP was supplied. Geocoder-inferred locality data is not added to the user-provided address.

Facility operating hours are stored separately in `src/data/facility-hours.ts`. Thirteen original-roster facilities retain confidently mapped hours from the user-provided 26-row list; four original records were confirmed in a follow-up; and all ten roster-expansion facilities were user-confirmed. Those 27 facilities display 8:00 AM–4:30 PM M-F with the supplied local abbreviation. Garden City and University Park have no supplied hours and show an explicit unavailable state. The app preserves literal PST, EST, CST, or MST labels rather than converting the supplied schedule.

Each facility's Operations contact tab is public and reads from the server-only registry in `server/data/facility-operations.ts`, which contains 118 role-specific entries across all 29 facilities. The records combine the user contact sheet, official facility sheets, and direct user updates through 2026-10-02. The regional VP split assigns John Gleason to Texas, Savannah, Florida, and South Carolina, and John Diaz to the remaining buildings. Five facilities still need complete site-level mapping and display only explicitly assigned people: `pooler-morgan-lakes`, `west-sacramento-overland`, `houston-navigation`, `somerset-cottontail`, and `university-park-central`. Current and superseded supplied portrait bytes live outside the static root under `private-media/operations`; only explicitly allowlisted filenames are served through public `no-store` routes, and the registry and portrait paths are not embedded in the Vite bundle. The top-level Operations availability workspace, Analytics, Reports, administrator configuration, availability history, and every mutation remain restricted to active administrators.

## Administrator access

Public browsing, maps, galleries, plans, and public PDFs do not require sign-in. The top-right **WISE sign in** action sends credentials only to the same-origin Node BFF. The BFF exchanges them with the configured ItemGPT password-grant endpoint, enriches and verifies the immutable IAM identity through WMS, revalidates active internal-employee eligibility through the trusted directory, and returns only an opaque host-only session cookie. IAM tokens and passwords are not returned to or stored by the browser.

An active ordinary administrator can open the top-level Operations availability workspace, Analytics, and Reports. An active configuration administrator can also open **Configure Admins**, select a directory-verified WISE employee, set **Access active**, and use the exact checkbox **Enable configuration access**. Grants bind to immutable IAM user IDs. PostgreSQL transactions and advisory locks protect bootstrap and access mutations; self-demotion/deactivation, last-configuration-admin removal, stale concurrent edits, inactive grants, and unverified employee selections are rejected and audited. Grant status is read from PostgreSQL on every protected request, so deactivation revokes access immediately.

Initial access is server-configured by exact IAM user ID, tenant, username, and verified profile email. The bootstrap identity is accepted only while no active persistent configuration administrator exists. A successful exact sign-in creates the permanent actor transactionally. An existing inactive bootstrap record blocks fallback bootstrap access. Missing IAM/WMS configuration never creates a successful local login; public browsing continues while sign-in fails closed.

The BFF enforces canonical `PUBLIC_ORIGIN` on mutations, validates per-session CSRF tokens, throttles failed logins, sets `HttpOnly`, host-only, `SameSite=Strict` session cookies (`Secure` under HTTPS), and applies `no-store` to protected JSON and allowlisted portraits. Set `TRUST_PROXY=true` only behind the trusted single deployment proxy. Portal context is tenant `LT` and facility `LT_F1`; directory entries must be active internal employees in the trusted tenant. This portal does not create local passwords, customer accounts, or WMS roles.

## Available space

The October 2026 availability figures in `src/data/facility-space.ts` are read-only source snapshots, not database seeds or current operational truth. Sixteen sites have supplied figures, including 0 SQF at Garden City and University Park; Riverside's 120,000 SQF is marked not confirmed, and sites without either a snapshot or saved value show `Pending`. When no persistent administrator value exists, the snapshot is the visible fallback and is labeled with its source month. A database value always wins, including zero, and appears immediately in the map preview, Overview, full details, Preview tour, and generated PDF. The top-level Operations workbench shows the effective value and its source. Its first save creates version 1 without overwriting or seeding other facilities, and the same transaction audits whether the previous effective value was a source snapshot or Pending.

Every facility has a total square footage. A user-provided total (`facilityTotalSquareFeet`, supplied on 2026-10-01 and 2026-10-02) wins; otherwise the total is the site plan's building area. This covers sites without plans, the Jacksonville and Pooler Seabrook sheets that state no area, and Pooler Morgan Lakes, whose plan remains an immutable sourced fact of 499,500 SF while its newer effective total is 302,400 SQF. Every rendered square-footage figure in the app, Preview tour, and PDF uses `SQF`; site-plan source data retains the sheets' original `SF` unit. Each facility's Overview also has a Bulk & rack section (bulk floor space in SQF, rack capacity in pallet positions) backed by `facilityBulkRack` in the same file. Joliet's bulk/rack figures remain a separate October snapshot and are never inferred from availability; other sites show `Not provided`.

Active administrators can save Available, Bulk, and Rack independently from the top-level Operations workspace. Saved Bulk and Rack values are stored in additive PostgreSQL tables and override the static snapshot field by field; an exact saved Bulk value suppresses a snapshot-only "up to" range. Omitted fields remain unchanged, initially blank fields remain unset, and zero is valid. Combined saves append immutable per-field audit events in the same transaction. The public `/api/bulk-rack` projection contains only facility IDs and saved numeric values, while authenticated versions and audit identity remain under `/api/admin/*`. Before a future deployment containing this feature, run the existing compiled migration entrypoint with `npm run migrate`; this repository change does not execute the migration against production.

## Coordinates

Map coordinates were resolved in September 2026 with the public Esri World Geocoding Service and are stored with a source, precision, returned match, and any relevant limitation in `src/data/facilities.ts`.

The selected facility's Overview tab uses Google's keyless `www.google.com/maps?q=...&output=embed` iframe form with the supplied roster address. This is distinct from the official, key-required Google Maps Embed API v1: no API key is present or required by this prototype, and the undocumented keyless form may be less stable. If the frame is blocked or does not load, the UI falls back to an external Google Maps link.

- Most records resolved to Esri `PointAddress` matches.
- Riverside and both El Paso records resolved at `StreetAddress` precision.
- Building 2 / Building 5 identifiers were not independently resolved and are documented in the matching record.
- Summerville uses the official 875 – Summerville facility sheet address `369 N Cypress Dr` and is pinned at the coordinates labeled on its site plan (33.10855482, -80.19483182) instead of an Esri match.
- `3901 Brandon Rd., Joliet, IL 60436` is pinned at the Esri point-address match (which the geocoder places in Elwood, IL 60421). The pin was confirmed correct in September 2026 and is treated as precise; the supplied address is unchanged.
- The Kent range is pinned at the `19821 85th Ave S` endpoint candidate. The pin was confirmed correct in September 2026 and is treated as precise; the supplied range remains unchanged.
- The Plano dual address uses the primary `910 10th St` point candidate and preserves `880 F Ave.` as the unpinned alternate without inventing a ZIP.
- `6801 N Cotton Ln, Waddell, AZ 85355` is pinned at the numbered Esri point address (which the geocoder places in Litchfield Park 85340). The pin was confirmed correct in September 2026 and is treated as precise; the supplied city and ZIP are unchanged.

Coordinates support visualization only. “Open in Maps” searches the complete user-provided address rather than treating stored coordinates as authoritative.

## Dashboard globe

The Dashboard opens on a 3D globe built with [CesiumJS](https://cesium.com/platform/cesiumjs/) (`src/components/DashboardGlobe.tsx`). Daytime imagery is Esri World Imagery (Satellite, the globe default) or World Street Map. The night side shows NASA's VIIRS Black Marble city lights from NASA GIBS. Cesium lights the globe from the real sun position at the time shown in the time control, so the terminator, twilight, and city lights all follow the clock. No Cesium ion account or API key is used.

Facility pins are HTML elements placed over the globe, so they keep the same styling, open/closed badges, keyboard focus, hover previews, and "Open facility NN in Facilities" behavior as the flat map. Pins on the far side of the planet are hidden. Choosing a region flies the camera to that region, leaving room for the Regions panel, and the recenter button flies back to the whole network.

The button below the recenter control switches between the globe and the flat Leaflet map. The choice is saved in browser localStorage under `dashboard-projection-v1`. Browsers without WebGL fall back to the flat map automatically. CesiumJS is about 3.9 MB (0.8 MB brotli), so it loads only when the globe is first needed, starting when the pointer reaches the Dashboard button, and its workers and assets are copied to `/cesium/` at build time by `vite-plugin-static-copy`. Once shown, the globe stays loaded: switching to the flat map or the Facilities view hides it and pauses its rendering instead of rebuilding it. The Facilities view keeps the Leaflet map.

## Region highlight

Choosing a Dashboard region outlines it in brand purple, tints it lightly, and dims everything outside it; the highlight fades in as the camera moves there. Both the globe and the flat map frame the whole region, not only its facilities. The other regions' pins stay on the map, faded, and remain clickable. On the flat map the highlight is an SVG Leaflet layer (`src/components/RegionHighlightLayer.tsx`); on the globe it is a canvas-drawn imagery layer (`src/components/region-highlight-imagery.ts`), so it follows the globe's lighting.

Region shapes come from US Census cartographic boundaries via the public-domain [us-atlas](https://github.com/topojson/us-atlas) 1:10m county file, simplified to about 200 m and stored in `src/data/region-boundaries.json`. State regions use the state outline. Southern California is the ten counties conventionally grouped as SoCal (Imperial, Kern, Los Angeles, Orange, Riverside, San Bernardino, San Diego, San Luis Obispo, Santa Barbara, Ventura); Northern California is the remaining 48. The shapes are for visual grouping only. To regenerate them after changing the regions, run `node scripts/build-region-boundaries.mjs`.

## Preview tour

The Dashboard's **Preview** button plays a looping, full-cinematic tour of the network on the globe, about four and a half minutes per loop. Black bars slide in and the regular map controls step aside. The tour visits the 13 regions west to east as chapters. Every region, including the single-facility ones, opens on the region itself, with its outline drawing itself and everything around it dimmed; the tour then flies to each facility in turn, and zooms back out to the region before moving on. Facilities within 80 km of each other get a short slide instead of a flight. Every facility is held for the same 4.5 seconds: the camera settles into a tilted, slowly orbiting view while the facility number, city, state, address, and live open/closed state appear, and the top bar shows the chapter and the facility's local time. The finale lights every region and pin, then the loop begins again.

The chapter order and timing live in `src/lib/preview-tour/script.ts`; the camera paths (great-circle flights with Van Wijk and Nuij's smooth zoom-and-pan) in `flight.ts`; and the timed sequence in `choreography.ts`. The camera is a pure function of tour time, so Pause, Previous, Next, the progress ticks, and the loop always land on the same shot. `src/components/PreviewTour.tsx` drives the overlay with [GSAP](https://gsap.com), which loads only when Preview is first clicked.

Esc, Stop, or any drag, scroll, or click on the map ends the tour and puts back the camera, region selection, and panels exactly as they were; clicking a pin during the tour opens that facility. Starting from the flat map, the tour borrows the globe without changing the saved projection preference. With reduced motion, the tour cuts between shots instead of flying. Browsers without WebGL get a simpler flat-map version. Captions use only the roster data: the Tennessee address has no supplied city, so its title shows the state.

## Performance

**Globe quality.** The gauge button below the globe/map toggle chooses how much work the globe does: **Automatic** (the default), **High**, **Balanced**, or **Performance**. The choice is saved in localStorage under `globe-quality-v1`.

| | High | Balanced | Performance |
|---|---|---|---|
| Anti-aliasing (MSAA) | 4× | 2× | off |
| Resolution | 100% | 100% | 75% |
| Tile detail (screen-space error) | 2 | 2.5 | 4 |
| Tile cache | 300 | 300 | 200 |
| Preview frame-rate cap | 60 fps | 60 fps | 30 fps |
| Tour outline | glow | glow | plain line |

Automatic picks a starting tier from the graphics hardware reported by WebGL (`src/lib/globe-quality.ts`):
- software renderers → Performance;
- integrated GPUs such as Intel UHD/Iris → Balanced;
- anything else → High.

While running, it steps down one tier whenever motion stays below about 20 fps (Cesium's `FrameRateMonitor`), and it never steps back up within a visit.

Every tier also leaves out work the globe does not show:
- the star skybox, sun, and moon;
- the 2D/Columbus-view geometry;
- the order-independent translucency pass;
- NASA night lights below 400 km, where globe lighting has already faded out.

**Preview tour.** The tour renders continuously but capped at the tier's frame rate. It loads 3× coarser imagery while flying between facilities, and full detail returns before each arrival, where the tour already waits for sharp tiles. The drawn region outline is one `PolylineCollection` that updates only as it grows, and the highlight layer for each region is kept while the tour runs, so returning chapters do not redraw it. Only the progress bar's fill moves each frame.

**Delivery.**
- `npm run build` finishes with `scripts/precompress.mjs`, which writes `.br` and `.gz` copies of every text file in `dist/`. That's about 9.2 MB of JavaScript, CSS, JSON, and wasm, down to about 2.4 MB brotli.
- The same-origin Node server compresses responses and caches:
  - content-hashed `/assets/` for a year;
  - `/cesium/`, `/media/`, `/fonts/`, and `/brand/` for a week;
  - `index.html` never, so a deploy takes effect at once.
- Precompressed copies remain available for a deployment proxy or CDN that supports static Brotli negotiation.
- The Satoshi fonts are served as WOFF2 (about 43 KB each instead of 128 KB, converted with `node scripts/convert-fonts.mjs`) with the TTFs as fallback. `index.html` preloads the regular weight and preconnects to the Esri and NASA tile servers.

**Checking a device.** Add `?debug=perf` to the address to show a readout of the frame rate, JavaScript heap, the quality tier in use, and the globe's GPU memory ([webgl-memory](https://github.com/greggman/webgl-memory), loaded only with that flag), alongside Cesium's own frame counter. GPU memory should stay flat across Preview loops. For a frame-by-frame look at draw calls, capture a frame with the [Spector.js](https://spector.babylonjs.com/) browser extension.

## Day and night

The map shades the night side of the Earth for the current time and marks the point where the sun is overhead. The shade deepens through civil, nautical, and astronomical twilight, so the terminator reads as a soft band rather than a hard edge. Sun position comes from a low-precision solar ephemeris in `src/lib/solar.ts` (accurate to about 0.01° for 1950–2050); no data service is called.

The time control in the lower-right corner of the map shows the time and UTC, and how many facilities are inside their supplied operating hours. The Zone picker sets which time zone the clock, date field, and slider use: the viewer's device zone by default, the five facility zones and UTC first, then every IANA zone the browser supports. Changing the zone relabels the current map time rather than moving it (`src/lib/time-zone.ts`). A date-and-time field accepts any date from 1950 through 2050, a slider scrubs the time of day, and "Back to now" returns to the live clock, which updates every 30 seconds. Shading can be turned off, and that choice, the chosen zone, and the panel's collapsed state are saved in browser localStorage under `map-day-night-v1`.

Open or closed status is computed in `src/lib/facility-open.ts` from each facility's supplied hours and time-zone label, read as local wall-clock time. PST, CST, and EST map to their IANA zones and follow daylight saving time. MST maps to `America/Phoenix` for Arizona, which does not observe daylight saving time, and to `America/Denver` elsewhere. Holidays and exceptions are not modeled. Status appears as a sun or moon badge on each pin, in the roster, in pin previews, and in the Overview and Full Details hours.

## Brand

- The official ITEM SVG lockup is used without recoloring.
- Colors follow the ITEM design system at design.item.com: purple `#6B46C1` is the primary brand color, and orange `#F97316` marks "open now" and the sun. Tokens, type scale, and component rules are documented in [DESIGN.md](./DESIGN.md).
- Satoshi Variable and Satoshi Variable Italic are loaded from the supplied brand kit, as WOFF2 conversions of the supplied TTFs (which remain the fallback).

## Run locally

```bash
npm install
npm run build
npm run dev
```

Copy `.env.example` to the ignored `.env.local` and set PostgreSQL, `PUBLIC_ORIGIN`, a random 32+ character session secret, the ItemGPT/WMS endpoints and service credentials, and all four exact bootstrap identity values. `SESSION_SECRET` HMAC-protects the opaque session and CSRF verifiers stored in PostgreSQL. `DATABASE_SCHEMA` selects a validated PostgreSQL schema; test runners use dedicated schemas and never truncate the runtime schema. The local server binds `0.0.0.0` on `PORT` (4210 in the example). The schema and tables are created idempotently at startup.

For a production preview:

```bash
npm run build
npm run migrate
npm run start
```

Run `npm run migrate` as the production predeploy job after the build and before starting the new runtime. It is additive and idempotent: existing administrator, session, and audit data are preserved while required tables and indexes are created.

The preview uses the exact `PUBLIC_ORIGIN` and `PORT` configured in `.env.local`. For the canonical local preview, use `PUBLIC_ORIGIN=http://127.0.0.1:4210` and `PORT=4210`.

## Container deployment

The production image builds the Vite bundle and Node server, installs production dependencies, includes private Operations portraits outside the static root, and serves the same-origin BFF on port `8080`. Supply required environment variables at runtime; do not bake secrets into the image. `/api/health` is the container health-check endpoint.

```bash
docker build -t locations-network .
docker run --rm --env-file .env.production -p 8080:8080 locations-network
```

Main-map basemap tiles are loaded in the browser from Esri, globe night lights from NASA GIBS, and the selected Overview map from Google Maps. Authentication requires ItemGPT, WMS profile/directory access, and PostgreSQL.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
npm run test:server
npx playwright install chromium
npm run test:e2e
```

The Playwright suite verifies all 29 exact addresses, all 29 map pins, Bulk & rack figures, reported available space, Preview tour stop cards, twelve official records plus fifteen user-provided photos, supplied galleries, 16 site plans, exact local asset responses, four-page selected-facility PDF downloads, all 27 operating-hours records plus Garden City's missing-hours state, Operations records for all 29 facilities, including the regional VP split and the five sites awaiting site-level contacts, square-footage hover previews, square thumbnail sizing, uncropped detail media, forced image-error fallback, mobile address wrapping, photo provenance, address/city/state/ZIP/type search and filtering, local status assignment and persistence, the confirmed Waddell and Kent pins, unavailable property states, light/dark persistence, and basemap switching.

The existing Dashboard tests run against the flat map. `tests/globe.spec.ts` covers the globe: imagery and night-light requests, all 27 pins, hover previews, opening a facility, region flights, zoom and recenter, lighting and layer controls, the persisted globe/flat toggle, and the fallback when WebGL is unavailable. Headless Chromium renders WebGL with SwiftShader, enabled in `playwright.config.ts`.

`tests/preview.spec.ts` covers the Preview tour: the Washington opening chapter, hidden controls, Previous/Next and progress-tick jumps, the Tennessee title, the finale and loop, restoring the region, panel, camera, and flat-map preference, handing control back on drag or pin click, and reduced-motion cuts. `tests/quality.spec.ts` covers the quality setting: Automatic resolving to Performance under software WebGL, choosing and persisting a tier, the menu closing on Esc or an outside click, the globe surviving projection and view switches without duplicate pins, coarse imagery during tour flights, and the `?debug=perf` readout. Software WebGL is memory-hungry, so on smaller machines run the suite with `npx playwright test --workers=2`. `?previewSpeed=20` plays the tour faster for these tests, and `?previewFps=6` caps its frame rate so the continuously rendered globe does not starve the other suites running in parallel.

`tests/daynight.spec.ts` checks the subsolar point against the 2026 equinox and solstices, the twilight shading curve, and open/closed rules across daylight saving time, Arizona, weekends, and boundary minutes. With a fake browser clock, it also checks shade opacity under individual pins against the solar model, time and date scrubbing, the open count, shading and panel persistence, and that the time control never overlaps other map controls on desktop or mobile.

## Map attribution

Leaflet displays Esri attribution for the street and satellite basemaps. The globe shows Esri and NASA Black Marble credits in its lower-left corner, along with the CesiumJS logo. Network access is required for basemap tiles; the application data and brand assets are local. The public Esri tile endpoints are used without an API key; confirm Esri's terms of use, or move to an ArcGIS Location Platform key, before production use.

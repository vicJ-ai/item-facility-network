# ITEM Locations Network

A responsive React + TypeScript facility-network prototype. It uses real Leaflet mapping with Esri street and satellite tiles, plus the supplied ITEM logo, palette, and Satoshi typography.

## Data boundary

This is a screenshot-based interface prototype, not a live WMS, YMS, facility, inventory, or operations product. The roster contains exactly 27 user-provided facility addresses: the original 17 plus ten UF/CUBEWORKS additions supplied on 2026-09-28. Their original spelling, punctuation, ranges, dual addresses, parenthetical address, building identifiers, and supplied city/state/ZIP fields are preserved.

All 27 facility records carry status `Active` in this prototype. Users can change the local working status to Unassigned, Active, Coming Soon, or Planned; a changed value is stored only in browser localStorage under `facility-status-assignments-v3`. Fourteen facilities have user-supplied site plans and sourced plan facts. Those facts describe the supplied drawing or user statement, not current availability or operating capacity, and missing values are not inferred. Operational details are not connected to a live system.

All 27 roster records show media: twelve records use official UNIS directory media and fifteen use user-provided photos. Four of the ten additions have exact address matches in the official directory: West Sacramento, Sparks, Navigation Boulevard in Houston, and Delp Street in Memphis. Their images are address-correlated listing media and do not independently prove building identity. The other six additions (Waddell, Ontario, Kent, Salt Lake City, Somerset, and Plano) have no exact official directory match and use user-provided photos supplied on 2026-09-29. Existing user-photo limitations remain unchanged. Each media record uses a deterministic local square roster thumbnail and a separate uncropped detail asset. URLs or source markers, alt text, retrieval date, dimensions, match rationale, and limitations are recorded in `src/data/facility-media.ts` and [PHOTO-PROVENANCE.md](./PHOTO-PROVENANCE.md). No stock, neighboring-facility, or uncertain building image is substituted.

Thirteen facilities also have separate user-supplied galleries totaling 40 photos. These galleries do not replace the target's 17 roster/detail media records: both are shown separately in the Photos tab with their own provenance. Facility 07 Seabrook retains its user-provided screenshot record and has no substituted gallery or site plan. Gallery metadata lives in `src/data/facility-user-photos.ts`; plan assets and facts live in `src/data/facility-site-plans.ts`.

The Documents tab generates a four-page US-letter facility profile in the browser from the selected facility's current local data. Page 1 includes the selected address and every confidently matched contact role, name, email, and supplied phone number with contact-sheet row provenance; unmatched facilities show a concise contact-review state. Staff portraits are never embedded in the PDF. The remaining pages retain the supplied plan or explicit missing-plan state, sourced facts and operating hours, and the selected facility's facility-photo gallery or existing media record. Generation uses only same-origin local assets and does not require a backend or database.

The Tennessee address intentionally remains `4550 Quality Drive, TN` because no city or ZIP was supplied. Geocoder-inferred locality data is not added to the user-provided address.

Facility operating hours are stored separately in `src/data/facility-hours.ts`. Thirteen original-roster facilities retain confidently mapped hours from the user-provided 26-row list; four original records were confirmed in a follow-up; and all ten additions were user-confirmed with the roster expansion. All 27 display 8:00 AM–4:30 PM M-F with the confirmed local abbreviation. The app preserves the literal PST, EST, CST, or MST abbreviation, does not convert timezones, and does not compute live open/closed status.

Every facility's Operations tab shows its existing sourced hours from `src/data/facility-hours.ts`. Staff contacts from the user-provided facility contact sheet are confidently mapped to 18 of the 27 roster facilities, totaling 79 role-specific entries in `src/data/facility-operations.ts`; multiple supplied phone numbers remain separately labeled. Ruben Jauregui and Mark Tuttle retain their user-provided Valley View portraits, and one shared user-provided John Diaz portrait is used for all ten exact `john.diaz@unisco.com` contact entries. Every other portrait space remains blank pending supplied images. Nine facilities need contact-mapping review and intentionally show no staff cards: `pooler-morgan-lakes`, `pooler-seabrook-building-2`, `summerville-cypress-tradeport`, `el-paso-emerald-12100`, `kent-85th-avenue-range`, `west-sacramento-overland`, `houston-navigation`, `salt-lake-city-jimmy-doolittle`, and `somerset-cottontail`. No neighboring-site contacts or unmatched sheet rows are imported, and the raw workbook is not stored in the repository.

## Coordinates

Map coordinates were resolved in September 2026 with the public Esri World Geocoding Service and are stored with a source, precision, returned match, and any relevant limitation in `src/data/facilities.ts`.

The selected facility's Overview tab uses Google's keyless `www.google.com/maps?q=...&output=embed` iframe form with the supplied roster address. This is distinct from the official, key-required Google Maps Embed API v1: no API key is present or required by this prototype, and the undocumented keyless form may be less stable. If the frame is blocked or does not load, the UI falls back to an external Google Maps link.

- Most records resolved to Esri `PointAddress` matches.
- Riverside and both El Paso records resolved at `StreetAddress` precision.
- Building 2 / Building 5 identifiers were not independently resolved and are documented in the matching record.
- `369 N Cypress (410 Tradeport Dr.)` matched the parenthetical `410 Tradeport Dr.` address.
- `3901 Brandon Rd., Joliet, IL 60436` is pinned at the Esri point-address match (which the geocoder places in Elwood, IL 60421). The pin was confirmed correct in September 2026 and is treated as precise; the supplied address is unchanged.
- The Kent range is pinned at the `19821 85th Ave S` endpoint candidate. The pin was confirmed correct in September 2026 and is treated as precise; the supplied range remains unchanged.
- The Plano dual address uses the primary `910 10th St` point candidate and preserves `880 F Ave.` as the unpinned alternate without inventing a ZIP.
- `6801 N Cotton Ln, Waddell, AZ 85355` is pinned at the numbered Esri point address (which the geocoder places in Litchfield Park 85340). The pin was confirmed correct in September 2026 and is treated as precise; the supplied city and ZIP are unchanged.

Coordinates support visualization only. “Open in Maps” searches the complete user-provided address rather than treating stored coordinates as authoritative.

## Dashboard globe

The Dashboard opens on a 3D globe built with [CesiumJS](https://cesium.com/platform/cesiumjs/) (`src/components/DashboardGlobe.tsx`). Daytime imagery is Esri World Imagery (Satellite, the globe default) or World Street Map. The night side shows NASA's VIIRS Black Marble city lights from NASA GIBS. Cesium lights the globe from the real sun position at the time shown in the time control, so the terminator, twilight, and city lights all follow the clock. No Cesium ion account or API key is used.

Facility pins are HTML elements placed over the globe, so they keep the same styling, open/closed badges, keyboard focus, hover previews, and "Open facility NN in Facilities" behavior as the flat map. Pins on the far side of the planet are hidden. Choosing a region flies the camera to that region, leaving room for the Regions panel, and the recenter button flies back to the whole network.

The button below the recenter control switches between the globe and the flat Leaflet map. The choice is saved in browser localStorage under `dashboard-projection-v1`. Browsers without WebGL fall back to the flat map automatically. CesiumJS is about 4 MB, so it loads only when the globe is first shown, and its workers and assets are copied to `/cesium/` at build time by `vite-plugin-static-copy`. The Facilities view keeps the Leaflet map.

## Region highlight

Choosing a Dashboard region outlines it in brand purple, tints it lightly, and dims everything outside it; the highlight fades in as the camera moves there. Both the globe and the flat map frame the whole region, not only its facilities. The other regions' pins stay on the map, faded, and remain clickable. On the flat map the highlight is an SVG Leaflet layer (`src/components/RegionHighlightLayer.tsx`); on the globe it is a canvas-drawn imagery layer (`src/components/region-highlight-imagery.ts`), so it follows the globe's lighting.

Region shapes come from US Census cartographic boundaries via the public-domain [us-atlas](https://github.com/topojson/us-atlas) 1:10m county file, simplified to about 200 m and stored in `src/data/region-boundaries.json`. State regions use the state outline. Southern California is the ten counties conventionally grouped as SoCal (Imperial, Kern, Los Angeles, Orange, Riverside, San Bernardino, San Diego, San Luis Obispo, Santa Barbara, Ventura); Northern California is the remaining 48. The shapes are for visual grouping only. To regenerate them after changing the regions, run `node scripts/build-region-boundaries.mjs`.

## Day and night

The map shades the night side of the Earth for the current time and marks the point where the sun is overhead. The shade deepens through civil, nautical, and astronomical twilight, so the terminator reads as a soft band rather than a hard edge. Sun position comes from a low-precision solar ephemeris in `src/lib/solar.ts` (accurate to about 0.01° for 1950–2050); no data service is called.

The time control in the lower-right corner of the map shows the time and UTC, and how many facilities are inside their supplied operating hours. The Zone picker sets which time zone the clock, date field, and slider use: the viewer's device zone by default, the five facility zones and UTC first, then every IANA zone the browser supports. Changing the zone relabels the current map time rather than moving it (`src/lib/time-zone.ts`). A date-and-time field accepts any date from 1950 through 2050, a slider scrubs the time of day, and "Back to now" returns to the live clock, which updates every 30 seconds. Shading can be turned off, and that choice, the chosen zone, and the panel's collapsed state are saved in browser localStorage under `map-day-night-v1`.

Open or closed status is computed in `src/lib/facility-open.ts` from each facility's supplied hours and time-zone label, read as local wall-clock time. PST, CST, and EST map to their IANA zones and follow daylight saving time. MST maps to `America/Phoenix` for Arizona, which does not observe daylight saving time, and to `America/Denver` elsewhere. Holidays and exceptions are not modeled. Status appears as a sun or moon badge on each pin, in the roster, in pin previews, and in the Overview and Full Details hours.

## Brand

- The official ITEM SVG lockup is used without recoloring.
- Colors follow the ITEM design system at design.item.com: purple `#6B46C1` is the primary brand color, and orange `#F97316` marks "open now" and the sun. Tokens, type scale, and component rules are documented in [DESIGN.md](./DESIGN.md).
- Satoshi Variable and Satoshi Variable Italic are loaded from the supplied brand kit.

## Run locally

```bash
npm install
npm run dev
```

Development server: `http://localhost:5173`

For a production preview:

```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

Production preview: `http://localhost:4173`. Vite preview accepts managed-preview hostnames via `preview.allowedHosts: true`; the app has no authentication or privileged API surface.

## Container deployment

The production image builds the Vite bundle and serves it from unprivileged Nginx on fixed port `8080`. The Nginx configuration includes SPA route fallback and `/` is the container health-check endpoint.

```bash
docker build -t locations-network .
docker run --rm -p 8080:8080 locations-network
```

No runtime environment variables, API keys, credentials, database, or backend services are required. Main-map basemap tiles are loaded in the browser from Esri, globe night lights from NASA GIBS, and the selected Overview map from Google Maps; all require outbound client network access.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

The Playwright suite verifies all 27 exact addresses, all 27 map pins, twelve official records plus fifteen user-provided photos, supplied galleries, 14 site plans, exact local asset responses, four-page selected-facility PDF downloads, all 27 operating-hours records, 18 matched Operations records and nine contact-review states, square-footage hover previews, square thumbnail sizing, uncropped detail media, forced image-error fallback, mobile address wrapping, photo provenance, address/city/state/ZIP/type search and filtering, local status assignment and persistence, the confirmed Waddell and Kent pins, unavailable property states, light/dark persistence, and basemap switching.

The existing Dashboard tests run against the flat map. `tests/globe.spec.ts` covers the globe: imagery and night-light requests, all 27 pins, hover previews, opening a facility, region flights, zoom and recenter, lighting and layer controls, the persisted globe/flat toggle, and the fallback when WebGL is unavailable. Headless Chromium renders WebGL with SwiftShader, enabled in `playwright.config.ts`.

`tests/daynight.spec.ts` checks the subsolar point against the 2026 equinox and solstices, the twilight shading curve, and open/closed rules across daylight saving time, Arizona, weekends, and boundary minutes. With a fake browser clock, it also checks shade opacity under individual pins against the solar model, time and date scrubbing, the open count, shading and panel persistence, and that the time control never overlaps other map controls on desktop or mobile.

## Map attribution

Leaflet displays Esri attribution for the street and satellite basemaps. The globe shows Esri and NASA Black Marble credits in its lower-left corner, along with the CesiumJS logo. Network access is required for basemap tiles; the application data and brand assets are local. The public Esri tile endpoints are used without an API key; confirm Esri's terms of use, or move to an ArcGIS Location Platform key, before production use.

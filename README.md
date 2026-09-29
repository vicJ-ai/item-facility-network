# ITEM Locations Network

A responsive React + TypeScript facility-network prototype. It uses real Leaflet mapping with Esri street and satellite tiles, plus the supplied ITEM logo, palette, and Satoshi typography.

## Data boundary

This is a screenshot-based interface prototype, not a live WMS, YMS, facility, inventory, or operations product. The roster contains exactly 27 user-provided facility addresses: the original 17 plus ten UF/CUBEWORKS additions supplied on 2026-09-28. Their original spelling, punctuation, ranges, dual addresses, parenthetical address, building identifiers, and supplied city/state/ZIP fields are preserved.

All 27 facility records carry status `Active`. Users can change the local working status to Unassigned, Active, Coming Soon, or Planned; a changed value is stored only in browser localStorage under `facility-status-assignments-v3`. Property sizes, dock counts, clear heights, site plans, documents, and operational details were not supplied and are not inferred.

All 27 roster records show media: twelve records use official UNIS directory media and fifteen use user-provided photos. Four of the ten additions have exact address matches in the official directory: West Sacramento, Sparks, Navigation Boulevard in Houston, and Delp Street in Memphis. Their images are address-correlated listing media and do not independently prove building identity. The other six additions (Waddell, Ontario, Kent, Salt Lake City, Somerset, and Plano) have no exact official directory match and use user-provided photos supplied on 2026-09-29. Existing user-photo limitations remain unchanged. Each media record uses a deterministic local square roster thumbnail and a separate uncropped detail asset. URLs or source markers, alt text, retrieval date, dimensions, match rationale, and limitations are recorded in `src/data/facility-media.ts` and [PHOTO-PROVENANCE.md](./PHOTO-PROVENANCE.md). No stock, neighboring-facility, or uncertain building image is substituted.

The Tennessee address intentionally remains `4550 Quality Drive, TN` because no city or ZIP was supplied. Geocoder-inferred locality data is not added to the user-provided address.

Facility operating hours are stored separately in `src/data/facility-hours.ts`. Thirteen original-roster facilities retain confidently mapped hours from the user-provided 26-row list; four original records were confirmed in a follow-up; and all ten additions were user-confirmed with the roster expansion. All 27 display 8:00 AM–4:30 PM M-F with the confirmed local abbreviation. The app preserves the literal PST, EST, CST, or MST abbreviation, does not convert timezones, and does not compute live open/closed status.

## Coordinates

Map coordinates were resolved in September 2026 with the public Esri World Geocoding Service and are stored with a source, precision, returned match, and any relevant limitation in `src/data/facilities.ts`.

The selected facility's Overview tab uses Google's keyless `www.google.com/maps?q=...&output=embed` iframe form with the supplied roster address. This is distinct from the official, key-required Google Maps Embed API v1: no API key is present or required by this prototype, and the undocumented keyless form may be less stable. If the frame is blocked or does not load, the UI falls back to an external Google Maps link.

- Most records resolved to Esri `PointAddress` matches.
- Riverside and both El Paso records resolved at `StreetAddress` precision.
- Building 2 / Building 5 identifiers were not independently resolved and are documented in the matching record.
- `369 N Cypress (410 Tradeport Dr.)` matched the parenthetical `410 Tradeport Dr.` address.
- `3901 Brandon Rd., Joliet, IL 60436` produced a conflicting point-address match in Elwood, IL 60421. Its marker is explicitly labeled `Approximate`; the supplied address is unchanged.
- The Kent range is pinned at the best `19821 85th Ave S` endpoint candidate and is explicitly labeled approximate; the supplied range remains unchanged.
- The Plano dual address uses the primary `910 10th St` point candidate and preserves `880 F Ave.` as the unpinned alternate without inventing a ZIP.
- `6801 N Cotton Ln, Waddell, AZ 85355` remains unpinned because Esri returned conflicting city/ZIP candidates. The directory, details, hours, and address-based Google map remain available without asserting a location.

Coordinates support visualization only. “Open in Maps” searches the complete user-provided address rather than treating stored coordinates as authoritative.

## Brand

- The official ITEM SVG lockup is used without recoloring.
- Primary purple `#753bbd` comes from the supplied brand tokens.
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

No runtime environment variables, API keys, credentials, database, or backend services are required. Main-map basemap tiles are loaded in the browser from Esri, and the selected Overview map loads from Google Maps; both require outbound client network access.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

The Playwright suite verifies all 27 exact addresses, 26 valid map pins, twelve official records plus fifteen user-provided photos, all 27 operating-hours records, square thumbnail sizing, uncropped detail media, forced image-error fallback, mobile address wrapping, photo provenance, address/city/state/ZIP/type search and filtering, local status assignment and persistence, the unpinned Waddell detail flow, unavailable property states, light/dark persistence, and basemap switching.

## Map attribution

Leaflet displays Esri attribution for the street and satellite basemaps. Network access is required for basemap tiles; the application data and brand assets are local.

# ITEM Locations Network

A responsive React + TypeScript facility-network prototype. It uses real Leaflet mapping with Esri street and satellite tiles, plus the supplied ITEM logo, palette, and Satoshi typography.

## Data boundary

This is a screenshot-based interface prototype, not a live WMS, YMS, facility, inventory, or operations product. The roster contains exactly the 17 user-provided facility addresses. Their original spelling, punctuation, parenthetical address, building identifiers, and supplied city/state/ZIP fields are preserved.

All 17 facility records explicitly carry status `Active` in this prototype. Users can change the local working status to Unassigned, Active, Coming Soon, or Planned; a changed value is stored only in browser localStorage under `facility-status-assignments-v3`. Fourteen facilities have user-supplied site plans and sourced plan facts. Those facts describe the supplied drawing or user statement, not current availability or operating capacity, and missing values are not inferred. Operational details are not connected to a live system.

All 17 roster records show media: eight source-verified records from the official UNIS location directory and nine user-provided photos. The Moreno Valley photo is address-matched by visible facade signage; the Houston photo has no visible street-address signage, so its building identity remains unconfirmed; the other seven user-provided photos have associations verified by the users who supplied them and were not independently verified by this prototype. None of the user-provided photos are official UNIS media, and their original sources and publication rights are not verified. The Tennessee, Las Vegas, and two El Paso sources are Google Maps screenshots with their visible third-party copyright/attribution notices retained in the uncropped detail assets. Each media record uses a deterministic local 500×500 roster thumbnail and a separate detail asset. URLs or source markers, alt text, retrieval date, dimensions, match rationale, and limitations are recorded in `src/data/facility-media.ts` and [PHOTO-PROVENANCE.md](./PHOTO-PROVENANCE.md). Summerville remains an address candidate because the roster also includes an alternate address, and Long Beach is explicitly contextual port imagery rather than a verified building exterior. No stock, neighboring-facility, or uncertain building image is substituted.

Thirteen facilities also have separate user-supplied galleries totaling 40 photos. These galleries do not replace the target's 17 roster/detail media records: both are shown separately in the Photos tab with their own provenance. Facility 07 Seabrook retains its user-provided screenshot record and has no substituted gallery or site plan. Gallery metadata lives in `src/data/facility-user-photos.ts`; plan assets and facts live in `src/data/facility-site-plans.ts`.

The Documents tab generates a four-page US-letter facility profile in the browser from the selected facility's current local data. It includes the selected address, contact-unavailable state, supplied plan or an explicit missing-plan state, sourced facts and operating hours with provenance, and the selected facility's gallery or existing media record. Generation uses only same-origin local assets and does not require a backend or database.

The Tennessee address intentionally remains `4550 Quality Drive, TN` because no city or ZIP was supplied. Geocoder-inferred locality data is not added to the user-provided address.

Facility operating hours are stored separately in `src/data/facility-hours.ts`. Thirteen current-roster facilities retain confidently mapped hours from the user-provided 26-row list. Tennessee, Las Vegas, and both El Paso facilities have hours confirmed by the user in a follow-up, separately from the original list. All 17 display 8:00 AM–4:30 PM M-F with the confirmed local abbreviation. The app preserves the literal PST, EST, CST, or MST abbreviation, does not convert timezones, and does not compute live open/closed status. Rows for facilities outside the current 17-record roster are not imported.

Facility 01 Valley View's Operations tab also shows its existing sourced hours and five authorized contacts from row 5 of the user-provided facility contact sheet. Contact roles and values are stored in `src/data/facility-operations.ts`. User-provided portraits are attached for Ruben Jauregui and Mark Tuttle; the other three portrait spaces remain blank pending supplied images. No other sheet rows are imported, and the other sixteen facilities retain the Operations unavailable state.

## Coordinates

Map coordinates were resolved in September 2026 with the public Esri World Geocoding Service and are stored with a source, precision, returned match, and any relevant limitation in `src/data/facilities.ts`.

The selected facility's Overview tab uses Google's keyless `www.google.com/maps?q=...&output=embed` iframe form with the supplied roster address. This is distinct from the official, key-required Google Maps Embed API v1: no API key is present or required by this prototype, and the undocumented keyless form may be less stable. If the frame is blocked or does not load, the UI falls back to an external Google Maps link.

- Most records resolved to Esri `PointAddress` matches.
- Riverside and both El Paso records resolved at `StreetAddress` precision.
- Building 2 / Building 5 identifiers were not independently resolved and are documented in the matching record.
- `369 N Cypress (410 Tradeport Dr.)` matched the parenthetical `410 Tradeport Dr.` address.
- `3901 Brandon Rd., Joliet, IL 60436` produced a conflicting point-address match in Elwood, IL 60421. Its marker is explicitly labeled `Approximate`; the supplied address is unchanged.

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

The Playwright suite verifies all 17 exact addresses and previews, the eight official plus nine user-provided target media records, 13 supplied galleries, 14 site plans, exact local asset responses, four-page selected-facility PDF downloads, the 13 original-list and four follow-up-confirmed operating-hours records, responsive media, dashboard/map behavior, Google links and overview, search, local status persistence, filters, light/dark persistence, and basemap switching.

## Map attribution

Leaflet displays Esri attribution for the street and satellite basemaps. Network access is required for basemap tiles; the application data and brand assets are local.

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

Every facility's Operations tab shows its existing sourced hours from `src/data/facility-hours.ts`. Staff contacts from the user-provided facility contact sheet are confidently mapped to 18 of the 27 roster facilities, totaling 78 role-specific entries in `src/data/facility-operations.ts`; multiple supplied phone numbers remain separately labeled. Ruben Jauregui and Mark Tuttle retain their user-provided Valley View portraits, and one shared user-provided John Diaz portrait is used for all ten exact `john.diaz@unisco.com` contact entries. Joliet also uses the user-supplied Fabian Quiroz portrait. All three existing Javier Montane entries (Joliet, Tennessee, and Memphis) use his shared user-supplied portrait and the user-corrected title Operations Director; Joliet’s duplicate VP entry remains removed. All eight existing Harold Cuarezma entries use his shared user-supplied portrait, with roles and contact details unchanged. Every other portrait space remains blank pending supplied images. Nine facilities need contact-mapping review and intentionally show no staff cards: `pooler-morgan-lakes`, `pooler-seabrook-building-2`, `summerville-cypress-tradeport`, `el-paso-emerald-12100`, `kent-85th-avenue-range`, `west-sacramento-overland`, `houston-navigation`, `salt-lake-city-jimmy-doolittle`, and `somerset-cottontail`. No neighboring-site contacts or unmatched sheet rows are imported, and the raw workbook is not stored in the repository.

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

The Playwright suite verifies all 27 exact addresses, all 27 map pins, twelve official records plus fifteen user-provided photos, supplied galleries, 14 site plans, exact local asset responses, four-page selected-facility PDF downloads, all 27 operating-hours records, 18 matched Operations records and nine contact-review states, square thumbnail sizing, uncropped detail media, forced image-error fallback, mobile address wrapping, photo provenance, address/city/state/ZIP/type search and filtering, local status assignment and persistence, the unpinned Waddell detail flow, unavailable property states, light/dark persistence, and basemap switching.

## Map attribution

Leaflet displays Esri attribution for the street and satellite basemaps. Network access is required for basemap tiles; the application data and brand assets are local.

# ITEM Locations Network

A responsive React + TypeScript facility-network prototype. It uses real Leaflet mapping with CARTO/OpenStreetMap and Esri satellite tiles, plus the supplied ITEM logo, palette, and Satoshi typography.

## Data boundary

This is a screenshot-based interface prototype, not a live WMS, YMS, facility, inventory, or operations product. The roster contains exactly the 17 user-provided facility addresses. Their original spelling, punctuation, parenthetical address, building identifiers, and supplied city/state/ZIP fields are preserved.

No official statuses, property sizes, dock counts, clear heights, site plans, documents, or operational details were supplied. The UI does not infer them. At the user’s request, all 17 facilities begin with a working status of `Active`. Users can change a facility to Active, Coming Soon, Planned, or Unassigned; those choices are stored only in browser localStorage under `facility-status-assignments-v2` and do not represent operational truth. The v2 key intentionally resets any older v1 browser assignments to the new Active baseline.

Eight roster records have source-verified public media from the official UNIS location directory. Each uses a deterministic local 500×500 directory thumbnail in the roster and a separate original-source asset in detail views. Their URLs, source-derived alt text, retrieval date, dimensions, match rationale, and limitations are recorded in `src/data/facility-media.ts` and [PHOTO-PROVENANCE.md](./PHOTO-PROVENANCE.md). This evidence verifies the source and documented address correlation, not separate human sign-off of each photo-to-building association. Summerville remains an address candidate because the roster also includes an alternate address, and Long Beach is explicitly contextual port imagery rather than a verified building exterior. The other nine facilities use a neutral fallback; no stock, neighboring-facility, or uncertain building image is substituted.

The Tennessee address intentionally remains `4550 Quality Drive, TN` because no city or ZIP was supplied. Geocoder-inferred locality data is not added to the user-provided address.

## Coordinates

Map coordinates were resolved in September 2026 with the public Esri World Geocoding Service and are stored with a source, precision, returned match, and any relevant limitation in `src/data/facilities.ts`.

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

No runtime environment variables, credentials, database, or backend services are required. Basemap tiles are loaded in the browser from CARTO/OpenStreetMap or Esri and therefore require outbound client network access.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

The Playwright suite verifies all 17 exact addresses, eight source-verified directory previews and nine intentional fallbacks, square thumbnail sizing, uncropped detail media, image-error fallback, mobile address wrapping, photo provenance, address/city/state/ZIP search, local status assignment and persistence, all status filters, marker and row selection without navigation, unavailable property states, light/dark persistence, and basemap switching.

## Map attribution

Leaflet displays attribution for OpenStreetMap/CARTO street tiles and Esri satellite imagery. Network access is required for basemap tiles; the application data and brand assets are local.

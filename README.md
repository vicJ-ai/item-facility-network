# ITEM Locations Network

A responsive React + TypeScript facility-network prototype. It uses real Leaflet mapping with Esri street and satellite tiles, plus the supplied ITEM logo, palette, and Satoshi typography.

## Data boundary

This is a screenshot-based interface prototype, not a live WMS, YMS, facility, inventory, or operations product. The roster contains exactly 27 user-provided facility addresses: the original 17 plus ten UF/CUBEWORKS additions supplied on 2026-09-28. Their original spelling, punctuation, ranges, dual addresses, parenthetical address, building identifiers, and supplied city/state/ZIP fields are preserved.

All 29 roster records carry status `Active`; the user set every facility to Active on 2026-10-02, including Houston Navigation, Garden City, and University Park, which had been `Unassigned`. Facility 29, University Park (`701 S Central Ave, University Park, IL 60484`), was added on 2026-10-01 with only its address and still has no site plan. It has since gained contacts and square footage, and on 2026-10-02 it joined the Illinois Dashboard region and the Preview tour beside Joliet. Facility 28, Garden City (`140 Prosperity Dr, Garden City, GA 31408`), was added from the official 804 – Garden City facility sheet; that sheet states no operating hours. Garden City and University Park share their own facility type, Samsung Warehouse, set by the user on 2026-10-02 and available in the type filter alongside UF ONLY and UF/CUBEWORKS. Users can change the local working status to Unassigned, Active, Coming Soon, or Planned; a changed value is stored only in browser localStorage under `facility-status-assignments-v3`. Sixteen facilities have supplied site plans and sourced plan facts; the City Park, Garden City, Jacksonville, Pooler Seabrook, Roanoke, and Summerville plans come from the official one-page facility sheets in `extra_resources/Facility information/`. Those facts describe the supplied drawing or user statement, not current availability or operating capacity, and missing values are not inferred. Operational details are not connected to a live system.

All 29 roster records show media: twelve records use official UNIS directory media, sixteen use user-provided photos (University Park's was added on 2026-10-02), and Garden City uses the building photo from its official facility sheet. Four of the ten additions have exact address matches in the official directory: West Sacramento, Sparks, Navigation Boulevard in Houston, and Delp Street in Memphis. Their images are address-correlated listing media and do not independently prove building identity. The other six additions (Waddell, Ontario, Kent, Salt Lake City, Somerset, and Plano) have no exact official directory match and use user-provided photos supplied on 2026-09-29. Existing user-photo limitations remain unchanged. Each media record uses a deterministic local square roster thumbnail and a separate uncropped detail asset. URLs or source markers, alt text, retrieval date, dimensions, match rationale, and limitations are recorded in `src/data/facility-media.ts` and [PHOTO-PROVENANCE.md](./PHOTO-PROVENANCE.md). No stock, neighboring-facility, or uncertain building image is substituted.

Thirteen facilities also have separate user-supplied galleries totaling 44 photos; Jacksonville and Summerville use the official facility-sheet exterior photo as their cover, and Citypark uses its brochure exterior. These galleries do not replace the target's 17 roster/detail media records: both are shown separately in the Photos tab with their own provenance. Facility 07 Seabrook retains its user-provided screenshot record and has no substituted gallery; its site plan comes from the official 823 – Pooler sheet. Gallery metadata lives in `src/data/facility-user-photos.ts`; plan assets and facts live in `src/data/facility-site-plans.ts`.

The Documents tab generates a four-page US-letter facility profile in the browser from the selected facility's current local data. Page 1 includes the selected address and every confidently matched contact role, name, email, and supplied phone number with contact-sheet row provenance; unmatched facilities show a concise contact-review state. Staff portraits are never embedded in the PDF. The remaining pages retain the supplied plan or explicit missing-plan state, sourced facts and operating hours, and the selected facility's facility-photo gallery or existing media record. Generation uses only same-origin local assets and does not require a backend or database.

The Tennessee address intentionally remains `4550 Quality Drive, TN` because no city or ZIP was supplied. Geocoder-inferred locality data is not added to the user-provided address.

Facility operating hours are stored separately in `src/data/facility-hours.ts`. Thirteen original-roster facilities retain confidently mapped hours from the user-provided 26-row list; four original records were confirmed in a follow-up; and all ten additions were user-confirmed with the roster expansion. All 27 display 8:00 AM–4:30 PM M-F with the confirmed local abbreviation. On 2026-10-02 the user stated that every facility follows that same schedule in its local time zone, so Garden City (EST) and University Park (CST) now have hours too, and all 29 facilities count toward open now. The app preserves the literal PST, EST, CST, or MST abbreviation, does not convert timezones, and does not compute live open/closed status.

Every facility's Operations tab shows its existing sourced hours from `src/data/facility-hours.ts` and its contacts from `src/data/facility-operations.ts`: 153 role-specific entries across all 29 facilities. They come from the user-provided facility contact sheet (18 rows), the official one-page facility sheets in `extra_resources/Facility information/` (Garden City, Pooler Seabrook, and Summerville records, plus City Park and Roanoke updates), and contact details the user supplied directly on 2026-10-01 (Oscar Rodriguez as Senior General Manager and Juan Barragan as WA Senior General Manager, Jessica Barajas as Operations Manager for every Texas site, Michelle Topete's corrected contact details, John Diaz's phone number, Javier Gonzalez Montane's name and title, and Onoriode Enaigbe's and Efrain Islas Alcaraz's titles, Efrain now Operations Manager). The UNIS Warehouse Point of Contact sheet (2026-10-02) added Frank Feliciano's and Stephen Schumaker's emails and phones, put Michelle Topete and Mary Smothers at Garden City, Pooler Morgan Lakes, University Park, El Paso 12100 (listed there as 12104), and Salt Lake City (listed as 475 N Jimmy Doolittle), and added Wayne Brooks at Pooler Morgan Lakes, Javier Gonzalez Montane at University Park, and Harold Cuarezma at Salt Lake City; people new to the app on that sheet (Craig Sanders, Barry Washington) are not added yet, and its VP column is not used. The user also split the VP role by region on 2026-10-01: John Gleason is VP for Texas, Savannah (both Pooler sites and Garden City), Florida, and South Carolina, and John Diaz for every other building, so each facility lists exactly one of them. Portraits for people listed at several sites are shared by email, so one image serves every entry. Every portrait shown is a 400×400 head-and-shoulders crop in `public/media/operations/portraits/`, framed so faces sit at a similar size and position and fill the rounded frame; the supplied originals are kept beside them unchanged. Oscar Rodriguez shows no portrait until the user supplies a replacement. At Ontario, the user replaced Oscar Rodriguez with Mark Tuttle (Director of Operations) on 2026-10-02. Fifteen account manager profiles from the account manager contact sheet (2026-10-02) are ready in `accountManagerProfiles` with portraits, emails, phones, and titles, and Elizabeth Martinez shows no title while Yessenia Tovar has no phone on the sheet. Natasha Gray, Jessica Chaidez, and Rhonda Moffett were added on 2026-10-02 (Rhonda's portrait will follow). Barry Washington joined University Park as General Manager from the "point of contact per warehouse" sheet the same day, with Jason Hop beside him as Assistant General Manager (no phone supplied). The account manager assignment file (2026-10-02) places them at 14 facilities (`accountManagerAssignments`), 20 entries in all, after each site's existing account management contacts; Silvia Sanchez is left out until her photo is supplied, Jennifer Stanek and Jehnifur Morvai are not assigned anywhere, and rows marked N/A are unchanged. Its "Memphis LENOVO" row is read as the Quality Drive site. Jimmy Esparza, Regional Director of Operations at University Park, was supplied with his email, phone, and portrait by the user on 2026-10-01; his identity was not independently verified. Mary Smothers's portrait was supplied and identified by the user on 2026-10-01 and was not independently identity-verified. Replacement portraits for Javier Gonzalez Montane, Jessica Barajas, John Gleason, Lenivy Jackson, Adam Lubin, Stephen Schumaker, Frank Feliciano, and Efrain Islas Alcaraz were supplied and filename-identified by the user on 2026-10-02. Contacts supplied without an email (for example Lenivy Jackson and Ruben Echavarria) say so instead of guessing one. Five facilities still need site-level contact mapping and show only the people assigned to them so far: their VP, plus Jessica Barajas at Houston Navigation and Jimmy Esparza at University Park: `pooler-morgan-lakes`, `west-sacramento-overland`, `houston-navigation`, `somerset-cottontail`, and `university-park-central`.

Below the contacts, each Operations tab lists the facility's top customers in rank order (`src/data/facility-customers.ts`), from the top customers sheet the user supplied on 2026-10-02 and matched by address. All 29 facilities have a list (234 names, kept exactly as the sheet writes them), with the sheet's location code shown for traceability. The sheet's Glendale address for 6801 N. Cotton Ln. is read as Waddell, and its 12104 Emerald Pass and 19802-20024 85th Ave. South rows were confirmed by the user as El Paso 12100 and Kent; rows for sites outside this roster are not recorded.

## Available space

Warehouse-reported available space lives in `src/data/facility-space.ts` and appears in Dashboard pin previews and Preview tour stops. Nineteen sites have October 2026 figures supplied by the user on 2026-10-01 and 2026-10-02 (Ontario: 140,000 SQF; Houston Navigation and Houston Citypark: 86,000 SQF each; Plano: 0 SQF), including 0 SQF at Garden City and University Park; `0` reads "0 SQF" everywhere, Riverside's 120,000 SQF was confirmed by the user on 2026-10-02, and short context such as Kent's "No UF customer on this site" or Joliet's bulk/rack breakdown is kept as a note. Sites without a figure, including Moreno Valley, show "Pending". Every facility has a total square footage. A user-provided total (`facilityTotalSquareFeet`, supplied on 2026-10-01 and 2026-10-02) wins; otherwise the total is the site plan's building area. The 17 sites on the user's "Total Building Area" sheet (2026-10-02) all use that sheet's figures, which replace the site-plan area at Buena Park, Quality Drive, Las Vegas, and El Paso 12100 and the official City Park sheet's 119,700; the Site Plan tab still lists each plan's own stated area. The remaining sites use totals the user supplied directly. Every square-footage figure in the app, the Preview tour, and the PDF displays as "SQF"; site-plan data keeps the source sheets' "SF" unit. Each facility's Overview also has a Bulk & rack section (bulk floor space in SQF, rack capacity in pallet positions) backed by `facilityBulkRack` in the same file; every site now has figures: nine reported values (Joliet, both Houston sites, Plano, Jacksonville, Pooler Morgan Lakes, both El Paso sites, and Summerville), and the other twenty were set to 0 at the user's request on 2026-10-02; 0 reads "0 SQF" or "0 pallet positions". The Overview also has a Square footage section (Total, plus Available once reported), and its Sourced property facts leave out the site plan's own area, which the Total supersedes; facilities without a site plan no longer show a "Property attributes" box of missing values. In Dashboard pin previews, Available heads an indented Bulk and Rack breakdown: it shows a figure only when one is reported (never a Pending placeholder), while Bulk and Rack show "Pending" until a site reports them. Preview tour stop cards show Total, Available (only when a site has reported a figure), Bulk, Rack, Ceiling height, and Loading docks, with "Pending" for the last four until they are reported. All of these surfaces, and page 1 of the facility profile PDF (Total, Available when reported, Ceiling height, Loading docks, then Bulk), read the same values through shared formatters in `src/data/facility-space.ts` and `src/data/facility-building.ts`, and anything not yet reported reads "Pending". Below Bulk & rack, a Building & lease section shows office area, clear ceiling height, loading docks, and lease expiration from the building and lease sheet the user supplied on 2026-10-02 (`src/data/facility-building.ts`); 17 sites have figures, blank cells and the 12 sites not on the sheet show "Not provided", and the sheet's separate Moreno Valley parking-lot lease row is not recorded.

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
- `nginx.conf` serves the `.gz` copies with `gzip_static`, gzips anything else, and caches:
  - content-hashed `/assets/` for a year;
  - `/cesium/`, `/media/`, `/fonts/`, and `/brand/` for a week;
  - `index.html` never, so a deploy takes effect at once.
- Serving the `.br` copies needs the brotli module or a CDN in front of the container.
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

The Playwright suite verifies all 29 exact addresses, all 29 map pins, Bulk & rack figures, reported available space, Preview tour stop cards, twelve official records plus sixteen user-provided photos, supplied galleries, 16 site plans, exact local asset responses, four-page selected-facility PDF downloads, all 27 operating-hours records plus Garden City's missing-hours state, Operations records for all 29 facilities, including the regional VP split and the five sites awaiting site-level contacts, square-footage hover previews, square thumbnail sizing, uncropped detail media, forced image-error fallback, mobile address wrapping, photo provenance, address/city/state/ZIP/type search and filtering, local status assignment and persistence, the confirmed Waddell and Kent pins, unavailable property states, light/dark persistence, and basemap switching.

The existing Dashboard tests run against the flat map. `tests/globe.spec.ts` covers the globe: imagery and night-light requests, all 27 pins, hover previews, opening a facility, region flights, zoom and recenter, lighting and layer controls, the persisted globe/flat toggle, and the fallback when WebGL is unavailable. Headless Chromium renders WebGL with SwiftShader, enabled in `playwright.config.ts`.

`tests/preview.spec.ts` covers the Preview tour: the Washington opening chapter, hidden controls, Previous/Next and progress-tick jumps, the Tennessee title, the finale and loop, restoring the region, panel, camera, and flat-map preference, handing control back on drag or pin click, and reduced-motion cuts. `tests/quality.spec.ts` covers the quality setting: Automatic resolving to Performance under software WebGL, choosing and persisting a tier, the menu closing on Esc or an outside click, the globe surviving projection and view switches without duplicate pins, coarse imagery during tour flights, and the `?debug=perf` readout. Software WebGL is memory-hungry, so on smaller machines run the suite with `npx playwright test --workers=2`. `?previewSpeed=20` plays the tour faster for these tests, and `?previewFps=6` caps its frame rate so the continuously rendered globe does not starve the other suites running in parallel.

`tests/daynight.spec.ts` checks the subsolar point against the 2026 equinox and solstices, the twilight shading curve, and open/closed rules across daylight saving time, Arizona, weekends, and boundary minutes. With a fake browser clock, it also checks shade opacity under individual pins against the solar model, time and date scrubbing, the open count, shading and panel persistence, and that the time control never overlaps other map controls on desktop or mobile.

## Map attribution

Leaflet displays Esri attribution for the street and satellite basemaps. The globe shows Esri and NASA Black Marble credits in its lower-left corner, along with the CesiumJS logo. Network access is required for basemap tiles; the application data and brand assets are local. The public Esri tile endpoints are used without an API key; confirm Esri's terms of use, or move to an ArcGIS Location Platform key, before production use.

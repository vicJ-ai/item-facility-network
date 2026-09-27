# Facility photo provenance

This public prototype bundles eight source-verified media records from the official UNIS location directory, retrieved on 2026-09-25. Each roster preview is the directory's current 500×500 square derivative and each detail view uses a separate original-source asset. This evidence verifies the source and documented address correlation; it does not claim separate human sign-off of each photo-to-building association. The images are presentation media only and do not add or alter facility facts.

| Main facility ID | Local square thumbnail | Official thumbnail URL | Original official asset | Official source | Evidence and limitation |
| --- | --- | --- | --- | --- | --- |
| `buena-park-valley-view` | `/media/thumbnails/buena-park-valley-view.webp` | [buenapark-ca-500x500.webp](https://cdn.unisco.com/api/media/file/buenapark-ca-500x500.webp) | [DJI_0108-14 copy (1).jpeg](https://cdn.unisco.com/api/media/file/DJI_0108-14%20copy%20(1).jpeg) | [Buena Park facility](https://www.unisco.com/locations/facility/buena-park-ca) | Exact street number, street, city, and ZIP match. |
| `riverside-alessandro` | `/media/thumbnails/riverside-alessandro.webp` | [alessandro-riverside-ca-500x500.webp](https://cdn.unisco.com/api/media/file/alessandro-riverside-ca-500x500.webp) | [alessandro-riverside-ca.webp](https://cdn.unisco.com/api/media/file/alessandro-riverside-ca.webp) | [UNIS locations](https://www.unisco.com/locations) | Official listing says 2677 Alessandro; the roster says 2677 East Alessandro. Number, named street, city, and ZIP match. |
| `roanoke-highway-114` | `/media/thumbnails/roanoke-highway-114.webp` | [roanoke-tx-500x500.webp](https://cdn.unisco.com/api/media/file/roanoke-tx-500x500.webp) | [roanoke-tx.webp](https://cdn.unisco.com/api/media/file/roanoke-tx.webp) | [UNIS locations](https://www.unisco.com/locations) | Street number, Highway/TX-114 designation, and city match. |
| `tacoma-lincoln` | `/media/thumbnails/tacoma-lincoln.webp` | [unis-tacmoa-500x500.webp](https://cdn.unisco.com/api/media/file/unis-tacmoa-500x500.webp) | [unis-tacmoa.webp](https://cdn.unisco.com/api/media/file/unis-tacmoa.webp) | [UNIS locations](https://www.unisco.com/locations) | Street number, street, city, and ZIP match. |
| `tacoma-steele` | `/media/thumbnails/tacoma-steele.webp` | [tacoma-steele-500x500.webp](https://cdn.unisco.com/api/media/file/tacoma-steele-500x500.webp) | [tacoma-steele.webp](https://cdn.unisco.com/api/media/file/tacoma-steele.webp) | [UNIS locations](https://www.unisco.com/locations) | Street number, street, city, and ZIP match. |
| `long-beach-willow` | `/media/thumbnails/long-beach-willow.png` | [unis-long-beach-500x500.png](https://cdn.unisco.com/api/media/file/unis-long-beach-500x500.png) | [unis-long-beach.png](https://cdn.unisco.com/api/media/file/unis-long-beach.png) | [UNIS locations](https://www.unisco.com/locations) | Official listing omits “West”; street number, named street, city, and ZIP correlate. The image shows Port of Long Beach containers and is contextual listing media, not a verified exterior of the 2131 Willow building. |
| `joliet-brandon` | `/media/thumbnails/joliet-brandon.webp` | [joliet-il-500x500.webp](https://cdn.unisco.com/api/media/file/joliet-il-500x500.webp) | [joliet-il.webp](https://cdn.unisco.com/api/media/file/joliet-il.webp) | [UNIS locations](https://www.unisco.com/locations) | Street number, street, city, and ZIP match. |
| `summerville-cypress-tradeport` | `/media/thumbnails/summerville-cypress-tradeport.png` | [unis-summerville-500x500.png](https://cdn.unisco.com/api/media/file/unis-summerville-500x500.png) | [unis-summerville.png](https://cdn.unisco.com/api/media/file/unis-summerville.png) | [UNIS locations](https://www.unisco.com/locations) | Official directory lists 369 N Cypress Dr, matching the roster's primary text. The roster also contains 410 Tradeport Dr and its geocoder matched that alternate; this preview does not verify building or coordinate identity. |

The exact source-derived alt descriptions are stored with both variants in `src/data/facility-media.ts`. Long Beach is described as the port/container scene shown by the source and is never labeled as the Willow warehouse exterior.

## User-provided photos (retrieved 2026-09-27)

Nine roster records that previously had no official directory match now show photos supplied directly by the user as screenshots. None of these are official UNIS media, and the original image sources and publication rights are not independently verified. Verification is classified per record:

- **Address-matched** — a street number or other identifying detail visible in the photo itself confirms the roster address.
- **Address-unconfirmed** — no address-identifying detail is visible in the photo, so building identity is not confirmed from the image alone.
- **User-verified** — the address/building association was verified by the user who supplied the photo, not independently by this prototype.

| Main facility ID | Local square thumbnail | Detail asset | Verification | Evidence and limitation |
| --- | --- | --- | --- | --- |
| `moreno-valley-heacock` | `/media/thumbnails/moreno-valley-heacock.webp` | `/media/moreno-valley-heacock.jpg` | Address-matched | The building number visible on the facade reads 16850, matching this roster address. |
| `houston-citypark` | `/media/thumbnails/houston-citypark.webp` | `/media/houston-citypark.jpg` | Address-unconfirmed | Depicts dock doors numbered 57–64 and carrier equipment; no street-address signage is visible. |
| `pooler-morgan-lakes` | `/media/thumbnails/pooler-morgan-lakes.webp` | `/media/pooler-morgan-lakes.jpg` | User-verified | Association verified by the supplying user, not independently confirmed. |
| `pooler-seabrook-building-2` | `/media/thumbnails/pooler-seabrook-building-2.webp` | `/media/pooler-seabrook-building-2.jpg` | User-verified | Association verified by the supplying user, not independently confirmed. |
| `jacksonville-ignition` | `/media/thumbnails/jacksonville-ignition.webp` | `/media/jacksonville-ignition.jpg` | User-verified | Association verified by the supplying user, not independently confirmed. |
| `tennessee-quality-drive` | `/media/thumbnails/tennessee-quality-drive.webp` | `/media/tennessee-quality-drive.jpg` | User-verified | Google Maps screenshot; a visible "© 2025 Google" notice is retained in the uncropped detail asset. |
| `las-vegas-marion-building-5` | `/media/thumbnails/las-vegas-marion-building-5.webp` | `/media/las-vegas-marion-building-5.jpg` | User-verified | Google Maps screenshot; a visible Google copyright/attribution notice is retained in the uncropped detail asset. |
| `el-paso-emerald-12100` | `/media/thumbnails/el-paso-emerald-12100.webp` | `/media/el-paso-emerald-12100.jpg` | User-verified | Google Maps screenshot; a visible Google copyright/attribution notice is retained in the uncropped detail asset. |
| `el-paso-emerald-12102-building-5` | `/media/thumbnails/el-paso-emerald-12102-building-5.webp` | `/media/el-paso-emerald-12102-building-5.jpg` | User-verified | Google Maps screenshot; a visible Google copyright/attribution notice is retained in the uncropped detail asset. |

## Coverage

All 17 roster records now have an assigned photo (8 official plus 9 user-provided). No neighboring, stock, or guessed images are substituted for any record.

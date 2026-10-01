# ITEM Locations Network — design system

This document is the source of truth for how the Locations Network looks. It follows the ITEM brand guidelines at [design.item.com](https://design.item.com/). The tokens are implemented at the top of `src/App.css`. Agents and contributors should use those tokens rather than hard-coded values.

## 1. Visual theme and atmosphere

A calm, data-dense operations console. Dark ink chrome frames a bright, map-first workspace. White surfaces use hairline borders, and ITEM purple is kept for the one thing that matters in each area: the active item, the primary action, or a selected state. The page should feel precise and quiet, like Linear or Sentry, rather than decorative. Motion is short and functional.

## 2. Color palette and roles

| Role | Token | Light | Dark | Notes |
| --- | --- | --- | --- | --- |
| Brand / primary fill | `--primary` | `#6B46C1` | `#6B46C1` | ITEM Purple. Buttons, active segments, selected rows, and focus. White text on it is 6.1:1. |
| Primary hover | `--primary-strong` | `#57379F` | `#57379F` | |
| Primary text and icons | `--primary-ink` | `#5B3AAE` | `#B9A6F3` | Use for purple text; fills stay `--primary`. |
| Primary tint | `--primary-soft` | `#F1EDFB` | `#2A2350` | Tinted backgrounds, icon tiles. |
| Chrome | `--ink` | `#120F24` | `#120F24` | Top bar, drawer banner, and map pin labels in both themes. |
| Surface | `--surface` | `#FFFFFF` | `#17152B` | Panels and cards. Dark neutrals are tinted toward ITEM Indigo. |
| Raised / subtle surface | `--surface-2` | `#F7F7FA` | `#1E1C36` | Table headers, hover, and inset cards. |
| App background | `--surface-3` | `#F0F0F5` | `#0F0D1E` | |
| Border | `--border` | `#E4E4EC` | `#2D2A4A` | Hairlines. Use `--border-strong` for inputs on hover. |
| Text | `--text` | `#111019` | `#F1F0F8` | |
| Secondary text | `--text-2` | `#3B3A4A` | `#D2D0E4` | |
| Muted text | `--muted` | `#62627A` | `#A4A1BF` | Meets AA on every surface. ITEM Glacier (`#999`) is not used for text because it fails AA. |
| Active status | `--active` / `--active-ink` / `--active-soft` | `#13A663` / `#0B6B3F` / `#E3F5EA` | — / `#7CE3A9` / `#133322` | The pin color `#13A663` is fixed by tests. |
| Coming Soon | `--warning*` | `#F4B71B` / `#7A5400` / `#FDF1CF` | — / `#FFD76A` / `#3A2F10` | Also used for approximate coordinates. |
| Planned | `--primary*` | ITEM Purple | | |
| Unassigned | `--neutral*` | `#4A4A5C` / `#ECECF2` | `#D3D2E3` / `#2C2A45` | |
| Open now | `--open` / `--open-ink` / `--open-soft` | `#F97316` / `#B04608` / `#FFF1E6` | — / `#FFAB6E` / `#3A2314` | ITEM Orange. Always paired with a sun icon. |
| Closed now | `--closed` / `--closed-ink` / `--closed-soft` | `#3F3A6B` / `#4A4668` / `#EFEEF6` | `#8E88C9` / `#C7C3EA` / `#25223F` | Always paired with a moon icon. |

Rules:

- ITEM Orange is an accent for "open" and the sun, not a button color. White text on `#F97316` is 2.8:1, which fails WCAG AA, so orange text uses `--open-ink`.
- Status is never color-only. Pills carry a label and dot, and open/closed badges carry an icon and word.
- Night shading uses `rgb(14, 10, 44)`, an indigo-black at up to 60% opacity, so the map stays readable at night.

## 3. Typography

Satoshi Variable (300–900), loaded from `public/fonts`. The minimum size is 12px, apart from the map attribution, which is 10px legal fine print.

| Use | Size / weight | Details |
| --- | --- | --- |
| Page title (`Facility directory`) | 24 / 700 | letter-spacing −0.015em |
| Showcase title, drawer title | 22 / 700 | |
| Section and card titles | 14–18 / 700 | |
| Body, table cells, inputs | 13 / 400–600 | line-height 1.45–1.6 |
| Labels, meta, pills, eyebrows | 12 / 600–700 | Eyebrows are uppercase with +0.06em tracking. |
| Metrics and clocks | 15–22 / 700 | `font-variant-numeric: tabular-nums` |

Use weight and size for hierarchy. Keep to three or four levels per view.

## 4. Component styling

- **Buttons:** 40px high, radius 8px, 13px/600. Primary is a purple fill. Secondary is a surface fill with a hairline border that turns purple on hover. There is one primary button per panel.
- **Segmented control** (Street/Satellite): 3px inset track; the active segment is filled with purple.
- **Inputs and selects:** 36px high (40px on mobile), radius 8px, with a 3px purple focus ring (`--focus-ring`) around the whole field.
- **Pills:** fully rounded, 24px, 12px/600, with a leading 6px dot in `currentColor`.
- **Open-state badge:** a compact pill in the roster; in full form, it shows the summary and facility-local time.
- **Floating map panels:** surface, 1px border, radius 10–14px, and `--shadow` (panels) or `--shadow-lg` (sheets, popovers).
- **Map pins:** teardrop in the status color with a white rim. A small dot at the top right shows open (orange) or closed (indigo). Approximate pins get a dashed rim and an amber halo.
- **Tables:** sticky 34px uppercase header, hairline row dividers, surface-2 on hover, and a 3px purple left bar on the selected row.

## 5. Layout principles

- The spacing scale is 4, 8, 12, 16, 20, 24, and 32px. Panels sit 12–18px from the map edges.
- Desktop uses a resizable directory (25–55%) next to the map. Dashboard is map-only and opens on the 3D globe, with a flat-map toggle below the recenter control.
- Map chrome has fixed homes. Summary panels are top-left, layers and zoom are top-right, the legend and focus badges are bottom-left, and the time control is bottom-right. A container query moves the time control above the legend when the map is narrower than 780px.

## 6. Depth and elevation

| Level | Token | Use |
| --- | --- | --- |
| 0 | border only | Cards inside panels, rows |
| 1 | `--shadow-sm` | Map legend, segmented control, secondary buttons |
| 2 | `--shadow` | Floating map panels and controls |
| 3 | `--shadow-lg` | Regions sheet, pin previews, dialogs, toast |

Map panes stack as tiles, then night shade (350), then the sun (360), then overlays and highlights (400), then pins (600). The night shade and the sun ignore pointer events.

On the globe, the WebGL canvas sits under an HTML pin layer (z 2), then the hover preview (z 3), then credits (z 4). Map controls stay at z 500 and above. Space is `#05040D`, and the ice tone `#DFE6EE` fills the polar caps beyond the imagery's ±85° limit.

## 7. Do's and don'ts

- **Do** use tokens, tabular numbers for data, and lucide icons at 14–18px.
- **Do** keep purple scarce. If everything is purple, nothing is selected.
- **Do** respect `prefers-reduced-motion`. Pin transitions, preview fade-ins, and the live pulse all switch off.
- **Don't** use gradients on surfaces, glassmorphism, emoji, or text smaller than 12px.
- **Don't** change the pin `background` color for open or closed. Open state lives on the badge, so status colors stay unambiguous.
- **Don't** introduce another basemap provider. Tests pin the Esri Street and Satellite tile sources, and the globe's NASA Black Marble night lights.
- **Don't** draw globe pins as Cesium billboards. HTML pins keep the shared pin styling, focus handling, and test hooks.

## 8. Responsive behavior

| Breakpoint | Behavior |
| --- | --- |
| ≤1360px | Nav collapses to icons. The wordmark tightens. |
| ≤1040px | Nav moves into a menu. |
| ≤820px | The List/Map switch replaces the split view. The time control starts collapsed. |
| ≤720px | Search moves below the top bar. Map panels go full width. The time control docks above the legend or focus badge and hides while the Regions sheet is open. |
| ≤430px | Secondary buttons become icon-only. |

## 9. Agent prompt guide

When adding UI, start from the tokens in `src/App.css` and the rules above. Keep class names, `data-testid` values, and ARIA labels stable, because the Playwright suites depend on them. Run `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test:e2e` before handing off. For new map overlays, create a named pane with an explicit `zIndex` and `pointer-events: none` unless the overlay must be interactive.

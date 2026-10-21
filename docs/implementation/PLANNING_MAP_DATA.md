# Collected planning-map data and implementation handoff

Collection date: 2026-10-21. 49 datasets downloaded and structurally validated. This document inventories actual local files, not proposed features.

## Open the local map

Run `npm run map:preview`, then open [the planning data explorer](http://127.0.0.1:4174). It is a standalone localhost preview, separate from the pro forma UI and Supabase. It supports the full official Toronto address index, keyboard coordinate entry, map selection, layer toggles, source attributes/links, polygon matches, regional-source context and approximate straight-line proximity. Basemap tiles are optional and off initially. No recurring job or public deployment was created.

Category icons use the site's teal/sand palette, bounded marker sizes and distance-based grouping to keep displayed markers separated across layers. Dense groups zoom or expand into displaced display markers with leader lines to original coordinates. Underlying coordinates and distance calculations are unchanged. Light polygon fills and group panes keep area overlays below markers. Count markers and shape glyphs supplement colour.

## Actual datasets

### City of Toronto

| Layer | Mapped / source rows | Local normalized file | Official source |
|---|---:|---|---|
| Toronto municipal addresses | 525,371 / 525,371 | `data/planning-map/addresses.index.json` | [source](https://open.toronto.ca/dataset/address-points-municipal-toronto-one-address-repository/) |
| Toronto wards | 25 / 25 | `data/planning-map/wards.geo.json` | [source](https://open.toronto.ca/dataset/city-wards/) |
| Toronto neighbourhoods | 158 / 158 | `data/planning-map/neighbourhoods.geo.json` | [source](https://open.toronto.ca/dataset/neighbourhoods/) |
| Wards and elected councillors | 25 / 25 | `data/planning-map/councillors.geo.json` | [source](https://open.toronto.ca/dataset/wards-and-elected-councillors/) |
| Toronto zoning areas | 11,719 / 11,719 | `data/planning-map/zoning.geo.json` | [source](https://open.toronto.ca/dataset/zoning-by-law/) |
| Zoning height overlay | 2,528 / 2,528 | `data/planning-map/zoning-height.geo.json` | [source](https://open.toronto.ca/dataset/zoning-by-law/) |
| Zoning building setback overlay | 4 / 4 | `data/planning-map/zoning-setback.geo.json` | [source](https://open.toronto.ca/dataset/zoning-by-law/) |
| Zoning lot coverage overlay | 1,242 / 1,242 | `data/planning-map/zoning-lot-coverage.geo.json` | [source](https://open.toronto.ca/dataset/zoning-by-law/) |
| Parking zone overlay | 913 / 913 | `data/planning-map/zoning-parking.geo.json` | [source](https://open.toronto.ca/dataset/zoning-by-law/) |
| Zoning policy area overlay | 352 / 352 | `data/planning-map/zoning-policy-area.geo.json` | [source](https://open.toronto.ca/dataset/zoning-by-law/) |
| Zoning policy road overlay | 8,913 / 8,913 | `data/planning-map/zoning-policy-road.geo.json` | [source](https://open.toronto.ca/dataset/zoning-by-law/) |
| Priority retail street overlay | 643 / 643 | `data/planning-map/zoning-retail.geo.json` | [source](https://open.toronto.ca/dataset/zoning-by-law/) |
| Secondary plans | 55 / 55 | `data/planning-map/secondary-plans.geo.json` | [source](https://open.toronto.ca/dataset/secondary-plans/) |
| Site and area specific policies | 868 / 868 | `data/planning-map/sasp.geo.json` | [source](https://open.toronto.ca/dataset/site-and-area-specific-policies/) |
| Minister-approved transit station areas | 120 / 120 | `data/planning-map/mtsa.geo.json` | [source](https://open.toronto.ca/dataset/minister-approved-major-transit-station-areas/) |
| Parks | 3,273 / 3,274 | `data/planning-map/parks.geo.json` | [source](https://open.toronto.ca/dataset/parks/) |
| Parks and recreation facilities | 1,802 / 1,802 | `data/planning-map/recreation.geo.json` | [source](https://open.toronto.ca/dataset/parks-and-recreation-facilities/) |
| Library branches | 101 / 112 | `data/planning-map/libraries.geo.json` | [source](https://open.toronto.ca/dataset/library-branch-general-information/) |
| Schools – all types | 1,173 / 1,173 | `data/planning-map/schools.geo.json` | [source](https://open.toronto.ca/dataset/school-locations-all-types/) |
| Licensed child-care centres | 1,101 / 1,101 | `data/planning-map/childcare.geo.json` | [source](https://open.toronto.ca/dataset/licensed-child-care-centres/) |
| Heritage register | 12,332 / 12,332 | `data/planning-map/heritage.geo.json` | [source](https://open.toronto.ca/dataset/heritage-register/) |
| Heritage conservation districts | 32 / 32 | `data/planning-map/heritage-districts.geo.json` | [source](https://open.toronto.ca/dataset/heritage-conservation-districts/) |
| Natural heritage system | 1 / 1 | `data/planning-map/natural-heritage.geo.json` | [source](https://open.toronto.ca/dataset/natural-heritage-system/) |
| Ravine and natural-feature protection | 854 / 854 | `data/planning-map/ravines.geo.json` | [source](https://open.toronto.ca/dataset/ravine-natural-feature-protection-area/) |
| Environmentally significant areas | 92 / 92 | `data/planning-map/esa.geo.json` | [source](https://open.toronto.ca/dataset/environmentally-significant-areas/) |
| Pedestrian network | 87,105 / 87,105 | `data/planning-map/walking.geo.json` | [source](https://open.toronto.ca/dataset/pedestrian-network/) |
| TTC scheduled stops | 9,409 / 9,409 | `data/planning-map/ttc-stops.geo.json` | [source](https://open.toronto.ca/dataset/ttc-routes-and-schedules/) |
| Development applications | 22,352 / 26,648 | `data/planning-map/applications.geo.json` | [source](https://open.toronto.ca/dataset/development-applications/) |
| Development pipeline projects | 2,234 / 2,391 | `data/planning-map/pipeline.geo.json` | [source](https://open.toronto.ca/dataset/development-pipeline/) |
| Committee of Adjustment – active | 2,649 / 2,785 | `data/planning-map/coa-active.geo.json` | [source](https://open.toronto.ca/dataset/committee-of-adjustment-applications/) |

### City of Oshawa

| Layer | Mapped / source rows | Local normalized file | Official source |
|---|---:|---|---|
| Oshawa wards | 5 / 5 | `data/planning-map/oshawa-wards.geo.json` | [source](https://map.oshawa.ca/arcgis/rest/services/Operational/OpenData/MapServer/11) |
| Oshawa neighbourhoods | 90 / 90 | `data/planning-map/oshawa-neighbourhoods.geo.json` | [source](https://map.oshawa.ca/arcgis/rest/services/Operational/OpenData/MapServer/8) |
| Oshawa parks | 141 / 141 | `data/planning-map/oshawa-parks.geo.json` | [source](https://map.oshawa.ca/arcgis/rest/services/Operational/OpenData/MapServer/9) |
| Oshawa education facilities | 77 / 77 | `data/planning-map/oshawa-schools.geo.json` | [source](https://map.oshawa.ca/arcgis/rest/services/Operational/OpenData/MapServer/3) |
| Oshawa community centres | 20 / 20 | `data/planning-map/oshawa-community-centres.geo.json` | [source](https://map.oshawa.ca/arcgis/rest/services/Operational/OpenData/MapServer/7) |
| Oshawa zoning | 2,459 / 2,459 | `data/planning-map/oshawa-zoning.geo.json` | [source](https://map.oshawa.ca/arcgis/rest/services/Operational/PopularLayers/MapServer/17) |
| Oshawa existing land use | 61,548 / 61,549 | `data/planning-map/oshawa-land-use.geo.json` | [source](https://map.oshawa.ca/arcgis/rest/services/Operational/OpenData/MapServer/0) |

### Region of Durham

| Layer | Mapped / source rows | Local normalized file | Official source |
|---|---:|---|---|
| Durham education facilities | 274 / 274 | `data/planning-map/durham-schools.geo.json` | [source](https://maps.durham.ca/arcgis/rest/services/Open_Data/Durham_OpenData/MapServer/6) |
| Durham child care | 333 / 333 | `data/planning-map/durham-childcare.geo.json` | [source](https://maps.durham.ca/arcgis/rest/services/Open_Data/Durham_OpenData/MapServer/3) |
| Durham healthcare facilities | 111 / 111 | `data/planning-map/durham-healthcare.geo.json` | [source](https://maps.durham.ca/arcgis/rest/services/Open_Data/Durham_OpenData/MapServer/8) |
| Durham protected station areas | 8 / 8 | `data/planning-map/durham-pmtsa.geo.json` | [source](https://maps.durham.ca/arcgis/rest/services/Open_Data/OfficialPlanConsolidation2024_Map1/MapServer/20) |
| Durham OP community areas | 75 / 75 | `data/planning-map/durham-op-community.geo.json` | [source](https://maps.durham.ca/arcgis/rest/services/Open_Data/OfficialPlanConsolidation2024_Map1/MapServer/27) |
| Durham OP employment areas | 72 / 72 | `data/planning-map/durham-op-employment.geo.json` | [source](https://maps.durham.ca/arcgis/rest/services/Open_Data/OfficialPlanConsolidation2024_Map1/MapServer/28) |
| Durham OP specific policy areas | 6 / 6 | `data/planning-map/durham-op-specific-policy.geo.json` | [source](https://maps.durham.ca/arcgis/rest/services/Open_Data/OfficialPlanConsolidation2024_Map1/MapServer/18) |
| Durham OP airports | 2 / 2 | `data/planning-map/durham-airports.geo.json` | [source](https://maps.durham.ca/arcgis/rest/services/Open_Data/OfficialPlanConsolidation2024_Map1/MapServer/4) |
| Durham municipal boundaries | 8 / 8 | `data/planning-map/durham-municipalities.geo.json` | [source](https://maps.durham.ca/arcgis/rest/services/Open_Data/Durham_OpenData/MapServer/1) |

### Toronto and Region Conservation Authority

| Layer | Mapped / source rows | Local normalized file | Official source |
|---|---:|---|---|
| TRCA regulated area | 6,307 / 6,307 | `data/planning-map/trca-regulated.geo.json` | [source](https://services1.arcgis.com/d0ZCwU7eGKVeNiEE/arcgis/rest/services/TRCA_Regulation_Limit2/FeatureServer/0) |

### Ontario Land Information Ontario

| Layer | Mapped / source rows | Local normalized file | Official source |
|---|---:|---|---|
| GTA lower/single-tier municipalities | 39 / 39 | `data/planning-map/gta-municipalities.geo.json` | [source](https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open03/MapServer/14) |
| GTA regional boundaries | 10 / 10 | `data/planning-map/gta-regions.geo.json` | [source](https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open03/MapServer/13) |

## Reproduce and refresh

```sh
npm run map:collect
npm run map:collect:regional
npm run map:verify
node scripts/report-planning-map.mjs
npm run map:preview
```

Target one source with `node scripts/collect-planning-map.mjs --only=zoning` or `node scripts/collect-planning-map-arcgis.mjs --only=oshawa-zoning`. Use `--refresh` to force fresh source-response downloads. Default cached responses support reproducible reprocessing; the ArcGIS collector requires `--refresh` for an actual new observation of existing IDs. Restart the preview after collection so it loads the new manifest.

Raw compressed response caches and normalized bulk files are git-ignored. Source code, this handoff, the manifest and regional-source register remain reviewable. Keep these local artifacts or regenerate them on another machine; Git alone will not transfer the large dataset files. The previous research seeds remain as historical research assets.

## How this becomes the product map

1. **Collect:** publisher package/resource discovery -> complete paginated rows or ArcGIS object-ID batches -> retained raw-response hashes. Never ingest a map screenshot as if it were a data layer.
2. **Normalize:** GeoJSON longitude/latitude (EPSG:4326), original feature attributes, bounding boxes, source counts, exclusions and hashes. Shapefile coordinates are transformed using their embedded CRS through the existing shpjs library; ArcGIS queries explicitly request outSR=4326. No analysis-geometry simplification is applied.
3. **Resolve the site:** search the local municipal address index -> user selects the right address point -> obtain/confirm the development-site footprint later. Address point, property boundary, building entrance and legal parcel are different geometries.
4. **Join:** polygon intersections for zoning/plans/wards/regions; nearby geometry searches for amenities/transit. Keep publisher, current administering authority, in-force date, source date and user override separate. A rendered layer being hidden never switches its policy off.
5. **Render:** the preview sends only viewport-intersecting features, capped at 1,600 with an explicit zoom-in notice. For production, replace full in-memory scans with a measured spatial index or vector tiles while preserving full-resolution geometry for analysis.
6. **Explain:** join matched feature identifiers to reviewed policy clauses. Current preview links official policy pages and shows raw attributes; it does not parse every legal clause or auto-approve a proposal. Policy choices/amendment scenarios must preserve the current-law record.
7. **Update:** central source-specific refresh with last-good snapshots, change review and pinned data versions. Keep project/scenario snapshots independent from mutable public layers. Production refresh scheduling is not implemented.

## Important exclusions and source issues

- Development applications, pipeline and Committee of Adjustment records are mapped only where they match an exact normalized official municipal address. Unmatched records remain in per-layer exclusion files; raw source rows remain in the response cache. Projected application X/Y values were not converted using an assumed CRS. A later verified CRS transformation/address resolver can improve coverage.
- Several datasets have sentinel values such as -1. They are preserved as source codes, not presented as real limits or zero. Unit/field interpretation must come from the publisher dictionary and applicable by-law.
- Toronto zoning does not cover every legacy by-law/property. A missing zoning polygon is not absence of zoning. Toronto Official Plan **map-sheet index** service was located, but it is not the land-use designation polygons; do not substitute it. Current land-use designations still require a verified machine-readable source or careful reconciliation to official maps.
- Toronto property-boundary data is available: package `property-boundaries`, datastore resource `4270614e-0b5e-4b54-a2bb-18ef92237646`, source count 498,477 at discovery. The full property fabric has not been collected in this pass. Use an indexed source or separately verified viewport/parcel retrieval before adding site-footprint analysis.
- TRCA regulated-area data is now downloaded from an explicitly licensed publisher item. It is a conceptual screening boundary: regulation can apply to an unmapped feature. Flood-hazard components were located in the regulation web-map source inventory; those viewer resources have separate/no explicit item licence metadata and are not silently treated as the licensed download.
- Full airport height/obstacle surfaces, aviation noise contours, observed flight tracks, individual utility capacity and complete program/CIP/charge polygons are not supplied by this collection. Nearby airports alone do not answer those questions.
- Pedestrian segments are collected, but route topology, public access, accessible entrances, closures and walking-time calculations are not validated. Displayed distances are approximate straight-line distances to source geometry, not policy-distance compliance.
- The current preview address search is Toronto-only. Oshawa/Durham layers work by map or coordinate selection. York, Halton and Peel have provincial municipality/region boundaries and documented regional primary sources, not Toronto-level detailed coverage.
- Some rows lack or have empty geometry. See manifest `excludedCount` and per-layer `.unmapped.json`; mapped counts are never asserted to include those records.

## Regional policies are distinct from municipal zoning

`data/planning-map/regional-policy-sources.json` joins primary regional plan/charge/service sources to matched York, Durham, Halton and Peel polygons. Durham's planning-responsibility change is dated January 1, 2025; Halton and Peel describe changes effective July 1, 2024. A former regional plan can remain relevant while a local municipality administers it. Water/wastewater, regional roads, servicing allocation, DCs, front-ending and agreements require separate authority/date checks. Source identification is not executable fee/eligibility logic.

## Broader GTA source entry points

- [York official open data](https://www.york.ca/york-region/statistics-and-data/open-data) -> [publisher catalogue](https://insights-york.opendata.arcgis.com/). Regional data is not a substitute for each lower-tier zoning by-law.
- [Peel data portal](https://data.peelregion.ca/) includes links to Brampton, Caledon, Mississauga and conservation-authority catalogues. Follow each dataset's original publisher and licence.
- [Halton planning/servicing](https://www.halton.ca/the-region/supporting-land-use-planning) and [allocation/development context](https://www.halton.ca/the-region/supporting-land-use-planning/planning-applications). Local official plans/zoning remain municipality-specific. No UK Halton datasets are used.
- [Metrolinx open data](https://www.metrolinx.com/en/about-us/open-data) publishes GO/UP schedule feeds and existing/future transit network downloads with its own licence. Official page source was saved for feed discovery. GO/UP feeds have not yet been ingested; TTC stops are ingested.

## Verification evidence and limits

Integrity verification: 49 files/counts/hashes checked; 0 failures. Known City Hall address resolves to ward 10. 251 deterministic address/ward geometry samples have 0 disagreements. See local verification.json for details. This establishes internal source consistency, not surveyed accuracy.

The local browser smoke check exercised address lookup, site dossier and layer toggles without browser exceptions. A separate style/cluster/mobile/accessibility check is recorded in `data/research/planning-map-browser-check.json`. Source licence links/attributions are in the manifest; original licence pages are cached locally. No secrets, financial engine changes, hosted schema changes or public deployment were part of this work.

Release gate: PASS for executed collection/integrity and recorded preview checks; BLOCKED for a public professional-planning claim pending independent parcel/legal/source-currency review, production access/refresh controls, complete policy interpretation and full manual accessibility review. Supabase and the existing pro forma app have not been changed.

# PlanGTA representative street strip

Owner direction, 2026-10-21: an automatically assembled, proportionate illustration of project inputs and mapped surroundings. It is not an architectural configurator. No siding, roof-style or floorplate-style picker. Master plans use a continuous strip of buildings/elements, not a single hero tower. Keep a flat elevation or very shallow consistent side depth; test restrained watercolour/pencil and matching blueprint skins.

## Reduced component catalogue

| Family | Reusable components | Selection basis |
|---|---|---|
| Residential | House/multiplex, townhouse row, low-rise apartment, mid-rise, tower, podium | Supplied use, count, storeys/height, podium; generic form where detail is absent |
| Non-residential | Retail unit/strip, mixed-use ground floor, office, industrial/warehouse, hotel/residence | Program and supplied use |
| Civic | School, childcare, library, community/recreation building, health/service building | Proposed program or mapped existing facility, clearly distinguished |
| Building features | Repeating floors/windows, balconies, shopfronts, lobby, heritage base, garage/loading entrance | Input facts or documented context; generic windows are illustrative |
| Roof features | Green roof, solar, amenity terrace, pool, screened mechanical equipment | Explicit input flags/areas; do not add every feature to every roof |
| Site organization | Building/phase block, retained building, future building, courtyard/open space, rear lane, boundary | Project hierarchy and site information; layout schematic unless geometry supplied |
| Landscape | Tree, tree cluster, planting bed, lawn, rain garden, park, plaza, playground, sports area, community garden | Proposed landscape input or mapped existing context |
| Water/nature | Lake edge, creek/river, pond, ravine/woodland, promenade/trail, bridge, distant water cue | Mapped geometry, feature type, bearing and distance; access/bridges require their own evidence |
| Street | Road ribbon, sidewalk, curb, median, intersection, crossing, driveway | Source road class/geometry; unknown widths use explicit illustrative defaults |
| Active travel | Cycle lane/track, multi-use path, bike rack, bike-share dock, accessible ramp | Mapped or proposed features; generic racks can be scene dressing |
| Transit | Bus pole/shelter, bus, streetcar/track, LRT platform, subway entrance/elevator, rail platform/train | Match actual mode/entrance where known; station-area membership alone does not locate an entrance |
| Vehicles | Small car, van, delivery truck, service/emergency vehicle, bicycle | Limited generic illustrative fleet; not measured traffic or vehicle counts |
| People | Walking/seated person, child/caregiver/stroller, wheelchair/cane user, cyclist, waiting passenger | Generic scene dressing; not demographic or demand evidence |
| Street furniture | Lamp, bench, bin, bollard, traffic signal, signpost, planter, hydrant, utility cabinet, manhole | Mapped/proposed when available; otherwise clearly illustrative details |
| Servicing/construction | Loading bay, waste enclosure, transformer/vault, stormwater feature, excavation, crane, hoarding | Explicit program/stage/servicing inputs; underground cutaways optional |
| Information overlays | Building ID, phase/status, zoning/aviation limit, excess-height hatch, source/unknown cue, proposal-vs-limits comparison | Supported project facts and reviewed rules; no blanket compliance claim |

Visual variety comes from height/use/features and a small consistent symbol library. Material and decorative differences are neutral illustration conventions, not evidence of selected specifications. Affordable/rental/condo tenure does not imply a distinct facade.

## Proportion rules

- Shared world units, vertical datum and projection: a 50 m building is taller than a 40 m building (25% taller from the same ground datum). Avoid nonlinear per-building height compression.
- Use supplied heights; only estimate from storeys with an explicit use-specific convention when heights are unavailable. Mark estimated versus known values. Ceiling height, floor-to-floor height and total height are different.
- Give generic scene objects a bounded reference size. For illustration only, a car may use about 4.5 m long × 1.8 m wide, an adult about 1.7 m tall, and a standard bus about 12 m long. These are defaults, not measurements of source features or universal vehicle dimensions.
- One projection and zoom transforms the entire scene. Vehicles/people/furniture do not grow to fill available space. On zoom-out, omit details or use an anchored callout rather than enlarging geometry.
- If horizontal spacing is schematic/compressed to fit a master plan, disclose that. Preserve relative building heights; do not claim footprint accuracy without geometry. Width estimated from floor area/storeys is an illustrative massing assumption, not the actual floorplate design.
- For long master plans, pan the strip or group by actual street/phase; do not shrink every building into an unreadable miniature or imply all phases physically front the same real road.

## Data and keyword rules

1. Structured project inputs drive proposed buildings and features. Keywords in imported material suggest structured values for confirmation; handle negation, existing vs proposed, alternatives and scope. “No underground parking” must not create a garage.
2. Spatial queries supply existing context, bearing, distance, source/version and geometry when available.
3. Keep proposed, existing, estimated, unknown and decorative pieces distinct. An amenity near the address is not automatically part of the development.
4. Decorative people/cars/furniture may use a stable seeded composition. They have no effect on financial results and imply no measured counts or actual installed furniture.
5. Missing nearby features mean “not found in the checked sources,” not proof of absence.

## Water rule

Measure to mapped water geometry from the site footprint when available, otherwise from the selected address point and label that basis. Keep feature type and bearing. Render water within the represented geographic extent only where supported. More distant water gets a direction/distance cue or contextual vignette, not a fabricated shoreline adjoining the parcel. A proximity threshold is an adjustable illustration parameter, not a flood designation, setback, access entitlement or water-view claim. No water proximity result clears flood/regulated-area obligations.

## Policy comparison

Owner suggested “design as per policy.” Implement the intent as Proposal / Apply known policy limits. Initially this can compare supported height/massing constraints and identify changes/unresolved rules. It cannot assert all-policy compliance or infer that removed floors solve density, setbacks, use, heritage, aviation or other requirements. Applying FSI to a massing requires lot/area assumptions; setbacks need footprint/parcel geometry.

A viewing toggle does not change the pro forma. If the user wants to price the constrained alternative, explicitly create a child scenario with a recalculated program, areas, revenue and costs; show the change before acceptance. Amendment/variance scenarios remain valid alternatives and are not styled as invalid projects.

## Runtime without a live AI agent

Address lookup → site point/footprint → server spatial context query → versioned context record → pure scene builder → SVG pencil/watercolour or blueprint renderer.

- Current lookup/query: `scripts/planning-map-preview.mjs`, `/api/search`, `/api/site`, `/api/features` in the local service. Hosting/packed-data work may evolve separately; confirm deployed capability before claiming it live.
- Current message bridge: `scripts/planning-map-preview.html` sends `planning-map:site` to `src/ui/SiteMap.tsx`, with same-origin/source checks. Current message chiefly carries matches, selected properties and nearby names/distances; extend it with bounded context geometry, bearings, stable IDs and provenance for scene use.
- Current interpretation: `src/location/zoning.ts` and project attributes/source records. Prefer a dedicated typed context record over stuffing every geometry into individual scalar attributes.
- Current scene/render separation: `src/ui/streetscapeScene.ts` builds the scene; `src/ui/Streetscape.tsx` draws it. Extend these (or a pure scene module) to consume context plus project hierarchy. Both skins share the exact same scene geometry.
- Proposed hosted context endpoint: accepts a validated location/footprint and bounded context extent, returns only nearby features. Scheduled public-source ingestion prepares simplified spatial partitions/indexes; the browser does not download the whole regional collection. No LLM calls are needed in this path.
- Pin context/source versions with snapshots. Failed refreshes retain last-good data and its date. Changing address invalidates the old site's context; do not leave old amenities attached to the new address. Use one geographic transform and avoid rendering proposed and existing buildings twice on the project site.

## Sources and gaps

Existing collected sources include Toronto addresses, roads/pedestrian network, TTC stops, parks, schools, libraries, childcare, heritage, zoning and policy overlays, plus selected Durham/Oshawa layers. Presence in the collection does not guarantee the precise geometric detail needed by the street strip.

[Toronto 3D Massing](https://open.toronto.ca/dataset/3d-massing/) is a promising source of simplified background buildings. Live CKAN metadata checked 2026-10-21 describes illustrative context massing and refers to the Open Government Licence, although the machine licence field says “License not specified.” Resources include older dated shapefile/multipatch packages; package modification is not the observation date of every building. Check the selected resource's rights, fields, coverage, elevation conventions and currency before ingestion. It has not been ingested for this concept work.

[Toronto Land And Water Area service](https://gis.toronto.ca/arcgis/rest/services/cot_geospatial27/FeatureServer/40) is a discovered candidate, not an ingested/licence-verified water dataset. Select a source with the required lake/river/pond detail and reuse terms; the land/water layer may not cover every small watercourse. Additional shoreline/watercourse data are needed before claiming comprehensive water context.

Google Earth screenshots should not be treated as freely reusable commercial app backgrounds. [Google Geo Guidelines](https://about.google/intl/en-GB_ALL/brand-resource-center/products-and-services/geo-guidelines/) direct commercial app integrations to Maps Platform and restrict Earth use. A supported Maps Platform integration can support our independent overlays, subject to its terms, attribution, billing and technical integration; [Map Tiles policies](https://developers.google.com/maps/documentation/tile/policies) distinguish overlays from extracting/tracing Google geometry. Public geometry with our own rendering is the recommended first version. A photorealistic georeferenced view would be a separate optional map mode, not a pasted screenshot behind a schematic strip.

## Images

01–06 are the original broad neighbourhood explorations. They are more 3D and architecturally specific than the clarified product needs. 07–08 test the later flat street-strip direction. All are synthetic imagegen concepts, not real sites, executable scene components, scale validation or policy checks. Source prompts and mode are in `prompts.json`. No application implementation or deployment is part of this deliverable.

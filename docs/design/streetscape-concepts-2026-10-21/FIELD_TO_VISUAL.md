# Field-to-visual rules for the approved street-strip direction

Reviewed 2026-10-21 against the current application catalogue (202 variables, 247 cost items) and `ProjectInput` / component / portfolio contracts. This is a review of the app's canonical information, not a verification of arbitrary future imported spreadsheets. Concurrent development can change counts.

Owner approved the flat restrained watercolour/pencil strip (07) and blue-background strip (08) as the two visual baselines. Use the latter as the basis for a disciplined blueprint skin. The original six neighbourhood explorations remain references, not the implementation target. No component implementation or deployment was requested in this phase.

## Four evidence states

- **Known input:** render the stated feature, without inventing its design or location.
- **Estimated:** render a neutral template with a stated assumption; do not promote it to a measured fact.
- **Mapped context:** existing surrounding feature with geometry/provenance/date, separated from the proposal.
- **Decorative:** people, cars, generic lamps and furniture add scale/life without claiming measured counts or installed assets. Keep these visually secondary and bounded in size.

## Supported visual families

| Visual | Actual field/source | What we can reasonably show | What we must not infer |
|---|---|---|---|
| Building count and grouping | Portfolio children, offsets, project IDs | One repeatable block per supplied building; phase grouping | Exact site layout/frontage order without site geometry |
| Height/floors | `program.storeys`, catalogue `planning.storeys` | Stack repeated floors; share one height convention across buildings | Height in metres is not currently a measured proposed-height field; do not confuse zoning maximum with actual proposal height |
| Podium | `program.podiumStoreys` | Generic lower base when explicitly supplied | Setbacks, podium width or structural shape |
| Relative bulk | GCA, planning GFA, unit mix, storeys, commercial NLA | Schematic width/bulk with a disclosed convention; label quantities | True footprint, floorplate outline, window/unit layout or perimeter |
| Land-only component | `landSale`, `mp.lotSalesToBuilders` | Vacant/serviced lot or future development placeholder | Drawn completed homes merely because lots will be sold |
| Residential/commercial use | Rental/condo/commercial component kinds and commercial use | Generic residential, shopfront, office or industrial template | Architectural appearance from tenure, affordability or sales price |
| Civic use | `program.institutional`, `program.childcare`, `mp.communityCentre` | Generic civic/childcare/community block where identified as proposed | Specific library/arena/school subtype from a broad institutional boolean |
| School reservations | `mp.schoolSites` | Reserved-school-site symbol/count | Completed school building or approved school design |
| Balconies | `design.balconies` | Standard repeatable balcony marks when explicitly true | Projecting vs recessed, glass guard design or exact arrangement |
| Retail | Retail component / `program.retailNla` | Neutral storefront glazing/base | Named tenants, cafe patio, awning or grocery type without evidence |
| Green roof | `design.greenRoofM2` | Generic planted roof patch and known-area annotation if useful | Exact roof planting layout or coverage without available-roof geometry |
| Solar | `design.solarPv` | Small standard PV symbol | Installed capacity, array layout or panel count |
| Rooftop amenity | `program.rooftopAmenity` | Generic terrace/seating marker | Exact pergola/design or dimensions |
| Pool | `program.pool` | Pool amenity badge; show a physical pool only if location is known | Rooftop pool; current renderer's roof placement is not justified by this flag alone |
| Other internal amenities | Fitness, concierge, lockers, co-working/party room, pet spa/dog run | Optional small amenity badges/details panel | Visible external location or outdoor dog run from a combined internal/external field |
| Parking/access | Stall/level counts, `design.vehicleAccessPoints`, loading spaces | Garage/loading/access symbols and count labels | Exact ramp, circulation or driveway location; one icon per parking stall |
| EV readiness | `planning.evReadyShare` | EV-ready label/symbol | Installed operating chargers |
| Bike parking | `planning.bikeParking` | Bike-parking symbol plus supplied count | Exact rack count/type or all spaces outdoors |
| Landscape | Landscaping area, streetscape length, park dedication, `mp.parksHa`, POPS | Generic landscape/park/plaza token with quantity where known | Exact landscape plan, playground or sports field from area alone |
| Protected trees | `site.protectedTrees` | Review/removal notice, preserving the field's stated meaning | Use a count of protected trees to remove as a count of retained trees in the scene |
| Heritage | Heritage listing/district flags and mapped records | Heritage marker/context identity | Brick base, arches, retained facade or permission to alter a heritage property |
| Existing buildings | `site.existingBuilding`, context geometry | Generic existing-building ghost, or sourced massing | Retention/demolition decision without program/stage evidence |
| Road/sidewalk | Frontage road class, ROW width, sidewalk description, pedestrian geometry | Matching road/sidewalk context; disclose width/lane defaults | Actual lane counts from road class alone |
| Crossing | Type/distance plus map geometry | Context marker with direction/distance; physical placement if geometry supports it | A crossing directly outside the property merely because the nearest is 48 m away |
| Bus/subway/rail | Mode/stop/entrance geometry; nearest-stop metadata | Mode-specific context and actual entrance where sourced | TTC proximity as a subway entrance; MTSA as GO/subway classification; `mp.transitIntegration` as proof of built infrastructure |
| Water | `site.waterfront`, `mp.shorelineWorks`, future waterbody geometry | Waterfront/shoreline-work marker from input; real water context from geometry | Water-table/dewatering/flood/conservation flags as proof of a visible river or lake |
| Servicing | Stormwater tank, hydro vault, generator, pumping station, SWM pond count, network lengths, district energy | Small servicing badges or optional explanatory underground view | Exact locations, capacity, clearances or engineering scheme |
| Construction | Duration, shoring, crane months, tracker stages | Optional construction-state symbols when the chosen stage calls for them | Actual construction progress from budget allowance alone |
| Policy | Height maxima, FSI/coverage, holding/exception, airport height, sourced policy sections | Limits/constraint markers and review notes | Schematic compliance or geometry for rules not encoded/verified |
| Stepbacks/setbacks | No general numeric proposed-geometry fields in current model | Sourced “stepback/setback requirement to check” indication | Invented terraced building geometry or a solved legal envelope |
| Finance/costs | Cost lines, rates, returns, estimate classes, provenance | Optional selected-building accounting annotations | Higher price means luxury facade; structural cost means confirmed architecture |
| Demographics | Census geography/year, household/income/age/commute shares | Context panel/chart with geography and date | Character-by-character demographic simulation or inferred behaviour in the illustration |

The catalogue includes `design.structure`, `design.envelope` and `design.energySystem` as broad estimating assumptions. Retain their financial role; they do not justify adding architectural design selectors or detailed facade modelling. A simple visual may use the same neutral exterior regardless of these inputs.

## Input consistency before rendering

Some catalogue scalar quantities duplicate engine values (`planning.storeys`, `program.gcaAboveSqft`, unit counts, etc.). Establish an authoritative binding before using them in the picture. Prefer the selected engine project/building for the proposed program; use the effective scoped attribute for features and mapped facts. Surface conflicts rather than drawing one quantity while calculating another. Unknown height should produce an unknown/estimated-height template, not silently derive storeys from a fixed 9,000 ft² floorplate.

## Keep the kit small

The implementation kit is primarily: repeatable building base + floor + roof cap; optional podium/shopfront/balcony/amenity markers; generic civic/employment templates; park/tree/water/context tokens; a street and transit kit; small furniture/vehicle/person libraries; and constraint overlays. Variety comes from truthful stacking, quantities and feature presence, with consistent illustration skins. There is no architectural options catalogue for the user to manage.

## Policy view and geographic context

The proposed toggle compares the proposal with supported known limits. It must preserve unanswered questions: reducing height does not solve setbacks, floor area, use permissions or other approval requirements automatically. Show stepback requirements as annotations until both actual proposal geometry and applicable rules support more. Keep the financial draft untouched until a separately reviewed child scenario is created.

A master-plan strip is schematic ordering unless a particular real street is selected and building frontages are known. Actual geography belongs in the context map. Nearby backgrounds are subdued, correctly directed/distance-labelled and sourced; do not paste a geographic photo behind a re-ordered strip and imply precise alignment. See `COMPONENTS_AND_CONTEXT.md` for the deterministic address → context → scene architecture and source/licensing notes.

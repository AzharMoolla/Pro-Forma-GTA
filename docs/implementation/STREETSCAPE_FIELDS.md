# Streetscape: what each field draws

Audit date: 2026-10-22. Code: `src/ui/streetscapeScene.ts` (the rules) and `src/ui/kitStreetscape.ts` (the drawing).
In the app, "What drives this picture" under the streetscape lists every piece drawn for the open project and the field behind it.

**Rule:** the picture shows only what the data says. An unknown field draws nothing. The two exceptions are a 2-lane street and sidewalks on both sides, and the list says when it is using them.
Every piece is illustrative. None of it is a surveyed layout, a building envelope or an approval.

## Drawn

| Source | Field | Drawn as (kit piece) |
|---|---|---|
| Program | components: rental, condo, office, industrial, other, land sale | Tower, mid-rise, townhouses, office (04), industrial (05), civic (06) or land plot (09) |
| Program | storeys, above-grade GCA | Height and width |
| Program | podium storeys, a retail component | Podium with shopfronts (02, 12) |
| Program | a retail component | People, bench and bins in front (48, 52, 53) |
| Plan tree | buildings grouped in phases | Phase badge showing phase n of N (60) |
| Site map | zoning.heightLimitStoreys / zoning.heightLimitM | Dashed limit line; hatching above it (59) |
| User | site.aeronauticalLimitM | Blue limit line |
| Site map | site.nearTtc60m; Toronto site.majorTransitStationArea | Subway entrance (42) |
| User | mp.transitIntegration; site.majorTransitStationArea outside Toronto | GO platform and train (43, 44) |
| User | site.nearRailCorridor | Rail track behind the buildings (61) **new** |
| User | site.transitInfrastructureBelow | Subway tunnel section under the street (62) **new** |
| Site map | site.heritage | Existing building kept in front (08) |
| User | design.balconies, design.greenRoofM2, design.solarPv | Balconies (11), green roof (14), solar (15) |
| User | program.rooftopAmenity, program.pool, program.childcare | Roof terrace (16), amenity badge (17), playground (24) |
| User | planning.bikeParking | Bicycle rack (38) **new** |
| User | planning.pops | Plaza (23) **new** |
| User | planning.loadingSpaces, planning.parkingLevelsBelowGrade, mp.sharedParkingStructure | Garage / loading door (56) **new** |
| User | design.hydroVault, design.standbyGenerator, mp.districtEnergy, mp.pumpingStation | Utility box (57) **new** |
| User | design.streetscapeM, design.landscapingM2 (**new**), site.protectedTrees | Street trees (18) |
| User | mp.parksHa, planning.parklandOnSite | Park (22) |
| User | mp.schoolSites, mp.communityCentre | Reserved school site (07), community centre (06) |
| User | mp.swmPonds; site.floodplain; site.waterfront / mp.shorelineWorks; site.regulatedArea | Pond (28), creek (26), lake edge (27), ravine (29) |
| User | site.greenbelt | Woodland (19) **new** |
| Site map | site.frontageRoadClass | Lanes (2, 4 or 6) |
| Site map | site.sidewalks | Sidewalks on one side, both sides or neither |
| Site map | site.nearestCrossingM | Crosswalk (33) |
| User | design.vehicleAccessPoints | Driveways (35), up to 3 |
| Site map | site.nearestTransitStopM | Bus shelter and stop pole (39, 40) **new**, plus the bus |

## Listed as tags under the picture (not drawn)

- **Street:** road class and right-of-way width.
- **Parking:** stalls, levels below grade and parking zone.
- **Bicycle parking:** the number of spaces.
- **Loading and access:** loading spaces and driveways.
- **Servicing:** stormwater tank, dewatering, utility relocation, hydro vault and pumping station.
- **New roads and services:** lengths of the `mp.*` roads and pipes.
- **Frontage:** the frontage length.
- **Existing building on site** **new**, with its existing rental units.
- **Zoning notes:** zone code, FSI, coverage, holding (H), exception, heritage and regulated area.

## Deliberately not drawn

| Fields | Why |
|---|---|
| Costs, market, finance, tax, construction schedule | They change the numbers, not what the street looks like. |
| demo.* (census) | They describe the people in the area, not buildings, so drawing them would imply facts nobody has. |
| site.contamination, excessSoil, rockExcavation, highWaterTable, archaeologicalPotential | These are below-ground risks. Dewatering is listed as a tag. |
| site.nearHighway, site.nearMajorFacility | There is no honest piece for them yet. A highway or a tank farm needs its own context component. |
| site.heritageDistrict | A district is an area, not this building. Only a listed or designated property (site.heritage) is drawn. |
| program.fitness, concierge, lockers, petSpaDogRun, coworkingPartyRoom, wasteChuteCompactor | They are indoors. |
| planning.publicArt, design.signage | There is no kit piece yet. A public-art piece would be a small add. |
| mp.employmentHa | The area alone does not say what gets built. Model the buildings as office or industrial blocks and they are drawn. |

## Gaps worth closing next

1. **Construction status:** construction kit (58) on buildings the tracker marks as under construction. This needs the tracker status passed into the scene.
2. **Cycle lane:** cycle lane (36) once the site map adds the City's cycling network layer. There is no field for it today.
3. **Later phases as ghosts:** future-phase block (10) for phases that start after the current month. This needs a "view as of month" control.
4. **Highway or rail noise wall** and **major facility** context pieces for site.nearHighway and site.nearMajorFacility.

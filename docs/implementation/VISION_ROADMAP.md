# Vision and roadmap: a one-stop planning and feasibility tool

Date: 2026-10-21. Owner direction, recorded so later work can be checked against it. Each step names its data and its limits.

## The final form (owner's words, summarized)

Draw or paste a development footprint anywhere in the GTA → get every planning consideration for that exact spot (zoning, height, density, official plan, overlays, heritage, environment, airport, transit, servicing, charges) → see which need an amendment or permission and which don't, with the policy sections that apply, cited → see what it costs and how it pencils (the pro forma) → see completed precedents nearby. Policy and finance are in scope. Design detail, community discussion, research and demographics come from other sources, linked rather than rebuilt.

## Where it stands (built)

- Address search or a pin on the map (Toronto address index; Durham/Oshawa by map), 49 open-data layers, point-in-polygon screening with sources and dates.
- Map facts flow into project variables (scoped to a building if wanted), the cost checklist, the tracker, site checks in Analysis (over height or FSI, airport, holding, exception, heritage, TRCA, Greenbelt, PMTSA), the streetscape, and the XLSX and printed report.
- "Model the rezoning" adds the time and costs of a ZBA to a branch while the as-of-right case stays locked.

## Next steps, in order

1. **Policy library with citations.** A section index for each document: number, heading, a short summary in our own words, effective date and a deep link to the official text. Rules then cite sections, e.g. "Over the height limit → Zoning By-law 569-2013 s. 40.10.40.10; Tall Building Design Guidelines s. 1.3; OP Chapter 3.1.3". First set:
   - Provincial Planning Statement 2024
   - Planning Act
   - Toronto Official Plan (chapters and maps)
   - Zoning By-law 569-2013 (chapters 10–900)
   - Tall Building, Mid-Rise and Townhouse guidelines
   - Growing Up
   - Toronto Green Standard
   - Durham ROP and Oshawa OP / ZBL 60-94

   Copyright: Ontario and City documents are linked and indexed, not republished in full, unless their terms explicitly allow it. Licence checks are per document.
2. **Draw or paste a footprint.** A polygon tool on the map, plus pasting coordinates or GeoJSON. Polygon-in-polygon checks replace the point checks: share of the footprint in each zone, and boundary cases flagged. Toronto's property-boundary dataset (about 498k parcels, located but not yet collected) helps snap to lots. Lot area, frontage and coverage then come from the drawn shape.
3. **Amendment and permission matrix.** For the proposal against each applicable rule: complies, minor variance likely, ZBA, OPA, other permit (heritage, TRCA, NAV CANADA, MTO, Metrolinx). Each row cites its source sections and feeds the cost and time model (generalizing "model the rezoning").
4. **Precedents nearby.** Toronto open data has development applications, the development pipeline (with status), Committee of Adjustment decisions and cleared building permits. A radius search can show approved and completed projects with their height, density and file links. This is feasible for Toronto. Elsewhere it depends on each municipality's open data, and some won't have it. Decisions and drawings stay on the City's site; we link.
5. **Charges by authority and date.** City, region and school-board development charges and community benefits charges by date and location; Toronto's DC reduction program; Durham's deferrals.
6. **Hosting the map for real.** The map data (about 428 MB) needs a server or object storage with a small API (for example Cloudflare R2 plus a Worker), refreshed daily for the sources that change daily, keeping the last good data.

## Keeping the data current

| Data | Script | How often |
|---|---|---|
| Screening layers (municipal, Greenbelt, CA, MTSA, secondary plans, SASPs, subway) | `npm run geo` | When the publisher updates (monthly check) |
| Planning-map layers (Toronto zoning and overlays, addresses, amenities, heritage, applications, pipeline, CoA, TTC stops, pedestrian network) | `npm run map:collect` (`--refresh` for a new download, `--only=<id>` for one layer) | Applications daily; zoning and policy when amended; others monthly |
| Durham, Oshawa, TRCA, LIO layers | `npm run map:collect:regional` | Monthly |
| Integrity check (counts, hashes, sample address-to-ward agreement) | `npm run map:verify` | After every collection |
| Cost catalogue reports | `npm run report` | After catalogue changes |

None of these run automatically yet. A scheduled job belongs with hosting (step 6).

## Limits that stay true

A map match is screening, not a zoning opinion. A missing match is not clearance. Legacy by-laws, site-specific amendments, appeals and tribunal decisions need a person to read them. The tool's job is to find, cite and cost; the planner's job is to confirm.

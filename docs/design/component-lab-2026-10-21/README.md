# PlanGTA component design lab — first two batches

2026-10-21. Original code-drawn SVG trial based on the owner-approved horizontal street-strip direction. The owner's next decision is visual: keep/refine these components or explore AI-generated references for pieces that need more character. No paid provider or AI generation was used in this implementation.

## Open and use

With the existing Vite dev server, open `/component-lab/`. This review session uses `http://127.0.0.1:5184/component-lab/`.

```powershell
npx vite --host 127.0.0.1 --port 5184 --strictPort
```

The page offers a shared-scale assembled strip, watercolour/pencil and blueprint skins, 20 paired specimen cards, enlarged inspection dialogs, copyable SVG markup, individual transparent SVG downloads and a ZIP of 48 SVGs, including four additional podium studies in both styles. The height slider is an isolated lab test, not a new architectural option in the product.

## Count

**60 planned reusable components; 20 trial components drawn; 40 remain.** Two skins produce 120 styled versions from the same underlying geometry, not 120 independent implementations. The expandable lab inventory and `inventory.json` enumerate all 60. Compound templates include primitives; individually reusable attachments/variants have their own inventory entries. This is a scope estimate based on the present list, not a guarantee every future field or source is available.

First batch: 01 apartment block, 02 mixed-use podium, 03 townhouse row, 18 tree, 22 pocket park, 39 bus shelter, 42 subway entrance, 45 car, 50 street furniture set, 26 creek/footbridge. Second batch: 04 office, 05 industrial, 06 civic, 12 shopfront, 14 green roof, 15 solar, 41 bus, 46 delivery van, 48 pedestrian figures and 49 cyclist. IDs refer to the complete inventory, not trial order.

## Geometry and evidence

Metres are the drawing coordinates, y=0 is ground. A fixed 50 m block is compared with a 20–50 m block under the same transformation. Generic car length is about 4.5 m and person height about 1.7 m; these are illustration defaults. Preview cards fit each object separately, so relative scale is judged in the assembled strip. Horizontal position is schematic; it does not claim actual site layout. Tiny roof-cap details can extend above the labelled main building body height.

The two skins share all component geometry. Exports have transparent backgrounds, internal paints/definitions and no external asset dependencies. The renderer uses deterministic line work, washes, side-face hatching and very light grain. These deliberately simple vectors are less painterly than the imagegen references, allowing stacked floors and small-file reuse.

All fixtures are synthetic. A pool is not assumed to be on a roof. A bus stop is not assumed to have a shelter. A transit area is not an entrance. Green roof/solar/amenity attachments shown in lab fixtures are explicit examples, not automatic inferences. A creek and footbridge require separate evidence in the eventual product. No financial values, policy clearance or actual site facts are asserted. No production streetscape, formula, map, account or financial engine was changed.

## Files and repeatable checks

- `src/design-lab/components.ts`: metre-based SVG pieces and assembled scene.
- `src/design-lab/main.ts`, `style.css`, `inventory.ts`: isolated lab, controls and bill of pieces.
- `component-lab/index.html`, `vite.config.ts`: entry and independent build config.
- `scripts/export-component-lab.ts`: regenerates the checked-in SVGs, ZIP and inventory here.
- `scripts/verify-component-lab.mjs`: actual browser, geometry, keyboard, export and accessibility checks.
- `svg/`: 48 current transparent SVGs; `component-kit.zip`: current complete kit. `first-ten-components.zip` remains a historical first-batch archive.
- `assembled-watercolour.svg`, `assembled-blueprint.svg`: review strips.

```powershell
node --import tsx scripts/export-component-lab.ts
node scripts/verify-component-lab.mjs
npx vite build --config component-lab/vite.config.ts
npx eslint src/design-lab scripts/export-component-lab.ts component-lab/vite.config.ts
npx tsc --noEmit
```

The independent build is in `output/component-lab/` and has not been deployed. It does not build or replace the concurrent pro forma work.

## Verification / applicable project-playbook gate

- PASS — TypeScript check, scoped lint and isolated Vite build.
- PASS — Browser rendered twenty cards and 40 download SVGs; all downloaded SVGs parsed as XML and their internal paint references resolve.
- PASS — Two skins have identical geometric attributes; actual main building body rectangles are 50 m and 40 m, and keyboard slider changes the latter to 20/50 m without changing the former.
- PASS — Desktop, 390 px mobile and open-dialog automated WCAG 2.2 AA checks have no reported violations. Mobile has no horizontal page overflow; the strip itself deliberately scrolls.
- PASS — Keyboard slider, focus restoration on skin toggle, native modal close via Escape, no duplicate SVG IDs in the inspection dialog.
- PASS — No browser runtime errors or external requests in checked flows; fonts are local. No user/project data, tracking, new packages, executable install hooks, external provider or account connection.
- PASS — Synthetic status, preview fitting, reference sizes and information triggers/limitations are displayed. Original illustration code; no third-party image tracing or copied artwork.
- NOT APPLICABLE — Payments, account authorization, data retention/deletion, hosted uploads, marketing, production DNS/secrets and provider changes: the lab implements none of these.
- NOT ASSESSED — Full assistive-technology review and public production release. This is a local design-review artifact, not a claim of complete accessibility or launch certification.

Browser evidence: `data/research/component-lab/verification.json`, paired assembly screenshots, desktop/mobile screenshots and inspector screenshot. Keep concurrent agent changes separate when reviewing or committing this work.

## Second visual pass — roof, trees, light and context

Owner feedback on 2026-10-21 prompted a focused reference study of the approved watercolour street strip. The reference cues were closed darker roof planes, inset/parapet edges, soft canopy colour variation, different tree proportions, and quiet layered background scenery. These cues are drawn in original SVG code; the AI image is a visual reference, not a runtime background or a traced building design.

- Building and townhouse tops now have filled closed quadrilateral roof planes, matching the side-face projection, with a darker roof finish, inset edge, seams and fine surface marks. The labelled building-body height is unchanged; the roof cap extends slightly beyond it.
- Trees share three repeatable silhouettes (broad/rounded, upright and irregular), with layered washes, grain and fine leaf strokes. They remain one component family; the 60/10/50 scope count is unchanged.
- Lamps have a faint downward amber gradient and small feathered edge. The effect is decorative, not photometric or a lighting-design claim.
- The assembly has a quiet two-layer sample skyline, faint window detail and background tree line. It is explicitly synthetic context, to be replaced by source-driven surroundings later.
- Three enlarged detail-study panels isolate roof, tree and lamp techniques. The people were placeholders at this stage; the next batch below replaces them.

SVG remains the recommended geometry/assembly format for repeatable floors, consistent scale, both palettes and self-contained export. If richer painterly character is needed after visual review, small reusable raster/pigment masks can supplement SVG without replacing the geometry or requiring runtime AI. No new images, external service, dependency, production renderer or financial model changes were needed for this pass.

## Car / bridge refinement and second component batch

The owner requested a closer reading of the generated reference's small vehicles, bridges and human figures before continuing. The car now has a curved cabin, separate windows, doors/handles, mirror, wheel arches, tyres and hubs. The creek crossing now has a shallow curved filled deck, visible fascia/underside, plank seams, near/far railings and landings with rock/bank connections. Both remain generic proportional symbols, not engineering/vehicle specifications.

Walking and standing adults now use filled jackets/trousers, separate arms, hair and clean head shapes rather than stick figures. The figure component also includes a wheelchair user; the cyclist has a separate filled rider and clean bicycle frame. These are illustration variants, not demographic inferences. They are used in the existing park, furniture and street strip as well as the new specimens. The assembly also shows the new bus and delivery van at the same metre scale as the cars/buildings.

The ten added components are generic program/use templates or explicit-input attachments. They do not add architectural selectors. Solar arrays and planted roof strips illustrate presence, not designed capacities/layouts. The civic template is not silently labelled a school/library. All 20 components are available in both styles and as self-contained transparent SVGs; the scope count is 20/60, with 40 remaining. No application deployment or financial-engine work is included.

## Building and full-kit refinement — 2026-10-22

Six building families and shopfronts now have stronger use-specific identities. Four supplementary podium treatments share a 17 m frontage: residential, retail, office and civic. These are fixed illustration templates, not architecture selections or policy claims. The baseline inventory remains 20 of 60 components; podium studies add eight styled exports.

Office, apartment, mixed-use, industrial and civic specimens have height controls that preserve ground-floor details. Townhouses repeat 2–12 bays sideways at 9 m; no rear site layout is inferred. Individual SVG downloads and the inspector follow the current specimen controls; ZIP exports use default fixtures.

The assembled strip supports click, Enter and Space selection with a gentle surrounding fade; clicking again or Escape clears the spotlight. This is local visual state.

Full-kit review covered all 20 paired components plus four podium studies. Fixed window/vertical-pier collisions, ambiguous office-podium entrance, stray townhouse windows and stale height-based townhouse growth, rectangular tree-grain bleed, and narrow-canopy branch marks. Earlier priority redraws of people, cyclist, bus, van, subway, shelter and park were retained and visually inspected.

Editable Figma vector review sheets: https://www.figma.com/design/wqFlM55yjjfVyJurLoNcDF?node-id=2-2 . Figma is a review/edit workbench; importing does not automatically improve illustration. The source SVG renderer remains authoritative for deterministic dimensions and both skins. No AI generation, paid upgrade or private project records were used.

Applicable playbook gate: PASS — synthetic labels, original vectors, local-only lab, no new dependencies, no external runtime requests, valid self-contained exports, shared geometry, keyboard spotlight and sliders, automated accessibility, mobile reflow, scoped lint/typecheck/build. NOT APPLICABLE — auth, billing, financial formulas, policy interpretation, personal data and deployment were not changed. Automated accessibility is not a screen-reader certification.

## Revision 3: sharpening pilot (apartment, townhouse row, office)

Shared rules in `src/design-lab/components.ts`, applied to the three pilot pieces in both skins (identical geometry):

- **One projection:** every side wall and roof rises 0.56 m per metre of depth (`RISE`), so pieces line up in a street.
- **Light from the upper left:** side walls darker, cast shadows under cornices, balconies, canopies and door heads, window reveals on the top and left inner edges, a diagonal glass sheen, and a soft ground contact shadow.
- **Three line weights** (`LW`): outline, edge, detail/fine.
- **Materials by type:** precast panel joints (apartment), brick coursing and stone lintels (townhouse), curtain wall with spandrels and heavier mullions every third bay (office). New palette keys: `shadow`, `sheen`, `brick`, `glassShade`, `spandrel`.
- **Massing:**
  - Apartment: a setback crown (amenity glazing and a louvred plant room) and a recessed corner balcony stack.
  - Townhouses: front gables with attic windows and receding roof slopes, bay windows, recessed doors in varied colours, stoops.
  - Office: a glazed corner, a double-height lobby with a canopy, and a 1.3 m crown with an equipment screen; floor heights stretch so the crown is constant.
- **Height checks unchanged:** the envelope rectangle comes first, so the scale check still measures it. The townhouse frame is now 11 m (9 m eaves, 10.7 m gable). The townhouse guard in `verify-component-lab.mjs` allows 12 m for the receding roof slope.
- **Figma:** review sheet "Pilot sharpening / Revision 3 / both styles" (node 3:1484) in the workshop file. Figma's SVG import drops pattern fills, so the brick, panel and hatch textures show in the lab and the exports but not in Figma.

### Revision 3 rollout: all 20 components and 4 podiums

- **Buildings and podiums** (full treatment):
  - Industrial: ribbed cladding, a sawtooth roof with roof lights inside the stated height, recessed loading docks with head shadows, an office corner with a canopy.
  - Civic: rusticated stone base, a dentil cornice, arched windows with keystones and reveals, a portico with paired shaded columns and the doors in the open bay, steps.
  - Shopfront: brick piers, a blank sign panel, stall risers, a recessed door, the awning's shadow on the glass.
  - Podiums: the shared projection and ground shadow; retail in brick; office with a shaded glazed ground floor and heavier mullions every third bay; residential and civic entrances with canopy shadows.
- **Small pieces** (light, contact and line hierarchy; shapes as approved):
  - People, wheelchair user, cyclist, bench, bin, trees, wheels, vehicles and park furniture all get ground contact shadows.
  - Trees get a sunlit canopy highlight; lamp poles a shaded edge.
  - Car, bus, van, shelter and subway entrance get glass sheen and lower-body or roof shading.
  - The footbridge casts a shadow on the water. The green roof gets a planter edge and taller shrubs; solar panels firmer frames, sheen and a roof shadow.
- **Fixes:** door panes no longer carry window sills, which had poked below the ground line.
- **Figma:** "Component kit / Watercolour / Revision 3 (sharpened)" (node 4:2) and "Component kit / Blueprint / Revision 3 (sharpened)" (node 4:2299) sit below the pilot sheet. Each piece is fitted to its own cell; the shared height scale is shown in the lab's assembly view. Pattern textures (brick, panel, hatch) do not survive Figma's SVG import.
- **Checks:** `scripts/verify-component-lab.mjs` passes. That covers identical geometry in both skins, the height scale, fit at minimum and maximum heights, townhouse repetition, roofs, trees and lamps, desktop, dialog and mobile accessibility, no overflow, valid XML and no external requests.

## Revision 4: batch three (40 of 60 components)

New, built to the revision 3 rules in both skins:

- **Site context:**
  - 07 Reserved school site: fenced, signed land and no building, because a reservation is not a school.
  - 08 Existing building: neutral, hatched context massing.
  - 09 Land plot: corner stakes and a frontage dimension.
  - 10 Future-phase block: a dashed ghost envelope.
- **Attachments:**
  - 11 Balcony: slab, glass guard, shadow.
  - 13 Entrance: recessed double doors, canopy, plaque, level threshold.
  - 16 Roof terrace: decking, planters, guard, umbrella, pergola.
- **Landscape and water:**
  - 19 Tree cluster.
  - 23 Plaza / POPS: paving grid, seating wall, planters, public art.
  - 24 Playground: safety surface and fence.
  - 25 Rain garden: basin below grade with a curb inlet.
  - 27 Lake edge: armour stone, boardwalk on piles.
  - 29 Ravine / woodland: a valley with a creek, conifers and deciduous trees.
- **Street and transit:**
  - 33 Crossing: zebra bars, curb ramps, tactile plates, pedestrian signal.
  - 36 Cycle lane: painted lane, foreshortened bike symbol, flex posts.
  - 40 Bus-stop pole.
  - 43 Rail platform: edge strip, canopy, stair.
  - 44 Train: bilevel coach.
  - 47 Truck: box truck.
- **Overlay:** 59 Policy-limit overlay. A red dashed height limit, a 45° angular plane and a front setback over a ghosted proposal. The parts that exceed the limits are hatched red.

**New in the drawing system:**
- A `limit` colour in both palettes.
- An optional per-piece `below` allowance for pieces drawn below grade.
- A `conifer` helper and a `ground()` helper for flat areas at the shared projection.

**Fixes:**
- Mixed use: the tower sits on its podium, set back 1.2 m, with its side wall starting at the podium roof. The green roof stays on the tower's own roof.
- Podiums are 1.2 m deep, matching the setback, so the tower's front corner lands on the podium's back corner.
- The industrial ribbon window stops short of the entrance door.
- Export and download file names keep only letters, digits and "+" (the "/" in "Plaza / POPS" broke the export).

**Figma:** "Component kit / … / Revision 4 (40 components)" (nodes 5:2 and 5:3270) sits below the revision 3 sheets.

**Checks:** the verification script now expects 40 components and 88 SVGs in the zip.

## Revision 5: the complete kit (62 components and 4 podiums)

**New:**
- **Streets:** 31 road segment, 32 sidewalk with a boulevard and tree pit, 34 intersection (sidewalk corners, both streets, crosswalks, centre line broken through the box), 35 driveway with a dropped curb and apron, 37 trail with a wayfinding post.
- **Landscape and water:** 20 planting bed, 21 lawn, 28 pond, 30 water direction cue.
- **Furniture:** 38 bicycle rack, 51 street lamp, 52 bench, 53 waste and recycling bins, 54 bollards, 55 fire hydrant.
- **Servicing:** 56 garage / loading module, 57 utility module (transformer pad, meters), 58 construction kit (hoarding, site office, 28 m tower crane).
- **Badges:** 17 amenity badge, 60 phase / status badge.
- **Beyond the planned 60:** 61 rail track and 62 subway tunnel cue. They answer where rail sits: at-grade rail goes in a background layer on its track with the platform; the subway is a section cue below the street, since from the street only its entrance shows.

**Sharpened:**
- **Train:** a cab car with a sloped nose, windscreen and headlight; bogie frames, underfloor equipment, roof units, a coupler. It sits on its own track.
- **Ravine:** trees are planted into the slope at their computed ground height (`ravineGround`), so they no longer float.
- **Parks:** surfaces are solid slabs with an edge (`slab`).
  - Pocket park: a curved path, planting, seating, a lamp and a small play corner.
  - Playground: a flecked rubber surface, a fence with a gate, a spring rider and a parents' bench.
  - Plaza: a paver band, a capped seating wall, raised tree planters, public art and a café table.
  - Lawn: grass tufts.

**Clipping check:** a scripted pass compared every window and door pane in every component. Fixes:
- The train's windows clipped the doors and the cab windscreen; they now keep clear.
- An apartment lobby pane sat under the entrance door; the door bay is now clear.
- The mixed-use tower's hidden ground floor crossed the podium's windows; it is no longer drawn behind a podium.

What remains is deliberate: industrial roof lights turning a corner, and solar panels whose slanted bounding boxes overlap while the panels themselves stand 15 cm apart.

**Figma:** "Component kit / … / Revision 5 (complete kit)" (nodes 6:2 and 6:4079).

**Checks:** 62 components, 132 SVGs in the zip, 5 lamps in the street view (the pocket park has one).

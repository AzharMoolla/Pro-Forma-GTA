# Project assessment and next-feature brief

Date: 2026-10-21. Reviewed baseline: `7b19ba3`.
Status: assessment and recommendations; existing DECIDED items remain in force. New feature direction comes from the owner's messages in this review. This document does not mark implementation, professional review, deployment or legal verification complete.

## Overall assessment

The project has a useful calculation and workspace foundation. Its strongest product direction is a standalone Toronto location explorer connected to auditable feasibility modelling, with a dedicated visualization workspace. Spreadsheet ingestion should follow a stable field dictionary, calculation conventions and export contract.

The main gap is the distance between a catalogue of considerations and a complete model. A catalogue entry, source link, check mark, numeric estimate, monthly liability, verified rule and funded obligation are different things. Make these distinctions explicit before positioning results for professional decisions.

## Evidence and limits

- Read the handoff requirements, implementation decisions, financial engine, location cascade, snapshot code, tracker, cloud client, migration, coverage logic and chart/export paths.
- `npm run verify` passed: TypeScript, ESLint, 105 tests across 11 files.
- Ran temporary, local engine/snapshot probes; their results are recorded below. Probe files were removed.
- Retrieved official public research sources and live City of Toronto catalogue metadata. The inventory is `data/research/toronto-location-source-candidates.json`; regenerate with `node scripts/research-location-sources.mjs`. Add `--seed` to retrieve the bounded research datasets described below.
- Collected complete resources for 25 wards, 158 neighbourhoods and 25 ward/councillor records, retaining original records and normalized GeoJSON in `data/research/location-seeds/`. Checked geometry parsing/types, finite coordinates and broad Toronto-region bounds. Also collected one-row address and zoning schema samples from resources reporting 525,371 and 11,719 rows respectively. These are source-reported counts at retrieval, not a completeness guarantee for all real addresses or legally current zones. No seed is wired into the application, and independent spatial/legal/licence review remains pending.
- No application code, migrations, existing decision records or handoff files were changed. No hosted services were changed. No private project data was sent to research sources.
- Browser/e2e testing, live account switching, live RLS checks, backup restoration and the two previously mentioned ZIP submissions were not examined in this pass. Earlier claims about live checks are historical evidence, not rerun results.
- Catalogue search matches are candidate sources. Resource availability, CRS, geometry accuracy, completeness, legal currency and licence must be checked before use. Missing metadata does not establish that a licence is absent or that reuse is permitted.

## 1. Correctness and data protection work to prioritize

### R1 — Account changes must reset or isolate all project state (high priority; static finding)

`src/ui/useCloud.ts` keeps `projectIds` keyed by demo ID, not user ID, and does not clear it on auth changes. After account A loads a project, account B in the same mounted session can reuse A's cached ID and skip B's load. RLS should still reject unauthorized database operations, but it does not clear the already-rendered local state. `src/ui/store.ts` also persists all projects under one browser-wide key, including cloud-hydrated drafts.

Implement per-user cache namespaces, explicit handling of account changes/sign-out, cancellation of in-flight loads/saves and a separate guest workspace. Do not silently seed one account from another account's browser cache. `saveDraft` currently treats any error-free update as success; confirm a row was actually updated so an RLS-filtered zero-row update cannot say Saved. Add account A -> sign out -> B and A -> guest tests, including receipts and pending saves. This is not a demonstrated database RLS bypass.

### R2 — Lock the full scenario evidence envelope (high priority; confirmed structure and probe)

`Snapshot` in `src/scenario/snapshot.ts` captures only `Node` plus descriptive/version fields. Project attributes used for site and policy screening are outside `Node`; catalogue/layer/rule revisions, source observations and simulation configuration are not pinned. Branching restores financial input but leaves current attributes in place (`src/ui/store.ts`). Comparison recomputes stored input using today's engine (`safeRun(s.input)` in `src/ui/sections2.tsx`) without a version compatibility gate.

Hash a versioned envelope containing input, attributes/site geometry, source observations, policy/rule versions, catalogue version, convention and engine versions, and simulation seed/distribution/version where relevant. Preserve original result/trace evidence or a supported engine version, and label any newer-engine recomputation as a new comparison. Verify before calculation, branching or export. Record parent linkage with an unambiguous identity and content hash.

Probe: mutating `locked.input.costEscalation` succeeded because `Object.freeze` is shallow; `verify` then correctly returned false. Integrity detection exists, but nested immutability and enforcement are incomplete. Database append-only protection remains a separate positive control.

### R3 — Funding timing does not implement the documented convention (high priority; reproduced)

ADR-001 C8 says land and pre-construction are equity funded. `runProject` applies its equity threshold to every month through completion, including month 0. Probe: land $100,000, construction $100,000, 90% LTC, two pre-construction months -> month 0 draws $20,000 equity and $80,000 construction debt.

Align timing with the recorded convention. If acquisition debt is needed, add an explicit facility/convention rather than silently using the construction facility. Construction commitment/interest reserve, eligible costs, maturity, presale conditions and a funding shortfall should be distinct from a post-hoc LTC warning. The presale threshold currently warns but does not constrain funding.

### R4 — Runtime validation needs a complete numeric and schema boundary (high priority; reproduced)

`validateProject` accepts `debt.annualRate = Infinity` because the comparison only checks non-negativity. The probe produced non-finite output; JSON serialization converted it to null. Other scalar/refinance/component parameters have uneven validation. Local storage and cloud JSON are cast to types without a complete runtime schema.

Reject non-finite numbers, invalid ranges, duplicate hierarchy/component/unit IDs, invalid dates and unsupported schema versions at entry/import/hydration. Check growth rates above -100%, all refinance terms, condo counts/prices/commissions, commercial rates/costs, bands and simulation counts. Fail with field-specific errors, and never allow malformed data to hash as if it were valid.

### R5 — Separate financial completeness, scope completeness and verification (high priority; reproduced/static)

`runProject.complete` only checks null cost lines already present. Omitted applicable costs and unverified policy assumptions do not make it incomplete. `coverage` accepts any static coverage note as covered, even after an edit can invalidate that note. A code/formula reference in the inspector is not numeric-input provenance: `CostLine` lacks a source observation/quote date field.

Probe: with an unknown cost line, total development cost was withheld but the `permanentLoan` metric still displayed $240,000. Gross debt capacity may be independently computable; the label Refinance proceeds and its missing list do not explain incomplete net proceeds/equity implications. Use a dependency-specific status rather than blanketing all metrics or presenting all numbers as equally supported.

Add separate states for model calculation, applicable-item disposition, source freshness and review. Each applicable item needs an estimate, substantiated exemption, explicit exclusion, or unknown status. Display known subtotal, missing obligations and their potential impact. Use per-field provenance: source/observation ID, unit, value date, retrieved date, assumption owner and override history.

### R6 — Tracker actuals and remaining work can mislead (high priority; static finding)

`buildTracker` sums `actual ?? 0` and `budget ?? 0`; the progress UI shows cost to complete as `max(0, budget - actual)`. That is remaining budget, not a forecast of remaining work. Unknown actuals are also indistinguishable from confirmed zero. `lineFromActual` replaces an entire cost estimate with spend-to-date and marks it exact, while retaining the old timing and escalation setting.

Track baseline budget, approved changes, committed contracts, invoices/accruals, paid cash, forecast remaining work, and forecast at completion separately. For a common accounting basis, forecast at completion = incurred actual + forecast remaining; cash paid is a separate measure. A partial invoice is not proof the whole work package is complete or certain. Preserve actual payment dates; prevent re-escalating actual spend. Show unknown coverage rather than zero totals.

### R7 — Review valuation, returns and model limits before professional claims (medium/high priority)

- Rental/commercial `forwardNoi` uses stabilized income even if exit/refinance occurs before lease-up or free-rent periods finish. Add an unstabilized disposition method or disclose stabilization/downtime adjustment and remaining TI/leasing/carry.
- Unsold condo inventory only triggers a warning. Explicitly model remaining closings/carry/disposal or leave disposition unresolved. Distinguish contracted, firm, occupied and closed sales, cancellations and price-specific unit cohorts.
- `profitOnCost` uses unlevered profit over TDC that includes capitalized financing interest. Reconcile the basis with a development analyst and expose pre-financing and after-financing metrics with matching denominators.
- Portfolio equity multiple uses positive net portfolio months over summed child contributions. Offsetting child distributions and calls can distort it. Define gross investor calls/distributions, cash recycling and net treasury flows separately; already labelled approximate is useful but not a final institutional definition.
- `irr` warns for multiple sign changes but may still return a root, while C15 promises no unique root -> unavailable. Align implementation and convention; show NPV or MIRR under an explicit reinvestment assumption when appropriate.
- Add differential tests against an independent numeric implementation, hand-derived multi-phase cashflow fixtures, and metamorphic tests for delay, debt, rent, cap rates, tax and policy effective-date changes. Test-count totals alone do not establish correctness.

### R8 — Simulation outputs need clearer interpretation (medium priority)

`uncertainty.ts` samples independently, and excludes unavailable results from each metric's percentile samples. The UI must show valid/invalid draw counts and the conditional basis. A class band is a modelling assumption, not a calibrated confidence interval. P90 cost is adverse; P90 profit is favourable. Label direction explicitly.

Keep the deterministic seeded model, but add shared risk groups for construction inflation, market rent, absorption, interest and exit cap rates before claiming portfolio diversification. Include delay stresses, scenario narratives and probability of crossing a user-defined threshold, conditional on the model assumptions. A sensitivity chart should also explain tied/dependent cost bases to avoid double stressing percentages.

## 2. Standalone Location explorer — owner-requested feature

### Product contract

Address search or map selection -> confirm location/site extent -> browse toggleable layers -> read a dated location dossier -> optionally create a project with selected, sourced assumptions. No project or account should be required to explore public data. Saving private notes/sites or sharing them follows an explicit user action.

The address retrieves relevant mapped policies and known questions within declared coverage. It cannot guarantee all applicable law. Applicability also depends on proposal, existing uses, legal parcel, dates, exemptions, amendments and decisions not yet reflected in a map. Users can choose assumptions to model; obligations cannot be made inapplicable just by toggling a layer or selecting a checkbox.

### Toggleable layer groups and dossier fields

| Group | Information and actions | Important accuracy distinction |
|---|---|---|
| Site and civic context | Normalized address, address-point ID, coordinates, selected footprint, municipality, ward, councillor/contact link, community council, official neighbourhood and optional community name | Address point != legal parcel; multiple addresses can share one development site; officials and ward models have effective dates |
| Zoning | Zone code, permitted-use text, exceptions, height/density/setback/lot coverage/parking overlays where actually available, holding symbols, links to operative by-law | Zone label alone is insufficient; preserve legacy by-laws, amendments and appeal/in-force status |
| Official Plan | Land-use designation, urban structure, secondary plan, SASP IDs, policy text with section/page links | OP designation != zoning permission; multiple overlapping policies can apply |
| Transit and station areas | MTSA/PMTSA polygons, station names and entrances, existing/planned/under-construction service, TTC/GO, relevant review corridors, IZ screening | Polygon inclusion != generic 500/800 m radius; PMTSA != automatic IZ obligation; opening dates and statutory triggers matter |
| Daily amenities | Parks/entrances, libraries, schools, child care, community centres, hospitals, grocery locations where a reliable source exists; nearest feature, distance and route | Proximity != school catchment, available child-care spaces, spare capacity or guaranteed access |
| Heritage and environment | Heritage properties/districts/status, natural heritage, flood/erosion/regulated areas, ravines, trees, brownfield/ESA questions, former uses, source-water considerations | Authority jurisdiction != regulated area; absence of a GIS hit != site clearance |
| Aviation and major facilities | Airports, noise contours, airport zoning surfaces, aviation review, cranes, rail/industrial corridors and compatibility questions | Noise, observed flight tracks, obstacle limits and airport proximity are separate layers; all heights need a stated vertical datum |
| Charges and programs | City/region/education charges, area-specific charges, CBC, parkland, CIPs and affordability/funding screens | Each authority has its own applicability, effective date, measurement basis and payment timing |
| Planning activity | Development/Committee of Adjustment applications, permits, application status and decision documents | An application is not approval, and a neighbour's approval is not permission for this site |
| Infrastructure | Servicing studies/capacity evidence, water/wastewater, road widenings, easements, utilities and securities | Nearby pipes or hydro infrastructure do not prove capacity, connection rights or ownership |

### Interaction details that make it useful

- Layer toggles, group presets (Planning, Transit/access, Environmental, Charges), opacity, legend, search and click-to-inspect. Hidden layers remain in the applicability evaluation; hiding is a visual preference.
- Dossier shows Found / Not found in this dataset / Not covered / Unavailable / Needs verification / Boundary uncertain; separate evidence quality from legal review status.
- Each consideration explains: why flagged; source feature and geometry; policy clause; effective/in-force dates; what facts are still needed; likely cost/timing/design implications; and an optional task or scenario action.
- Written policy beside geometry, with direct section/page links. Summaries are labelled interpretations, retain quoted/extracted provenance and require review before becoming executable rules.
- Record user dispositions separately: applies and modelled; design intends to comply; amendment/variance being explored; exemption being assessed; not applicable with reason; unresolved. An amendment scenario never modifies the current-law record.
- Use a site footprint for intersecting policies. Show partial intersections and boundary buffers, and require confirmation near edges. A pin at a frontage or entrance can lie outside the relevant parcel.
- Distance tool distinguishes straight-line, walking-network and policy-defined measurements; show origin/destination entrance, units, routing date and barriers. Unknown pedestrian routes remain unknown. A geometric radius is not a walking catchment.
- Compare multiple candidate sites with the same coverage/assumptions. Export a location dossier or map image with visible legend, scale, date, attribution and coverage note.
- Text/list alternative, address keyboard navigation, non-drag coordinate inputs, focus controls, colour-independent status and accessible tables. Responsive split map/dossier and reduced-motion behavior.
- Keep the ASCII streetscape as a fun, labelled illustration linked to project elements; it must not imply a legal building envelope or surveyed site arrangement.

### Official sources located and obstacles verified

The live metadata inventory contains 15 search topics, candidate package IDs, exact resource URLs, formats and publisher-provided dates/licence metadata. Curated starting points:

| Need | Official catalogue/source | Acquisition status in this review |
|---|---|---|
| Toronto addresses | [Address Points / Toronto One Address Repository](https://open.toronto.ca/dataset/address-points-municipal-toronto-one-address-repository/); [ArcGIS Address Point layer](https://gis.toronto.ca/arcgis/rest/services/cot_geospatial27/MapServer/101) | Catalogue and service identified; full address index not downloaded |
| Ward geometry | [City wards](https://open.toronto.ca/dataset/city-wards/) | All 25 records and geometry collected as research seeds; historical alternatives must remain distinct |
| Ward officials | [Wards and elected councillors](https://open.toronto.ca/dataset/wards-and-elected-councillors/); [Elected officials contact information](https://open.toronto.ca/dataset/elected-officials-contact-information/) | All 25 ward/councillor records and geometry collected; separate contact-resource metadata retrieved; term-date refresh required |
| Neighbourhoods | [Neighbourhoods](https://open.toronto.ca/dataset/neighbourhoods/) | All 158 current-resource records and geometry collected; historical 140-area resource identified separately |
| Zoning geometry | [Zoning By-law](https://open.toronto.ca/dataset/zoning-by-law/) | Metadata/resources retrieved; 92 resources include separate overlays and alternate formats, not 92 distinct current legal layers |
| Policy text | [569-2013 text/map guidance](https://www.toronto.ca/city-government/planning-development/zoning-by-law-preliminary-zoning-reviews/zoning-by-law-569-2013-2/); [Official Plan maps](https://www.toronto.ca/city-government/planning-development/official-plan-guidelines/official-plan/official-plan-maps-copy/); [OP Chapter 4](https://www.toronto.ca/city-government/planning-development/official-plan-guidelines/official-plan/chapters-1-5/official-plan-chapter-4/) | Primary documents researched; complete parcel-specific amendment resolution remains unbuilt |
| Station areas | [Minister-approved MTSAs](https://open.toronto.ca/dataset/minister-approved-major-transit-station-areas/); [City station-area policy page](https://www.toronto.ca/city-government/planning-development/planning-studies-initiatives/zoning-for-major-transit-station-areas/) | Catalogue retrieved; January 2026 shapefile already used by existing geo milestone; legal interpretation remains review-gated |
| Transit / walking | [TTC schedules](https://open.toronto.ca/dataset/ttc-routes-and-schedules/); [Pedestrian network](https://open.toronto.ca/dataset/pedestrian-network/) | Metadata/resources retrieved; graph connectivity, entrances, service status and accessibility need validation |
| Amenities | [Parks](https://open.toronto.ca/dataset/parks/), [Library branches](https://open.toronto.ca/dataset/library-branch-general-information/), [Schools](https://open.toronto.ca/dataset/school-locations-all-types/), [Child care](https://open.toronto.ca/dataset/licensed-child-care-centres/) | Metadata/resources retrieved; location is not entrance, capacity or eligibility evidence |
| Heritage | [Heritage register](https://open.toronto.ca/dataset/heritage-register/); [Heritage conservation districts](https://open.toronto.ca/dataset/heritage-conservation-districts/) | Metadata/resources retrieved; status/date distinctions require retained attributes |
| Planning pipeline | [Development applications](https://open.toronto.ca/dataset/development-applications/); [Committee of Adjustment](https://open.toronto.ca/dataset/committee-of-adjustment-applications/) | Metadata/resources retrieved; decisions and map points need reconciliation |

Toronto explicitly notes that some properties remain under former municipal zoning by-laws, and its office consolidation has different cutoffs for city-wide and site-specific amendments. Do not equate a recent web retrieval with a fully current legal zoning opinion. [City guidance](https://www.toronto.ca/city-government/planning-development/zoning-by-law-preliminary-zoning-reviews/zoning-by-law-569-2013-2/).

Toronto's station-area page explains a pause in IZ implementation until July 1, 2027 and contains text discussing earlier implementation too. This is an excellent test case for effective-date evaluation and reconciling authoritative documents; a polygon alone must not trigger an affordable-unit deduction. [Station-area policy](https://www.toronto.ca/city-government/planning-development/planning-studies-initiatives/zoning-for-major-transit-station-areas/).

The existing subway layer is dated 2019 and explicitly omits newer/planned lines; the aerodrome screen contains only three approximate reference points. Negative results cannot establish absence of transit/aviation issues. Existing geometry uses simplified polygons and an undefined exact-edge convention. The fetcher does not explicitly check ArcGIS transfer-limit/pagination completion, and clipping by whether a vertex falls in the bounding box can omit a geometry that intersects it. Add raw-data hashes, expected coverage/count checks, pagination, topology tests and a separate unsimplified analysis geometry before calling screening accurate at parcel scale.

Transport Canada distinguishes airport zoning surfaces from noise contours, and NAV CANADA considers structures near navigation infrastructure too. A radius around airports is preliminary triage. Include cranes and elevations, and retain an Unknown result where reliable surfaces/contours cannot be obtained. [Transport Canada TP1247](https://tc.canada.ca/en/aviation/publications/aviation-land-use-vicinity-aerodromes-tp-1247), [NAV CANADA land-use program](https://www.navcanada.ca/en/aeronautical-information/land-use-program.aspx).

### Data architecture and acceptance checks

Keep public geographic/source data separate from private projects. Version a public source registry, raw retrieval manifest/checksums, normalized layers, reviewed policy clauses and executable applicability rules. A site dossier pins those versions. Search should debounce/cancel requests and download only relevant geographic tiles/regions; do not load every zoning feature and full by-law into each browser.

Investigate a local index over Toronto's official address points before choosing an external geocoder. Preserve ambiguous address candidates and address/parcel relationship; no silent nearest-building substitution. External address lookup or routing would disclose selected locations and requires data-flow review before connection.

Use small known-site fixtures for Toronto and Oshawa, properties under legacy zoning, multi-address sites, mixed zoning parcels, boundary cases, out-of-coverage sites, policy date changes and conflicting/amended sources. Independently reconcile each result with official viewers/documents and a planner's review. For a computed distance, test against a trusted GIS result; for network distances include water, railway/highway barriers and closed/private paths.

Map rendering can use simplified geometry; policy classification must use declared precision and suitable analysis geometry. Precomputed spatial indexing may suffice initially. A move to server-side PostGIS/vector tiles should be justified by measured size/performance, without changing the pure financial engine.

OpenStreetMap's standard tile service has attribution, caching and no-bulk-prefetch requirements. Make the tile URL replaceable, respect provider policy and include tile requests in the third-party data inventory. No new map/routing provider has been selected or connected. [OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/).

## 3. Dedicated Visualization tab — owner-requested feature

Use named chart recipes backed by the same engine result and trace as the tables. Preserve scenario, hierarchy scope, units, time basis and source dates across chart and table views. Existing cashflow, cost-bucket and sensitivity components are a starting point, not a reason to create a second calculation path.

| Question | Chart | Necessary context |
|---|---|---|
| When do we run out of funding? | Monthly sources/uses plus cash balance, debt and cumulative equity panels | Commitment ceiling, funding shortfall, restricted cash, taxes and unfunded liabilities |
| What makes the project expensive? | Cost composition and cost-change waterfall | Baseline/current scope, escalated vs base dollars, unknown-cost subtotal and shared-cost allocation |
| What changed the result? | Scenario KPI comparison and sequential attribution waterfall | Explicit attribution order; interactions make bridge allocation order-dependent |
| Which assumptions matter most? | Tornado and two-variable sensitivity heatmap | Rent x cap rate, cost x delay; same engine and explicit invalid cells |
| What is the uncertainty? | Histogram/CDF and percentile ranges | Metric direction, assumptions, seed, draws and unavailable outcomes; no false confidence claim |
| How does the development unfold? | Phase/approval/build/lease-up timeline | Dependencies, working assumptions, milestones and actual vs forecast dates |
| What can this site support financially? | Residual-land-value / break-even rent or price view | Target return, selected constraints, solver bracket and infeasibility conditions; residual value is not yet implemented |
| What has happened since the budget? | Baseline, commitments, actuals and forecast-at-completion chart | Unknowns, accounting basis, approved change orders and remaining-scope forecast |
| How do sites differ? | Map and comparable-site matrix | Same date, schema, proposal assumptions and coverage; avoid unsupported rankings |

Every chart should support table view, keyboard-accessible inspection, consistent scenario colours, independent labels, unit switches where safe, and copy/export. Export SVG for editable vector charts, PNG for slides, and CSV/XLSX for underlying data; PDF report composition follows the report audience decision. Build exports from locked scenarios by default, or visibly watermark an unsaved draft.

Export evidence: title, units, period/valuation basis, scenario ID/hash, engine/convention versions, source dates, completeness/exclusions, legend and any applicable licence credit. Store filters and chart configuration as report metadata. Provide anonymized presentation export that omits exact location, private lender terms, names and receipts on request; preview it before sharing. Never imply spreadsheet export permits redistributing licensed benchmark tables.

## 4. Excel / Google Sheets ingestion — future owner-requested milestone

Sequence after the field dictionary, units, schema versions, trace contract and chart recipes stabilize. Start with a documented template/CSV and one simple XLSX table; add layout inference and a connected Google Sheets selected-range workflow later. No Google account was accessed for this assessment.

Workflow: preserve original file/sheet revision -> identify sheets/ranges -> extract values and formula text -> propose field mappings -> review units/signs/timing/provenance -> validate -> reconcile import -> apply to a new draft. No overwrite of a locked scenario. A low-confidence mapping stays unmapped/unknown.

Each mapping should keep workbook hash or Sheet/revision identity, source tab and cell/range, displayed/raw value, formula text where available, cached-result status, proposed target path, conversion, confidence and acceptance decision. Preserve zero versus blank/error/unknown, CAD versus other currency, dollars versus thousands, ft2 versus m2, monthly versus annual, nominal versus effective, and positive expense versus negative cash flow.

Address merged cells, hidden sheets/rows, named ranges, subtotal duplication, formulas with stale caches, external links, date serial systems, macros, circular references and workbook password protection explicitly. Never execute macros or external links. Formula text is reference evidence; source formulas do not become trusted engine calculations. Compare selected source totals to engine totals and explain differences in timing, areas, vacancy, tax and financing rather than forcing agreement with a potentially faulty workbook.

If AI helps infer mappings, send no private files by default; use a separately authorized provider and show exact proposed changes. A later saved mapping template can help repeat imports from the same consultant. Round-trip export/import requires schema migrations and a documented compatibility contract. Include file-size/ZIP-expansion limits, formula-injection-safe exports, private storage/retention controls and undo/import audit history.

## 5. Policy and financial research that changes priorities

### Charges must be event-dated and authority-specific

Toronto adopted its Development Charges Reduction Program implementation on July 29-30, 2026, including conditional temporary decreases and paused indexing in 2027-2029. Durham records an extended purpose-built rental deferral program approved May 27, 2026. These are separate mechanisms and must not be reduced to one current $/unit assumption. [Toronto adopted item](https://secure.toronto.ca/council/agenda-item.do?item=2026.CC43.9), [Durham development charges](https://www.durham.ca/doing-business/planning-and-development/development-charges/).

Oshawa's page distinguishes city, regional and school board charges and payment dates, and contains both current collection text and older timing/validity notes. Its affordability exemption guidance does not automatically exempt school board charges. Add a source-conflict/review queue; prioritize controlling by-laws and eligible agreements over isolated table headings. [Oshawa development charges](https://www.oshawa.ca/business-development/planning-and-development/development-charges/).

Create a project event calendar: relevant application, completeness, approval, permit, construction start, occupancy, closing and rebate-filing dates. Model liability assessment, cash payment, deferral interest, security/letters of credit, credits and refunds separately. A deferred liability outstanding at sale must not disappear merely because it falls outside the cashflow horizon.

### Tax must be gross cash timing plus conditional recovery

CRA describes rental self-supply using fair market value and a separate qualifying PBRH rebate. Its September 2026 guidance also describes an Ontario enhanced rental rebate with construction-window and other conditions. The existing catalogue's proposed-status/new-home rebate notes need rechecking against current primary material. Do not combine distinct purchaser, landlord and PBRH programs into a universal 13% waiver. [CRA rental rebate guide](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/rc4231/gst-hst-new-residential-rental-property-rebate.html), [PBRH memorandum](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/19-3-9/purpose-built-rental-housing-rebate.html), [Ontario ENRRP guidance](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/gst-hst-rebates/housing-rebates/ontario-enhanced-new-residential-rental-property-rebate/what-rebate.html).

Separate taxes paid, ITCs, self-supply, rebates receivable, cash receipt, valuation basis and mixed-use allocation. Required future work includes a reviewed tax convention and date-bound fixtures, not a placeholder percentage. Keep currently unmodelled taxes conspicuous in results and exports.

### Operating evidence needs the correct market definition

CMHC distinguishes all-unit, occupied, vacant/asking, turnover and non-turnover rents. Do not populate new-build achievable rents from an all-stock average without an explicit adjustment and provenance. Build a comparable-evidence table with geography, building vintage, bedroom count, area, inclusions, incentive-adjusted rent, observation/publication date and reliability. Suppressed/missing data remains unknown. [CMHC methodology](https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-research/surveys/methods/methodology-rental-market-survey).

Ontario's rent guidance distinguishes units first occupied after November 15, 2018; a single market-rent growth assumption is insufficient for existing/regulated rental projects or affordability covenants. Model tenant cohorts/turnover and contractual program restrictions where relevant. [Ontario rent guidance](https://www.ontario.ca/page/residential-rent-increases).

### Social/environmental commitments belong in the economics

MLI Select links incentives to affordability, accessibility and energy commitments; show capital upgrades, lower permitted rent, term of obligations, operating effects, application state and financing benefits together. Eligibility is preliminary until reviewed/approved; do not count a proposed benefit as funded cash. [CMHC MLI Select](https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/multi-unit-insurance/mliselect).

Toronto's rental-demolition permission and rental-replacement policies use related but different tests. Capture existing units, tenure/rent, tenant assistance, replacement obligations and delay/carry as deal-critical inputs rather than a generic demolition fee. [Toronto housing policies](https://www.toronto.ca/city-government/planning-development/official-plan-guidelines/housing/), [implementation guidelines](https://www.toronto.ca/legdocs/mmis/2025/ph/bgrd/backgroundfile-254085.pdf).

The catalogue's generic holdback-release description needs a current Construction Act/transition review. Official regulation search results indicate annual-release notice changes effective January 2026; direct e-Laws retrieval returned 403 during research, so no operative schedule is asserted here. Resolve before implementing holdback timing. [Ontario Regulation 304/18](https://www.ontario.ca/laws/regulation/180304).

## 6. Operational gaps and useful additions

- Project lifecycle: create a blank project, duplicate, rename, archive, restore, project-level metadata and explicit guest-to-account migration. Current loading/creation revolves around supplied demos. Add undo/redo and explain failed saves; protect edits on project switching and closing during the debounce window.
- Collaboration later: owner/editor/reviewer/viewer roles; a professional reviewer queue; comments attached to assumptions, source observations and scenarios; revocable private sharing. Do not infer review from a catalogue V tag.
- Document/evidence inbox: link quotes, studies, by-laws and approvals to specific inputs/tasks, retain versions, source dates and review decisions. AI extraction is draft assistance, with a review diff before posting.
- Delay and servicing: model approval dependencies, servicing capacity evidence, shared trunk infrastructure, front-ending agreements/recoveries, letters of credit/cash collateral and release dates. A refundable security is restricted liquidity, not automatically an expense.
- Canadian mortgage conventions: preserve current recorded convention until a separately approved change, but support explicit nominal/effective and compounding/payment-frequency bases for actual lender term sheets; benchmark prime is not an offered loan rate. [Bank of Canada API](https://www.bankofcanada.ca/valet-api-how-to/).
- Public-source monitoring: raw hashes, failed-fetch/staleness notices, document-version comparisons and human-approved rule promotion. Accepting a data update creates a new scenario with a result diff. Do not send automatic outreach or start a recurring monitor in this review.
- Recovery: define recovery point/time objectives, export/restore tests for database and receipt files separately. Supabase recommends off-site exports for free projects and notes that database backups exclude Storage objects. [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups).
- Deletion/retention: reconcile immutable evidence with account deletion, legal retention and data minimization. Existing user cascades, project restrict FKs and append-only deletion triggers need an intentionally tested owner-controlled erasure/anonymization path; do not promise one already works.
- Uploads: verify receipt hashes against retrieved bytes, handle orphaned uploads when record creation fails, retry idempotently, and define safe preview/download and retention behavior. Stored client-supplied hash metadata alone is not server verification of file content.
- Release hygiene: repository CI for meaningful checks, source/licence register, dependency review, secret scanning, production env checks, error reporting with redaction and tested restoration. `npm run verify` currently covers type/lint/unit tests; it does not run browser tests, contrast script, secret scans or all playbook gates.
- Data licensing: retain per-resource attribution and purpose; Altus redistribution clearance remains open. A geographic data licence does not automatically licence an embedded third-party map, aerial image or policy compilation.

## 7. Recommended delivery order and acceptance

| Order | Work | Reviewable exit condition |
|---|---|---|
| 1 | Correctness/privacy hardening (R1-R6 first) | Account isolation and actual update confirmation; full snapshot envelope; C8 timing; finite/runtime validation; unknown-safe tracker/metric fixtures |
| 2 | Finish the current location milestone | Existing layers render, draggable and keyboard site controls, source/override panel, text inputs, coverage disclosures and map accessibility checks; no claim of complete legal zoning |
| 3 | Standalone Toronto address explorer | Official address candidate selection, ward/neighbourhood and zoning/OP policy dossier, toggleable layers, dated written-policy links, boundary uncertainty, independent known-site validation |
| 4 | Visualization/export workspace | Chart recipes use the same results as tables, scoped scenario controls, accessible data alternatives, source-bearing vector/raster/data exports |
| 5 | Complete one reviewed municipality/tax/funding slice | Event-dated city/region/education obligations, reviewed eligibility, gross cash/recovery timing, independent financial reconciliation and locked regression evidence |
| 6 | Expand location intelligence and shared servicing | Heritage/hazard/aviation/amenities, entrance/network distances and defined coverage; multi-site comparison; accurate unknown/unavailable states |
| 7 | Spreadsheet ingestion | Stable schema, reviewable mapping, preserved source cells/units, reconciliation report, no macro/external-link execution, apply to a child draft with undo |
| 8 | Wider professional/institutional scope | Validated treasury/financing constraints, reviewed residual land value and waterfall conventions, roles and report packages; revisit only on actual user needs |

These are proposed sequences, not a replacement for the existing DECIDED scope. Parallel product research is useful; public claims should expand only as evidence and coverage expand. The first professional slice should have a planner/municipal reviewer, development finance analyst and tax reviewer for their respective areas.

## 8. Readiness assessment under playbook Section 7

This is a local assessment; no public release was attempted.

| Gate area | Assessment | Evidence / remaining work |
|---|---|---|
| Local static and unit verification | PASS for the executed scope | `npm run verify`, 105 tests; additional probes reveal required coverage gaps |
| Professional correctness/source claims | BLOCKED for release claims | R2-R8, dated rules/tax/financing limitations, professional review and complete source provenance |
| Account/privacy/data integrity | BLOCKED for release | R1; retention/deletion, runtime schemas, upload/recovery and live authorization verification |
| Terms/privacy/licensing | BLOCKED for public release | Product-specific policies and inventory; Altus permission unresolved; new map data/tiles require review |
| Accessibility/product behavior | BLOCKED for release confirmation | Prior automated e2e evidence exists, but this pass did not rerun it; new map/chart keyboard and manual checks remain |
| Infrastructure/backup/security | BLOCKED for release confirmation | No live restoration, auth/session audit, production headers or deployed configuration verified in this assessment |
| New provider/payment/deployment changes | NOT APPLICABLE | None made |

## Handoff for the other agent

Read this assessment and the public source inventory before continuing. Preserve `handoff/` and DECIDED items. The owner specifically requested: (1) an interactive, toggleable, standalone address-based policy/location explorer with written policies, zoning, designation, ward/councillor/neighbourhood, MTSA/transit/amenities/aviation and other due diligence; (2) a separate visualization workspace with portable insights; (3) later Excel/Google Sheets mapping into stable canonical fields. The metadata inventory is research evidence, not an implemented GIS layer or a verified legal policy database. Prioritize confirmed correctness/privacy issues alongside completion of the current location milestone.

## Follow-up: development activity feeds and daily refresh

Research checked 2026-10-21; no recurring ingestion was enabled.

- The City's [Application Information Centre](https://www.toronto.ca/city-government/planning-development/application-information-centre/) is an application-level viewer. The [Development Pipeline](https://www.toronto.ca/city-government/data-research-maps/research-reports/planning-development/development-pipeline/) combines planning applications and building permits into project-level analysis, avoiding repeated counts of the same units across multiple approvals. Its coverage omits as-of-right development below the Site Plan Control threshold. These are useful but different sources.
- Live CKAN `package_show?id=development-applications` reports `refresh_rate: Daily`; its resource metadata showed an October 21, 2026 refresh. This supports checking once daily, but is not an API availability guarantee or a promise of daily real-world status changes. The public dataset page explicitly links the Open Government Licence - Toronto even though CKAN's machine-readable licence fields say not specified. Retain this reconciliation evidence.
- The [Toronto licence](https://open.toronto.ca/open-data-licence/) permits commercial copying/adaptation/redistribution of covered information, requires source attribution, and excludes personal information, unauthorized third-party rights, official symbols and other protected material. It does not permit implied City endorsement. Public availability of an attached consultant drawing, photo or PDF does not establish equivalent redistribution rights.
- [UrbanToronto's own account published by Toronto Open Data](https://open.toronto.ca/urbantoronto-seeing-the-future-of-the-city-with-data/) describes using City open data, especially development applications, and a combination of manual and automated document reading to standardize records. This is evidence of the approach, not documentation of its current internal APIs. Use the original City feed; link to UrbanToronto for editorial/community context rather than republishing its database, renderings, photos or articles without an appropriate licence.
- Recommended scope: an optional Nearby development activity layer after the address/policy explorer works. Show file number, address, application type, publisher status, relevant dates and a City record link. Keep pipeline/project IDs distinct from application IDs; do not sum units across linked rezoning/site-plan/permit records. Preserve the source status because Approved can mean at least one planning approval, not every permission or a construction start.
- Refresh centrally once daily rather than once per visitor. Compare available modification/HTTP validators; download changed resources only where supported, validate schema/counts, retain the last good snapshot on failure, record retrieved/source dates and publish atomic updates. Pipeline refresh may differ from applications; follow each source's own cadence and access conditions. Do not infer withdrawn/completed from a missing record without evidence.
- Keep activity context separate from binding policy and feasibility assumptions. Proposed supply is not assured delivery; a nearby approval is not permission for the selected site. Initially linking to the City is acceptable. Defer automatic PDF crawling, construction-photo extraction, demand forecasting and a competing comprehensive development database until a specific product need justifies them.

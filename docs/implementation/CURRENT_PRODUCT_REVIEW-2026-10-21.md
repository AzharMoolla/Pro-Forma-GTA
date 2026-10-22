# PlanGTA — current product and feasibility review

Reviewed 2026-10-21 against commit `1df5324`, engine 0.3.0 / conventions 0.3. Recommendations for the owner; this does not change DECIDED scope or conventions. Supplements the earlier ASSESSMENT, whose R1–R8 work has substantially progressed.

## Judgment

The calculation is useful for transparent early feasibility and comparing alternatives. Monthly timing, separate project/equity cash flows, explicit area bases, unknown propagation, scenario hashes, cost coverage and source review are valuable foundations. This is substantially beyond a static cost calculator.

It is not yet a complete underwriting or development-control system. A running model is different from a complete scope, confirmed planning permissions, or available financing. The next useful increment is to connect evidence → permission/constraint → design/program choice → time and cost → funding gap → decision. Another decorative view would contribute less than closing that chain.

The synthetic Toronto example illustrates why the distinctions matter: approximately $73M unlevered profit coexists with −3.1% levered IRR and −$82.6M unlevered NPV at 7.5%. Those answers can coexist: undiscounted profit before financing does not establish an adequate time-adjusted equity return. The interface should explain this relationship directly.

## Evidence and limits of this review

- Read the current architecture, decision log, roadmap, engine, uncertainty, scenario/rezoning, analysis, chart, export and workspace code.
- `npm run verify`: typecheck, lint and **149 unit tests across 18 files passed**.
- `npm run test:e2e`: **26 desktop/mobile tests passed**, including the existing section-by-section axe checks. Automated accessibility success does not constitute a complete manual accessibility audit.
- Inspected actual local screenshots of Overview, Finance, Charts and mobile, plus Market, Site & program and Report text/screenshots. At 390px the checked Overview had no horizontal page overflow.
- Ran additional, separate review probes without modifying production math. Local evidence: `data/research/current-review/engine-probes.ts` and `engine-probes.json`; run with `node --import tsx data/research/current-review/engine-probes.ts`. Screenshots are in the same local evidence directory. These research files may be ignored by Git.
- Consulted current primary RICS, CRA, CMHC, Ontario and Toronto sources below. This was not an independent appraisal, planning opinion, tax opinion, penetration test, live account audit or production deployment verification.

## Confirmed issues to address first

### P1 — Rezoning extension reduces the monthly carrying allowance

`src/scenario/rezoning.ts`, `rezoneProject`: holding spread timing extends, but the driver total does not. Probe: $3,000 over months 0–2 ($1,000/month) becomes $3,000 over months 0–5 ($500/month) after a three-month delay. The UI promises carrying costs run longer, but the extension alone adds no base carrying cost.

Separate recurring monthly costs from fixed total allowances. Extend recurring amounts by duration; preserve explicitly fixed totals. Test both, including escalation and month-zero conventions. This matters directly to the rezoning-versus-current comparison.

### P1 — “As-of-right” describes a snapshot that may already exceed zoning

`src/ui/sections3.tsx`, `ModelRezoning`: the current draft is locked with label `As-of-right` without reducing height, density or program to mapped permissions. The initial Toronto mock is 38 storeys against about 20 mapped storeys. Keeping that draft is sensible; the permission label is misleading.

Use “Current proposal before added rezoning allowance” for this action. A genuine as-of-right alternative needs a separately adjusted program, recalculated areas, units, costs and revenue, with permissions still subject to review. Do not achieve that by simply changing a scenario title.

The same function targets every descendant without existing rezoning lines, rather than only the affected descendants. A one-block constraint at a master-plan selection can add allowances to other blocks too. Carry explicit affected paths from each site finding and let the user confirm the scope.

### P1 — Unknown project variables look like confirmed zero/no

`src/ui/sections.tsx:198` displays an unset boolean as an unchecked checkbox; line 205 displays an unset number as zero. The catalogue engine itself distinguishes null/undefined from false, so the input presentation loses information that the model supports.

Use Unknown / Yes / No for screening questions, blank numeric fields with “not entered”, and a clear reset-to-unknown control. Display defaulted values as defaults, not observed site facts. Cost-driver zero can remain a valid explicit input; this issue concerns missing project variables.

### P1 — Scoped site facts and citations are not consistently resolved

`src/ui/sections3.tsx`, `siteFactsFor`: building height facts resolve per child, but FSI maximum and holding/heritage/conservation/other flags resolve once at the selected parent. Selecting a building can differ from viewing the master plan. Citation lookup uses the root source first, then the first key ending in the variable id, rather than the exact building/phase inheritance used for the value.

Resolve each finding's value, scope and source together. Give each building its applicable limits and source record; summarize those findings at parent level. Compare site-wide FSI on the appropriate zoning lot/site, rather than assuming each building is a separate density lot. A regression fixture should use two blocks with different FSI limits and sources, and confirm identical conclusions at root and child views.

### P2 — Unresolved condo inventory still yields an unqualified “Total revenue”

`src/engine/project.ts:638`: totalRevenue is a plain metric even when unsold inventory marks the project incomplete. Probe: five of ten units sold by exit yields $2.5M “Total revenue” with no missing dependency or warning, while profit correctly withholds on `condo:unsold-inventory`.

Either label it “Known proceeds, excludes unresolved inventory” or withhold the dependent total. Apply that distinction in roll-ups, land-to-revenue analysis and exports as well. An unknown disposition is not the same as a confirmed zero recovery.

### P2 — Portfolio validation has a gap

`src/engine/portfolio.ts`, `runNode`: a parent discount rate of NaN is accepted; the result says complete and its NPV is NaN. A leaf project rejects non-finite values. Validate the portfolio envelope as rigorously as a leaf, including finite rates, discount rate > −100%, and programmatically supplied values. Relevant before future import features expand the input boundary.

## Financial work with the greatest practical value

| Priority | Addition | Decision it enables / acceptance criterion |
|---|---|---|
| Next | Funding capacity and funding gap | Separate requested construction draws, committed facility, interest reserve, eligible costs and takeout. Show the month and amount of a shortfall; model equity or another stated source rather than assuming a loan funds it. |
| Next | Tax and rebate cash timing | Separate tax-exclusive budget, tax paid, recoverable credits, rental self-supply, rebates, receipt dates and bridge funding. Conditional rebates remain conditional. Model cash movement separately from net economic cost. |
| Next | Authority/date-based charges | City + region + school board, CBC/parkland and application fees, with credits, discounts, eligibility, indexing and payment dates. Regional servicing responsibilities remain relevant even when planning responsibilities change. |
| Next | Residual land / break-even solver | Maximum land price at an explicit NPV/IRR or margin hurdle; required rent/price; allowable cost; minimum occupancy; maximum delay. Re-run the same engine, show no-solution and non-monotone cases, and compare with land evidence. |
| Next | Market evidence and operating budget | Subject-specific rent/sales/expense comparables with dates, units, concessions and adjustments. Separate property tax, insurance, utilities, management, maintenance, turnover and replacement reserves; bridge to the stated NOI basis. |
| Then | Cost-to-complete and commitments | Original budget, approved changes, committed contracts, paid, unpaid certified work, remaining forecast, contingency remaining and forecast variance. The current max(budget, recorded spend) rule is a screening forecast, not a complete QS cost-to-complete. |
| Then | Draw and payment timing | Custom milestone/S-curve schedules, payable lag, statutory/contract holdbacks and release events, lender draw lag and inspection/quantity-surveyor fees. Preserve the current straight-line convention as an explicit option. |
| Then | More realistic revenue timing | Occupancy-linked ancillary income; fixed/variable expenses; condo closing cohorts, cancellations and delayed registrations; commercial lease rollover, recovery assumptions and renewal/tenant improvements where relevant. |
| Then | Stress cases before more simulation | Combined cost + delay + rent/sales + cap + rate stresses, not just independent bands. Show equity requirement, refinancing gap, DSCR and hurdle failure alongside return. |
| Later | Institutional structures | Multiple facilities, land debt, mezzanine/preferred equity, partner waterfalls, ownership shares, guarantees and inter-phase funding. Keep the current independent-child financing assumption visible until those exist. |

Financing interpretation needs particular care. The construction draw schedule currently follows equity-first/LTC conventions; LTV/DSCR loan sizing is a separate calculation and is not an availability gate on every draw. In the probe, a $100,500 peak construction balance coexists with a $1,899 reported DSCR-limited sizing capacity and no funding-gap warning. These represent different lending questions, not necessarily an arithmetic contradiction. Label them and show takeout feasibility explicitly. Capitalized interest above the construction LTC limit currently produces a warning, rather than constrained funding. A result must not imply financing is committed.

“Max permanent loan” also uses the main debt rate/amortization/LTC and exit value, while the actual refinance event uses its own terms and event-date valuation. Prefer distinct event-specific panels: construction commitment; refinance gross loan; fees; construction payoff; **net cash returned or equity top-up**; ongoing debt service; minimum coverage. Avoid a generic maximum that looks interchangeable with the modeled refinance.

Keep the accepted monthly nominal-rate convention. A future lender template should explicitly state quote/compounding/day-count conventions and convert them; do not silently change C4. Keep unlevered versus financed cash-flow definitions clean when user-entered financing cost lines are added.

## Is the calculation useful?

Yes, for questions such as “Which option needs less equity?”, “How much does a delay change the result?”, “Does this rent/cost/cap combination work?”, and “Which assumption most deserves a quote or study?”. The answer is only as complete as the entered scope and supporting evidence.

Improve the return presentation in four ways:

1. Show both nominal profit and time-adjusted return with a plain explanation when their directions differ. Distinguish total investor contributions, peak cumulative exposure, net refinancing cash and final distributions.
2. Put untrended yield on cost, trended stabilized yield, and exit cap on explicitly dated and consistent bases. The current heuristic compares untrended NOI/TDC with forward NOI/adjusted exit value; before stabilization that last ratio includes the lease-up adjustment and is not a pure exit cap. Mixed-use results should use component-specific cap rates.
3. Replace universal green “15–20% developer margin” language with a visible, editable user hurdle and applicability basis. Rental holds, merchant condo sales, mixed-use and land dispositions should not inherit one profitability standard. Identify current rounded thresholds as app heuristics, with dates on any historical comparisons.
4. Keep Monte Carlo bands visibly assumption-driven. Estimate class is not an empirically calibrated probability distribution; independent cost-line sampling can understate common shocks. Separate contingency already budgeted, estimate uncertainty and event risk to avoid double counting. Add correlation/scenario factors and timing/rate uncertainty when supported by evidence. Report failure to achieve the user's hurdle as well as below zero; retained/unavailable draws remain explicit.

## Design changes I would make

Preserve the restrained teal/sand palette, real product views, glossary, drill-down inspector and table alternatives. These suit a professional planning tool. The main weaknesses are hierarchy, density and the route into a real project.

- **Give users a real starting workflow.** New project → address/site → tenure/program → timing → known budget/revenue → review gaps. Current project selection is wired to three bundled demos. Support blank projects, named copies, rename/archive, project-type selection and project-specific notes/coverage. Keep demos clearly distinct. This is a more immediate usability need than arbitrary spreadsheet parsing.
- **Make Overview a decision page.** Lead with site/proposal and readiness, then four selected KPIs, three highest-impact findings and next actions. The initial Overview is thousands of pixels tall, with the drawing before the analysis. Keep the drawing available and collapsible; summarize routine observations behind “See all”.
- **Use tenure-aware KPIs.** Rental: yield, equity required, coverage/refinancing gap, IRR/NPV. Condo: net realizable sales, profit/margin, presales and funding. Master plan: phased peak funding and contributions. Preserve every metric in detail views; do not change the engine by UI mode.
- **Collapse the empty inspector.** It reserves 340px even when it only says to select a figure. Expand on selection; on mobile use an accessible sheet/drawer. The persistent navigation, inspector and KPI strip compete with the work area.
- **Improve mobile navigation and summary.** A horizontally scrolling strip of 13 sections is difficult to discover. Use an accessible section menu and a compact summary. Treat mobile as screening/review; preserve desktop's dense editing ability.
- **Separate cost bases visually.** In the current example the headline TDC is about $366M while the waterfall is about $442M because it includes more financing across the hold. The caption explains this, but users should see a reconciliation bridge: development cost → post-completion financing/fees → other lifecycle costs. Name each total by its basis.
- **Separate funding from economic performance charts.** The current funding chart includes refinance proceeds and excludes some repayments/interest, as its caption correctly discloses. Offer a balanced sources-and-uses view and a separate gross financing-activity view. Add monthly/quarterly switching, debt balances and facility limits, cumulative equity and the refinancing gap.
- **Use calendar dates as well as M0/M1.** Add a project valuation/start date and dated milestones; regulatory eligibility and cash receipt timing cannot be understood from month numbers alone. Existing yearly bins put month 120 into Y11; explicitly state period conventions so a ten-year hold does not look like an eleven-year projection.
- **Strengthen reports as decision records.** Include purpose, scenario ID/hash, location/footprint, valuation date, author/reviewer, selected scope, key assumptions, excluded modules, gaps and source dates. Current XLSX is an exported-values workbook, not a formula-driven substitute for Excel; label that plainly and preserve JSON for reproducibility.

## Planning map priorities

The map is a useful independent product. Let someone search a site and export a sourced dossier without building a financial project. Carry selected site facts into a scenario through the existing review/apply step.

1. Host the collected map data/API and implement monitored refreshes with last-good rollback. R2 storage alone does not provide spatial queries: plan queryable partitions/indexes or suitable spatial serving, bounded viewport results and zoom-dependent geometry. Do not send the full collection to browsers.
2. Resolve parcels/assemblies and user-drawn footprints before making parcel-wide assertions. One address point can miss a boundary, multiple zones, an easement or a second frontage. Record match quality and let users correct the selected site.
3. Prioritize complete Official Plan land-use designation coverage, operative exceptions/legacy by-laws, relevant amendments/appeals, and exact policy sections. Distinguish approved, in-force, under-appeal and proposed policy. Keep retrieval date distinct from legal effective date.
4. Show a permission matrix: issue, authority, source section/date, applicability, reviewer, unresolved evidence, possible approval path, and estimated cost/time. Treat minor variance/ZBA/OPA paths as reviewed possibilities, not automated approvals based only on a percentage over a numeric limit.
5. Include water/wastewater/stormwater and utility capacity, easements/rights-of-way, contamination/geotechnical/excess soil, access/fire/loading, flood risk and climate exposure, aviation/cranes and heritage/archaeology in due diligence. Many cannot be cleared by public map data; show the responsible authority and required study/confirmation.
6. Separate straight-line proximity, actual walking routes, station entrance access and legally defined eligibility areas. Being in a station area is not evidence of a station entrance at the site. Keep the streetscape illustration clearly separate from observed site geometry or an approval envelope.
7. Nearby applications/approvals/completions are useful precedents, with status dates and official links. An approved development is not necessarily financed, built or occupied. Fix geometry/exclusion/match confidence before using precedent statistics as market evidence.

## Import, operations and release considerations

The owner's spreadsheet-import sequencing is sound: stabilize field definitions and calculation/report bases first. Then stage imports as preview → units/date/tax/area normalization → map each field → reconcile totals → user accept → child scenario. Preserve sheet/cell provenance and original file hash. Do not run macros or trust cached formulas as validated engine results; no silent overwrites. A basic template/CSV import can precede arbitrary workbooks and Google Sheets.

Before inviting people to store meaningful work: verify production sign-in/redirects, project isolation, explicit guest-to-account import, saved/saving/failed status and retry, restore/export, receipt authorization and retention/deletion. Define backups and test recovery. Add conflict handling before shared editing or multi-device concurrent updates. These require operational evidence; the passing local suite does not establish them.

The footer disclosure is a useful start. The current UI does not expose dedicated Terms/Privacy pages or a clear account/data deletion route. Record actual operator/contact, retention and deletion behavior and processor data flows before representing the product as ready for general account use. Obtain the financial/planning/tax review already called for in the project's playbook and handoff before presenting reports as suitable for reliance. Do not infer review merely from disclaimer text.

## Recommended sequence

1. Fix the confirmed P1 issues and tighten dependency/validation cases. Add meaningful regressions for recurring carry, affected-block scope, unknown entry and scoped sources.
2. Make one Toronto rental deal complete enough to reconcile: sourced operating assumptions + dated charges + tax cash + constrained funding/takeout. Have a planner, development accountant/QS and financing practitioner challenge that same fixture independently.
3. Add real project creation, a concise decision Overview, break-even/residual answers and funding-gap charts. Reconcile displayed totals across the report and UI.
4. Host the standalone map; then parcels/footprints and the cited permission matrix. Keep regional coverage depth explicit.
5. Add structured import and collaboration after the data contract and audit trail stabilize. Broader institutional features follow validated use cases.

Keep the existing charts, auditability and standalone map direction. Concentrate the next work on making the answer to “What must change for this project to proceed?” specific, sourced and financially reconciled.

## Primary research consulted

- [RICS: Valuation of development property](https://www.rics.org/profession-standards/rics-standards-and-guidance/sector-standards/valuation-standards/valuation-of-development-property) — professional development-property valuation framework; aligns with IVS 410. [RICS valuation approaches](https://www.rics.org/content/rics/uk/en/journals/property-journal/apc-5-valuation-methods.html) distinguishes residual land valuation from profitability appraisal and discusses comparable cross-checks. This is a reference framework, not a claim that PlanGTA is certified to it.
- [CRA: Purpose-built rental housing rebate](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/19-3-9/purpose-built-rental-housing-rebate.html) and [residential deemed supplies](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/19-2-3/residential-real-property-deemed-supplies.html) — support modeling self-supply, tax base, eligibility and rebate events separately. Confirm the project-specific rules/effective periods before implementation.
- [CMHC: Standard rental housing](https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/multi-unit-insurance/standard-rental-housing) — eligibility, lending-value constraints and borrower/guarantee conditions show why an LTV input alone is not program qualification or committed funding. Other programs require separate rules.
- [Ontario: Construction Act](https://www.ontario.ca/laws/statute/90c30/v21), [General regulation](https://www.ontario.ca/laws/regulation/180304), and [Ontario Association of Architects: February 2026 holdback procedures](https://oaa.on.ca/Assets/Common/Shared_Documents/Practice%20Tips/PT.10.2_V03.0_CA-ProceduresForTheReleaseOfStatutoryLienHoldbacks_20260204.pdf) — support explicit holdback/release schedules. Contract dates and transitional applicability need checking; do not implement a generic outdated single release rule. Ontario statute retrieval was restricted during this review; search excerpts and the current professional practice document were available.
- [Toronto: Zoning in Toronto](https://www.toronto.ca/city-government/planning-development/zoning-by-law-preliminary-zoning-reviews/zoning-in-toronto/) and [Committee of Adjustment participation handbook](https://www.toronto.ca/wp-content/uploads/2025/09/974e-CommitteeofAdjustment-Participation-Handbook.pdf) — approval routes require interpretation and tests beyond a numeric overage; map screening does not establish as-of-right permissions.

# Cost catalogue: every cost from first look to operations

**Date:** 2026-10-21 · **Scope:** Ontario / GTA first (Toronto, Durham/Oshawa), structured so other municipalities slot in
**Purpose:** the narrative and source notes behind the cost catalogue. **The machine-readable source of truth is now `data/costs/catalogue.json`** (151 variables, 232 items, 9 project types, with the variables that switch each item on). Per-type checklists are generated into `PROJECT_TYPE_CHECKLISTS.md`, and two fully costed mock projects into `MOCK_PROJECTS.md` (`npm run report`).

### How to read the tags

| Tag | Meaning |
|---|---|
| **[V]** | Verified on 2026-10-21 against the linked source (values quoted are as published that day) |
| **[S]** | Authoritative source identified; values to be ingested and verified per municipality and date |
| **[Q]** | No public schedule: consultant, contractor or lender quote. The tool carries an allowance with a wide band until a quote is entered |
| **[P]** | Announced or proposed, **not yet law**. Modelled only as an optional scenario |

**Applies to:** R = purpose-built rental · C = condo / for-sale · G = commercial / general (office, retail, industrial, mixed use) · MP = master plan / land development

**Drivers** say how the engine calculates the line: `$` lump sum, `$/unit`, `$/ft²`, `$/m²`, `% of X`, `$/m` (linear), `$/ha`, `$/stall`, `$/borehole`, `rate × base`, or `schedule(by-law)`.

---

## 0. Screening and market evidence

| Item | Applies | Driver | Where to find it |
|---|---|---|---|
| Rents and vacancy by bedroom type and zone | R | data feed | CMHC Rental Market Survey via the Housing Market Information Portal **[S]** (free) |
| Housing starts and completions, absorption | R C MP | data feed | CMHC Starts & Completions Survey **[S]** |
| New condo pricing, absorption, unsold inventory | C | data feed | Urbanation, Altus Data Studio (paid) **[S]** |
| Resale prices and lease rates | R C | data feed | TRREB Market Watch **[S]** |
| Cap rates by asset class and market | R C G | data feed | CBRE Canada Cap Rate Report (quarterly), Colliers, Altus **[S]** |
| Assessed values | all | lookup | MPAC (AboutMyProperty; bulk data licensed) **[S]** |
| Zoning and official plan designation | all | GIS | Toronto zoning by-law open data (`open.toronto.ca/dataset/zoning-by-law`) **[S]**; Oshawa / Durham OP maps **[S]** |
| Market study, appraisal, broker opinion of value | all | `$` | **[Q]** |
| Construction cost benchmarks | all | `$/ft²` by type | Altus Canadian Cost Guide 2026, released 2026-04-23. Toronto residential costs declined over the past year **[V]** ([Altus](https://www.altusgroup.com/featured-insights/canadian-cost-guide/)). Also Hanscomb *Yardsticks for Costing*, RSMeans with Toronto city cost index, RLB and Turner & Townsend market surveys **[S]** |
| Cost escalation index | all | index | StatCan Building Construction Price Index, Table 18-10-0289. Q1 2026 Toronto residential = 106.4 (2023=100), +1.0% y/y **[V]** ([StatCan Daily](https://www150.statcan.gc.ca/n1/daily-quotidien/260428/t001b-eng.htm)) |
| Lending benchmark rates | all | data feed | Bank of Canada Valet API, posted prime V80691311 **[S]** |

## 1. Land acquisition

| Item | Applies | Driver | Timing | Where to find it |
|---|---|---|---|---|
| Purchase price, deposits, option or assignment fees | all | `$` | offer → closing | deal terms |
| Ontario land transfer tax | all | `schedule` on consideration | closing | Ontario LTT. Brackets reported as 0.5% to $55k, 1.0% to $250k, 1.5% to $400k, 2.0% to $2M, 2.5% over $2M (the last two brackets for one or two single-family residences) **[S]**: confirm against `ontario.ca/document/land-transfer-tax` |
| Toronto municipal land transfer tax | all (Toronto) | `schedule` | closing | City of Toronto MLTT. New luxury brackets from **2026-04-01**: >$3M–4M 4.40%, >$4M–5M 5.45%, >$5M–10M 6.50%, >$10M–20M 7.55%, >$20M 8.60%. Rates below $2M unchanged at 0.5–2.5% **[V]** ([Toronto MLTT rates](https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/municipal-land-transfer-tax-mltt-rates-and-fees)) |
| Non-Resident Speculation Tax | residential buyers who are foreign entities | 25% of value | closing | Ontario NRST, 25% since 2022-10-25 **[V]** ([ontario.ca](https://www.ontario.ca/document/land-transfer-tax/non-resident-speculation-tax)). Scope is residential (1–6 units); confirm applicability to development sites |
| HST on land | G MP (taxable supplies) | 13% | closing | Sales of vacant or commercial land are generally taxable; GST/HST registrants self-assess and may claim input tax credits. CRA rules **[S]**; needs tax review per deal |
| Legal, title insurance, searches | all | `$` | closing | **[Q]** |
| Survey: reference plan, topographic, boundary | all | `$` | due diligence | **[Q]** |
| Building condition assessment (existing building) | all | `$` | due diligence | **[Q]** |
| Zoning compliance letter / certificate | all | `$` | due diligence | municipal fee schedule **[S]** |
| Brokerage commission | all | `% of price` | closing | deal terms |
| Land loan (interest, commitment fee, lender legal, appraisal) | all | rate × balance, `%` | hold | lender terms **[Q]** |
| Property tax during hold | all | assessment × rate | monthly or annual | MPAC × municipal rates (see §12) **[S]** |
| Insurance, security, vacant-building maintenance | all | `$/month` | hold | **[Q]** |
| Income from existing tenants during hold (offset) | all | `$/month` | hold | rent roll |
| Land assembly premium, holdout costs | all | `$` | acquisition | deal terms |

## 2. Due diligence, studies and approvals support

Most of these are "complete application" requirements. Toronto and Oshawa publish the lists of studies required for each application type **[S]**.

| Item | Applies | Driver | Where to find it |
|---|---|---|---|
| Phase One ESA | all | `$` | **[Q]**. Since **2025-10-23**, an RSC based only on a Phase One ESA can't be filed unless legally required, and buyers or lenders can no longer demand one **[V]** ([WeirFoulds](https://www.weirfoulds.com/important-changes-to-records-of-site-condition-and-yet-again-excess-soils)) |
| Phase Two ESA (drilling, sampling, lab) | all | `$/borehole` + lab | **[Q]** |
| Record of Site Condition (RSC) + MECP filing | all (on change to a more sensitive use) | `$` + filing fee | O. Reg. 153/04, Environmental Site Registry **[S]**. A use change (e.g. industrial → residential) triggers a mandatory RSC |
| Remediation (dig-and-dump, in-situ, risk assessment) | all | `$/m³` or `$` | **[Q]**; very wide band until Phase Two is done |
| Excess soil: characterization, Qualified Person, Excess Soil Registry, hauling and tipping | all | `$/m³` | O. Reg. 406/19, amended with the October 2025 RSC changes **[S]**; volume from excavation × rates **[Q]** |
| Geotechnical investigation | all | `$/borehole` | **[Q]**. Tender practice is a per-borehole price **[V]**. One industry rule of thumb: 0.2–0.4% of construction cost for low-rise, 1.5–2.2% for major infrastructure ([Piling Canada](https://pilingcanada.ca/digital/2019/Q4/page_72.html)) |
| Hydrogeological study, dewatering permit (PTTW or EASR), sewer discharge agreement | all | `$` + `$/m³` | MECP permit fees; Toronto Water discharge agreement fees **[S]** |
| Designated substance survey (asbestos, lead, mould) before demolition | existing buildings | `$` | O. Reg. 278/05 **[S]**; **[Q]** |
| Arborist report, tree removal permit, replacement or cash-in-lieu | all | `$/tree` | Toronto Municipal Code Ch. 813 fees **[S]** |
| Archaeological assessment, Stages 1–4 | MP, greenfield | `$/ha`, `$` | Ontario Standards and Guidelines for Consultant Archaeologists **[S]**; **[Q]** |
| Heritage impact assessment, conservation plan | heritage-listed sites | `$` | municipal heritage register **[S]** |
| Natural heritage / environmental impact study, species at risk | MP, near natural features | `$` | **[Q]** |
| Transportation impact study, parking study, TDM plan | all | `$` | **[Q]** |
| Noise and vibration study | all | `$` | **[Q]** |
| Pedestrian wind study, sun/shadow study | mid/high-rise | `$` | **[Q]** |
| Functional servicing report, stormwater management report | all | `$` | **[Q]** |
| Energy strategy, Toronto Green Standard checklist, energy model | all (Toronto) | `$` | Toronto Green Standard **[S]** |
| Planning justification report, urban design brief, public consultation | all | `$` | **[Q]** |
| **TTC technical review**: required for development within **60 m** of existing or planned TTC infrastructure | all near transit | `$` + design impacts | TTC Property Development **[V]** ([TTC](https://www.ttc.ca/doing-business-with-the-ttc/Property-Development)); costs of TTC-required protections are **[Q]** |
| Metrolinx (rail corridor proximity, Transit-Oriented Communities) | near GO / LRT | `$` | Metrolinx developer guidance **[S]** |
| Conservation authority permit and review fees (TRCA in Toronto, CLOCA in Oshawa) | regulated areas | `schedule` | TRCA and CLOCA fee schedules **[S]** |
| MTO corridor permits | near provincial highways | `$` | MTO **[S]** |

## 3. Planning approvals and land-value charges

| Item | Applies | Driver | Where to find it |
|---|---|---|---|
| Application fees: OPA, ZBA, site plan, plan of subdivision, draft plan of condominium, minor variance, consent, part-lot control | all | `schedule` (base + `$/unit` or `$/m²`) | Toronto planning fee schedule, effective 2026-01-01 **[S]** ([Toronto fees](https://www.toronto.ca/city-government/planning-development/application-forms-fees/fees/)); Oshawa fee by-law **[S]** |
| Ontario Land Tribunal appeal: legal and expert fees | all | `$` | **[Q]** |
| Parkland dedication or cash-in-lieu | all | `% land` or `ha per units`, capped | Planning Act s.42 / s.51.1: base 2% (commercial/industrial) or 5% (other); alternative rate capped by site size, 10% of land value under 1 ha and 15% for 1–5 ha. Toronto's alternative-rate policy and caps **[S]** ([Ontario](https://www.ontario.ca/page/municipal-development-and-community-benefits-charges-and-parklands)). Sources disagree on the CIL alternative ratio, so verify the current Planning Act text |
| Community Benefits Charge | buildings ≥5 storeys and ≥10 units (single-tier and lower-tier municipalities with a CBC by-law) | `% of land value`, capped at 4% by regulation | O. Reg. 509/20 **[S]**. Reduced for affordable/attainable units from 2024-06-01 |
| Inclusionary zoning (Toronto, in protected major transit station areas) | R C | revenue loss on set-aside units | Toronto IZ by-law and PMTSA maps **[S]** |
| Rental replacement and tenant assistance (demolition/conversion of 6+ rental units) | existing rental | replacement units + `$/tenant` | Toronto Municipal Code **Ch. 667**: replacement units kept as rental for **≥20 years**, right of return at similar rent, Tenant Assistance Plan with rent-gap and moving compensation **[V]**. Compensation formulas were under review in 2025 **[S]** |
| Site plan securities / letters of credit | all | `% of works` | municipal site plan agreement **[S]**; LC fee from lender **[Q]** |

## 4. Development charges and other levies

DC = development charge, a per-unit levy on new development, set by municipal by-law.

| Item | Applies | Driver | Timing | Where to find it |
|---|---|---|---|---|
| City DC, Toronto | all | `$/unit` by type, `$/m²` non-residential | first building permit (see deferrals) | Toronto DC rate schedule. June 2025 non-rental rates: **$52,676** (studio/1-bed), **$80,690** (2+ bed). Rental: $33,497 (studio/1-bed), $48,299 (2-bed), $45,280 (3+ bed). The **DC Reduction Program** (−40% studio/1-bed, −60% 2+ bed) applies to first permits **2026-03-30 to 2029-08**, with rates flat 2027–29 **[S]**. Figures come from a July 2026 City presentation and a draft by-law; confirm the enacted by-law before use ([presentation](https://www.toronto.ca/wp-content/uploads/2026/07/98dd-DCRP-and-PBR-ULI-Presentation-2026-07-28.pdf), [June 2025 rates](https://www.toronto.ca/wp-content/uploads/2025/08/9709-DC-Rates-June-26-2025.pdf)) |
| City DC, Oshawa | all | `schedule` | permit | Oshawa schedules effective 2026-07-01 **[S]** |
| Regional DC: Durham (and York, Peel, Halton) | all | `schedule` | permit | Durham DC page, including the rental deferral approved 2026-05-27 **[S]**; York by-law 2026-20 **[S]**; Halton 2026 **[S]**; Peel backlog |
| Education DC | residential | `$/unit` | permit | Toronto EDC (TCDSB) **[S]**; Durham school boards' EDC by-laws **[S]** |
| Area-specific DCs, GO Transit DC | MP, some regions | `schedule` | permit | municipal by-laws **[S]** |
| **Statutory DC discounts and exemptions** | R, affordable, attainable | `%` off | permit | DCA s.26.2: purpose-built rental discounts by bedroom count; affordable and attainable exemptions using the Ontario affordable-units bulletin (CSV, effective 2026-07-01) **[S]** |
| **DC deferrals: timing, not waiver** | R C | shifts payment date, plus interest | instalments or occupancy | DCA s.26.1: rental instalments. **Bill 17 (2025)**: municipal and regional DCs for non-rental residential deferred to occupancy, with an occupancy permit required for such projects from **2025-11-03** **[S]** ([Waterloo summary](https://www.waterloo.ca/sandbox/development-charges-draft)). Confirm the enacted text on e-Laws. Durham rental deferral **[S]** |
| DC credits for works built by the developer, including transit | MP, near transit | credit against DC | at agreement | Precedent: Toronto credited the transit component of DCs for Spadina Station works at 334–350 Bloor St W (2023) **[V]** ([report](https://www.toronto.ca/legdocs/mmis/2023/ex/bgrd/backgroundfile-240054.pdf)) |

## 5. Permits, rights-of-way and utilities

| Item | Applies | Driver | Where to find it |
|---|---|---|---|
| Building permit fee | all | `$/m²` by class | Toronto Municipal Code Ch. 363 fee schedule **[S]**; Oshawa building fee by-law **[S]** |
| Demolition permit | existing buildings | `$` | same **[S]** |
| Right-of-way: street occupation, hoarding, crane swing, temporary road or lane closure | urban sites | `$/m²/month` | Toronto Transportation Services fees **[S]** |
| Crane swing and tie-back / shoring encroachment agreements with neighbours | urban infill | `$` (negotiated) | **[Q]** |
| Water and sewer connections | all | `$` + `$/m` | Toronto Water / Durham Region **[S]** |
| Electrical service: connection and capacity expansion | all | `$` | Toronto Hydro / Elexicon (Oshawa) **[S]**; **[Q]** for expansion |
| Gas, telecom, district energy | all | `$` | Enbridge **[S]**; **[Q]** |
| Municipal servicing agreement and securities | MP, site plan | `% of works` | municipality **[S]** |
| Boulevard and streetscape restoration | urban | `$/m²` | municipality **[S]** |

## 6. Demolition and site preparation

| Item | Applies | Driver | Where to find it |
|---|---|---|---|
| Tenant buyouts and statutory compensation | existing rental | `$/unit` | Residential Tenancies Act (N13 notices; compensation for demolition or conversion) **[S]**; Toronto Ch. 667 (§3) |
| Hazardous materials abatement | existing buildings | `$/m²` | **[Q]** |
| Demolition | existing buildings | `$/m²` or `$/m³` | **[Q]**; Hanscomb / RSMeans **[S]** |
| Utility disconnects and decommissioning | existing buildings | `$` | utilities **[S]** |
| Excavation (soil, rock), off-site disposal | all | `$/m³` | **[Q]**; excess soil (§2) |
| Shoring (soldier pile and lagging, caisson, secant wall), underpinning | urban | `$/m²` of wall | **[Q]** |
| Dewatering during construction | high water table | `$/month` | **[Q]** |
| Hoarding, fencing, site security | all | `$/m` / `$/month` | **[Q]** |

## 7. Hard construction costs

Structure follows CIQS elemental (Uniformat II) so quotes, benchmarks and quantity estimates map to the same lines and are never double-counted.

| Element group | Driver at each estimate class | Where to find it |
|---|---|---|
| Whole-building benchmark | Class D: `$/ft²` GFA by building type | Altus Canadian Cost Guide (low/high range) **[S]**, Hanscomb Yardsticks **[S]** |
| Substructure (foundations, below-grade parking) | Class C: `$/ft²`, `$/stall` | Altus parking `$/stall` **[S]**; **[Q]** |
| Structure, envelope, interiors | Class C–B: `$/ft²` by element | Hanscomb / RSMeans elemental **[S]**; quantity surveyor **[Q]** |
| Vertical transportation | `$/elevator` + `$/stop` | **[Q]** |
| Mechanical, plumbing, fire protection, electrical | `$/ft²` | **[Q]** |
| Site work and landscaping | `$/m²` | **[Q]** |
| EV-ready parking, Toronto Green Standard tier upgrades, green roof | `$/stall`, `$/ft²` | Toronto zoning / TGS **[S]**; **[Q]** |
| General conditions / requirements | `% of trades` or `$/month` | **[Q]** |
| Construction manager or GC fee | `% of trades` | **[Q]** |
| Design contingency | `%`, shrinking by class | ADR-002 defaults |
| Construction contingency | `%` | ADR-002 defaults |
| Escalation to construction midpoint | index × months | StatCan BCPI **[V]**, Altus outlook **[S]** |
| Builder's risk and wrap-up liability insurance | `% of hard` | **[Q]** |
| Bonding (performance, labour and materials) | `% of contract` | **[Q]** |
| Winter conditions | `$/month` | **[Q]** |
| Construction Act holdback (10%) | timing: released after the lien period | Construction Act **[S]** (affects cash timing, not cost) |

## 8. Soft costs

| Item | Driver | Where to find it |
|---|---|---|
| Architecture | `% of hard` or `$` by stage | OAA fee guideline **[S]**; **[Q]** |
| Structural, MEP, civil, landscape, envelope, acoustic, code, elevator consultants | `% of hard` or `$` | **[Q]** |
| Cost consultant / quantity surveyor; lender's monitor | `$/month` | **[Q]** |
| Project manager, development manager fee | `% of cost` or `$/month` | **[Q]** |
| Planning consultant, legal (planning, real estate, condo, leasing) | `$` | **[Q]** |
| Accounting, audit, tax advice | `$` | **[Q]** |
| Insurance during development | `$` | **[Q]** |
| Property tax during construction | assessment × rate | MPAC × municipal rates **[S]** |
| Developer overhead / fee | `% of cost` | sponsor assumption |
| Soft-cost contingency | `%` | ADR-002 defaults |

## 9. Financing

| Item | Driver | Where to find it |
|---|---|---|
| Land loan, construction loan: interest | dated benchmark + spread on the monthly balance | BoC Valet **[S]**, lender term sheet **[Q]** |
| Commitment, standby, extension fees | `% of commitment` | **[Q]** |
| Lender legal, appraisal, cost-consultant monitoring | `$`, `$/month` | **[Q]** |
| Mezzanine, preferred equity | rate + fees, waterfall | **[Q]** |
| Letters of credit (DC and site plan securities, deposits) | `% per year` | **[Q]** |
| CMHC MLI Select: application fee and insurance premium | `% of loan` by points | CMHC **[S]** |
| CMHC Apartment Construction Loan Program (ACLP) | program terms | CMHC, open per handoff review **[S]** |
| Interest reserve | ledger result | engine |
| Refinance: prepayment penalty, new lender fees | `$`, `%` | **[Q]** |
| Condo deposit financing / excess-deposit insurance | `% of deposits` | Tarion deposit protection limits **[S]**; insurer **[Q]** |
| Interest-rate hedges | `$` | **[Q]** |

## 10. Sales and commodity taxes (cash timing matters)

| Item | Applies | Where to find it |
|---|---|---|
| HST on construction inputs; input tax credits | C G (taxable supplies) | CRA **[S]** |
| Self-supply HST on first occupancy (rental), at fair market value | R | CRA **[S]** |
| Federal GST rental rebate (enhanced for qualifying purpose-built rental) and New Residential Rental Property Rebate | R | CRA NRRP page **[S]** |
| Ontario Enhanced NRRP (construction starting 2026-04-01 to 2027-03-31, with conditions) | R | CRA ENRRP page **[S]** |
| Standard new housing rebates: federal (max about $6,300) and Ontario (max $24,000), usually assigned to the builder | C | CRA / Ontario **[S]** |
| Federal First-Time Home Buyers' GST rebate: up to 100% of GST, max $50,000, agreements from 2025-03-20 to before 2031 | C | **[S]** ([Osler](https://www.osler.com/en/insights/updates/ontarios-new-hst-rebate-key-details/)) |
| Ontario full HST rebate on new homes up to $1M (max $130,000, phased out above), agreements 2026-04-01 to 2027-03-31 | C | **[P]**: announced 2026-03-25 and subject to federal Excise Tax Act changes; sources disagree on the phase-out ceiling |
| Toronto Vacant Home Tax | R C (unsold or vacant units) | City of Toronto **[S]** |
| Federal Underused Housing Tax | C (unsold inventory) | CRA **[S]**: verify current status |

## 11. Condo / for-sale specific

| Item | Driver | Where to find it |
|---|---|---|
| Presales threshold before construction financing | `% of units` (lender) | **[Q]** |
| Deposit structure, trust or insurance; use restrictions on deposits | schedule | Condominium Act s.81, Tarion **[S]** |
| Sales centre, model suites, marketing | `$`, `% of revenue` | **[Q]** |
| Commissions (in-house and co-op broker) | `% of price` | **[Q]** |
| **Tarion warranty enrolment fee** | `schedule` by sale price | Tarion. The latest published schedule (effective 2024-01-01) runs from $585 (≤$300k) to $6,000 (≥$4M) + HST. Proposed 2025 increases were not confirmed **[S]** ([Tarion](https://www.tarion.com/node/762)) |
| HCRA regulatory oversight fee | `$/home` | **$145 + HST per home**, collected by Tarion **[S]** ([HCRA](https://www.hcraontario.ca/?p=5011)) |
| HCRA builder/vendor licence | `$/year` | HCRA **[S]** |
| Condo registration: declaration, description, reference plan, Land Titles fees | `$` | ServiceOntario / Land Titles **[S]** |
| Interim occupancy: occupancy fees from buyers (offset) | `$/unit/month` | Condominium Act s.80 **[S]** |
| Closing adjustments recoverable from buyers (levies over a cap, Tarion fee, meters) | `$/unit` (offset, contract-dependent) | agreement of purchase and sale |
| Reserve fund study, performance audit, turnover | `$` | Condominium Act **[S]**; **[Q]** |
| Unsold inventory: common expenses, property tax, carry | `$/unit/month` | engine |
| Warranty service and deficiency reserve | `% of revenue` | sponsor assumption |

## 12. Rental lease-up and operations

| Item | Driver | Where to find it |
|---|---|---|
| Leasing commissions or staff, marketing, concessions (free rent) | `$/unit`, months free | **[Q]** / CMHC RMS for context |
| Property management fee | `% of EGI` | **[Q]** |
| Payroll, repairs and maintenance, utilities, insurance, admin | `$/unit/yr` | CMHC / owner data **[Q]** |
| **Property tax** | assessment × rate | Toronto 2026: residential and **new multi-residential 0.767311%**, multi-residential 1.208792%. New multi-residential keeps a 15% municipal reduction subclass **[V]** ([Toronto rates](https://www.toronto.ca/services-payments/property-taxes-utilities/property-tax/property-tax-rates-and-fees/)); Oshawa rates **[S]** |
| RentSafeTO registration (Toronto apartments of 3+ storeys and 10+ units) | `$/unit/yr` | City of Toronto **[S]** |
| Capital reserves | `$/unit/yr` | sponsor or lender assumption |
| Rent control status | rule | Ontario RTA: units first occupied after 2018-11-15 are exempt from the guideline increase **[S]** |
| Vacancy and credit loss | `%` by unit type | CMHC RMS **[S]** |

## 13. Commercial / general uses (retail, office, industrial, mixed use)

| Item | Driver | Where to find it |
|---|---|---|
| Base rent, escalations, recoveries (net vs gross) | `$/ft²/yr` | broker reports **[S]**, **[Q]** |
| Tenant improvement allowance, landlord's work | `$/ft²` | **[Q]** |
| Leasing commissions | `% of term rent` | **[Q]** |
| Free rent, downtime between tenants, absorption | months | broker reports **[S]** |
| Cap rate by asset class | `%` | CBRE / Colliers / Altus **[S]** |

## 14. Exit, disposition and refinance

| Item | Driver | Where to find it |
|---|---|---|
| Sale commission, legal, marketing | `% of price`, `$` | **[Q]** |
| HST on sale (commercial; condo units) | `%` | CRA **[S]** |
| Loan payoff, prepayment penalty | ledger result + `$` | lender **[Q]** |
| Bulk-sale land transfer tax (when the buyer is modelled) | `schedule` | §1 |

## 15. Master plan / land development (macro)

| Item | Driver at Class D | Where to find it |
|---|---|---|
| Land budget: gross → net developable area (roads, parks, stormwater ponds, natural heritage, school sites) | `% of gross ha` | municipal secondary plans, block plans **[S]** |
| Arterial, collector and local roads | `$/m` by cross-section | DC background studies (capital project tables and unit-rate appendices; e.g. Toronto 2023, Clarington 2026, King 2025) **[S]**; Ontario Provincial Standards (OPSS) for spec **[S]** |
| Watermains, sanitary and storm sewers, pumping stations, reservoirs | `$/m`, `$` | Water/Wastewater Master Plans and DC studies **[S]**. Example of the method: King Township 2025 used "standardized unit rates" before detailed design **[V]** |
| Stormwater management ponds, low-impact development | `$/ha` served | DC studies, conservation authority guidance **[S]** |
| Parks and open space development | `$/ha` | DC studies (parks component) **[S]** |
| Schools, community centres, libraries | land dedication / `$` | school boards (EDC studies), municipal DC studies **[S]** |
| Transit integration (station connections, TTC/Metrolinx works) | `$` + DC credits | TTC (60 m review), Metrolinx TOC program, DC credit precedents (§4) **[S]** |
| Front-ending agreements and landowner cost-sharing (trustee, block plan) | share of `$` by land area or units | DCA Part III; landowner group agreements **[S]** |
| Servicing allocation, phasing, absorption by phase | units/yr | CMHC starts, Altus/Urbanation absorption **[S]** |
| Lot or block sales to builders (revenue) | `$/front-ft`, `$/acre`, `$/unit` | **[Q]** / comparable land sales |
| Long-horizon land carry and inflation | rate × years | engine (ADR-002) |

---

## Benchmark and industry references (added 2026-10-21, from owner-supplied links)

Dated references used for context, heuristics and future ingestion. Benchmarks are cited with their date; tables are not copied.

| Reference | What it gives | Use in the tool |
|---|---|---|
| Altus Canadian Cost Guide 2026 | Hard cost $/ft² by building type and city | Class C benchmark (licence check D-14) |
| Turner & Townsend Canada annual cost guide, Q1 2026 | $/ft² GFA (BOMA) across real-estate types from 800+ projects; infrastructure $/km | Second benchmark, master-plan transit/infrastructure |
| Cushman & Wakefield office fit-out cost guide 2026 | Toronto $204.45/ft² construction; $306.68/ft² all-in incl. soft, IT, A/V, furniture **[V]** | Office TI / fit-out allowance |
| HKC Construction blog (2025 data) | Commercial $/ft² ranges by type (some figures inconsistent) | Secondary reference only |
| CMHC Housing Design Catalogue | Regional Class B construction cost summaries for standard designs | Missing-middle / infill benchmarks |
| Bullpen & Batory GTA High-Rise Land Insights, Q4-2019 | Land $/buildable ft² ($111 GTA avg; $187 former Toronto 2019) and land-to-revenue (~10–15%) **[V, dated]** | Land-to-revenue insight; land comps method |
| Brandon Donnelly, "Demystifying the development pro forma" | Worked Toronto mid-rise: land $231/ft², hard $360/ft², soft ≈ 75% of hard incl. levies and interest; <5% margin unviable, ~15% in range | Calibration of insights; definition note on "soft" |
| Finnegan Marshall (cost consultant) | QS scope: ~70-item budgets, monthly cost-to-complete, draw approvals, lender reports | Tracker cost-to-complete; future lender reporting |
| Toronto Multiplex Proforma | 50+ hard-cost components over 8 phases; timeline Gantt; cash-on-cash | Backlog: phase-level hard costs, Gantt view |
| RealPAC pro forma course; Spacing "What is a development pro forma" | Section structure (land, zoning, design, soft, financing, leasing, ops, valuation, sensitivity, partnership hurdles) | Coverage check on stages; waterfall backlog |
| City of Toronto Development Pipeline dashboard; UrbanToronto project database | Pipeline and comparable projects | Market evidence card (Milestone D, terms to check) |

## Open source questions to close before ingestion

1. Toronto 2026 DC by-law and DC Reduction Program: enacted rates and eligibility (was a draft at review).
2. Bill 17 final text on e-Laws: DC deferral scope and interest; O. Reg. 163/24 occupancy permit rule.
3. Tarion 2026 enrolment fee schedule and HCRA fee: confirm current values.
4. Parkland cash-in-lieu alternative ratio: sources conflict (1 ha per 500 vs 1 ha per 1,000 units). Read the current Planning Act s.42.
5. Ontario HST new-home rebate expansion: watch for the federal Excise Tax Act amendment before modelling it as law.
6. Underused Housing Tax: current status.
7. Altus licence terms for showing guide figures to end users (DECISION_LOG D-14).
8. Quote-based items **[Q]**: collect 2–3 recent GTA quotes or tender awards per item so the defaults have evidence behind them.

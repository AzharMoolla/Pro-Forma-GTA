# Cost checklists by project type

Generated from `data/costs/catalogue.json` (v0.1.0, as of 2026-10-21) by `npm run report`. Do not edit by hand.

The catalogue holds **151 project variables** and **232 cost items** across 16 stages. Each project type below lists every item that can apply. Items marked **if …** are switched on by a project variable (dirty soil, affordable units, TTC proximity, amenities and so on). Source tags: verified · source · quote · proposed (not law).

| Project type | Always applies | Conditional | Example |
|---|---|---|---|
| Purpose-built rental, mid-rise (6–12 storeys) | 73 | 114 | Avenue mid-rise with ground-floor retail |
| Purpose-built rental tower, transit-oriented | 73 | 115 | Mall-parcel intensification beside a subway station (Spanier: mall redevelopment around transit) |
| High-rise condominium | 79 | 116 | Downtown condo tower with presales |
| Mixed-use tower(s) on a retail/office podium | 86 | 121 | Galleria-style site: condo + rental towers over retail, parking moved underground |
| Townhouses / stacked towns | 77 | 115 | Freehold or condo towns in a suburban plan |
| Infill multiplex / garden or laneway suites (2–10 units) | 66 | 110 | Fourplex replacing a detached house |
| Commercial: office, retail, industrial | 66 | 109 | Multi-tenant industrial or retail plaza |
| Adaptive reuse / conversion | 74 | 112 | Office-to-residential; Canary District's post-Games conversion (kitchens added to athlete suites) |
| Master-planned community (greenfield or brownfield) | 54 | 127 | Lakeview Village: 177-acre brownfield waterfront, 8,050→16,000 units, employment lands, parks, pier |

## Variables (the switches)

| Group | Count | Examples |
|---|---|---|
| site | 24 | Municipality; Site area; Frontage; Existing building on site; … |
| deal | 5 | Land price; Land is a taxable supply (vacant / commercial); Buyer is a foreign entity (NRST); Land financed with a land loan; … |
| planning | 25 | Official plan amendment required; Zoning by-law amendment required; Site plan approval required; Draft plan of subdivision; … |
| program | 19 | Residential tenure; Share of 2+ bedroom units (Growing Up guidelines, DC rates); Retail NLA; Office NLA; … |
| design | 20 | Structural system; Envelope; Heating/cooling; Passenger elevators; … |
| construction | 6 | Construction duration; Delivery model; Shoring / underpinning; Tower crane months; … |
| market | 14 | Rents and vacancy by bedroom type; Rent growth; Condo price per ft² by type; Sales or lease-up absorption; … |
| finance | 9 | Construction loan rate (benchmark + spread); Loan-to-cost; Mezzanine / preferred equity; CMHC MLI Select insured take-out; … |
| policy | 4 | DC deferral elected (rental instalments / Bill 17 occupancy deferral / Durham rental deferral); Toronto DC Reduction Program eligible (first permit 2026-03-30 to 2029-08); Federal GST rental rebate / Ontario ENRRP eligible; New housing rebates assigned to builder / FTHB rebate |
| ops | 4 | Property management fee; Utilities; Property tax class; Capital reserves |
| master-plan | 21 | Gross site area; Net developable share (after roads, parks, SWM, NHS, schools); Phases; Arterial road length; … |

## Purpose-built rental, mid-rise (6–12 storeys)

*Components:* rental, commercial? · *Example:* Avenue mid-rise with ground-floor retail

**Screening and market evidence**

- Market study, appraisal, broker opinion of value · `lumpSum` · class B · quote
- Market data subscriptions (Altus Data Studio, Urbanation, CoStar) · `lumpSum` · class A · source
- Construction cost benchmark (Altus Canadian Cost Guide 2026, released 2026-04-23) · `perArea` · class C · verified
- Concept massing / test-fit · `lumpSum` · class B · quote

**Land acquisition and holding**

- Land purchase price · `lumpSum` · class exact · source
- Ontario land transfer tax · `schedule` · class exact · source
- Toronto municipal land transfer tax (luxury brackets from 2026-04-01: 4.40%–8.60% above $3M) · `schedule` · class exact · verified — *if site.municipality=toronto*
- Non-Resident Speculation Tax (25%) (0.25 of value) · `percentOf` · class exact · verified — *if deal.buyerNonResident*
- HST on land (taxable supply; registrant self-assesses) (0.13 of price) · `percentOf` · class exact · source — *if deal.vacantOrCommercialLand*
- Legal, title insurance, searches · `lumpSum` · class B · quote
- Survey: boundary, topographic, reference plan · `lumpSum` · class B · quote
- Building condition assessment · `lumpSum` · class B · quote — *if site.existingBuilding*
- Zoning review / compliance letter · `schedule` · class exact · source
- Brokerage commission on purchase · `percentOf` · class A · quote
- Land assembly premium and holdout costs · `lumpSum` · class D · quote — *if site.parcelsToAssemble>=2*
- Land loan: interest, fees, lender legal, appraisal · `rate` · class A · quote — *if deal.landLoan*
- Property tax during hold · `rate` · class A · source
- Insurance, security, vacant-building maintenance · `perMonth` · class B · quote
- Interim income from existing tenants (offset) · `perMonth` · class B · source — *if site.existingBuilding*

**Due diligence and studies**

- Phase One ESA (Phase-One-only RSCs no longer filable unless required, since 2025-10-23) · `lumpSum` · class B · verified
- Phase Two ESA: boreholes, sampling, lab · `perUnit` · class B · quote — *if site.contamination=low*
- Phase Two ESA, delineation (high risk) · `perUnit` · class C · quote — *if site.contamination=high*
- Record of Site Condition + MECP filing (O. Reg. 153/04) · `lumpSum` · class B · source — *if site.useChangeToSensitive*
- Risk assessment (alternative to full remediation) · `lumpSum` · class C · quote — *if site.contamination=high*
- Geotechnical investigation (per-borehole pricing; ~0.2–0.4% of construction for low-rise) · `perUnit` · class B · verified
- Hydrogeological study · `lumpSum` · class B · quote — *if site.highWaterTable*
- Designated substance survey (asbestos, lead, mould; O. Reg. 278/05) · `lumpSum` · class B · source — *if site.existingBuilding*
- Arborist report and tree protection plan · `lumpSum` · class B · quote — *if site.protectedTrees>=1*
- Archaeological assessment, Stages 1–4 · `perHectare` · class C · source — *if site.archaeologicalPotential*
- Heritage impact assessment, conservation plan · `lumpSum` · class B · source — *if site.heritage*
- Natural heritage / environmental impact study, species at risk · `lumpSum` · class C · quote — *if site.regulatedArea*
- Transportation impact study, TDM plan, parking study · `lumpSum` · class B · quote
- Noise and vibration study · `lumpSum` · class B · quote
- Rail proximity: safety/vibration study, crash wall or berm design · `lumpSum` · class C · source — *if site.nearRailCorridor*
- Pedestrian wind and sun/shadow studies · `lumpSum` · class B · quote
- Functional servicing and stormwater management report · `lumpSum` · class B · quote
- Energy strategy, energy model, Toronto Green Standard checklist · `lumpSum` · class B · source
- Planning justification report, urban design brief, community consultation · `lumpSum` · class B · quote — *if planning.zba*
- TTC technical review (work within 60 m of TTC infrastructure) · `lumpSum` · class C · verified — *if site.nearTtc60m*
- TTC-required protections, monitoring and design changes · `lumpSum` · class D · quote — *if site.nearTtc60m*
- Metrolinx review / rail corridor agreements · `lumpSum` · class C · source — *if site.nearRailCorridor*
- MTO corridor permits · `lumpSum` · class B · source — *if site.nearHighway*
- Conservation authority permit and review fees (TRCA / CLOCA) · `schedule` · class exact · source — *if site.regulatedArea*
- Floodproofing design and works · `lumpSum` · class D · quote — *if site.floodplain*

**Planning approvals and land-value charges**

- Official plan amendment application fee · `schedule` · class exact · source — *if planning.opa*
- Zoning by-law amendment application fee · `schedule` · class exact · source — *if planning.zba*
- Site plan application fee · `schedule` · class exact · source — *if planning.sitePlan*
- Draft plan of subdivision fee · `schedule` · class exact · source — *if planning.subdivision*
- Draft plan of condominium fee · `schedule` · class exact · source — *if planning.condoPlan*
- Committee of Adjustment fee · `schedule` · class exact · source — *if planning.minorVariance*
- Ontario Land Tribunal appeal: legal and experts · `lumpSum` · class D · quote — *if planning.appealRisk*
- Planner, architect and legal time through approvals · `lumpSum` · class C · quote
- Parkland cash-in-lieu (Planning Act s.42; caps 10% of land value <1 ha, 15% for 1–5 ha) · `percentOf` · class exact · source
- Community Benefits Charge (up to 4% of land value) (0.04 of land value (cap)) · `percentOf` · class exact · source — *if planning.cbcApplies*
- Inclusionary zoning: revenue forgone on affordable set-aside · `revenue` · class B · source — *if planning.inclusionaryZoning*
- Affordable units: rent or price below market · `revenue` · class B · source — *if planning.affordableShare>=0.01*
- Rental replacement units (Toronto Ch. 667: ≥20 years as rental, right of return at similar rent) · `revenue` · class B · source — *if site.existingRentalUnits>=6 and site.municipality=toronto*
- Tenant Assistance Plan: rent-gap and moving compensation · `perUnit` · class C · source — *if site.existingRentalUnits>=6 and site.municipality=toronto*
- Public art (Toronto Percent for Public Art guideline ~1% of gross construction cost, negotiated) (0.01 of gross construction cost) · `percentOf` · class B · source — *if planning.publicArt*
- POPS design, construction and easement · `perArea` · class C · quote — *if planning.pops*
- Site plan / landscaping securities (letter of credit) · `percentOf` · class B · source — *if planning.sitePlan*

**Development charges and levies**

- Toronto DC (June 2025: $52,676 studio/1-bed, $80,690 2+ bed non-rental; rental $33,497 / $48,299 / $45,280) · `perUnit` · class exact · source — *if site.municipality=toronto*
- Toronto DC Reduction Program credit (−40% studio/1-bed, −60% 2+ bed; draft at review) · `perUnit` · class exact · source — *if site.municipality=toronto and policy.torontoDcReduction*
- Oshawa DC (schedule effective 2026-07-01) · `perUnit` · class exact · source — *if site.municipality=oshawa*
- Durham Region DC · `perUnit` · class exact · source — *if site.municipality=oshawa*
- Education development charge · `perUnit` · class exact · source
- Non-residential DCs on retail/office/industrial GFA · `perArea` · class exact · source — *if program.retailNla>=1*
- Statutory purpose-built rental DC discount by bedroom count (DCA s.26.2) · `perUnit` · class exact · source
- Affordable/attainable unit DC exemption (Ontario bulletin effective 2026-07-01) · `perUnit` · class exact · source — *if planning.affordableShare>=0.01*
- DC deferral: payment moved to occupancy/instalments, interest capped by statute (timing, not waiver) · `rate` · class exact · source — *if policy.dcDeferral*
- DC credits for works built by the developer (e.g. transit: 334–350 Bloor St W) · `lumpSum` · class C · verified — *if mp.transitIntegration*
- Long-term care DC exemption (Bill 17) · `perUnit` · class exact · source — *if program.studentOrSeniors*

**Permits, rights-of-way and utilities**

- Building permit fee (Toronto Municipal Code Ch. 363) · `perArea` · class exact · source
- Demolition permit · `schedule` · class exact · source — *if site.existingBuilding*
- Right-of-way: street occupation, hoarding, crane swing, lane closures · `perMonth` · class B · source — *if site.tightUrbanSite*
- Crane-swing and tie-back encroachment agreements with neighbours · `lumpSum` · class D · quote — *if site.tightUrbanSite*
- Water and sewer service connections · `lumpSum` · class B · source
- Off-site servicing capacity upgrades (watermain, sewer) · `perLinear` · class D · quote
- Electrical connection and capacity expansion (Toronto Hydro / Elexicon) · `lumpSum` · class C · quote
- Electrical vault / transformer room · `lumpSum` · class C · quote — *if design.hydroVault*
- Gas, telecom and fibre connections · `lumpSum` · class C · quote
- District energy connection charge · `lumpSum` · class C · quote — *if design.energySystem=district-energy*
- Vehicle entries/exits: curb cuts, ramps, lay-bys, fire route · `perUnit` · class C · quote — *if design.vehicleAccessPoints>=1*
- Boulevard and streetscape restoration (paving, street trees in soil cells, lighting) · `perLinear` · class C · source — *if design.streetscapeM>=1*
- Sign permits (sign by-law) · `schedule` · class exact · source — *if design.signage*

**Demolition, remediation and site preparation**

- Tenant buyouts / RTA compensation (N13) · `perUnit` · class C · source — *if site.existingRentalUnits>=1*
- Commercial lease terminations / relocation · `lumpSum` · class D · quote — *if site.existingCommercialTenants*
- Hazardous materials abatement · `perArea` · class C · quote — *if site.existingBuilding*
- Demolition and disposal · `perArea` · class C · quote — *if site.existingBuilding*
- Utility disconnections and decommissioning · `lumpSum` · class B · source — *if site.existingBuilding*
- Utility / easement relocation · `lumpSum` · class D · quote — *if site.utilityRelocation*
- Soil and groundwater remediation (dig-and-dump or in-situ) · `perVolume` · class D · quote — *if site.contamination=high*
- Excess soil: characterization, Qualified Person, registry, hauling and tipping (O. Reg. 406/19) · `perVolume` · class C · source — *if site.excessSoilM3>=1*
- Bulk excavation · `perVolume` · class C · quote
- Rock excavation premium · `perVolume` · class D · quote — *if site.rockExcavation*
- Shoring (soldier pile/lagging, caisson, secant) and underpinning · `perArea` · class C · quote — *if construction.shoring*
- Construction dewatering, PTTW/EASR, sewer discharge agreement · `perMonth` · class C · source — *if site.highWaterTable*
- Tree removal permits, replacement or cash-in-lieu (Toronto Ch. 813) · `perUnit` · class exact · source — *if site.protectedTrees>=1*
- Hoarding, fencing, site security · `perMonth` · class B · quote

**Hard construction**

- Hard cost, benchmark $/ft² by building type (Altus low/high) · `perArea` · class C · source
- Substructure and foundations · `perArea` · class C · quote
- Underground parking ($/stall; rises with each level below grade) · `perUnit` · class C · source — *if planning.parkingLevelsBelowGrade>=1*
- Superstructure (concrete, mass timber, steel, wood frame) · `perArea` · class C · quote
- Envelope (window wall, curtain wall, precast, masonry) · `perArea` · class C · quote
- Balconies and guards (thermally broken) · `perUnit` · class C · quote — *if design.balconies*
- Suite interiors and finishes · `perUnit` · class C · quote
- Passenger elevators (North America ~$150k+ each for mid-rise; quote per stop) · `perUnit` · class C · quote — *if design.elevators>=1*
- Service / freight elevator · `perUnit` · class C · quote — *if design.serviceElevator*
- Mechanical: HVAC, plumbing, fire protection · `perArea` · class C · quote
- Geoexchange boreholes and heat pumps · `lumpSum` · class D · quote — *if design.energySystem=geoexchange*
- Electrical, lighting, life safety · `perArea` · class C · quote
- Emergency / standby generator · `lumpSum` · class C · quote — *if design.standbyGenerator*
- Emergency responder radio system · `lumpSum` · class C · quote — *if design.emergencyRadio*
- EV-ready conduit and chargers · `perUnit` · class C · source — *if planning.evReadyShare>=0.01*
- Bicycle parking, repair station · `perUnit` · class B · quote — *if planning.bikeParking>=1*
- Green roof (Toronto ≥2,000 m² GFA: 20–60% of available roof; CIL $200/m² for reductions) · `perArea` · class C · verified — *if design.greenRoofM2>=1*
- Solar PV · `lumpSum` · class C · quote — *if design.solarPv*
- Toronto Green Standard higher-tier upgrades · `perArea` · class C · source — *if planning.greenStandardTier>=2*
- Stormwater retention tank, oil-grit separator, LID · `lumpSum` · class C · quote — *if design.stormwaterTank*
- Waste chutes, compactor, City collection room · `lumpSum` · class B · source — *if program.wasteChuteCompactor*
- Loading spaces and dock · `perUnit` · class C · quote — *if planning.loadingSpaces>=1*
- Indoor amenity space build-out · `perArea` · class C · quote — *if planning.amenityIndoorM2PerUnit>=0.1*
- Outdoor amenity space · `perArea` · class C · quote — *if planning.amenityOutdoorM2PerUnit>=0.1*
- Pool (structure, mechanical, finishes) · `lumpSum` · class C · quote — *if program.pool*
- Fitness centre fit-out and equipment · `lumpSum` · class B · quote — *if program.fitness*
- Rooftop terrace / amenity · `perArea` · class C · quote — *if program.rooftopAmenity*
- Co-working, party room, guest suite · `lumpSum` · class B · quote — *if program.coworkingPartyRoom*
- Pet spa / dog run · `lumpSum` · class B · quote — *if program.petSpaDogRun*
- Storage lockers · `perUnit` · class B · quote — *if program.lockers>=1*
- Childcare centre fit-out (outdoor play area, licensing requirements) · `perArea` · class C · quote — *if program.childcare*
- Institutional / community space (shell or turnkey per agreement) · `perArea` · class C · quote — *if program.institutional*
- Retail/office base building shell · `perArea` · class C · quote — *if program.retailNla>=1*
- Soft and hard landscaping · `perArea` · class C · quote — *if design.landscapingM2>=1*
- Building identification, wayfinding and retail signage · `lumpSum` · class B · quote — *if design.signage*
- Entrances, canopies and lobby finishes · `lumpSum` · class C · quote
- Heated ramp / snow-melt · `lumpSum` · class C · quote — *if design.snowMelt*
- General conditions / requirements · `perMonth` · class C · quote
- Tower crane rental, operators, foundations · `perMonth` · class B · quote — *if construction.craneMonths>=1*
- Winter heat and protection · `perMonth` · class C · quote — *if construction.winterMonths>=1*
- Construction manager / GC fee · `percentOf` · class B · quote
- Builder's risk and wrap-up liability insurance · `percentOf` · class B · quote
- Performance and labour & material bonds · `percentOf` · class B · quote
- Design contingency (shrinks with estimate class) · `percentOf` · class C · source
- Construction contingency · `percentOf` · class C · source
- Escalation to spend month (StatCan BCPI: Toronto residential 106.4, Q1 2026, +1.0% y/y) · `indexed` · class C · verified
- Construction Act 10% holdback (cash timing, not cost) · `timing` · class exact · source

**Soft costs**

- Architect (OAA fee guideline) · `percentOf` · class B · source
- Structural, mechanical, electrical, civil engineers · `percentOf` · class B · quote
- Landscape, envelope, acoustic, code, elevator, interior design consultants · `lumpSum` · class B · quote
- Cost consultant / quantity surveyor · `perMonth` · class B · quote
- Project / development manager · `percentOf` · class B · quote
- Legal: corporate, construction contracts, leasing · `lumpSum` · class B · quote
- Accounting, audit and tax advice · `lumpSum` · class B · quote
- Property tax during construction · `rate` · class A · source
- Amenity furniture, fixtures and equipment · `lumpSum` · class B · quote — *if design.ffeAmenity*
- Developer overhead / fee · `percentOf` · class exact · source
- Soft costs as % of hard (allowance until consultants are itemized) · `percentOf` · class C · source
- Soft-cost contingency · `percentOf` · class C · source
- Commissioning and energy verification · `lumpSum` · class B · quote

**Financing**

- Construction loan interest (dated benchmark + spread) · `ledger` · class A · source
- Commitment, standby and extension fees; lender legal; appraisal; cost monitoring · `percentOf` · class A · quote
- Mezzanine / preferred equity (rate, fees, waterfall) · `rate` · class A · quote — *if finance.mezzanine*
- Letters of credit fees (securities, DCs, deposits) · `rate` · class A · quote — *if finance.lettersOfCredit*
- CMHC MLI Select application fee and premium (by points: affordability, accessibility, energy) · `percentOf` · class B · source — *if finance.cmhcMliSelect*
- CMHC Apartment Construction Loan Program terms · `ledger` · class B · source — *if finance.cmhcAclp*
- Interest-rate hedge · `lumpSum` · class B · quote

**Sales and commodity taxes, rebates**

- Self-supply HST on first occupancy of rental (fair market value) (0.13 of FMV) · `percentOf` · class B · source
- Federal GST rental rebate / NRRP / Ontario ENRRP (construction start 2026-04-01 to 2027-03-31) · `percentOf` · class B · source — *if policy.rentalHstRebate*
- Toronto Vacant Home Tax (unsold or unoccupied units) · `percentOf` · class exact · source — *if site.municipality=toronto*

**Rental lease-up and operations**

- Leasing staff, marketing, model suite · `lumpSum` · class B · quote
- Lease-up concessions (free rent) · `revenue` · class B · source
- Property management fee · `percentOf` · class B · quote
- Payroll, repairs and maintenance, admin · `perUnit` · class B · quote
- Utilities (bulk vs submetered) · `perUnit` · class B · quote
- Property insurance · `perUnit` · class B · quote
- Property tax (Toronto 2026: new multi-residential 0.767311%, multi-residential 1.208792%) · `rate` · class exact · verified
- RentSafeTO registration (3+ storeys and 10+ units) · `perUnit` · class exact · source — *if site.municipality=toronto*
- Concierge and security · `perMonth` · class B · quote — *if program.concierge*
- Capital reserves · `perUnit` · class B · source
- Parking, storage, laundry and telecom income (revenue) · `revenue` · class B · source

**Commercial leasing and operations**

- Tenant improvement allowance / landlord's work · `perArea` · class B · quote — *if program.retailNla>=1*
- Leasing commissions · `perArea` · class B · quote — *if program.retailNla>=1*
- Free rent and downtime between tenants · `revenue` · class B · source — *if program.retailNla>=1*
- Unrecovered operating costs (net vs gross leases) · `perArea` · class B · source — *if program.retailNla>=1*

**Exit, refinance and disposition**

- Sale commission, legal, marketing at exit · `percentOf` · class A · quote
- Refinance: new lender fees, prepayment penalty · `percentOf` · class A · quote — *if finance.refinance*
- HST on sale of commercial property / new residential (0.13 of price) · `percentOf` · class exact · source


## Purpose-built rental tower, transit-oriented

*Components:* rental, commercial? · *Example:* Mall-parcel intensification beside a subway station (Spanier: mall redevelopment around transit)

**Screening and market evidence**

- Market study, appraisal, broker opinion of value · `lumpSum` · class B · quote
- Market data subscriptions (Altus Data Studio, Urbanation, CoStar) · `lumpSum` · class A · source
- Construction cost benchmark (Altus Canadian Cost Guide 2026, released 2026-04-23) · `perArea` · class C · verified
- Concept massing / test-fit · `lumpSum` · class B · quote

**Land acquisition and holding**

- Land purchase price · `lumpSum` · class exact · source
- Ontario land transfer tax · `schedule` · class exact · source
- Toronto municipal land transfer tax (luxury brackets from 2026-04-01: 4.40%–8.60% above $3M) · `schedule` · class exact · verified — *if site.municipality=toronto*
- Non-Resident Speculation Tax (25%) (0.25 of value) · `percentOf` · class exact · verified — *if deal.buyerNonResident*
- HST on land (taxable supply; registrant self-assesses) (0.13 of price) · `percentOf` · class exact · source — *if deal.vacantOrCommercialLand*
- Legal, title insurance, searches · `lumpSum` · class B · quote
- Survey: boundary, topographic, reference plan · `lumpSum` · class B · quote
- Building condition assessment · `lumpSum` · class B · quote — *if site.existingBuilding*
- Zoning review / compliance letter · `schedule` · class exact · source
- Brokerage commission on purchase · `percentOf` · class A · quote
- Land assembly premium and holdout costs · `lumpSum` · class D · quote — *if site.parcelsToAssemble>=2*
- Land loan: interest, fees, lender legal, appraisal · `rate` · class A · quote — *if deal.landLoan*
- Property tax during hold · `rate` · class A · source
- Insurance, security, vacant-building maintenance · `perMonth` · class B · quote
- Interim income from existing tenants (offset) · `perMonth` · class B · source — *if site.existingBuilding*

**Due diligence and studies**

- Phase One ESA (Phase-One-only RSCs no longer filable unless required, since 2025-10-23) · `lumpSum` · class B · verified
- Phase Two ESA: boreholes, sampling, lab · `perUnit` · class B · quote — *if site.contamination=low*
- Phase Two ESA, delineation (high risk) · `perUnit` · class C · quote — *if site.contamination=high*
- Record of Site Condition + MECP filing (O. Reg. 153/04) · `lumpSum` · class B · source — *if site.useChangeToSensitive*
- Risk assessment (alternative to full remediation) · `lumpSum` · class C · quote — *if site.contamination=high*
- Geotechnical investigation (per-borehole pricing; ~0.2–0.4% of construction for low-rise) · `perUnit` · class B · verified
- Hydrogeological study · `lumpSum` · class B · quote — *if site.highWaterTable*
- Designated substance survey (asbestos, lead, mould; O. Reg. 278/05) · `lumpSum` · class B · source — *if site.existingBuilding*
- Arborist report and tree protection plan · `lumpSum` · class B · quote — *if site.protectedTrees>=1*
- Archaeological assessment, Stages 1–4 · `perHectare` · class C · source — *if site.archaeologicalPotential*
- Heritage impact assessment, conservation plan · `lumpSum` · class B · source — *if site.heritage*
- Natural heritage / environmental impact study, species at risk · `lumpSum` · class C · quote — *if site.regulatedArea*
- Transportation impact study, TDM plan, parking study · `lumpSum` · class B · quote
- Noise and vibration study · `lumpSum` · class B · quote
- Rail proximity: safety/vibration study, crash wall or berm design · `lumpSum` · class C · source — *if site.nearRailCorridor*
- Pedestrian wind and sun/shadow studies · `lumpSum` · class B · quote
- Functional servicing and stormwater management report · `lumpSum` · class B · quote
- Energy strategy, energy model, Toronto Green Standard checklist · `lumpSum` · class B · source
- Planning justification report, urban design brief, community consultation · `lumpSum` · class B · quote — *if planning.zba*
- TTC technical review (work within 60 m of TTC infrastructure) · `lumpSum` · class C · verified — *if site.nearTtc60m*
- TTC-required protections, monitoring and design changes · `lumpSum` · class D · quote — *if site.nearTtc60m*
- Metrolinx review / rail corridor agreements · `lumpSum` · class C · source — *if site.nearRailCorridor*
- MTO corridor permits · `lumpSum` · class B · source — *if site.nearHighway*
- Conservation authority permit and review fees (TRCA / CLOCA) · `schedule` · class exact · source — *if site.regulatedArea*
- Floodproofing design and works · `lumpSum` · class D · quote — *if site.floodplain*

**Planning approvals and land-value charges**

- Official plan amendment application fee · `schedule` · class exact · source — *if planning.opa*
- Zoning by-law amendment application fee · `schedule` · class exact · source — *if planning.zba*
- Site plan application fee · `schedule` · class exact · source — *if planning.sitePlan*
- Draft plan of subdivision fee · `schedule` · class exact · source — *if planning.subdivision*
- Draft plan of condominium fee · `schedule` · class exact · source — *if planning.condoPlan*
- Committee of Adjustment fee · `schedule` · class exact · source — *if planning.minorVariance*
- Ontario Land Tribunal appeal: legal and experts · `lumpSum` · class D · quote — *if planning.appealRisk*
- Planner, architect and legal time through approvals · `lumpSum` · class C · quote
- Parkland cash-in-lieu (Planning Act s.42; caps 10% of land value <1 ha, 15% for 1–5 ha) · `percentOf` · class exact · source
- Community Benefits Charge (up to 4% of land value) (0.04 of land value (cap)) · `percentOf` · class exact · source — *if planning.cbcApplies*
- Inclusionary zoning: revenue forgone on affordable set-aside · `revenue` · class B · source — *if planning.inclusionaryZoning*
- Affordable units: rent or price below market · `revenue` · class B · source — *if planning.affordableShare>=0.01*
- Rental replacement units (Toronto Ch. 667: ≥20 years as rental, right of return at similar rent) · `revenue` · class B · source — *if site.existingRentalUnits>=6 and site.municipality=toronto*
- Tenant Assistance Plan: rent-gap and moving compensation · `perUnit` · class C · source — *if site.existingRentalUnits>=6 and site.municipality=toronto*
- Public art (Toronto Percent for Public Art guideline ~1% of gross construction cost, negotiated) (0.01 of gross construction cost) · `percentOf` · class B · source — *if planning.publicArt*
- POPS design, construction and easement · `perArea` · class C · quote — *if planning.pops*
- Site plan / landscaping securities (letter of credit) · `percentOf` · class B · source — *if planning.sitePlan*

**Development charges and levies**

- Toronto DC (June 2025: $52,676 studio/1-bed, $80,690 2+ bed non-rental; rental $33,497 / $48,299 / $45,280) · `perUnit` · class exact · source — *if site.municipality=toronto*
- Toronto DC Reduction Program credit (−40% studio/1-bed, −60% 2+ bed; draft at review) · `perUnit` · class exact · source — *if site.municipality=toronto and policy.torontoDcReduction*
- Oshawa DC (schedule effective 2026-07-01) · `perUnit` · class exact · source — *if site.municipality=oshawa*
- Durham Region DC · `perUnit` · class exact · source — *if site.municipality=oshawa*
- Education development charge · `perUnit` · class exact · source
- Non-residential DCs on retail/office/industrial GFA · `perArea` · class exact · source — *if program.retailNla>=1*
- Statutory purpose-built rental DC discount by bedroom count (DCA s.26.2) · `perUnit` · class exact · source
- Affordable/attainable unit DC exemption (Ontario bulletin effective 2026-07-01) · `perUnit` · class exact · source — *if planning.affordableShare>=0.01*
- DC deferral: payment moved to occupancy/instalments, interest capped by statute (timing, not waiver) · `rate` · class exact · source — *if policy.dcDeferral*
- DC credits for works built by the developer (e.g. transit: 334–350 Bloor St W) · `lumpSum` · class C · verified — *if mp.transitIntegration*
- Long-term care DC exemption (Bill 17) · `perUnit` · class exact · source — *if program.studentOrSeniors*

**Permits, rights-of-way and utilities**

- Building permit fee (Toronto Municipal Code Ch. 363) · `perArea` · class exact · source
- Demolition permit · `schedule` · class exact · source — *if site.existingBuilding*
- Right-of-way: street occupation, hoarding, crane swing, lane closures · `perMonth` · class B · source — *if site.tightUrbanSite*
- Crane-swing and tie-back encroachment agreements with neighbours · `lumpSum` · class D · quote — *if site.tightUrbanSite*
- Water and sewer service connections · `lumpSum` · class B · source
- Off-site servicing capacity upgrades (watermain, sewer) · `perLinear` · class D · quote
- Electrical connection and capacity expansion (Toronto Hydro / Elexicon) · `lumpSum` · class C · quote
- Electrical vault / transformer room · `lumpSum` · class C · quote — *if design.hydroVault*
- Gas, telecom and fibre connections · `lumpSum` · class C · quote
- District energy connection charge · `lumpSum` · class C · quote — *if design.energySystem=district-energy*
- Vehicle entries/exits: curb cuts, ramps, lay-bys, fire route · `perUnit` · class C · quote — *if design.vehicleAccessPoints>=1*
- Boulevard and streetscape restoration (paving, street trees in soil cells, lighting) · `perLinear` · class C · source — *if design.streetscapeM>=1*
- Sign permits (sign by-law) · `schedule` · class exact · source — *if design.signage*

**Demolition, remediation and site preparation**

- Tenant buyouts / RTA compensation (N13) · `perUnit` · class C · source — *if site.existingRentalUnits>=1*
- Commercial lease terminations / relocation · `lumpSum` · class D · quote — *if site.existingCommercialTenants*
- Hazardous materials abatement · `perArea` · class C · quote — *if site.existingBuilding*
- Demolition and disposal · `perArea` · class C · quote — *if site.existingBuilding*
- Utility disconnections and decommissioning · `lumpSum` · class B · source — *if site.existingBuilding*
- Utility / easement relocation · `lumpSum` · class D · quote — *if site.utilityRelocation*
- Soil and groundwater remediation (dig-and-dump or in-situ) · `perVolume` · class D · quote — *if site.contamination=high*
- Excess soil: characterization, Qualified Person, registry, hauling and tipping (O. Reg. 406/19) · `perVolume` · class C · source — *if site.excessSoilM3>=1*
- Bulk excavation · `perVolume` · class C · quote
- Rock excavation premium · `perVolume` · class D · quote — *if site.rockExcavation*
- Shoring (soldier pile/lagging, caisson, secant) and underpinning · `perArea` · class C · quote — *if construction.shoring*
- Construction dewatering, PTTW/EASR, sewer discharge agreement · `perMonth` · class C · source — *if site.highWaterTable*
- Tree removal permits, replacement or cash-in-lieu (Toronto Ch. 813) · `perUnit` · class exact · source — *if site.protectedTrees>=1*
- Hoarding, fencing, site security · `perMonth` · class B · quote

**Hard construction**

- Hard cost, benchmark $/ft² by building type (Altus low/high) · `perArea` · class C · source
- Substructure and foundations · `perArea` · class C · quote
- Underground parking ($/stall; rises with each level below grade) · `perUnit` · class C · source — *if planning.parkingLevelsBelowGrade>=1*
- Superstructure (concrete, mass timber, steel, wood frame) · `perArea` · class C · quote
- Envelope (window wall, curtain wall, precast, masonry) · `perArea` · class C · quote
- Balconies and guards (thermally broken) · `perUnit` · class C · quote — *if design.balconies*
- Suite interiors and finishes · `perUnit` · class C · quote
- Passenger elevators (North America ~$150k+ each for mid-rise; quote per stop) · `perUnit` · class C · quote — *if design.elevators>=1*
- Service / freight elevator · `perUnit` · class C · quote — *if design.serviceElevator*
- Mechanical: HVAC, plumbing, fire protection · `perArea` · class C · quote
- Geoexchange boreholes and heat pumps · `lumpSum` · class D · quote — *if design.energySystem=geoexchange*
- Electrical, lighting, life safety · `perArea` · class C · quote
- Emergency / standby generator · `lumpSum` · class C · quote — *if design.standbyGenerator*
- Emergency responder radio system · `lumpSum` · class C · quote — *if design.emergencyRadio*
- EV-ready conduit and chargers · `perUnit` · class C · source — *if planning.evReadyShare>=0.01*
- Bicycle parking, repair station · `perUnit` · class B · quote — *if planning.bikeParking>=1*
- Green roof (Toronto ≥2,000 m² GFA: 20–60% of available roof; CIL $200/m² for reductions) · `perArea` · class C · verified — *if design.greenRoofM2>=1*
- Solar PV · `lumpSum` · class C · quote — *if design.solarPv*
- Toronto Green Standard higher-tier upgrades · `perArea` · class C · source — *if planning.greenStandardTier>=2*
- Stormwater retention tank, oil-grit separator, LID · `lumpSum` · class C · quote — *if design.stormwaterTank*
- Waste chutes, compactor, City collection room · `lumpSum` · class B · source — *if program.wasteChuteCompactor*
- Loading spaces and dock · `perUnit` · class C · quote — *if planning.loadingSpaces>=1*
- Indoor amenity space build-out · `perArea` · class C · quote — *if planning.amenityIndoorM2PerUnit>=0.1*
- Outdoor amenity space · `perArea` · class C · quote — *if planning.amenityOutdoorM2PerUnit>=0.1*
- Pool (structure, mechanical, finishes) · `lumpSum` · class C · quote — *if program.pool*
- Fitness centre fit-out and equipment · `lumpSum` · class B · quote — *if program.fitness*
- Rooftop terrace / amenity · `perArea` · class C · quote — *if program.rooftopAmenity*
- Co-working, party room, guest suite · `lumpSum` · class B · quote — *if program.coworkingPartyRoom*
- Pet spa / dog run · `lumpSum` · class B · quote — *if program.petSpaDogRun*
- Storage lockers · `perUnit` · class B · quote — *if program.lockers>=1*
- Childcare centre fit-out (outdoor play area, licensing requirements) · `perArea` · class C · quote — *if program.childcare*
- Institutional / community space (shell or turnkey per agreement) · `perArea` · class C · quote — *if program.institutional*
- Retail/office base building shell · `perArea` · class C · quote — *if program.retailNla>=1*
- Soft and hard landscaping · `perArea` · class C · quote — *if design.landscapingM2>=1*
- Building identification, wayfinding and retail signage · `lumpSum` · class B · quote — *if design.signage*
- Entrances, canopies and lobby finishes · `lumpSum` · class C · quote
- Heated ramp / snow-melt · `lumpSum` · class C · quote — *if design.snowMelt*
- General conditions / requirements · `perMonth` · class C · quote
- Tower crane rental, operators, foundations · `perMonth` · class B · quote — *if construction.craneMonths>=1*
- Winter heat and protection · `perMonth` · class C · quote — *if construction.winterMonths>=1*
- Construction manager / GC fee · `percentOf` · class B · quote
- Builder's risk and wrap-up liability insurance · `percentOf` · class B · quote
- Performance and labour & material bonds · `percentOf` · class B · quote
- Design contingency (shrinks with estimate class) · `percentOf` · class C · source
- Construction contingency · `percentOf` · class C · source
- Escalation to spend month (StatCan BCPI: Toronto residential 106.4, Q1 2026, +1.0% y/y) · `indexed` · class C · verified
- Construction Act 10% holdback (cash timing, not cost) · `timing` · class exact · source

**Soft costs**

- Architect (OAA fee guideline) · `percentOf` · class B · source
- Structural, mechanical, electrical, civil engineers · `percentOf` · class B · quote
- Landscape, envelope, acoustic, code, elevator, interior design consultants · `lumpSum` · class B · quote
- Cost consultant / quantity surveyor · `perMonth` · class B · quote
- Project / development manager · `percentOf` · class B · quote
- Legal: corporate, construction contracts, leasing · `lumpSum` · class B · quote
- Accounting, audit and tax advice · `lumpSum` · class B · quote
- Property tax during construction · `rate` · class A · source
- Amenity furniture, fixtures and equipment · `lumpSum` · class B · quote — *if design.ffeAmenity*
- Developer overhead / fee · `percentOf` · class exact · source
- Soft costs as % of hard (allowance until consultants are itemized) · `percentOf` · class C · source
- Soft-cost contingency · `percentOf` · class C · source
- Commissioning and energy verification · `lumpSum` · class B · quote

**Financing**

- Construction loan interest (dated benchmark + spread) · `ledger` · class A · source
- Commitment, standby and extension fees; lender legal; appraisal; cost monitoring · `percentOf` · class A · quote
- Mezzanine / preferred equity (rate, fees, waterfall) · `rate` · class A · quote — *if finance.mezzanine*
- Letters of credit fees (securities, DCs, deposits) · `rate` · class A · quote — *if finance.lettersOfCredit*
- CMHC MLI Select application fee and premium (by points: affordability, accessibility, energy) · `percentOf` · class B · source — *if finance.cmhcMliSelect*
- CMHC Apartment Construction Loan Program terms · `ledger` · class B · source — *if finance.cmhcAclp*
- Interest-rate hedge · `lumpSum` · class B · quote

**Sales and commodity taxes, rebates**

- Self-supply HST on first occupancy of rental (fair market value) (0.13 of FMV) · `percentOf` · class B · source
- Federal GST rental rebate / NRRP / Ontario ENRRP (construction start 2026-04-01 to 2027-03-31) · `percentOf` · class B · source — *if policy.rentalHstRebate*
- Toronto Vacant Home Tax (unsold or unoccupied units) · `percentOf` · class exact · source — *if site.municipality=toronto*

**Rental lease-up and operations**

- Leasing staff, marketing, model suite · `lumpSum` · class B · quote
- Lease-up concessions (free rent) · `revenue` · class B · source
- Property management fee · `percentOf` · class B · quote
- Payroll, repairs and maintenance, admin · `perUnit` · class B · quote
- Utilities (bulk vs submetered) · `perUnit` · class B · quote
- Property insurance · `perUnit` · class B · quote
- Property tax (Toronto 2026: new multi-residential 0.767311%, multi-residential 1.208792%) · `rate` · class exact · verified
- RentSafeTO registration (3+ storeys and 10+ units) · `perUnit` · class exact · source — *if site.municipality=toronto*
- Concierge and security · `perMonth` · class B · quote — *if program.concierge*
- Capital reserves · `perUnit` · class B · source
- Parking, storage, laundry and telecom income (revenue) · `revenue` · class B · source

**Commercial leasing and operations**

- Tenant improvement allowance / landlord's work · `perArea` · class B · quote — *if program.retailNla>=1*
- Leasing commissions · `perArea` · class B · quote — *if program.retailNla>=1*
- Free rent and downtime between tenants · `revenue` · class B · source — *if program.retailNla>=1*
- Unrecovered operating costs (net vs gross leases) · `perArea` · class B · source — *if program.retailNla>=1*

**Exit, refinance and disposition**

- Sale commission, legal, marketing at exit · `percentOf` · class A · quote
- Refinance: new lender fees, prepayment penalty · `percentOf` · class A · quote — *if finance.refinance*
- HST on sale of commercial property / new residential (0.13 of price) · `percentOf` · class exact · source

**Master plan: land development and community infrastructure**

- Transit integration: station connection, bus terminal, TTC/Metrolinx works · `lumpSum` · class D · source — *if mp.transitIntegration*


## High-rise condominium

*Components:* condo, commercial? · *Example:* Downtown condo tower with presales

**Screening and market evidence**

- Market study, appraisal, broker opinion of value · `lumpSum` · class B · quote
- Market data subscriptions (Altus Data Studio, Urbanation, CoStar) · `lumpSum` · class A · source
- Construction cost benchmark (Altus Canadian Cost Guide 2026, released 2026-04-23) · `perArea` · class C · verified
- Concept massing / test-fit · `lumpSum` · class B · quote

**Land acquisition and holding**

- Land purchase price · `lumpSum` · class exact · source
- Ontario land transfer tax · `schedule` · class exact · source
- Toronto municipal land transfer tax (luxury brackets from 2026-04-01: 4.40%–8.60% above $3M) · `schedule` · class exact · verified — *if site.municipality=toronto*
- Non-Resident Speculation Tax (25%) (0.25 of value) · `percentOf` · class exact · verified — *if deal.buyerNonResident*
- HST on land (taxable supply; registrant self-assesses) (0.13 of price) · `percentOf` · class exact · source — *if deal.vacantOrCommercialLand*
- Legal, title insurance, searches · `lumpSum` · class B · quote
- Survey: boundary, topographic, reference plan · `lumpSum` · class B · quote
- Building condition assessment · `lumpSum` · class B · quote — *if site.existingBuilding*
- Zoning review / compliance letter · `schedule` · class exact · source
- Brokerage commission on purchase · `percentOf` · class A · quote
- Land assembly premium and holdout costs · `lumpSum` · class D · quote — *if site.parcelsToAssemble>=2*
- Land loan: interest, fees, lender legal, appraisal · `rate` · class A · quote — *if deal.landLoan*
- Property tax during hold · `rate` · class A · source
- Insurance, security, vacant-building maintenance · `perMonth` · class B · quote
- Interim income from existing tenants (offset) · `perMonth` · class B · source — *if site.existingBuilding*

**Due diligence and studies**

- Phase One ESA (Phase-One-only RSCs no longer filable unless required, since 2025-10-23) · `lumpSum` · class B · verified
- Phase Two ESA: boreholes, sampling, lab · `perUnit` · class B · quote — *if site.contamination=low*
- Phase Two ESA, delineation (high risk) · `perUnit` · class C · quote — *if site.contamination=high*
- Record of Site Condition + MECP filing (O. Reg. 153/04) · `lumpSum` · class B · source — *if site.useChangeToSensitive*
- Risk assessment (alternative to full remediation) · `lumpSum` · class C · quote — *if site.contamination=high*
- Geotechnical investigation (per-borehole pricing; ~0.2–0.4% of construction for low-rise) · `perUnit` · class B · verified
- Hydrogeological study · `lumpSum` · class B · quote — *if site.highWaterTable*
- Designated substance survey (asbestos, lead, mould; O. Reg. 278/05) · `lumpSum` · class B · source — *if site.existingBuilding*
- Arborist report and tree protection plan · `lumpSum` · class B · quote — *if site.protectedTrees>=1*
- Archaeological assessment, Stages 1–4 · `perHectare` · class C · source — *if site.archaeologicalPotential*
- Heritage impact assessment, conservation plan · `lumpSum` · class B · source — *if site.heritage*
- Natural heritage / environmental impact study, species at risk · `lumpSum` · class C · quote — *if site.regulatedArea*
- Transportation impact study, TDM plan, parking study · `lumpSum` · class B · quote
- Noise and vibration study · `lumpSum` · class B · quote
- Rail proximity: safety/vibration study, crash wall or berm design · `lumpSum` · class C · source — *if site.nearRailCorridor*
- Pedestrian wind and sun/shadow studies · `lumpSum` · class B · quote
- Functional servicing and stormwater management report · `lumpSum` · class B · quote
- Energy strategy, energy model, Toronto Green Standard checklist · `lumpSum` · class B · source
- Planning justification report, urban design brief, community consultation · `lumpSum` · class B · quote — *if planning.zba*
- TTC technical review (work within 60 m of TTC infrastructure) · `lumpSum` · class C · verified — *if site.nearTtc60m*
- TTC-required protections, monitoring and design changes · `lumpSum` · class D · quote — *if site.nearTtc60m*
- Metrolinx review / rail corridor agreements · `lumpSum` · class C · source — *if site.nearRailCorridor*
- MTO corridor permits · `lumpSum` · class B · source — *if site.nearHighway*
- Conservation authority permit and review fees (TRCA / CLOCA) · `schedule` · class exact · source — *if site.regulatedArea*
- Floodproofing design and works · `lumpSum` · class D · quote — *if site.floodplain*

**Planning approvals and land-value charges**

- Official plan amendment application fee · `schedule` · class exact · source — *if planning.opa*
- Zoning by-law amendment application fee · `schedule` · class exact · source — *if planning.zba*
- Site plan application fee · `schedule` · class exact · source — *if planning.sitePlan*
- Draft plan of subdivision fee · `schedule` · class exact · source — *if planning.subdivision*
- Draft plan of condominium fee · `schedule` · class exact · source — *if planning.condoPlan*
- Committee of Adjustment fee · `schedule` · class exact · source — *if planning.minorVariance*
- Ontario Land Tribunal appeal: legal and experts · `lumpSum` · class D · quote — *if planning.appealRisk*
- Planner, architect and legal time through approvals · `lumpSum` · class C · quote
- Parkland cash-in-lieu (Planning Act s.42; caps 10% of land value <1 ha, 15% for 1–5 ha) · `percentOf` · class exact · source
- Community Benefits Charge (up to 4% of land value) (0.04 of land value (cap)) · `percentOf` · class exact · source — *if planning.cbcApplies*
- Inclusionary zoning: revenue forgone on affordable set-aside · `revenue` · class B · source — *if planning.inclusionaryZoning*
- Affordable units: rent or price below market · `revenue` · class B · source — *if planning.affordableShare>=0.01*
- Rental replacement units (Toronto Ch. 667: ≥20 years as rental, right of return at similar rent) · `revenue` · class B · source — *if site.existingRentalUnits>=6 and site.municipality=toronto*
- Tenant Assistance Plan: rent-gap and moving compensation · `perUnit` · class C · source — *if site.existingRentalUnits>=6 and site.municipality=toronto*
- Public art (Toronto Percent for Public Art guideline ~1% of gross construction cost, negotiated) (0.01 of gross construction cost) · `percentOf` · class B · source — *if planning.publicArt*
- POPS design, construction and easement · `perArea` · class C · quote — *if planning.pops*
- Site plan / landscaping securities (letter of credit) · `percentOf` · class B · source — *if planning.sitePlan*

**Development charges and levies**

- Toronto DC (June 2025: $52,676 studio/1-bed, $80,690 2+ bed non-rental; rental $33,497 / $48,299 / $45,280) · `perUnit` · class exact · source — *if site.municipality=toronto*
- Toronto DC Reduction Program credit (−40% studio/1-bed, −60% 2+ bed; draft at review) · `perUnit` · class exact · source — *if site.municipality=toronto and policy.torontoDcReduction*
- Oshawa DC (schedule effective 2026-07-01) · `perUnit` · class exact · source — *if site.municipality=oshawa*
- Durham Region DC · `perUnit` · class exact · source — *if site.municipality=oshawa*
- Education development charge · `perUnit` · class exact · source
- Non-residential DCs on retail/office/industrial GFA · `perArea` · class exact · source — *if program.retailNla>=1*
- Affordable/attainable unit DC exemption (Ontario bulletin effective 2026-07-01) · `perUnit` · class exact · source — *if planning.affordableShare>=0.01*
- DC deferral: payment moved to occupancy/instalments, interest capped by statute (timing, not waiver) · `rate` · class exact · source — *if policy.dcDeferral*
- DC credits for works built by the developer (e.g. transit: 334–350 Bloor St W) · `lumpSum` · class C · verified — *if mp.transitIntegration*
- Long-term care DC exemption (Bill 17) · `perUnit` · class exact · source — *if program.studentOrSeniors*

**Permits, rights-of-way and utilities**

- Building permit fee (Toronto Municipal Code Ch. 363) · `perArea` · class exact · source
- Demolition permit · `schedule` · class exact · source — *if site.existingBuilding*
- Right-of-way: street occupation, hoarding, crane swing, lane closures · `perMonth` · class B · source — *if site.tightUrbanSite*
- Crane-swing and tie-back encroachment agreements with neighbours · `lumpSum` · class D · quote — *if site.tightUrbanSite*
- Water and sewer service connections · `lumpSum` · class B · source
- Off-site servicing capacity upgrades (watermain, sewer) · `perLinear` · class D · quote
- Electrical connection and capacity expansion (Toronto Hydro / Elexicon) · `lumpSum` · class C · quote
- Electrical vault / transformer room · `lumpSum` · class C · quote — *if design.hydroVault*
- Gas, telecom and fibre connections · `lumpSum` · class C · quote
- District energy connection charge · `lumpSum` · class C · quote — *if design.energySystem=district-energy*
- Vehicle entries/exits: curb cuts, ramps, lay-bys, fire route · `perUnit` · class C · quote — *if design.vehicleAccessPoints>=1*
- Boulevard and streetscape restoration (paving, street trees in soil cells, lighting) · `perLinear` · class C · source — *if design.streetscapeM>=1*
- Sign permits (sign by-law) · `schedule` · class exact · source — *if design.signage*
- Occupancy permit (required for non-rental residential with deferred DCs from 2025-11-03) · `schedule` · class exact · source — *if policy.dcDeferral*

**Demolition, remediation and site preparation**

- Tenant buyouts / RTA compensation (N13) · `perUnit` · class C · source — *if site.existingRentalUnits>=1*
- Commercial lease terminations / relocation · `lumpSum` · class D · quote — *if site.existingCommercialTenants*
- Hazardous materials abatement · `perArea` · class C · quote — *if site.existingBuilding*
- Demolition and disposal · `perArea` · class C · quote — *if site.existingBuilding*
- Utility disconnections and decommissioning · `lumpSum` · class B · source — *if site.existingBuilding*
- Utility / easement relocation · `lumpSum` · class D · quote — *if site.utilityRelocation*
- Soil and groundwater remediation (dig-and-dump or in-situ) · `perVolume` · class D · quote — *if site.contamination=high*
- Excess soil: characterization, Qualified Person, registry, hauling and tipping (O. Reg. 406/19) · `perVolume` · class C · source — *if site.excessSoilM3>=1*
- Bulk excavation · `perVolume` · class C · quote
- Rock excavation premium · `perVolume` · class D · quote — *if site.rockExcavation*
- Shoring (soldier pile/lagging, caisson, secant) and underpinning · `perArea` · class C · quote — *if construction.shoring*
- Construction dewatering, PTTW/EASR, sewer discharge agreement · `perMonth` · class C · source — *if site.highWaterTable*
- Tree removal permits, replacement or cash-in-lieu (Toronto Ch. 813) · `perUnit` · class exact · source — *if site.protectedTrees>=1*
- Hoarding, fencing, site security · `perMonth` · class B · quote

**Hard construction**

- Hard cost, benchmark $/ft² by building type (Altus low/high) · `perArea` · class C · source
- Substructure and foundations · `perArea` · class C · quote
- Underground parking ($/stall; rises with each level below grade) · `perUnit` · class C · source — *if planning.parkingLevelsBelowGrade>=1*
- Superstructure (concrete, mass timber, steel, wood frame) · `perArea` · class C · quote
- Envelope (window wall, curtain wall, precast, masonry) · `perArea` · class C · quote
- Balconies and guards (thermally broken) · `perUnit` · class C · quote — *if design.balconies*
- Suite interiors and finishes · `perUnit` · class C · quote
- Passenger elevators (North America ~$150k+ each for mid-rise; quote per stop) · `perUnit` · class C · quote — *if design.elevators>=1*
- Service / freight elevator · `perUnit` · class C · quote — *if design.serviceElevator*
- Mechanical: HVAC, plumbing, fire protection · `perArea` · class C · quote
- Geoexchange boreholes and heat pumps · `lumpSum` · class D · quote — *if design.energySystem=geoexchange*
- Electrical, lighting, life safety · `perArea` · class C · quote
- Emergency / standby generator · `lumpSum` · class C · quote — *if design.standbyGenerator*
- Emergency responder radio system · `lumpSum` · class C · quote — *if design.emergencyRadio*
- EV-ready conduit and chargers · `perUnit` · class C · source — *if planning.evReadyShare>=0.01*
- Bicycle parking, repair station · `perUnit` · class B · quote — *if planning.bikeParking>=1*
- Green roof (Toronto ≥2,000 m² GFA: 20–60% of available roof; CIL $200/m² for reductions) · `perArea` · class C · verified — *if design.greenRoofM2>=1*
- Solar PV · `lumpSum` · class C · quote — *if design.solarPv*
- Toronto Green Standard higher-tier upgrades · `perArea` · class C · source — *if planning.greenStandardTier>=2*
- Stormwater retention tank, oil-grit separator, LID · `lumpSum` · class C · quote — *if design.stormwaterTank*
- Waste chutes, compactor, City collection room · `lumpSum` · class B · source — *if program.wasteChuteCompactor*
- Loading spaces and dock · `perUnit` · class C · quote — *if planning.loadingSpaces>=1*
- Indoor amenity space build-out · `perArea` · class C · quote — *if planning.amenityIndoorM2PerUnit>=0.1*
- Outdoor amenity space · `perArea` · class C · quote — *if planning.amenityOutdoorM2PerUnit>=0.1*
- Pool (structure, mechanical, finishes) · `lumpSum` · class C · quote — *if program.pool*
- Fitness centre fit-out and equipment · `lumpSum` · class B · quote — *if program.fitness*
- Rooftop terrace / amenity · `perArea` · class C · quote — *if program.rooftopAmenity*
- Co-working, party room, guest suite · `lumpSum` · class B · quote — *if program.coworkingPartyRoom*
- Pet spa / dog run · `lumpSum` · class B · quote — *if program.petSpaDogRun*
- Storage lockers · `perUnit` · class B · quote — *if program.lockers>=1*
- Childcare centre fit-out (outdoor play area, licensing requirements) · `perArea` · class C · quote — *if program.childcare*
- Institutional / community space (shell or turnkey per agreement) · `perArea` · class C · quote — *if program.institutional*
- Retail/office base building shell · `perArea` · class C · quote — *if program.retailNla>=1*
- Soft and hard landscaping · `perArea` · class C · quote — *if design.landscapingM2>=1*
- Building identification, wayfinding and retail signage · `lumpSum` · class B · quote — *if design.signage*
- Entrances, canopies and lobby finishes · `lumpSum` · class C · quote
- Heated ramp / snow-melt · `lumpSum` · class C · quote — *if design.snowMelt*
- General conditions / requirements · `perMonth` · class C · quote
- Tower crane rental, operators, foundations · `perMonth` · class B · quote — *if construction.craneMonths>=1*
- Winter heat and protection · `perMonth` · class C · quote — *if construction.winterMonths>=1*
- Construction manager / GC fee · `percentOf` · class B · quote
- Builder's risk and wrap-up liability insurance · `percentOf` · class B · quote
- Performance and labour & material bonds · `percentOf` · class B · quote
- Design contingency (shrinks with estimate class) · `percentOf` · class C · source
- Construction contingency · `percentOf` · class C · source
- Escalation to spend month (StatCan BCPI: Toronto residential 106.4, Q1 2026, +1.0% y/y) · `indexed` · class C · verified
- Construction Act 10% holdback (cash timing, not cost) · `timing` · class exact · source

**Soft costs**

- Architect (OAA fee guideline) · `percentOf` · class B · source
- Structural, mechanical, electrical, civil engineers · `percentOf` · class B · quote
- Landscape, envelope, acoustic, code, elevator, interior design consultants · `lumpSum` · class B · quote
- Cost consultant / quantity surveyor · `perMonth` · class B · quote
- Project / development manager · `percentOf` · class B · quote
- Legal: corporate, construction contracts, leasing · `lumpSum` · class B · quote
- Accounting, audit and tax advice · `lumpSum` · class B · quote
- Property tax during construction · `rate` · class A · source
- Amenity furniture, fixtures and equipment · `lumpSum` · class B · quote — *if design.ffeAmenity*
- Developer overhead / fee · `percentOf` · class exact · source
- Soft costs as % of hard (allowance until consultants are itemized) · `percentOf` · class C · source
- Soft-cost contingency · `percentOf` · class C · source
- Commissioning and energy verification · `lumpSum` · class B · quote

**Financing**

- Construction loan interest (dated benchmark + spread) · `ledger` · class A · source
- Commitment, standby and extension fees; lender legal; appraisal; cost monitoring · `percentOf` · class A · quote
- Mezzanine / preferred equity (rate, fees, waterfall) · `rate` · class A · quote — *if finance.mezzanine*
- Letters of credit fees (securities, DCs, deposits) · `rate` · class A · quote — *if finance.lettersOfCredit*
- Excess deposit insurance / deposit financing · `percentOf` · class B · quote — *if finance.depositInsurance*
- Interest-rate hedge · `lumpSum` · class B · quote

**Sales and commodity taxes, rebates**

- HST on construction inputs; input tax credits (taxable supplies) (0.13 of taxable inputs) · `percentOf` · class exact · source
- New housing rebates assigned to builder (federal ~$6.3k max; Ontario max $24k) · `perUnit` · class exact · source — *if policy.newHomeRebates*
- First-Time Home Buyers' GST rebate (up to 100% of GST, max $50k; agreements 2025-03-20 to before 2031) · `perUnit` · class exact · source
- Ontario full HST rebate on new homes ≤$1M (max $130k), agreements 2026-04-01 to 2027-03-31 · `perUnit` · class exact · proposed
- Toronto Vacant Home Tax (unsold or unoccupied units) · `percentOf` · class exact · source — *if site.municipality=toronto*

**Condo / for-sale marketing, closing and turnover**

- Sales centre, model suites, renderings, marketing · `lumpSum` · class B · quote
- Commissions (in-house and co-op brokers) · `percentOf` · class A · quote
- Tarion enrolment fee (2024 schedule: $585 ≤$300k to $6,000 ≥$4M, + HST) · `schedule` · class exact · source
- HCRA regulatory oversight fee ($145 + HST per home) (145 CAD/home + HST) · `perUnit` · class exact · source
- HCRA builder/vendor licence · `schedule` · class exact · source
- Condo registration: declaration, description, reference plan, Land Titles · `lumpSum` · class B · source — *if planning.condoPlan*
- Interim occupancy fees from buyers (offset) · `perUnit` · class B · source
- Closing adjustments recoverable from buyers (levy increases over cap, Tarion fee, meters) · `perUnit` · class B · source
- Reserve fund study, performance audit, turnover meeting · `lumpSum` · class B · source
- Unsold inventory: common expenses, property tax, carry · `perUnit` · class B · source
- Warranty service and deficiency reserve · `percentOf` · class B · source
- Parking and locker sales (revenue) · `revenue` · class B · source — *if planning.carParkingStalls>=1*

**Rental lease-up and operations**

- Utilities (bulk vs submetered) · `perUnit` · class B · quote
- Property insurance · `perUnit` · class B · quote
- Property tax (Toronto 2026: new multi-residential 0.767311%, multi-residential 1.208792%) · `rate` · class exact · verified
- Concierge and security · `perMonth` · class B · quote — *if program.concierge*
- Parking, storage, laundry and telecom income (revenue) · `revenue` · class B · source

**Commercial leasing and operations**

- Tenant improvement allowance / landlord's work · `perArea` · class B · quote — *if program.retailNla>=1*
- Leasing commissions · `perArea` · class B · quote — *if program.retailNla>=1*
- Free rent and downtime between tenants · `revenue` · class B · source — *if program.retailNla>=1*
- Unrecovered operating costs (net vs gross leases) · `perArea` · class B · source — *if program.retailNla>=1*

**Exit, refinance and disposition**

- Sale commission, legal, marketing at exit · `percentOf` · class A · quote
- Refinance: new lender fees, prepayment penalty · `percentOf` · class A · quote — *if finance.refinance*
- HST on sale of commercial property / new residential (0.13 of price) · `percentOf` · class exact · source

**Master plan: land development and community infrastructure**

- Transit integration: station connection, bus terminal, TTC/Metrolinx works · `lumpSum` · class D · source — *if mp.transitIntegration*


## Mixed-use tower(s) on a retail/office podium

*Components:* condo, rental, commercial · *Example:* Galleria-style site: condo + rental towers over retail, parking moved underground

**Screening and market evidence**

- Market study, appraisal, broker opinion of value · `lumpSum` · class B · quote
- Market data subscriptions (Altus Data Studio, Urbanation, CoStar) · `lumpSum` · class A · source
- Construction cost benchmark (Altus Canadian Cost Guide 2026, released 2026-04-23) · `perArea` · class C · verified
- Concept massing / test-fit · `lumpSum` · class B · quote

**Land acquisition and holding**

- Land purchase price · `lumpSum` · class exact · source
- Ontario land transfer tax · `schedule` · class exact · source
- Toronto municipal land transfer tax (luxury brackets from 2026-04-01: 4.40%–8.60% above $3M) · `schedule` · class exact · verified — *if site.municipality=toronto*
- Non-Resident Speculation Tax (25%) (0.25 of value) · `percentOf` · class exact · verified — *if deal.buyerNonResident*
- HST on land (taxable supply; registrant self-assesses) (0.13 of price) · `percentOf` · class exact · source — *if deal.vacantOrCommercialLand*
- Legal, title insurance, searches · `lumpSum` · class B · quote
- Survey: boundary, topographic, reference plan · `lumpSum` · class B · quote
- Building condition assessment · `lumpSum` · class B · quote — *if site.existingBuilding*
- Zoning review / compliance letter · `schedule` · class exact · source
- Brokerage commission on purchase · `percentOf` · class A · quote
- Land assembly premium and holdout costs · `lumpSum` · class D · quote — *if site.parcelsToAssemble>=2*
- Land loan: interest, fees, lender legal, appraisal · `rate` · class A · quote — *if deal.landLoan*
- Property tax during hold · `rate` · class A · source
- Insurance, security, vacant-building maintenance · `perMonth` · class B · quote
- Interim income from existing tenants (offset) · `perMonth` · class B · source — *if site.existingBuilding*

**Due diligence and studies**

- Phase One ESA (Phase-One-only RSCs no longer filable unless required, since 2025-10-23) · `lumpSum` · class B · verified
- Phase Two ESA: boreholes, sampling, lab · `perUnit` · class B · quote — *if site.contamination=low*
- Phase Two ESA, delineation (high risk) · `perUnit` · class C · quote — *if site.contamination=high*
- Record of Site Condition + MECP filing (O. Reg. 153/04) · `lumpSum` · class B · source — *if site.useChangeToSensitive*
- Risk assessment (alternative to full remediation) · `lumpSum` · class C · quote — *if site.contamination=high*
- Geotechnical investigation (per-borehole pricing; ~0.2–0.4% of construction for low-rise) · `perUnit` · class B · verified
- Hydrogeological study · `lumpSum` · class B · quote — *if site.highWaterTable*
- Designated substance survey (asbestos, lead, mould; O. Reg. 278/05) · `lumpSum` · class B · source — *if site.existingBuilding*
- Arborist report and tree protection plan · `lumpSum` · class B · quote — *if site.protectedTrees>=1*
- Archaeological assessment, Stages 1–4 · `perHectare` · class C · source — *if site.archaeologicalPotential*
- Heritage impact assessment, conservation plan · `lumpSum` · class B · source — *if site.heritage*
- Natural heritage / environmental impact study, species at risk · `lumpSum` · class C · quote — *if site.regulatedArea*
- Transportation impact study, TDM plan, parking study · `lumpSum` · class B · quote
- Noise and vibration study · `lumpSum` · class B · quote
- Rail proximity: safety/vibration study, crash wall or berm design · `lumpSum` · class C · source — *if site.nearRailCorridor*
- Pedestrian wind and sun/shadow studies · `lumpSum` · class B · quote
- Functional servicing and stormwater management report · `lumpSum` · class B · quote
- Energy strategy, energy model, Toronto Green Standard checklist · `lumpSum` · class B · source
- Planning justification report, urban design brief, community consultation · `lumpSum` · class B · quote — *if planning.zba*
- TTC technical review (work within 60 m of TTC infrastructure) · `lumpSum` · class C · verified — *if site.nearTtc60m*
- TTC-required protections, monitoring and design changes · `lumpSum` · class D · quote — *if site.nearTtc60m*
- Metrolinx review / rail corridor agreements · `lumpSum` · class C · source — *if site.nearRailCorridor*
- MTO corridor permits · `lumpSum` · class B · source — *if site.nearHighway*
- Conservation authority permit and review fees (TRCA / CLOCA) · `schedule` · class exact · source — *if site.regulatedArea*
- Floodproofing design and works · `lumpSum` · class D · quote — *if site.floodplain*

**Planning approvals and land-value charges**

- Official plan amendment application fee · `schedule` · class exact · source — *if planning.opa*
- Zoning by-law amendment application fee · `schedule` · class exact · source — *if planning.zba*
- Site plan application fee · `schedule` · class exact · source — *if planning.sitePlan*
- Draft plan of subdivision fee · `schedule` · class exact · source — *if planning.subdivision*
- Draft plan of condominium fee · `schedule` · class exact · source — *if planning.condoPlan*
- Committee of Adjustment fee · `schedule` · class exact · source — *if planning.minorVariance*
- Ontario Land Tribunal appeal: legal and experts · `lumpSum` · class D · quote — *if planning.appealRisk*
- Planner, architect and legal time through approvals · `lumpSum` · class C · quote
- Parkland cash-in-lieu (Planning Act s.42; caps 10% of land value <1 ha, 15% for 1–5 ha) · `percentOf` · class exact · source
- Community Benefits Charge (up to 4% of land value) (0.04 of land value (cap)) · `percentOf` · class exact · source — *if planning.cbcApplies*
- Inclusionary zoning: revenue forgone on affordable set-aside · `revenue` · class B · source — *if planning.inclusionaryZoning*
- Affordable units: rent or price below market · `revenue` · class B · source — *if planning.affordableShare>=0.01*
- Rental replacement units (Toronto Ch. 667: ≥20 years as rental, right of return at similar rent) · `revenue` · class B · source — *if site.existingRentalUnits>=6 and site.municipality=toronto*
- Tenant Assistance Plan: rent-gap and moving compensation · `perUnit` · class C · source — *if site.existingRentalUnits>=6 and site.municipality=toronto*
- Public art (Toronto Percent for Public Art guideline ~1% of gross construction cost, negotiated) (0.01 of gross construction cost) · `percentOf` · class B · source — *if planning.publicArt*
- POPS design, construction and easement · `perArea` · class C · quote — *if planning.pops*
- Site plan / landscaping securities (letter of credit) · `percentOf` · class B · source — *if planning.sitePlan*

**Development charges and levies**

- Toronto DC (June 2025: $52,676 studio/1-bed, $80,690 2+ bed non-rental; rental $33,497 / $48,299 / $45,280) · `perUnit` · class exact · source — *if site.municipality=toronto*
- Toronto DC Reduction Program credit (−40% studio/1-bed, −60% 2+ bed; draft at review) · `perUnit` · class exact · source — *if site.municipality=toronto and policy.torontoDcReduction*
- Oshawa DC (schedule effective 2026-07-01) · `perUnit` · class exact · source — *if site.municipality=oshawa*
- Durham Region DC · `perUnit` · class exact · source — *if site.municipality=oshawa*
- Education development charge · `perUnit` · class exact · source
- Non-residential DCs on retail/office/industrial GFA · `perArea` · class exact · source — *if program.retailNla>=1*
- Statutory purpose-built rental DC discount by bedroom count (DCA s.26.2) · `perUnit` · class exact · source
- Affordable/attainable unit DC exemption (Ontario bulletin effective 2026-07-01) · `perUnit` · class exact · source — *if planning.affordableShare>=0.01*
- DC deferral: payment moved to occupancy/instalments, interest capped by statute (timing, not waiver) · `rate` · class exact · source — *if policy.dcDeferral*
- DC credits for works built by the developer (e.g. transit: 334–350 Bloor St W) · `lumpSum` · class C · verified — *if mp.transitIntegration*
- Long-term care DC exemption (Bill 17) · `perUnit` · class exact · source — *if program.studentOrSeniors*

**Permits, rights-of-way and utilities**

- Building permit fee (Toronto Municipal Code Ch. 363) · `perArea` · class exact · source
- Demolition permit · `schedule` · class exact · source — *if site.existingBuilding*
- Right-of-way: street occupation, hoarding, crane swing, lane closures · `perMonth` · class B · source — *if site.tightUrbanSite*
- Crane-swing and tie-back encroachment agreements with neighbours · `lumpSum` · class D · quote — *if site.tightUrbanSite*
- Water and sewer service connections · `lumpSum` · class B · source
- Off-site servicing capacity upgrades (watermain, sewer) · `perLinear` · class D · quote
- Electrical connection and capacity expansion (Toronto Hydro / Elexicon) · `lumpSum` · class C · quote
- Electrical vault / transformer room · `lumpSum` · class C · quote — *if design.hydroVault*
- Gas, telecom and fibre connections · `lumpSum` · class C · quote
- District energy connection charge · `lumpSum` · class C · quote — *if design.energySystem=district-energy*
- Vehicle entries/exits: curb cuts, ramps, lay-bys, fire route · `perUnit` · class C · quote — *if design.vehicleAccessPoints>=1*
- Boulevard and streetscape restoration (paving, street trees in soil cells, lighting) · `perLinear` · class C · source — *if design.streetscapeM>=1*
- Sign permits (sign by-law) · `schedule` · class exact · source — *if design.signage*
- Occupancy permit (required for non-rental residential with deferred DCs from 2025-11-03) · `schedule` · class exact · source — *if policy.dcDeferral*

**Demolition, remediation and site preparation**

- Tenant buyouts / RTA compensation (N13) · `perUnit` · class C · source — *if site.existingRentalUnits>=1*
- Commercial lease terminations / relocation · `lumpSum` · class D · quote — *if site.existingCommercialTenants*
- Hazardous materials abatement · `perArea` · class C · quote — *if site.existingBuilding*
- Demolition and disposal · `perArea` · class C · quote — *if site.existingBuilding*
- Utility disconnections and decommissioning · `lumpSum` · class B · source — *if site.existingBuilding*
- Utility / easement relocation · `lumpSum` · class D · quote — *if site.utilityRelocation*
- Soil and groundwater remediation (dig-and-dump or in-situ) · `perVolume` · class D · quote — *if site.contamination=high*
- Excess soil: characterization, Qualified Person, registry, hauling and tipping (O. Reg. 406/19) · `perVolume` · class C · source — *if site.excessSoilM3>=1*
- Bulk excavation · `perVolume` · class C · quote
- Rock excavation premium · `perVolume` · class D · quote — *if site.rockExcavation*
- Shoring (soldier pile/lagging, caisson, secant) and underpinning · `perArea` · class C · quote — *if construction.shoring*
- Construction dewatering, PTTW/EASR, sewer discharge agreement · `perMonth` · class C · source — *if site.highWaterTable*
- Tree removal permits, replacement or cash-in-lieu (Toronto Ch. 813) · `perUnit` · class exact · source — *if site.protectedTrees>=1*
- Hoarding, fencing, site security · `perMonth` · class B · quote

**Hard construction**

- Hard cost, benchmark $/ft² by building type (Altus low/high) · `perArea` · class C · source
- Substructure and foundations · `perArea` · class C · quote
- Underground parking ($/stall; rises with each level below grade) · `perUnit` · class C · source — *if planning.parkingLevelsBelowGrade>=1*
- Superstructure (concrete, mass timber, steel, wood frame) · `perArea` · class C · quote
- Envelope (window wall, curtain wall, precast, masonry) · `perArea` · class C · quote
- Balconies and guards (thermally broken) · `perUnit` · class C · quote — *if design.balconies*
- Suite interiors and finishes · `perUnit` · class C · quote
- Passenger elevators (North America ~$150k+ each for mid-rise; quote per stop) · `perUnit` · class C · quote — *if design.elevators>=1*
- Service / freight elevator · `perUnit` · class C · quote — *if design.serviceElevator*
- Mechanical: HVAC, plumbing, fire protection · `perArea` · class C · quote
- Geoexchange boreholes and heat pumps · `lumpSum` · class D · quote — *if design.energySystem=geoexchange*
- Electrical, lighting, life safety · `perArea` · class C · quote
- Emergency / standby generator · `lumpSum` · class C · quote — *if design.standbyGenerator*
- Emergency responder radio system · `lumpSum` · class C · quote — *if design.emergencyRadio*
- EV-ready conduit and chargers · `perUnit` · class C · source — *if planning.evReadyShare>=0.01*
- Bicycle parking, repair station · `perUnit` · class B · quote — *if planning.bikeParking>=1*
- Green roof (Toronto ≥2,000 m² GFA: 20–60% of available roof; CIL $200/m² for reductions) · `perArea` · class C · verified — *if design.greenRoofM2>=1*
- Solar PV · `lumpSum` · class C · quote — *if design.solarPv*
- Toronto Green Standard higher-tier upgrades · `perArea` · class C · source — *if planning.greenStandardTier>=2*
- Stormwater retention tank, oil-grit separator, LID · `lumpSum` · class C · quote — *if design.stormwaterTank*
- Waste chutes, compactor, City collection room · `lumpSum` · class B · source — *if program.wasteChuteCompactor*
- Loading spaces and dock · `perUnit` · class C · quote — *if planning.loadingSpaces>=1*
- Indoor amenity space build-out · `perArea` · class C · quote — *if planning.amenityIndoorM2PerUnit>=0.1*
- Outdoor amenity space · `perArea` · class C · quote — *if planning.amenityOutdoorM2PerUnit>=0.1*
- Pool (structure, mechanical, finishes) · `lumpSum` · class C · quote — *if program.pool*
- Fitness centre fit-out and equipment · `lumpSum` · class B · quote — *if program.fitness*
- Rooftop terrace / amenity · `perArea` · class C · quote — *if program.rooftopAmenity*
- Co-working, party room, guest suite · `lumpSum` · class B · quote — *if program.coworkingPartyRoom*
- Pet spa / dog run · `lumpSum` · class B · quote — *if program.petSpaDogRun*
- Storage lockers · `perUnit` · class B · quote — *if program.lockers>=1*
- Childcare centre fit-out (outdoor play area, licensing requirements) · `perArea` · class C · quote — *if program.childcare*
- Institutional / community space (shell or turnkey per agreement) · `perArea` · class C · quote — *if program.institutional*
- Retail/office base building shell · `perArea` · class C · quote — *if program.retailNla>=1*
- Soft and hard landscaping · `perArea` · class C · quote — *if design.landscapingM2>=1*
- Building identification, wayfinding and retail signage · `lumpSum` · class B · quote — *if design.signage*
- Entrances, canopies and lobby finishes · `lumpSum` · class C · quote
- Heated ramp / snow-melt · `lumpSum` · class C · quote — *if design.snowMelt*
- General conditions / requirements · `perMonth` · class C · quote
- Tower crane rental, operators, foundations · `perMonth` · class B · quote — *if construction.craneMonths>=1*
- Winter heat and protection · `perMonth` · class C · quote — *if construction.winterMonths>=1*
- Construction manager / GC fee · `percentOf` · class B · quote
- Builder's risk and wrap-up liability insurance · `percentOf` · class B · quote
- Performance and labour & material bonds · `percentOf` · class B · quote
- Design contingency (shrinks with estimate class) · `percentOf` · class C · source
- Construction contingency · `percentOf` · class C · source
- Escalation to spend month (StatCan BCPI: Toronto residential 106.4, Q1 2026, +1.0% y/y) · `indexed` · class C · verified
- Construction Act 10% holdback (cash timing, not cost) · `timing` · class exact · source

**Soft costs**

- Architect (OAA fee guideline) · `percentOf` · class B · source
- Structural, mechanical, electrical, civil engineers · `percentOf` · class B · quote
- Landscape, envelope, acoustic, code, elevator, interior design consultants · `lumpSum` · class B · quote
- Cost consultant / quantity surveyor · `perMonth` · class B · quote
- Project / development manager · `percentOf` · class B · quote
- Legal: corporate, construction contracts, leasing · `lumpSum` · class B · quote
- Accounting, audit and tax advice · `lumpSum` · class B · quote
- Property tax during construction · `rate` · class A · source
- Amenity furniture, fixtures and equipment · `lumpSum` · class B · quote — *if design.ffeAmenity*
- Developer overhead / fee · `percentOf` · class exact · source
- Soft costs as % of hard (allowance until consultants are itemized) · `percentOf` · class C · source
- Soft-cost contingency · `percentOf` · class C · source
- Commissioning and energy verification · `lumpSum` · class B · quote

**Financing**

- Construction loan interest (dated benchmark + spread) · `ledger` · class A · source
- Commitment, standby and extension fees; lender legal; appraisal; cost monitoring · `percentOf` · class A · quote
- Mezzanine / preferred equity (rate, fees, waterfall) · `rate` · class A · quote — *if finance.mezzanine*
- Letters of credit fees (securities, DCs, deposits) · `rate` · class A · quote — *if finance.lettersOfCredit*
- CMHC MLI Select application fee and premium (by points: affordability, accessibility, energy) · `percentOf` · class B · source — *if finance.cmhcMliSelect*
- CMHC Apartment Construction Loan Program terms · `ledger` · class B · source — *if finance.cmhcAclp*
- Excess deposit insurance / deposit financing · `percentOf` · class B · quote — *if finance.depositInsurance*
- Interest-rate hedge · `lumpSum` · class B · quote

**Sales and commodity taxes, rebates**

- HST on construction inputs; input tax credits (taxable supplies) (0.13 of taxable inputs) · `percentOf` · class exact · source
- Self-supply HST on first occupancy of rental (fair market value) (0.13 of FMV) · `percentOf` · class B · source
- Federal GST rental rebate / NRRP / Ontario ENRRP (construction start 2026-04-01 to 2027-03-31) · `percentOf` · class B · source — *if policy.rentalHstRebate*
- New housing rebates assigned to builder (federal ~$6.3k max; Ontario max $24k) · `perUnit` · class exact · source — *if policy.newHomeRebates*
- First-Time Home Buyers' GST rebate (up to 100% of GST, max $50k; agreements 2025-03-20 to before 2031) · `perUnit` · class exact · source
- Ontario full HST rebate on new homes ≤$1M (max $130k), agreements 2026-04-01 to 2027-03-31 · `perUnit` · class exact · proposed
- Toronto Vacant Home Tax (unsold or unoccupied units) · `percentOf` · class exact · source — *if site.municipality=toronto*

**Condo / for-sale marketing, closing and turnover**

- Sales centre, model suites, renderings, marketing · `lumpSum` · class B · quote
- Commissions (in-house and co-op brokers) · `percentOf` · class A · quote
- Tarion enrolment fee (2024 schedule: $585 ≤$300k to $6,000 ≥$4M, + HST) · `schedule` · class exact · source
- HCRA regulatory oversight fee ($145 + HST per home) (145 CAD/home + HST) · `perUnit` · class exact · source
- HCRA builder/vendor licence · `schedule` · class exact · source
- Condo registration: declaration, description, reference plan, Land Titles · `lumpSum` · class B · source — *if planning.condoPlan*
- Interim occupancy fees from buyers (offset) · `perUnit` · class B · source
- Closing adjustments recoverable from buyers (levy increases over cap, Tarion fee, meters) · `perUnit` · class B · source
- Reserve fund study, performance audit, turnover meeting · `lumpSum` · class B · source
- Unsold inventory: common expenses, property tax, carry · `perUnit` · class B · source
- Warranty service and deficiency reserve · `percentOf` · class B · source
- Parking and locker sales (revenue) · `revenue` · class B · source — *if planning.carParkingStalls>=1*

**Rental lease-up and operations**

- Leasing staff, marketing, model suite · `lumpSum` · class B · quote
- Lease-up concessions (free rent) · `revenue` · class B · source
- Property management fee · `percentOf` · class B · quote
- Payroll, repairs and maintenance, admin · `perUnit` · class B · quote
- Utilities (bulk vs submetered) · `perUnit` · class B · quote
- Property insurance · `perUnit` · class B · quote
- Property tax (Toronto 2026: new multi-residential 0.767311%, multi-residential 1.208792%) · `rate` · class exact · verified
- RentSafeTO registration (3+ storeys and 10+ units) · `perUnit` · class exact · source — *if site.municipality=toronto*
- Concierge and security · `perMonth` · class B · quote — *if program.concierge*
- Capital reserves · `perUnit` · class B · source
- Parking, storage, laundry and telecom income (revenue) · `revenue` · class B · source

**Commercial leasing and operations**

- Tenant improvement allowance / landlord's work · `perArea` · class B · quote — *if program.retailNla>=1*
- Leasing commissions · `perArea` · class B · quote — *if program.retailNla>=1*
- Free rent and downtime between tenants · `revenue` · class B · source — *if program.retailNla>=1*
- Unrecovered operating costs (net vs gross leases) · `perArea` · class B · source — *if program.retailNla>=1*

**Exit, refinance and disposition**

- Sale commission, legal, marketing at exit · `percentOf` · class A · quote
- Refinance: new lender fees, prepayment penalty · `percentOf` · class A · quote — *if finance.refinance*
- HST on sale of commercial property / new residential (0.13 of price) · `percentOf` · class exact · source

**Master plan: land development and community infrastructure**

- Transit integration: station connection, bus terminal, TTC/Metrolinx works · `lumpSum` · class D · source — *if mp.transitIntegration*
- Shared parking structure · `perUnit` · class D · quote — *if mp.sharedParkingStructure*


## Townhouses / stacked towns

*Components:* condo · *Example:* Freehold or condo towns in a suburban plan

**Screening and market evidence**

- Market study, appraisal, broker opinion of value · `lumpSum` · class B · quote
- Market data subscriptions (Altus Data Studio, Urbanation, CoStar) · `lumpSum` · class A · source
- Construction cost benchmark (Altus Canadian Cost Guide 2026, released 2026-04-23) · `perArea` · class C · verified
- Concept massing / test-fit · `lumpSum` · class B · quote

**Land acquisition and holding**

- Land purchase price · `lumpSum` · class exact · source
- Ontario land transfer tax · `schedule` · class exact · source
- Toronto municipal land transfer tax (luxury brackets from 2026-04-01: 4.40%–8.60% above $3M) · `schedule` · class exact · verified — *if site.municipality=toronto*
- Non-Resident Speculation Tax (25%) (0.25 of value) · `percentOf` · class exact · verified — *if deal.buyerNonResident*
- HST on land (taxable supply; registrant self-assesses) (0.13 of price) · `percentOf` · class exact · source — *if deal.vacantOrCommercialLand*
- Legal, title insurance, searches · `lumpSum` · class B · quote
- Survey: boundary, topographic, reference plan · `lumpSum` · class B · quote
- Building condition assessment · `lumpSum` · class B · quote — *if site.existingBuilding*
- Zoning review / compliance letter · `schedule` · class exact · source
- Brokerage commission on purchase · `percentOf` · class A · quote
- Land assembly premium and holdout costs · `lumpSum` · class D · quote — *if site.parcelsToAssemble>=2*
- Land loan: interest, fees, lender legal, appraisal · `rate` · class A · quote — *if deal.landLoan*
- Property tax during hold · `rate` · class A · source
- Insurance, security, vacant-building maintenance · `perMonth` · class B · quote
- Interim income from existing tenants (offset) · `perMonth` · class B · source — *if site.existingBuilding*

**Due diligence and studies**

- Phase One ESA (Phase-One-only RSCs no longer filable unless required, since 2025-10-23) · `lumpSum` · class B · verified
- Phase Two ESA: boreholes, sampling, lab · `perUnit` · class B · quote — *if site.contamination=low*
- Phase Two ESA, delineation (high risk) · `perUnit` · class C · quote — *if site.contamination=high*
- Record of Site Condition + MECP filing (O. Reg. 153/04) · `lumpSum` · class B · source — *if site.useChangeToSensitive*
- Risk assessment (alternative to full remediation) · `lumpSum` · class C · quote — *if site.contamination=high*
- Geotechnical investigation (per-borehole pricing; ~0.2–0.4% of construction for low-rise) · `perUnit` · class B · verified
- Hydrogeological study · `lumpSum` · class B · quote — *if site.highWaterTable*
- Designated substance survey (asbestos, lead, mould; O. Reg. 278/05) · `lumpSum` · class B · source — *if site.existingBuilding*
- Arborist report and tree protection plan · `lumpSum` · class B · quote — *if site.protectedTrees>=1*
- Archaeological assessment, Stages 1–4 · `perHectare` · class C · source — *if site.archaeologicalPotential*
- Heritage impact assessment, conservation plan · `lumpSum` · class B · source — *if site.heritage*
- Natural heritage / environmental impact study, species at risk · `lumpSum` · class C · quote — *if site.regulatedArea*
- Transportation impact study, TDM plan, parking study · `lumpSum` · class B · quote
- Noise and vibration study · `lumpSum` · class B · quote
- Rail proximity: safety/vibration study, crash wall or berm design · `lumpSum` · class C · source — *if site.nearRailCorridor*
- Functional servicing and stormwater management report · `lumpSum` · class B · quote
- Energy strategy, energy model, Toronto Green Standard checklist · `lumpSum` · class B · source
- Planning justification report, urban design brief, community consultation · `lumpSum` · class B · quote — *if planning.zba*
- TTC technical review (work within 60 m of TTC infrastructure) · `lumpSum` · class C · verified — *if site.nearTtc60m*
- TTC-required protections, monitoring and design changes · `lumpSum` · class D · quote — *if site.nearTtc60m*
- Metrolinx review / rail corridor agreements · `lumpSum` · class C · source — *if site.nearRailCorridor*
- MTO corridor permits · `lumpSum` · class B · source — *if site.nearHighway*
- Conservation authority permit and review fees (TRCA / CLOCA) · `schedule` · class exact · source — *if site.regulatedArea*
- Floodproofing design and works · `lumpSum` · class D · quote — *if site.floodplain*

**Planning approvals and land-value charges**

- Official plan amendment application fee · `schedule` · class exact · source — *if planning.opa*
- Zoning by-law amendment application fee · `schedule` · class exact · source — *if planning.zba*
- Site plan application fee · `schedule` · class exact · source — *if planning.sitePlan*
- Draft plan of subdivision fee · `schedule` · class exact · source — *if planning.subdivision*
- Draft plan of condominium fee · `schedule` · class exact · source — *if planning.condoPlan*
- Committee of Adjustment fee · `schedule` · class exact · source — *if planning.minorVariance*
- Ontario Land Tribunal appeal: legal and experts · `lumpSum` · class D · quote — *if planning.appealRisk*
- Planner, architect and legal time through approvals · `lumpSum` · class C · quote
- Parkland cash-in-lieu (Planning Act s.42; caps 10% of land value <1 ha, 15% for 1–5 ha) · `percentOf` · class exact · source
- Community Benefits Charge (up to 4% of land value) (0.04 of land value (cap)) · `percentOf` · class exact · source — *if planning.cbcApplies*
- Inclusionary zoning: revenue forgone on affordable set-aside · `revenue` · class B · source — *if planning.inclusionaryZoning*
- Affordable units: rent or price below market · `revenue` · class B · source — *if planning.affordableShare>=0.01*
- Rental replacement units (Toronto Ch. 667: ≥20 years as rental, right of return at similar rent) · `revenue` · class B · source — *if site.existingRentalUnits>=6 and site.municipality=toronto*
- Tenant Assistance Plan: rent-gap and moving compensation · `perUnit` · class C · source — *if site.existingRentalUnits>=6 and site.municipality=toronto*
- Public art (Toronto Percent for Public Art guideline ~1% of gross construction cost, negotiated) (0.01 of gross construction cost) · `percentOf` · class B · source — *if planning.publicArt*
- POPS design, construction and easement · `perArea` · class C · quote — *if planning.pops*
- Site plan / landscaping securities (letter of credit) · `percentOf` · class B · source — *if planning.sitePlan*

**Development charges and levies**

- Toronto DC (June 2025: $52,676 studio/1-bed, $80,690 2+ bed non-rental; rental $33,497 / $48,299 / $45,280) · `perUnit` · class exact · source — *if site.municipality=toronto*
- Toronto DC Reduction Program credit (−40% studio/1-bed, −60% 2+ bed; draft at review) · `perUnit` · class exact · source — *if site.municipality=toronto and policy.torontoDcReduction*
- Oshawa DC (schedule effective 2026-07-01) · `perUnit` · class exact · source — *if site.municipality=oshawa*
- Durham Region DC · `perUnit` · class exact · source — *if site.municipality=oshawa*
- Education development charge · `perUnit` · class exact · source
- Affordable/attainable unit DC exemption (Ontario bulletin effective 2026-07-01) · `perUnit` · class exact · source — *if planning.affordableShare>=0.01*
- DC deferral: payment moved to occupancy/instalments, interest capped by statute (timing, not waiver) · `rate` · class exact · source — *if policy.dcDeferral*
- DC credits for works built by the developer (e.g. transit: 334–350 Bloor St W) · `lumpSum` · class C · verified — *if mp.transitIntegration*
- Long-term care DC exemption (Bill 17) · `perUnit` · class exact · source — *if program.studentOrSeniors*

**Permits, rights-of-way and utilities**

- Building permit fee (Toronto Municipal Code Ch. 363) · `perArea` · class exact · source
- Demolition permit · `schedule` · class exact · source — *if site.existingBuilding*
- Right-of-way: street occupation, hoarding, crane swing, lane closures · `perMonth` · class B · source — *if site.tightUrbanSite*
- Crane-swing and tie-back encroachment agreements with neighbours · `lumpSum` · class D · quote — *if site.tightUrbanSite*
- Water and sewer service connections · `lumpSum` · class B · source
- Off-site servicing capacity upgrades (watermain, sewer) · `perLinear` · class D · quote
- Electrical connection and capacity expansion (Toronto Hydro / Elexicon) · `lumpSum` · class C · quote
- Electrical vault / transformer room · `lumpSum` · class C · quote — *if design.hydroVault*
- Gas, telecom and fibre connections · `lumpSum` · class C · quote
- District energy connection charge · `lumpSum` · class C · quote — *if design.energySystem=district-energy*
- Vehicle entries/exits: curb cuts, ramps, lay-bys, fire route · `perUnit` · class C · quote — *if design.vehicleAccessPoints>=1*
- Boulevard and streetscape restoration (paving, street trees in soil cells, lighting) · `perLinear` · class C · source — *if design.streetscapeM>=1*
- Sign permits (sign by-law) · `schedule` · class exact · source — *if design.signage*
- Occupancy permit (required for non-rental residential with deferred DCs from 2025-11-03) · `schedule` · class exact · source — *if policy.dcDeferral*

**Demolition, remediation and site preparation**

- Tenant buyouts / RTA compensation (N13) · `perUnit` · class C · source — *if site.existingRentalUnits>=1*
- Commercial lease terminations / relocation · `lumpSum` · class D · quote — *if site.existingCommercialTenants*
- Hazardous materials abatement · `perArea` · class C · quote — *if site.existingBuilding*
- Demolition and disposal · `perArea` · class C · quote — *if site.existingBuilding*
- Utility disconnections and decommissioning · `lumpSum` · class B · source — *if site.existingBuilding*
- Utility / easement relocation · `lumpSum` · class D · quote — *if site.utilityRelocation*
- Soil and groundwater remediation (dig-and-dump or in-situ) · `perVolume` · class D · quote — *if site.contamination=high*
- Excess soil: characterization, Qualified Person, registry, hauling and tipping (O. Reg. 406/19) · `perVolume` · class C · source — *if site.excessSoilM3>=1*
- Bulk excavation · `perVolume` · class C · quote
- Rock excavation premium · `perVolume` · class D · quote — *if site.rockExcavation*
- Shoring (soldier pile/lagging, caisson, secant) and underpinning · `perArea` · class C · quote — *if construction.shoring*
- Construction dewatering, PTTW/EASR, sewer discharge agreement · `perMonth` · class C · source — *if site.highWaterTable*
- Tree removal permits, replacement or cash-in-lieu (Toronto Ch. 813) · `perUnit` · class exact · source — *if site.protectedTrees>=1*
- Hoarding, fencing, site security · `perMonth` · class B · quote

**Hard construction**

- Hard cost, benchmark $/ft² by building type (Altus low/high) · `perArea` · class C · source
- Substructure and foundations · `perArea` · class C · quote
- Underground parking ($/stall; rises with each level below grade) · `perUnit` · class C · source — *if planning.parkingLevelsBelowGrade>=1*
- Superstructure (concrete, mass timber, steel, wood frame) · `perArea` · class C · quote
- Envelope (window wall, curtain wall, precast, masonry) · `perArea` · class C · quote
- Balconies and guards (thermally broken) · `perUnit` · class C · quote — *if design.balconies*
- Suite interiors and finishes · `perUnit` · class C · quote
- Passenger elevators (North America ~$150k+ each for mid-rise; quote per stop) · `perUnit` · class C · quote — *if design.elevators>=1*
- Service / freight elevator · `perUnit` · class C · quote — *if design.serviceElevator*
- Mechanical: HVAC, plumbing, fire protection · `perArea` · class C · quote
- Geoexchange boreholes and heat pumps · `lumpSum` · class D · quote — *if design.energySystem=geoexchange*
- Electrical, lighting, life safety · `perArea` · class C · quote
- Emergency / standby generator · `lumpSum` · class C · quote — *if design.standbyGenerator*
- Emergency responder radio system · `lumpSum` · class C · quote — *if design.emergencyRadio*
- EV-ready conduit and chargers · `perUnit` · class C · source — *if planning.evReadyShare>=0.01*
- Bicycle parking, repair station · `perUnit` · class B · quote — *if planning.bikeParking>=1*
- Green roof (Toronto ≥2,000 m² GFA: 20–60% of available roof; CIL $200/m² for reductions) · `perArea` · class C · verified — *if design.greenRoofM2>=1*
- Solar PV · `lumpSum` · class C · quote — *if design.solarPv*
- Toronto Green Standard higher-tier upgrades · `perArea` · class C · source — *if planning.greenStandardTier>=2*
- Stormwater retention tank, oil-grit separator, LID · `lumpSum` · class C · quote — *if design.stormwaterTank*
- Waste chutes, compactor, City collection room · `lumpSum` · class B · source — *if program.wasteChuteCompactor*
- Loading spaces and dock · `perUnit` · class C · quote — *if planning.loadingSpaces>=1*
- Indoor amenity space build-out · `perArea` · class C · quote — *if planning.amenityIndoorM2PerUnit>=0.1*
- Outdoor amenity space · `perArea` · class C · quote — *if planning.amenityOutdoorM2PerUnit>=0.1*
- Pool (structure, mechanical, finishes) · `lumpSum` · class C · quote — *if program.pool*
- Fitness centre fit-out and equipment · `lumpSum` · class B · quote — *if program.fitness*
- Rooftop terrace / amenity · `perArea` · class C · quote — *if program.rooftopAmenity*
- Co-working, party room, guest suite · `lumpSum` · class B · quote — *if program.coworkingPartyRoom*
- Pet spa / dog run · `lumpSum` · class B · quote — *if program.petSpaDogRun*
- Storage lockers · `perUnit` · class B · quote — *if program.lockers>=1*
- Childcare centre fit-out (outdoor play area, licensing requirements) · `perArea` · class C · quote — *if program.childcare*
- Institutional / community space (shell or turnkey per agreement) · `perArea` · class C · quote — *if program.institutional*
- Retail/office base building shell · `perArea` · class C · quote — *if program.retailNla>=1*
- Soft and hard landscaping · `perArea` · class C · quote — *if design.landscapingM2>=1*
- Building identification, wayfinding and retail signage · `lumpSum` · class B · quote — *if design.signage*
- Entrances, canopies and lobby finishes · `lumpSum` · class C · quote
- Heated ramp / snow-melt · `lumpSum` · class C · quote — *if design.snowMelt*
- General conditions / requirements · `perMonth` · class C · quote
- Tower crane rental, operators, foundations · `perMonth` · class B · quote — *if construction.craneMonths>=1*
- Winter heat and protection · `perMonth` · class C · quote — *if construction.winterMonths>=1*
- Construction manager / GC fee · `percentOf` · class B · quote
- Builder's risk and wrap-up liability insurance · `percentOf` · class B · quote
- Performance and labour & material bonds · `percentOf` · class B · quote
- Design contingency (shrinks with estimate class) · `percentOf` · class C · source
- Construction contingency · `percentOf` · class C · source
- Escalation to spend month (StatCan BCPI: Toronto residential 106.4, Q1 2026, +1.0% y/y) · `indexed` · class C · verified
- Construction Act 10% holdback (cash timing, not cost) · `timing` · class exact · source

**Soft costs**

- Architect (OAA fee guideline) · `percentOf` · class B · source
- Structural, mechanical, electrical, civil engineers · `percentOf` · class B · quote
- Landscape, envelope, acoustic, code, elevator, interior design consultants · `lumpSum` · class B · quote
- Cost consultant / quantity surveyor · `perMonth` · class B · quote
- Project / development manager · `percentOf` · class B · quote
- Legal: corporate, construction contracts, leasing · `lumpSum` · class B · quote
- Accounting, audit and tax advice · `lumpSum` · class B · quote
- Property tax during construction · `rate` · class A · source
- Amenity furniture, fixtures and equipment · `lumpSum` · class B · quote — *if design.ffeAmenity*
- Developer overhead / fee · `percentOf` · class exact · source
- Soft costs as % of hard (allowance until consultants are itemized) · `percentOf` · class C · source
- Soft-cost contingency · `percentOf` · class C · source
- Commissioning and energy verification · `lumpSum` · class B · quote

**Financing**

- Construction loan interest (dated benchmark + spread) · `ledger` · class A · source
- Commitment, standby and extension fees; lender legal; appraisal; cost monitoring · `percentOf` · class A · quote
- Mezzanine / preferred equity (rate, fees, waterfall) · `rate` · class A · quote — *if finance.mezzanine*
- Letters of credit fees (securities, DCs, deposits) · `rate` · class A · quote — *if finance.lettersOfCredit*
- Excess deposit insurance / deposit financing · `percentOf` · class B · quote — *if finance.depositInsurance*
- Interest-rate hedge · `lumpSum` · class B · quote

**Sales and commodity taxes, rebates**

- HST on construction inputs; input tax credits (taxable supplies) (0.13 of taxable inputs) · `percentOf` · class exact · source
- New housing rebates assigned to builder (federal ~$6.3k max; Ontario max $24k) · `perUnit` · class exact · source — *if policy.newHomeRebates*
- First-Time Home Buyers' GST rebate (up to 100% of GST, max $50k; agreements 2025-03-20 to before 2031) · `perUnit` · class exact · source
- Ontario full HST rebate on new homes ≤$1M (max $130k), agreements 2026-04-01 to 2027-03-31 · `perUnit` · class exact · proposed

**Condo / for-sale marketing, closing and turnover**

- Sales centre, model suites, renderings, marketing · `lumpSum` · class B · quote
- Commissions (in-house and co-op brokers) · `percentOf` · class A · quote
- Tarion enrolment fee (2024 schedule: $585 ≤$300k to $6,000 ≥$4M, + HST) · `schedule` · class exact · source
- HCRA regulatory oversight fee ($145 + HST per home) (145 CAD/home + HST) · `perUnit` · class exact · source
- HCRA builder/vendor licence · `schedule` · class exact · source
- Condo registration: declaration, description, reference plan, Land Titles · `lumpSum` · class B · source — *if planning.condoPlan*
- Closing adjustments recoverable from buyers (levy increases over cap, Tarion fee, meters) · `perUnit` · class B · source
- Reserve fund study, performance audit, turnover meeting · `lumpSum` · class B · source
- Unsold inventory: common expenses, property tax, carry · `perUnit` · class B · source
- Warranty service and deficiency reserve · `percentOf` · class B · source
- Parking and locker sales (revenue) · `revenue` · class B · source — *if planning.carParkingStalls>=1*

**Rental lease-up and operations**

- Utilities (bulk vs submetered) · `perUnit` · class B · quote
- Property insurance · `perUnit` · class B · quote
- Property tax (Toronto 2026: new multi-residential 0.767311%, multi-residential 1.208792%) · `rate` · class exact · verified
- Concierge and security · `perMonth` · class B · quote — *if program.concierge*
- Parking, storage, laundry and telecom income (revenue) · `revenue` · class B · source

**Commercial leasing and operations**

- Tenant improvement allowance / landlord's work · `perArea` · class B · quote — *if program.retailNla>=1*
- Leasing commissions · `perArea` · class B · quote — *if program.retailNla>=1*
- Free rent and downtime between tenants · `revenue` · class B · source — *if program.retailNla>=1*
- Unrecovered operating costs (net vs gross leases) · `perArea` · class B · source — *if program.retailNla>=1*

**Exit, refinance and disposition**

- Sale commission, legal, marketing at exit · `percentOf` · class A · quote
- Refinance: new lender fees, prepayment penalty · `percentOf` · class A · quote — *if finance.refinance*
- HST on sale of commercial property / new residential (0.13 of price) · `percentOf` · class exact · source

**Master plan: land development and community infrastructure**

- Local roads, sidewalks, street lighting, street trees · `perLinear` · class D · source — *if mp.localRoadM>=1*
- Subdivision agreement securities and municipal assumption costs · `percentOf` · class C · source — *if planning.subdivision*


## Infill multiplex / garden or laneway suites (2–10 units)

*Components:* rental · *Example:* Fourplex replacing a detached house

**Screening and market evidence**

- Market study, appraisal, broker opinion of value · `lumpSum` · class B · quote
- Market data subscriptions (Altus Data Studio, Urbanation, CoStar) · `lumpSum` · class A · source
- Construction cost benchmark (Altus Canadian Cost Guide 2026, released 2026-04-23) · `perArea` · class C · verified
- Concept massing / test-fit · `lumpSum` · class B · quote

**Land acquisition and holding**

- Land purchase price · `lumpSum` · class exact · source
- Ontario land transfer tax · `schedule` · class exact · source
- Toronto municipal land transfer tax (luxury brackets from 2026-04-01: 4.40%–8.60% above $3M) · `schedule` · class exact · verified — *if site.municipality=toronto*
- Non-Resident Speculation Tax (25%) (0.25 of value) · `percentOf` · class exact · verified — *if deal.buyerNonResident*
- HST on land (taxable supply; registrant self-assesses) (0.13 of price) · `percentOf` · class exact · source — *if deal.vacantOrCommercialLand*
- Legal, title insurance, searches · `lumpSum` · class B · quote
- Survey: boundary, topographic, reference plan · `lumpSum` · class B · quote
- Building condition assessment · `lumpSum` · class B · quote — *if site.existingBuilding*
- Zoning review / compliance letter · `schedule` · class exact · source
- Brokerage commission on purchase · `percentOf` · class A · quote
- Land assembly premium and holdout costs · `lumpSum` · class D · quote — *if site.parcelsToAssemble>=2*
- Land loan: interest, fees, lender legal, appraisal · `rate` · class A · quote — *if deal.landLoan*
- Property tax during hold · `rate` · class A · source
- Insurance, security, vacant-building maintenance · `perMonth` · class B · quote
- Interim income from existing tenants (offset) · `perMonth` · class B · source — *if site.existingBuilding*

**Due diligence and studies**

- Phase One ESA (Phase-One-only RSCs no longer filable unless required, since 2025-10-23) · `lumpSum` · class B · verified
- Phase Two ESA: boreholes, sampling, lab · `perUnit` · class B · quote — *if site.contamination=low*
- Phase Two ESA, delineation (high risk) · `perUnit` · class C · quote — *if site.contamination=high*
- Record of Site Condition + MECP filing (O. Reg. 153/04) · `lumpSum` · class B · source — *if site.useChangeToSensitive*
- Risk assessment (alternative to full remediation) · `lumpSum` · class C · quote — *if site.contamination=high*
- Geotechnical investigation (per-borehole pricing; ~0.2–0.4% of construction for low-rise) · `perUnit` · class B · verified
- Hydrogeological study · `lumpSum` · class B · quote — *if site.highWaterTable*
- Designated substance survey (asbestos, lead, mould; O. Reg. 278/05) · `lumpSum` · class B · source — *if site.existingBuilding*
- Arborist report and tree protection plan · `lumpSum` · class B · quote — *if site.protectedTrees>=1*
- Archaeological assessment, Stages 1–4 · `perHectare` · class C · source — *if site.archaeologicalPotential*
- Heritage impact assessment, conservation plan · `lumpSum` · class B · source — *if site.heritage*
- Natural heritage / environmental impact study, species at risk · `lumpSum` · class C · quote — *if site.regulatedArea*
- Rail proximity: safety/vibration study, crash wall or berm design · `lumpSum` · class C · source — *if site.nearRailCorridor*
- Functional servicing and stormwater management report · `lumpSum` · class B · quote
- Planning justification report, urban design brief, community consultation · `lumpSum` · class B · quote — *if planning.zba*
- TTC technical review (work within 60 m of TTC infrastructure) · `lumpSum` · class C · verified — *if site.nearTtc60m*
- TTC-required protections, monitoring and design changes · `lumpSum` · class D · quote — *if site.nearTtc60m*
- Metrolinx review / rail corridor agreements · `lumpSum` · class C · source — *if site.nearRailCorridor*
- MTO corridor permits · `lumpSum` · class B · source — *if site.nearHighway*
- Conservation authority permit and review fees (TRCA / CLOCA) · `schedule` · class exact · source — *if site.regulatedArea*
- Floodproofing design and works · `lumpSum` · class D · quote — *if site.floodplain*

**Planning approvals and land-value charges**

- Official plan amendment application fee · `schedule` · class exact · source — *if planning.opa*
- Zoning by-law amendment application fee · `schedule` · class exact · source — *if planning.zba*
- Site plan application fee · `schedule` · class exact · source — *if planning.sitePlan*
- Draft plan of subdivision fee · `schedule` · class exact · source — *if planning.subdivision*
- Draft plan of condominium fee · `schedule` · class exact · source — *if planning.condoPlan*
- Committee of Adjustment fee · `schedule` · class exact · source — *if planning.minorVariance*
- Ontario Land Tribunal appeal: legal and experts · `lumpSum` · class D · quote — *if planning.appealRisk*
- Planner, architect and legal time through approvals · `lumpSum` · class C · quote
- Parkland cash-in-lieu (Planning Act s.42; caps 10% of land value <1 ha, 15% for 1–5 ha) · `percentOf` · class exact · source
- Community Benefits Charge (up to 4% of land value) (0.04 of land value (cap)) · `percentOf` · class exact · source — *if planning.cbcApplies*
- Inclusionary zoning: revenue forgone on affordable set-aside · `revenue` · class B · source — *if planning.inclusionaryZoning*
- Affordable units: rent or price below market · `revenue` · class B · source — *if planning.affordableShare>=0.01*
- Rental replacement units (Toronto Ch. 667: ≥20 years as rental, right of return at similar rent) · `revenue` · class B · source — *if site.existingRentalUnits>=6 and site.municipality=toronto*
- Tenant Assistance Plan: rent-gap and moving compensation · `perUnit` · class C · source — *if site.existingRentalUnits>=6 and site.municipality=toronto*
- Public art (Toronto Percent for Public Art guideline ~1% of gross construction cost, negotiated) (0.01 of gross construction cost) · `percentOf` · class B · source — *if planning.publicArt*
- POPS design, construction and easement · `perArea` · class C · quote — *if planning.pops*
- Site plan / landscaping securities (letter of credit) · `percentOf` · class B · source — *if planning.sitePlan*

**Development charges and levies**

- Toronto DC (June 2025: $52,676 studio/1-bed, $80,690 2+ bed non-rental; rental $33,497 / $48,299 / $45,280) · `perUnit` · class exact · source — *if site.municipality=toronto*
- Toronto DC Reduction Program credit (−40% studio/1-bed, −60% 2+ bed; draft at review) · `perUnit` · class exact · source — *if site.municipality=toronto and policy.torontoDcReduction*
- Oshawa DC (schedule effective 2026-07-01) · `perUnit` · class exact · source — *if site.municipality=oshawa*
- Durham Region DC · `perUnit` · class exact · source — *if site.municipality=oshawa*
- Education development charge · `perUnit` · class exact · source
- Statutory purpose-built rental DC discount by bedroom count (DCA s.26.2) · `perUnit` · class exact · source
- Affordable/attainable unit DC exemption (Ontario bulletin effective 2026-07-01) · `perUnit` · class exact · source — *if planning.affordableShare>=0.01*
- DC deferral: payment moved to occupancy/instalments, interest capped by statute (timing, not waiver) · `rate` · class exact · source — *if policy.dcDeferral*
- DC credits for works built by the developer (e.g. transit: 334–350 Bloor St W) · `lumpSum` · class C · verified — *if mp.transitIntegration*
- Long-term care DC exemption (Bill 17) · `perUnit` · class exact · source — *if program.studentOrSeniors*

**Permits, rights-of-way and utilities**

- Building permit fee (Toronto Municipal Code Ch. 363) · `perArea` · class exact · source
- Demolition permit · `schedule` · class exact · source — *if site.existingBuilding*
- Right-of-way: street occupation, hoarding, crane swing, lane closures · `perMonth` · class B · source — *if site.tightUrbanSite*
- Crane-swing and tie-back encroachment agreements with neighbours · `lumpSum` · class D · quote — *if site.tightUrbanSite*
- Water and sewer service connections · `lumpSum` · class B · source
- Electrical connection and capacity expansion (Toronto Hydro / Elexicon) · `lumpSum` · class C · quote
- Electrical vault / transformer room · `lumpSum` · class C · quote — *if design.hydroVault*
- Gas, telecom and fibre connections · `lumpSum` · class C · quote
- District energy connection charge · `lumpSum` · class C · quote — *if design.energySystem=district-energy*
- Vehicle entries/exits: curb cuts, ramps, lay-bys, fire route · `perUnit` · class C · quote — *if design.vehicleAccessPoints>=1*
- Boulevard and streetscape restoration (paving, street trees in soil cells, lighting) · `perLinear` · class C · source — *if design.streetscapeM>=1*
- Sign permits (sign by-law) · `schedule` · class exact · source — *if design.signage*

**Demolition, remediation and site preparation**

- Tenant buyouts / RTA compensation (N13) · `perUnit` · class C · source — *if site.existingRentalUnits>=1*
- Commercial lease terminations / relocation · `lumpSum` · class D · quote — *if site.existingCommercialTenants*
- Hazardous materials abatement · `perArea` · class C · quote — *if site.existingBuilding*
- Demolition and disposal · `perArea` · class C · quote — *if site.existingBuilding*
- Utility disconnections and decommissioning · `lumpSum` · class B · source — *if site.existingBuilding*
- Utility / easement relocation · `lumpSum` · class D · quote — *if site.utilityRelocation*
- Soil and groundwater remediation (dig-and-dump or in-situ) · `perVolume` · class D · quote — *if site.contamination=high*
- Excess soil: characterization, Qualified Person, registry, hauling and tipping (O. Reg. 406/19) · `perVolume` · class C · source — *if site.excessSoilM3>=1*
- Bulk excavation · `perVolume` · class C · quote
- Rock excavation premium · `perVolume` · class D · quote — *if site.rockExcavation*
- Shoring (soldier pile/lagging, caisson, secant) and underpinning · `perArea` · class C · quote — *if construction.shoring*
- Construction dewatering, PTTW/EASR, sewer discharge agreement · `perMonth` · class C · source — *if site.highWaterTable*
- Tree removal permits, replacement or cash-in-lieu (Toronto Ch. 813) · `perUnit` · class exact · source — *if site.protectedTrees>=1*
- Hoarding, fencing, site security · `perMonth` · class B · quote

**Hard construction**

- Hard cost, benchmark $/ft² by building type (Altus low/high) · `perArea` · class C · source
- Substructure and foundations · `perArea` · class C · quote
- Underground parking ($/stall; rises with each level below grade) · `perUnit` · class C · source — *if planning.parkingLevelsBelowGrade>=1*
- Superstructure (concrete, mass timber, steel, wood frame) · `perArea` · class C · quote
- Envelope (window wall, curtain wall, precast, masonry) · `perArea` · class C · quote
- Balconies and guards (thermally broken) · `perUnit` · class C · quote — *if design.balconies*
- Suite interiors and finishes · `perUnit` · class C · quote
- Passenger elevators (North America ~$150k+ each for mid-rise; quote per stop) · `perUnit` · class C · quote — *if design.elevators>=1*
- Service / freight elevator · `perUnit` · class C · quote — *if design.serviceElevator*
- Mechanical: HVAC, plumbing, fire protection · `perArea` · class C · quote
- Geoexchange boreholes and heat pumps · `lumpSum` · class D · quote — *if design.energySystem=geoexchange*
- Electrical, lighting, life safety · `perArea` · class C · quote
- Emergency / standby generator · `lumpSum` · class C · quote — *if design.standbyGenerator*
- Emergency responder radio system · `lumpSum` · class C · quote — *if design.emergencyRadio*
- EV-ready conduit and chargers · `perUnit` · class C · source — *if planning.evReadyShare>=0.01*
- Bicycle parking, repair station · `perUnit` · class B · quote — *if planning.bikeParking>=1*
- Green roof (Toronto ≥2,000 m² GFA: 20–60% of available roof; CIL $200/m² for reductions) · `perArea` · class C · verified — *if design.greenRoofM2>=1*
- Solar PV · `lumpSum` · class C · quote — *if design.solarPv*
- Toronto Green Standard higher-tier upgrades · `perArea` · class C · source — *if planning.greenStandardTier>=2*
- Stormwater retention tank, oil-grit separator, LID · `lumpSum` · class C · quote — *if design.stormwaterTank*
- Waste chutes, compactor, City collection room · `lumpSum` · class B · source — *if program.wasteChuteCompactor*
- Loading spaces and dock · `perUnit` · class C · quote — *if planning.loadingSpaces>=1*
- Indoor amenity space build-out · `perArea` · class C · quote — *if planning.amenityIndoorM2PerUnit>=0.1*
- Outdoor amenity space · `perArea` · class C · quote — *if planning.amenityOutdoorM2PerUnit>=0.1*
- Pool (structure, mechanical, finishes) · `lumpSum` · class C · quote — *if program.pool*
- Fitness centre fit-out and equipment · `lumpSum` · class B · quote — *if program.fitness*
- Rooftop terrace / amenity · `perArea` · class C · quote — *if program.rooftopAmenity*
- Co-working, party room, guest suite · `lumpSum` · class B · quote — *if program.coworkingPartyRoom*
- Pet spa / dog run · `lumpSum` · class B · quote — *if program.petSpaDogRun*
- Storage lockers · `perUnit` · class B · quote — *if program.lockers>=1*
- Childcare centre fit-out (outdoor play area, licensing requirements) · `perArea` · class C · quote — *if program.childcare*
- Institutional / community space (shell or turnkey per agreement) · `perArea` · class C · quote — *if program.institutional*
- Retail/office base building shell · `perArea` · class C · quote — *if program.retailNla>=1*
- Soft and hard landscaping · `perArea` · class C · quote — *if design.landscapingM2>=1*
- Building identification, wayfinding and retail signage · `lumpSum` · class B · quote — *if design.signage*
- Entrances, canopies and lobby finishes · `lumpSum` · class C · quote
- Heated ramp / snow-melt · `lumpSum` · class C · quote — *if design.snowMelt*
- General conditions / requirements · `perMonth` · class C · quote
- Tower crane rental, operators, foundations · `perMonth` · class B · quote — *if construction.craneMonths>=1*
- Winter heat and protection · `perMonth` · class C · quote — *if construction.winterMonths>=1*
- Construction manager / GC fee · `percentOf` · class B · quote
- Builder's risk and wrap-up liability insurance · `percentOf` · class B · quote
- Performance and labour & material bonds · `percentOf` · class B · quote
- Design contingency (shrinks with estimate class) · `percentOf` · class C · source
- Construction contingency · `percentOf` · class C · source
- Escalation to spend month (StatCan BCPI: Toronto residential 106.4, Q1 2026, +1.0% y/y) · `indexed` · class C · verified
- Construction Act 10% holdback (cash timing, not cost) · `timing` · class exact · source

**Soft costs**

- Architect (OAA fee guideline) · `percentOf` · class B · source
- Structural, mechanical, electrical, civil engineers · `percentOf` · class B · quote
- Landscape, envelope, acoustic, code, elevator, interior design consultants · `lumpSum` · class B · quote
- Cost consultant / quantity surveyor · `perMonth` · class B · quote
- Project / development manager · `percentOf` · class B · quote
- Legal: corporate, construction contracts, leasing · `lumpSum` · class B · quote
- Accounting, audit and tax advice · `lumpSum` · class B · quote
- Property tax during construction · `rate` · class A · source
- Amenity furniture, fixtures and equipment · `lumpSum` · class B · quote — *if design.ffeAmenity*
- Developer overhead / fee · `percentOf` · class exact · source
- Soft costs as % of hard (allowance until consultants are itemized) · `percentOf` · class C · source
- Soft-cost contingency · `percentOf` · class C · source

**Financing**

- Construction loan interest (dated benchmark + spread) · `ledger` · class A · source
- Commitment, standby and extension fees; lender legal; appraisal; cost monitoring · `percentOf` · class A · quote
- Mezzanine / preferred equity (rate, fees, waterfall) · `rate` · class A · quote — *if finance.mezzanine*
- Letters of credit fees (securities, DCs, deposits) · `rate` · class A · quote — *if finance.lettersOfCredit*
- CMHC MLI Select application fee and premium (by points: affordability, accessibility, energy) · `percentOf` · class B · source — *if finance.cmhcMliSelect*
- Interest-rate hedge · `lumpSum` · class B · quote

**Sales and commodity taxes, rebates**

- Self-supply HST on first occupancy of rental (fair market value) (0.13 of FMV) · `percentOf` · class B · source
- Federal GST rental rebate / NRRP / Ontario ENRRP (construction start 2026-04-01 to 2027-03-31) · `percentOf` · class B · source — *if policy.rentalHstRebate*

**Rental lease-up and operations**

- Leasing staff, marketing, model suite · `lumpSum` · class B · quote
- Property management fee · `percentOf` · class B · quote
- Payroll, repairs and maintenance, admin · `perUnit` · class B · quote
- Utilities (bulk vs submetered) · `perUnit` · class B · quote
- Property insurance · `perUnit` · class B · quote
- Property tax (Toronto 2026: new multi-residential 0.767311%, multi-residential 1.208792%) · `rate` · class exact · verified
- Concierge and security · `perMonth` · class B · quote — *if program.concierge*
- Capital reserves · `perUnit` · class B · source
- Parking, storage, laundry and telecom income (revenue) · `revenue` · class B · source

**Commercial leasing and operations**

- Tenant improvement allowance / landlord's work · `perArea` · class B · quote — *if program.retailNla>=1*
- Leasing commissions · `perArea` · class B · quote — *if program.retailNla>=1*
- Free rent and downtime between tenants · `revenue` · class B · source — *if program.retailNla>=1*
- Unrecovered operating costs (net vs gross leases) · `perArea` · class B · source — *if program.retailNla>=1*

**Exit, refinance and disposition**

- Sale commission, legal, marketing at exit · `percentOf` · class A · quote
- Refinance: new lender fees, prepayment penalty · `percentOf` · class A · quote — *if finance.refinance*
- HST on sale of commercial property / new residential (0.13 of price) · `percentOf` · class exact · source


## Commercial: office, retail, industrial

*Components:* commercial · *Example:* Multi-tenant industrial or retail plaza

**Screening and market evidence**

- Market study, appraisal, broker opinion of value · `lumpSum` · class B · quote
- Market data subscriptions (Altus Data Studio, Urbanation, CoStar) · `lumpSum` · class A · source
- Construction cost benchmark (Altus Canadian Cost Guide 2026, released 2026-04-23) · `perArea` · class C · verified
- Concept massing / test-fit · `lumpSum` · class B · quote

**Land acquisition and holding**

- Land purchase price · `lumpSum` · class exact · source
- Ontario land transfer tax · `schedule` · class exact · source
- Toronto municipal land transfer tax (luxury brackets from 2026-04-01: 4.40%–8.60% above $3M) · `schedule` · class exact · verified — *if site.municipality=toronto*
- HST on land (taxable supply; registrant self-assesses) (0.13 of price) · `percentOf` · class exact · source — *if deal.vacantOrCommercialLand*
- Legal, title insurance, searches · `lumpSum` · class B · quote
- Survey: boundary, topographic, reference plan · `lumpSum` · class B · quote
- Building condition assessment · `lumpSum` · class B · quote — *if site.existingBuilding*
- Zoning review / compliance letter · `schedule` · class exact · source
- Brokerage commission on purchase · `percentOf` · class A · quote
- Land assembly premium and holdout costs · `lumpSum` · class D · quote — *if site.parcelsToAssemble>=2*
- Land loan: interest, fees, lender legal, appraisal · `rate` · class A · quote — *if deal.landLoan*
- Property tax during hold · `rate` · class A · source
- Insurance, security, vacant-building maintenance · `perMonth` · class B · quote
- Interim income from existing tenants (offset) · `perMonth` · class B · source — *if site.existingBuilding*

**Due diligence and studies**

- Phase One ESA (Phase-One-only RSCs no longer filable unless required, since 2025-10-23) · `lumpSum` · class B · verified
- Phase Two ESA: boreholes, sampling, lab · `perUnit` · class B · quote — *if site.contamination=low*
- Phase Two ESA, delineation (high risk) · `perUnit` · class C · quote — *if site.contamination=high*
- Record of Site Condition + MECP filing (O. Reg. 153/04) · `lumpSum` · class B · source — *if site.useChangeToSensitive*
- Risk assessment (alternative to full remediation) · `lumpSum` · class C · quote — *if site.contamination=high*
- Geotechnical investigation (per-borehole pricing; ~0.2–0.4% of construction for low-rise) · `perUnit` · class B · verified
- Hydrogeological study · `lumpSum` · class B · quote — *if site.highWaterTable*
- Designated substance survey (asbestos, lead, mould; O. Reg. 278/05) · `lumpSum` · class B · source — *if site.existingBuilding*
- Arborist report and tree protection plan · `lumpSum` · class B · quote — *if site.protectedTrees>=1*
- Archaeological assessment, Stages 1–4 · `perHectare` · class C · source — *if site.archaeologicalPotential*
- Heritage impact assessment, conservation plan · `lumpSum` · class B · source — *if site.heritage*
- Natural heritage / environmental impact study, species at risk · `lumpSum` · class C · quote — *if site.regulatedArea*
- Transportation impact study, TDM plan, parking study · `lumpSum` · class B · quote
- Noise and vibration study · `lumpSum` · class B · quote
- Rail proximity: safety/vibration study, crash wall or berm design · `lumpSum` · class C · source — *if site.nearRailCorridor*
- Functional servicing and stormwater management report · `lumpSum` · class B · quote
- Energy strategy, energy model, Toronto Green Standard checklist · `lumpSum` · class B · source
- Planning justification report, urban design brief, community consultation · `lumpSum` · class B · quote — *if planning.zba*
- TTC technical review (work within 60 m of TTC infrastructure) · `lumpSum` · class C · verified — *if site.nearTtc60m*
- TTC-required protections, monitoring and design changes · `lumpSum` · class D · quote — *if site.nearTtc60m*
- Metrolinx review / rail corridor agreements · `lumpSum` · class C · source — *if site.nearRailCorridor*
- MTO corridor permits · `lumpSum` · class B · source — *if site.nearHighway*
- Conservation authority permit and review fees (TRCA / CLOCA) · `schedule` · class exact · source — *if site.regulatedArea*
- Floodproofing design and works · `lumpSum` · class D · quote — *if site.floodplain*

**Planning approvals and land-value charges**

- Official plan amendment application fee · `schedule` · class exact · source — *if planning.opa*
- Zoning by-law amendment application fee · `schedule` · class exact · source — *if planning.zba*
- Site plan application fee · `schedule` · class exact · source — *if planning.sitePlan*
- Draft plan of subdivision fee · `schedule` · class exact · source — *if planning.subdivision*
- Draft plan of condominium fee · `schedule` · class exact · source — *if planning.condoPlan*
- Committee of Adjustment fee · `schedule` · class exact · source — *if planning.minorVariance*
- Ontario Land Tribunal appeal: legal and experts · `lumpSum` · class D · quote — *if planning.appealRisk*
- Planner, architect and legal time through approvals · `lumpSum` · class C · quote
- Parkland for commercial/industrial (2% of land or cash equivalent) (0.02 of land value) · `percentOf` · class exact · source
- Community Benefits Charge (up to 4% of land value) (0.04 of land value (cap)) · `percentOf` · class exact · source — *if planning.cbcApplies*
- Inclusionary zoning: revenue forgone on affordable set-aside · `revenue` · class B · source — *if planning.inclusionaryZoning*
- Affordable units: rent or price below market · `revenue` · class B · source — *if planning.affordableShare>=0.01*
- Rental replacement units (Toronto Ch. 667: ≥20 years as rental, right of return at similar rent) · `revenue` · class B · source — *if site.existingRentalUnits>=6 and site.municipality=toronto*
- Tenant Assistance Plan: rent-gap and moving compensation · `perUnit` · class C · source — *if site.existingRentalUnits>=6 and site.municipality=toronto*
- Public art (Toronto Percent for Public Art guideline ~1% of gross construction cost, negotiated) (0.01 of gross construction cost) · `percentOf` · class B · source — *if planning.publicArt*
- POPS design, construction and easement · `perArea` · class C · quote — *if planning.pops*
- Site plan / landscaping securities (letter of credit) · `percentOf` · class B · source — *if planning.sitePlan*

**Development charges and levies**

- Toronto DC (June 2025: $52,676 studio/1-bed, $80,690 2+ bed non-rental; rental $33,497 / $48,299 / $45,280) · `perUnit` · class exact · source — *if site.municipality=toronto*
- Toronto DC Reduction Program credit (−40% studio/1-bed, −60% 2+ bed; draft at review) · `perUnit` · class exact · source — *if site.municipality=toronto and policy.torontoDcReduction*
- Oshawa DC (schedule effective 2026-07-01) · `perUnit` · class exact · source — *if site.municipality=oshawa*
- Durham Region DC · `perUnit` · class exact · source — *if site.municipality=oshawa*
- Non-residential DCs on retail/office/industrial GFA · `perArea` · class exact · source — *if program.retailNla>=1*
- Affordable/attainable unit DC exemption (Ontario bulletin effective 2026-07-01) · `perUnit` · class exact · source — *if planning.affordableShare>=0.01*
- DC deferral: payment moved to occupancy/instalments, interest capped by statute (timing, not waiver) · `rate` · class exact · source — *if policy.dcDeferral*
- DC credits for works built by the developer (e.g. transit: 334–350 Bloor St W) · `lumpSum` · class C · verified — *if mp.transitIntegration*
- Long-term care DC exemption (Bill 17) · `perUnit` · class exact · source — *if program.studentOrSeniors*

**Permits, rights-of-way and utilities**

- Building permit fee (Toronto Municipal Code Ch. 363) · `perArea` · class exact · source
- Demolition permit · `schedule` · class exact · source — *if site.existingBuilding*
- Right-of-way: street occupation, hoarding, crane swing, lane closures · `perMonth` · class B · source — *if site.tightUrbanSite*
- Crane-swing and tie-back encroachment agreements with neighbours · `lumpSum` · class D · quote — *if site.tightUrbanSite*
- Water and sewer service connections · `lumpSum` · class B · source
- Off-site servicing capacity upgrades (watermain, sewer) · `perLinear` · class D · quote
- Electrical connection and capacity expansion (Toronto Hydro / Elexicon) · `lumpSum` · class C · quote
- Electrical vault / transformer room · `lumpSum` · class C · quote — *if design.hydroVault*
- Gas, telecom and fibre connections · `lumpSum` · class C · quote
- District energy connection charge · `lumpSum` · class C · quote — *if design.energySystem=district-energy*
- Vehicle entries/exits: curb cuts, ramps, lay-bys, fire route · `perUnit` · class C · quote — *if design.vehicleAccessPoints>=1*
- Boulevard and streetscape restoration (paving, street trees in soil cells, lighting) · `perLinear` · class C · source — *if design.streetscapeM>=1*
- Sign permits (sign by-law) · `schedule` · class exact · source — *if design.signage*

**Demolition, remediation and site preparation**

- Tenant buyouts / RTA compensation (N13) · `perUnit` · class C · source — *if site.existingRentalUnits>=1*
- Commercial lease terminations / relocation · `lumpSum` · class D · quote — *if site.existingCommercialTenants*
- Hazardous materials abatement · `perArea` · class C · quote — *if site.existingBuilding*
- Demolition and disposal · `perArea` · class C · quote — *if site.existingBuilding*
- Utility disconnections and decommissioning · `lumpSum` · class B · source — *if site.existingBuilding*
- Utility / easement relocation · `lumpSum` · class D · quote — *if site.utilityRelocation*
- Soil and groundwater remediation (dig-and-dump or in-situ) · `perVolume` · class D · quote — *if site.contamination=high*
- Excess soil: characterization, Qualified Person, registry, hauling and tipping (O. Reg. 406/19) · `perVolume` · class C · source — *if site.excessSoilM3>=1*
- Bulk excavation · `perVolume` · class C · quote
- Rock excavation premium · `perVolume` · class D · quote — *if site.rockExcavation*
- Shoring (soldier pile/lagging, caisson, secant) and underpinning · `perArea` · class C · quote — *if construction.shoring*
- Construction dewatering, PTTW/EASR, sewer discharge agreement · `perMonth` · class C · source — *if site.highWaterTable*
- Tree removal permits, replacement or cash-in-lieu (Toronto Ch. 813) · `perUnit` · class exact · source — *if site.protectedTrees>=1*
- Hoarding, fencing, site security · `perMonth` · class B · quote

**Hard construction**

- Hard cost, benchmark $/ft² by building type (Altus low/high) · `perArea` · class C · source
- Substructure and foundations · `perArea` · class C · quote
- Underground parking ($/stall; rises with each level below grade) · `perUnit` · class C · source — *if planning.parkingLevelsBelowGrade>=1*
- Superstructure (concrete, mass timber, steel, wood frame) · `perArea` · class C · quote
- Envelope (window wall, curtain wall, precast, masonry) · `perArea` · class C · quote
- Balconies and guards (thermally broken) · `perUnit` · class C · quote — *if design.balconies*
- Passenger elevators (North America ~$150k+ each for mid-rise; quote per stop) · `perUnit` · class C · quote — *if design.elevators>=1*
- Service / freight elevator · `perUnit` · class C · quote — *if design.serviceElevator*
- Mechanical: HVAC, plumbing, fire protection · `perArea` · class C · quote
- Geoexchange boreholes and heat pumps · `lumpSum` · class D · quote — *if design.energySystem=geoexchange*
- Electrical, lighting, life safety · `perArea` · class C · quote
- Emergency / standby generator · `lumpSum` · class C · quote — *if design.standbyGenerator*
- Emergency responder radio system · `lumpSum` · class C · quote — *if design.emergencyRadio*
- EV-ready conduit and chargers · `perUnit` · class C · source — *if planning.evReadyShare>=0.01*
- Bicycle parking, repair station · `perUnit` · class B · quote — *if planning.bikeParking>=1*
- Green roof (Toronto ≥2,000 m² GFA: 20–60% of available roof; CIL $200/m² for reductions) · `perArea` · class C · verified — *if design.greenRoofM2>=1*
- Solar PV · `lumpSum` · class C · quote — *if design.solarPv*
- Toronto Green Standard higher-tier upgrades · `perArea` · class C · source — *if planning.greenStandardTier>=2*
- Stormwater retention tank, oil-grit separator, LID · `lumpSum` · class C · quote — *if design.stormwaterTank*
- Waste chutes, compactor, City collection room · `lumpSum` · class B · source — *if program.wasteChuteCompactor*
- Loading spaces and dock · `perUnit` · class C · quote — *if planning.loadingSpaces>=1*
- Indoor amenity space build-out · `perArea` · class C · quote — *if planning.amenityIndoorM2PerUnit>=0.1*
- Outdoor amenity space · `perArea` · class C · quote — *if planning.amenityOutdoorM2PerUnit>=0.1*
- Pool (structure, mechanical, finishes) · `lumpSum` · class C · quote — *if program.pool*
- Fitness centre fit-out and equipment · `lumpSum` · class B · quote — *if program.fitness*
- Rooftop terrace / amenity · `perArea` · class C · quote — *if program.rooftopAmenity*
- Co-working, party room, guest suite · `lumpSum` · class B · quote — *if program.coworkingPartyRoom*
- Pet spa / dog run · `lumpSum` · class B · quote — *if program.petSpaDogRun*
- Storage lockers · `perUnit` · class B · quote — *if program.lockers>=1*
- Childcare centre fit-out (outdoor play area, licensing requirements) · `perArea` · class C · quote — *if program.childcare*
- Institutional / community space (shell or turnkey per agreement) · `perArea` · class C · quote — *if program.institutional*
- Retail/office base building shell · `perArea` · class C · quote — *if program.retailNla>=1*
- Soft and hard landscaping · `perArea` · class C · quote — *if design.landscapingM2>=1*
- Building identification, wayfinding and retail signage · `lumpSum` · class B · quote — *if design.signage*
- Entrances, canopies and lobby finishes · `lumpSum` · class C · quote
- Heated ramp / snow-melt · `lumpSum` · class C · quote — *if design.snowMelt*
- General conditions / requirements · `perMonth` · class C · quote
- Tower crane rental, operators, foundations · `perMonth` · class B · quote — *if construction.craneMonths>=1*
- Winter heat and protection · `perMonth` · class C · quote — *if construction.winterMonths>=1*
- Construction manager / GC fee · `percentOf` · class B · quote
- Builder's risk and wrap-up liability insurance · `percentOf` · class B · quote
- Performance and labour & material bonds · `percentOf` · class B · quote
- Design contingency (shrinks with estimate class) · `percentOf` · class C · source
- Construction contingency · `percentOf` · class C · source
- Escalation to spend month (StatCan BCPI: Toronto residential 106.4, Q1 2026, +1.0% y/y) · `indexed` · class C · verified
- Construction Act 10% holdback (cash timing, not cost) · `timing` · class exact · source

**Soft costs**

- Architect (OAA fee guideline) · `percentOf` · class B · source
- Structural, mechanical, electrical, civil engineers · `percentOf` · class B · quote
- Landscape, envelope, acoustic, code, elevator, interior design consultants · `lumpSum` · class B · quote
- Cost consultant / quantity surveyor · `perMonth` · class B · quote
- Project / development manager · `percentOf` · class B · quote
- Legal: corporate, construction contracts, leasing · `lumpSum` · class B · quote
- Accounting, audit and tax advice · `lumpSum` · class B · quote
- Property tax during construction · `rate` · class A · source
- Amenity furniture, fixtures and equipment · `lumpSum` · class B · quote — *if design.ffeAmenity*
- Developer overhead / fee · `percentOf` · class exact · source
- Soft costs as % of hard (allowance until consultants are itemized) · `percentOf` · class C · source
- Soft-cost contingency · `percentOf` · class C · source
- Commissioning and energy verification · `lumpSum` · class B · quote

**Financing**

- Construction loan interest (dated benchmark + spread) · `ledger` · class A · source
- Commitment, standby and extension fees; lender legal; appraisal; cost monitoring · `percentOf` · class A · quote
- Mezzanine / preferred equity (rate, fees, waterfall) · `rate` · class A · quote — *if finance.mezzanine*
- Letters of credit fees (securities, DCs, deposits) · `rate` · class A · quote — *if finance.lettersOfCredit*
- Interest-rate hedge · `lumpSum` · class B · quote

**Sales and commodity taxes, rebates**

- HST on construction inputs; input tax credits (taxable supplies) (0.13 of taxable inputs) · `percentOf` · class exact · source

**Rental lease-up and operations**

- Property management fee · `percentOf` · class B · quote
- Utilities (bulk vs submetered) · `perUnit` · class B · quote
- Property insurance · `perUnit` · class B · quote
- Property tax (Toronto 2026: new multi-residential 0.767311%, multi-residential 1.208792%) · `rate` · class exact · verified
- Concierge and security · `perMonth` · class B · quote — *if program.concierge*
- Capital reserves · `perUnit` · class B · source
- Parking, storage, laundry and telecom income (revenue) · `revenue` · class B · source

**Commercial leasing and operations**

- Tenant improvement allowance / landlord's work · `perArea` · class B · quote — *if program.retailNla>=1*
- Leasing commissions · `perArea` · class B · quote — *if program.retailNla>=1*
- Free rent and downtime between tenants · `revenue` · class B · source — *if program.retailNla>=1*
- Unrecovered operating costs (net vs gross leases) · `perArea` · class B · source — *if program.retailNla>=1*
- Industrial: clear height, dock doors, trailer parking, sprinklers (ESFR) · `perArea` · class C · quote — *if program.industrialGfa>=1*

**Exit, refinance and disposition**

- Sale commission, legal, marketing at exit · `percentOf` · class A · quote
- Refinance: new lender fees, prepayment penalty · `percentOf` · class A · quote — *if finance.refinance*
- HST on sale of commercial property / new residential (0.13 of price) · `percentOf` · class exact · source


## Adaptive reuse / conversion

*Components:* rental, condo?, commercial? · *Example:* Office-to-residential; Canary District's post-Games conversion (kitchens added to athlete suites)

**Screening and market evidence**

- Market study, appraisal, broker opinion of value · `lumpSum` · class B · quote
- Market data subscriptions (Altus Data Studio, Urbanation, CoStar) · `lumpSum` · class A · source
- Construction cost benchmark (Altus Canadian Cost Guide 2026, released 2026-04-23) · `perArea` · class C · verified
- Concept massing / test-fit · `lumpSum` · class B · quote

**Land acquisition and holding**

- Land purchase price · `lumpSum` · class exact · source
- Ontario land transfer tax · `schedule` · class exact · source
- Toronto municipal land transfer tax (luxury brackets from 2026-04-01: 4.40%–8.60% above $3M) · `schedule` · class exact · verified — *if site.municipality=toronto*
- Non-Resident Speculation Tax (25%) (0.25 of value) · `percentOf` · class exact · verified — *if deal.buyerNonResident*
- HST on land (taxable supply; registrant self-assesses) (0.13 of price) · `percentOf` · class exact · source — *if deal.vacantOrCommercialLand*
- Legal, title insurance, searches · `lumpSum` · class B · quote
- Survey: boundary, topographic, reference plan · `lumpSum` · class B · quote
- Building condition assessment · `lumpSum` · class B · quote — *if site.existingBuilding*
- Zoning review / compliance letter · `schedule` · class exact · source
- Brokerage commission on purchase · `percentOf` · class A · quote
- Land assembly premium and holdout costs · `lumpSum` · class D · quote — *if site.parcelsToAssemble>=2*
- Land loan: interest, fees, lender legal, appraisal · `rate` · class A · quote — *if deal.landLoan*
- Property tax during hold · `rate` · class A · source
- Insurance, security, vacant-building maintenance · `perMonth` · class B · quote
- Interim income from existing tenants (offset) · `perMonth` · class B · source — *if site.existingBuilding*

**Due diligence and studies**

- Phase One ESA (Phase-One-only RSCs no longer filable unless required, since 2025-10-23) · `lumpSum` · class B · verified
- Phase Two ESA: boreholes, sampling, lab · `perUnit` · class B · quote — *if site.contamination=low*
- Phase Two ESA, delineation (high risk) · `perUnit` · class C · quote — *if site.contamination=high*
- Record of Site Condition + MECP filing (O. Reg. 153/04) · `lumpSum` · class B · source — *if site.useChangeToSensitive*
- Risk assessment (alternative to full remediation) · `lumpSum` · class C · quote — *if site.contamination=high*
- Geotechnical investigation (per-borehole pricing; ~0.2–0.4% of construction for low-rise) · `perUnit` · class B · verified
- Hydrogeological study · `lumpSum` · class B · quote — *if site.highWaterTable*
- Designated substance survey (asbestos, lead, mould; O. Reg. 278/05) · `lumpSum` · class B · source — *if site.existingBuilding*
- Arborist report and tree protection plan · `lumpSum` · class B · quote — *if site.protectedTrees>=1*
- Archaeological assessment, Stages 1–4 · `perHectare` · class C · source — *if site.archaeologicalPotential*
- Heritage impact assessment, conservation plan · `lumpSum` · class B · source — *if site.heritage*
- Natural heritage / environmental impact study, species at risk · `lumpSum` · class C · quote — *if site.regulatedArea*
- Transportation impact study, TDM plan, parking study · `lumpSum` · class B · quote
- Noise and vibration study · `lumpSum` · class B · quote
- Rail proximity: safety/vibration study, crash wall or berm design · `lumpSum` · class C · source — *if site.nearRailCorridor*
- Functional servicing and stormwater management report · `lumpSum` · class B · quote
- Energy strategy, energy model, Toronto Green Standard checklist · `lumpSum` · class B · source
- Planning justification report, urban design brief, community consultation · `lumpSum` · class B · quote — *if planning.zba*
- TTC technical review (work within 60 m of TTC infrastructure) · `lumpSum` · class C · verified — *if site.nearTtc60m*
- TTC-required protections, monitoring and design changes · `lumpSum` · class D · quote — *if site.nearTtc60m*
- Metrolinx review / rail corridor agreements · `lumpSum` · class C · source — *if site.nearRailCorridor*
- MTO corridor permits · `lumpSum` · class B · source — *if site.nearHighway*
- Conservation authority permit and review fees (TRCA / CLOCA) · `schedule` · class exact · source — *if site.regulatedArea*
- Floodproofing design and works · `lumpSum` · class D · quote — *if site.floodplain*

**Planning approvals and land-value charges**

- Official plan amendment application fee · `schedule` · class exact · source — *if planning.opa*
- Zoning by-law amendment application fee · `schedule` · class exact · source — *if planning.zba*
- Site plan application fee · `schedule` · class exact · source — *if planning.sitePlan*
- Draft plan of subdivision fee · `schedule` · class exact · source — *if planning.subdivision*
- Draft plan of condominium fee · `schedule` · class exact · source — *if planning.condoPlan*
- Committee of Adjustment fee · `schedule` · class exact · source — *if planning.minorVariance*
- Ontario Land Tribunal appeal: legal and experts · `lumpSum` · class D · quote — *if planning.appealRisk*
- Planner, architect and legal time through approvals · `lumpSum` · class C · quote
- Parkland cash-in-lieu (Planning Act s.42; caps 10% of land value <1 ha, 15% for 1–5 ha) · `percentOf` · class exact · source
- Community Benefits Charge (up to 4% of land value) (0.04 of land value (cap)) · `percentOf` · class exact · source — *if planning.cbcApplies*
- Inclusionary zoning: revenue forgone on affordable set-aside · `revenue` · class B · source — *if planning.inclusionaryZoning*
- Affordable units: rent or price below market · `revenue` · class B · source — *if planning.affordableShare>=0.01*
- Rental replacement units (Toronto Ch. 667: ≥20 years as rental, right of return at similar rent) · `revenue` · class B · source — *if site.existingRentalUnits>=6 and site.municipality=toronto*
- Tenant Assistance Plan: rent-gap and moving compensation · `perUnit` · class C · source — *if site.existingRentalUnits>=6 and site.municipality=toronto*
- Public art (Toronto Percent for Public Art guideline ~1% of gross construction cost, negotiated) (0.01 of gross construction cost) · `percentOf` · class B · source — *if planning.publicArt*
- POPS design, construction and easement · `perArea` · class C · quote — *if planning.pops*
- Site plan / landscaping securities (letter of credit) · `percentOf` · class B · source — *if planning.sitePlan*

**Development charges and levies**

- Toronto DC (June 2025: $52,676 studio/1-bed, $80,690 2+ bed non-rental; rental $33,497 / $48,299 / $45,280) · `perUnit` · class exact · source — *if site.municipality=toronto*
- Toronto DC Reduction Program credit (−40% studio/1-bed, −60% 2+ bed; draft at review) · `perUnit` · class exact · source — *if site.municipality=toronto and policy.torontoDcReduction*
- Oshawa DC (schedule effective 2026-07-01) · `perUnit` · class exact · source — *if site.municipality=oshawa*
- Durham Region DC · `perUnit` · class exact · source — *if site.municipality=oshawa*
- Education development charge · `perUnit` · class exact · source
- Non-residential DCs on retail/office/industrial GFA · `perArea` · class exact · source — *if program.retailNla>=1*
- Statutory purpose-built rental DC discount by bedroom count (DCA s.26.2) · `perUnit` · class exact · source
- Affordable/attainable unit DC exemption (Ontario bulletin effective 2026-07-01) · `perUnit` · class exact · source — *if planning.affordableShare>=0.01*
- DC deferral: payment moved to occupancy/instalments, interest capped by statute (timing, not waiver) · `rate` · class exact · source — *if policy.dcDeferral*
- DC credits for works built by the developer (e.g. transit: 334–350 Bloor St W) · `lumpSum` · class C · verified — *if mp.transitIntegration*
- Long-term care DC exemption (Bill 17) · `perUnit` · class exact · source — *if program.studentOrSeniors*

**Permits, rights-of-way and utilities**

- Building permit fee (Toronto Municipal Code Ch. 363) · `perArea` · class exact · source
- Demolition permit · `schedule` · class exact · source — *if site.existingBuilding*
- Right-of-way: street occupation, hoarding, crane swing, lane closures · `perMonth` · class B · source — *if site.tightUrbanSite*
- Crane-swing and tie-back encroachment agreements with neighbours · `lumpSum` · class D · quote — *if site.tightUrbanSite*
- Water and sewer service connections · `lumpSum` · class B · source
- Off-site servicing capacity upgrades (watermain, sewer) · `perLinear` · class D · quote
- Electrical connection and capacity expansion (Toronto Hydro / Elexicon) · `lumpSum` · class C · quote
- Electrical vault / transformer room · `lumpSum` · class C · quote — *if design.hydroVault*
- Gas, telecom and fibre connections · `lumpSum` · class C · quote
- District energy connection charge · `lumpSum` · class C · quote — *if design.energySystem=district-energy*
- Vehicle entries/exits: curb cuts, ramps, lay-bys, fire route · `perUnit` · class C · quote — *if design.vehicleAccessPoints>=1*
- Boulevard and streetscape restoration (paving, street trees in soil cells, lighting) · `perLinear` · class C · source — *if design.streetscapeM>=1*
- Sign permits (sign by-law) · `schedule` · class exact · source — *if design.signage*

**Demolition, remediation and site preparation**

- Tenant buyouts / RTA compensation (N13) · `perUnit` · class C · source — *if site.existingRentalUnits>=1*
- Commercial lease terminations / relocation · `lumpSum` · class D · quote — *if site.existingCommercialTenants*
- Hazardous materials abatement · `perArea` · class C · quote — *if site.existingBuilding*
- Selective demolition / strip-out for conversion · `perArea` · class C · quote
- Utility disconnections and decommissioning · `lumpSum` · class B · source — *if site.existingBuilding*
- Utility / easement relocation · `lumpSum` · class D · quote — *if site.utilityRelocation*
- Soil and groundwater remediation (dig-and-dump or in-situ) · `perVolume` · class D · quote — *if site.contamination=high*
- Excess soil: characterization, Qualified Person, registry, hauling and tipping (O. Reg. 406/19) · `perVolume` · class C · source — *if site.excessSoilM3>=1*
- Bulk excavation · `perVolume` · class C · quote
- Rock excavation premium · `perVolume` · class D · quote — *if site.rockExcavation*
- Shoring (soldier pile/lagging, caisson, secant) and underpinning · `perArea` · class C · quote — *if construction.shoring*
- Construction dewatering, PTTW/EASR, sewer discharge agreement · `perMonth` · class C · source — *if site.highWaterTable*
- Tree removal permits, replacement or cash-in-lieu (Toronto Ch. 813) · `perUnit` · class exact · source — *if site.protectedTrees>=1*
- Hoarding, fencing, site security · `perMonth` · class B · quote

**Hard construction**

- Hard cost, benchmark $/ft² by building type (Altus low/high) · `perArea` · class C · source
- Substructure and foundations · `perArea` · class C · quote
- Underground parking ($/stall; rises with each level below grade) · `perUnit` · class C · source — *if planning.parkingLevelsBelowGrade>=1*
- Superstructure (concrete, mass timber, steel, wood frame) · `perArea` · class C · quote
- Envelope (window wall, curtain wall, precast, masonry) · `perArea` · class C · quote
- Balconies and guards (thermally broken) · `perUnit` · class C · quote — *if design.balconies*
- Suite interiors and finishes · `perUnit` · class C · quote
- Kitchens/bathrooms added in conversion (Canary District: kitchens installed post-Games) · `perUnit` · class C · source
- Passenger elevators (North America ~$150k+ each for mid-rise; quote per stop) · `perUnit` · class C · quote — *if design.elevators>=1*
- Service / freight elevator · `perUnit` · class C · quote — *if design.serviceElevator*
- Mechanical: HVAC, plumbing, fire protection · `perArea` · class C · quote
- Geoexchange boreholes and heat pumps · `lumpSum` · class D · quote — *if design.energySystem=geoexchange*
- Electrical, lighting, life safety · `perArea` · class C · quote
- Emergency / standby generator · `lumpSum` · class C · quote — *if design.standbyGenerator*
- Emergency responder radio system · `lumpSum` · class C · quote — *if design.emergencyRadio*
- EV-ready conduit and chargers · `perUnit` · class C · source — *if planning.evReadyShare>=0.01*
- Bicycle parking, repair station · `perUnit` · class B · quote — *if planning.bikeParking>=1*
- Green roof (Toronto ≥2,000 m² GFA: 20–60% of available roof; CIL $200/m² for reductions) · `perArea` · class C · verified — *if design.greenRoofM2>=1*
- Solar PV · `lumpSum` · class C · quote — *if design.solarPv*
- Toronto Green Standard higher-tier upgrades · `perArea` · class C · source — *if planning.greenStandardTier>=2*
- Stormwater retention tank, oil-grit separator, LID · `lumpSum` · class C · quote — *if design.stormwaterTank*
- Waste chutes, compactor, City collection room · `lumpSum` · class B · source — *if program.wasteChuteCompactor*
- Loading spaces and dock · `perUnit` · class C · quote — *if planning.loadingSpaces>=1*
- Indoor amenity space build-out · `perArea` · class C · quote — *if planning.amenityIndoorM2PerUnit>=0.1*
- Outdoor amenity space · `perArea` · class C · quote — *if planning.amenityOutdoorM2PerUnit>=0.1*
- Pool (structure, mechanical, finishes) · `lumpSum` · class C · quote — *if program.pool*
- Fitness centre fit-out and equipment · `lumpSum` · class B · quote — *if program.fitness*
- Rooftop terrace / amenity · `perArea` · class C · quote — *if program.rooftopAmenity*
- Co-working, party room, guest suite · `lumpSum` · class B · quote — *if program.coworkingPartyRoom*
- Pet spa / dog run · `lumpSum` · class B · quote — *if program.petSpaDogRun*
- Storage lockers · `perUnit` · class B · quote — *if program.lockers>=1*
- Childcare centre fit-out (outdoor play area, licensing requirements) · `perArea` · class C · quote — *if program.childcare*
- Institutional / community space (shell or turnkey per agreement) · `perArea` · class C · quote — *if program.institutional*
- Retail/office base building shell · `perArea` · class C · quote — *if program.retailNla>=1*
- Soft and hard landscaping · `perArea` · class C · quote — *if design.landscapingM2>=1*
- Building identification, wayfinding and retail signage · `lumpSum` · class B · quote — *if design.signage*
- Entrances, canopies and lobby finishes · `lumpSum` · class C · quote
- Heated ramp / snow-melt · `lumpSum` · class C · quote — *if design.snowMelt*
- General conditions / requirements · `perMonth` · class C · quote
- Tower crane rental, operators, foundations · `perMonth` · class B · quote — *if construction.craneMonths>=1*
- Winter heat and protection · `perMonth` · class C · quote — *if construction.winterMonths>=1*
- Construction manager / GC fee · `percentOf` · class B · quote
- Builder's risk and wrap-up liability insurance · `percentOf` · class B · quote
- Performance and labour & material bonds · `percentOf` · class B · quote
- Design contingency (shrinks with estimate class) · `percentOf` · class C · source
- Construction contingency · `percentOf` · class C · source
- Escalation to spend month (StatCan BCPI: Toronto residential 106.4, Q1 2026, +1.0% y/y) · `indexed` · class C · verified
- Construction Act 10% holdback (cash timing, not cost) · `timing` · class exact · source

**Soft costs**

- Architect (OAA fee guideline) · `percentOf` · class B · source
- Structural, mechanical, electrical, civil engineers · `percentOf` · class B · quote
- Landscape, envelope, acoustic, code, elevator, interior design consultants · `lumpSum` · class B · quote
- Cost consultant / quantity surveyor · `perMonth` · class B · quote
- Project / development manager · `percentOf` · class B · quote
- Legal: corporate, construction contracts, leasing · `lumpSum` · class B · quote
- Accounting, audit and tax advice · `lumpSum` · class B · quote
- Property tax during construction · `rate` · class A · source
- Amenity furniture, fixtures and equipment · `lumpSum` · class B · quote — *if design.ffeAmenity*
- Developer overhead / fee · `percentOf` · class exact · source
- Soft costs as % of hard (allowance until consultants are itemized) · `percentOf` · class C · source
- Soft-cost contingency · `percentOf` · class C · source
- Commissioning and energy verification · `lumpSum` · class B · quote

**Financing**

- Construction loan interest (dated benchmark + spread) · `ledger` · class A · source
- Commitment, standby and extension fees; lender legal; appraisal; cost monitoring · `percentOf` · class A · quote
- Mezzanine / preferred equity (rate, fees, waterfall) · `rate` · class A · quote — *if finance.mezzanine*
- Letters of credit fees (securities, DCs, deposits) · `rate` · class A · quote — *if finance.lettersOfCredit*
- CMHC MLI Select application fee and premium (by points: affordability, accessibility, energy) · `percentOf` · class B · source — *if finance.cmhcMliSelect*
- CMHC Apartment Construction Loan Program terms · `ledger` · class B · source — *if finance.cmhcAclp*
- Interest-rate hedge · `lumpSum` · class B · quote

**Sales and commodity taxes, rebates**

- Self-supply HST on first occupancy of rental (fair market value) (0.13 of FMV) · `percentOf` · class B · source
- Federal GST rental rebate / NRRP / Ontario ENRRP (construction start 2026-04-01 to 2027-03-31) · `percentOf` · class B · source — *if policy.rentalHstRebate*

**Rental lease-up and operations**

- Leasing staff, marketing, model suite · `lumpSum` · class B · quote
- Lease-up concessions (free rent) · `revenue` · class B · source
- Property management fee · `percentOf` · class B · quote
- Payroll, repairs and maintenance, admin · `perUnit` · class B · quote
- Utilities (bulk vs submetered) · `perUnit` · class B · quote
- Property insurance · `perUnit` · class B · quote
- Property tax (Toronto 2026: new multi-residential 0.767311%, multi-residential 1.208792%) · `rate` · class exact · verified
- RentSafeTO registration (3+ storeys and 10+ units) · `perUnit` · class exact · source — *if site.municipality=toronto*
- Concierge and security · `perMonth` · class B · quote — *if program.concierge*
- Capital reserves · `perUnit` · class B · source
- Parking, storage, laundry and telecom income (revenue) · `revenue` · class B · source

**Commercial leasing and operations**

- Tenant improvement allowance / landlord's work · `perArea` · class B · quote — *if program.retailNla>=1*
- Leasing commissions · `perArea` · class B · quote — *if program.retailNla>=1*
- Free rent and downtime between tenants · `revenue` · class B · source — *if program.retailNla>=1*
- Unrecovered operating costs (net vs gross leases) · `perArea` · class B · source — *if program.retailNla>=1*

**Exit, refinance and disposition**

- Sale commission, legal, marketing at exit · `percentOf` · class A · quote
- Refinance: new lender fees, prepayment penalty · `percentOf` · class A · quote — *if finance.refinance*
- HST on sale of commercial property / new residential (0.13 of price) · `percentOf` · class exact · source


## Master-planned community (greenfield or brownfield)

*Components:* portfolio of the above, landSale · *Example:* Lakeview Village: 177-acre brownfield waterfront, 8,050→16,000 units, employment lands, parks, pier

**Screening and market evidence**

- Market study, appraisal, broker opinion of value · `lumpSum` · class B · quote
- Market data subscriptions (Altus Data Studio, Urbanation, CoStar) · `lumpSum` · class A · source
- Construction cost benchmark (Altus Canadian Cost Guide 2026, released 2026-04-23) · `perArea` · class C · verified
- Concept massing / test-fit · `lumpSum` · class B · quote

**Land acquisition and holding**

- Land purchase price · `lumpSum` · class exact · source
- Ontario land transfer tax · `schedule` · class exact · source
- Toronto municipal land transfer tax (luxury brackets from 2026-04-01: 4.40%–8.60% above $3M) · `schedule` · class exact · verified — *if site.municipality=toronto*
- HST on land (taxable supply; registrant self-assesses) (0.13 of price) · `percentOf` · class exact · source — *if deal.vacantOrCommercialLand*
- Legal, title insurance, searches · `lumpSum` · class B · quote
- Survey: boundary, topographic, reference plan · `lumpSum` · class B · quote
- Building condition assessment · `lumpSum` · class B · quote — *if site.existingBuilding*
- Zoning review / compliance letter · `schedule` · class exact · source
- Brokerage commission on purchase · `percentOf` · class A · quote
- Land assembly premium and holdout costs · `lumpSum` · class D · quote — *if site.parcelsToAssemble>=2*
- Land loan: interest, fees, lender legal, appraisal · `rate` · class A · quote — *if deal.landLoan*
- Property tax during hold · `rate` · class A · source
- Insurance, security, vacant-building maintenance · `perMonth` · class B · quote
- Interim income from existing tenants (offset) · `perMonth` · class B · source — *if site.existingBuilding*

**Due diligence and studies**

- Phase One ESA (Phase-One-only RSCs no longer filable unless required, since 2025-10-23) · `lumpSum` · class B · verified
- Phase Two ESA: boreholes, sampling, lab · `perUnit` · class B · quote — *if site.contamination=low*
- Phase Two ESA, delineation (high risk) · `perUnit` · class C · quote — *if site.contamination=high*
- Record of Site Condition + MECP filing (O. Reg. 153/04) · `lumpSum` · class B · source — *if site.useChangeToSensitive*
- Risk assessment (alternative to full remediation) · `lumpSum` · class C · quote — *if site.contamination=high*
- Geotechnical investigation (per-borehole pricing; ~0.2–0.4% of construction for low-rise) · `perUnit` · class B · verified
- Hydrogeological study · `lumpSum` · class B · quote — *if site.highWaterTable*
- Designated substance survey (asbestos, lead, mould; O. Reg. 278/05) · `lumpSum` · class B · source — *if site.existingBuilding*
- Arborist report and tree protection plan · `lumpSum` · class B · quote — *if site.protectedTrees>=1*
- Archaeological assessment, Stages 1–4 · `perHectare` · class C · source — *if site.archaeologicalPotential*
- Heritage impact assessment, conservation plan · `lumpSum` · class B · source — *if site.heritage*
- Natural heritage / environmental impact study, species at risk · `lumpSum` · class C · quote — *if site.regulatedArea*
- Transportation impact study, TDM plan, parking study · `lumpSum` · class B · quote
- Noise and vibration study · `lumpSum` · class B · quote
- Rail proximity: safety/vibration study, crash wall or berm design · `lumpSum` · class C · source — *if site.nearRailCorridor*
- Pedestrian wind and sun/shadow studies · `lumpSum` · class B · quote
- Functional servicing and stormwater management report · `lumpSum` · class B · quote
- Energy strategy, energy model, Toronto Green Standard checklist · `lumpSum` · class B · source
- Planning justification report, urban design brief, community consultation · `lumpSum` · class B · quote — *if planning.zba*
- TTC technical review (work within 60 m of TTC infrastructure) · `lumpSum` · class C · verified — *if site.nearTtc60m*
- TTC-required protections, monitoring and design changes · `lumpSum` · class D · quote — *if site.nearTtc60m*
- Metrolinx review / rail corridor agreements · `lumpSum` · class C · source — *if site.nearRailCorridor*
- MTO corridor permits · `lumpSum` · class B · source — *if site.nearHighway*
- Conservation authority permit and review fees (TRCA / CLOCA) · `schedule` · class exact · source — *if site.regulatedArea*
- Floodproofing design and works · `lumpSum` · class D · quote — *if site.floodplain*

**Planning approvals and land-value charges**

- Official plan amendment application fee · `schedule` · class exact · source — *if planning.opa*
- Zoning by-law amendment application fee · `schedule` · class exact · source — *if planning.zba*
- Site plan application fee · `schedule` · class exact · source — *if planning.sitePlan*
- Draft plan of subdivision fee · `schedule` · class exact · source — *if planning.subdivision*
- Draft plan of condominium fee · `schedule` · class exact · source — *if planning.condoPlan*
- Committee of Adjustment fee · `schedule` · class exact · source — *if planning.minorVariance*
- Ontario Land Tribunal appeal: legal and experts · `lumpSum` · class D · quote — *if planning.appealRisk*
- Planner, architect and legal time through approvals · `lumpSum` · class C · quote
- Parkland cash-in-lieu (Planning Act s.42; caps 10% of land value <1 ha, 15% for 1–5 ha) · `percentOf` · class exact · source
- Community Benefits Charge (up to 4% of land value) (0.04 of land value (cap)) · `percentOf` · class exact · source — *if planning.cbcApplies*
- Inclusionary zoning: revenue forgone on affordable set-aside · `revenue` · class B · source — *if planning.inclusionaryZoning*
- Affordable units: rent or price below market · `revenue` · class B · source — *if planning.affordableShare>=0.01*
- Rental replacement units (Toronto Ch. 667: ≥20 years as rental, right of return at similar rent) · `revenue` · class B · source — *if site.existingRentalUnits>=6 and site.municipality=toronto*
- Tenant Assistance Plan: rent-gap and moving compensation · `perUnit` · class C · source — *if site.existingRentalUnits>=6 and site.municipality=toronto*
- Public art (Toronto Percent for Public Art guideline ~1% of gross construction cost, negotiated) (0.01 of gross construction cost) · `percentOf` · class B · source — *if planning.publicArt*
- POPS design, construction and easement · `perArea` · class C · quote — *if planning.pops*
- Site plan / landscaping securities (letter of credit) · `percentOf` · class B · source — *if planning.sitePlan*

**Development charges and levies**

- Toronto DC (June 2025: $52,676 studio/1-bed, $80,690 2+ bed non-rental; rental $33,497 / $48,299 / $45,280) · `perUnit` · class exact · source — *if site.municipality=toronto*
- Toronto DC Reduction Program credit (−40% studio/1-bed, −60% 2+ bed; draft at review) · `perUnit` · class exact · source — *if site.municipality=toronto and policy.torontoDcReduction*
- Oshawa DC (schedule effective 2026-07-01) · `perUnit` · class exact · source — *if site.municipality=oshawa*
- Durham Region DC · `perUnit` · class exact · source — *if site.municipality=oshawa*
- Education development charge · `perUnit` · class exact · source
- Non-residential DCs on retail/office/industrial GFA · `perArea` · class exact · source — *if program.retailNla>=1*
- Affordable/attainable unit DC exemption (Ontario bulletin effective 2026-07-01) · `perUnit` · class exact · source — *if planning.affordableShare>=0.01*
- DC deferral: payment moved to occupancy/instalments, interest capped by statute (timing, not waiver) · `rate` · class exact · source — *if policy.dcDeferral*
- DC credits for works built by the developer (e.g. transit: 334–350 Bloor St W) · `lumpSum` · class C · verified — *if mp.transitIntegration*
- Long-term care DC exemption (Bill 17) · `perUnit` · class exact · source — *if program.studentOrSeniors*

**Permits, rights-of-way and utilities**

- Building permit fee (Toronto Municipal Code Ch. 363) · `perArea` · class exact · source
- Demolition permit · `schedule` · class exact · source — *if site.existingBuilding*
- Right-of-way: street occupation, hoarding, crane swing, lane closures · `perMonth` · class B · source — *if site.tightUrbanSite*
- Crane-swing and tie-back encroachment agreements with neighbours · `lumpSum` · class D · quote — *if site.tightUrbanSite*
- Off-site servicing capacity upgrades (watermain, sewer) · `perLinear` · class D · quote
- Electrical connection and capacity expansion (Toronto Hydro / Elexicon) · `lumpSum` · class C · quote
- Electrical vault / transformer room · `lumpSum` · class C · quote — *if design.hydroVault*
- Gas, telecom and fibre connections · `lumpSum` · class C · quote
- District energy connection charge · `lumpSum` · class C · quote — *if design.energySystem=district-energy*
- Vehicle entries/exits: curb cuts, ramps, lay-bys, fire route · `perUnit` · class C · quote — *if design.vehicleAccessPoints>=1*
- Boulevard and streetscape restoration (paving, street trees in soil cells, lighting) · `perLinear` · class C · source — *if design.streetscapeM>=1*
- Sign permits (sign by-law) · `schedule` · class exact · source — *if design.signage*

**Demolition, remediation and site preparation**

- Tenant buyouts / RTA compensation (N13) · `perUnit` · class C · source — *if site.existingRentalUnits>=1*
- Commercial lease terminations / relocation · `lumpSum` · class D · quote — *if site.existingCommercialTenants*
- Hazardous materials abatement · `perArea` · class C · quote — *if site.existingBuilding*
- Demolition and disposal · `perArea` · class C · quote — *if site.existingBuilding*
- Utility disconnections and decommissioning · `lumpSum` · class B · source — *if site.existingBuilding*
- Utility / easement relocation · `lumpSum` · class D · quote — *if site.utilityRelocation*
- Soil and groundwater remediation (dig-and-dump or in-situ) · `perVolume` · class D · quote — *if site.contamination=high*
- Excess soil: characterization, Qualified Person, registry, hauling and tipping (O. Reg. 406/19) · `perVolume` · class C · source — *if site.excessSoilM3>=1*
- Rock excavation premium · `perVolume` · class D · quote — *if site.rockExcavation*
- Shoring (soldier pile/lagging, caisson, secant) and underpinning · `perArea` · class C · quote — *if construction.shoring*
- Construction dewatering, PTTW/EASR, sewer discharge agreement · `perMonth` · class C · source — *if site.highWaterTable*
- Tree removal permits, replacement or cash-in-lieu (Toronto Ch. 813) · `perUnit` · class exact · source — *if site.protectedTrees>=1*
- Hoarding, fencing, site security · `perMonth` · class B · quote

**Hard construction**

- Underground parking ($/stall; rises with each level below grade) · `perUnit` · class C · source — *if planning.parkingLevelsBelowGrade>=1*
- Balconies and guards (thermally broken) · `perUnit` · class C · quote — *if design.balconies*
- Passenger elevators (North America ~$150k+ each for mid-rise; quote per stop) · `perUnit` · class C · quote — *if design.elevators>=1*
- Service / freight elevator · `perUnit` · class C · quote — *if design.serviceElevator*
- Geoexchange boreholes and heat pumps · `lumpSum` · class D · quote — *if design.energySystem=geoexchange*
- Emergency / standby generator · `lumpSum` · class C · quote — *if design.standbyGenerator*
- Emergency responder radio system · `lumpSum` · class C · quote — *if design.emergencyRadio*
- EV-ready conduit and chargers · `perUnit` · class C · source — *if planning.evReadyShare>=0.01*
- Bicycle parking, repair station · `perUnit` · class B · quote — *if planning.bikeParking>=1*
- Green roof (Toronto ≥2,000 m² GFA: 20–60% of available roof; CIL $200/m² for reductions) · `perArea` · class C · verified — *if design.greenRoofM2>=1*
- Solar PV · `lumpSum` · class C · quote — *if design.solarPv*
- Toronto Green Standard higher-tier upgrades · `perArea` · class C · source — *if planning.greenStandardTier>=2*
- Stormwater retention tank, oil-grit separator, LID · `lumpSum` · class C · quote — *if design.stormwaterTank*
- Waste chutes, compactor, City collection room · `lumpSum` · class B · source — *if program.wasteChuteCompactor*
- Loading spaces and dock · `perUnit` · class C · quote — *if planning.loadingSpaces>=1*
- Indoor amenity space build-out · `perArea` · class C · quote — *if planning.amenityIndoorM2PerUnit>=0.1*
- Outdoor amenity space · `perArea` · class C · quote — *if planning.amenityOutdoorM2PerUnit>=0.1*
- Pool (structure, mechanical, finishes) · `lumpSum` · class C · quote — *if program.pool*
- Fitness centre fit-out and equipment · `lumpSum` · class B · quote — *if program.fitness*
- Rooftop terrace / amenity · `perArea` · class C · quote — *if program.rooftopAmenity*
- Co-working, party room, guest suite · `lumpSum` · class B · quote — *if program.coworkingPartyRoom*
- Pet spa / dog run · `lumpSum` · class B · quote — *if program.petSpaDogRun*
- Storage lockers · `perUnit` · class B · quote — *if program.lockers>=1*
- Childcare centre fit-out (outdoor play area, licensing requirements) · `perArea` · class C · quote — *if program.childcare*
- Institutional / community space (shell or turnkey per agreement) · `perArea` · class C · quote — *if program.institutional*
- Retail/office base building shell · `perArea` · class C · quote — *if program.retailNla>=1*
- Soft and hard landscaping · `perArea` · class C · quote — *if design.landscapingM2>=1*
- Building identification, wayfinding and retail signage · `lumpSum` · class B · quote — *if design.signage*
- Heated ramp / snow-melt · `lumpSum` · class C · quote — *if design.snowMelt*
- Tower crane rental, operators, foundations · `perMonth` · class B · quote — *if construction.craneMonths>=1*
- Winter heat and protection · `perMonth` · class C · quote — *if construction.winterMonths>=1*
- Builder's risk and wrap-up liability insurance · `percentOf` · class B · quote
- Performance and labour & material bonds · `percentOf` · class B · quote
- Design contingency (shrinks with estimate class) · `percentOf` · class C · source
- Construction contingency · `percentOf` · class C · source
- Escalation to spend month (StatCan BCPI: Toronto residential 106.4, Q1 2026, +1.0% y/y) · `indexed` · class C · verified
- Construction Act 10% holdback (cash timing, not cost) · `timing` · class exact · source

**Soft costs**

- Architect (OAA fee guideline) · `percentOf` · class B · source
- Structural, mechanical, electrical, civil engineers · `percentOf` · class B · quote
- Landscape, envelope, acoustic, code, elevator, interior design consultants · `lumpSum` · class B · quote
- Cost consultant / quantity surveyor · `perMonth` · class B · quote
- Project / development manager · `percentOf` · class B · quote
- Legal: corporate, construction contracts, leasing · `lumpSum` · class B · quote
- Accounting, audit and tax advice · `lumpSum` · class B · quote
- Property tax during construction · `rate` · class A · source
- Amenity furniture, fixtures and equipment · `lumpSum` · class B · quote — *if design.ffeAmenity*
- Developer overhead / fee · `percentOf` · class exact · source
- Soft costs as % of hard (allowance until consultants are itemized) · `percentOf` · class C · source
- Soft-cost contingency · `percentOf` · class C · source

**Financing**

- Construction loan interest (dated benchmark + spread) · `ledger` · class A · source
- Commitment, standby and extension fees; lender legal; appraisal; cost monitoring · `percentOf` · class A · quote
- Mezzanine / preferred equity (rate, fees, waterfall) · `rate` · class A · quote — *if finance.mezzanine*
- Letters of credit fees (securities, DCs, deposits) · `rate` · class A · quote — *if finance.lettersOfCredit*
- Interest-rate hedge · `lumpSum` · class B · quote

**Sales and commodity taxes, rebates**

- HST on construction inputs; input tax credits (taxable supplies) (0.13 of taxable inputs) · `percentOf` · class exact · source

**Rental lease-up and operations**

- Concierge and security · `perMonth` · class B · quote — *if program.concierge*

**Commercial leasing and operations**

- Tenant improvement allowance / landlord's work · `perArea` · class B · quote — *if program.retailNla>=1*
- Leasing commissions · `perArea` · class B · quote — *if program.retailNla>=1*
- Free rent and downtime between tenants · `revenue` · class B · source — *if program.retailNla>=1*
- Unrecovered operating costs (net vs gross leases) · `perArea` · class B · source — *if program.retailNla>=1*

**Exit, refinance and disposition**

- Sale commission, legal, marketing at exit · `percentOf` · class A · quote
- Refinance: new lender fees, prepayment penalty · `percentOf` · class A · quote — *if finance.refinance*
- HST on sale of commercial property / new residential (0.13 of price) · `percentOf` · class exact · source

**Master plan: land development and community infrastructure**

- Land budget: gross → net developable (roads, parks, SWM, NHS, schools) · `percentOf` · class D · source
- Secondary plan / block plan / master environmental servicing plan · `lumpSum` · class D · quote
- Arterial roads ($/m by cross-section; DC background study unit rates) · `perLinear` · class D · source — *if mp.arterialM>=1*
- Collector roads · `perLinear` · class D · source — *if mp.collectorM>=1*
- Local roads, sidewalks, street lighting, street trees · `perLinear` · class D · source — *if mp.localRoadM>=1*
- Watermains · `perLinear` · class D · source — *if mp.watermainM>=1*
- Sanitary sewers · `perLinear` · class D · source — *if mp.sanitaryM>=1*
- Storm sewers · `perLinear` · class D · source — *if mp.stormM>=1*
- Stormwater management ponds / LID · `perUnit` · class D · source — *if mp.swmPonds>=1*
- Pumping station / reservoir · `lumpSum` · class D · source — *if mp.pumpingStation*
- Site grading and earthworks · `perHectare` · class D · quote
- Park design and construction · `perHectare` · class D · source — *if mp.parksHa>=0.01*
- School sites reserved (land value forgone or sold to boards) · `perUnit` · class D · source — *if mp.schoolSites>=1*
- Community centre / library (in-kind or DC-credited) · `lumpSum` · class D · source — *if mp.communityCentre*
- Transit integration: station connection, bus terminal, TTC/Metrolinx works · `lumpSum` · class D · source — *if mp.transitIntegration*
- Shared parking structure · `perUnit` · class D · quote — *if mp.sharedParkingStructure*
- Shoreline / pier / waterfront works (Lakeview: $28M pier contribution) · `lumpSum` · class D · verified — *if mp.shorelineWorks*
- District energy plant and network · `lumpSum` · class D · quote — *if mp.districtEnergy*
- Front-ending / landowner cost-sharing payments and recoveries · `lumpSum` · class D · source — *if mp.frontEnding*
- Subdivision agreement securities and municipal assumption costs · `percentOf` · class C · source — *if planning.subdivision*
- Serviced block/lot sales to builders (revenue) · `revenue` · class C · quote — *if mp.lotSalesToBuilders*
- Employment / innovation district servicing and marketing · `perHectare` · class D · quote — *if mp.employmentHa>=0.01*
- Long-horizon land carry, taxes and inflation across phases · `ledger` · class D · source

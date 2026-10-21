// Mock B: brownfield waterfront master plan, Oshawa / Durham. SYNTHETIC placeholders throughout.
// Shape follows Lakeview Village (a Spanier Group reference project): former industrial waterfront, condo + rental + lots,
// employment/innovation lands, parks, shoreline works, transit connection. Scaled to ~40 ha and three building phases.

import type { CostLine, EstimateClass, Timing } from '../../src/engine/costs'
import type { ProjectInput } from '../../src/engine/project'
import type { PortfolioInput } from '../../src/engine/portfolio'

type LineSpec = [id: string, label: string, amount: number, timing: Timing, estimateClass: EstimateClass, catalogueId?: string]

const lump = ([id, label, amount, timing, estimateClass, catalogueId]: LineSpec): CostLine => ({
  id, label, catalogueId: catalogueId ?? id, driver: { kind: 'lumpSum', amount }, timing, estimateClass,
})
const at = (month: number): Timing => ({ kind: 'month', month })
const spread = (from: number, to: number): Timing => ({ kind: 'spread', from, to })
const percentOfHard = (id: string, label: string, rate: number, timing: Timing, estimateClass: EstimateClass, of = ['hard-benchmark', 'underground-parking']): CostLine => ({
  id, label, catalogueId: id, driver: { kind: 'percentOf', rate, of }, timing, estimateClass,
})

// Oshawa + Durham + education DCs are not yet loaded: per-unit ALLOWANCES at class D until the 2026-07-01 schedules are verified.
const DC_CONDO_PER_UNIT = 55_000
const DC_RENTAL_PER_UNIT = 38_000

function condoTower(id: string, name: string, units1b: number, units2b: number, psf1b: number, psf2b: number): ProjectInput {
  const units = units1b + units2b
  const gcaAbove = Math.round((units1b * 600 + units2b * 850) / 0.82)
  const stalls = Math.round(units * 0.6)
  return {
    id, name,
    program: { lotAreaSqft: null, planningGfaSqft: null, gcaAboveSqft: gcaAbove, gcaBelowSqft: stalls * 350, storeys: Math.ceil(gcaAbove / 2 / 9_000), podiumStoreys: 2 },
    timing: { preConstructionMonths: 12, constructionMonths: 36, exitMonth: 54 },
    costEscalation: 0.025,
    costLines: [
      { id: 'hard-benchmark', label: 'Hard cost, $/ft² GCA (incl. GCs and fee)', catalogueId: 'hard-benchmark', driver: { kind: 'perArea', rate: 330, area: gcaAbove }, timing: { kind: 'construction' }, estimateClass: 'C', escalate: true },
      { id: 'underground-parking', label: 'Underground parking ($/stall)', catalogueId: 'underground-parking', driver: { kind: 'perUnit', rate: 95_000, units: stalls }, timing: { kind: 'spread', from: 13, to: 24 }, estimateClass: 'C', escalate: true },
      { id: 'elevators', label: 'Elevators', catalogueId: 'elevators', driver: { kind: 'perUnit', rate: 400_000, units: Math.ceil(units / 90) }, timing: { kind: 'spread', from: 34, to: 46 }, estimateClass: 'C', escalate: true },
      percentOfHard('soft-costs', 'Design, consultants, management, legal (20% of hard)', 0.2, { kind: 'spread', from: 0, to: 48 }, 'C'),
      percentOfHard('construction-contingency', 'Design + construction contingency (8% of hard)', 0.08, { kind: 'construction' }, 'C'),
      { id: 'dc-allowance', label: 'Oshawa + Durham + education DCs (allowance, verify)', catalogueId: 'dc-city-oshawa', driver: { kind: 'perUnit', rate: DC_CONDO_PER_UNIT, units }, timing: { kind: 'constructionStart' }, estimateClass: 'D' },
      { id: 'building-permit', label: 'Building permit (allowance)', catalogueId: 'building-permit', driver: { kind: 'perArea', rate: 2, area: gcaAbove }, timing: { kind: 'constructionStart' }, estimateClass: 'C' },
      { id: 'tarion', label: 'Tarion enrolment (2024 tier, + HST; verify 2026)', catalogueId: 'tarion-enrolment', driver: { kind: 'perUnit', rate: 1_400 * 1.13, units }, timing: { kind: 'constructionStart' }, estimateClass: 'B' },
      { id: 'hcra', label: 'HCRA oversight fee ($145 + HST)', catalogueId: 'hcra-fee', driver: { kind: 'perUnit', rate: 145 * 1.13, units }, timing: { kind: 'constructionStart' }, estimateClass: 'exact' },
      lump(['sales-centre', 'Sales centre, models, marketing', 2_500_000, spread(0, 12), 'B']),
      lump(['condo-registration', 'Condo registration', 300_000, { kind: 'completion' }, 'B']),
      lump(['reserve-fund-turnover', 'Reserve fund study, performance audit, turnover', 150_000, at(52), 'B']),
      lump(['warranty-reserve', 'Warranty and deficiency reserve', 1_500_000, at(54), 'B']),
      percentOfHard('lender-fees', 'Lender fees and monitoring', 0.0075, { kind: 'constructionStart' }, 'A'),
      percentOfHard('builders-risk-wrap', "Builder's risk and wrap-up", 0.006, { kind: 'constructionStart' }, 'B'),
    ],
    components: [{
      kind: 'condo', id: 'suites',
      units: [{ id: '1b', count: units1b, netSqftPerUnit: 600, pricePerSqft: psf1b }, { id: '2b', count: units2b, netSqftPerUnit: 850, pricePerSqft: psf2b }],
      salesStartMonth: 0, salesPerMonth: Math.round(units / 16), depositFraction: 0.2, depositsUsable: false,
      occupancyMonths: 4, occupancyFeePerUnitMonthly: 1_100, commissionFraction: 0.04,
      revenueBand: { low: -0.1, high: 0.06 },
    }],
    debt: { annualRate: 0.065, ltc: 0.75, ltv: 0.65, dscr: 1.25, amortizationYears: 25, sweepAfterCompletion: true, presaleThreshold: 0.7 },
    exit: { sellingCostFraction: 0 },
    discountRate: 0.08,
  }
}

function rentalBlock(id: string, name: string, scale: number, retailSqft: number, rentLift: number): ProjectInput {
  const u = (n: number) => Math.round(n * scale)
  const mix = [
    { id: 'studio', count: u(30), netSqftPerUnit: 450, monthlyRent: 1_750 * rentLift, vacancy: 0.03 },
    { id: 'one_bed', count: u(99), netSqftPerUnit: 600, monthlyRent: 2_100 * rentLift, vacancy: 0.03 },
    { id: 'one_bed_affordable', count: u(11), netSqftPerUnit: 600, monthlyRent: 1_450, vacancy: 0.01 },
    { id: 'two_bed', count: u(70), netSqftPerUnit: 850, monthlyRent: 2_650 * rentLift, vacancy: 0.03 },
    { id: 'three_bed', count: u(10), netSqftPerUnit: 1_050, monthlyRent: 3_100 * rentLift, vacancy: 0.04 },
  ]
  const units = mix.reduce((s, m) => s + m.count, 0)
  const affordable = mix.find((m) => m.id === 'one_bed_affordable')!.count
  const gca = Math.round(units * 1_000 + retailSqft * 1.1)
  const stalls = Math.round(units * 0.8)
  const project: ProjectInput = {
    id, name,
    program: { lotAreaSqft: null, planningGfaSqft: null, gcaAboveSqft: gca, gcaBelowSqft: stalls * 350, storeys: Math.min(12, Math.ceil(gca / 30_000)), podiumStoreys: retailSqft > 0 ? 1 : 0 },
    timing: { preConstructionMonths: 12, constructionMonths: 30, exitMonth: 108 },
    costEscalation: 0.025,
    costLines: [
      { id: 'hard-benchmark', label: 'Hard cost, $/ft² GCA (incl. GCs and fee)', catalogueId: 'hard-benchmark', driver: { kind: 'perArea', rate: 300, area: gca }, timing: { kind: 'construction' }, estimateClass: 'C', escalate: true },
      { id: 'underground-parking', label: 'Underground parking ($/stall)', catalogueId: 'underground-parking', driver: { kind: 'perUnit', rate: 85_000, units: stalls }, timing: { kind: 'spread', from: 13, to: 22 }, estimateClass: 'C', escalate: true },
      { id: 'elevators', label: 'Elevators', catalogueId: 'elevators', driver: { kind: 'perUnit', rate: 300_000, units: Math.ceil(units / 90) }, timing: { kind: 'spread', from: 30, to: 40 }, estimateClass: 'C', escalate: true },
      percentOfHard('soft-costs', 'Design, consultants, management, legal (18% of hard)', 0.18, { kind: 'spread', from: 0, to: 42 }, 'C'),
      percentOfHard('construction-contingency', 'Design + construction contingency (7% of hard)', 0.07, { kind: 'construction' }, 'C'),
      { id: 'dc-allowance', label: 'Rental DCs net of statutory discount; affordable exempt (allowance, verify)', catalogueId: 'dc-region-durham', driver: { kind: 'perUnit', rate: DC_RENTAL_PER_UNIT, units: units - affordable }, timing: { kind: 'constructionStart' }, estimateClass: 'D' },
      { id: 'building-permit', label: 'Building permit (allowance)', catalogueId: 'building-permit', driver: { kind: 'perArea', rate: 2, area: gca }, timing: { kind: 'constructionStart' }, estimateClass: 'C' },
      lump(['leasing-marketing', 'Leasing team and marketing', 600_000, spread(40, 56), 'B']),
      percentOfHard('lender-fees', 'Lender fees and monitoring', 0.0075, { kind: 'constructionStart' }, 'A'),
      percentOfHard('builders-risk-wrap', "Builder's risk and wrap-up", 0.006, { kind: 'constructionStart' }, 'B'),
    ],
    components: [{
      kind: 'rental', id: 'residential', unitMix: mix, otherIncomeMonthly: stalls * 120, opexPerUnitMonthly: 650,
      leaseUpMonths: 14, rentGrowth: 0.025, opexInflation: 0.03, exitCapRate: 0.0475,
      revenueBand: { low: -0.08, high: 0.06 }, capRateBand: { low: -0.06, high: 0.12 },
    }],
    debt: {
      annualRate: 0.065, ltc: 0.75, ltv: 0.65, dscr: 1.1, amortizationYears: 50,
      refinance: { month: 58, annualRate: 0.0425, amortizationYears: 50, dscr: 1.1, ltv: 0.85, feeFraction: 0.03 },
    },
    exit: { sellingCostFraction: 0.015 },
    discountRate: 0.075,
  }
  if (retailSqft > 0) {
    project.components.push({
      kind: 'commercial', id: 'retail', use: 'retail', netLeasableSqft: retailSqft, rentPerSqftYear: 32, rentGrowth: 0.02, vacancy: 0.06,
      leaseUpMonths: 12, freeRentMonths: 4, tiPerSqft: 60, leasingCommissionPerSqft: 12, unrecoveredOpexPerSqftYear: 2.5, exitCapRate: 0.06,
      revenueBand: { low: -0.15, high: 0.1 },
    })
    project.costLines.push({ id: 'dc-non-residential', label: 'Non-residential DC on retail (allowance)', catalogueId: 'dc-non-residential', driver: { kind: 'perArea', rate: 15, area: retailSqft }, timing: { kind: 'constructionStart' }, estimateClass: 'D' })
  }
  return project
}

const lotSales: ProjectInput = {
  id: 'block-d-lots', name: 'Block D: serviced lots sold to a builder',
  timing: { preConstructionMonths: 0, constructionMonths: 1, exitMonth: 36 },
  costEscalation: 0,
  costLines: [
    lump(['lot-marketing-legal', 'Marketing, legal and closing', 450_000, spread(18, 36), 'B', 'sale-costs']),
    lump(['servicing-securities', 'Subdivision securities (LC fees)', 400_000, spread(0, 36), 'C']),
  ],
  components: [{
    kind: 'landSale', id: 'lots',
    // 60 lots × 36 ft frontage × $22,000/front-ft, in four tranches
    sales: [24, 28, 32, 36].map((month) => ({ month, amount: 15 * 36 * 22_000, label: '15 lots' })),
    revenueBand: { low: -0.15, high: 0.1 },
  }],
  debt: { annualRate: 0.065, ltc: 0, ltv: 0, dscr: 1.25, amortizationYears: 25 },
  exit: { sellingCostFraction: 0 },
  discountRate: 0.08,
}

const innovationOffice: ProjectInput = {
  id: 'block-g-office', name: 'Block G: innovation-district office',
  program: { lotAreaSqft: null, planningGfaSqft: null, gcaAboveSqft: 140_000, gcaBelowSqft: 0, storeys: 8 },
  timing: { preConstructionMonths: 12, constructionMonths: 26, exitMonth: 96 },
  costEscalation: 0.025,
  costLines: [
    { id: 'hard-benchmark', label: 'Office hard cost, $/ft² GCA', catalogueId: 'hard-benchmark', driver: { kind: 'perArea', rate: 380, area: 140_000 }, timing: { kind: 'construction' }, estimateClass: 'C', escalate: true },
    percentOfHard('soft-costs', 'Design, consultants, management, legal (20% of hard)', 0.2, { kind: 'spread', from: 0, to: 38 }, 'C', ['hard-benchmark']),
    percentOfHard('construction-contingency', 'Contingency (7% of hard)', 0.07, { kind: 'construction' }, 'C', ['hard-benchmark']),
    { id: 'dc-non-residential', label: 'Non-residential DCs (allowance)', catalogueId: 'dc-non-residential', driver: { kind: 'perArea', rate: 15, area: 140_000 }, timing: { kind: 'constructionStart' }, estimateClass: 'D' },
  ],
  components: [{
    kind: 'commercial', id: 'office', use: 'office', netLeasableSqft: 120_000, rentPerSqftYear: 28, rentGrowth: 0.02, vacancy: 0.08,
    leaseUpMonths: 24, freeRentMonths: 6, tiPerSqft: 70, leasingCommissionPerSqft: 14, unrecoveredOpexPerSqftYear: 3, exitCapRate: 0.0675,
    revenueBand: { low: -0.2, high: 0.1 }, capRateBand: { low: -0.05, high: 0.15 },
  }],
  debt: { annualRate: 0.068, ltc: 0.6, ltv: 0.6, dscr: 1.3, amortizationYears: 25 },
  exit: { sellingCostFraction: 0.015 },
  discountRate: 0.085,
}

// ~3,300 homes on 40 ha gross / ~22 ha net: about 150 units per net ha, still below Lakeview's ~220 per gross ha.
const phase1: PortfolioInput = {
  id: 'phase-1', name: 'Phase 1', discountRate: 0.08, costEscalation: 0.025, costLines: [],
  children: [
    { offsetMonths: 0, node: condoTower('block-a-condo', 'Block A: condo towers', 360, 240, 850, 820) },
    { offsetMonths: 6, node: rentalBlock('block-b-rental', 'Block B: rental + retail podium', 2.1, 15_000, 1) },
    { offsetMonths: 0, node: lotSales },
  ],
}

const phase2: PortfolioInput = {
  id: 'phase-2', name: 'Phase 2', discountRate: 0.08, costEscalation: 0.025, costLines: [],
  children: [
    { offsetMonths: 0, node: condoTower('block-e-condo', 'Block E: condo towers', 390, 260, 880, 850) },
    { offsetMonths: 6, node: rentalBlock('block-f-rental', 'Block F: rental', 2.3, 0, 1.04) },
    { offsetMonths: 12, node: innovationOffice },
  ],
}

const phase3: PortfolioInput = {
  id: 'phase-3', name: 'Phase 3', discountRate: 0.08, costEscalation: 0.025, costLines: [],
  children: [
    { offsetMonths: 0, node: condoTower('block-h-condo', 'Block H: condo towers', 360, 240, 910, 880) },
    { offsetMonths: 6, node: rentalBlock('block-i-rental', 'Block I: rental', 2.1, 0, 1.08) },
  ],
}

const S = (from: number, to: number) => spread(from, to)
const sharedLines: LineSpec[] = [
  ['land-price', 'Land, 40 ha former industrial waterfront', 70_000_000, at(0), 'exact'],
  ['ontario-ltt', 'Ontario LTT (non-single-family brackets, to verify)', 1_396_475, at(0), 'exact'],
  ['acquisition-legal', 'Acquisition legal, title, survey', 600_000, at(0), 'B'],
  ['holding-tax', 'Property tax and carry on land across phases', 7_200_000, S(0, 96), 'C', 'long-horizon-carry'],
  ['phase-two-esa-high', 'Phase Two ESA and delineation (120 boreholes)', 720_000, S(1, 6), 'C'],
  ['risk-assessment', 'Risk assessment', 1_200_000, S(4, 16), 'C'],
  ['rsc', 'Records of Site Condition, by phase', 240_000, S(20, 60), 'B'],
  ['archaeology', 'Archaeological assessment, 40 ha', 320_000, S(2, 10), 'C'],
  ['natural-heritage', 'Natural heritage / shoreline EIS', 250_000, S(2, 10), 'C'],
  ['rail-safety', 'Rail proximity study and mitigation design', 300_000, S(4, 12), 'C'],
  ['conservation-authority', 'CLOCA permits and review fees', 200_000, S(6, 30), 'B'],
  ['metrolinx-review', 'Metrolinx review (GO corridor)', 150_000, S(6, 24), 'C'],
  ['secondary-block-plan', 'Secondary plan, block plan, MESP', 4_000_000, S(0, 24), 'D'],
  ['fee-opa', 'OPA fee (allowance)', 300_000, at(4), 'C'],
  ['fee-zba', 'ZBA fee (allowance)', 400_000, at(4), 'C'],
  ['fee-subdivision', 'Draft plan of subdivision fee (allowance)', 500_000, at(8), 'C'],
  ['planning-consultants', 'Planning, design and legal through approvals', 3_000_000, S(0, 30), 'C'],
  ['abatement', 'Industrial abatement', 1_200_000, S(10, 14), 'C'],
  ['demolition', 'Industrial demolition (400,000 ft²)', 4_000_000, S(12, 18), 'C'],
  ['remediation', 'Brownfield remediation', 38_000_000, S(12, 36), 'D'],
  ['excess-soil', 'Excess soil, 250,000 m³', 11_250_000, S(18, 48), 'D'],
  ['grading-earthworks', 'Site grading, 40 ha', 6_000_000, S(18, 30), 'D'],
  ['roads-arterial', 'Arterial road, 800 m', 7_200_000, S(24, 42), 'D'],
  ['roads-collector', 'Collector roads, 1,600 m', 9_600_000, S(24, 72), 'D'],
  ['roads-local', 'Local roads, 2,400 m', 10_800_000, S(26, 84), 'D'],
  ['watermain', 'Watermains, 4,000 m', 4_800_000, S(24, 72), 'D'],
  ['sanitary', 'Sanitary sewers, 3,800 m', 5_700_000, S(24, 72), 'D'],
  ['storm', 'Storm sewers, 3,800 m', 6_840_000, S(24, 72), 'D'],
  ['swm-ponds', 'Stormwater ponds (2)', 7_000_000, S(24, 36), 'D'],
  ['pumping-station', 'Sanitary pumping station', 8_000_000, S(26, 40), 'D'],
  ['parks-build', 'Parks, 6 ha', 7_200_000, S(40, 96), 'D'],
  ['community-centre', 'Community centre (in-kind)', 15_000_000, S(70, 96), 'D'],
  ['dc-credits', 'DC credits for in-kind community centre and roads (offset)', -15_000_000, S(36, 96), 'D'],
  ['transit-integration', 'GO station connection and bus loop', 12_000_000, S(48, 72), 'D'],
  ['shoreline-works', 'Shoreline, promenade and pier works', 18_000_000, S(36, 72), 'D'],
  ['employment-lands', 'Employment-lands servicing, 4 ha', 1_600_000, S(60, 72), 'D'],
  ['front-ending', 'Front-ending recovery from neighbouring landowners (offset)', -6_000_000, at(90), 'D'],
  ['servicing-securities', 'Subdivision securities and assumption costs', 1_500_000, S(24, 96), 'C'],
]

export const mockB: PortfolioInput = {
  id: 'mock-b', name: 'Mock B: Durham waterfront master plan', discountRate: 0.08, costEscalation: 0.025,
  costLines: sharedLines.map(lump),
  children: [
    { offsetMonths: 30, node: phase1 },
    { offsetMonths: 66, node: phase2 },
    { offsetMonths: 102, node: phase3 },
  ],
}

export const mockBMeta = {
  id: 'mock-b',
  dataClass: 'synthetic' as const,
  projectType: 'master-plan',
  name: mockB.name,
  reference: 'Shape follows Lakeview Village (Spanier Group reference project): 177-acre former generating-station waterfront, 8,050 → 16,000 units by MZO, 5% affordable + 5% other tenures, 14+ acres employment, parks, $28M pier contribution. Scaled to 40 ha, three phases and ~3,300 homes.',
  notes: [
    'Every number is a SYNTHETIC placeholder unless a label says otherwise.',
    'Land, remediation and community infrastructure sit at the master-plan level and are equity-funded (no portfolio-level facility yet).',
    'Oshawa/Durham DCs are class-D allowances until the 2026-07-01 schedules are loaded and verified.',
    'Unit counts and areas are synthetic; schools are reserved sites (land forgone), not built costs.',
  ],
  attributes: {
    'site.municipality': 'oshawa', 'site.areaHa': 40, 'site.existingBuilding': true, 'site.existingRentalUnits': 0,
    'site.existingCommercialTenants': false, 'site.contamination': 'high', 'site.useChangeToSensitive': true, 'site.excessSoilM3': 250_000,
    'site.highWaterTable': true, 'site.rockExcavation': false, 'site.regulatedArea': true, 'site.floodplain': false, 'site.heritage': false,
    'site.archaeologicalPotential': true, 'site.protectedTrees': 40, 'site.nearTtc60m': false, 'site.nearRailCorridor': true,
    'site.nearHighway': false, 'site.majorTransitStationArea': true, 'site.utilityRelocation': true, 'site.tightUrbanSite': false,
    'site.parcelsToAssemble': 1, 'site.waterfront': true, 'site.lat': 43.8686, 'site.lng': -78.8366,
    'site.municipalityName': 'OSHAWA', 'site.region': 'DURHAM', 'site.greenbelt': false, 'site.conservationAuthority': 'Central Lake Ontario Conservation', 'site.nearAerodrome': true,
    'site.secondaryPlan': 'new secondary plan through the OPA (synthetic)',
    'site.airportZoning': false, 'site.nearMajorFacility': true, 'site.transitInfrastructureBelow': false, 'site.publicUniversityLand': false,
    'deal.vacantOrCommercialLand': true, 'deal.buyerNonResident': false, 'deal.landLoan': false, 'deal.holdMonths': 30,
    'planning.opa': true, 'planning.zba': true, 'planning.sitePlan': true, 'planning.subdivision': true, 'planning.condoPlan': true,
    'planning.minorVariance': false, 'planning.appealRisk': false, 'planning.mzo': false, 'planning.storeys': 30,
    'planning.residentialUnits': 3_300, 'planning.affordableShare': 0.05, 'planning.inclusionaryZoning': false,
    'planning.parklandOnSite': true, 'planning.cbcApplies': false, 'planning.publicArt': false, 'planning.pops': false,
    'planning.greenStandardTier': '1', 'planning.carParkingStalls': 2_400, 'planning.parkingLevelsBelowGrade': 2,
    'planning.bikeParking': 1_200, 'planning.evReadyShare': 0.2, 'planning.loadingSpaces': 6,
    'planning.amenityIndoorM2PerUnit': 2, 'planning.amenityOutdoorM2PerUnit': 2, 'planning.rentalReplacementUnits': 0,
    'program.tenure': 'mixed', 'program.retailNla': 15_000, 'program.officeNla': 120_000, 'program.industrialGfa': 0,
    'program.institutional': true, 'program.childcare': false, 'program.studentOrSeniors': false,
    'design.elevators': 40, 'design.vehicleAccessPoints': 8, 'design.signage': true, 'design.landscapingM2': 20_000,
    'design.streetscapeM': 2_400, 'design.energySystem': 'heat-pump', 'design.balconies': true,
    'construction.escalation': 0.025,
    'finance.cmhcMliSelect': true, 'finance.refinance': true, 'finance.depositInsurance': false, 'finance.lettersOfCredit': true, 'finance.mezzanine': false,
    'policy.dcDeferral': false, 'policy.torontoDcReduction': false, 'policy.rentalHstRebate': true, 'policy.newHomeRebates': true,
    'mp.grossHa': 40, 'mp.netDevelopableShare': 0.55, 'mp.phases': 3, 'mp.arterialM': 800, 'mp.collectorM': 1_600, 'mp.localRoadM': 2_400,
    'mp.watermainM': 4_000, 'mp.sanitaryM': 3_800, 'mp.stormM': 3_800, 'mp.swmPonds': 2, 'mp.pumpingStation': true, 'mp.parksHa': 6,
    'mp.schoolSites': 1, 'mp.communityCentre': true, 'mp.transitIntegration': true, 'mp.sharedParkingStructure': false,
    'mp.employmentHa': 4, 'mp.shorelineWorks': true, 'mp.districtEnergy': false, 'mp.frontEnding': true, 'mp.lotSalesToBuilders': true,
    'design.hydroVault': true, 'construction.shoring': true, 'design.serviceElevator': true, 'design.standbyGenerator': true,
    'design.emergencyRadio': true, 'design.greenRoofM2': 0, 'design.solarPv': false, 'design.stormwaterTank': true,
    'program.wasteChuteCompactor': true, 'program.pool': false, 'program.fitness': true, 'program.rooftopAmenity': true,
    'program.coworkingPartyRoom': true, 'program.petSpaDogRun': true, 'program.lockers': 1_500, 'design.snowMelt': false,
    'construction.craneMonths': 30, 'construction.winterMonths': 10, 'design.ffeAmenity': true, 'program.concierge': false,
  },
  /** Every applicable catalogue item that is not its own cost line, and where it went. */
  coverage: {
    ...Object.fromEntries([
      'balconies', 'retail-shell', 'hydro-vault', 'shoring', 'service-elevator', 'standby-generator', 'emergency-radio',
      'stormwater-tank', 'waste-systems', 'fitness', 'rooftop-amenity', 'cowork-party-guest', 'pet-amenity', 'lockers',
      'tower-crane', 'winter-conditions', 'amenity-indoor', 'amenity-outdoor', 'loading', 'ev-charging', 'bike-parking',
      'landscaping', 'signage-wayfinding', 'hoarding-fencing', 'curb-cuts-access', 'dewatering', 'amenity-ffe',
    ].map((id) => [id, 'benchmark: inside each block’s $/ft² hard cost'])),
    ...Object.fromEntries([
      'architect', 'engineers', 'specialist-consultants', 'cost-consultant', 'project-manager', 'legal-general', 'accounting-audit',
      'construction-tax', 'developer-fee', 'soft-contingency', 'geotech', 'hydrogeology', 'transportation-study', 'noise-vibration',
      'wind-shadow', 'servicing-report', 'energy-strategy', 'planning-justification', 'fee-site-plan', 'fee-condo-plan',
      'demolition-permit', 'sign-permits', 'hydro-connection', 'gas-telecom', 'market-study', 'feasibility-massing', 'survey',
      'zoning-certificate', 'arborist', 'phase-one-esa', 'building-condition', 'dss', 'navcanada-land-use', 'secondary-plan-review',
    ].map((id) => [id, 'allowance: inside each block’s 18–20% soft-cost line or the master-plan studies lines'])),
    'design-contingency': 'line: blocks carry one 7–8% design + construction contingency',
    'utility-disconnects': 'line: inside industrial demolition',
    'tree-removal': 'line: inside site grading',
    'streetscape': 'line: inside local and collector road $/m',
    'servicing-capacity-upgrade': 'line: master-plan watermain and sewer lines',
    'holding-tax': 'line: long-horizon carry',
    'site-plan-securities': 'line: servicing-securities',
    'letters-of-credit': 'line: servicing-securities',
    'institutional-shell': 'line: community centre',
    'edc': 'line: block DC allowances include education DCs',
    'dc-affordable-exemption': 'line: rental DC allowance excludes affordable units',
    'parkland-cil': 'excluded: parkland dedicated on site (parks line)',
    'lot-sales': 'component: Block D land-sale component',
    'affordable-revenue-loss': 'component: affordable unit types at below-market rents',
    'concierge-security': 'component: rental opex',
    'tenant-improvements': 'component: retail and office TI',
    'leasing-commissions': 'component: retail and office leasing',
    'free-rent-downtime': 'component: retail and office free rent',
    'unrecovered-opex': 'component: retail and office unrecovered opex',
    'escalation': 'engine: escalate flag at 2.5%/yr',
    'construction-interest': 'engine: monthly construction-loan ledgers per block',
    'refinance-costs': 'engine: rental refinance fee 3%',
    'cost-benchmark': 'line: block hard-benchmark lines',
    'holding-income': 'excluded: vacant industrial site',
    'brokerage': 'excluded: direct purchase',
    'bonding': 'excluded: construction-management delivery',
    'interest-rate-hedge': 'excluded: unhedged',
    'data-subscriptions': 'excluded: corporate overhead',
    'pre-consultation': 'allowance: inside the master-plan studies lines',
    'grading-review': 'allowance: inside the master-plan studies lines',
    'frontage-charge': 'gap: Oshawa/Durham frontage and local-improvement charges not yet loaded',
    'driveway-permit': 'allowance: inside each block’s soft-cost line',
    'holding-insurance-security': 'gap: site security during the 30-month pre-development hold',
    'utility-relocation': 'gap: easements flagged but not estimated',
    'compatibility-study': 'allowance: inside the master-plan studies lines (former industrial neighbours)',
    'land-budget': 'gap: net-developable split stated (55%) but not an explicit land-budget table',
    'school-sites': 'gap: reserved school site value not quantified',
    'hst-on-land': 'gap: GST/HST timing not modelled yet (C17)',
    'hst-inputs': 'gap: GST/HST timing not modelled yet (C17)',
    'hst-on-sale': 'gap: GST/HST timing not modelled yet (C17)',
    'holdback': 'gap: Construction Act holdback cash timing not modelled yet',
  } as Record<string, string>,
}

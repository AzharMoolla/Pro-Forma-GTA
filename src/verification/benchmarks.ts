// Benchmark against published pro formas with known answers. Pure: builds engine inputs from a study's published
// assumptions, solves the residual land value the way the study does, and compares with the study's stated result.
//
// Source: N. Barry Lyon Consultants (NBLC), "Inclusionary Zoning Evaluation" for the Region of Peel, Mississauga,
// Brampton and Caledon, December 2021 (revised), Tables 3–8. Published at
// https://peelregion.ca/sites/default/files/2024-08/nblc-iz-feasibility-analysis-dec-2021.pdf
// Figures are transcribed as facts (inputs and stated results), not the study's model; the model here is ours.
//
// Where the study states an input it is used as stated (STUDY). Where it is silent (timing, parking area, how HST is
// netted, deposits) this file makes one explicit assumption, used for every site alike (ASSUMED), so a miss can be
// traced to a named cause rather than tuned away.

import type { CostLine } from '../engine/costs'
import { runNode } from '../engine/portfolio'
import type { ProjectInput } from '../engine/project'

export type Municipality = 'caledon' | 'brampton' | 'mississauga' | 'toronto'

/** Cost inputs resolved for one site: Peel sites derive them from Table 5; Toronto sites carry the 2019 study's. */
export interface SiteCosts {
  hardPsf: number
  parkingPsf: number
  dcTotal: number
  parkland: { ofLand: number; perUnit: number }
  feesTotal: number
  taxRate: number
  cbcOfLand: number
  loanRate: number
  opexRatio: number
}

export interface StudySite {
  name: string
  municipality: Municipality
  acres: number
  storeys: number
  units: number
  gfaSqft: number
  /** Table 4: average unit size (ft²), residential and visitor parking ratios, condo price $/ft², parking stall price, sales per month, rent $/ft²/month, parking rent $/month, exit cap */
  unitSqft: number
  parkingRes: number
  parkingVisitor: number
  condoPsf: number
  stallPrice: number
  salesPerMonth: number
  rentPsfMonth: number
  stallRentMonth: number
  capRate: number
  /** 50% DC waiver (Downtown Brampton community improvement plan) */
  dcWaiver?: number
  /** Stated residual land values, current policy (no IZ), Tables 6–8 */
  stated: { condo: number; rental: number }
  /** Resolved cost inputs when the site is not a Peel site */
  costs?: SiteCosts
}

const M = 1_000_000
/** Tables 3, 4, 6–8 (current policy columns). */
export const NBLC_PEEL_2021: StudySite[] = [
  { name: 'Bolton', municipality: 'caledon', acres: 1.5, storeys: 6, units: 55, gfaSqft: 56_325, unitSqft: 850, parkingRes: 1.5, parkingVisitor: 0.25, condoPsf: 700, stallPrice: 35_000, salesPerMonth: 3, rentPsfMonth: 2.5, stallRentMonth: 80, capRate: 0.0475, stated: { condo: 1.76 * M, rental: -4.1 * M } },
  { name: 'Mount Pleasant', municipality: 'brampton', acres: 0.72, storeys: 9, units: 189, gfaSqft: 170_783, unitSqft: 750, parkingRes: 1, parkingVisitor: 0.2, condoPsf: 800, stallPrice: 35_000, salesPerMonth: 7.5, rentPsfMonth: 2.7, stallRentMonth: 80, capRate: 0.0425, stated: { condo: 6.16 * M, rental: -7.22 * M } },
  { name: 'Gateway', municipality: 'brampton', acres: 1, storeys: 27, units: 195, gfaSqft: 176_453, unitSqft: 750, parkingRes: 1, parkingVisitor: 0.2, condoPsf: 775, stallPrice: 40_000, salesPerMonth: 10, rentPsfMonth: 2.7, stallRentMonth: 80, capRate: 0.0425, stated: { condo: 3.43 * M, rental: -9.94 * M } },
  { name: 'Downtown Brampton (high-rise)', municipality: 'brampton', acres: 0.84, storeys: 39, units: 506, gfaSqft: 442_275, unitSqft: 725, parkingRes: 0.5, parkingVisitor: 0.1, condoPsf: 800, stallPrice: 40_000, salesPerMonth: 10, rentPsfMonth: 2.8, stallRentMonth: 100, capRate: 0.0425, dcWaiver: 0.5, stated: { condo: 20.79 * M, rental: -0.38 * M } },
  { name: 'Downtown Brampton (mid-rise)', municipality: 'brampton', acres: 0.48, storeys: 10, units: 95, gfaSqft: 83_398, unitSqft: 725, parkingRes: 0.5, parkingVisitor: 0.1, condoPsf: 800, stallPrice: 40_000, salesPerMonth: 10, rentPsfMonth: 2.8, stallRentMonth: 100, capRate: 0.0425, dcWaiver: 0.5, stated: { condo: 6.17 * M, rental: -0.15 * M } },
  { name: 'Bramalea', municipality: 'brampton', acres: 1.9, storeys: 21, units: 359, gfaSqft: 324_020, unitSqft: 750, parkingRes: 1, parkingVisitor: 0.2, condoPsf: 775, stallPrice: 40_000, salesPerMonth: 10, rentPsfMonth: 2.7, stallRentMonth: 100, capRate: 0.0425, stated: { condo: 5.75 * M, rental: -14.32 * M } },
  { name: 'Uptown (Eglinton)', municipality: 'mississauga', acres: 1, storeys: 30, units: 300, gfaSqft: 253_012, unitSqft: 700, parkingRes: 0.96, parkingVisitor: 0.15, condoPsf: 900, stallPrice: 45_000, salesPerMonth: 15, rentPsfMonth: 3.2, stallRentMonth: 100, capRate: 0.04, stated: { condo: 15.79 * M, rental: 5.2 * M } },
  { name: 'Mississauga City Centre', municipality: 'mississauga', acres: 1, storeys: 40, units: 500, gfaSqft: 406_627, unitSqft: 675, parkingRes: 0.86, parkingVisitor: 0.15, condoPsf: 1000, stallPrice: 50_000, salesPerMonth: 20, rentPsfMonth: 3.4, stallRentMonth: 125, capRate: 0.04, stated: { condo: 32.88 * M, rental: 6.73 * M } },
  { name: 'Fairview', municipality: 'mississauga', acres: 1, storeys: 30, units: 300, gfaSqft: 253_012, unitSqft: 700, parkingRes: 0.97, parkingVisitor: 0.15, condoPsf: 975, stallPrice: 45_000, salesPerMonth: 20, rentPsfMonth: 3.2, stallRentMonth: 100, capRate: 0.04, stated: { condo: 23.76 * M, rental: 3.74 * M } },
  { name: 'Cooksville', municipality: 'mississauga', acres: 1, storeys: 25, units: 250, gfaSqft: 210_843, unitSqft: 700, parkingRes: 0.86, parkingVisitor: 0.15, condoPsf: 950, stallPrice: 40_000, salesPerMonth: 15, rentPsfMonth: 3.15, stallRentMonth: 100, capRate: 0.04, stated: { condo: 17.94 * M, rental: 3.31 * M } },
  { name: 'Tomken', municipality: 'mississauga', acres: 1, storeys: 6, units: 100, gfaSqft: 87_349, unitSqft: 725, parkingRes: 1, parkingVisitor: 0.15, condoPsf: 800, stallPrice: 35_000, salesPerMonth: 10, rentPsfMonth: 2.95, stallRentMonth: 100, capRate: 0.0425, stated: { condo: 7.88 * M, rental: 2.58 * M } },
  { name: 'Clarkson', municipality: 'mississauga', acres: 1, storeys: 25, units: 250, gfaSqft: 240_964, unitSqft: 800, parkingRes: 1, parkingVisitor: 0.15, condoPsf: 800, stallPrice: 35_000, salesPerMonth: 10, rentPsfMonth: 3, stallRentMonth: 100, capRate: 0.04, stated: { condo: 5.56 * M, rental: 1.12 * M } },
  { name: 'Port Credit', municipality: 'mississauga', acres: 0.6, storeys: 10, units: 100, gfaSqft: 90_361, unitSqft: 750, parkingRes: 0.86, parkingVisitor: 0.15, condoPsf: 1000, stallPrice: 55_000, salesPerMonth: 20, rentPsfMonth: 3.3, stallRentMonth: 125, capRate: 0.04, stated: { condo: 12.87 * M, rental: 3.63 * M } },
  { name: 'Britannia', municipality: 'mississauga', acres: 1, storeys: 6, units: 100, gfaSqft: 90_361, unitSqft: 750, parkingRes: 1, parkingVisitor: 0.2, condoPsf: 800, stallPrice: 35_000, salesPerMonth: 7.5, rentPsfMonth: 2.75, stallRentMonth: 100, capRate: 0.0425, stated: { condo: 3.4 * M, rental: -3.57 * M } },
  { name: 'Dixie / Lakeview', municipality: 'mississauga', acres: 0.9, storeys: 6, units: 124, gfaSqft: 112_048, unitSqft: 750, parkingRes: 1, parkingVisitor: 0.2, condoPsf: 825, stallPrice: 35_000, salesPerMonth: 10, rentPsfMonth: 2.95, stallRentMonth: 100, capRate: 0.04, stated: { condo: 5.98 * M, rental: 1.2 * M } },
]

/** Table 5 (STUDY) and the few assumptions the study does not state (ASSUMED). */
export const STUDY_ASSUMPTIONS = {
  hardPsf: (storeys: number) => (storeys <= 6 ? 224 : storeys <= 12 ? 245 : storeys <= 39 ? 250 : storeys <= 60 ? 276 : 309), // STUDY
  undergroundParkingPsf: 152, // STUDY
  servicingPerUnit: 1_000, landscapingPerUnit: 1_000, demolitionPsfSite: 10, // STUDY
  contingency: 0.10, consultantsPm: 0.145, insurance: 0.01, marketing: 0.025, // STUDY (of hard cost)
  commission: 0.025, lenderFee: 0.008, loanRate: 0.045, ltc: 0.75, costInflation: 0.02, // STUDY
  profitOfRevenue: 0.15, discountRate: 0.06, vacancy: 0.02, opexRatio: 0.35, cbc: 0.04, // STUDY
  /** Total DCs per unit (regional + local + education + GO), small ≤ 70 m² (753 ft²) and large */
  dc: { caledon: [36_955, 55_673], brampton: [39_914, 61_108], mississauga: [41_703, 65_737] }, // STUDY
  parkland: { caledon: { ofLand: 0.05, perUnit: 0 }, brampton: { ofLand: 0, perUnit: 4_056.5 }, mississauga: { ofLand: 0, perUnit: 10_400 } }, // STUDY
  permitPerSqm: { caledon: 13.2, brampton: 17.22, mississauga: 18.79 }, // STUDY
  propertyTax: { caledon: 0.00797, brampton: 0.00953, mississauga: 0.00786 }, // STUDY
  planningFees: { caledon: 150_000, brampton: 150_000, mississauga: 150_000 }, // ASSUMED: the study's fee schedule, rounded to one figure
  parkingSqftPerStall: 375, // ASSUMED: typical underground stall plus aisle
  netHstOfPrice: 0.13 / 1.13, ontarioRebatePerUnit: 24_000, // ASSUMED: prices include HST; the builder remits it net of the Ontario new-housing rebate
  deposit: 0.20, // ASSUMED: held in trust (not used for construction)
  occupancyMonths: 6, // ASSUMED
  constructionMonths: (storeys: number) => (storeys <= 6 ? 20 : storeys <= 12 ? 24 : storeys <= 39 ? 30 : 36), // ASSUMED
  preConstructionMonths: 18, // ASSUMED: approvals and pre-sales
  leaseUpPerMonth: 20, // ASSUMED (rental)
}

const A = STUDY_ASSUMPTIONS
const line = (id: string, label: string, driver: CostLine['driver'], timing: CostLine['timing'], escalate = false): CostLine => ({ id, label, driver, timing, estimateClass: 'C', ...(escalate ? { escalate } : {}) })

/** Costs common to both tenures, with land as a lump sum at month 0. */
/** Peel Table 5 applied to a site, or the site's own costs. */
export function costsOf(s: StudySite): SiteCosts {
  if (s.costs) return s.costs
  const m = s.municipality as Exclude<Municipality, 'toronto'>
  return {
    hardPsf: A.hardPsf(s.storeys), parkingPsf: A.undergroundParkingPsf,
    dcTotal: A.dc[m][s.unitSqft <= 753 ? 0 : 1]! * s.units * (1 - (s.dcWaiver ?? 0)),
    parkland: A.parkland[m], feesTotal: (A.permitPerSqm[m] * s.gfaSqft / 10.7639) + A.planningFees[m],
    taxRate: A.propertyTax[m], cbcOfLand: A.cbc, loanRate: A.loanRate, opexRatio: A.opexRatio,
  }
}

function costLines(s: StudySite, land: number, pre: number): CostLine[] {
  const c = costsOf(s)
  const stalls = Math.round(s.units * (s.parkingRes + s.parkingVisitor))
  const hard = ['hard', 'parking', 'site']
  const years = (pre + A.constructionMonths(s.storeys)) / 12
  const park = c.parkland
  return [
    line('land', 'Land (residual)', { kind: 'lumpSum', amount: land }, { kind: 'month', month: 0 }),
    line('hard', 'Hard costs (by height)', { kind: 'perArea', rate: c.hardPsf, area: s.gfaSqft }, { kind: 'construction' }, true),
    line('parking', 'Underground parking', { kind: 'perStall', rate: c.parkingPsf, stalls, sqftPerStall: A.parkingSqftPerStall }, { kind: 'construction' }, true),
    line('site', 'Servicing, landscaping, demolition', { kind: 'lumpSum', amount: (s.units * (A.servicingPerUnit + A.landscapingPerUnit)) + (s.acres * 43_560 * A.demolitionPsfSite) }, { kind: 'construction' }, true),
    line('contingency', 'Contingency', { kind: 'percentOf', rate: A.contingency, of: hard }, { kind: 'construction' }),
    line('soft', 'Consultants, PM, legal, insurance, marketing', { kind: 'percentOf', rate: A.consultantsPm + A.insurance + A.marketing, of: hard }, { kind: 'spread', from: 0, to: pre + A.constructionMonths(s.storeys) - 1 }),
    line('dc', 'Development charges', { kind: 'lumpSum', amount: c.dcTotal }, { kind: 'constructionStart' }),
    ...(c.cbcOfLand ? [line('cbc', 'Community benefits charge (share of land value)', { kind: 'percentOf', rate: c.cbcOfLand, of: ['land'] }, { kind: 'constructionStart' })] : []),
    line('parkland', 'Parkland cash-in-lieu', park.ofLand ? { kind: 'percentOf', rate: park.ofLand, of: ['land'] } : { kind: 'lumpSum', amount: park.perUnit * s.units }, { kind: 'constructionStart' }),
    line('permits', 'Building permit and planning fees', { kind: 'lumpSum', amount: c.feesTotal }, { kind: 'constructionStart' }),
    line('tax', 'Property tax during development', { kind: 'percentOf', rate: c.taxRate * years, of: ['land'] }, { kind: 'spread', from: 0, to: pre + A.constructionMonths(s.storeys) - 1 }),
    line('lender', 'Lender fee', { kind: 'percentOf', rate: A.lenderFee, of: ['land', ...hard, 'contingency', 'soft', 'dc'] }, { kind: 'constructionStart' }),
  ]
}

const debtOf = (s: StudySite) => ({ annualRate: costsOf(s).loanRate, ltc: A.ltc, ltv: 0.65, dscr: 1.2, amortizationYears: 25, sweepAfterCompletion: true })

export function condoInput(s: StudySite, land: number): ProjectInput {
  const pre = A.preConstructionMonths
  const build = A.constructionMonths(s.storeys)
  const unitPrice = s.unitSqft * s.condoPsf
  const sellOut = Math.ceil(s.units / s.salesPerMonth)
  const revenue = (s.units * unitPrice) + (Math.round(s.units * s.parkingRes) * s.stallPrice)
  const hst = Math.max(0, (revenue * A.netHstOfPrice) - (s.units * A.ontarioRebatePerUnit))
  return {
    id: `nblc-${s.name}`, name: s.name,
    program: { lotAreaSqft: s.acres * 43_560, planningGfaSqft: s.gfaSqft, gcaAboveSqft: s.gfaSqft, gcaBelowSqft: 0, storeys: s.storeys },
    timing: { preConstructionMonths: pre, constructionMonths: build, exitMonth: Math.max(pre + build + A.occupancyMonths, sellOut + 1) + 1 },
    costLines: [...costLines(s, land, pre), line('hst', 'HST on sales, net of the Ontario rebate', { kind: 'lumpSum', amount: hst }, { kind: 'completion' })],
    costEscalation: A.costInflation,
    components: [{
      kind: 'condo', id: 'condo',
      // Parking stalls sold with units: carried as a higher price per ft² so revenue matches units + stalls
      units: [{ id: 'unit', count: s.units, netSqftPerUnit: s.unitSqft, pricePerSqft: revenue / (s.units * s.unitSqft) }],
      salesStartMonth: 0, salesPerMonth: s.salesPerMonth, depositFraction: A.deposit, depositsUsable: false,
      occupancyMonths: A.occupancyMonths, occupancyFeePerUnitMonthly: 0, commissionFraction: A.commission,
      unsoldAtExit: { bulkSaleDiscount: 0 },
    }],
    debt: debtOf(s), exit: { sellingCostFraction: 0 }, discountRate: A.discountRate,
  }
}

/** Rental: the study values the stabilized building at its cap rate plus a profit spread it does not publish. */
export function rentalInput(s: StudySite, land: number, profitSpread: number): ProjectInput {
  const pre = 12
  const build = A.constructionMonths(s.storeys)
  const lease = Math.ceil(s.units / A.leaseUpPerMonth)
  const rent = s.unitSqft * s.rentPsfMonth
  return {
    id: `nblc-rental-${s.name}`, name: s.name,
    program: { lotAreaSqft: s.acres * 43_560, planningGfaSqft: s.gfaSqft, gcaAboveSqft: s.gfaSqft, gcaBelowSqft: 0, storeys: s.storeys },
    timing: { preConstructionMonths: pre, constructionMonths: build, exitMonth: pre + build + lease + 1 },
    costLines: costLines(s, land, pre),
    costEscalation: A.costInflation,
    components: [{
      kind: 'rental', id: 'rental',
      unitMix: [{ id: 'unit', count: s.units, netSqftPerUnit: s.unitSqft, monthlyRent: rent, vacancy: A.vacancy }],
      otherIncomeMonthly: Math.round(s.units * s.parkingRes) * s.stallRentMonth,
      opexPerUnitMonthly: rent * costsOf(s).opexRatio, leaseUpMonths: lease, rentGrowth: 0.02, opexInflation: 0.02,
      exitCapRate: s.capRate + profitSpread,
    }],
    debt: { ...debtOf(s), sweepAfterCompletion: false }, exit: { sellingCostFraction: 0 }, discountRate: A.discountRate,
  }
}

/** Profit after financing: what investors get back less what they put in. */
const leveredProfit = (p: ProjectInput) => {
  const m = runNode(p).metrics
  const back = m.equityReturned?.value, put = m.equityContributed?.value
  return back === null || back === undefined || put === null || put === undefined ? null : { profit: back - put, revenue: m.totalRevenue?.value ?? null }
}

/** Land price at which `gap` is zero, by bisection on the land lump sum (gap falls as land rises). */
export function residualLand(build: (land: number) => ProjectInput, gap: (p: ProjectInput) => number | null): number | null {
  let lo = -200 * M, hi = 200 * M
  const glo = gap(build(lo)), ghi = gap(build(hi))
  if (glo === null || ghi === null || glo < 0 || ghi > 0) return null
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    const g = gap(build(mid))
    if (g === null) return null
    if (g > 0) lo = mid
    else hi = mid
  }
  return Math.round((lo + hi) / 2)
}

export const condoGap = (p: ProjectInput) => { const r = leveredProfit(p); return r && r.revenue ? r.profit - (A.profitOfRevenue * r.revenue) : null }
export const rentalGap = (p: ProjectInput) => leveredProfit(p)?.profit ?? null

export interface BenchmarkRow { site: string; stated: number; ours: number | null; error: number | null }

/** The study's rental profit spread is unpublished; 0.25% over the cap rate is the one value fitted to its results (of 0, 0.25, 0.5, 0.75, 1%). */
export const FITTED_RENTAL_SPREAD = 0.0025

export function benchmark(tenure: 'condo' | 'rental', profitSpread = FITTED_RENTAL_SPREAD): BenchmarkRow[] {
  return NBLC_PEEL_2021.map((s) => {
    const ours = tenure === 'condo' ? residualLand((l) => condoInput(s, l), condoGap) : residualLand((l) => rentalInput(s, l, profitSpread), rentalGap)
    const stated = s.stated[tenure]
    return { site: s.name, stated, ours, error: ours === null ? null : ours - stated }
  })
}

// ---------------------------------------------------------------- second answer key: Toronto 2019 (direction)
//
// Source: N. Barry Lyon Consultants (NBLC), "City of Toronto Inclusionary Zoning Market Feasibility Analysis",
// May 2019, Tables 1–4. Published at
// https://www.toronto.ca/wp-content/uploads/2019/05/90b6-Final-Draft-City-of-Toronto-IZ-Analysis-May-21-accessible.pdf
// The study states results as categories, not dollars: a site is "viable" when its residual land value without IZ is
// at least 10% above the stated value of the existing site, else "challenge". So this key tests direction.

export interface TorontoSite {
  no: number
  name: string
  siteSqm: number
  storeys: number
  units: number
  /** Table 3 */
  s37PerUnit: number
  unitSqft: number
  salesPerMonth: number
  condoPsf: number
  stallPrice: number
  rentPsfMonth: number
  stallRentMonth: number
  parkingRatio: number
  /** Downtown and Yonge-Eglinton: +10% hard cost */
  premium: boolean
  /** Table 4: existing site land value (TREB/Altus) and the no-IZ verdicts */
  existingValue: number
  viable: { condo: boolean; rental: boolean }
}

export const NBLC_TORONTO_2019: TorontoSite[] = [
  { no: 1, name: 'Etobicoke Centre', siteSqm: 3_800, storeys: 28, units: 200, s37PerUnit: 2_800, unitSqft: 750, salesPerMonth: 12, condoPsf: 775, stallPrice: 35_000, rentPsfMonth: 3.25, stallRentMonth: 120, parkingRatio: 0.9, premium: false, existingValue: 7_194_000, viable: { condo: true, rental: false } },
  { no: 2, name: 'Stockyards / Junction', siteSqm: 4_400, storeys: 12, units: 261, s37PerUnit: 2_600, unitSqft: 700, salesPerMonth: 20, condoPsf: 800, stallPrice: 40_000, rentPsfMonth: 3.4, stallRentMonth: 120, parkingRatio: 0.65, premium: false, existingValue: 11_351_000, viable: { condo: true, rental: true } },
  { no: 3, name: 'Weston', siteSqm: 3_400, storeys: 25, units: 240, s37PerUnit: 2_400, unitSqft: 750, salesPerMonth: 10, condoPsf: 675, stallPrice: 35_000, rentPsfMonth: 2.75, stallRentMonth: 85, parkingRatio: 0.8, premium: false, existingValue: 5_329_000, viable: { condo: false, rental: false } },
  { no: 4, name: 'Finch West', siteSqm: 6_600, storeys: 14, units: 256, s37PerUnit: 1_800, unitSqft: 700, salesPerMonth: 10, condoPsf: 725, stallPrice: 40_000, rentPsfMonth: 3, stallRentMonth: 85, parkingRatio: 0.7, premium: false, existingValue: 10_037_000, viable: { condo: false, rental: false } },
  { no: 5, name: 'Yonge-Eglinton Centre', siteSqm: 2_000, storeys: 15, units: 222, s37PerUnit: 3_200, unitSqft: 720, salesPerMonth: 15, condoPsf: 1_000, stallPrice: 70_000, rentPsfMonth: 4, stallRentMonth: 150, parkingRatio: 0.35, premium: true, existingValue: 19_310_000, viable: { condo: true, rental: false } },
  { no: 6, name: 'North York Centre', siteSqm: 3_500, storeys: 38, units: 283, s37PerUnit: 5_600, unitSqft: 700, salesPerMonth: 15, condoPsf: 950, stallPrice: 60_000, rentPsfMonth: 3.75, stallRentMonth: 125, parkingRatio: 0.8, premium: false, existingValue: 16_983_000, viable: { condo: true, rental: true } },
  { no: 7, name: 'Downtown', siteSqm: 2_600, storeys: 47, units: 640, s37PerUnit: 4_800, unitSqft: 710, salesPerMonth: 20, condoPsf: 1_200, stallPrice: 90_000, rentPsfMonth: 4.25, stallRentMonth: 180, parkingRatio: 0.25, premium: true, existingValue: 28_268_000, viable: { condo: true, rental: true } },
  { no: 8, name: 'Toronto West', siteSqm: 3_698, storeys: 16, units: 352, s37PerUnit: 3_000, unitSqft: 700, salesPerMonth: 20, condoPsf: 975, stallPrice: 75_000, rentPsfMonth: 4, stallRentMonth: 150, parkingRatio: 0.5, premium: false, existingValue: 7_840_000, viable: { condo: true, rental: true } },
  { no: 9, name: 'Toronto East', siteSqm: 700, storeys: 6, units: 16, s37PerUnit: 3_400, unitSqft: 750, salesPerMonth: 12, condoPsf: 950, stallPrice: 65_000, rentPsfMonth: 3.75, stallRentMonth: 150, parkingRatio: 0.6, premium: false, existingValue: 1_620_000, viable: { condo: true, rental: true } },
  { no: 10, name: 'Golden Mile', siteSqm: 24_900, storeys: 39, units: 227, s37PerUnit: 2_600, unitSqft: 750, salesPerMonth: 10, condoPsf: 740, stallPrice: 40_000, rentPsfMonth: 3.05, stallRentMonth: 85, parkingRatio: 0.9, premium: false, existingValue: 3_572_000, viable: { condo: true, rental: true } },
  { no: 11, name: 'Scarborough Centre', siteSqm: 4_500, storeys: 41, units: 398, s37PerUnit: 2_000, unitSqft: 750, salesPerMonth: 10, condoPsf: 745, stallPrice: 35_000, rentPsfMonth: 3.1, stallRentMonth: 85, parkingRatio: 0.9, premium: false, existingValue: 4_345_000, viable: { condo: true, rental: true } },
]

/** Table 2 (STUDY) and what the 2019 study leaves out (ASSUMED). */
export const TORONTO_2019 = {
  hardPsf: (storeys: number) => (storeys <= 6 ? 215 : storeys <= 12 ? 225 : storeys <= 39 ? 228 : storeys <= 60 ? 230 : 253), // STUDY
  premium: 0.10, undergroundParkingPsf: 138, loanRate: 0.05, opexRatio: 0.36, propertyTax: 0.00636, // STUDY
  dc: { small: 30_656, large: 46_963, education: 1_793 }, // STUDY (apartments, 1 bed and bachelor; 2+ bedrooms)
  planning: { opaZbl: 29_165, opaZblPerSqm: 2.88, spa: 21_257, spaPerSqm: 4.83, condo: 9_375, condoPerUnit: 26 }, // STUDY
  largeUnitShare: 0.4, // ASSUMED: unit mix not published
  parklandOfLand: 0.10, // ASSUMED: Toronto's alternative rate, capped at 10% of land value for sites under 1 ha
  permitPerSqm: 18, // ASSUMED
  netToGross: 0.83, // ASSUMED (the Peel study's stated ratio): gross area from units, since some sites are one phase of a larger parcel
  viableMargin: 1.10, // STUDY: viable when the land value is at least 10% above the existing site's value
}

const T = TORONTO_2019

/** A Toronto prototype as a benchmark site, with its own costs. */
export function torontoSite(t: TorontoSite): StudySite {
  const gfaSqft = Math.round(t.units * t.unitSqft / T.netToGross)
  const gfaSqm = gfaSqft / 10.7639
  const dcPerUnit = ((1 - T.largeUnitShare) * T.dc.small) + (T.largeUnitShare * T.dc.large) + T.dc.education
  const fees = T.planning.opaZbl + (T.planning.opaZblPerSqm * gfaSqm) + T.planning.spa + (T.planning.spaPerSqm * gfaSqm) + T.planning.condo + (T.planning.condoPerUnit * t.units) + (T.permitPerSqm * gfaSqm)
  return {
    name: t.name, municipality: 'toronto', acres: t.siteSqm / 4_046.86, storeys: t.storeys, units: t.units, gfaSqft,
    unitSqft: t.unitSqft, parkingRes: t.parkingRatio, parkingVisitor: 0, condoPsf: t.condoPsf, stallPrice: t.stallPrice,
    salesPerMonth: t.salesPerMonth, rentPsfMonth: t.rentPsfMonth, stallRentMonth: t.stallRentMonth, capRate: 0.04,
    stated: { condo: t.existingValue * T.viableMargin, rental: t.existingValue * T.viableMargin },
    costs: {
      hardPsf: T.hardPsf(t.storeys) * (t.premium ? 1 + T.premium : 1), parkingPsf: T.undergroundParkingPsf,
      dcTotal: (dcPerUnit + t.s37PerUnit) * t.units, // section 37 per unit (Table 3) carried with the charges
      parkland: { ofLand: T.parklandOfLand, perUnit: 0 }, feesTotal: fees, taxRate: T.propertyTax, cbcOfLand: 0,
      loanRate: T.loanRate, opexRatio: T.opexRatio,
    },
  }
}

export interface DirectionRow { site: string; tenure: 'condo' | 'rental'; threshold: number; ours: number | null; studyViable: boolean; modelViable: boolean | null; agrees: boolean | null }

/** Viable or challenge, by the study's rule, for each site and tenure; the rental spread is Peel's, not refitted. */
export function torontoDirection(): DirectionRow[] {
  return NBLC_TORONTO_2019.flatMap((t) => {
    const s = torontoSite(t)
    return (['condo', 'rental'] as const).map((tenure): DirectionRow => {
      const ours = tenure === 'condo' ? residualLand((l) => condoInput(s, l), condoGap) : residualLand((l) => rentalInput(s, l, FITTED_RENTAL_SPREAD), rentalGap)
      const threshold = t.existingValue * T.viableMargin
      const modelViable = ours === null ? null : ours >= threshold
      return { site: t.name, tenure, threshold, ours, studyViable: t.viable[tenure], modelViable, agrees: modelViable === null ? null : modelViable === t.viable[tenure] }
    })
  })
}

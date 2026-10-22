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

export type Municipality = 'caledon' | 'brampton' | 'mississauga'

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
function costLines(s: StudySite, land: number, pre: number): CostLine[] {
  const stalls = Math.round(s.units * (s.parkingRes + s.parkingVisitor))
  const dc = A.dc[s.municipality][s.unitSqft <= 753 ? 0 : 1]! * s.units * (1 - (s.dcWaiver ?? 0))
  const hard = ['hard', 'parking', 'site']
  const years = (pre + A.constructionMonths(s.storeys)) / 12
  const park = A.parkland[s.municipality]
  return [
    line('land', 'Land (residual)', { kind: 'lumpSum', amount: land }, { kind: 'month', month: 0 }),
    line('hard', 'Hard costs (by height)', { kind: 'perArea', rate: A.hardPsf(s.storeys), area: s.gfaSqft }, { kind: 'construction' }, true),
    line('parking', 'Underground parking', { kind: 'perArea', rate: A.undergroundParkingPsf, area: stalls * A.parkingSqftPerStall }, { kind: 'construction' }, true),
    line('site', 'Servicing, landscaping, demolition', { kind: 'lumpSum', amount: (s.units * (A.servicingPerUnit + A.landscapingPerUnit)) + (s.acres * 43_560 * A.demolitionPsfSite) }, { kind: 'construction' }, true),
    line('contingency', 'Contingency', { kind: 'percentOf', rate: A.contingency, of: hard }, { kind: 'construction' }),
    line('soft', 'Consultants, PM, legal, insurance, marketing', { kind: 'percentOf', rate: A.consultantsPm + A.insurance + A.marketing, of: hard }, { kind: 'spread', from: 0, to: pre + A.constructionMonths(s.storeys) - 1 }),
    line('dc', 'Development charges', { kind: 'lumpSum', amount: dc }, { kind: 'constructionStart' }),
    line('cbc', 'Community benefits charge (4% of land value)', { kind: 'percentOf', rate: A.cbc, of: ['land'] }, { kind: 'constructionStart' }),
    line('parkland', 'Parkland cash-in-lieu', park.ofLand ? { kind: 'percentOf', rate: park.ofLand, of: ['land'] } : { kind: 'lumpSum', amount: park.perUnit * s.units }, { kind: 'constructionStart' }),
    line('permits', 'Building permit and planning fees', { kind: 'lumpSum', amount: (A.permitPerSqm[s.municipality] * s.gfaSqft / 10.7639) + A.planningFees[s.municipality] }, { kind: 'constructionStart' }),
    line('tax', 'Property tax during development', { kind: 'percentOf', rate: A.propertyTax[s.municipality] * years, of: ['land'] }, { kind: 'spread', from: 0, to: pre + A.constructionMonths(s.storeys) - 1 }),
    line('lender', 'Lender fee', { kind: 'percentOf', rate: A.lenderFee, of: ['land', ...hard, 'contingency', 'soft', 'dc'] }, { kind: 'constructionStart' }),
  ]
}

const debt = { annualRate: A.loanRate, ltc: A.ltc, ltv: 0.65, dscr: 1.2, amortizationYears: 25, sweepAfterCompletion: true }

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
    debt, exit: { sellingCostFraction: 0 }, discountRate: A.discountRate,
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
      opexPerUnitMonthly: rent * A.opexRatio, leaseUpMonths: lease, rentGrowth: 0.02, opexInflation: 0.02,
      exitCapRate: s.capRate + profitSpread,
    }],
    debt: { ...debt, sweepAfterCompletion: false }, exit: { sellingCostFraction: 0 }, discountRate: A.discountRate,
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

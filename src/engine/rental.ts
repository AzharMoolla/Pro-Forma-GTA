// v0.1 rental API, kept as a thin adapter over the v0.2 project engine.
// Its original tests are the regression suite proving v0.2 changed nothing for a single rental building.

import { runProject, type Metric, type ProjectInput } from './project'
import type { LoanSizing } from './finance'

export { ENGINE_VERSION, CONVENTION_VERSION, type Metric } from './project'

export interface UnitType {
  id: string
  count: number
  netSqftPerUnit: number
  monthlyRent: number
  vacancy: number
}

export interface RentalInput {
  unitMix: UnitType[]
  lotAreaSqft: number | null
  planningGfaSqft: number | null
  gcaAboveSqft: number
  gcaBelowSqft: number
  landCost: number
  levies: number | null
  hardCostPerGcaSqft: number
  softCostFraction: number
  contingencyFraction: number
  opexPerUnitMonthly: number
  otherIncomeMonthly: number
  timing: { preConstructionMonths: number; constructionMonths: number; leaseUpMonths: number; exitMonth: number }
  debt: { annualRate: number; ltc: number; ltv: number; dscr: number; amortizationYears: number }
  exit: { capRate: number; sellingCostFraction: number }
  discountRate: number
}

export interface LedgerRow {
  month: number
  phase: string
  land: number
  levies: number
  hard: number
  soft: number
  contingency: number
  totalCost: number
  occupancy: number
  revenue: number
  opex: number
  noi: number
  openingDebt: number
  interest: number
  interestCapitalized: number
  equityDraw: number
  debtDraw: number
  repayment: number
  closingDebt: number
  saleValue: number
  sellingCosts: number
  projectCashFlow: number
  equityCashFlow: number
}

export interface RentalResult {
  engineVersion: string
  conventionVersion: string
  complete: boolean
  missing: string[]
  ledger: LedgerRow[]
  metrics: Record<string, Metric>
  loanSizing: LoanSizing
  checks: { sourcesEqualUses: boolean; ledgerCloses: boolean }
  warnings: string[]
}

export function validateRentalInput(input: RentalInput): string[] {
  const errors: string[] = []
  const t = input.timing
  const nonNegative: Array<[string, number]> = [
    ['gcaAboveSqft', input.gcaAboveSqft], ['gcaBelowSqft', input.gcaBelowSqft], ['landCost', input.landCost],
    ['hardCostPerGcaSqft', input.hardCostPerGcaSqft], ['softCostFraction', input.softCostFraction],
    ['contingencyFraction', input.contingencyFraction], ['opexPerUnitMonthly', input.opexPerUnitMonthly],
    ['otherIncomeMonthly', input.otherIncomeMonthly], ['preConstructionMonths', t.preConstructionMonths],
    ['leaseUpMonths', t.leaseUpMonths], ['debt.annualRate', input.debt.annualRate],
    ['exit.sellingCostFraction', input.exit.sellingCostFraction],
  ]
  for (const [name, value] of nonNegative) if (!Number.isFinite(value) || value < 0) errors.push(`${name} must be a number ≥ 0`)
  if (input.levies !== null && (!Number.isFinite(input.levies) || input.levies < 0)) errors.push('levies must be ≥ 0 or unknown')
  if (input.unitMix.length === 0) errors.push('unitMix needs at least one unit type')
  for (const u of input.unitMix) {
    if (!Number.isInteger(u.count) || u.count < 0) errors.push(`${u.id}: count must be a whole number ≥ 0`)
    if (!(u.vacancy >= 0 && u.vacancy < 1)) errors.push(`${u.id}: vacancy must be in [0, 1)`)
    if (!(u.monthlyRent >= 0) || !(u.netSqftPerUnit >= 0)) errors.push(`${u.id}: rent and area must be ≥ 0`)
  }
  if (!Number.isInteger(t.constructionMonths) || t.constructionMonths < 1) errors.push('constructionMonths must be a whole number ≥ 1')
  const completion = t.preConstructionMonths + t.constructionMonths
  if (!Number.isInteger(t.exitMonth) || t.exitMonth <= completion) errors.push('exitMonth must be after construction completes')
  for (const [name, value] of [['ltc', input.debt.ltc], ['ltv', input.debt.ltv]] as const) {
    if (!(value >= 0 && value <= 1)) errors.push(`debt.${name} must be in [0, 1]`)
  }
  if (!(input.debt.dscr > 0)) errors.push('debt.dscr must be > 0')
  if (!(input.debt.amortizationYears > 0)) errors.push('debt.amortizationYears must be > 0')
  if (!(input.exit.capRate > 0)) errors.push('exit.capRate must be > 0')
  if (!(input.discountRate > -1)) errors.push('discountRate must be > -100%')
  return errors
}

export function toProject(input: RentalInput): ProjectInput {
  return {
    id: 'rental',
    name: 'Rental building',
    program: { lotAreaSqft: input.lotAreaSqft, planningGfaSqft: input.planningGfaSqft, gcaAboveSqft: input.gcaAboveSqft, gcaBelowSqft: input.gcaBelowSqft },
    timing: { preConstructionMonths: input.timing.preConstructionMonths, constructionMonths: input.timing.constructionMonths, exitMonth: input.timing.exitMonth },
    costEscalation: 0,
    costLines: [
      { id: 'land', label: 'Land', driver: { kind: 'lumpSum', amount: input.landCost }, timing: { kind: 'month', month: 0 }, estimateClass: 'exact' },
      { id: 'levies', label: 'Levies', driver: input.levies === null ? null : { kind: 'lumpSum', amount: input.levies }, timing: { kind: 'constructionStart' }, estimateClass: 'exact' },
      { id: 'hard', label: 'Hard costs', driver: { kind: 'perArea', rate: input.hardCostPerGcaSqft, area: input.gcaAboveSqft + input.gcaBelowSqft }, timing: { kind: 'construction' }, estimateClass: 'C' },
      { id: 'soft', label: 'Soft costs', driver: { kind: 'percentOf', rate: input.softCostFraction, of: ['hard'] }, timing: { kind: 'construction' }, estimateClass: 'C' },
      { id: 'contingency', label: 'Contingency', driver: { kind: 'percentOf', rate: input.contingencyFraction, of: ['hard'] }, timing: { kind: 'construction' }, estimateClass: 'C' },
    ],
    components: [{
      kind: 'rental', id: 'residential', unitMix: input.unitMix, otherIncomeMonthly: input.otherIncomeMonthly,
      opexPerUnitMonthly: input.opexPerUnitMonthly, leaseUpMonths: input.timing.leaseUpMonths,
      rentGrowth: 0, opexInflation: 0, exitCapRate: input.exit.capRate,
    }],
    debt: input.debt,
    exit: { sellingCostFraction: input.exit.sellingCostFraction },
    discountRate: input.discountRate,
  }
}

export function runRental(input: RentalInput): RentalResult {
  const errors = validateRentalInput(input)
  if (errors.length) throw new RangeError(`Invalid rental input:\n- ${errors.join('\n- ')}`)
  const result = runProject(toProject(input))
  return {
    engineVersion: result.engineVersion,
    conventionVersion: result.conventionVersion,
    complete: result.complete,
    missing: result.missing,
    metrics: result.metrics,
    loanSizing: result.loanSizing,
    checks: result.checks,
    warnings: result.warnings,
    ledger: result.ledger.map((r) => ({
      month: r.month, phase: r.phase,
      land: r.costs.land!, levies: r.costs.levies!, hard: r.costs.hard!, soft: r.costs.soft!, contingency: r.costs.contingency!,
      totalCost: r.totalCost, occupancy: r.rentalOccupancy, revenue: r.revenue, opex: r.opex, noi: r.noi,
      openingDebt: r.openingDebt, interest: r.interest, interestCapitalized: r.interestCapitalized,
      equityDraw: r.equityDraw, debtDraw: r.debtDraw, repayment: r.repayment, closingDebt: r.closingDebt,
      saleValue: r.saleValue, sellingCosts: r.sellingCosts, projectCashFlow: r.projectCashFlow, equityCashFlow: r.equityCashFlow,
    })),
  }
}

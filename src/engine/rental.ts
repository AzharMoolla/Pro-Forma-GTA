// Purpose-built rental model, conventions v0.1 (docs/implementation/ADR-001-pilot-architecture.md).
// Pure: no IO, no clock, no randomness.

import { annualizeMonthly, irr, monthlyFromEffectiveAnnual, monthlyFromNominalAnnual, npv, sizeLoan, type LoanSizing } from './finance'
import { roundCents, sumCents } from './money'

export const ENGINE_VERSION = '0.1.0'
export const CONVENTION_VERSION = '0.1'

export interface UnitType {
  id: string
  count: number
  netSqftPerUnit: number
  monthlyRent: number
  vacancy: number // fraction, per type (audit PF-002)
}

export interface RentalInput {
  unitMix: UnitType[]
  lotAreaSqft: number | null
  planningGfaSqft: number | null // by-law counted GFA, never inferred from GCA (C6, PF-005)
  gcaAboveSqft: number
  gcaBelowSqft: number
  landCost: number
  levies: number | null // null = unknown (C16)
  hardCostPerGcaSqft: number // C18: Altus benchmark or quote, applied to total GCA
  softCostFraction: number // of hard cost; proxy (PF-017)
  contingencyFraction: number // of hard cost; proxy (PF-017)
  opexPerUnitMonthly: number
  otherIncomeMonthly: number
  timing: {
    preConstructionMonths: number
    constructionMonths: number
    leaseUpMonths: number
    exitMonth: number // absolute month index of sale
  }
  debt: { annualRate: number; ltc: number; ltv: number; dscr: number; amortizationYears: number }
  exit: { capRate: number; sellingCostFraction: number }
  discountRate: number // effective annual
}

export interface LedgerRow {
  month: number
  phase: 'land' | 'pre-construction' | 'construction' | 'lease-up' | 'stabilized'
  land: number
  levies: number
  hard: number
  soft: number
  contingency: number
  totalCost: number
  occupancy: number // weighted by unit count
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
  projectCashFlow: number // unlevered
  equityCashFlow: number // levered
}

export interface Metric {
  id: string
  label: string
  value: number | null // null = incomplete or unavailable, never a number built on an unknown
  unit: 'CAD' | 'CAD/yr' | 'CAD/sqft' | 'fraction' | 'ratio' | 'sqft' | 'units'
  basis: string
  formula: string
  dependsOn: string[]
  missing: string[]
  warnings: string[]
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

export function runRental(input: RentalInput): RentalResult {
  const errors = validateRentalInput(input)
  if (errors.length) throw new RangeError(`Invalid rental input:\n- ${errors.join('\n- ')}`)

  const { preConstructionMonths: pre, constructionMonths: build, leaseUpMonths: leaseUp, exitMonth } = input.timing
  const constructionStart = pre + 1
  const completion = pre + build
  const missing = input.levies === null ? ['levies'] : []
  const warnings: string[] = missing.length ? ['Levies unknown: ledger excludes them and dependent results are withheld'] : []

  // Program
  const totalUnits = input.unitMix.reduce((n, u) => n + u.count, 0)
  const totalNsf = input.unitMix.reduce((n, u) => n + u.count * u.netSqftPerUnit, 0)
  const totalGca = input.gcaAboveSqft + input.gcaBelowSqft

  // Budget (excluding financing)
  const hardTotal = roundCents(totalGca * input.hardCostPerGcaSqft)
  const softTotal = roundCents(hardTotal * input.softCostFraction)
  const contingencyTotal = roundCents(hardTotal * input.contingencyFraction)
  const leviesTotal = input.levies ?? 0
  const budget = sumCents([input.landCost, leviesTotal, hardTotal, softTotal, contingencyTotal])
  const equityRequired = roundCents((1 - input.debt.ltc) * budget) // C8

  // C7: straight-line spend; the last month takes the rounding remainder so totals tie exactly
  const spread = (total: number, month: number) => {
    const k = month - pre
    if (k < 1 || k > build) return 0
    const perMonth = roundCents(total / build)
    return k < build ? perMonth : roundCents(total - perMonth * (build - 1))
  }

  // C11: linear lease-up to stabilized occupancy, vacancy per unit type
  const occupancyFor = (u: UnitType, month: number) => {
    const k = month - completion
    if (k < 1) return 0
    const stabilized = 1 - u.vacancy
    return leaseUp === 0 || k >= leaseUp ? stabilized : (k / leaseUp) * stabilized
  }

  const stabilizedMonthlyNoi = roundCents(
    input.unitMix.reduce((sum, u) => sum + u.count * u.monthlyRent * (1 - u.vacancy), 0) +
      input.otherIncomeMonthly - input.opexPerUnitMonthly * totalUnits,
  )
  const stabilizedNoiAnnual = roundCents(stabilizedMonthlyNoi * 12)

  const monthlyRate = monthlyFromNominalAnnual(input.debt.annualRate)
  const ledger: LedgerRow[] = []
  let debt = 0
  let equityUsed = 0

  for (let month = 0; month <= exitMonth; month++) {
    const operating = month > completion
    const land = month === 0 ? input.landCost : 0
    const levies = month === constructionStart ? leviesTotal : 0
    const hard = spread(hardTotal, month)
    const soft = spread(softTotal, month)
    const contingency = spread(contingencyTotal, month)
    const totalCost = sumCents([land, levies, hard, soft, contingency])

    const occupiedUnits = input.unitMix.reduce((n, u) => n + u.count * occupancyFor(u, month), 0)
    const revenue = operating
      ? roundCents(input.unitMix.reduce((s, u) => s + u.count * u.monthlyRent * occupancyFor(u, month), 0) + input.otherIncomeMonthly)
      : 0
    const opex = operating ? roundCents(input.opexPerUnitMonthly * totalUnits) : 0
    const noi = roundCents(revenue - opex)

    const openingDebt = debt
    const interest = roundCents(openingDebt * monthlyRate) // C9: opening balance only, no half-draw shortcut
    let interestCapitalized = 0
    let equityDraw = 0
    let debtDraw = 0
    let operatingSurplus = 0

    if (!operating) {
      equityDraw = Math.min(totalCost, roundCents(equityRequired - equityUsed))
      debtDraw = roundCents(totalCost - equityDraw)
      interestCapitalized = interest
    } else {
      const afterInterest = roundCents(noi - interest)
      if (afterInterest < 0) equityDraw = -afterInterest // shortfall funded by equity
      else operatingSurplus = afterInterest
    }
    equityUsed = roundCents(equityUsed + equityDraw)

    let saleValue = 0
    let sellingCosts = 0
    let repayment = 0
    if (month === exitMonth) {
      saleValue = roundCents(stabilizedNoiAnnual / input.exit.capRate) // C14: forward NOI (flat rents in v0.1)
      sellingCosts = roundCents(saleValue * input.exit.sellingCostFraction)
      repayment = roundCents(openingDebt + debtDraw + interestCapitalized)
    }
    const closingDebt = roundCents(openingDebt + debtDraw + interestCapitalized - repayment)
    debt = closingDebt

    ledger.push({
      month,
      phase: month === 0 ? 'land' : month < constructionStart ? 'pre-construction' : !operating ? 'construction'
        : month - completion < leaseUp ? 'lease-up' : 'stabilized',
      land, levies, hard, soft, contingency, totalCost,
      occupancy: totalUnits ? occupiedUnits / totalUnits : 0,
      revenue, opex, noi, openingDebt, interest, interestCapitalized, equityDraw, debtDraw, repayment, closingDebt,
      saleValue, sellingCosts,
      projectCashFlow: roundCents(-totalCost + noi + saleValue - sellingCosts),
      equityCashFlow: roundCents(-equityDraw + operatingSurplus + saleValue - sellingCosts - repayment),
    })
  }

  // Checks
  const capitalizedInterest = sumCents(ledger.map((r) => r.interestCapitalized))
  const constructionRows = ledger.filter((r) => r.month <= completion)
  const uses = roundCents(budget + capitalizedInterest)
  const sources = sumCents([...constructionRows.map((r) => r.equityDraw), ...constructionRows.map((r) => r.debtDraw), capitalizedInterest])
  const ledgerCloses = ledger.every(
    (r) => Math.abs(r.openingDebt + r.debtDraw + r.interestCapitalized - r.repayment - r.closingDebt) < 0.005,
  ) && ledger.at(-1)!.closingDebt === 0
  const checks = { sourcesEqualUses: Math.abs(sources - uses) < 0.005, ledgerCloses }

  // Returns
  const projectFlows = ledger.map((r) => r.projectCashFlow)
  const equityFlows = ledger.map((r) => r.equityCashFlow)
  const unlevered = irr(projectFlows)
  const levered = irr(equityFlows)
  const peakDebt = Math.max(...ledger.map((r) => r.closingDebt), ...ledger.map((r) => r.repayment))
  const totalDevelopmentCost = uses
  const equityContributed = sumCents(ledger.map((r) => r.equityDraw))
  const equityReturned = sumCents(ledger.map((r) => Math.max(0, r.equityCashFlow)))
  const saleValue = ledger.at(-1)!.saleValue
  const loanSizing = sizeLoan({
    noiAnnual: stabilizedNoiAnnual, value: saleValue, cost: totalDevelopmentCost,
    annualRate: input.debt.annualRate, amortizationYears: input.debt.amortizationYears,
    dscr: input.debt.dscr, ltv: input.debt.ltv, ltc: input.debt.ltc,
  })
  if (totalDevelopmentCost > 0 && peakDebt / totalDevelopmentCost > input.debt.ltc + 1e-9) {
    warnings.push('Capitalized interest pushes the construction loan above the LTC limit')
  }

  const costDependent = (m: Omit<Metric, 'missing'>): Metric =>
    missing.length ? { ...m, value: null, missing } : { ...m, missing: [] }
  const plain = (m: Omit<Metric, 'missing'>): Metric => ({ ...m, missing: [] })
  const exitBasis = `exit month ${exitMonth}, monthly flows annualized`

  const metrics: Record<string, Metric> = {
    totalUnits: plain({ id: 'totalUnits', label: 'Units', value: totalUnits, unit: 'units', basis: 'unit mix', formula: 'Σ count', dependsOn: ['unitMix'], warnings: [] }),
    totalNsf: plain({ id: 'totalNsf', label: 'Net rentable area', value: totalNsf, unit: 'sqft', basis: 'unit mix', formula: 'Σ count × net sqft per unit', dependsOn: ['unitMix'], warnings: [] }),
    efficiency: plain({ id: 'efficiency', label: 'Net-to-gross (above grade)', value: input.gcaAboveSqft ? totalNsf / input.gcaAboveSqft : null, unit: 'fraction', basis: 'above-grade GCA', formula: 'NSF ÷ above-grade GCA', dependsOn: ['totalNsf', 'gcaAboveSqft'], warnings: totalNsf > input.gcaAboveSqft ? ['Net area exceeds above-grade GCA'] : [] }),
    fsi: plain({ id: 'fsi', label: 'FSI', value: input.planningGfaSqft !== null && input.lotAreaSqft ? input.planningGfaSqft / input.lotAreaSqft : null, unit: 'ratio', basis: 'by-law counted GFA', formula: 'planning GFA ÷ lot area (never GCA)', dependsOn: ['planningGfaSqft', 'lotAreaSqft'], warnings: input.planningGfaSqft === null ? ['Planning GFA not entered'] : [] }),
    totalDevelopmentCost: costDependent({ id: 'totalDevelopmentCost', label: 'Total development cost', value: totalDevelopmentCost, unit: 'CAD', basis: 'incl. capitalized construction interest', formula: 'land + levies + hard + soft + contingency + capitalized interest', dependsOn: ['landCost', 'levies', 'hardCostPerGcaSqft', 'softCostFraction', 'contingencyFraction', 'debt.annualRate'], warnings: [] }),
    costPerGcaSqft: costDependent({ id: 'costPerGcaSqft', label: 'Cost per GCA ft²', value: totalGca ? totalDevelopmentCost / totalGca : null, unit: 'CAD/sqft', basis: 'total GCA above + below', formula: 'TDC ÷ GCA', dependsOn: ['totalDevelopmentCost'], warnings: [] }),
    stabilizedNoi: plain({ id: 'stabilizedNoi', label: 'Stabilized NOI', value: stabilizedNoiAnnual, unit: 'CAD/yr', basis: 'stabilized year, flat rents', formula: '12 × (Σ units × rent × (1 − vacancy) + other income − opex)', dependsOn: ['unitMix', 'otherIncomeMonthly', 'opexPerUnitMonthly'], warnings: [] }),
    yieldOnCost: costDependent({ id: 'yieldOnCost', label: 'Yield on cost', value: totalDevelopmentCost ? stabilizedNoiAnnual / totalDevelopmentCost : null, unit: 'fraction', basis: 'stabilized NOI', formula: 'stabilized NOI ÷ TDC', dependsOn: ['stabilizedNoi', 'totalDevelopmentCost'], warnings: [] }),
    exitValue: plain({ id: 'exitValue', label: 'Exit value (gross)', value: saleValue, unit: 'CAD', basis: `month ${exitMonth}`, formula: 'forward 12-month NOI ÷ exit cap rate', dependsOn: ['stabilizedNoi', 'exit.capRate'], warnings: [] }),
    unleveredIrr: costDependent({ id: 'unleveredIrr', label: 'Unlevered IRR', value: unlevered.rate === null ? null : annualizeMonthly(unlevered.rate), unit: 'fraction', basis: exitBasis, formula: 'IRR of project cash flows, (1 + monthly)^12 − 1', dependsOn: ['projectCashFlow'], warnings: unlevered.warnings }),
    leveredIrr: costDependent({ id: 'leveredIrr', label: 'Levered IRR', value: levered.rate === null ? null : annualizeMonthly(levered.rate), unit: 'fraction', basis: exitBasis, formula: 'IRR of equity cash flows, (1 + monthly)^12 − 1', dependsOn: ['equityCashFlow'], warnings: levered.warnings }),
    unleveredNpv: costDependent({ id: 'unleveredNpv', label: `Unlevered NPV @ ${(input.discountRate * 100).toFixed(2)}%`, value: npv(monthlyFromEffectiveAnnual(input.discountRate), projectFlows), unit: 'CAD', basis: 'month 0 dollars, effective annual discount rate', formula: 'Σ CFₜ ÷ (1 + r_m)^t', dependsOn: ['projectCashFlow', 'discountRate'], warnings: [] }),
    equityMultiple: costDependent({ id: 'equityMultiple', label: 'Equity multiple', value: equityContributed ? equityReturned / equityContributed : null, unit: 'ratio', basis: 'equity contributed, not loan (PF-009)', formula: 'Σ equity distributions ÷ Σ equity contributions', dependsOn: ['equityCashFlow'], warnings: [] }),
    equityContributed: costDependent({ id: 'equityContributed', label: 'Equity contributed', value: equityContributed, unit: 'CAD', basis: 'incl. operating shortfalls', formula: 'Σ equity draws', dependsOn: ['totalDevelopmentCost', 'debt.ltc'], warnings: [] }),
    peakDebt: costDependent({ id: 'peakDebt', label: 'Peak construction loan', value: peakDebt, unit: 'CAD', basis: 'before repayment at exit', formula: 'max closing debt', dependsOn: ['totalDevelopmentCost', 'debt.ltc', 'debt.annualRate'], warnings: [] }),
    maxPermanentLoan: costDependent({ id: 'maxPermanentLoan', label: 'Max permanent loan', value: loanSizing.amount, unit: 'CAD', basis: `binding constraint: ${loanSizing.binding.toUpperCase()}`, formula: 'min(DSCR capacity, value × LTV, cost × LTC)', dependsOn: ['stabilizedNoi', 'exitValue', 'totalDevelopmentCost', 'debt.dscr', 'debt.ltv', 'debt.ltc'], warnings: loanSizing.warnings }),
  }

  return {
    engineVersion: ENGINE_VERSION,
    conventionVersion: CONVENTION_VERSION,
    complete: missing.length === 0,
    missing,
    ledger,
    metrics,
    loanSizing,
    checks,
    warnings,
  }
}

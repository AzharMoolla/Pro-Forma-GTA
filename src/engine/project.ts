// Project engine v0.2 (ADR-002): one monthly ledger for any mix of components.
// Pure: no IO, no clock, no randomness.

import { lineTotals, scheduleLine, validateCostLines, type Band, type CostLine } from './costs'
import { annualizeMonthly, annuityPayment, irr, monthlyFromEffectiveAnnual, monthlyFromNominalAnnual, npv, sizeLoan, type LoanSizing } from './finance'
import { roundCents, sumCents } from './money'

export const ENGINE_VERSION = '0.2.0'
export const CONVENTION_VERSION = '0.2'

// ---------------------------------------------------------------- components

export interface RentalUnitType {
  id: string
  count: number
  netSqftPerUnit: number
  monthlyRent: number
  vacancy: number // fraction, per type (PF-002)
}

export interface RentalComponent {
  kind: 'rental'
  id: string
  unitMix: RentalUnitType[]
  otherIncomeMonthly: number // parking, storage, laundry
  opexPerUnitMonthly: number
  leaseUpMonths: number
  rentGrowth: number // annual, steps every 12 months from month 0
  opexInflation: number // annual
  exitCapRate: number
  revenueBand?: Band
  capRateBand?: Band
}

export interface CondoComponent {
  kind: 'condo'
  id: string
  units: Array<{ id: string; count: number; netSqftPerUnit: number; pricePerSqft: number }>
  salesStartMonth: number
  salesPerMonth: number // units
  depositFraction: number // of price, received at sale
  depositsUsable: boolean // false = held in trust until closing (default practice)
  occupancyMonths: number // interim occupancy between completion and final closing
  occupancyFeePerUnitMonthly: number
  commissionFraction: number // paid at closing
  revenueBand?: Band
}

export interface CommercialComponent {
  kind: 'commercial'
  id: string
  use: 'retail' | 'office' | 'industrial' | 'other'
  netLeasableSqft: number
  rentPerSqftYear: number // net rent
  rentGrowth: number
  vacancy: number
  leaseUpMonths: number
  freeRentMonths: number
  tiPerSqft: number // paid when space is leased
  leasingCommissionPerSqft: number
  unrecoveredOpexPerSqftYear: number
  exitCapRate: number
  revenueBand?: Band
  capRateBand?: Band
}

export interface LandSaleComponent {
  kind: 'landSale'
  id: string
  sales: Array<{ month: number; amount: number; label?: string }>
  revenueBand?: Band
}

export type Component = RentalComponent | CondoComponent | CommercialComponent | LandSaleComponent

// ---------------------------------------------------------------- project

export interface DebtTerms {
  annualRate: number // construction loan, nominal annual (C4)
  ltc: number
  ltv: number
  dscr: number
  amortizationYears: number
  sweepAfterCompletion?: boolean // repay the construction loan from cash before distributing (typical for condo)
  presaleThreshold?: number // fraction of condo units sold before construction start
  refinance?: { month: number; annualRate: number; amortizationYears: number; dscr: number; ltv: number; feeFraction: number }
}

export interface ProjectInput {
  id: string
  name: string
  program?: { lotAreaSqft: number | null; planningGfaSqft: number | null; gcaAboveSqft: number; gcaBelowSqft: number; storeys?: number; podiumStoreys?: number }
  timing: { preConstructionMonths: number; constructionMonths: number; exitMonth: number }
  costLines: CostLine[]
  costEscalation: number // annual, applied to lines with escalate: true (C19)
  components: Component[]
  debt: DebtTerms
  exit: { sellingCostFraction: number }
  discountRate: number // effective annual
}

export type Phase = 'land' | 'pre-construction' | 'construction' | 'lease-up' | 'stabilized' | 'post-completion'

export interface ProjectRow {
  month: number
  phase: Phase
  costs: Record<string, number> // by cost line id, plus component costs (`<component>:ti`, `<component>:commission`)
  totalCost: number
  revenue: number // operating revenue (rent, other income, occupancy fees)
  opex: number
  noi: number
  salesProceeds: number // condo closings / usable deposits, land sales
  rentalOccupancy: number // occupied ÷ total rental units
  condoUnitsSold: number // cumulative
  depositsHeld: number // condo deposits in trust, not usable
  openingDebt: number
  interest: number
  interestCapitalized: number
  equityDraw: number
  debtDraw: number
  repayment: number
  closingDebt: number
  permOpening: number
  permInterest: number
  permPrincipal: number
  permFunded: number
  permRepayment: number
  permClosing: number
  refinanceFee: number
  distribution: number
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

export interface ProjectResult {
  engineVersion: string
  conventionVersion: string
  id: string
  name: string
  complete: boolean
  missing: string[]
  ledger: ProjectRow[]
  metrics: Record<string, Metric>
  loanSizing: LoanSizing
  checks: { sourcesEqualUses: boolean; ledgerCloses: boolean }
  warnings: string[]
}

// ---------------------------------------------------------------- validation

export function validateProject(p: ProjectInput): string[] {
  const errors = validateCostLines(p.costLines)
  const t = p.timing
  const completion = t.preConstructionMonths + t.constructionMonths
  if (!Number.isInteger(t.preConstructionMonths) || t.preConstructionMonths < 0) errors.push('preConstructionMonths must be a whole number ≥ 0')
  if (!Number.isInteger(t.constructionMonths) || t.constructionMonths < 1) errors.push('constructionMonths must be a whole number ≥ 1')
  if (!Number.isInteger(t.exitMonth) || t.exitMonth <= completion) errors.push('exitMonth must be after construction completes')
  for (const [name, value] of [['debt.ltc', p.debt.ltc], ['debt.ltv', p.debt.ltv], ['exit.sellingCostFraction', p.exit.sellingCostFraction]] as const) {
    if (!(value >= 0 && value <= 1)) errors.push(`${name} must be in [0, 1]`)
  }
  if (!(p.debt.annualRate >= 0)) errors.push('debt.annualRate must be ≥ 0')
  if (!(p.debt.dscr > 0)) errors.push('debt.dscr must be > 0')
  if (!(p.debt.amortizationYears > 0)) errors.push('debt.amortizationYears must be > 0')
  if (!(p.discountRate > -1)) errors.push('discountRate must be > -100%')
  if (!Number.isFinite(p.costEscalation)) errors.push('costEscalation must be a number')
  const r = p.debt.refinance
  if (r && !(Number.isInteger(r.month) && r.month > completion && r.month < t.exitMonth)) errors.push('refinance.month must fall after completion and before exit')

  const ids = new Set<string>()
  for (const c of p.components) {
    if (ids.has(c.id)) errors.push(`component id "${c.id}" is repeated`)
    ids.add(c.id)
    const fail = (msg: string) => errors.push(`${c.id}: ${msg}`)
    if (c.kind === 'rental') {
      if (!c.unitMix.length) fail('unitMix needs at least one unit type')
      for (const u of c.unitMix) {
        if (!Number.isInteger(u.count) || u.count < 0) fail(`${u.id} count must be a whole number ≥ 0`)
        if (!(u.vacancy >= 0 && u.vacancy < 1)) fail(`${u.id} vacancy must be in [0, 1)`)
        if (!(u.monthlyRent >= 0) || !(u.netSqftPerUnit >= 0)) fail(`${u.id} rent and area must be ≥ 0`)
      }
      if (!(c.opexPerUnitMonthly >= 0) || !(c.otherIncomeMonthly >= 0)) fail('opex and other income must be ≥ 0')
      if (!(Number.isInteger(c.leaseUpMonths) && c.leaseUpMonths >= 0)) fail('leaseUpMonths must be a whole number ≥ 0')
      if (!(c.exitCapRate > 0)) fail('exitCapRate must be > 0')
    } else if (c.kind === 'condo') {
      if (!c.units.length) fail('units needs at least one unit type')
      if (!(c.salesPerMonth > 0)) fail('salesPerMonth must be > 0')
      if (!(c.depositFraction >= 0 && c.depositFraction <= 1)) fail('depositFraction must be in [0, 1]')
      if (!(Number.isInteger(c.occupancyMonths) && c.occupancyMonths >= 0)) fail('occupancyMonths must be a whole number ≥ 0')
      if (!(Number.isInteger(c.salesStartMonth) && c.salesStartMonth >= 0)) fail('salesStartMonth must be a whole number ≥ 0')
    } else if (c.kind === 'commercial') {
      if (!(c.netLeasableSqft >= 0)) fail('netLeasableSqft must be ≥ 0')
      if (!(c.vacancy >= 0 && c.vacancy < 1)) fail('vacancy must be in [0, 1)')
      if (!(Number.isInteger(c.leaseUpMonths) && c.leaseUpMonths >= 0)) fail('leaseUpMonths must be a whole number ≥ 0')
      if (!(Number.isInteger(c.freeRentMonths) && c.freeRentMonths >= 0)) fail('freeRentMonths must be a whole number ≥ 0')
      if (!(c.exitCapRate > 0)) fail('exitCapRate must be > 0')
    } else {
      for (const s of c.sales) if (!(Number.isInteger(s.month) && s.month >= 0 && s.month <= t.exitMonth)) fail('land sale months must fall within the project')
    }
  }
  return errors
}

// ---------------------------------------------------------------- component flows

interface Flows {
  revenue: number[]
  opex: number[]
  sales: number[]
  costs: Array<Record<string, number>>
  rentalUnits: number
  rentalOccupied: number[]
  condoUnits: number
  condoSold: number[]
  depositsHeld: number[]
  /** Stabilized NOI over the 12 months after `month` (C14). Income components only. */
  forwardNoi?: (month: number) => number
  untrendedNoiAnnual: number
  capRate?: number
  warnings: string[]
}

const stepGrowth = (rate: number, month: number) => (1 + rate) ** Math.floor(month / 12)

/** C11: linear ramp to stabilized occupancy over leaseUp months after completion. */
const ramp = (month: number, completion: number, leaseUp: number, stabilized: number) => {
  const k = month - completion
  if (k < 1) return 0
  return leaseUp === 0 || k >= leaseUp ? stabilized : (k / leaseUp) * stabilized
}

function componentFlows(c: Component, completion: number, exitMonth: number): Flows {
  const n = exitMonth + 1
  const zeros = () => Array<number>(n).fill(0)
  const flows: Flows = {
    revenue: zeros(), opex: zeros(), sales: zeros(), costs: Array.from({ length: n }, () => ({})),
    rentalUnits: 0, rentalOccupied: zeros(), condoUnits: 0, condoSold: zeros(), depositsHeld: zeros(),
    untrendedNoiAnnual: 0, warnings: [],
  }

  if (c.kind === 'rental') {
    const units = c.unitMix.reduce((s, u) => s + u.count, 0)
    flows.rentalUnits = units
    const stabilizedMonthly = (month: number, grow: boolean) => {
      const g = grow ? stepGrowth(c.rentGrowth, month) : 1
      const i = grow ? stepGrowth(c.opexInflation, month) : 1
      return roundCents(c.unitMix.reduce((s, u) => s + (u.count * u.monthlyRent * g * (1 - u.vacancy)), 0) + (c.otherIncomeMonthly * g) - (c.opexPerUnitMonthly * units * i))
    }
    for (let m = completion + 1; m < n; m++) {
      const g = stepGrowth(c.rentGrowth, m)
      flows.rentalOccupied[m] = c.unitMix.reduce((s, u) => s + (u.count * ramp(m, completion, c.leaseUpMonths, 1 - u.vacancy)), 0)
      flows.revenue[m] = roundCents(c.unitMix.reduce((s, u) => s + (u.count * u.monthlyRent * g * ramp(m, completion, c.leaseUpMonths, 1 - u.vacancy)), 0) + (c.otherIncomeMonthly * g))
      flows.opex[m] = roundCents(c.opexPerUnitMonthly * units * stepGrowth(c.opexInflation, m))
    }
    flows.forwardNoi = (month) => sumCents(Array.from({ length: 12 }, (_, k) => stabilizedMonthly(month + k + 1, true)))
    flows.untrendedNoiAnnual = roundCents(stabilizedMonthly(0, false) * 12)
    flows.capRate = c.exitCapRate
  } else if (c.kind === 'commercial') {
    const stabilized = 1 - c.vacancy
    const leased = (m: number) => ramp(m, completion, c.leaseUpMonths, stabilized)
    const stabilizedMonthly = (month: number, grow: boolean) =>
      roundCents(((c.netLeasableSqft * stabilized * c.rentPerSqftYear * (grow ? stepGrowth(c.rentGrowth, month) : 1)) - (c.netLeasableSqft * c.unrecoveredOpexPerSqftYear)) / 12)
    for (let m = completion + 1; m < n; m++) {
      flows.revenue[m] = roundCents((c.netLeasableSqft * leased(m - c.freeRentMonths) * c.rentPerSqftYear * stepGrowth(c.rentGrowth, m)) / 12)
      flows.opex[m] = roundCents((c.netLeasableSqft * c.unrecoveredOpexPerSqftYear) / 12)
      const newlyLeased = c.netLeasableSqft * (leased(m) - leased(m - 1))
      if (newlyLeased > 0) {
        flows.costs[m]![`${c.id}:ti`] = roundCents(newlyLeased * c.tiPerSqft)
        flows.costs[m]![`${c.id}:leasing`] = roundCents(newlyLeased * c.leasingCommissionPerSqft)
      }
    }
    flows.forwardNoi = (month) => sumCents(Array.from({ length: 12 }, (_, k) => stabilizedMonthly(month + k + 1, true)))
    flows.untrendedNoiAnnual = roundCents(stabilizedMonthly(0, false) * 12)
    flows.capRate = c.exitCapRate
  } else if (c.kind === 'condo') {
    const units = c.units.reduce((s, u) => s + u.count, 0)
    const avgPrice = units ? c.units.reduce((s, u) => s + (u.count * u.netSqftPerUnit * u.pricePerSqft), 0) / units : 0
    const sold = (m: number) => (m < c.salesStartMonth ? 0 : Math.min(units, (m - c.salesStartMonth + 1) * c.salesPerMonth))
    const finalClosing = completion + c.occupancyMonths
    flows.condoUnits = units
    let held = 0
    for (let m = 0; m < n; m++) {
      const newSales = sold(m) - sold(m - 1)
      const closing = m === finalClosing ? sold(m) : m > finalClosing ? newSales : 0
      const deposits = newSales * avgPrice * c.depositFraction
      flows.condoSold[m] = sold(m)
      flows.sales[m] = c.depositsUsable
        ? roundCents(deposits + (closing * avgPrice * (1 - c.depositFraction)))
        : roundCents(closing * avgPrice)
      if (!c.depositsUsable) held = roundCents(held + deposits - (closing * avgPrice * c.depositFraction))
      flows.depositsHeld[m] = held
      if (m > completion && m <= finalClosing) flows.revenue[m] = roundCents(c.occupancyFeePerUnitMonthly * sold(completion))
      if (closing > 0) flows.costs[m]![`${c.id}:commission`] = roundCents(closing * avgPrice * c.commissionFraction)
    }
    if (sold(exitMonth) < units) flows.warnings.push(`${c.id}: ${roundCents(units - sold(exitMonth))} units unsold at exit`)
  } else {
    for (const s of c.sales) flows.sales[s.month] = roundCents(flows.sales[s.month]! + s.amount)
  }
  return flows
}

// ---------------------------------------------------------------- run

export function runProject(p: ProjectInput): ProjectResult {
  const errors = validateProject(p)
  if (errors.length) throw new RangeError(`Invalid project "${p.id}":\n- ${errors.join('\n- ')}`)

  const { preConstructionMonths: pre, constructionMonths: build, exitMonth } = p.timing
  const constructionStart = pre + 1
  const completion = pre + build
  const n = exitMonth + 1
  const ctx = { preConstructionMonths: pre, constructionMonths: build, escalation: p.costEscalation }

  // Cost lines
  const totals = lineTotals(p.costLines)
  const missingLines = p.costLines.filter((l) => totals.get(l.id) === null)
  const missing = missingLines.map((l) => l.id)
  const warnings: string[] = missing.length
    ? [`Not yet estimated: ${missingLines.map((l) => l.label).join(', ')}. The ledger excludes them and dependent results are withheld`]
    : []
  const lineSchedules = p.costLines.map((line) => {
    const total = totals.get(line.id) ?? 0
    const schedule = scheduleLine(total, line, ctx)
    for (const month of schedule.keys()) if (month > exitMonth) throw new RangeError(`${line.id}: scheduled after exit (month ${month})`)
    return { line, schedule }
  })

  // Components
  const flows = p.components.map((c) => componentFlows(c, completion, exitMonth))
  for (const f of flows) warnings.push(...f.warnings)
  const incomeFlows = flows.filter((f) => f.forwardNoi)
  const rentalUnits = flows.reduce((s, f) => s + f.rentalUnits, 0)
  const leaseUp = Math.max(0, ...p.components.map((c) => (c.kind === 'rental' || c.kind === 'commercial' ? c.leaseUpMonths : 0)))

  const costsAt = (m: number): Record<string, number> => {
    const costs: Record<string, number> = {}
    for (const { line, schedule } of lineSchedules) costs[line.id] = schedule.get(m) ?? 0
    for (const f of flows) for (const [k, v] of Object.entries(f.costs[m]!)) costs[k] = roundCents((costs[k] ?? 0) + v)
    return costs
  }

  const budgetToCompletion = sumCents(Array.from({ length: Math.min(completion + 1, n) }, (_, m) => sumCents(Object.values(costsAt(m)))))
  const equityRequired = roundCents((1 - p.debt.ltc) * budgetToCompletion) // C8

  // Presale threshold
  const condoUnits = flows.reduce((s, f) => s + f.condoUnits, 0)
  if (p.debt.presaleThreshold !== undefined && condoUnits > 0) {
    const soldAtStart = flows.reduce((s, f) => s + (f.condoSold[constructionStart] ?? 0), 0) / condoUnits
    if (soldAtStart + 1e-9 < p.debt.presaleThreshold) {
      warnings.push(`Presales at construction start are ${(soldAtStart * 100).toFixed(1)}%, below the ${(p.debt.presaleThreshold * 100).toFixed(0)}% lender threshold`)
    }
  }

  const rate = monthlyFromNominalAnnual(p.debt.annualRate)
  const refi = p.debt.refinance
  let debt = 0
  let perm = 0
  let permPayment = 0
  let equityUsed = 0
  let refinanceSizing: LoanSizing | null = null
  const ledger: ProjectRow[] = []

  for (let m = 0; m < n; m++) {
    const costs = costsAt(m)
    const totalCost = sumCents(Object.values(costs))
    const revenue = sumCents(flows.map((f) => f.revenue[m]!))
    const opex = sumCents(flows.map((f) => f.opex[m]!))
    const noi = roundCents(revenue - opex)
    const salesProceeds = sumCents(flows.map((f) => f.sales[m]!))
    const inflow = roundCents(noi + salesProceeds)

    const openingDebt = debt
    const interest = roundCents(openingDebt * rate) // C9
    const permOpening = perm
    const permRate = refi ? monthlyFromNominalAnnual(refi.annualRate) : 0
    const permInterest = roundCents(permOpening * permRate)
    const permPrincipal = permOpening > 0 ? Math.min(permOpening, roundCents(permPayment - permInterest)) : 0

    let equityDraw = 0
    let debtDraw = 0
    let repayment = 0
    let distribution = 0
    let interestCapitalized = 0

    if (m <= completion) {
      interestCapitalized = interest
      const need = roundCents(totalCost - inflow)
      if (need >= 0) {
        equityDraw = Math.max(0, Math.min(need, roundCents(equityRequired - equityUsed)))
        debtDraw = roundCents(need - equityDraw)
      } else {
        repayment = Math.min(-need, roundCents(openingDebt + interestCapitalized))
        distribution = roundCents(-need - repayment)
      }
    } else {
      const cash = roundCents(inflow - totalCost - interest - permInterest - permPrincipal)
      if (cash < 0) equityDraw = -cash
      else if (p.debt.sweepAfterCompletion) {
        repayment = Math.min(cash, openingDebt)
        distribution = roundCents(cash - repayment)
      } else distribution = cash
    }
    equityUsed = roundCents(equityUsed + equityDraw)

    let closingDebt = roundCents(openingDebt + debtDraw + interestCapitalized - repayment)
    let permClosing = roundCents(permOpening - permPrincipal)
    let permFunded = 0
    let refinanceFee = 0

    if (refi && m === refi.month) {
      refinanceSizing = sizeLoan({
        noiAnnual: sumCents(incomeFlows.map((f) => f.forwardNoi!(m))),
        value: sumCents(incomeFlows.map((f) => roundCents(f.forwardNoi!(m) / f.capRate!))),
        cost: Number.POSITIVE_INFINITY, // permanent lenders size on DSCR and LTV
        annualRate: refi.annualRate, amortizationYears: refi.amortizationYears, dscr: refi.dscr, ltv: refi.ltv, ltc: 1,
      })
      permFunded = roundCents(refinanceSizing.amount)
      refinanceFee = roundCents(permFunded * refi.feeFraction)
      const net = roundCents(permFunded - refinanceFee - closingDebt)
      repayment = roundCents(repayment + closingDebt)
      closingDebt = 0
      permClosing = roundCents(permClosing + permFunded)
      permPayment = roundCents(annuityPayment(permFunded, permRate, refi.amortizationYears * 12))
      if (net >= 0) distribution = roundCents(distribution + net)
      else {
        equityDraw = roundCents(equityDraw - net)
        equityUsed = roundCents(equityUsed - net)
      }
    }

    let saleValue = 0
    let sellingCosts = 0
    let permRepayment = 0
    let exitNet = 0
    if (m === exitMonth) {
      saleValue = sumCents(incomeFlows.map((f) => roundCents(f.forwardNoi!(m) / f.capRate!)))
      sellingCosts = roundCents(saleValue * p.exit.sellingCostFraction)
      const constructionPayoff = closingDebt
      repayment = roundCents(repayment + constructionPayoff)
      closingDebt = 0
      permRepayment = permClosing
      permClosing = 0
      exitNet = roundCents(saleValue - sellingCosts - constructionPayoff - permRepayment)
    }
    debt = closingDebt
    perm = permClosing

    const phase: Phase = m === 0 ? 'land' : m < constructionStart ? 'pre-construction' : m <= completion ? 'construction'
      : incomeFlows.length === 0 ? 'post-completion' : m - completion < leaseUp ? 'lease-up' : 'stabilized'

    ledger.push({
      month: m, phase, costs, totalCost, revenue, opex, noi, salesProceeds,
      rentalOccupancy: rentalUnits ? flows.reduce((s, f) => s + f.rentalOccupied[m]!, 0) / rentalUnits : 0,
      condoUnitsSold: flows.reduce((s, f) => s + f.condoSold[m]!, 0),
      depositsHeld: sumCents(flows.map((f) => f.depositsHeld[m]!)),
      openingDebt, interest, interestCapitalized, equityDraw, debtDraw, repayment, closingDebt,
      permOpening, permInterest, permPrincipal, permFunded, permRepayment, permClosing, refinanceFee,
      distribution, saleValue, sellingCosts,
      projectCashFlow: roundCents(-totalCost + inflow + saleValue - sellingCosts),
      equityCashFlow: roundCents(-equityDraw + distribution + exitNet),
    })
  }

  return { ...summarize(p, ledger, flows, missing, warnings, completion, refinanceSizing), id: p.id, name: p.name }
}

// ---------------------------------------------------------------- metrics

function summarize(
  p: ProjectInput, ledger: ProjectRow[], flows: Flows[], missing: string[], warnings: string[],
  completion: number, refinanceSizing: LoanSizing | null,
): Omit<ProjectResult, 'id' | 'name'> {
  const sum = (pick: (r: ProjectRow) => number) => sumCents(ledger.map(pick))
  const constructionRows = ledger.filter((r) => r.month <= completion)
  const capitalizedInterest = sum((r) => r.interestCapitalized)
  const usesToCompletion = roundCents(sumCents(constructionRows.map((r) => r.totalCost)) + capitalizedInterest)
  const sourcesToCompletion = sumCents(constructionRows.map((r) =>
    r.equityDraw + r.debtDraw + r.interestCapitalized + r.noi + r.salesProceeds - r.repayment - r.distribution))
  const ledgerCloses = ledger.every((r) =>
    Math.abs(r.openingDebt + r.debtDraw + r.interestCapitalized - r.repayment - r.closingDebt) < 0.005 &&
    Math.abs(r.permOpening - r.permPrincipal + r.permFunded - r.permRepayment - r.permClosing) < 0.005,
  ) && ledger.at(-1)!.closingDebt === 0 && ledger.at(-1)!.permClosing === 0
  const checks = { sourcesEqualUses: Math.abs(sourcesToCompletion - usesToCompletion) < 0.005, ledgerCloses }

  const projectFlows = ledger.map((r) => r.projectCashFlow)
  const equityFlows = ledger.map((r) => r.equityCashFlow)
  const unlevered = irr(projectFlows)
  const levered = irr(equityFlows)
  const totalDevelopmentCost = roundCents(sum((r) => r.totalCost) + capitalizedInterest)
  const peakDebt = Math.max(0, ...ledger.map((r) => r.closingDebt), ...ledger.map((r) => r.repayment))
  const equityContributed = sum((r) => r.equityDraw)
  const equityReturned = sumCents(ledger.map((r) => Math.max(0, r.equityCashFlow)))
  const saleValue = ledger.at(-1)!.saleValue
  const stabilizedNoi = sumCents(flows.map((f) => f.untrendedNoiAnnual))
  const exitMonth = p.timing.exitMonth
  const forwardNoi = sumCents(flows.filter((f) => f.forwardNoi).map((f) => f.forwardNoi!(exitMonth)))
  const totalRevenue = roundCents(sum((r) => r.revenue + r.salesProceeds) + saleValue)
  const profit = sumCents(projectFlows)
  const loanSizing = sizeLoan({
    noiAnnual: stabilizedNoi, value: saleValue, cost: totalDevelopmentCost,
    annualRate: p.debt.annualRate, amortizationYears: p.debt.amortizationYears, dscr: p.debt.dscr, ltv: p.debt.ltv, ltc: p.debt.ltc,
  })
  if (totalDevelopmentCost > 0 && peakDebt / totalDevelopmentCost > p.debt.ltc + 1e-9) {
    warnings.push('Capitalized interest pushes the construction loan above the LTC limit')
  }

  // Program
  const rentalComponents = p.components.filter((c): c is RentalComponent => c.kind === 'rental')
  const condoComponents = p.components.filter((c): c is CondoComponent => c.kind === 'condo')
  const commercialComponents = p.components.filter((c): c is CommercialComponent => c.kind === 'commercial')
  const totalUnits = rentalComponents.reduce((s, c) => s + c.unitMix.reduce((t, u) => t + u.count, 0), 0) + condoComponents.reduce((s, c) => s + c.units.reduce((t, u) => t + u.count, 0), 0)
  const residentialNsf = rentalComponents.reduce((s, c) => s + c.unitMix.reduce((t, u) => t + (u.count * u.netSqftPerUnit), 0), 0) + condoComponents.reduce((s, c) => s + c.units.reduce((t, u) => t + (u.count * u.netSqftPerUnit), 0), 0)
  const commercialNla = commercialComponents.reduce((s, c) => s + c.netLeasableSqft, 0)
  const netArea = residentialNsf + commercialNla
  const prog = p.program
  const totalGca = prog ? prog.gcaAboveSqft + prog.gcaBelowSqft : 0

  const costDependent = (m: Omit<Metric, 'missing'>): Metric => (missing.length ? { ...m, value: null, missing } : { ...m, missing: [] })
  const plain = (m: Omit<Metric, 'missing'>): Metric => ({ ...m, missing: [] })
  const exitBasis = `exit month ${exitMonth}, monthly flows annualized`
  const metric = (m: Omit<Metric, 'missing'>, dependsOnCost: boolean) => (dependsOnCost ? costDependent(m) : plain(m))

  const metrics: Record<string, Metric> = {
    totalUnits: plain({ id: 'totalUnits', label: 'Residential units', value: totalUnits, unit: 'units', basis: 'rental + condo', formula: 'Σ count', dependsOn: ['components'], warnings: [] }),
    totalNsf: plain({ id: 'totalNsf', label: 'Net residential area', value: residentialNsf, unit: 'sqft', basis: 'rental + condo', formula: 'Σ count × net sqft per unit', dependsOn: ['components'], warnings: [] }),
    commercialNla: plain({ id: 'commercialNla', label: 'Commercial net leasable area', value: commercialNla, unit: 'sqft', basis: 'retail, office, industrial', formula: 'Σ NLA', dependsOn: ['components'], warnings: [] }),
    efficiency: plain({ id: 'efficiency', label: 'Net-to-gross (above grade)', value: prog?.gcaAboveSqft ? netArea / prog.gcaAboveSqft : null, unit: 'fraction', basis: 'above-grade GCA', formula: '(residential NSF + commercial NLA) ÷ above-grade GCA', dependsOn: ['totalNsf', 'commercialNla', 'program.gcaAboveSqft'], warnings: prog && netArea > prog.gcaAboveSqft ? ['Net area exceeds above-grade GCA'] : [] }),
    fsi: plain({ id: 'fsi', label: 'FSI', value: prog && prog.planningGfaSqft !== null && prog.lotAreaSqft ? prog.planningGfaSqft / prog.lotAreaSqft : null, unit: 'ratio', basis: 'by-law counted GFA', formula: 'planning GFA ÷ lot area (never GCA)', dependsOn: ['program.planningGfaSqft', 'program.lotAreaSqft'], warnings: !prog || prog.planningGfaSqft === null ? ['Planning GFA not entered'] : [] }),
    totalDevelopmentCost: costDependent({ id: 'totalDevelopmentCost', label: 'Total development cost', value: totalDevelopmentCost, unit: 'CAD', basis: 'all cost lines + component costs + capitalized construction interest', formula: 'Σ costs + capitalized interest', dependsOn: ['costLines', 'debt.annualRate'], warnings: [] }),
    costPerGcaSqft: costDependent({ id: 'costPerGcaSqft', label: 'Cost per GCA ft²', value: totalGca ? totalDevelopmentCost / totalGca : null, unit: 'CAD/sqft', basis: 'total GCA above + below', formula: 'TDC ÷ GCA', dependsOn: ['totalDevelopmentCost'], warnings: [] }),
    totalRevenue: plain({ id: 'totalRevenue', label: 'Total revenue', value: totalRevenue, unit: 'CAD', basis: 'operating revenue + sales + exit value', formula: 'Σ revenue + Σ sales proceeds + exit value', dependsOn: ['components'], warnings: [] }),
    profit: costDependent({ id: 'profit', label: 'Unlevered profit', value: profit, unit: 'CAD', basis: 'before financing', formula: 'Σ project cash flows', dependsOn: ['projectCashFlow'], warnings: [] }),
    profitOnCost: costDependent({ id: 'profitOnCost', label: 'Profit on cost', value: totalDevelopmentCost ? profit / totalDevelopmentCost : null, unit: 'fraction', basis: 'unlevered profit ÷ TDC (not ÷ revenue)', formula: 'profit ÷ TDC', dependsOn: ['profit', 'totalDevelopmentCost'], warnings: [] }),
    stabilizedNoi: plain({ id: 'stabilizedNoi', label: 'Stabilized NOI (untrended)', value: stabilizedNoi, unit: 'CAD/yr', basis: 'month-0 rents at stabilized occupancy', formula: '12 × (Σ rent × (1 − vacancy) + other − opex)', dependsOn: ['components'], warnings: [] }),
    forwardNoi: plain({ id: 'forwardNoi', label: 'Forward NOI at exit', value: forwardNoi, unit: 'CAD/yr', basis: `12 months after month ${exitMonth}, trended`, formula: 'Σ stabilized NOI, months exit+1…exit+12', dependsOn: ['components'], warnings: [] }),
    yieldOnCost: costDependent({ id: 'yieldOnCost', label: 'Yield on cost', value: totalDevelopmentCost && stabilizedNoi ? stabilizedNoi / totalDevelopmentCost : null, unit: 'fraction', basis: 'untrended stabilized NOI', formula: 'stabilized NOI ÷ TDC', dependsOn: ['stabilizedNoi', 'totalDevelopmentCost'], warnings: [] }),
    exitValue: plain({ id: 'exitValue', label: 'Exit value (gross)', value: saleValue, unit: 'CAD', basis: `month ${exitMonth}`, formula: 'Σ forward NOI ÷ exit cap rate, per income component', dependsOn: ['forwardNoi'], warnings: [] }),
    unleveredIrr: metric({ id: 'unleveredIrr', label: 'Unlevered IRR', value: unlevered.rate === null ? null : annualizeMonthly(unlevered.rate), unit: 'fraction', basis: exitBasis, formula: 'IRR of project cash flows, (1 + monthly)^12 − 1', dependsOn: ['projectCashFlow'], warnings: unlevered.warnings }, true),
    leveredIrr: metric({ id: 'leveredIrr', label: 'Levered IRR', value: levered.rate === null ? null : annualizeMonthly(levered.rate), unit: 'fraction', basis: exitBasis, formula: 'IRR of equity cash flows, (1 + monthly)^12 − 1', dependsOn: ['equityCashFlow'], warnings: levered.warnings }, true),
    unleveredNpv: costDependent({ id: 'unleveredNpv', label: `Unlevered NPV @ ${(p.discountRate * 100).toFixed(2)}%`, value: npv(monthlyFromEffectiveAnnual(p.discountRate), projectFlows), unit: 'CAD', basis: 'month 0 dollars, effective annual discount rate', formula: 'Σ CFₜ ÷ (1 + r_m)^t', dependsOn: ['projectCashFlow', 'discountRate'], warnings: [] }),
    equityMultiple: costDependent({ id: 'equityMultiple', label: 'Equity multiple', value: equityContributed ? equityReturned / equityContributed : null, unit: 'ratio', basis: 'equity contributed, not loan (PF-009)', formula: 'Σ equity distributions ÷ Σ equity contributions', dependsOn: ['equityCashFlow'], warnings: [] }),
    equityContributed: costDependent({ id: 'equityContributed', label: 'Equity contributed', value: equityContributed, unit: 'CAD', basis: 'incl. operating shortfalls and refinance top-ups', formula: 'Σ equity draws', dependsOn: ['totalDevelopmentCost', 'debt.ltc'], warnings: [] }),
    peakDebt: costDependent({ id: 'peakDebt', label: 'Peak construction loan', value: peakDebt, unit: 'CAD', basis: 'before repayment', formula: 'max construction loan balance', dependsOn: ['totalDevelopmentCost', 'debt.ltc', 'debt.annualRate'], warnings: [] }),
    maxPermanentLoan: costDependent({ id: 'maxPermanentLoan', label: 'Max permanent loan', value: loanSizing.amount, unit: 'CAD', basis: `binding constraint: ${loanSizing.binding.toUpperCase()}`, formula: 'min(DSCR capacity, value × LTV, cost × LTC)', dependsOn: ['stabilizedNoi', 'exitValue', 'totalDevelopmentCost'], warnings: loanSizing.warnings }),
    permanentLoan: plain({ id: 'permanentLoan', label: 'Refinance proceeds', value: refinanceSizing ? roundCents(refinanceSizing.amount) : null, unit: 'CAD', basis: refinanceSizing ? `month ${p.debt.refinance!.month}, binding: ${refinanceSizing.binding.toUpperCase()}` : 'no refinance modelled', formula: 'min(DSCR capacity, value × LTV) on forward NOI', dependsOn: ['forwardNoi'], warnings: refinanceSizing?.warnings ?? [] }),
    condoUnitsSold: plain({ id: 'condoUnitsSold', label: 'Condo units sold by exit', value: condoUnits(ledger), unit: 'units', basis: `month ${exitMonth}`, formula: 'Σ sales to date', dependsOn: ['components'], warnings: [] }),
    peakDepositsHeld: plain({ id: 'peakDepositsHeld', label: 'Peak deposits held in trust', value: Math.max(0, ...ledger.map((r) => r.depositsHeld)), unit: 'CAD', basis: 'not available for construction unless insured', formula: 'max Σ deposits received − released', dependsOn: ['components'], warnings: [] }),
  }

  return { engineVersion: ENGINE_VERSION, conventionVersion: CONVENTION_VERSION, complete: missing.length === 0, missing, ledger, metrics, loanSizing, checks, warnings }
}

const condoUnits = (ledger: ProjectRow[]) => ledger.at(-1)!.condoUnitsSold

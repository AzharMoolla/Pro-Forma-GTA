// HST cash timing for a new purpose-built rental (Excise Tax Act self-supply). An overlay on the engine's ledger: the
// cost lines are before HST, and this shows what HST adds and when, without changing the main results. Pure.
//
//   During construction the builder pays HST on taxable costs and recovers it as input tax credits a filing period
//   later (the building will be self-supplied, a taxable supply). At first occupancy the builder self-assesses HST on
//   the fair market value of the building and land, less the new residential rental property rebate.
// ponytail: rental components only; condo HST (collected from buyers, buyer rebates assigned to the builder) is not
// modelled. FMV is stabilized NOI ÷ exit cap, untrended. Rules as announced, not tax advice: confirm with a tax adviser.

import { lineTotals, scheduleLine, type CostLine } from './costs'
import { roundCents } from './money'
import type { ProjectInput, RentalComponent } from './project'
import { isLandLine } from './stress'

export const HST_RATE = 0.13
export const GST_RATE = 0.05

export type RebateRule =
  | 'enhanced' // federal PBRH 100% GST (construction start 14 Sep 2023 – 2030) + Ontario 100% of the 8% provincial part
  | 'federal-only' // 100% GST rebate, provincial part payable
  | 'standard' // federal 36% of GST up to $6,300/unit, phased out $350k–$450k FMV/unit; Ontario 75% of 8% up to $24,000/unit
  | 'none'

export interface HstSettings { rebate: RebateRule; itcLagMonths: number; selfSupplyMonth?: number }

/** Government charges, land, interest and insurance carry no HST. Heuristic on ids; the UI lists what it treated as exempt. */
const EXEMPT = /levy|levies|development charge|benefits charge|\bdcs?\b|\bcbc\b|parkland|property tax|transfer tax|permit|insurance|interest|financing/i
export const isExemptLine = (line: CostLine) => isLandLine(line) || EXEMPT.test(`${line.id} ${line.catalogueId ?? ''} ${line.label}`)

export interface HstMonth { month: number; paid: number; recovered: number; selfSupply: number; outstanding: number }
export interface HstResult {
  applies: boolean
  selfSupplyMonth: number
  fmv: number
  units: number
  taxOnFmv: number
  rebate: number
  netCost: number // permanent cost: tax on FMV − rebate (input tax is all recovered)
  peakOutstanding: number // most HST paid and not yet recovered, which the project must finance
  carryCost: number // interest on the outstanding balance at the construction rate
  exemptLines: string[]
  months: HstMonth[]
}

function rebateFor(rule: RebateRule, units: number, fmv: number): number {
  const tax = HST_RATE * fmv
  const gst = GST_RATE * fmv
  if (rule === 'enhanced') return tax
  if (rule === 'federal-only') return gst
  if (rule === 'none' || units === 0) return 0
  const perUnit = fmv / units
  const fedCap = Math.min(0.36 * GST_RATE * perUnit, 6300)
  const fed = perUnit <= 350_000 ? fedCap : perUnit >= 450_000 ? 0 : fedCap * (450_000 - perUnit) / 100_000
  const ont = Math.min(0.75 * (HST_RATE - GST_RATE) * perUnit, 24_000)
  return units * (fed + ont)
}

export function hstTiming(p: ProjectInput, s: HstSettings): HstResult {
  const rentals = p.components.filter((c): c is RentalComponent => c.kind === 'rental')
  const units = rentals.reduce((n, c) => n + c.unitMix.reduce((t, u) => t + u.count, 0), 0)
  const fmv = roundCents(rentals.reduce((v, c) => {
    const rent = c.unitMix.reduce((t, u) => t + (u.count * u.monthlyRent * (1 - u.vacancy)), 0)
    const noi = 12 * (rent + c.otherIncomeMonthly - (c.opexPerUnitMonthly * c.unitMix.reduce((t, u) => t + u.count, 0)))
    return v + (Math.max(0, noi) / c.exitCapRate)
  }, 0))
  const completion = p.timing.preConstructionMonths + p.timing.constructionMonths
  const exit = p.timing.exitMonth
  const at = Math.min(s.selfSupplyMonth ?? completion + 1, exit)
  const due = (m: number) => Math.min(m + s.itcLagMonths, exit)

  // Taxable share of each month's cost lines; the rental share of the building (by units, of all residential) carries it
  const totals = lineTotals(p.costLines)
  const ctx = { preConstructionMonths: p.timing.preConstructionMonths, constructionMonths: p.timing.constructionMonths, escalation: p.costEscalation }
  const taxable = p.costLines.filter((l) => !isExemptLine(l))
  const condoUnits = p.components.reduce((n, c) => n + (c.kind === 'condo' ? c.units.reduce((t, u) => t + u.count, 0) : 0), 0)
  const share = units + condoUnits ? units / (units + condoUnits) : 0
  const paid = new Array<number>(exit + 1).fill(0)
  for (const line of taxable) for (const [m, v] of scheduleLine(totals.get(line.id) ?? 0, line, ctx)) if (m <= exit) paid[m] = roundCents(paid[m]! + (v * HST_RATE * share))
  const recovered = new Array<number>(exit + 1).fill(0)
  paid.forEach((v, m) => { recovered[due(m)] = roundCents(recovered[due(m)]! + v) })

  const taxOnFmv = roundCents(HST_RATE * fmv)
  const rebate = roundCents(Math.min(taxOnFmv, rebateFor(s.rebate, units, fmv)))
  const selfSupply = new Array<number>(exit + 1).fill(0)
  selfSupply[due(at)] = roundCents(taxOnFmv - rebate) // filed with the return for the period, rebate credited against it

  const rate = p.debt.annualRate / 12
  let outstanding = 0
  let carry = 0
  const months = paid.map((v, m) => {
    if (m <= due(at)) carry += outstanding * rate
    outstanding = roundCents(outstanding + v - recovered[m]! + selfSupply[m]!)
    return { month: m, paid: v, recovered: recovered[m]!, selfSupply: selfSupply[m]!, outstanding }
  })
  // After self-supply the remaining balance is the permanent cost, not a timing balance
  const timing = months.filter((x) => x.month < due(at))
  return {
    applies: units > 0,
    selfSupplyMonth: at, fmv, units, taxOnFmv, rebate,
    netCost: roundCents(taxOnFmv - rebate),
    peakOutstanding: Math.max(0, ...timing.map((x) => x.outstanding)),
    carryCost: roundCents(carry),
    exemptLines: p.costLines.filter(isExemptLine).map((l) => l.label),
    months,
  }
}

/**
 * Ontario land transfer tax (Land Transfer Tax Act, O. Reg. rates): 0.5% to $55k, 1% to $250k, 1.5% to $400k, 2% above;
 * 2.5% above $2M only for land with one or two single-family residences.
 */
export function ontarioLtt(price: number, singleFamily = false): number {
  const bands: Array<[number, number]> = [[55_000, 0.005], [250_000, 0.01], [400_000, 0.015], [singleFamily ? 2_000_000 : Infinity, 0.02], [Infinity, 0.025]]
  let tax = 0
  let from = 0
  for (const [to, rate] of bands) {
    if (price > from) tax += (Math.min(price, to) - from) * rate
    from = to
  }
  return roundCents(tax)
}

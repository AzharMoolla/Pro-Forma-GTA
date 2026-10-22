// Stress the model: change costs, land, timing, rates and revenue, alone or together; solve for the value of one
// lever that hits a target (residual land value, break-even revenue, the cost overrun a deal can absorb). Every answer
// re-runs the same engine on a changed input. Pure.

import { lineTotals, type CostLine } from './costs'
import { funding } from './funding'
import { isPortfolio, runNode, type Node, type NodeResult } from './portfolio'
import type { ProjectInput } from './project'
import { scaleDriver } from './uncertainty'

export interface Stress {
  revenue?: number // × rents, prices and land sales
  capBps?: number // + exit cap rate, basis points
  cost?: number // × every estimated cost line except land (percent-of lines follow their base)
  land?: number // × land price lines
  delayMonths?: number // longer construction; exit and refinance move with it
  rateBps?: number // + construction and refinance rates, basis points
}

export const isLandLine = (line: CostLine) => line.catalogueId === 'land-price' || line.id === 'land'

function stressLines(lines: CostLine[], s: Stress): CostLine[] {
  return lines.map((line) => {
    const k = isLandLine(line) ? s.land ?? 1 : s.cost ?? 1
    return line.driver === null || line.driver.kind === 'percentOf' || k === 1 ? line : { ...line, driver: scaleDriver(line.driver, k) }
  })
}

export function stress(node: Node, s: Stress): Node {
  const costLines = stressLines(node.costLines, s)
  if (isPortfolio(node)) return { ...node, costLines, children: node.children.map((c) => ({ ...c, node: stress(c.node, s) })) }
  const p: ProjectInput = node
  const r = s.revenue ?? 1
  const cap = (s.capBps ?? 0) / 1e4
  const rate = (s.rateBps ?? 0) / 1e4
  const d = s.delayMonths ?? 0
  // ponytail: lines timed to a fixed month or spread stay put under a delay; holding costs that run with the schedule
  // should use construction timing (rezoning delays use src/scenario/rezoning.ts, which scales them)
  return {
    ...p,
    costLines,
    timing: { ...p.timing, constructionMonths: p.timing.constructionMonths + d, exitMonth: p.timing.exitMonth + d },
    debt: { ...p.debt, annualRate: p.debt.annualRate + rate, ...(p.debt.refinance ? { refinance: { ...p.debt.refinance, month: p.debt.refinance.month + d, annualRate: p.debt.refinance.annualRate + rate } } : {}) },
    components: p.components.map((c) => {
      if (c.kind === 'rental') return { ...c, unitMix: c.unitMix.map((u) => ({ ...u, monthlyRent: u.monthlyRent * r })), otherIncomeMonthly: c.otherIncomeMonthly * r, exitCapRate: c.exitCapRate + cap }
      if (c.kind === 'commercial') return { ...c, rentPerSqftYear: c.rentPerSqftYear * r, exitCapRate: c.exitCapRate + cap }
      if (c.kind === 'condo') return { ...c, units: c.units.map((u) => ({ ...u, pricePerSqft: u.pricePerSqft * r })) }
      return { ...c, sales: c.sales.map((x) => ({ ...x, amount: x.amount * r })) }
    }),
  }
}

/** Total of the land price lines (null if any is not yet estimated). */
export function landTotal(node: Node): number | null {
  const totals = lineTotals(node.costLines)
  let sum = 0
  for (const line of node.costLines.filter(isLandLine)) {
    const t = totals.get(line.id)
    if (t === null || t === undefined) return null
    sum += t
  }
  if (!isPortfolio(node)) return sum
  for (const c of node.children) {
    const t = landTotal(c.node)
    if (t === null) return null
    sum += t
  }
  return sum
}

const tryRun = (node: Node): NodeResult | null => {
  try { return runNode(node) } catch { return null }
}

export type Lever = 'land' | 'revenue' | 'cost'
export type SolveResult = { multiplier: number } | { multiplier: null; reason: string }

/**
 * Multiplier on `lever` at which `metric` equals `target`, by bisection. The metric must move one way as the lever
 * rises (true for profit and returns against land, revenue and cost). The upper end doubles from 2× up to 1,024× until
 * the target is bracketed. Null with a reason when nothing in range hits it.
 */
export function solve(node: Node, lever: Lever, metric: string, target: number): SolveResult {
  const at = (k: number) => tryRun(stress(node, { [lever]: k }))?.metrics[metric]?.value ?? null
  let lo = 0
  let hi = 2
  const fLo = at(lo)
  if (fLo === null) return { multiplier: null, reason: `${metric} is unavailable at 0× ${lever}` }
  let fHi = at(hi)
  while (fHi !== null && (fLo - target) * (fHi - target) > 0 && hi < 1024) fHi = at(hi *= 2)
  if (fHi === null) return { multiplier: null, reason: `${metric} becomes unavailable before reaching the target (at ${hi}× ${lever})` }
  if ((fLo - target) * (fHi - target) > 0) return { multiplier: null, reason: `no ${lever} between 0× and ${hi}× reaches the target` }
  const rising = fHi > fLo
  for (let i = 0; i < 50 && hi - lo > 1e-6; i++) {
    const mid = (lo + hi) / 2
    const f = at(mid)
    if (f === null) return { multiplier: null, reason: `${metric} is unavailable at ${mid.toFixed(3)}×` }
    if ((f < target) === rising) lo = mid
    else hi = mid
  }
  return { multiplier: (lo + hi) / 2 }
}

export interface DownsideCase { id: string; label: string; stress: Stress }

/** The four common downside shocks; combined, they all happen at once. */
export const DOWNSIDE: DownsideCase[] = [
  { id: 'cost', label: 'Costs +10%', stress: { cost: 1.1 } },
  { id: 'delay', label: 'Construction 6 months longer', stress: { delayMonths: 6 } },
  { id: 'rate', label: 'Interest rates +1.5 points', stress: { rateBps: 150 } },
  { id: 'revenue', label: 'Rents and prices −10%', stress: { revenue: 0.9 } },
]

export interface DownsideRow { id: string; label: string; stress: Stress; result: NodeResult | null; fundingGap: number | null }

export function downside(node: Node, cases: DownsideCase[] = DOWNSIDE): DownsideRow[] {
  const combined: Stress = Object.assign({}, ...cases.map((c) => c.stress))
  const all = [{ id: 'base', label: 'As modelled', stress: {} }, ...cases, { id: 'combined', label: 'All together', stress: combined }]
  return all.map((c) => {
    const input = stress(node, c.stress)
    const result = tryRun(input)
    const f = result?.project && !isPortfolio(input) ? funding(input, result.project) : null
    return { ...c, result, fundingGap: f ? f.constructionGap + (f.refinance?.gap ?? 0) + f.exitGap : null }
  })
}

// Model a rezoning on a draft: push the schedule out and add the application's costs. Pure; the workspace locks the
// as-of-right draft as a scenario first, so both stay comparable.
//
// Every number here is an editable assumption, not a schedule: the months, the fee (Toronto's zoning by-law
// amendment fee depends on GFA and is published yearly) and the extra studies are labelled class D estimates.

import type { CostLine } from '../engine/costs'
import { isPortfolio, type Node } from '../engine/portfolio'
import type { ProjectInput } from '../engine/project'

export interface RezoningAssumptions {
  months: number // added before construction start (application, decision, by-law in force); appeals add more
  fee: number // only used if the project has no zoning by-law amendment fee line yet
  studies: number // additional planning, legal and technical studies for the application
}

export const REZONING_DEFAULTS: RezoningAssumptions = { months: 18, fee: 250_000, studies: 400_000 }

const estimate = (note: string): CostLine['source'] => ({ kind: 'estimate', note: `assumption for the rezoning scenario: ${note}` })

/** True when the rezoning lines are already in this project (so it isn't applied twice). */
export const hasRezoning = (p: ProjectInput) => p.costLines.some((l) => l.id === 'rezoning-studies')

export function rezoneProject(p: ProjectInput, a: RezoningAssumptions): ProjectInput {
  if (hasRezoning(p)) return p
  const m = a.months
  const holding = (l: CostLine) => (l.catalogueId ?? l.id).startsWith('holding')
  const costLines: CostLine[] = p.costLines.map((l) => {
    const t = l.timing
    // carrying costs are recurring: the same monthly amount for more months (a lump sum is scaled by the new length)
    if (t.kind === 'spread' && holding(l)) {
      const months = t.to - t.from + 1
      const scale = (months + m) / months
      const driver = l.driver?.kind === 'lumpSum' ? { ...l.driver, amount: l.driver.amount * scale } : l.driver
      return { ...l, driver, timing: { ...t, to: t.to + m } }
    }
    if (t.kind === 'spread' && t.from > 0) return { ...l, timing: { kind: 'spread', from: t.from + m, to: t.to + m } }
    if (t.kind === 'month' && t.month > 0) return { ...l, timing: { kind: 'month', month: t.month + m } }
    return l
  })
  if (!costLines.some((l) => l.catalogueId === 'fee-zba')) {
    costLines.push({ id: 'fee-zba', label: 'Zoning by-law amendment application fee', catalogueId: 'fee-zba', driver: { kind: 'lumpSum', amount: a.fee }, timing: { kind: 'month', month: 1 }, estimateClass: 'D', source: estimate('check the municipal fee schedule') })
  }
  costLines.push({ id: 'rezoning-studies', label: 'Rezoning: additional studies, planning and legal', catalogueId: 'planning-consultants', driver: { kind: 'lumpSum', amount: a.studies }, timing: { kind: 'spread', from: 1, to: m }, estimateClass: 'D', source: estimate('consultant quotes replace this') })
  return {
    ...p,
    timing: { ...p.timing, preConstructionMonths: p.timing.preConstructionMonths + m, exitMonth: p.timing.exitMonth + m },
    costLines,
    components: p.components.map((c) => (c.kind === 'condo' ? { ...c, salesStartMonth: c.salesStartMonth + m } : c.kind === 'landSale' ? { ...c, sales: c.sales.map((s) => ({ ...s, month: s.month + m })) } : c)),
    debt: p.debt.refinance ? { ...p.debt, refinance: { ...p.debt.refinance, month: p.debt.refinance.month + m } } : p.debt,
  }
}

/** Apply to the projects at `paths` (relative to `node`); an empty path list means every project under it. */
export function applyRezoning(node: Node, paths: string[][] | null, a: RezoningAssumptions, here: string[] = []): Node {
  const selected = (p: string[]) => paths === null || paths.some((x) => x.join('/') === p.join('/'))
  if (!isPortfolio(node)) return selected(here) ? rezoneProject(node, a) : node
  return { ...node, children: node.children.map((c) => ({ ...c, node: applyRezoning(c.node, paths, a, [...here, c.node.id]) })) }
}

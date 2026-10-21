// Roll-up (ADR-002 decision 1): a master plan or phase is a portfolio of child projects/portfolios,
// each offset in time, plus its own shared cost lines (infrastructure, parks, studies).

import { lineTotals, scheduleLine, validateCostLines, type CostLine } from './costs'
import { annualizeMonthly, irr, monthlyFromEffectiveAnnual, npv } from './finance'
import { roundCents, sumCents } from './money'
import { runProject, type Metric, type ProjectInput, type ProjectResult } from './project'

export interface PortfolioInput {
  id: string
  name: string
  discountRate: number
  costEscalation: number
  /** Shared costs at this level, in this level's months. Funded by equity (ponytail: no portfolio-level debt yet; add a facility when a real deal needs one). */
  costLines: CostLine[]
  children: Array<{ offsetMonths: number; node: Node }>
}

export type Node = ProjectInput | PortfolioInput

export const isPortfolio = (node: Node): node is PortfolioInput => 'children' in node

export interface NodeResult {
  id: string
  name: string
  kind: 'project' | 'portfolio'
  complete: boolean
  missing: string[] // paths like "phase-1/tower-a/levies"
  warnings: string[]
  projectCashFlow: number[]
  equityCashFlow: number[]
  sharedCosts: number[] // this level's own cost lines by month
  metrics: Record<string, Metric>
  children: Array<{ offsetMonths: number; result: NodeResult }>
  project?: ProjectResult
}

const value = (r: NodeResult, id: string) => r.metrics[id]?.value ?? null

export function runNode(node: Node): NodeResult {
  if (!isPortfolio(node)) return wrapProject(runProject(node))

  const errors = validateCostLines(node.costLines, false)
  if (!(node.costEscalation > -1)) errors.push('costEscalation must be > -100%')
  const childIds = new Set<string>()
  for (const child of node.children) {
    if (!(Number.isInteger(child.offsetMonths) && child.offsetMonths >= 0)) errors.push(`${child.node.id}: offsetMonths must be a whole number ≥ 0`)
    if (childIds.has(child.node.id)) errors.push(`child id "${child.node.id}" is repeated`)
    childIds.add(child.node.id)
  }
  if (errors.length) throw new RangeError(`Invalid portfolio "${node.id}":\n- ${errors.join('\n- ')}`)

  const children = node.children.map((c) => ({ offsetMonths: c.offsetMonths, result: runNode(c.node) }))
  const totals = lineTotals(node.costLines)
  const ctx = { preConstructionMonths: 0, constructionMonths: 1, escalation: node.costEscalation }
  const schedules = node.costLines.map((line) => scheduleLine(totals.get(line.id) ?? 0, line, ctx))
  const length = Math.max(
    1,
    ...children.map((c) => c.offsetMonths + c.result.projectCashFlow.length),
    ...schedules.flatMap((s) => [...s.keys()].map((m) => m + 1)),
  )

  const sharedCosts = Array.from({ length }, (_, m) => sumCents(schedules.map((s) => s.get(m) ?? 0)))
  const projectCashFlow = sharedCosts.map((c) => -c)
  const equityCashFlow = sharedCosts.map((c) => -c)
  for (const { offsetMonths, result } of children) {
    result.projectCashFlow.forEach((v, m) => (projectCashFlow[m + offsetMonths] = roundCents(projectCashFlow[m + offsetMonths]! + v)))
    result.equityCashFlow.forEach((v, m) => (equityCashFlow[m + offsetMonths] = roundCents(equityCashFlow[m + offsetMonths]! + v)))
  }

  const missing = [
    ...node.costLines.filter((l) => totals.get(l.id) === null).map((l) => `${node.id}/${l.id}`),
    ...children.flatMap((c) => c.result.missing.map((path) => `${node.id}/${path}`)),
  ]
  const warnings = children.flatMap((c) => c.result.warnings.map((w) => `${c.result.name}: ${w}`))
  const sharedTotal = sumCents(sharedCosts)
  const childSum = (id: string) => sumCents(children.map((c) => value(c.result, id) ?? 0))
  const complete = missing.length === 0

  const unlevered = irr(projectCashFlow)
  const levered = irr(equityCashFlow)
  // Gross basis: each child's own calls and distributions, plus shared costs as calls. No recycling between children:
  // a distribution from one block is not assumed to fund another block's call.
  const equityContributed = roundCents(sharedTotal + childSum('equityContributed'))
  const equityReturned = childSum('equityReturned')
  const capitalizedInterest = childSum('capitalizedInterest')
  let cumulative = 0
  let peakEquity = 0
  for (const v of equityCashFlow) {
    cumulative += v
    peakEquity = Math.max(peakEquity, -cumulative)
  }
  const totalCost = roundCents(sharedTotal + childSum('totalDevelopmentCost'))
  const profit = sumCents(projectCashFlow)

  const m = (metric: Omit<Metric, 'missing'>, costDependent = true): Metric =>
    costDependent && !complete ? { ...metric, value: null, missing } : { ...metric, missing: [] }
  const basis = `${length} months, children offset in time`

  const metrics: Record<string, Metric> = {
    totalUnits: m({ id: 'totalUnits', label: 'Residential units', value: childSum('totalUnits'), unit: 'units', basis: 'all children', formula: 'Σ children', dependsOn: ['children'], warnings: [] }, false),
    commercialNla: m({ id: 'commercialNla', label: 'Commercial net leasable area', value: childSum('commercialNla'), unit: 'sqft', basis: 'all children', formula: 'Σ children', dependsOn: ['children'], warnings: [] }, false),
    sharedCosts: m({ id: 'sharedCosts', label: 'Shared costs at this level', value: sharedTotal, unit: 'CAD', basis: 'infrastructure, parks, studies at this level', formula: 'Σ own cost lines', dependsOn: ['costLines'], warnings: [] }),
    totalDevelopmentCost: m({ id: 'totalDevelopmentCost', label: 'Total development cost', value: totalCost, unit: 'CAD', basis: 'shared + Σ children TDC', formula: 'shared costs + Σ child TDC', dependsOn: ['sharedCosts', 'children'], warnings: [] }),
    totalRevenue: m({ id: 'totalRevenue', label: 'Total revenue', value: childSum('totalRevenue'), unit: 'CAD', basis: 'all children', formula: 'Σ children', dependsOn: ['children'], warnings: [] }, false),
    profit: m({ id: 'profit', label: 'Unlevered profit', value: profit, unit: 'CAD', basis: 'before financing', formula: 'Σ rolled-up project cash flows', dependsOn: ['projectCashFlow'], warnings: [] }),
    profitOnCost: m({ id: 'profitOnCost', label: 'Profit on cost', value: totalCost ? (profit - capitalizedInterest) / totalCost : null, unit: 'fraction', basis: 'after capitalized construction interest, ÷ TDC incl. that interest', formula: '(unlevered profit − Σ child capitalized interest) ÷ TDC', dependsOn: ['profit', 'capitalizedInterest', 'totalDevelopmentCost'], warnings: [] }),
    profitOnCostBeforeFinancing: m({ id: 'profitOnCostBeforeFinancing', label: 'Profit on cost before financing', value: totalCost - capitalizedInterest ? profit / (totalCost - capitalizedInterest) : null, unit: 'fraction', basis: 'unlevered profit ÷ cost excluding financing', formula: 'unlevered profit ÷ (TDC − capitalized interest)', dependsOn: ['profit', 'capitalizedInterest', 'totalDevelopmentCost'], warnings: [] }),
    capitalizedInterest: m({ id: 'capitalizedInterest', label: 'Capitalized construction interest', value: capitalizedInterest, unit: 'CAD', basis: 'Σ children; shared costs are equity-funded', formula: 'Σ child capitalized interest', dependsOn: ['children'], warnings: [] }),
    equityReturned: m({ id: 'equityReturned', label: 'Equity distributed', value: equityReturned, unit: 'CAD', basis: 'gross, Σ children', formula: 'Σ child distributions', dependsOn: ['children'], warnings: [] }),
    unleveredIrr: m({ id: 'unleveredIrr', label: 'Unlevered IRR', value: unlevered.rate === null ? null : annualizeMonthly(unlevered.rate), unit: 'fraction', basis, formula: 'IRR of rolled-up project cash flows', dependsOn: ['projectCashFlow'], warnings: unlevered.warnings }),
    leveredIrr: m({ id: 'leveredIrr', label: 'Levered IRR', value: levered.rate === null ? null : annualizeMonthly(levered.rate), unit: 'fraction', basis, formula: 'IRR of rolled-up equity cash flows', dependsOn: ['equityCashFlow'], warnings: levered.warnings }),
    unleveredNpv: m({ id: 'unleveredNpv', label: `Unlevered NPV @ ${(node.discountRate * 100).toFixed(2)}%`, value: npv(monthlyFromEffectiveAnnual(node.discountRate), projectCashFlow), unit: 'CAD', basis: 'month 0 of this level', formula: 'Σ CFₜ ÷ (1 + r_m)^t', dependsOn: ['projectCashFlow'], warnings: [] }),
    equityContributed: m({ id: 'equityContributed', label: 'Equity contributed', value: equityContributed, unit: 'CAD', basis: 'shared costs + Σ children', formula: 'shared + Σ child equity', dependsOn: ['children'], warnings: [] }),
    peakEquity: m({ id: 'peakEquity', label: 'Peak equity at risk', value: roundCents(peakEquity), unit: 'CAD', basis: 'max cumulative net equity outflow', formula: 'max −Σ equity CF to date', dependsOn: ['equityCashFlow'], warnings: [] }),
    equityMultiple: m({ id: 'equityMultiple', label: 'Equity multiple', value: equityContributed ? equityReturned / equityContributed : null, unit: 'ratio', basis: 'gross, no recycling between children', formula: 'Σ child distributions ÷ (shared costs + Σ child contributions)', dependsOn: ['children'], warnings: [] }),
  }

  return { id: node.id, name: node.name, kind: 'portfolio', complete, missing, warnings, projectCashFlow, equityCashFlow, sharedCosts, metrics, children }
}

function wrapProject(result: ProjectResult): NodeResult {
  return {
    id: result.id, name: result.name, kind: 'project', complete: result.complete,
    missing: result.missing.map((id) => `${result.id}/${id}`), warnings: result.warnings,
    projectCashFlow: result.ledger.map((r) => r.projectCashFlow),
    equityCashFlow: result.ledger.map((r) => r.equityCashFlow),
    sharedCosts: [], metrics: result.metrics, children: [], project: result,
  }
}

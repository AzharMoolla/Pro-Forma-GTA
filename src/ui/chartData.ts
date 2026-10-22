// Data behind the Charts section. Pure: every chart reads the same engine results as the tables, never a second
// calculation path (the sensitivity grid re-runs the engine on scaled inputs).

import { isPortfolio, runNode, type Node, type NodeResult } from '../engine/portfolio'
import type { ProjectResult } from '../engine/project'
import { stress } from '../engine/stress'

export interface Series { id: string; label: string; colour: string; sign: 1 | -1 }
export interface StackedRow { label: string; values: Record<string, number> }

/** Project: funding (equity, loans, income and sales) above the axis, spending below, by year. */
export function fundingByYear(r: ProjectResult): { series: Series[]; rows: StackedRow[] } {
  const series: Series[] = [
    { id: 'equity', label: 'Equity', colour: 'var(--chart-in)', sign: 1 },
    { id: 'debt', label: 'Loans drawn', colour: 'var(--chart-3)', sign: 1 },
    { id: 'income', label: 'Income, sales and exit', colour: 'var(--chart-4)', sign: 1 },
    { id: 'costs', label: 'Development costs', colour: 'var(--chart-out)', sign: -1 },
  ]
  const rows: StackedRow[] = []
  for (const row of r.ledger) {
    const y = Math.floor(row.month / 12)
    const at = (rows[y] ??= { label: `Y${y + 1}`, values: { equity: 0, debt: 0, income: 0, costs: 0 } }).values
    at.equity! += row.equityDraw
    at.debt! += row.debtDraw + row.permFunded
    at.income! += Math.max(0, row.noi + row.salesProceeds + row.saleValue - row.sellingCosts)
    at.costs! += row.totalCost
  }
  return { series, rows }
}

/** Portfolio (or any node): investor calls below the axis, distributions above, by year. */
export function equityByYear(r: NodeResult): { series: Series[]; rows: StackedRow[] } {
  const series: Series[] = [
    { id: 'distributions', label: 'Distributions to equity', colour: 'var(--chart-in)', sign: 1 },
    { id: 'calls', label: 'Equity calls', colour: 'var(--chart-out)', sign: -1 },
  ]
  const rows: StackedRow[] = []
  r.equityCashFlow.forEach((v, m) => {
    const y = Math.floor(m / 12)
    const at = (rows[y] ??= { label: `Y${y + 1}`, values: { distributions: 0, calls: 0 } }).values
    if (v >= 0) at.distributions! += v
    else at.calls! += -v
  })
  return { series, rows }
}

export interface Grid { rows: number[]; cols: number[]; cells: Array<Array<number | null>>; base: number | null }

/** Metric across revenue multipliers (rows) and exit-cap shifts in bps (columns). Unavailable results stay null. */
export function sensitivityGrid(node: Node, metric: string, rows = [0.9, 0.95, 1, 1.05, 1.1], cols = [-50, -25, 0, 25, 50]): Grid {
  const run = (m: number, bps: number) => {
    try { return runNode(stress(node, { revenue: m, capBps: bps })).metrics[metric]?.value ?? null } catch { return null }
  }
  return { rows, cols, cells: rows.map((m) => cols.map((bps) => run(m, bps))), base: run(1, 0) }
}

export interface Bar { name: string; start: number; segments: Array<{ id: string; label: string; months: number; colour: string }> }

/** Schedule per building: pre-construction, construction, lease-up or closings, and the hold to exit. */
export function timeline(node: Node, offset = 0): Bar[] {
  if (isPortfolio(node)) return node.children.flatMap((c) => timeline(c.node, offset + c.offsetMonths))
  const t = node.timing
  const after = Math.max(0, ...node.components.map((c) => (c.kind === 'rental' || c.kind === 'commercial' ? c.leaseUpMonths : c.kind === 'condo' ? c.occupancyMonths : 0)))
  const completion = t.preConstructionMonths + t.constructionMonths
  const lease = Math.min(after, t.exitMonth - completion)
  return [{
    name: node.name, start: offset,
    segments: [
      { id: 'pre', label: 'Pre-construction and approvals', months: t.preConstructionMonths + 1, colour: 'var(--chart-4)' },
      { id: 'build', label: 'Construction', months: t.constructionMonths, colour: 'var(--chart-out)' },
      { id: 'lease', label: 'Lease-up or closings', months: lease, colour: 'var(--chart-3)' },
      { id: 'hold', label: 'Operations to exit', months: Math.max(0, t.exitMonth - completion - lease), colour: 'var(--chart-in)' },
    ].filter((s) => s.months > 0),
  }]
}

export function toCsv(header: string[], rows: Array<Array<string | number | null>>): string {
  const cell = (v: string | number | null) => {
    const s = v === null ? '' : String(v)
    // quote, and neutralize spreadsheet formula injection (cells starting with = + - @)
    const safe = /^[=+\-@]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\n')
}

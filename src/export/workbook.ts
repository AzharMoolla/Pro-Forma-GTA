// The export workbook: what someone needs to check the result without the app. Every number keeps its basis,
// formula or source; unknowns stay blank and are listed, never written as zero.

import type { Attributes, Catalogue } from '../engine/catalogue'
import { lineTotals, type CostLine } from '../engine/costs'
import type { Insight } from '../engine/insights'
import type { Feasibility } from '../engine/stress'
import type { Assumption } from '../engine/assumptions'
import { isPortfolio, type Node, type NodeResult } from '../engine/portfolio'
import { CONVENTION_VERSION, ENGINE_VERSION } from '../engine/project'
import type { TrackerView } from '../tracker/tracker'
import type { Cell, Sheet } from './xlsx'

export interface WorkbookInput {
  projectName: string
  projectType: string
  draft: Node
  result: NodeResult
  attributes: Attributes
  catalogue: Catalogue
  coverage: Array<{ item: { id: string; label: string; stage: string; src: string; ref?: string }; status: string; note: string }>
  readiness: { model: string; scope: string; sources: string }
  insights: Insight[]
  tracker: TrackerView
  scenarios: Array<{ id: string; label: string; note: string; createdAt: string; inputHash: string; engineVersion: string }>
  draftParentId: string | null
  dataContext: Record<string, string>
  exportedAt: string // ISO
  synthetic: boolean
  sensitivity?: { metric: string; rows: number[]; cols: number[]; cells: Array<Array<number | null>> }
  feasibility?: Feasibility
  assumptions?: Assumption[]
  /** Charts pinned to the report: each one's data, as its own sheet */
  charts?: Array<{ title: string; rows: Cell[][] }>
}

/** Every leaf of an object as [path, value], arrays of objects with ids keyed by id. */
export function flatten(value: unknown, path = ''): Array<[string, Cell]> {
  if (value === null || value === undefined) return [[path, null]]
  if (typeof value !== 'object') return [[path, value as Cell]]
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => flatten(v, `${path}.${v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string' ? (v as { id: string }).id : i}`))
  }
  return Object.entries(value).flatMap(([k, v]) => flatten(v, path ? `${path}.${k}` : k))
}

function nodes(node: Node, path: string[] = []): Array<{ path: string[]; node: Node }> {
  return [{ path, node }, ...(isPortfolio(node) ? node.children.flatMap((c) => nodes(c.node, [...path, c.node.id])) : [])]
}

const driverText = (l: CostLine) => {
  const d = l.driver
  if (!d) return 'not yet estimated'
  switch (d.kind) {
    case 'lumpSum': return 'lump sum'
    case 'perUnit': return `${d.rate} × ${d.units} units`
    case 'perArea': return `${d.rate} × ${d.area} ft²`
    case 'perLinear': return `${d.rate}/m × ${d.metres} m`
    case 'perHectare': return `${d.rate}/ha × ${d.hectares} ha`
    case 'percentOf': return `${(d.rate * 100).toFixed(2)}% of ${d.of.join(' + ')}`
  }
}
const timingText = (l: CostLine) => {
  const t = l.timing
  return t.kind === 'month' ? `month ${t.month}` : t.kind === 'spread' ? `months ${t.from}–${t.to}` : t.kind
}

export function workbookSheets(w: WorkbookInput): Sheet[] {
  const r = w.result
  const sources = (() => { try { return JSON.parse(String(w.attributes['location.sources'] ?? '{}')) as Record<string, { layer: string; url: string; retrievedAt: string; value: unknown }> } catch { return {} } })()
  const label = new Map(w.catalogue.variables.map((v) => [v.id, v]))
  const stage = new Map(w.catalogue.stages.map((s) => [s.id, s.label]))

  const summary: Sheet = {
    name: 'Summary',
    widths: [34, 22, 60],
    rows: [
      ['Item', 'Value', 'Notes'],
      ['Project', w.projectName, w.projectType],
      ['Exported', w.exportedAt, 'Draft as shown in the app at export time'],
      ['Draft from scenario', w.draftParentId ?? 'none (unsaved draft)', 'Lock a scenario for a citable, hashed version'],
      ['Engine / conventions', `${ENGINE_VERSION} / ${CONVENTION_VERSION}`, 'docs/implementation/ADR-001, DECISION_LOG'],
      ...Object.entries(w.dataContext).map(([k, v]): Cell[] => [`Reference data: ${k}`, v, '']),
      ['Readiness: model', w.readiness.model, 'Every cost line has a value?'],
      ['Readiness: scope', w.readiness.scope, 'Every applicable item accounted for?'],
      ['Readiness: sources', w.readiness.sources, 'Figures with a recorded, reviewed source'],
      ['Data', w.synthetic ? 'SYNTHETIC demo figures' : 'User inputs', w.synthetic ? 'Placeholders for illustration, not market evidence' : ''],
      [],
      ['Metric', 'Value', 'Basis · formula · withheld because'],
      ...Object.values(r.metrics).map((m): Cell[] => [m.label + (m.unit ? ` (${m.unit})` : ''), m.value, [m.basis, m.formula, m.missing.length ? `withheld: ${m.missing.join(', ')}` : '', ...m.warnings].filter(Boolean).join(' · ')]),
      [],
      ['Warnings', '', ''],
      ...r.warnings.map((x): Cell[] => ['', '', x]),
      [],
      ['Not financial, tax, lending, legal or planning advice. Map facts are screening data from public sources (see Site & policy); check the operative by-laws and plans.', '', ''],
    ],
  }

  const inputs: Sheet = {
    name: 'Inputs',
    widths: [70, 24],
    rows: [['Input (path)', 'Value'], ...nodes(w.draft).flatMap(({ path, node }) => {
      const { costLines: _c, children: _ch, ...rest } = node as Node & { children?: unknown }
      void _c; void _ch
      return flatten(rest, path.length ? path.join('/') : node.id).map(([k, v]): Cell[] => [k, v])
    })],
  }

  const costs: Sheet = {
    name: 'Cost lines',
    rows: [['Building', 'Line id', 'Label', 'Catalogue item', 'Stage', 'Driver', 'Amount / rate', 'Total (base $)', 'Timing', 'Escalated', 'Class', 'Band low', 'Band high', 'Source kind', 'Reference', 'Value date', 'Owner', 'Reviewed by', 'Reviewed on'],
      ...nodes(w.draft).flatMap(({ path, node }) => {
        const totals = lineTotals(node.costLines)
        const cat = new Map(w.catalogue.items.map((i) => [i.id, i]))
        return node.costLines.map((l): Cell[] => {
          const d = l.driver
          return [path.join('/') || node.name, l.id, l.label, l.catalogueId ?? '', l.catalogueId ? stage.get(cat.get(l.catalogueId)?.stage ?? '') ?? '' : '', driverText(l),
            d ? ('amount' in d ? d.amount : d.rate) : null, totals.get(l.id) ?? null, timingText(l), l.escalate === true, l.estimateClass, l.band?.low ?? null, l.band?.high ?? null,
            l.source?.kind ?? '', l.source?.ref ?? '', l.source?.valueDate ?? '', l.source?.owner ?? '', l.source?.reviewed?.by ?? '', l.source?.reviewed?.at ?? '']
        })
      })],
  }

  const ledger: Sheet = r.project
    ? { name: 'Ledger (monthly)', rows: [
      ['Month', 'Phase', 'Costs', 'Revenue', 'Opex', 'NOI', 'Sales proceeds', 'Equity draw', 'Debt draw', 'Interest', 'Interest capitalized', 'Repayment', 'Closing debt', 'Perm funded', 'Perm interest', 'Perm principal', 'Perm closing', 'Distribution', 'Sale value', 'Selling costs', 'Project cash flow', 'Equity cash flow'],
      ...r.project.ledger.map((x): Cell[] => [x.month, x.phase, x.totalCost, x.revenue, x.opex, x.noi, x.salesProceeds, x.equityDraw, x.debtDraw, x.interest, x.interestCapitalized, x.repayment, x.closingDebt, x.permFunded, x.permInterest, x.permPrincipal, x.permClosing, x.distribution, x.saleValue, x.sellingCosts, x.projectCashFlow, x.equityCashFlow]),
    ] }
    : { name: 'Cash flows (monthly)', rows: [['Month', 'Project cash flow', 'Equity cash flow', 'Shared costs at this level'], ...r.projectCashFlow.map((v, m): Cell[] => [m, v, r.equityCashFlow[m] ?? null, r.sharedCosts[m] ?? null])] }

  const site: Sheet = {
    name: 'Site & policy',
    rows: [['Variable', 'Label', 'Value', 'Applies to', 'Source', 'Source URL', 'Retrieved', 'Matches the map?'],
      ...Object.entries(w.attributes).filter(([k]) => k !== 'location.sources').sort(([a], [b]) => a.localeCompare(b)).map(([k, v]): Cell[] => {
        const [scope, id] = k.includes('|') ? k.split('|') as [string, string] : ['project', k]
        const src = sources[k]
        return [id, label.get(id)?.label ?? '', typeof v === 'object' ? JSON.stringify(v) : v, scope, src?.layer ?? label.get(id)?.source ?? '', src?.url ?? label.get(id)?.ref ?? '', src?.retrievedAt ?? '', src ? (src.value === v ? 'yes' : `changed (map said ${String(src.value)})`) : '']
      })],
  }

  const checklist: Sheet = {
    name: 'Checklist',
    rows: [['Item', 'Label', 'Stage', 'Status', 'Where it is / why', 'Source tag', 'Reference'],
      ...w.coverage.map((e): Cell[] => [e.item.id, e.item.label, stage.get(e.item.stage) ?? e.item.stage, e.status, e.note, e.item.src, e.item.ref ?? ''])],
  }

  const tracker: Sheet = {
    name: 'Tracker',
    rows: [['Stage', 'Task', 'Status', 'In model', 'Budget', 'Spent (blank = not recorded)', 'Forecast at completion (blank = unknown)', 'Receipts', 'Notes'],
      ...w.tracker.stages.flatMap((s) => s.tasks.map((t): Cell[] => [s.label, t.item.label, t.record.status, t.inModel, t.budget, t.record.actual, t.forecast, t.record.receipts.length, t.record.notes]))],
  }

  const analysis: Sheet = {
    name: 'Analysis',
    rows: [['Severity', 'Observation', 'Detail', 'Drivers', 'Source'], ...w.insights.map((i): Cell[] => [i.severity, i.title, i.detail, i.drivers.join(' · '), i.source ?? ''])],
  }

  const scenarios: Sheet = {
    name: 'Scenarios',
    rows: [['Id', 'Name', 'Purpose', 'Locked at', 'SHA-256 of inputs, variables and versions', 'Engine'], ...w.scenarios.map((s): Cell[] => [s.id, s.label, s.note, s.createdAt, s.inputHash, s.engineVersion])],
  }

  const sheets = [summary, inputs, costs, ledger, site, checklist, tracker, analysis, scenarios]
  if (w.assumptions) {
    sheets.push({ name: 'Assumptions', rows: [
      ['Group', 'Assumption', 'On', 'Can switch off', 'Value', 'Basis', 'Effect', 'To verify'],
      ...w.assumptions.map((a): Cell[] => [a.group, a.label, a.on ? 'on' : 'OFF', a.toggle ? 'yes' : 'no', a.value, a.basis, a.effect, a.toVerify ? 'yes' : '']),
    ] })
  }
  if (w.feasibility) {
    const f = w.feasibility
    const m = (r: Feasibility['downside'][number], id: string) => r.result?.metrics[id]?.value ?? null
    const fund = f.funding
    sheets.push({
      name: 'Feasibility',
      rows: [
        ['Funding (this building)', 'Value', 'Basis'],
        ...(fund ? [
          ['Funding gap (total)', f.fundingGap, 'construction + refinance + exit gaps'],
          ['Lender commitment', fund.facilityLimit, 'LTC × (costs to completion + capitalized interest)'],
          ['Peak construction loan', fund.peakDebt, `month ${fund.peakDebtMonth}`],
          ['Construction gap', fund.constructionGap, 'peak loan above the commitment'],
          ['Refinance gap', fund.refinance?.gap ?? null, fund.refinance ? `month ${fund.refinance.month}: balance ${Math.round(fund.refinance.constructionBalance)} vs net proceeds ${Math.round(fund.refinance.netProceeds)}` : 'no refinance modelled'],
          ['Exit gap', fund.exitGap, 'loans the sale does not repay'],
          ['Peak equity out of pocket', fund.peakEquity, `month ${fund.peakEquityMonth}`],
        ] as Cell[][] : [['Each building carries its own loan', null, 'see the building-level export'] as Cell[]]),
        [],
        ['Combined downside', 'Profit on cost', 'Levered IRR', 'Unlevered profit', 'Funding gap'],
        ...f.downside.map((r): Cell[] => [r.label, m(r, 'profitOnCost'), m(r, 'leveredIrr'), m(r, 'profit'), r.fundingGap]),
      ],
    })
  }
  if (w.sensitivity) {
    const g = w.sensitivity
    sheets.push({ name: 'Sensitivity', rows: [[`${g.metric}: revenue × exit cap (bps)`, ...g.cols.map((c) => `${c >= 0 ? '+' : ''}${c} bps`)], ...g.rows.map((m, i): Cell[] => [`revenue ${m >= 1 ? '+' : ''}${Math.round((m - 1) * 100)}%`, ...g.cells[i]!])] })
  }
  // Pinned charts: Excel sheet names are at most 31 characters and cannot hold : \ / ? * [ ]
  const names = new Set(sheets.map((x) => x.name))
  for (const c of w.charts ?? []) {
    const base = `Chart - ${c.title.replace(/[:\\/?*[\]]/g, '')}`.slice(0, 31)
    let name = base
    for (let k = 2; names.has(name); k++) name = `${base.slice(0, 28)} ${k}`
    names.add(name)
    sheets.push({ name, rows: [[c.title], ...c.rows] })
  }
  sheets.push({
    name: 'Licences & notes',
    widths: [110],
    rows: [['Notes'],
      ['Map data: Contains information licensed under the Open Government Licence – Ontario and the Open Government Licence – Toronto; Durham Region, City of Oshawa and TRCA open data under their stated terms (docs/implementation/PLANNING_MAP_DATA.md).'],
      ['Map facts are point-based screening, not a zoning opinion: a missing match is not clearance; parcels, amendments and legacy by-laws are not resolved.'],
      ['Cost benchmarks: catalogue source tags (V verified, S source identified, Q quote, P proposed). Altus Cost Guide figures, where used, are not redistributed here.'],
      ['Unknown values are left blank and listed under "withheld"; they are never treated as zero.']],
  })
  return sheets
}

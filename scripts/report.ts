// Generates docs/implementation/PROJECT_TYPE_CHECKLISTS.md and MOCK_PROJECTS.md from the catalogue and the engine.
// Run: npm run report

import { writeFileSync } from 'node:fs'
import catalogueJson from '../data/costs/catalogue.json' with { type: 'json' }
import mockAJson from '../data/projects/mock-a-toronto-mixed-use.json' with { type: 'json' }
import { mockB, mockBMeta } from '../data/projects/mock-b-durham-master-plan.ts'
import { checklist, type Attributes, type Catalogue } from '../src/engine/catalogue.ts'
import { lineTotals } from '../src/engine/costs.ts'
import { isPortfolio, runNode, type Node, type NodeResult } from '../src/engine/portfolio.ts'
import type { ProjectInput } from '../src/engine/project.ts'
import { simulate, tornado } from '../src/engine/uncertainty.ts'

const catalogue = catalogueJson as unknown as Catalogue
const stageOf = new Map(catalogue.items.map((i) => [i.id, i.stage]))
const SRC: Record<string, string> = { V: 'verified', S: 'source', Q: 'quote', P: 'proposed' }

const money = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v < 0 ? '−' : ''}$${(Math.abs(v) / 1e6).toFixed(Math.abs(v) >= 1e8 ? 0 : 2)}M`)
const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`)
const fmt = (unit: string, v: number | null | undefined) =>
  unit === 'fraction' ? pct(v) : unit === 'CAD' || unit === 'CAD/yr' ? money(v) : v === null || v === undefined ? '—' : unit === 'ratio' ? `${v.toFixed(2)}×` : unit === 'CAD/sqft' ? `$${v.toFixed(0)}` : Math.round(v).toLocaleString('en-CA')

// ---------------------------------------------------------------- checklists by project type

function checklistDoc(): string {
  const out: string[] = [
    '# Cost checklists by project type',
    '',
    `Generated from \`data/costs/catalogue.json\` (v${catalogue.version}, as of ${catalogue.asOf}) by \`npm run report\`. Do not edit by hand.`,
    '',
    `The catalogue holds **${catalogue.variables.length} project variables** and **${catalogue.items.length} cost items** across ${catalogue.stages.length} stages. Each project type below lists every item that can apply. Items marked **if …** are switched on by a project variable (dirty soil, affordable units, TTC proximity, amenities and so on). Source tags: verified · source · quote · proposed (not law).`,
    '',
    '| Project type | Always applies | Conditional | Example |',
    '|---|---|---|---|',
  ]
  const lists = catalogue.projectTypes.map((t) => ({ t, list: checklist(catalogue, t.id, {}) }))
  for (const { t, list } of lists) out.push(`| ${t.label} | ${list.counts.applies} | ${list.counts.toConfirm} | ${t.example} |`)
  out.push('', '## Variables (the switches)', '', '| Group | Count | Examples |', '|---|---|---|')
  const groups = new Map<string, string[]>()
  for (const v of catalogue.variables) groups.set(v.group, [...(groups.get(v.group) ?? []), v.label])
  for (const [g, labels] of groups) out.push(`| ${g} | ${labels.length} | ${labels.slice(0, 4).join('; ')}${labels.length > 4 ? '; …' : ''} |`)

  for (const { t, list } of lists) {
    out.push('', `## ${t.label}`, '', `*Components:* ${t.components.join(', ')} · *Example:* ${t.example}`, '')
    for (const stage of list.stages) {
      out.push(`**${stage.label}**`, '')
      for (const e of stage.entries) {
        const cond = e.status === 'to-confirm' ? ` — *if ${(e.item.when ?? []).join(' and ')}*` : ''
        const val = e.item.value !== undefined ? ` (${e.item.value}${e.item.unit ? ` ${e.item.unit}` : ''})` : ''
        out.push(`- ${e.item.label}${val} · \`${e.item.driver}\` · class ${e.item.class} · ${SRC[e.item.src]}${cond}`)
      }
      out.push('')
    }
  }
  return out.join('\n')
}

// ---------------------------------------------------------------- mock reports

interface LineTotal { id: string; label: string; stage: string; total: number }

function collectLines(node: Node, result: NodeResult, prefix = ''): LineTotal[] {
  const path = prefix ? `${prefix} › ${node.name}` : node.name
  if (isPortfolio(node)) {
    const totals = lineTotals(node.costLines)
    const own = node.costLines.map((l) => ({ id: l.id, label: `${l.label}${prefix ? ` (${path})` : ''}`, stage: stageOf.get(l.catalogueId ?? '') ?? '?', total: totals.get(l.id) ?? 0 }))
    return [...own, ...node.children.flatMap((c, i) => collectLines(c.node, result.children[i]!.result, path))]
  }
  const ledger = result.project!.ledger
  const sums = new Map<string, number>()
  for (const row of ledger) for (const [k, v] of Object.entries(row.costs)) sums.set(k, (sums.get(k) ?? 0) + v)
  const labels = new Map(node.costLines.map((l) => [l.id, l]))
  const lines: LineTotal[] = [...sums.entries()].map(([k, total]) => {
    const line = labels.get(k)
    const stage = line ? stageOf.get(line.catalogueId ?? '') ?? '?' : k.endsWith(':commission') ? 's11' : 's13'
    return { id: k, label: `${line?.label ?? k}${prefix ? ` (${node.name})` : ''}`, stage, total }
  })
  const interest = ledger.reduce((s, r) => s + r.interest + r.permInterest + r.refinanceFee, 0)
  lines.push({ id: 'interest', label: `Interest and refinance fees${prefix ? ` (${node.name})` : ''}`, stage: 's9', total: interest })
  return lines
}

function yearly(values: number[]): number[] {
  const years: number[] = []
  values.forEach((v, m) => (years[Math.floor(m / 12)] = (years[Math.floor(m / 12)] ?? 0) + v))
  return years
}

function mockSection(meta: { name: string; projectType: string; reference: string; notes: string[]; attributes: Attributes; coverage: Record<string, string> }, node: Node, seed: number, draws: number): string {
  const result = runNode(node)
  const list = checklist(catalogue, meta.projectType, meta.attributes)
  const lines = collectLines(node, result)
  const modelled = new Set<string>()
  const walk = (n: Node) => (isPortfolio(n) ? (n.costLines.forEach((l) => l.catalogueId && modelled.add(l.catalogueId)), n.children.forEach((c) => walk(c.node))) : n.costLines.forEach((l) => l.catalogueId && modelled.add(l.catalogueId)))
  walk(node)
  const applicable = list.stages.flatMap((s) => s.entries).filter((e) => e.status === 'applies')
  const gaps = applicable.filter((e) => !modelled.has(e.item.id))

  const out: string[] = [`## ${meta.name}`, '', meta.reference, '']
  for (const n of meta.notes) out.push(`- ${n}`)

  out.push('', '### Headline results', '', '| Metric | Value | Basis |', '|---|---|---|')
  const show = ['totalUnits', 'commercialNla', 'totalDevelopmentCost', 'costPerGcaSqft', 'totalRevenue', 'profit', 'profitOnCost', 'stabilizedNoi', 'yieldOnCost', 'exitValue', 'unleveredIrr', 'leveredIrr', 'unleveredNpv', 'equityContributed', 'peakEquity', 'equityMultiple', 'peakDebt', 'permanentLoan', 'sharedCosts']
  for (const id of show) {
    const m = result.metrics[id]
    if (m && m.value !== null) out.push(`| ${m.label} | ${fmt(m.unit, m.value)} | ${m.basis} |`)
  }
  const warnings = result.warnings.length ? result.warnings : []
  if (warnings.length) out.push('', '**Engine warnings:**', '', ...warnings.map((w) => `- ${w}`))

  const sim = simulate(node, { draws, seed, metrics: ['totalDevelopmentCost', 'profit', 'unleveredIrr', 'leveredIrr'] })
  out.push('', `### Range (Monte Carlo, ${draws} draws, seed ${seed}, triangular bands by estimate class)`, '', '| Metric | P10 | P50 | P90 | Base |', '|---|---|---|---|---|')
  for (const [id, d] of Object.entries(sim.metrics)) {
    const unit = result.metrics[id]!.unit
    out.push(`| ${result.metrics[id]!.label} | ${fmt(unit, d.p10)} | ${fmt(unit, d.p50)} | ${fmt(unit, d.p90)} | ${fmt(unit, d.base)} |${d.unavailable ? ` ${d.unavailable} draws unavailable` : ''}`)
  }
  const t = tornado(node, 'profit')
  out.push('', '### What moves profit most (one-at-a-time, low → high end of each band)', '', '| Driver | Profit at low | Profit at high | Swing |', '|---|---|---|---|')
  for (const b of t.bars.slice(0, 10)) out.push(`| ${b.label} | ${money(b.low)} | ${money(b.high)} | ${money(b.swing)} |`)

  out.push('', '### Cost by stage', '', '| Stage | Total | Largest lines |', '|---|---|---|')
  for (const stage of catalogue.stages) {
    const inStage = lines.filter((l) => l.stage === stage.id && Math.abs(l.total) > 0.5).sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
    if (!inStage.length) continue
    const total = inStage.reduce((s, l) => s + l.total, 0)
    out.push(`| ${stage.label} | ${money(total)} | ${inStage.slice(0, 4).map((l) => `${l.label} ${money(l.total)}`).join('; ')}${inStage.length > 4 ? `; +${inStage.length - 4} more` : ''} |`)
  }
  const unknownStage = lines.filter((l) => l.stage === '?')
  if (unknownStage.length) out.push('', `Unmapped lines: ${unknownStage.map((l) => l.id).join(', ')}`)

  out.push('', '### Cash flow by year', '', '| Year | Project cash flow | Equity cash flow |', '|---|---|---|')
  const p = yearly(result.projectCashFlow)
  const e = yearly(result.equityCashFlow)
  p.forEach((v, y) => out.push(`| ${y + 1} | ${money(v)} | ${money(e[y])} |`))

  const kinds = ['line', 'benchmark', 'allowance', 'component', 'engine', 'excluded', 'gap'] as const
  const kindLabel: Record<string, string> = {
    line: 'Inside another cost line', benchmark: 'Inside the hard-cost benchmark', allowance: 'Inside a soft-cost or studies allowance',
    component: 'Handled by a revenue/operating component', engine: 'Handled by the engine (ledger, escalation, refinance, exit)',
    excluded: 'Excluded, with reason', gap: '**Gaps: not modelled yet**',
  }
  const byKind = new Map<string, string[]>()
  for (const g of gaps) {
    const note = meta.coverage[g.item.id] ?? 'gap: not accounted for'
    const kind = note.split(':')[0]!
    byKind.set(kind, [...(byKind.get(kind) ?? []), `${g.item.label} — ${note.slice(kind.length + 1).trim()}`])
  }
  out.push('', '### Checklist coverage', '', `Given its variables, **${applicable.length} catalogue items apply** to this project. **${applicable.length - gaps.length}** are their own cost lines; the rest are accounted for below. A test fails if any applicable item is left unaccounted.`, '')
  for (const kind of kinds) {
    const items = byKind.get(kind)
    if (!items) continue
    out.push(`**${kindLabel[kind]}** (${items.length})`, '', ...items.map((i) => `- ${i}`), '')
  }
  return out.join('\n')
}

function mocksDoc(): string {
  const mockA = mockAJson as unknown as { name: string; projectType: string; reference: string; notes: string[]; attributes: Attributes; coverage: Record<string, string>; input: ProjectInput }
  return [
    '# Mock projects: every stage, every cost, every metric',
    '',
    'Generated by `npm run report` from `data/projects/` and the engine. Do not edit by hand. **All figures are synthetic placeholders for engine testing, not market evidence.** Verified regulatory figures are used where a line says so.',
    '',
    mockSection(mockA, mockA.input, 2026, 500),
    '',
    mockSection(mockBMeta, mockB, 2026, 300),
    '',
  ].join('\n')
}

writeFileSync('docs/implementation/PROJECT_TYPE_CHECKLISTS.md', checklistDoc())
writeFileSync('docs/implementation/MOCK_PROJECTS.md', mocksDoc())
console.log('Wrote PROJECT_TYPE_CHECKLISTS.md and MOCK_PROJECTS.md')

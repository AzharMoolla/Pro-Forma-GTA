import { useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { analyze, costItems } from '../engine/insights'
import { isPortfolio, runNode, type NodeResult } from '../engine/portfolio'
import { modelOf } from '../engine/assumptions'
import { equityByYear, fundingByYear, sensitivityGrid, timeline, toCsv, type Series, type StackedRow } from './chartData'
import { Button, Card, TableWrap, td, tdNum, th } from './components'
import { catalogueItem } from './data'
import { metricValue, money, pct } from './format'
import { useTrackerView } from './sections3'
import { Gantt, HeatmapChart, ScenarioBars, StackedBars, Waterfall } from './chartViews'
import { useWorkspace } from './workspace'

// Charts: named views over the same results as the tables. Every chart has a table view and CSV/SVG downloads, and
// colour is never the only cue (labels, legends, tables).

const download = (name: string, text: string, type: string) => {
  const url = URL.createObjectURL(new Blob([text], { type }))
  Object.assign(document.createElement('a'), { href: url, download: name }).click()
  URL.revokeObjectURL(url)
}

/** Title, explanation, chart or table, downloads. */
export function ChartFigure({ title, about, csv, file, children, table }: { title: string; about: string; csv: string; file: string; children: ReactNode; table: ReactNode }) {
  const [asTable, setAsTable] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const svg = () => {
    const el = box.current?.querySelector('svg')
    if (el) download(`${file}.svg`, new XMLSerializer().serializeToString(el), 'image/svg+xml')
  }
  return (
    <Card title={title} actions={
      <span className="flex flex-wrap gap-1">
        <Button onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>{asTable ? 'Chart' : 'Table'}</Button>
        <Button onClick={() => download(`${file}.csv`, csv, 'text/csv')}>CSV</Button>
        {!asTable && <Button onClick={svg}>SVG</Button>}
      </span>
    }>
      <p className="mb-3 text-sm text-ink-soft">{about}</p>
      <div ref={box}>{asTable ? table : children}</div>
    </Card>
  )
}

const Legend = ({ items }: { items: Array<{ label: string; colour: string; dashed?: boolean }> }) => (
  <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
    {items.map((i) => <li key={i.label} className="flex items-center gap-1.5"><span aria-hidden className="inline-block size-2.5 rounded-sm" style={{ background: i.colour }} />{i.label}</li>)}
  </ul>
)

const stackedTable = (series: Series[], rows: StackedRow[], caption: string) => (
  <TableWrap caption={caption}>
    <thead><tr><th scope="col" className={th}>Year</th>{series.map((s) => <th key={s.id} scope="col" className={`${th} text-right`}>{s.label}</th>)}</tr></thead>
    <tbody>{rows.map((r) => <tr key={r.label}><td className={td}>{r.label}</td>{series.map((s) => <td key={s.id} className={tdNum}>{money(r.values[s.id] ?? 0, false)}</td>)}</tr>)}</tbody>
  </TableWrap>
)

/** Grid of values with the value written in each cell; colour (diverging around the base case) is secondary. */
function Heatmap({ rows, cols, cells, base, format, rowLabel, colLabel }: { rows: string[]; cols: string[]; cells: Array<Array<number | null>>; base: number | null; format: (v: number) => string; rowLabel: string; colLabel: string }) {
  const values = cells.flat().filter((v): v is number => v !== null)
  const span = Math.max(1e-9, ...values.map((v) => Math.abs(v - (base ?? 0))))
  const shade = (v: number) => {
    const t = Math.min(1, Math.abs(v - (base ?? 0)) / span)
    return `color-mix(in oklab, ${v >= (base ?? 0) ? 'var(--chart-in)' : 'var(--chart-out)'} ${Math.round(12 + (t * 55))}%, var(--surface))`
  }
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Sensitivity grid (scrolls sideways)">
      <table className="w-full border-separate border-spacing-1 text-sm">
        <caption className="mb-1 text-left text-xs text-ink-soft">Rows: {rowLabel}. Columns: {colLabel}. Base case is the centre cell.</caption>
        <thead><tr><th scope="col" className="text-xs text-ink-mute" />{cols.map((c) => <th key={c} scope="col" className="px-2 text-xs font-medium text-ink-soft">{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={r}>
            <th scope="row" className="pr-2 text-right text-xs font-medium text-ink-soft">{r}</th>
            {cols.map((c, j) => {
              const v = cells[i]![j]!
              const centre = i === Math.floor(rows.length / 2) && j === Math.floor(cols.length / 2)
              return <td key={c} className="num rounded px-2 py-2 text-center" style={{ background: v === null ? 'var(--sunken)' : shade(v), outline: centre ? '2px solid var(--ink)' : undefined }}>{v === null ? 'n/a' : format(v)}</td>
            })}
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export function Visuals() {
  const { node, nodeResult, state, model } = useWorkspace()
  const uid = useId()
  const { view: tracker } = useTrackerView()
  const project = state.projects[state.projectId]!
  const [metric, setMetric] = useState<'profitOnCost' | 'leveredIrr' | 'unleveredIrr'>('profitOnCost')

  const funding = useMemo(() => (nodeResult?.project ? { ...fundingByYear(nodeResult.project), kind: 'project' as const } : nodeResult ? { ...equityByYear(nodeResult), kind: 'equity' as const } : null), [nodeResult])
  const buckets = useMemo(() => (nodeResult ? analyze({ items: costItems(node, nodeResult, (id) => (id ? catalogueItem.get(id)?.stage : undefined)), metrics: nodeResult.metrics, isMasterPlan: isPortfolio(node) }).buckets : []), [node, nodeResult])
  const grid = useMemo(() => sensitivityGrid(node, metric), [node, metric])
  const bars = useMemo(() => timeline(node), [node])
  const scenarios = useMemo(() => {
    const run = (n: typeof model): NodeResult | null => { try { return runNode(n) } catch { return null } }
    return [...project.scenarios.slice(-5).map((s) => ({ name: s.label, r: run(modelOf(s.input, s.attributes)) })), { name: 'Current draft', r: run(model) }]
  }, [project.scenarios, model])
  if (!nodeResult) return null

  const pctFmt = (v: number) => pct(v, 1)
  const scenarioMetrics = [
    { id: 'totalDevelopmentCost', label: 'Total development cost', format: (v: number) => money(v) },
    { id: 'profit', label: 'Unlevered profit', format: (v: number) => money(v) },
    { id: 'profitOnCost', label: 'Profit on cost', format: pctFmt },
    { id: 'leveredIrr', label: 'Levered IRR', format: pctFmt },
  ].map((m) => ({ ...m, values: scenarios.map((s) => s.r?.metrics[m.id]?.value ?? null) }))
  const stages = tracker.stages.filter((s) => s.budget || s.actual.known || s.forecast.known)

  return (
    <div className="flex flex-col gap-4" id={uid}>
      <p className="text-sm text-ink-soft">Charts read the same results as the tables, for <strong>{node.name}</strong>. Use Table for the numbers, and CSV or SVG to take a chart into a report or deck.</p>

      {funding && (
        <ChartFigure
          title={funding.kind === 'project' ? 'Funding and spending by year' : 'Equity calls and distributions by year'}
          about={funding.kind === 'project' ? 'Above the line: where money comes from (equity first, then loans, then income, sales and the exit). Below: development costs. Loan repayments, interest and distributions are in the ledger, so the two sides are not a balanced sources-and-uses statement.' : 'Money investors put in (below) and get back (above), summed across the plan by year.'}
          csv={toCsv(['Year', ...funding.series.map((s) => s.label)], funding.rows.map((r) => [r.label, ...funding.series.map((s) => Math.round(r.values[s.id] ?? 0))]))}
          file={`${node.id}-funding`}
          table={stackedTable(funding.series, funding.rows, 'Funding by year')}
        >
          <StackedBars series={funding.series} rows={funding.rows} label="Funding and spending by year" />
        </ChartFigure>
      )}

      <ChartFigure
        title="What makes it expensive"
        about="Every cost dollar by bucket, building up to the total (including all interest paid, so it can exceed total development cost, which counts only capitalized interest)."
        csv={toCsv(['Bucket', 'Amount', 'Share'], buckets.map((b) => [b.label, Math.round(b.total), Number(b.share.toFixed(4))]))}
        file={`${node.id}-costs`}
        table={<TableWrap caption="Costs by bucket"><thead><tr>{['Bucket', 'Amount', 'Share'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead><tbody>{buckets.map((b) => <tr key={b.id}><td className={td}>{b.label}</td><td className={tdNum}>{money(b.total, false)}</td><td className={tdNum}>{pct(b.share, 1)}</td></tr>)}</tbody></TableWrap>}
      >
        <Waterfall steps={buckets.map((b) => ({ label: b.label, value: b.total }))} />
      </ChartFigure>

      <ChartFigure
        title="Which assumptions matter: revenue × exit cap"
        about="The model re-run with rents, prices and land sales scaled (rows) and exit cap rates moved (columns). n/a means the result is unavailable (for example, no IRR). One-at-a-time grid on the deterministic model, not a probability."
        csv={toCsv(['Revenue', ...grid.cols.map((c) => `${c >= 0 ? '+' : ''}${c} bps`)], grid.rows.map((r, i) => [`${Math.round((r - 1) * 100)}%`, ...grid.cells[i]!.map((v) => (v === null ? null : Number(v.toFixed(5))))]))}
        file={`${node.id}-sensitivity`}
        table={<Heatmap rows={grid.rows.map((r) => `${r >= 1 ? '+' : ''}${Math.round((r - 1) * 100)}%`)} cols={grid.cols.map((c) => `${c >= 0 ? '+' : ''}${c} bps`)} cells={grid.cells} base={grid.base} format={pctFmt} rowLabel="revenue" colLabel="exit cap rate" />}
      >
        <label className="mb-2 flex items-center gap-2 text-sm">Metric
          <select className="min-h-9 rounded border border-line-strong bg-surface px-2" value={metric} onChange={(e) => setMetric(e.target.value as typeof metric)}>
            <option value="profitOnCost">Profit on cost</option>
            <option value="unleveredIrr">Unlevered IRR</option>
            <option value="leveredIrr">Levered IRR</option>
          </select>
        </label>
        <HeatmapChart rows={grid.rows.map((r) => `${r >= 1 ? '+' : ''}${Math.round((r - 1) * 100)}%`)} cols={grid.cols.map((c) => `${c >= 0 ? '+' : ''}${c} bps`)} cells={grid.cells} base={grid.base} format={pctFmt} rowLabel="revenue" colLabel="exit cap rate" />
      </ChartFigure>

      <ChartFigure
        title="How the development unfolds"
        about="Pre-construction (including any rezoning), construction, lease-up or closings, and operations to exit, per building. Phases start at their offsets in the plan."
        csv={toCsv(['Building', 'Starts month', ...['Pre-construction and approvals', 'Construction', 'Lease-up or closings', 'Operations to exit']], bars.map((b) => [b.name, b.start, ...['pre', 'build', 'lease', 'hold'].map((id) => b.segments.find((s) => s.id === id)?.months ?? 0)]))}
        file={`${node.id}-timeline`}
        table={<TableWrap caption="Schedule"><thead><tr>{['Building', 'Starts', 'Pre-construction', 'Construction', 'Lease-up / closings', 'Operations'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead><tbody>{bars.map((b, i) => <tr key={`${b.name}-${i}`}><td className={td}>{b.name}</td><td className={tdNum}>{b.start}</td>{['pre', 'build', 'lease', 'hold'].map((id) => <td key={id} className={tdNum}>{b.segments.find((s) => s.id === id)?.months ?? 0} mo</td>)}</tr>)}</tbody></TableWrap>}
      >
        <Gantt bars={bars} />
      </ChartFigure>

      <ChartFigure
        title="What changed between scenarios"
        about={project.scenarios.length ? 'The last five locked scenarios and the current draft, each re-run with today\'s engine (scenarios locked under an older engine are flagged on the Scenarios page). One axis per metric.' : 'Lock a scenario on the Scenarios page to compare it here. Only the current draft is shown.'}
        csv={toCsv(['Scenario', ...scenarioMetrics.map((m) => m.label)], scenarios.map((s, i) => [s.name, ...scenarioMetrics.map((m) => m.values[i] ?? null)]))}
        file={`${node.id}-scenarios`}
        table={<TableWrap caption="Scenarios"><thead><tr><th scope="col" className={th}>Scenario</th>{scenarioMetrics.map((m) => <th key={m.id} scope="col" className={`${th} text-right`}>{m.label}</th>)}</tr></thead><tbody>{scenarios.map((s, i) => <tr key={`${s.name}-${i}`}><td className={td}>{s.name}</td>{scenarioMetrics.map((m) => <td key={m.id} className={tdNum}>{m.values[i] === null ? 'n/a' : m.format(m.values[i]!)}</td>)}</tr>)}</tbody></TableWrap>}
      >
        <ScenarioBars names={scenarios.map((s) => s.name)} metrics={scenarioMetrics} />
      </ChartFigure>

      <ChartFigure
        title="Budget, spent and forecast by stage"
        about="From the development tracker. Spent counts only recorded actuals; forecast at completion uses the actual for finished tasks and the larger of budget and spend for open ones. Unknown values are counted, not treated as zero."
        csv={toCsv(['Stage', 'Budget', 'Spent (known)', 'Spent unknown', 'Forecast (known)', 'Forecast unknown'], stages.map((s) => [s.label, Math.round(s.budget), Math.round(s.actual.known), s.actual.unknown, Math.round(s.forecast.known), s.forecast.unknown]))}
        file={`${node.id}-budget`}
        table={<TableWrap caption="Budget by stage"><thead><tr>{['Stage', 'Budget', 'Spent', 'Forecast'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead><tbody>{stages.map((s) => <tr key={s.id}><td className={td}>{s.label}</td><td className={tdNum}>{money(s.budget, false)}</td><td className={tdNum}>{money(s.actual.known, false)}{s.actual.unknown ? ` + ${s.actual.unknown} unknown` : ''}</td><td className={tdNum}>{money(s.forecast.known, false)}{s.forecast.unknown ? ` + ${s.forecast.unknown} unknown` : ''}</td></tr>)}</tbody></TableWrap>}
      >
        {stages.length === 0 ? <p className="text-sm text-ink-soft">No budget in the tracker for this selection.</p> : (
          <>
            <Legend items={[{ label: 'Budget', colour: 'var(--chart-in)' }, { label: 'Spent (recorded)', colour: 'var(--chart-out)' }, { label: 'Forecast at completion', colour: 'var(--chart-3)' }]} />
            <ScenarioBars names={['Budget', 'Spent', 'Forecast']} metrics={stages.slice(0, 12).map((s) => ({ label: s.label + (s.forecast.unknown ? ` (${s.forecast.unknown} unknown)` : ''), values: [s.budget, s.actual.known, s.forecast.known], format: (v: number) => money(v) }))} />
          </>
        )}
      </ChartFigure>
      <p className="text-xs text-ink-mute">{metricValue(nodeResult.metrics.totalDevelopmentCost)} total development cost for this selection. Illustrative model outputs on synthetic demo data unless your own inputs replace them.</p>
    </div>
  )
}

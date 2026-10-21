import { bandOf, lineTotals, type CostLine } from '../engine/costs'
import { CONVENTION_VERSION, ENGINE_VERSION } from '../engine/project'
import { isPortfolio } from '../engine/portfolio'
import { Button, Chip, SourceChip } from './components'
import { catalogueItem, stageLabel, variableInfo } from './data'
import { metricValue, money, pct } from './format'
import { getNode, getResult } from './tree'
import { useWorkspace } from './workspace'

export function lineTotal(line: CostLine, ws: ReturnType<typeof useWorkspace>, path: string[]): number | null {
  const node = getNode(ws.draft, path)
  const result = ws.result ? getResult(ws.result, path) : null
  if (!isPortfolio(node) && result?.project) return result.project.ledger.reduce((s, r) => s + (r.costs[line.id] ?? 0), 0)
  return lineTotals(node.costLines).get(line.id) ?? null
}

export function Inspector() {
  const ws = useWorkspace()
  const { state, dispatch, nodeResult } = ws
  const inspect = state.inspect

  const shell = (title: string, body: React.ReactNode) => (
    <div className="sticky top-4 rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {inspect && <Button variant="ghost" onClick={() => dispatch({ type: 'inspect', inspect: null })} aria-label="Close inspector">Close</Button>}
      </div>
      <div className="flex flex-col gap-3 p-4 text-sm">{body}</div>
    </div>
  )

  if (!inspect) {
    return shell('Inspector', (
      <>
        <p className="text-ink-soft">Select any headline number, metric or cost line to see how it was calculated, what it depends on, its estimate class and range, and where the figure comes from.</p>
        <p className="text-xs text-ink-mute">Engine {ENGINE_VERSION} · conventions {CONVENTION_VERSION}</p>
      </>
    ))
  }

  if (inspect.kind === 'metric') {
    const m = nodeResult?.metrics[inspect.id]
    if (!m) return shell('Inspector', <p>That metric isn't available for this selection.</p>)
    return shell(m.label, (
      <>
        <p className="num text-2xl font-semibold">{metricValue(m)}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
          <dt className="text-ink-mute">Basis</dt><dd>{m.basis}</dd>
          <dt className="text-ink-mute">Formula</dt><dd className="num text-xs">{m.formula}</dd>
          <dt className="text-ink-mute">Depends on</dt>
          <dd className="flex flex-wrap gap-1">{m.dependsOn.map((d) => <Chip key={d}>{d}</Chip>)}</dd>
          <dt className="text-ink-mute">Selection</dt><dd>{ws.node.name}</dd>
        </dl>
        {m.missing.length > 0 && (
          <div className="rounded border border-warn bg-warn-soft p-2 text-warn">
            <p className="font-medium">Withheld: not yet estimated</p>
            <ul className="list-disc pl-5">{m.missing.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        )}
        {m.warnings.map((w) => <p key={w} className="rounded border border-warn bg-warn-soft p-2 text-warn">{w}</p>)}
        <p className="text-xs text-ink-mute">Engine {ENGINE_VERSION} · conventions {CONVENTION_VERSION}. Deterministic: the same inputs always give the same result.</p>
      </>
    ))
  }

  let node
  try {
    node = getNode(ws.draft, inspect.path)
  } catch {
    return shell('Inspector', <p>That line no longer exists in this draft.</p>)
  }
  const line = node.costLines.find((l) => l.id === inspect.lineId)
  if (!line) return shell('Inspector', <p>That line no longer exists in this draft.</p>)
  const item = line.catalogueId ? catalogueItem.get(line.catalogueId) : undefined
  const total = lineTotal(line, ws, inspect.path)
  const band = bandOf(line)
  return shell(line.label, (
    <>
      <p className="num text-2xl font-semibold">{line.driver === null ? 'Not yet estimated' : money(total)}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
        <dt className="text-ink-mute">Estimate class</dt>
        <dd>{line.estimateClass === 'exact' ? 'exact (rule or contract)' : `Class ${line.estimateClass}`} · band {pct(band.low, 0)} / +{pct(band.high, 0)}</dd>
        {total !== null && line.estimateClass !== 'exact' && (<><dt className="text-ink-mute">Range</dt><dd className="num">{money(total * (1 + band.low))} – {money(total * (1 + band.high))}</dd></>)}
        <dt className="text-ink-mute">Driver</dt><dd className="num text-xs">{line.driver ? JSON.stringify(line.driver) : 'null (unknown)'}</dd>
        <dt className="text-ink-mute">Timing</dt><dd>{line.timing.kind}{'month' in line.timing ? ` ${line.timing.month}` : ''}{'from' in line.timing ? ` ${line.timing.from}–${line.timing.to}` : ''}{line.escalate ? ' · escalated' : ''}</dd>
        {item && (<>
          <dt className="text-ink-mute">Catalogue</dt><dd>{item.label}</dd>
          <dt className="text-ink-mute">Stage</dt><dd>{stageLabel.get(item.stage)}</dd>
          <dt className="text-ink-mute">Source</dt>
          <dd className="flex flex-wrap items-center gap-2"><SourceChip tag={item.src} />{item.ref && <a className="text-accent underline" href={item.ref} target="_blank" rel="noreferrer">Open source</a>}</dd>
          {item.when && (<><dt className="text-ink-mute">Triggered by</dt><dd><ul className="list-disc pl-4">{item.when.map((c) => <li key={c}>{variableInfo.get(c.split(/>=|=/)[0]!)?.label ?? c}{c.includes('=') ? ` (${c.split(/>=|=/)[1]})` : ''}</li>)}</ul></dd></>)}
        </>)}
      </dl>
    </>
  ))
}

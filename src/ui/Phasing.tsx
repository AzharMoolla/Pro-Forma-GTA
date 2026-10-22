// Phasing plan, part of Site & program: which buildings go in which phase and when each starts. Timing drives the
// finance (when costs, loans, sales and rents land), so it is collected with the program, not left to defaults.

import { useState } from 'react'
import { isPortfolio, type Node } from '../engine/portfolio'
import { addPhase, isPhased, makePhased, moveBuilding, overlaps, rename, schedule, setOffset, stagger } from '../tracker/phasing'
import { removeNode } from '../tracker/tracker'
import { timeline } from './chartData'
import { Gantt } from './chartViews'
import { Button, Card, NumberField, TableWrap, cx, td, tdNum, th } from './components'
import { metricValue, num } from './format'
import { GlossaryText } from './Glossary'
import { getResult } from './tree'
import { useWorkspace } from './workspace'

const exists = (root: Node, path: string[]): boolean =>
  !path.length || (isPortfolio(root) && root.children.some((c) => c.node.id === path[0] && exists(c.node, path.slice(1))))

/** A whole-month field that commits on blur or Enter. */
function MonthInput({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }) {
  return (
    <input aria-label={label} inputMode="numeric" className="num min-h-8 w-16 rounded border border-line-strong bg-surface px-2 text-right" defaultValue={String(value)} key={value}
      onBlur={(e) => { const n = Number(e.target.value.trim()); if (!Number.isInteger(n) || n < 0) { e.target.value = String(value); return } if (n !== value) onCommit(n) }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
  )
}

export function Phasing() {
  const { draft, result, state, dispatch } = useWorkspace()
  const [error, setError] = useState<string | null>(null)
  const [gap, setGap] = useState(18)
  const [newStart, setNewStart] = useState(() => (isPhased(draft) ? (draft.children.at(-1)?.offsetMonths ?? 0) + 24 : 24))
  const apply = (f: () => { root: Node; path?: string[] }) => {
    try {
      const { root, path } = f()
      setError(null)
      dispatch({ type: 'replaceDraft', draft: root, path: path ?? (exists(root, state.path) ? state.path : []) })
    } catch (e) {
      setError((e as Error).message)
    }
  }
  const metric = (path: string[], id: string) => {
    if (!result) return '—'
    try { return metricValue(getResult(result, path).metrics[id]) } catch { return '—' }
  }

  if (!isPhased(draft)) {
    return (
      <Card title="Phasing plan">
        <p className="text-sm text-ink-soft">
          {isPortfolio(draft) ? 'These buildings are not grouped into phases yet.' : 'This is one building, built in one go.'} Larger sites are usually built in phases: each phase starts when the market, approvals and money allow, and that timing decides when costs, loans, sales and rents land.
        </p>
        <Button className="mt-3" variant="primary" onClick={() => apply(() => ({ root: makePhased(draft), path: [] }))}>Set up phases</Button>
        {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
      </Card>
    )
  }

  const rows = schedule(draft)
  const phases = rows.filter((r) => r.isPhase && r.depth === 1)
  const clashes = overlaps(draft)
  return (
    <Card title={`Phasing plan (${phases.length} phase${phases.length === 1 ? '' : 's'})`}>
      <p className="mb-3 text-sm text-ink-soft">
        Each phase starts a number of months after the plan starts, and each building a number of months after its phase. Moving a start moves that phase's costs, loans, sales and rents with it, and every result updates.
      </p>
      <TableWrap caption="Phases and buildings, with start months">
        <thead><tr>{['Phase / building', 'Starts (months after)', 'Starts', 'Builds', 'Units', 'Total cost', 'Profit on cost', ''].map((h, i) => <th key={h || i} scope="col" className={cx(th, i > 0 && i < 7 && 'text-right')}><GlossaryText text={h} /></th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.path.join('/')} className={r.isPhase ? 'bg-sunken' : undefined}>
              <td className={td}>
                <input aria-label={`Name of ${r.name}`} className={cx('min-h-8 w-full min-w-60 rounded border border-transparent bg-transparent px-1 hover:border-line-strong focus:border-line-strong', r.isPhase && 'font-semibold')} style={{ marginLeft: (r.depth - 1) * 16 }} defaultValue={r.name} key={r.name}
                  onBlur={(e) => { if (e.target.value.trim() !== r.name) apply(() => ({ root: rename(draft, r.path, e.target.value) })) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
              </td>
              <td className={tdNum}>
                <span className="inline-flex items-center gap-1"><MonthInput label={`${r.name} starts, months after the ${r.depth === 1 ? 'plan' : 'phase'}`} value={r.offset} onCommit={(v) => apply(() => ({ root: setOffset(draft, r.path, v) }))} /><span className="text-xs text-ink-mute">{r.depth === 1 ? 'plan' : 'phase'}</span></span>
              </td>
              <td className={tdNum}>M{r.start}</td>
              <td className={tdNum}>M{r.constructionStart}–M{r.constructionEnd}</td>
              <td className={tdNum}>{result ? num((() => { try { return getResult(result, r.path).metrics.totalUnits?.value } catch { return null } })()) : '—'}</td>
              <td className={tdNum}>{metric(r.path, 'totalDevelopmentCost')}</td>
              <td className={tdNum}>{metric(r.path, 'profitOnCost')}</td>
              <td className={td}>
                <span className="flex flex-wrap items-center gap-2 text-xs">
                  {!r.isPhase && r.depth === 2 && phases.length > 1 && (
                    <select aria-label={`Move ${r.name} to another phase`} className="rounded border border-line-strong bg-surface px-1 py-1" value={r.path[0]} onChange={(e) => apply(() => ({ root: moveBuilding(draft, r.path, e.target.value) }))}>
                      {phases.map((p) => <option key={p.path[0]} value={p.path[0]}>{p.name}</option>)}
                    </select>
                  )}
                  <button type="button" className="text-accent underline" onClick={() => dispatch({ type: 'path', path: r.path })}>Open</button>
                  <button type="button" className="text-ink-soft underline" onClick={() => { if (window.confirm(`Remove ${r.name} from the plan? This changes the draft only; locked scenarios keep it.`)) apply(() => ({ root: removeNode(draft, r.path) })) }}>Remove</button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      {clashes.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          {clashes.map((c) => <li key={c.later} className="rounded border border-warn bg-warn-soft px-2 py-1.5 text-warn">{c.later} starts building {c.months} month{c.months === 1 ? '' : 's'} before {c.earlier} finishes: two loans drawing and two sites building at once, so peak equity and debt stack. Intended? If not, start {c.later} later.</li>)}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-40"><NumberField label="Start a new phase at" suffix="months" value={newStart} onCommit={(v) => setNewStart(Math.max(0, Math.round(v)))} /></div>
        <Button variant="primary" onClick={() => apply(() => addPhase(draft, newStart))}>Add a phase</Button>
        <div className="w-40"><NumberField label="Space phase starts by" suffix="months" value={gap} onCommit={(v) => setGap(Math.max(0, Math.round(v)))} /></div>
        <Button onClick={() => apply(() => ({ root: stagger(draft, gap) }))}>Space them evenly</Button>
      </div>
      <p className="mt-2 text-xs text-ink-mute">A new phase starts with one building like the first in the last phase; edit it under Plan structure, or move buildings into it. Phases start on a month you choose; starting on a trigger (for example 70% of the last phase sold) is not modelled yet.</p>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}

      <div className="mt-4"><Gantt bars={timeline(draft)} /></div>
    </Card>
  )
}

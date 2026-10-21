import { useMemo, useState } from 'react'
import { analyze, costItems, type Severity } from '../engine/insights'
import { isPortfolio, type Node } from '../engine/portfolio'
import type { ProjectInput } from '../engine/project'
import { addBuilding, buildTracker, lineFromActual, lineFromItem, removeNode, validateReceipt, type Receipt, type Task, type TaskStatus } from '../tracker/tracker'
import { Button, Card, Chip, NumberField, SourceChip, cx } from './components'
import { coverage } from './coverage'
import { catalogue, catalogueItem } from './data'
import { money, pct } from './format'
import { deleteReceipt, getReceipt, putReceipt, sha256File } from './receipts'
import { useWorkspace } from './workspace'

const stageOf = (id?: string) => (id ? catalogueItem.get(id)?.stage : undefined)

/** Project type for a scope: the demo's type at its root, inferred from components for blocks inside a plan. */
function scopeType(node: Node, rootType: string, isRoot: boolean): string {
  if (isRoot) return rootType
  if (isPortfolio(node)) return 'master-plan'
  const kinds = new Set(node.components.map((c) => (c.kind === 'commercial' ? 'commercial' : c.kind)))
  if (kinds.has('landSale')) return 'master-plan'
  if (kinds.has('condo') && kinds.has('rental')) return 'mixed-use-podium'
  if (kinds.has('condo')) return kinds.has('commercial') ? 'mixed-use-podium' : 'condo-highrise'
  if (kinds.has('rental')) return kinds.has('commercial') ? 'mixed-use-podium' : 'rental-midrise'
  return 'commercial'
}

// ---------------------------------------------------------------- analysis

const SEVERITY: Record<Severity, { label: string; icon: string; tone: 'good' | 'neutral' | 'warn' | 'bad' }> = {
  concern: { label: 'Concern', icon: '▲', tone: 'bad' },
  watch: { label: 'Watch', icon: '!', tone: 'warn' },
  info: { label: 'Note', icon: 'i', tone: 'neutral' },
  good: { label: 'Strength', icon: '✓', tone: 'good' },
}

export function Analysis() {
  const { node, nodeResult, demo, state, draft } = useWorkspace()
  const attributes = state.projects[state.projectId]!.attributes
  const analysis = useMemo(() => {
    if (!nodeResult) return null
    const unaccounted = state.path.length ? 0 : coverage(demo.projectType, attributes, draft, demo.coverage).filter((e) => e.status === 'unaccounted').length
    const prog = isPortfolio(node) ? undefined : node.program
    return analyze({ items: costItems(node, nodeResult, stageOf), metrics: nodeResult.metrics, isMasterPlan: isPortfolio(node), unaccountedItems: unaccounted, buildableSqft: prog ? (prog.planningGfaSqft ?? prog.gcaAboveSqft) : null })
  }, [node, nodeResult, demo, attributes, draft, state.path.length])
  if (!analysis) return null
  const max = Math.max(...analysis.buckets.map((b) => b.share))

  return (
    <Card title="Analysis: what stands out" actions={<Chip tone="neutral" title="Rules of thumb comparing this project's own numbers. Not market benchmarks.">screening heuristics</Chip>}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <h3 className="mb-1 text-sm font-semibold">Where the money goes · {money(analysis.total)}</h3>
          <p className="mb-2 text-xs text-ink-mute">Every cost dollar including all interest paid (total development cost counts only interest capitalized during construction).</p>
          <ul className="flex flex-col gap-2">
            {analysis.buckets.map((b) => {
              const s = SEVERITY[b.severity]
              return (
                <li key={b.id} className="text-xs">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{b.label}</span>
                    <span className="num">{pct(b.share, 0)} · {money(b.total)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-2.5 flex-1 rounded-full bg-sunken" aria-hidden>
                      <span className="block h-full rounded-full" style={{ width: `${Math.max(2, (b.share / max) * 100)}%`, background: b.severity === 'concern' ? 'var(--bad)' : b.severity === 'watch' ? 'var(--warn)' : 'var(--accent)' }} />
                    </span>
                    {b.severity !== 'info' && <Chip tone={s.tone}>{s.icon} {s.label}</Chip>}
                  </div>
                  {b.top[0] && <p className="mt-0.5 text-ink-mute">Largest: {b.top[0].label} {money(b.top[0].total)}</p>}
                </li>
              )
            })}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Observations ({analysis.insights.length})</h3>
          <ul className="flex flex-col gap-2">
            {analysis.insights.map((i) => {
              const s = SEVERITY[i.severity]
              return (
                <li key={i.id} className={cx('rounded-md border p-3 text-sm', i.severity === 'concern' ? 'border-bad bg-bad-soft' : i.severity === 'watch' ? 'border-warn bg-warn-soft' : i.severity === 'good' ? 'border-good bg-good-soft' : 'border-line bg-surface')}>
                  <p className="flex items-start gap-2">
                    <Chip tone={s.tone}>{s.icon} {s.label}</Chip>
                    <span className="font-medium text-ink">{i.title}</span>
                  </p>
                  <p className="mt-1 text-ink-soft">{i.detail}</p>
                  {i.drivers.length > 0 && i.drivers[0]!.includes('$') && <p className="mt-1 text-xs text-ink-soft">Driven by: {i.drivers.join(' · ')}</p>}
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-ink-mute">Observations compare this project's own numbers (shares of cost, yield vs exit cap, levered vs unlevered). They are prompts to look closer, not an assessment of viability.</p>
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------- tracker

const STATUS_LABEL: Record<TaskStatus, string> = { todo: 'To do', 'in-progress': 'In progress', done: 'Done', 'not-applicable': 'Not applicable' }

export function Progress() {
  const ws = useWorkspace()
  const { node, nodeResult, demo, state } = ws
  const project = state.projects[state.projectId]!
  const scope = state.path
  const type = scopeType(node, demo.projectType, scope.length === 0)

  const view = useMemo(() => {
    const entries = coverage(type, project.attributes, node, scope.length === 0 ? demo.coverage : {})
    const budgets = new Map<string, number>()
    if (nodeResult) {
      for (const i of costItems(node, nodeResult, stageOf)) {
        if (!i.catalogueId || (isPortfolio(node) && i.where !== node.name)) continue
        budgets.set(i.catalogueId, (budgets.get(i.catalogueId) ?? 0) + i.total)
      }
    }
    return buildTracker({ scope, stages: catalogue.stages, entries, budgets, state: project.tracker })
  }, [type, project.attributes, project.tracker, node, nodeResult, scope, demo.coverage])

  const [open, setOpen] = useState<string | null>(null)
  const openStage = open ?? view.current

  return (
    <div className="flex flex-col gap-4">
      <Card title={`Development tracker · ${node.name}`} actions={<Chip tone="neutral">{type}</Chip>}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-ink-soft">Tasks closed</p>
            <p className="num text-xl font-semibold">{view.done} / {view.total}</p>
            <div className="mt-1 h-2 rounded-full bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={view.total} aria-valuenow={view.done} aria-label="Tasks closed">
              <div className="h-full rounded-full bg-accent" style={{ width: `${view.total ? (view.done / view.total) * 100 : 0}%` }} />
            </div>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Spent to date vs modelled budget</p>
            <p className="num text-xl font-semibold">{money(view.actual)} <span className="text-sm font-normal text-ink-mute">of {money(view.budget)}</span></p>
            <p className="text-xs text-ink-soft">Cost to complete <span className="num text-ink">{money(Math.max(0, view.budget - view.actual))}</span></p>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Current stage</p>
            <p className="text-base font-semibold">{view.current ? catalogue.stages.find((s) => s.id === view.current)?.label : 'All stages closed'}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-mute">One task per catalogue item that applies here. Check items off as studies complete and bills arrive, record what was actually spent, attach the receipt, and push the actual into the model so that line becomes exact. Receipts are stored in this browser until accounts arrive.</p>
      </Card>

      <PlanChanges />

      <ol className="flex flex-col gap-2">
        {view.stages.map((s, idx) => {
          const isCurrent = s.id === view.current
          const expanded = openStage === s.id
          const variance = s.actual - s.budget
          return (
            <li key={s.id} className={cx('rounded-lg border bg-surface', isCurrent ? 'border-accent' : 'border-line')}>
              <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? '' : s.id)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left">
                <span aria-hidden className={cx('flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold', s.complete ? 'border-good bg-good-soft text-good' : isCurrent ? 'border-accent bg-accent text-on-accent' : 'border-line-strong text-ink-soft')}>{s.complete ? '✓' : idx + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{s.label}</span>
                  <span className="text-xs text-ink-soft">{s.complete ? 'Complete' : isCurrent ? 'Current stage' : 'Upcoming'} · {s.done}/{s.total} closed · budget {money(s.budget)}{s.actual ? ` · spent ${money(s.actual)}` : ''}</span>
                </span>
                {s.actual > 0 && <Chip tone={variance > 0.005 * Math.max(1, s.budget) ? 'bad' : 'good'}>{variance > 0 ? '+' : ''}{money(variance)} vs budget</Chip>}
              </button>
              {expanded && (
                <ul className="flex flex-col divide-y divide-line border-t border-line">
                  {s.tasks.map((t) => <TaskRow key={t.key} task={t} />)}
                </ul>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function TaskRow({ task }: { task: Task }) {
  const { state, dispatch, node } = useWorkspace()
  const [error, setError] = useState<string | null>(null)
  const [estimate, setEstimate] = useState(0)
  const r = task.record
  const at = () => new Date().toISOString()
  const patch = (p: Partial<typeof r>) => dispatch({ type: 'task', key: task.key, patch: p, at: at() })
  const lines = node.costLines.filter((l) => l.catalogueId === task.item.id)
  const variance = r.actual !== null && task.budget !== null ? r.actual - task.budget : null

  const addReceipts = async (files: FileList | null) => {
    if (!files) return
    setError(null)
    const added: Receipt[] = []
    for (const file of [...files]) {
      const problem = validateReceipt(file)
      if (problem) {
        setError(problem)
        continue
      }
      const id = `${task.key}#${crypto.randomUUID()}`
      try {
        await putReceipt(id, file)
        added.push({ id, name: file.name, type: file.type, size: file.size, sha256: await sha256File(file), addedAt: at() })
      } catch {
        setError('This browser blocked receipt storage (private mode or storage disabled).')
      }
    }
    if (added.length) patch({ receipts: [...r.receipts, ...added], status: r.status === 'todo' ? 'in-progress' : r.status })
  }
  const openReceipt = async (rec: Receipt) => {
    const blob = await getReceipt(rec.id)
    if (!blob) return setError(`${rec.name} is not stored in this browser.`)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
  const removeReceipt = async (rec: Receipt) => {
    if (!window.confirm(`Remove ${rec.name}? The file is deleted from this browser.`)) return
    await deleteReceipt(rec.id).catch(() => undefined)
    patch({ receipts: r.receipts.filter((x) => x.id !== rec.id) })
  }
  const useActual = () => {
    if (r.actual === null || lines.length !== 1) return
    const line = lines[0]!
    dispatch({ type: 'edit', path: state.path, update: (n) => ({ ...n, costLines: n.costLines.map((l) => (l.id === line.id ? lineFromActual(l, r.actual!) : l)) }) })
  }
  const addToModel = () => {
    if (!(estimate > 0)) return
    dispatch({ type: 'edit', path: state.path, update: (n) => ({ ...n, costLines: [...n.costLines, lineFromItem(task.item, estimate, n, new Set(n.costLines.map((l) => l.id)))] }) })
  }

  return (
    <li className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="min-w-0">
        <p className={cx('font-medium', (r.status === 'done' || r.status === 'not-applicable') && 'text-ink-soft line-through decoration-1')}>{task.item.label}</p>
        <p className="mt-1 flex flex-wrap items-center gap-1 text-xs">
          <SourceChip tag={task.item.src} />
          {task.inModel === 'line' ? <Chip tone="good">in model</Chip> : task.inModel === 'covered' ? <Chip tone="accent" title={task.coverageNote}>covered elsewhere</Chip> : <Chip tone="bad">not in model</Chip>}
          {task.item.ref && <a href={task.item.ref} target="_blank" rel="noreferrer" className="text-accent underline">source</a>}
        </p>
        <label className="mt-2 flex flex-col gap-1 text-xs text-ink-soft">
          Status
          <select className="min-h-9 rounded border border-line-strong bg-surface px-2 text-sm text-ink" value={r.status} onChange={(e) => patch({ status: e.target.value as TaskStatus })}>
            {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs text-ink-soft">Budget <span className="num text-ink">{task.budget === null ? '—' : money(task.budget)}</span></p>
        <NumberField label="Actual spent" suffix="$" value={r.actual ?? 0} onCommit={(v) => patch({ actual: v > 0 ? v : null })} />
        {variance !== null && <Chip tone={variance > 0 ? 'bad' : 'good'}>{variance > 0 ? 'Over' : 'Under'} by {money(Math.abs(variance))}</Chip>}
        {task.inModel === 'line' && r.actual !== null && (
          <Button onClick={useActual} disabled={lines.length !== 1} title={lines.length !== 1 ? 'Several lines map to this item: edit them in Cost & budget' : undefined}>Use actual in model</Button>
        )}
        {task.inModel === 'missing' && (
          <div className="flex items-end gap-2">
            <NumberField label="Estimate to add" suffix="$" value={estimate} onCommit={setEstimate} />
            <Button onClick={addToModel} disabled={!(estimate > 0)}>Add to model</Button>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Notes
          <textarea className="min-h-16 rounded border border-line-strong bg-surface p-2 text-sm text-ink" defaultValue={r.notes} onBlur={(e) => e.target.value !== r.notes && patch({ notes: e.target.value })} />
        </label>
        <div className="text-xs">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line-strong px-2 py-1.5 font-medium hover:bg-sunken focus-within:outline-2 focus-within:outline-accent">
            Attach receipt
            <input type="file" className="sr-only" accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.csv" multiple onChange={(e) => { void addReceipts(e.target.files); e.target.value = '' }} />
          </label>
          {r.receipts.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {r.receipts.map((rec) => (
                <li key={rec.id} className="flex items-center gap-2">
                  <button type="button" className="min-w-0 truncate text-left text-accent underline" onClick={() => void openReceipt(rec)} title={`SHA-256 ${rec.sha256}`}>{rec.name}</button>
                  <span className="shrink-0 text-ink-mute">{(rec.size / 1024).toFixed(0)} KB</span>
                  <button type="button" className="shrink-0 text-bad underline" onClick={() => void removeReceipt(rec)} aria-label={`Remove ${rec.name}`}>remove</button>
                </li>
              ))}
            </ul>
          )}
          {error && <p role="alert" className="mt-1 text-bad">{error}</p>}
        </div>
      </div>
    </li>
  )
}

function PlanChanges() {
  const { draft, state, dispatch, node } = useWorkspace()
  const [offset, setOffset] = useState(12)
  const [error, setError] = useState<string | null>(null)
  const isBuilding = !isPortfolio(node)
  const add = () => {
    try {
      const { root, path } = addBuilding(draft, state.path, offset)
      setError(null)
      dispatch({ type: 'replaceDraft', draft: root, path })
    } catch (e) {
      setError((e as Error).message)
    }
  }
  const remove = () => {
    if (!window.confirm(`Remove ${node.name} from the plan? This changes the draft only; locked scenarios keep it.`)) return
    try {
      dispatch({ type: 'replaceDraft', draft: removeNode(draft, state.path), path: state.path.slice(0, -1) })
    } catch (e) {
      setError((e as Error).message)
    }
  }
  return (
    <Card title="Plan changes">
      <p className="mb-3 text-sm text-ink-soft">Plans change: add another building like this one, or drop one. Changes apply to the draft; lock a scenario first to keep the before-and-after.</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-36"><NumberField label="Starts later by" suffix="months" value={offset} onCommit={(v) => setOffset(Math.max(0, Math.round(v)))} /></div>
        <Button variant="primary" onClick={add} disabled={!isBuilding}>Add a building like {isBuilding ? (node as ProjectInput).name.split(':')[0] : 'this'}</Button>
        <Button onClick={remove} disabled={state.path.length === 0}>Remove this {isBuilding ? 'building' : 'phase'}</Button>
      </div>
      {!isBuilding && <p className="mt-2 text-xs text-ink-mute">Choose a building under Plan structure to duplicate it.</p>}
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </Card>
  )
}

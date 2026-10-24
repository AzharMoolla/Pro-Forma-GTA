import { useEffect, useMemo, useState } from 'react'
import { isPortfolio, runNode, type Node } from '../engine/portfolio'
import { modelOf, offSet } from '../engine/assumptions'
import { Button, Chip, cx } from './components'
import { ProjectMenu } from './ProjectMenu'
import { demoProjects } from './data'
import { metricValue } from './format'
import { Account } from './Account'
import { Inspector } from './Inspector'
import { useCloud } from './useCloud'
import { MetricLabel } from './Glossary'
import { Sections } from './sections'
import { readinessLabels, useReadiness } from './sections2'
import { atLeast, GROUPS, MODE_LABEL, SECTIONS, useStore, type Mode, type SectionId, isBlank } from './store'
import { flatten, getNode, getResult } from './tree'
import { WorkspaceContext, type Workspace } from './workspace'

/** Headline numbers by what is being built: rental is judged on yield and income, condo on sales, a plan on its phases. */
const KPIS = {
  rental: ['totalDevelopmentCost', 'stabilizedNoi', 'yieldOnCost', 'profitOnCost', 'unleveredIrr', 'leveredIrr', 'equityMultiple', 'unleveredNpv'],
  condo: ['totalDevelopmentCost', 'totalRevenue', 'profit', 'profitOnCost', 'peakDepositsHeld', 'leveredIrr', 'equityContributed', 'unleveredNpv'],
  plan: ['totalUnits', 'totalDevelopmentCost', 'profit', 'profitOnCost', 'unleveredIrr', 'leveredIrr', 'peakEquity', 'unleveredNpv'],
}
const tenureOf = (n: Node): keyof typeof KPIS => {
  if (isPortfolio(n)) return 'plan'
  const kinds = new Set(n.components.map((c) => c.kind))
  return kinds.has('condo') && !kinds.has('rental') ? 'condo' : 'rental'
}

/** Project status in one place: a summary that opens to the details, each with where to act on it. */
function StatusMenu({ synthetic, draftLabel, off, error, go }: { synthetic: boolean; draftLabel: string; off: number; error: boolean; go: (id: 'audit' | 'assumptions') => void }) {
  const l = readinessLabels(useReadiness())
  const items = [
    { tone: 'neutral' as const, text: draftLabel },
    ...(synthetic ? [{ tone: 'warn' as const, text: 'Synthetic demo figures' }] : []),
    ...(off ? [{ tone: 'warn' as const, text: `${off} assumption${off === 1 ? '' : 's'} off`, to: 'assumptions' as const }] : []),
    ...(error ? [{ tone: 'bad' as const, text: 'Input error' }] : [l.model, l.scope, l.sources].map((x) => ({ ...x, to: 'audit' as const }))),
  ]
  const attention = items.filter((i) => i.tone === 'warn' || i.tone === 'bad').length
  return (
    <details className="relative">
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-line px-3 text-sm hover:bg-sunken">
        <span aria-hidden className={cx('size-2 rounded-full', error ? 'bg-bad' : attention ? 'bg-warn' : 'bg-good')} />
        {attention ? `${attention} to review` : 'Ready'}<span aria-hidden className="text-ink-mute">▾</span>
      </summary>
      <div className="absolute right-0 z-20 mt-1 flex w-72 flex-col gap-2 rounded-lg border border-line bg-surface p-3 shadow-lg">
        <ul className="flex flex-col gap-1.5">{items.map((i) => <li key={i.text}><Chip tone={i.tone}>{i.text}</Chip></li>)}</ul>
        {!error && <button type="button" onClick={() => go('audit')} className="text-left text-sm text-accent underline" aria-label={`${l.model.text}. ${l.scope.text}. ${l.sources.text}. Open sources and audit`}>Open sources and audit</button>}
        {off > 0 && <button type="button" onClick={() => go('assumptions')} className="text-left text-sm text-accent underline">Review assumptions</button>}
      </div>
    </details>
  )
}

/** Sections in highlighted groups that collapse; the group holding the open section stays open. */
function SectionNav({ visible, section, go }: { visible: typeof SECTIONS; section: string; go: (id: SectionId) => void }) {
  const [closed, setClosed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('plangta.nav.closed') ?? '[]') as string[]) } catch { return new Set() }
  })
  const toggle = (id: string) => setClosed((c) => {
    const next = new Set(c)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    try { localStorage.setItem('plangta.nav.closed', JSON.stringify([...next])) } catch { /* storage unavailable: still works this session */ }
    return next
  })
  const item = (sec: (typeof SECTIONS)[number]) => (
    <li key={sec.id}>
      <button type="button" aria-current={section === sec.id ? 'page' : undefined} onClick={() => go(sec.id)}
        className={cx('min-h-9 w-full rounded-md px-3 text-left text-sm whitespace-nowrap', section === sec.id ? 'bg-accent-soft font-medium text-accent' : 'text-ink-soft hover:bg-sunken')}>
        {sec.label}
      </button>
    </li>
  )
  return (
    <>
      {/* Phones: one scrolling row */}
      <ul className="flex gap-1 overflow-x-auto lg:hidden">{visible.map(item)}</ul>
      <div className="hidden flex-col gap-2 lg:flex">
        <ul>{visible.filter((x) => !x.group).map(item)}</ul>
        {GROUPS.map((g) => {
          const secs = visible.filter((x) => x.group === g.id)
          if (!secs.length) return null
          const current = secs.some((x) => x.id === section)
          const open = current || !closed.has(g.id)
          return (
            <section key={g.id} className={cx('rounded-lg border p-1', current ? 'border-accent bg-accent-soft/40' : 'border-line bg-sunken/50')}>
              <button type="button" aria-expanded={open} onClick={() => !current && toggle(g.id)} disabled={current} title={current ? 'Holds the open section' : undefined}
                className="flex min-h-8 w-full items-center justify-between rounded px-2 text-left text-[11px] font-semibold tracking-wide text-ink-mute uppercase hover:text-ink disabled:cursor-default disabled:hover:text-ink-mute">
                {g.label}<span aria-hidden>{open ? '−' : '+'}</span>
              </button>
              {open && <ul className="flex flex-col">{secs.map(item)}</ul>}
            </section>
          )
        })}
      </div>
    </>
  )
}

export function App() {
  const [state, dispatch] = useStore()
  const cloudState = useCloud(state, dispatch)
  const current = state.projects[state.projectId]!
  // The open project, in the shape the sections expect: its own name and notes, its template's starting values
  const demo = useMemo(() => {
    const template = isBlank(current.meta)
      ? { id: current.meta.templateId, name: current.meta.name, projectType: current.meta.projectType, reference: current.meta.reference, notes: current.meta.notes, attributes: {}, coverage: {}, input: current.draft }
      : demoProjects.find((p) => p.id === current.meta.templateId) ?? demoProjects[0]!
    return { ...template, id: state.projectId, name: current.meta.name, projectType: current.meta.projectType, reference: current.meta.reference, notes: current.meta.notes, coverage: current.meta.coverage }
  }, [state.projectId, current.meta, current.draft])
  const draft = current.draft
  const model = useMemo(() => modelOf(draft, current.attributes), [draft, current.attributes])

  const { result, error } = useMemo(() => {
    try {
      return { result: runNode(model), error: null }
    } catch (e) {
      return { result: null, error: (e as Error).message }
    }
  }, [model])

  const path = useMemo(() => {
    try {
      getNode(draft, state.path)
      return state.path
    } catch {
      return []
    }
  }, [draft, state.path])
  const node = getNode(model, path)
  const nodeResult = result ? getResult(result, path) : null
  const ws: Workspace = { state: { ...state, path }, dispatch, demo, draft, model, result, error, node, nodeResult, cloud: cloudState }
  const tree = isPortfolio(draft) ? flatten(draft) : []
  const visible = SECTIONS.filter((s) => atLeast(state.mode, s.minMode))
  const section = visible.some((s) => s.id === state.section) || state.section === 'privacy' || state.section === 'terms' ? state.section : 'overview'

  // #privacy and #terms open those pages (links from emails, the sign-in form and the footer)
  useEffect(() => {
    const go = () => { const h = window.location.hash.slice(1); if (h === 'privacy' || h === 'terms') dispatch({ type: 'section', id: h }) }
    go()
    window.addEventListener('hashchange', go)
    return () => window.removeEventListener('hashchange', go)
  }, [dispatch])
  const parent = state.projects[state.projectId]!.draftParentId
  // the inspector opens when a number or line is selected, and otherwise gives its width to the content
  const showInspector = section !== 'map' && state.inspect !== null

  return (
    <WorkspaceContext.Provider value={ws}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded focus:bg-surface focus:p-2">Skip to content</a>
      <header className="border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="" width={36} height={36} className="size-9 shrink-0 rounded-lg" />
            <div>
              <p className="text-xs text-ink-mute"><span className="font-semibold tracking-wide text-accent">PlanGTA</span> · planning and pro forma for the GTA</p>
              <h1 className="text-lg font-semibold">{demo.name}</h1>
            </div>
          </div>
          <div className="flex w-full min-w-0 items-center gap-2 text-sm sm:w-auto">
            <ProjectMenu />
            <label htmlFor="project-select" className="text-ink-soft">Project</label>
            <select
              id="project-select"
              className="min-h-10 w-full min-w-0 rounded border border-line-strong bg-surface px-2 sm:w-auto sm:max-w-md"
              value={state.projectId}
              onChange={(e) => dispatch({ type: 'selectProject', id: e.target.value })}
            >
              {Object.entries(state.projects).map(([id, p]) => <option key={id} value={id}>{p.meta.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 pb-2">
          <fieldset className="flex items-center gap-1 rounded-lg bg-sunken p-0.5 text-sm">
            <legend className="sr-only">Detail level</legend>
            {(['quick', 'professional'] as Mode[]).map((m) => (
              <label key={m} className={cx('cursor-pointer rounded-md px-3 py-1.5', state.mode === m ? 'bg-surface font-medium text-ink shadow-sm' : 'text-ink-soft hover:text-ink')}>
                <input type="radio" name="mode" value={m} checked={state.mode === m} onChange={() => dispatch({ type: 'mode', mode: m })} className="sr-only" />
                {MODE_LABEL[m]}
              </label>
            ))}
          </fieldset>
          <div className="ml-auto flex flex-wrap items-center gap-2" aria-live="polite">
            <Account state={cloudState} />
            <StatusMenu synthetic={!isBlank(current.meta)} draftLabel={parent ? `Draft from scenario ${parent}` : 'Unsaved draft'} off={offSet(current.attributes).size} error={!!error} go={(id) => dispatch({ type: 'section', id })} />
          </div>
        </div>
      </header>

      {cloudState.askImport && (
        <div role="alertdialog" aria-label="Copy this browser's work into your account?" className="border-b border-accent bg-accent-soft print:hidden">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <p className="flex-1">Your account is new. Copy the projects in this browser into it, or start your account with the demo projects?</p>
            <Button variant="primary" onClick={() => cloudState.chooseImport(true)}>Copy this browser's projects</Button>
            <Button onClick={() => cloudState.chooseImport(false)}>Start fresh</Button>
          </div>
        </div>
      )}
      {nodeResult && SECTIONS.find((x) => x.id === section)?.kpis && (
        <div className="border-b border-line bg-surface">
          <ul className="mx-auto grid max-w-[1600px] grid-cols-2 gap-px bg-line sm:grid-cols-4 xl:grid-cols-8 print:hidden" aria-label={`Headline results for ${node.name}`}>
            {KPIS[tenureOf(node)].map((id) => nodeResult.metrics[id]).filter((m) => m !== undefined).map((m) => (
              <li key={m.id} className={cx('flex flex-col bg-surface', state.inspect?.kind === 'metric' && state.inspect.id === m.id && 'bg-accent-soft')}>
                <span className="px-4 pt-3 text-xs text-ink-soft"><MetricLabel id={m.id} label={m.label} /></span>
                <button
                  type="button"
                  aria-label={`${m.label}: ${metricValue(m)}. Show how it is calculated`}
                  onClick={() => dispatch({ type: 'inspect', inspect: { kind: 'metric', id: m.id } })}
                  className="flex flex-1 flex-col items-start gap-0.5 px-4 pb-3 text-left hover:bg-sunken"
                >
                  <span className="num text-xl font-semibold">{metricValue(m)}</span>
                  <span className="line-clamp-1 text-xs text-ink-mute">{m.value === null && m.missing.length ? `withheld: ${m.missing.length} unknown` : m.basis}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* The site map takes the full width: no inspector column, no max width */}
      <div className={cx('mx-auto grid gap-4 px-4 py-4 lg:grid-cols-[220px_minmax(0,1fr)] print:block print:p-0', section === 'map' ? 'xl:grid-cols-[200px_minmax(0,1fr)]' : showInspector ? 'max-w-[1600px] xl:grid-cols-[200px_minmax(0,1fr)_340px]' : 'max-w-[1600px] xl:grid-cols-[200px_minmax(0,1fr)]')}>
        <nav aria-label="Workspace sections" className="flex min-w-0 flex-col gap-4 print:hidden">
          <SectionNav visible={visible} section={section} go={(id) => dispatch({ type: 'section', id })} />
          {tree.length > 0 && (
            <div>
              <h2 className="mb-1 px-3 text-xs font-medium tracking-wide text-ink-mute uppercase">Plan structure</h2>
              <ul>
                {tree.map((t) => (
                  <li key={t.path.join('/') || 'root'}>
                    <button
                      type="button"
                      aria-current={t.path.join('/') === path.join('/') ? 'true' : undefined}
                      onClick={() => dispatch({ type: 'path', path: t.path })}
                      style={{ paddingLeft: `${0.75 + t.depth * 0.9}rem` }}
                      className={cx('min-h-9 w-full rounded-md pr-2 text-left text-sm', t.path.join('/') === path.join('/') ? 'bg-accent-soft font-medium text-accent' : 'text-ink-soft hover:bg-sunken')}
                    >
                      {t.kind === 'portfolio' ? '▸ ' : ''}{t.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <main id="main" className="min-w-0">
          {error ? (
            <div role="alert" className="rounded-lg border border-bad bg-bad-soft p-4 text-sm text-bad">
              <p className="font-semibold">The model can't run with these inputs.</p>
              <pre className="mt-2 whitespace-pre-wrap">{error}</pre>
            </div>
          ) : (
            <Sections section={section} />
          )}
        </main>

        {showInspector && (
          <aside aria-label="Inspector" className="min-w-0 lg:col-start-2 xl:col-start-3 xl:row-start-1 print:hidden">
            <Inspector />
          </aside>
        )}
      </div>
      <footer className="mx-auto max-w-[1600px] px-4 pb-6 text-xs text-ink-mute print:hidden">
        <p className="mb-1">Not financial, tax, lending, legal or planning advice.</p>
        <details>
          <summary className="cursor-pointer">Privacy and data</summary>
          <div className="mt-2 flex max-w-3xl flex-col gap-1">
            <p>Without an account, your work stays in this browser only. With an account, your projects, scenarios, project variables, tracker notes and amounts, and receipt files are stored in Supabase (Canada Central) and are visible only to your account.</p>
            <p>The site is served by Cloudflare, which sees standard request information such as your IP address. There is no analytics, advertising or tracking. Map searches run against data held by this service, not a third-party geocoder.</p>
            <p>Demo projects use synthetic figures. One engine at every detail level: the level changes what you see, never the math. Source code and data notes: github.com/AzharMoolla/Pro-Forma-GTA.</p>
            <p><a className="text-accent underline" href="#privacy">Privacy policy</a> · <a className="text-accent underline" href="#terms">Terms of use</a></p>
          </div>
        </details>
      </footer>
    </WorkspaceContext.Provider>
  )
}

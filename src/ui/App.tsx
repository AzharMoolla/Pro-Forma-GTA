import { useEffect, useMemo } from 'react'
import { isPortfolio, runNode } from '../engine/portfolio'
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
import { atLeast, SECTIONS, useStore, type Mode } from './store'
import { flatten, getNode, getResult } from './tree'
import { WorkspaceContext, type Workspace } from './workspace'

const KPIS = ['totalDevelopmentCost', 'profit', 'profitOnCost', 'yieldOnCost', 'unleveredIrr', 'leveredIrr', 'unleveredNpv', 'equityContributed']

function ReadinessChips({ onOpen }: { onOpen: () => void }) {
  const l = readinessLabels(useReadiness())
  return (
    <button type="button" onClick={onOpen} className="flex min-h-10 flex-wrap items-center gap-1 rounded-md hover:bg-sunken" aria-label={`${l.model.text}. ${l.scope.text}. ${l.sources.text}. Open sources and audit`}>
      <Chip tone={l.model.tone}>{l.model.text}</Chip>
      <Chip tone={l.scope.tone}>{l.scope.text}</Chip>
      <Chip tone={l.sources.tone}>{l.sources.text}</Chip>
    </button>
  )
}

export function App() {
  const [state, dispatch] = useStore()
  const cloudState = useCloud(state, dispatch)
  const current = state.projects[state.projectId]!
  // The open project, in the shape the sections expect: its own name and notes, its template's starting values
  const demo = useMemo(() => {
    const template = demoProjects.find((p) => p.id === current.meta.templateId) ?? demoProjects[0]!
    return { ...template, id: state.projectId, name: current.meta.name, projectType: current.meta.projectType, reference: current.meta.reference, notes: current.meta.notes, coverage: current.meta.coverage }
  }, [state.projectId, current.meta])
  const draft = current.draft

  const { result, error } = useMemo(() => {
    try {
      return { result: runNode(draft), error: null }
    } catch (e) {
      return { result: null, error: (e as Error).message }
    }
  }, [draft])

  const path = useMemo(() => {
    try {
      getNode(draft, state.path)
      return state.path
    } catch {
      return []
    }
  }, [draft, state.path])
  const node = getNode(draft, path)
  const nodeResult = result ? getResult(result, path) : null
  const ws: Workspace = { state: { ...state, path }, dispatch, demo, draft, result, error, node, nodeResult, cloud: cloudState }
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
          <fieldset className="flex items-center gap-1 text-sm">
            <legend className="sr-only">Detail level</legend>
            {(['quick', 'professional', 'institutional'] as Mode[]).map((m) => (
              <label key={m} className={cx('cursor-pointer rounded-md px-3 py-2 capitalize', state.mode === m ? 'bg-accent text-on-accent' : 'text-ink-soft hover:bg-sunken')}>
                <input type="radio" name="mode" value={m} checked={state.mode === m} onChange={() => dispatch({ type: 'mode', mode: m })} className="sr-only" />
                {m}
              </label>
            ))}
          </fieldset>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
            <Account state={cloudState} />
            <Chip tone="warn" title="All demo figures are synthetic placeholders, not market evidence">Synthetic demo</Chip>
            <Chip tone="neutral">{parent ? `Draft from scenario ${parent}` : 'Unsaved draft'}</Chip>
            {error ? <Chip tone="bad">Input error</Chip> : <ReadinessChips onOpen={() => dispatch({ type: 'section', id: 'audit' })} />}
          </div>
        </div>
        <p className="mx-auto max-w-[1600px] px-4 pb-2 text-xs text-ink-mute">
          One engine for every mode: the detail level changes which inputs and analyses you see, never the math. Not financial, tax, lending or legal advice.
        </p>
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
      {nodeResult && (
        <div className="border-b border-line bg-surface">
          <ul className="mx-auto grid max-w-[1600px] grid-cols-2 gap-px bg-line sm:grid-cols-4 xl:grid-cols-8 print:hidden" aria-label={`Headline results for ${node.name}`}>
            {KPIS.map((id) => nodeResult.metrics[id]).filter((m) => m !== undefined).map((m) => (
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
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {visible.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-current={section === s.id ? 'page' : undefined}
                  onClick={() => dispatch({ type: 'section', id: s.id })}
                  className={cx('min-h-10 w-full rounded-md px-3 text-left text-sm whitespace-nowrap', section === s.id ? 'bg-accent-soft font-medium text-accent' : 'text-ink-soft hover:bg-sunken')}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
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
        <details>
          <summary className="cursor-pointer">Privacy and data</summary>
          <div className="mt-2 flex max-w-3xl flex-col gap-1">
            <p>Without an account, your work stays in this browser only. With an account, your projects, scenarios, project variables, tracker notes and amounts, and receipt files are stored in Supabase (Canada Central) and are visible only to your account.</p>
            <p>The site is served by Cloudflare, which sees standard request information such as your IP address. There is no analytics, advertising or tracking. Map searches run against data held by this service, not a third-party geocoder.</p>
            <p>Demo projects use synthetic figures. Nothing here is financial, tax, lending, legal or planning advice. Source code and data notes: github.com/AzharMoolla/Pro-Forma-GTA.</p>
            <p><a className="text-accent underline" href="#privacy">Privacy policy</a> · <a className="text-accent underline" href="#terms">Terms of use</a></p>
          </div>
        </details>
      </footer>
    </WorkspaceContext.Provider>
  )
}

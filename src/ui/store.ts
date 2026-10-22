import { useEffect, useReducer } from 'react'
import type { Attributes } from '../engine/catalogue'
import type { Node } from '../engine/portfolio'
import type { Snapshot } from '../scenario/snapshot'
import { emptyRecord, type TaskRecord, type TrackerState } from '../tracker/tracker'
import { demoProjects } from './data'
import { updateNode, type NodePath } from './tree'

export type Mode = 'quick' | 'professional' | 'institutional'
export type SectionId = 'overview' | 'map' | 'people' | 'charts' | 'feasibility' | 'assumptions' | 'verification' | 'report' | 'privacy' | 'terms' | 'progress' | 'market' | 'program' | 'costs' | 'revenue' | 'finance' | 'returns' | 'scenarios' | 'audit'

export const SECTIONS: Array<{ id: SectionId; label: string; minMode: Mode }> = [
  { id: 'overview', label: 'Overview', minMode: 'quick' },
  { id: 'map', label: 'Site map', minMode: 'quick' },
  { id: 'progress', label: 'Development tracker', minMode: 'quick' },
  { id: 'market', label: 'Market evidence', minMode: 'quick' },
  { id: 'people', label: 'People & affordability', minMode: 'quick' },
  { id: 'program', label: 'Site & program', minMode: 'quick' },
  { id: 'costs', label: 'Cost & budget', minMode: 'quick' },
  { id: 'revenue', label: 'Revenue & operations', minMode: 'quick' },
  { id: 'finance', label: 'Finance & ledger', minMode: 'professional' },
  { id: 'returns', label: 'Returns & range', minMode: 'quick' },
  { id: 'feasibility', label: 'Feasibility & stress', minMode: 'quick' },
  { id: 'assumptions', label: 'Assumptions', minMode: 'quick' },
  { id: 'charts', label: 'Charts', minMode: 'quick' },
  { id: 'scenarios', label: 'Scenarios', minMode: 'professional' },
  { id: 'audit', label: 'Sources & audit', minMode: 'quick' },
  { id: 'verification', label: 'Verification', minMode: 'quick' },
  { id: 'report', label: 'Report & export', minMode: 'quick' },
]

const rank: Record<Mode, number> = { quick: 0, professional: 1, institutional: 2 }
export const atLeast = (mode: Mode, min: Mode) => rank[mode] >= rank[min]

export type Inspect =
  | { kind: 'metric'; id: string }
  | { kind: 'line'; path: NodePath; lineId: string }
  | null

/** What a project is, apart from its numbers. Demo projects are templates; a user's projects copy one. */
export interface ProjectMeta {
  name: string
  projectType: string
  reference: string
  notes: string[]
  coverage: Record<string, string> // where applicable catalogue items are carried (from the template)
  templateId: string // demo the project started from; "Reset draft" returns to it
}

export const metaOf = (demo: (typeof demoProjects)[number]): ProjectMeta => ({ name: demo.name, projectType: demo.projectType, reference: demo.reference, notes: demo.notes, coverage: demo.coverage, templateId: demo.id })

export interface ProjectState {
  meta: ProjectMeta
  draft: Node
  draftParentId: string | null
  scenarios: Snapshot[]
  attributes: Attributes // project variables (the switches that drive the cost checklist)
  tracker: TrackerState // task status, actuals, receipt metadata (receipt files live in IndexedDB)
}

export interface State {
  account: string | null // signed-in user id; null = guest workspace (the only state kept in this browser)
  projectId: string
  projects: Record<string, ProjectState>
  section: SectionId
  mode: Mode
  path: NodePath
  inspect: Inspect
}

export type Action =
  | { type: 'account'; userId: string | null; seed?: 'guest' | 'pristine' | { cloud: Record<string, ProjectState> } }
  | { type: 'createProject'; id: string; project: ProjectState }
  | { type: 'renameProject'; id: string; name: string }
  | { type: 'deleteProject'; id: string }
  | { type: 'selectProject'; id: string }
  | { type: 'section'; id: SectionId }
  | { type: 'mode'; mode: Mode }
  | { type: 'path'; path: NodePath }
  | { type: 'inspect'; inspect: Inspect }
  | { type: 'edit'; path: NodePath; update: (node: Node) => Node }
  | { type: 'addSnapshot'; snapshot: Snapshot }
  | { type: 'branch'; snapshotId: string }
  | { type: 'resetDraft' }
  | { type: 'attribute'; id: string; value: Attributes[string] }
  | { type: 'task'; key: string; patch: Partial<TaskRecord>; at: string }
  | { type: 'replaceDraft'; draft: Node; path: NodePath }
  | { type: 'hydrate'; projectId: string; draft: Node; attributes: Attributes; draftParentId: string | null; scenarios: Snapshot[]; tracker: TrackerState }

const STORAGE_KEY = 'gta-proforma:v1'

/** The three demo projects, untouched. */
export function pristineProjects(): Record<string, ProjectState> {
  return Object.fromEntries(demoProjects.map((p) => [p.id, { meta: metaOf(p), draft: p.input, draftParentId: null, scenarios: [] as Snapshot[], attributes: p.attributes, tracker: {} as TrackerState }]))
}

export function initialState(): State {
  const projects = pristineProjects()
  const base: State = { account: null, projectId: demoProjects[0]!.id, projects, section: 'overview', mode: 'professional', path: [], inspect: null }
  // Per-viewer convenience only (ADR-001: durable storage moves to Supabase). Must work when storage is unavailable.
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<State> | null
    if (!saved?.projects) return base
    const removed = new Set((saved as { removed?: string[] }).removed ?? [])
    for (const id of removed) delete projects[id]
    for (const [id, p] of Object.entries(saved.projects)) {
      const scenarios = (p.scenarios ?? []).map((s) => (s.locked ? Object.freeze(s) : s))
      if (projects[id]) projects[id] = { ...projects[id], ...p, meta: p.meta ?? projects[id].meta, scenarios }
      else if (p.meta && p.draft) projects[id] = { ...p, scenarios } // a project the user created in this browser
    }
    if (!Object.keys(projects).length) Object.assign(projects, pristineProjects())
    return { ...base, projectId: saved.projectId && projects[saved.projectId] ? saved.projectId : base.projectId, mode: saved.mode ?? base.mode }
  } catch {
    return base
  }
}

export function reducer(state: State, action: Action): State {
  const project = state.projects[state.projectId]!
  const withProject = (p: Partial<ProjectState>): State => ({ ...state, projects: { ...state.projects, [state.projectId]: { ...project, ...p } } })
  switch (action.type) {
    case 'account': {
      // A different account (or signing out) never inherits the previous account's projects: start again from the
      // guest workspace saved in this browser; the signed-in account then loads its own copies from the cloud.
      if (action.userId === state.account && !action.seed) return state
      // seed: the guest workspace (copied into a new account), the demos (start fresh), or the account's own projects
      const guest = initialState()
      const projects = action.seed === 'pristine' ? pristineProjects() : typeof action.seed === 'object' ? action.seed.cloud : guest.projects
      const ids = Object.keys(projects)
      return { ...guest, projects, account: action.userId, section: state.section, mode: state.mode, path: [], inspect: null, projectId: state.projectId in projects ? state.projectId : ids[0]! }
    }
    case 'createProject': return { ...state, projects: { ...state.projects, [action.id]: action.project }, projectId: action.id, path: [], inspect: null }
    case 'renameProject': {
      const target = state.projects[action.id]
      const name = action.name.trim()
      return target && name ? { ...state, projects: { ...state.projects, [action.id]: { ...target, meta: { ...target.meta, name } } } } : state
    }
    case 'deleteProject': {
      const ids = Object.keys(state.projects)
      if (!state.projects[action.id] || ids.length <= 1) return state // always keep one project
      const { [action.id]: _gone, ...rest } = state.projects
      void _gone
      return { ...state, projects: rest, projectId: state.projectId === action.id ? Object.keys(rest)[0]! : state.projectId, path: [], inspect: null }
    }
    case 'selectProject': return { ...state, projectId: action.id, path: [], inspect: null }
    case 'section': return { ...state, section: action.id }
    case 'mode': return { ...state, mode: action.mode }
    case 'path': return { ...state, path: action.path, inspect: null }
    case 'inspect': return { ...state, inspect: action.inspect }
    case 'edit': return withProject({ draft: updateNode(project.draft, action.path, action.update) })
    case 'addSnapshot': return withProject({ scenarios: [...project.scenarios, action.snapshot], draftParentId: action.snapshot.id })
    case 'branch': {
      const s = project.scenarios.find((x) => x.id === action.snapshotId)
      // schema-2 snapshots also restore the site and policy variables they were locked with
      return s ? { ...withProject({ draft: structuredClone(s.input), draftParentId: s.id, ...(s.attributes ? { attributes: structuredClone(s.attributes) } : {}) }), path: [] } : state
    }
    case 'resetDraft': {
      const demo = demoProjects.find((p) => p.id === project.meta.templateId) ?? demoProjects[0]!
      return { ...withProject({ draft: demo.input, draftParentId: null, attributes: demo.attributes }), path: [] }
    }
    case 'attribute': return withProject({ attributes: { ...project.attributes, [action.id]: action.value } })
    case 'task': {
      const current = project.tracker[action.key] ?? emptyRecord()
      return withProject({ tracker: { ...project.tracker, [action.key]: { ...current, ...action.patch, updatedAt: action.at } } })
    }
    case 'replaceDraft': return { ...withProject({ draft: action.draft }), path: action.path, inspect: null }
    case 'hydrate': {
      const { projectId, draft, attributes, draftParentId, scenarios, tracker } = action
      return { ...state, projects: { ...state.projects, [projectId]: { ...state.projects[projectId]!, draft, attributes, draftParentId, scenarios, tracker } } }
    }
  }
}

export function useStore() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  useEffect(() => {
    if (state.account) return // signed-in work lives in the account, not in this browser's guest cache
    try {
      // demos the user deleted are remembered, so they don't come back on reload
      const removed = demoProjects.map((d) => d.id).filter((id) => !state.projects[id])
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ projectId: state.projectId, mode: state.mode, projects: state.projects, removed }))
    } catch {
      // storage unavailable (private window, blocked): the app still works for this session
    }
  }, [state.account, state.projectId, state.mode, state.projects])
  return [state, dispatch] as const
}

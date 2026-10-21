import { useEffect, useReducer } from 'react'
import type { Attributes } from '../engine/catalogue'
import type { Node } from '../engine/portfolio'
import type { Snapshot } from '../scenario/snapshot'
import { emptyRecord, type TaskRecord, type TrackerState } from '../tracker/tracker'
import { demoProjects } from './data'
import { updateNode, type NodePath } from './tree'

export type Mode = 'quick' | 'professional' | 'institutional'
export type SectionId = 'overview' | 'progress' | 'market' | 'program' | 'costs' | 'revenue' | 'finance' | 'returns' | 'scenarios' | 'audit'

export const SECTIONS: Array<{ id: SectionId; label: string; minMode: Mode }> = [
  { id: 'overview', label: 'Overview', minMode: 'quick' },
  { id: 'progress', label: 'Development tracker', minMode: 'quick' },
  { id: 'market', label: 'Market evidence', minMode: 'quick' },
  { id: 'program', label: 'Site & program', minMode: 'quick' },
  { id: 'costs', label: 'Cost & budget', minMode: 'quick' },
  { id: 'revenue', label: 'Revenue & operations', minMode: 'quick' },
  { id: 'finance', label: 'Finance & ledger', minMode: 'professional' },
  { id: 'returns', label: 'Returns & range', minMode: 'quick' },
  { id: 'scenarios', label: 'Scenarios', minMode: 'professional' },
  { id: 'audit', label: 'Sources & audit', minMode: 'quick' },
]

const rank: Record<Mode, number> = { quick: 0, professional: 1, institutional: 2 }
export const atLeast = (mode: Mode, min: Mode) => rank[mode] >= rank[min]

export type Inspect =
  | { kind: 'metric'; id: string }
  | { kind: 'line'; path: NodePath; lineId: string }
  | null

interface ProjectState {
  draft: Node
  draftParentId: string | null
  scenarios: Snapshot[]
  attributes: Attributes // project variables (the switches that drive the cost checklist)
  tracker: TrackerState // task status, actuals, receipt metadata (receipt files live in IndexedDB)
}

export interface State {
  projectId: string
  projects: Record<string, ProjectState>
  section: SectionId
  mode: Mode
  path: NodePath
  inspect: Inspect
}

export type Action =
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

const STORAGE_KEY = 'gta-proforma:v1'

function initial(): State {
  const projects: Record<string, ProjectState> = Object.fromEntries(
    demoProjects.map((p) => [p.id, { draft: p.input, draftParentId: null, scenarios: [] as Snapshot[], attributes: p.attributes, tracker: {} as TrackerState }]),
  )
  const base: State = { projectId: demoProjects[0]!.id, projects, section: 'overview', mode: 'professional', path: [], inspect: null }
  // Per-viewer convenience only (ADR-001: durable storage moves to Supabase). Must work when storage is unavailable.
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<State> | null
    if (!saved?.projects) return base
    for (const [id, p] of Object.entries(saved.projects)) {
      if (projects[id]) projects[id] = { ...projects[id], ...p, scenarios: (p.scenarios ?? []).map((s) => (s.locked ? Object.freeze(s) : s)) }
    }
    return { ...base, projectId: saved.projectId && projects[saved.projectId] ? saved.projectId : base.projectId, mode: saved.mode ?? base.mode }
  } catch {
    return base
  }
}

function reducer(state: State, action: Action): State {
  const project = state.projects[state.projectId]!
  const withProject = (p: Partial<ProjectState>): State => ({ ...state, projects: { ...state.projects, [state.projectId]: { ...project, ...p } } })
  switch (action.type) {
    case 'selectProject': return { ...state, projectId: action.id, path: [], inspect: null }
    case 'section': return { ...state, section: action.id }
    case 'mode': return { ...state, mode: action.mode }
    case 'path': return { ...state, path: action.path, inspect: null }
    case 'inspect': return { ...state, inspect: action.inspect }
    case 'edit': return withProject({ draft: updateNode(project.draft, action.path, action.update) })
    case 'addSnapshot': return withProject({ scenarios: [...project.scenarios, action.snapshot], draftParentId: action.snapshot.id })
    case 'branch': {
      const s = project.scenarios.find((x) => x.id === action.snapshotId)
      return s ? { ...withProject({ draft: structuredClone(s.input), draftParentId: s.id }), path: [] } : state
    }
    case 'resetDraft': {
      const demo = demoProjects.find((p) => p.id === state.projectId)!
      return { ...withProject({ draft: demo.input, draftParentId: null, attributes: demo.attributes }), path: [] }
    }
    case 'attribute': return withProject({ attributes: { ...project.attributes, [action.id]: action.value } })
    case 'task': {
      const current = project.tracker[action.key] ?? emptyRecord()
      return withProject({ tracker: { ...project.tracker, [action.key]: { ...current, ...action.patch, updatedAt: action.at } } })
    }
    case 'replaceDraft': return { ...withProject({ draft: action.draft }), path: action.path, inspect: null }
  }
}

export function useStore() {
  const [state, dispatch] = useReducer(reducer, undefined, initial)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ projectId: state.projectId, mode: state.mode, projects: state.projects }))
    } catch {
      // storage unavailable (private window, blocked): the app still works for this session
    }
  }, [state.projectId, state.mode, state.projects])
  return [state, dispatch] as const
}

import { useEffect, useRef, useState, type Dispatch } from 'react'
import { cloud, listProjects, loadOrCreateProject, saveDraft } from '../cloud/cloud'
import { canonical } from '../scenario/snapshot'
import type { TrackerState } from '../tracker/tracker'
import { demoProjects } from './data'
import { initialState, type Action, type ProjectState, type State } from './store'

export interface CloudState {
  configured: boolean
  user: { id: string; email: string } | null
  projectId: string | null // cloud row id of the open project
  status: 'off' | 'signed-out' | 'loading' | 'saved' | 'saving' | 'error'
  error: string | null
  /** A new, empty account and work in this browser: ask before copying it in. */
  askImport: boolean
  chooseImport: (copy: boolean) => void
  recovering: boolean // arrived from a password-reset email: show "set a new password"
  doneRecovering: () => void
}

/** Has this browser's guest workspace anything beyond the untouched demos? */
export function guestHasWork(): boolean {
  const guest = initialState().projects
  return Object.entries(guest).some(([id, p]) => {
    const demo = demoProjects.find((d) => d.id === id)
    return !demo || p.scenarios.length > 0 || Object.keys(p.tracker).length > 0 || canonical(p.draft) !== canonical(demo.input) || canonical(p.attributes) !== canonical(demo.attributes)
  })
}

/** Keeps the open project in sync with Supabase while signed in. Without config or sign-in, the app stays local. */
export function useCloud(state: State, dispatch: Dispatch<Action>): CloudState {
  const [user, setUser] = useState<CloudState['user']>(null)
  const [projectIds, setProjectIds] = useState<Record<string, string>>({}) // keyed `${userId}:${demoId}`
  const [status, setStatus] = useState<CloudState['status']>(cloud ? 'signed-out' : 'off')
  const [error, setError] = useState<string | null>(null)
  const hydrated = useRef<{ draft: unknown; attributes: unknown; parent: unknown } | null>(null) // what was loaded; not re-saved unchanged
  const [askImport, setAskImport] = useState(false)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (!cloud) return
    const toUser = (u: { id: string; email?: string } | null | undefined) => (u ? { id: u.id, email: u.email ?? '' } : null)
    void cloud.auth.getSession().then(({ data }) => setUser(toUser(data.session?.user)))
    const { data } = cloud.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setUser(toUser(session?.user))
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Tell the store who is signed in; it swaps to that account's projects (or the guest workspace) before anything loads.
  // A brand-new account never gets this browser's work silently: the user chooses.
  useEffect(() => {
    hydrated.current = null
    if (!cloud || !user) { dispatch({ type: 'account', userId: null }); return }
    let live = true
    listProjects().then((rows) => {
      if (!live) return
      setAskImport(false)
      if (rows.length) {
        const cloudProjects: Record<string, ProjectState> = Object.fromEntries(rows.map((r) => [r.clientId, { meta: r.meta, draft: r.draft, attributes: r.attributes, draftParentId: r.draftParentId, scenarios: [], tracker: {} as TrackerState }]))
        dispatch({ type: 'account', userId: user.id, seed: { cloud: cloudProjects } })
      } else if (guestHasWork()) setAskImport(true)
      else dispatch({ type: 'account', userId: user.id, seed: 'pristine' })
    }).catch((e: Error) => { if (live) { setStatus('error'); setError(e.message) } })
    return () => { live = false }
  }, [user, dispatch])
  const chooseImport = (copy: boolean) => {
    if (!user) return
    setAskImport(false)
    dispatch({ type: 'account', userId: user.id, seed: copy ? 'guest' : 'pristine' })
  }

  const project = state.projects[state.projectId]!
  const ready = !!user && state.account === user.id // the store has already switched to this account
  const cacheKey = user ? `${user.id}:${state.projectId}` : ''
  const projectId = ready ? projectIds[cacheKey] ?? null : null

  // Load (or create) the cloud copy when signing in or switching project.
  useEffect(() => {
    if (!cloud || !user || !ready || projectIds[cacheKey]) return
    const demo = { id: state.projectId, ...project.meta }
    let live = true
    loadOrCreateProject({ demoId: demo.id, name: demo.name, projectType: demo.projectType, meta: project.meta, local: { draft: project.draft, attributes: project.attributes, draftParentId: project.draftParentId, scenarios: project.scenarios, tracker: project.tracker } })
      .then((p) => {
        if (!live) return
        hydrated.current = { draft: p.draft, attributes: p.attributes, parent: p.draftParentId }
        dispatch({ type: 'hydrate', projectId: demo.id, draft: p.draft, attributes: p.attributes, draftParentId: p.draftParentId, scenarios: p.scenarios, tracker: p.tracker })
        setProjectIds((m) => ({ ...m, [cacheKey]: p.id }))
        setStatus('saved')
        setError(null)
      })
      .catch((e: Error) => {
        if (!live) return
        setStatus('error')
        setError(e.message)
      })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per user and project; local state is only the first-time seed
  }, [user, ready, cacheKey, projectIds])

  // Debounced save of the draft and project variables.
  useEffect(() => {
    if (!cloud || !projectId) return
    const h = hydrated.current
    if (h && h.draft === project.draft && h.attributes === project.attributes && h.parent === project.draftParentId) return
    let live = true // a save that finishes after an account or project switch must not report on the new one
    const timer = setTimeout(() => {
      setStatus('saving')
      saveDraft(projectId, project.draft, project.attributes, project.draftParentId)
        .then(() => { if (live) { setStatus('saved'); setError(null) } })
        .catch((e: Error) => { if (live) { setStatus('error'); setError(e.message) } })
    }, 1200)
    return () => { live = false; clearTimeout(timer) }
  }, [projectId, project.draft, project.attributes, project.draftParentId])

  const loading = !!user && !projectId && status !== 'error'
  return {
    configured: !!cloud, user, projectId, status: !cloud ? 'off' : !user ? 'signed-out' : loading ? 'loading' : status, error,
    askImport: askImport && !!user, chooseImport, recovering, doneRecovering: () => setRecovering(false),
  }
}

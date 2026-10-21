import { useEffect, useRef, useState, type Dispatch } from 'react'
import { cloud, loadOrCreateProject, saveDraft } from '../cloud/cloud'
import { demoProjects } from './data'
import type { Action, State } from './store'

export interface CloudState {
  configured: boolean
  user: { id: string; email: string } | null
  projectId: string | null // cloud row id of the open project
  status: 'off' | 'signed-out' | 'loading' | 'saved' | 'saving' | 'error'
  error: string | null
}

/** Keeps the open project in sync with Supabase while signed in. Without config or sign-in, the app stays local. */
export function useCloud(state: State, dispatch: Dispatch<Action>): CloudState {
  const [user, setUser] = useState<CloudState['user']>(null)
  const [projectIds, setProjectIds] = useState<Record<string, string>>({}) // keyed `${userId}:${demoId}`
  const [status, setStatus] = useState<CloudState['status']>(cloud ? 'signed-out' : 'off')
  const [error, setError] = useState<string | null>(null)
  const hydrated = useRef<{ draft: unknown; attributes: unknown; parent: unknown } | null>(null) // what was loaded; not re-saved unchanged

  useEffect(() => {
    if (!cloud) return
    const toUser = (u: { id: string; email?: string } | null | undefined) => (u ? { id: u.id, email: u.email ?? '' } : null)
    void cloud.auth.getSession().then(({ data }) => setUser(toUser(data.session?.user)))
    const { data } = cloud.auth.onAuthStateChange((_event, session) => setUser(toUser(session?.user)))
    return () => data.subscription.unsubscribe()
  }, [])

  // Tell the store who is signed in; it swaps to that account's (or the guest) workspace before anything loads.
  useEffect(() => {
    hydrated.current = null
    dispatch({ type: 'account', userId: user?.id ?? null })
  }, [user, dispatch])

  const project = state.projects[state.projectId]!
  const ready = !!user && state.account === user.id // the store has already switched to this account
  const cacheKey = user ? `${user.id}:${state.projectId}` : ''
  const projectId = ready ? projectIds[cacheKey] ?? null : null

  // Load (or create) the cloud copy when signing in or switching project.
  useEffect(() => {
    if (!cloud || !user || !ready || projectIds[cacheKey]) return
    const demo = demoProjects.find((p) => p.id === state.projectId)!
    let live = true
    loadOrCreateProject({ demoId: demo.id, name: demo.name, projectType: demo.projectType, local: { draft: project.draft, attributes: project.attributes, draftParentId: project.draftParentId, scenarios: project.scenarios, tracker: project.tracker } })
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
  return { configured: !!cloud, user, projectId, status: !cloud ? 'off' : !user ? 'signed-out' : loading ? 'loading' : status, error }
}

// Cloud persistence (Supabase): auth, projects, append-only scenarios, tracker, receipt files.
// The app works without it: when env vars are missing, `cloud` is null and everything stays in this browser.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Attributes } from '../engine/catalogue'
import type { Node } from '../engine/portfolio'
import { canonical, envelope, fromEnvelope, lock, type Snapshot } from '../scenario/snapshot'
import type { Receipt, TaskRecord, TrackerState } from '../tracker/tracker'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const cloud: SupabaseClient | null = url && key ? createClient(url, key) : null

export interface CloudProject {
  id: string
  draft: Node
  attributes: Attributes
  draftParentId: string | null
  scenarios: Snapshot[]
  tracker: TrackerState
}

interface ScenarioRow {
  client_id: string; parent_client_id: string | null; label: string; note: string; input: unknown // envelope (schema 2) or bare Node (schema 1)
  input_hash: string; engine_version: string; convention_version: string; created_at: string
}
interface TaskRow { task_key: string; status: TaskRecord['status']; actual: number | string | null; notes: string; updated_at: string }
interface ReceiptRow { id: string; task_key: string; storage_path: string; file_name: string; mime_type: string; size_bytes: number; sha256: string; uploaded_at: string }

function need(): SupabaseClient {
  if (!cloud) throw new Error('Cloud saving is not configured')
  return cloud
}

function fail(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`${what}: ${error.message}`)
}

/** Rows → app state. Exported for tests. */
export function toSnapshot(r: ScenarioRow): Snapshot {
  return lock({
    ...fromEnvelope(r.input), id: r.client_id, parentId: r.parent_client_id, label: r.label, note: r.note, createdAt: r.created_at,
    engineVersion: r.engine_version, conventionVersion: r.convention_version, inputHash: r.input_hash, locked: true,
  })
}

export function toTracker(tasks: TaskRow[], receipts: ReceiptRow[]): TrackerState {
  const state: TrackerState = {}
  for (const t of tasks) state[t.task_key] = { status: t.status, actual: t.actual === null ? null : Number(t.actual), notes: t.notes, receipts: [], updatedAt: t.updated_at }
  for (const r of receipts) {
    const rec = (state[r.task_key] ??= { status: 'in-progress', actual: null, notes: '', receipts: [] })
    rec.receipts.push({ id: r.id, name: r.file_name, type: r.mime_type, size: r.size_bytes, sha256: r.sha256, addedAt: r.uploaded_at, storagePath: r.storage_path })
  }
  return state
}

/** Loads the signed-in user's copy of a demo project, creating it from the local state the first time. */
export async function loadOrCreateProject(args: { demoId: string; name: string; projectType: string; local: Omit<CloudProject, 'id'> }): Promise<CloudProject> {
  const db = need()
  const found = await db.from('projects').select('id, draft, attributes, draft_parent_client_id').eq('demo_id', args.demoId).maybeSingle()
  fail(found.error, 'Loading project')
  let id: string
  if (!found.data) {
    const created = await db.from('projects')
      .insert({ demo_id: args.demoId, name: args.name, project_type: args.projectType, draft: args.local.draft, attributes: args.local.attributes, draft_parent_client_id: args.local.draftParentId })
      .select('id').single()
    fail(created.error, 'Creating project')
    id = created.data!.id as string
    for (const s of args.local.scenarios) await saveScenario(id, s)
    for (const [taskKey, record] of Object.entries(args.local.tracker)) await saveTask(id, taskKey, record)
  } else id = found.data.id as string

  const [project, scenarios, tasks, receipts] = await Promise.all([
    db.from('projects').select('draft, attributes, draft_parent_client_id').eq('id', id).single(),
    db.from('scenarios').select('client_id, parent_client_id, label, note, input, input_hash, engine_version, convention_version, created_at').eq('project_id', id).order('created_at'),
    db.from('tracker_tasks').select('task_key, status, actual, notes, updated_at').eq('project_id', id),
    db.from('receipts').select('id, task_key, storage_path, file_name, mime_type, size_bytes, sha256, uploaded_at').eq('project_id', id).is('removed_at', null).order('uploaded_at'),
  ])
  fail(project.error ?? scenarios.error ?? tasks.error ?? receipts.error, 'Loading project data')
  return {
    id,
    draft: project.data!.draft as Node,
    attributes: project.data!.attributes as Attributes,
    draftParentId: project.data!.draft_parent_client_id as string | null,
    scenarios: (scenarios.data as ScenarioRow[]).map(toSnapshot),
    tracker: toTracker(tasks.data as TaskRow[], receipts.data as ReceiptRow[]),
  }
}

export async function saveDraft(projectId: string, draft: Node, attributes: Attributes, draftParentId: string | null): Promise<void> {
  const { data, error } = await need().from('projects').update({ draft, attributes, draft_parent_client_id: draftParentId }).eq('id', projectId).select('id')
  fail(error, 'Saving draft')
  // RLS filters rows silently: no error and no row means nothing was saved (signed out, or not this account's project)
  if (!data?.length) throw new Error('Saving draft: no project was updated (signed out, or the project belongs to another account)')
}

/** Append-only. The database recomputes SHA-256 of `input_canonical` (the whole envelope) and refuses a mismatch. */
export async function saveScenario(projectId: string, s: Snapshot): Promise<void> {
  const text = canonical(envelope(s))
  const { error } = await need().from('scenarios').insert({
    project_id: projectId, client_id: s.id, parent_client_id: s.parentId, label: s.label, note: s.note,
    input_canonical: text, input: JSON.parse(text), input_hash: s.inputHash, engine_version: s.engineVersion, convention_version: s.conventionVersion,
  })
  fail(error, 'Locking scenario')
}

export async function saveTask(projectId: string, taskKey: string, r: TaskRecord): Promise<void> {
  const { error } = await need().from('tracker_tasks').upsert({ project_id: projectId, task_key: taskKey, status: r.status, actual: r.actual, notes: r.notes })
  fail(error, 'Saving task')
}

const safeName = (name: string) => name.replace(/[^\w.\- ]+/g, '_').slice(0, 120)

export async function uploadReceipt(args: { projectId: string; taskKey: string; file: File; sha256: string }): Promise<Receipt> {
  const db = need()
  const user = (await db.auth.getUser()).data.user
  if (!user) throw new Error('Sign in to store receipts in the cloud')
  const id = crypto.randomUUID()
  const storagePath = `${user.id}/${args.projectId}/${id}/${safeName(args.file.name)}`
  const up = await db.storage.from('receipts').upload(storagePath, args.file, { contentType: args.file.type, upsert: false })
  fail(up.error, 'Uploading receipt')
  const row = await db.from('receipts').insert({
    id, project_id: args.projectId, task_key: args.taskKey, storage_path: storagePath, file_name: args.file.name,
    mime_type: args.file.type, size_bytes: args.file.size, sha256: args.sha256,
  }).select('uploaded_at').single()
  fail(row.error, 'Recording receipt')
  return { id, name: args.file.name, type: args.file.type, size: args.file.size, sha256: args.sha256, addedAt: row.data!.uploaded_at as string, storagePath }
}

export async function receiptUrl(storagePath: string): Promise<string> {
  const { data, error } = await need().storage.from('receipts').createSignedUrl(storagePath, 60)
  fail(error, 'Opening receipt')
  return data!.signedUrl
}

/** Receipts are evidence: the record and file are kept; it is only hidden from the task. */
export async function removeReceipt(id: string): Promise<void> {
  const { error } = await need().from('receipts').update({ removed_at: new Date().toISOString() }).eq('id', id)
  fail(error, 'Removing receipt')
}

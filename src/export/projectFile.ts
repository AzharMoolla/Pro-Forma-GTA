// Project file (.plangta.json): one project with its scenarios and tracker, to move between browsers or accounts
// or keep as a backup. Receipt files are not inside (only their names and hashes); attach them again after import.

import { runNode, type Node } from '../engine/portfolio'
import { fromEnvelope, verify, type Snapshot } from '../scenario/snapshot'
import type { ProjectMeta, ProjectState } from '../ui/store'

export const PROJECT_FORMAT = 'plangta.project'
export const PROJECT_FORMAT_VERSION = 1

export interface ProjectFile {
  format: typeof PROJECT_FORMAT
  version: number
  exportedAt: string
  meta: ProjectMeta
  draft: Node
  draftParentId: string | null
  attributes: ProjectState['attributes']
  scenarios: Snapshot[]
  tracker: ProjectState['tracker']
}

export function toProjectFile(p: ProjectState, exportedAt: string): ProjectFile {
  return { format: PROJECT_FORMAT, version: PROJECT_FORMAT_VERSION, exportedAt, meta: p.meta, draft: p.draft, draftParentId: p.draftParentId, attributes: p.attributes, scenarios: p.scenarios, tracker: p.tracker }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Reads and checks a project file. Throws with a plain message when it isn't one, when the model can't run, or when
 * a locked scenario no longer matches its hash (a changed scenario is refused rather than imported as evidence).
 */
export async function parseProjectFile(text: string): Promise<ProjectState> {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { throw new Error('This file is not valid JSON.') }
  if (!isObject(raw) || raw.format !== PROJECT_FORMAT) throw new Error('This is not a PlanGTA project file.')
  if (raw.version !== PROJECT_FORMAT_VERSION) throw new Error(`Project file version ${String(raw.version)} is not supported by this version of the app.`)
  const meta = raw.meta
  if (!isObject(meta) || typeof meta.name !== 'string' || !meta.name.trim() || typeof meta.projectType !== 'string') throw new Error('The project file has no name or type.')
  if (!isObject(raw.draft)) throw new Error('The project file has no model inputs.')
  try { runNode(raw.draft as unknown as Node) } catch (e) { throw new Error(`The model in this file can't run: ${(e as Error).message.split('\n')[0]}`, { cause: e }) }
  if (!isObject(raw.attributes)) throw new Error('The project file has no project variables.')
  const scenarios = Array.isArray(raw.scenarios) ? raw.scenarios as Snapshot[] : []
  for (const s of scenarios) {
    const restored = { ...s, ...(s.schema === 2 ? {} : fromEnvelope(s.input)) }
    if (!(await verify(restored))) throw new Error(`Locked scenario "${s.label}" no longer matches its hash, so the file was not imported.`)
  }
  return {
    meta: {
      name: meta.name.trim(), projectType: meta.projectType,
      reference: typeof meta.reference === 'string' ? meta.reference : '',
      notes: Array.isArray(meta.notes) ? meta.notes.filter((n): n is string => typeof n === 'string') : [],
      coverage: isObject(meta.coverage) ? meta.coverage as Record<string, string> : {},
      templateId: typeof meta.templateId === 'string' ? meta.templateId : '',
    },
    draft: raw.draft as unknown as Node,
    draftParentId: typeof raw.draftParentId === 'string' ? raw.draftParentId : null,
    attributes: raw.attributes as ProjectState['attributes'],
    scenarios: scenarios.map((s) => Object.freeze({ ...s })),
    tracker: isObject(raw.tracker) ? raw.tracker as ProjectState['tracker'] : {},
  }
}

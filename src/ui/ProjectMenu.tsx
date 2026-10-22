import { useState } from 'react'
import { eraseProject, renameProject } from '../cloud/cloud'
import { parseProjectFile, toProjectFile } from '../export/projectFile'
import type { TrackerState } from '../tracker/tracker'
import { Button } from './components'
import { demoProjects } from './data'
import { metaOf, type ProjectState } from './store'
import { useWorkspace } from './workspace'

const field = 'min-h-10 w-full rounded border border-line-strong bg-surface px-2'
const newId = () => `p-${crypto.randomUUID()}`

/** Create, rename, duplicate, delete, export and import projects. Signed in, changes reach the account too. */
export function ProjectMenu() {
  const { state, dispatch, cloud } = useWorkspace()
  const project = state.projects[state.projectId]!
  const [open, setOpen] = useState(false)
  const [template, setTemplate] = useState(demoProjects[0]!.id)
  const [name, setName] = useState('')
  const [rename, setRename] = useState(project.meta.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; tone: 'good' | 'bad' } | null>(null)
  const only = Object.keys(state.projects).length <= 1
  const signedIn = !!cloud.user

  const done = (text: string) => { setMessage({ text, tone: 'good' }); setConfirmDelete(false) }
  const failed = (e: Error) => setMessage({ text: e.message, tone: 'bad' })

  const create = () => {
    const t = demoProjects.find((d) => d.id === template)!
    const fresh: ProjectState = { meta: { ...metaOf(t), name: name.trim() || `New ${t.projectType} project` }, draft: structuredClone(t.input), draftParentId: null, scenarios: [], attributes: structuredClone(t.attributes), tracker: {} as TrackerState }
    dispatch({ type: 'createProject', id: newId(), project: fresh })
    setName('')
    done(`Created "${fresh.meta.name}" from ${t.name.split(':')[0]}. Its starting figures are the template's synthetic values: replace them.`)
  }
  const duplicate = () => {
    const copy: ProjectState = { ...structuredClone({ ...project, scenarios: [] }), meta: { ...project.meta, name: `${project.meta.name} (copy)` }, scenarios: [], draftParentId: null }
    dispatch({ type: 'createProject', id: newId(), project: copy })
    done('Duplicated the draft and its project variables. Locked scenarios and tracker history stay with the original.')
  }
  const saveName = async () => {
    const next = rename.trim()
    if (!next) return
    setBusy(true)
    try {
      if (signedIn) await renameProject(state.projectId, next)
      dispatch({ type: 'renameProject', id: state.projectId, name: next })
      done('Renamed.')
    } catch (e) { failed(e as Error) }
    setBusy(false)
  }
  const remove = async () => {
    setBusy(true)
    try {
      if (signedIn) await eraseProject(state.projectId) // permanent: scenarios, tracker history and receipt files too
      const gone = project.meta.name
      dispatch({ type: 'deleteProject', id: state.projectId })
      done(`Deleted "${gone}".`)
    } catch (e) { failed(e as Error) }
    setBusy(false)
  }
  const exportFile = () => {
    const file = toProjectFile(project, new Date().toISOString())
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }))
    Object.assign(document.createElement('a'), { href: url, download: `${project.meta.name.replace(/[^\w-]+/g, '-').toLowerCase()}.plangta.json` }).click()
    URL.revokeObjectURL(url)
  }
  const importFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('That file is larger than 20 MB.')
      const imported = await parseProjectFile(await file.text())
      dispatch({ type: 'createProject', id: newId(), project: { ...imported, meta: { ...imported.meta, name: `${imported.meta.name} (imported)` } } })
      done(`Imported "${imported.meta.name}" with ${imported.scenarios.length} locked scenario${imported.scenarios.length === 1 ? '' : 's'}. Receipt files are not in project files: attach them again.`)
    } catch (e) { failed(e as Error) }
    setBusy(false)
  }

  return (
    <div className="relative">
      <Button aria-expanded={open} onClick={() => { setOpen((o) => !o); setRename(project.meta.name); setMessage(null); setConfirmDelete(false) }}>Projects</Button>
      {open && (
        <div role="dialog" aria-label="Projects" className="absolute left-0 z-30 mt-2 flex w-96 max-w-[92vw] flex-col gap-4 rounded-lg border border-line-strong bg-surface p-4 text-sm shadow-lg">
          <div className="flex items-center justify-between"><p className="font-medium">Projects</p><Button variant="ghost" onClick={() => setOpen(false)}>Close</Button></div>

          <form className="flex flex-col gap-2" aria-label="New project" onSubmit={(e) => { e.preventDefault(); create() }}>
            <p className="font-medium">New project</p>
            <label className="flex flex-col gap-1">Name<input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 123 Main St rental" /></label>
            <label className="flex flex-col gap-1">Start from
              <select className={field} value={template} onChange={(e) => setTemplate(e.target.value)}>
                {demoProjects.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <Button type="submit" variant="primary">Create project</Button>
          </form>

          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <p className="font-medium">This project: {project.meta.name}</p>
            <form className="flex items-end gap-2" aria-label="Rename project" onSubmit={(e) => { e.preventDefault(); void saveName() }}>
              <label className="flex flex-1 flex-col gap-1">New name<input className={field} value={rename} onChange={(e) => setRename(e.target.value)} /></label>
              <Button type="submit" disabled={busy || !rename.trim() || rename.trim() === project.meta.name}>Rename</Button>
            </form>
            <div className="flex flex-wrap gap-2">
              <Button onClick={duplicate}>Duplicate</Button>
              <Button onClick={exportFile}>Export project file</Button>
              <label className="inline-flex min-h-10 cursor-pointer items-center rounded-md border border-line-strong px-3 font-medium text-ink-soft hover:bg-sunken">
                Import project file
                <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => { void importFile(e.target.files?.[0]); e.target.value = '' }} />
              </label>
            </div>
            {!confirmDelete
              ? <Button className="self-start text-bad" disabled={only} title={only ? 'Keep at least one project' : undefined} onClick={() => setConfirmDelete(true)}>Delete project…</Button>
              : (
                <div className="flex flex-col gap-2 rounded border border-bad p-2">
                  <p>Delete "{project.meta.name}"{signedIn ? ' permanently from your account, with its locked scenarios, tracker history and receipt files' : ' from this browser'}? This can't be undone.</p>
                  <div className="flex gap-2">
                    <Button className="border border-bad text-bad" disabled={busy} onClick={() => void remove()}>Delete "{project.meta.name}"</Button>
                    <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                  </div>
                </div>
              )}
          </div>
          {message && <p role="status" className={message.tone === 'bad' ? 'text-bad' : 'text-good'}>{message.text}</p>}
        </div>
      )}
    </div>
  )
}

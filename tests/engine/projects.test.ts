import { describe, expect, it } from 'vitest'
import { parseProjectFile, toProjectFile } from '../../src/export/projectFile'
import { createSnapshot, lock } from '../../src/scenario/snapshot'
import { initialState, pristineProjects, reducer, type ProjectState } from '../../src/ui/store'
import { tinyProject } from './fixtures'

const fresh = (name: string): ProjectState => ({ ...Object.values(pristineProjects())[0]!, meta: { ...Object.values(pristineProjects())[0]!.meta, name } })

describe('project lifecycle (store)', () => {
  it('create selects the new project; rename trims; delete keeps at least one', () => {
    let s = reducer(initialState(), { type: 'createProject', id: 'p-1', project: fresh('Main St rental') })
    expect(s.projectId).toBe('p-1')
    s = reducer(s, { type: 'renameProject', id: 'p-1', name: '  12 Main St  ' })
    expect(s.projects['p-1']!.meta.name).toBe('12 Main St')
    expect(reducer(s, { type: 'renameProject', id: 'p-1', name: '   ' })).toBe(s) // empty names refused
    s = reducer(s, { type: 'deleteProject', id: 'p-1' })
    expect(s.projects['p-1']).toBeUndefined()
    expect(s.projectId in s.projects).toBe(true)
    for (const id of Object.keys(s.projects).slice(1)) s = reducer(s, { type: 'deleteProject', id })
    const last = Object.keys(s.projects)
    expect(last).toHaveLength(1)
    expect(reducer(s, { type: 'deleteProject', id: last[0]! })).toBe(s) // the last one stays
  })

  it('reset returns a project to its template, not to another demo', () => {
    let s = reducer(initialState(), { type: 'createProject', id: 'p-2', project: { ...fresh('X'), draft: tinyProject() } })
    s = reducer(s, { type: 'resetDraft' })
    expect(s.projects['p-2']!.draft).toEqual(Object.values(pristineProjects())[0]!.draft)
  })

  it('an account seeded from the cloud shows only its own projects', () => {
    const s = reducer(initialState(), { type: 'account', userId: 'u', seed: { cloud: { 'p-9': fresh('Cloud project') } } })
    expect(Object.keys(s.projects)).toEqual(['p-9'])
    expect(s.projectId).toBe('p-9')
  })
})

describe('project files', () => {
  it('round-trips a project with a locked scenario; a tampered scenario is refused', async () => {
    const snapshot = lock(await createSnapshot({ input: tinyProject(), attributes: {}, context: {}, label: 'Base', note: 'n', createdAt: '2026-10-22T00:00:00Z', parentId: null, sequence: 1 }))
    const p: ProjectState = { ...fresh('Round trip'), draft: tinyProject(), scenarios: [snapshot] }
    const text = JSON.stringify(toProjectFile(p, '2026-10-22T00:00:00Z'))
    const back = await parseProjectFile(text)
    expect(back.meta.name).toBe('Round trip')
    expect(back.scenarios).toHaveLength(1)
    const tampered = JSON.parse(text)
    tampered.scenarios[0].input.discountRate = 0.5
    await expect(parseProjectFile(JSON.stringify(tampered))).rejects.toThrow(/no longer matches its hash/)
  })

  it('refuses other files with a plain message', async () => {
    await expect(parseProjectFile('nope')).rejects.toThrow(/not valid JSON/)
    await expect(parseProjectFile('{"format":"other"}')).rejects.toThrow(/not a PlanGTA project file/)
    const bad = { ...toProjectFile(fresh('Bad'), 'x'), draft: { ...tinyProject(), debt: { ...tinyProject().debt, annualRate: -1 } } }
    await expect(parseProjectFile(JSON.stringify(bad))).rejects.toThrow(/can't run/)
  })
})

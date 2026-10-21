import { describe, expect, it } from 'vitest'
import { assertEditable, canonical, createSnapshot, diffInputs, envelope, fromEnvelope, lock, sha256, verify } from '../../src/scenario/snapshot'
import { tinyProject } from './fixtures'

describe('scenario snapshots', () => {
  it('canonical JSON ignores key order and undefined values', () => {
    expect(canonical({ b: 1, a: { d: [1, 2], c: undefined } })).toBe('{"a":{"d":[1,2]},"b":1}')
    expect(canonical({ a: 1, b: 2 })).toBe(canonical({ b: 2, a: 1 }))
  })

  it('sha256 matches the known digest of "abc"', async () => {
    expect(await sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('same input → same hash; any edit → different hash; verify detects mutation', async () => {
    const base = { input: tinyProject(), attributes: { 'site.municipality': 'toronto' }, context: { catalogue: '0.1.0' }, label: 'Base', note: 'test', createdAt: '2026-10-21T00:00:00Z', parentId: null, sequence: 1 }
    const a = await createSnapshot(base)
    const b = await createSnapshot({ ...base, sequence: 2 })
    expect(a.inputHash).toBe(b.inputHash)
    const edited = await createSnapshot({ ...base, input: { ...tinyProject(), discountRate: 0.11 } })
    expect(edited.inputHash).not.toBe(a.inputHash)
    expect(await verify(a)).toBe(true)
    ;(a.input as { discountRate: number }).discountRate = 0.5
    expect(await verify(a)).toBe(false)
  })

  it('locked snapshots refuse edits and are frozen', async () => {
    const s = lock(await createSnapshot({ input: tinyProject(), attributes: { 'site.municipality': 'toronto' }, context: { catalogue: '0.1.0' }, label: 'IC approval', note: '', createdAt: '2026-10-21T00:00:00Z', parentId: null, sequence: 1 }))
    expect(() => assertEditable(s)).toThrow(/locked/)
    expect(Object.isFrozen(s)).toBe(true)
    expect(() => { (s.input as { discountRate: number }).discountRate = 0.5 }).toThrow(TypeError) // nested input is frozen too
    expect(await verify(s)).toBe(true)
  })

  it('the hash covers project variables, data versions and engine version, not just the financial input', async () => {
    const base = { input: tinyProject(), attributes: { 'site.municipality': 'toronto' }, context: { catalogue: '0.1.0' }, label: 'A', note: '', createdAt: 'x', parentId: null, sequence: 1 }
    const a = await createSnapshot(base)
    expect((await createSnapshot({ ...base, attributes: { 'site.municipality': 'oshawa' } })).inputHash).not.toBe(a.inputHash)
    expect((await createSnapshot({ ...base, context: { catalogue: '0.2.0' } })).inputHash).not.toBe(a.inputHash)
    expect(await verify({ ...a, engineVersion: '9.9.9' })).toBe(false)
    expect(await verify({ ...a, attributes: { 'site.municipality': 'oshawa' } })).toBe(false)
  })

  it('round-trips through the stored envelope; schema-1 rows still verify on the bare input', async () => {
    const a = await createSnapshot({ input: tinyProject(), attributes: { x: 1 }, context: { c: '1' }, label: 'A', note: '', createdAt: 'x', parentId: null, sequence: 1 })
    expect(fromEnvelope(JSON.parse(canonical(envelope(a))))).toEqual({ schema: 2, input: a.input, attributes: a.attributes, context: a.context })
    const old = { ...a, ...fromEnvelope(tinyProject()), inputHash: await sha256(canonical(tinyProject())) }
    expect(old.schema).toBe(1)
    expect(await verify(old)).toBe(true)
  })

  it('diffs inputs by path, matching array items by id', () => {
    const a = tinyProject()
    const b = tinyProject({ discountRate: 0.12 })
    b.costLines = [...b.costLines].reverse().map((l) => (l.id === 'land' ? { ...l, driver: { kind: 'lumpSum', amount: 60_000 } } : l))
    expect(diffInputs(a, b)).toEqual([
      { path: 'costLines.land.driver.amount', before: 50_000, after: 60_000 },
      { path: 'discountRate', before: 0.1, after: 0.12 },
    ])
  })
})

import { describe, expect, it } from 'vitest'
import { assertEditable, canonical, createSnapshot, diffInputs, lock, sha256, verify } from '../../src/scenario/snapshot'
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
    const base = { input: tinyProject(), label: 'Base', note: 'test', createdAt: '2026-10-21T00:00:00Z', parentId: null, sequence: 1 }
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
    const s = lock(await createSnapshot({ input: tinyProject(), label: 'IC approval', note: '', createdAt: '2026-10-21T00:00:00Z', parentId: null, sequence: 1 }))
    expect(() => assertEditable(s)).toThrow(/locked/)
    expect(Object.isFrozen(s)).toBe(true)
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

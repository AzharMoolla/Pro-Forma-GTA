import { describe, expect, it } from 'vitest'
import { banner, streetscape, type StreetBuilding, type StreetFeatures } from '../../src/ui/ascii'

const none: StreetFeatures = { transit: null, parks: 0, school: false, community: false, playground: false, greenRoof: false, streetTrees: false, bikes: false, pool: false }
const tower = (id: string, storeys = 30): StreetBuilding => ({ id, kind: 'tower', storeys, podium: 2, retail: true })

describe('ascii streetscape', () => {
  it('is deterministic per seed and varies between seeds', () => {
    const a = streetscape([tower('a'), tower('b')], none, 'project-1').text
    expect(streetscape([tower('a'), tower('b')], none, 'project-1').text).toBe(a)
    const others = ['project-2', 'project-3', 'project-4'].map((s) => streetscape([tower('a'), tower('b')], none, s).text)
    expect(others.some((t) => t !== a)).toBe(true)
  })

  it('grows wider as buildings are added, and every row has the same width', () => {
    const one = streetscape([tower('a')], none, 's')
    const three = streetscape([tower('a'), tower('b'), tower('c')], none, 's')
    expect(three.width).toBeGreaterThan(one.width)
    expect(new Set(three.rows.map((r) => r.length)).size).toBe(1)
  })

  it('taller buildings draw taller, capped so 80 storeys still fits', () => {
    const height = (s: number) => streetscape([tower('a', s)], none, 's').rows.length
    expect(height(40)).toBeGreaterThan(height(10))
    expect(height(80)).toBeLessThanOrEqual(26)
  })

  it('includes the elements the pro forma switches on', () => {
    const t = streetscape([tower('a')], { transit: 'subway', parks: 1, school: true, community: true, playground: true, greenRoof: true, streetTrees: true, bikes: true, pool: true }, 's').text
    for (const bit of ['(TTC)', 'PARK', 'SCHOOL', 'COMMUNITY', '"&', '~~~', 'o-o', '&&&']) expect(t).toContain(bit)
    const bare = streetscape([tower('a')], none, 's').text
    for (const bit of ['(TTC)', 'PARK', 'SCHOOL', 'COMMUNITY']) expect(bare).not.toContain(bit)
  })

  it('draws lots as houses, labels buildings, and uses only ASCII and box drawing', () => {
    const s = streetscape([{ id: 'lots', kind: 'lots', storeys: 2, podium: 0, retail: false, label: '$46.7M' }, { ...tower('b'), label: '$21.7M' }], none, 's')
    expect(s.text).toContain('/__\\')
    expect(s.text).toContain('$46.7M')
    expect(s.text).toContain('$21.7M')
    expect([...s.text].filter((c) => !/[\x20-\x7e\n─-╿]/.test(c))).toEqual([])
  })

  it('banner boxes the title and stats', () => {
    const b = banner('Mock A', [['Homes', '420']])
    expect(b[0]!.startsWith('┌')).toBe(true)
    expect(b.at(-1)!.startsWith('└')).toBe(true)
    expect(new Set(b.map((l) => l.length)).size).toBe(1)
  })
})

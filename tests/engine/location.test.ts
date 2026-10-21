import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cascade, contains, distanceMetres, type Layer, type LayerMeta, type Position } from '../../src/location/cascade'
import registry from '../../data/geo/layers.json'

const layers: Layer[] = (registry.layers as LayerMeta[]).map((meta) => ({ meta, data: JSON.parse(readFileSync(`data/geo/${meta.id}.geo.json`, 'utf8')) }))
const value = (p: Position, variable: string) => cascade(p, layers).derived.find((d) => d.variable === variable)?.value

const square: Position[] = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
const hole: Position[] = [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]

describe('geometry', () => {
  it('point in polygon respects holes and multipolygons', () => {
    expect(contains({ type: 'Polygon', coordinates: [square] }, [1, 1])).toBe(true)
    expect(contains({ type: 'Polygon', coordinates: [square, hole] }, [5, 5])).toBe(false)
    expect(contains({ type: 'Polygon', coordinates: [square] }, [11, 5])).toBe(false)
    expect(contains({ type: 'MultiPolygon', coordinates: [[hole], [[[20, 20], [21, 20], [21, 21], [20, 20]]]] }, [5, 5])).toBe(true)
  })

  it('distance to a line is perpendicular, in metres', () => {
    // a north–south line 0.001° of longitude east of the site at 43.7°N ≈ 80.4 m
    const d = distanceMetres({ type: 'LineString', coordinates: [[-79.399, 43.69], [-79.399, 43.71]] }, [-79.4, 43.7])
    expect(d).toBeGreaterThan(79)
    expect(d).toBeLessThan(82)
    expect(distanceMetres({ type: 'Point', coordinates: [-79.4, 43.701] }, [-79.4, 43.7])).toBeCloseTo(111.1, 0)
  })
})

describe('policy cascade on the real layers', () => {
  const yongeEglinton: Position = [-79.3985, 43.7075]
  const oshawaWaterfront: Position = [-78.8366, 43.8686]

  it('Yonge–Eglinton: Toronto, no region, in an MTSA and a secondary plan, near Line 1', () => {
    expect(value(yongeEglinton, 'site.municipality')).toBe('toronto')
    expect(value(yongeEglinton, 'site.region')).toBe(null)
    expect(value(yongeEglinton, 'site.majorTransitStationArea')).toBe(true)
    expect(value(yongeEglinton, 'site.secondaryPlan')).toMatch(/Yonge-Eglinton/i)
    expect(value(yongeEglinton, 'site.nearTtc60m')).toBe(true)
    expect(value(yongeEglinton, 'site.greenbelt')).toBe(false)
    expect(value(yongeEglinton, 'site.conservationAuthority')).toMatch(/Toronto and Region/)
  })

  it('Oshawa: Durham Region, CLOCA, near the airport; Toronto-only layers say nothing', () => {
    const c = cascade(oshawaWaterfront, layers)
    expect(value(oshawaWaterfront, 'site.municipality')).toBe('oshawa')
    expect(value(oshawaWaterfront, 'site.region')).toBe('DURHAM')
    expect(value(oshawaWaterfront, 'site.conservationAuthority')).toMatch(/Central Lake Ontario/)
    expect(value(oshawaWaterfront, 'site.nearAerodrome')).toBe(true)
    expect(c.layers.find((l) => l.meta.id === 'toronto-mtsa')!.status).toBe('not-covered')
    expect(c.derived.some((d) => d.variable === 'site.majorTransitStationArea')).toBe(false)
  })

  it('the Greenbelt is found in north Durham, and every derived value carries its source and date', () => {
    expect(value([-79.05, 44.0], 'site.greenbelt')).toBe(true) // Oak Ridges Moraine, Uxbridge/Pickering
    for (const d of cascade(yongeEglinton, layers).derived) {
      expect(d.provenance.sourceUrl).toMatch(/^https:\/\//)
      expect(d.provenance.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(d.provenance.status).toBe('to-verify')
    }
  })

  it('layers run federal → area and the registry matches the files', () => {
    const levels = cascade(yongeEglinton, layers).layers.map((l) => l.meta.level)
    expect(levels[0]).toBe('federal')
    expect(levels.at(-1)).toBe('area')
    for (const l of layers) expect(l.data.features.length).toBe(l.meta.featureCount)
  })
})

describe('mock projects agree with the map', () => {
  it('every variable the cascade sets matches the mock (or the mock is a documented override)', async () => {
    const { mockBMeta } = await import('../../data/projects/mock-b-durham-master-plan')
    const mockA = JSON.parse(readFileSync('data/projects/mock-a-toronto-mixed-use.json', 'utf8'))
    for (const attributes of [mockA.attributes, mockBMeta.attributes] as Array<Record<string, unknown>>) {
      const c = cascade([attributes['site.lng'] as number, attributes['site.lat'] as number], layers)
      for (const d of c.derived) expect([d.variable, attributes[d.variable] ?? null]).toEqual([d.variable, d.value])
    }
  })
})

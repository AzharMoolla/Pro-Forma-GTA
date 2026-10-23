// Streetscape stress tests: many buildings with different specs, mixed zoning and airport limits, transit near some
// blocks and not others, every feature the picture can draw. Renders the real SVG and writes it to
// test-results/streetscape/ for visual review (open them from the dev server: /test-results/streetscape/...).
import { mkdirSync, writeFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import mockAJson from '../../data/projects/mock-a-toronto-mixed-use.json'
import { mockB, mockBMeta } from '../../data/projects/mock-b-durham-master-plan'
import type { Attributes } from '../../src/engine/catalogue'
import type { Node } from '../../src/engine/portfolio'
import type { Component, ProjectInput } from '../../src/engine/project'
import { projectsUnder } from '../../src/ui/coverage'
import { StreetscapeSvg, type ArtStyle } from '../../src/ui/Streetscape'
import { controllingLimit, sceneOf, scoped, type Scene } from '../../src/ui/streetscapeScene'
import { GROUND_Y, kitArt, kitLayout } from '../../src/ui/kitStreetscape'
import { tinyProject } from './fixtures'

const rental = tinyProject().components[0]!
const retail: Component = { kind: 'commercial', id: 'retail', use: 'retail', netLeasableSqft: 8_000, rentPerSqftYear: 40, rentGrowth: 0.02, vacancy: 0.05, leaseUpMonths: 6, freeRentMonths: 2, tiPerSqft: 60, leasingCommissionPerSqft: 10, unrecoveredOpexPerSqftYear: 3, exitCapRate: 0.06 }
const commercialUse = (u: 'office' | 'industrial' | 'other'): Component => ({ ...retail, id: u, use: u } as Component)
const lots: Component = { kind: 'landSale', id: 'lots', sales: [{ month: 3, amount: 1_000_000 }] }

const b = (id: string, storeys: number, podium: number, components: Component[], gca = storeys * 9_000): ProjectInput =>
  tinyProject({ id, name: id, components, program: { lotAreaSqft: 20_000, planningGfaSqft: gca, gcaAboveSqft: gca, gcaBelowSqft: 0, storeys, podiumStoreys: podium } })

const plan = (children: Array<[string, ProjectInput[]]>): Node => ({
  id: 'mp', name: 'Stress test', discountRate: 0.1, costEscalation: 0, costLines: [],
  children: children.map(([id, projects], i) => ({ offsetMonths: i * 12, node: { id, name: id, discountRate: 0.1, costEscalation: 0, costLines: [], children: projects.map((p) => ({ offsetMonths: 0, node: p })) } })),
})

// 15 buildings: towers, mid-rises, townhouses, office, industrial, institutional, lots; retail podiums; 1 to 80 storeys
const stress = plan([
  ['phase-1', [b('p1-tower-80', 80, 6, [rental, retail]), b('p1-tower-38', 38, 3, [rental, retail]), b('p1-office', 30, 4, [commercialUse('office'), retail]), b('p1-midrise', 9, 2, [rental, retail]), b('p1-heritage', 12, 3, [rental, retail])]],
  ['phase-2', [b('p2-midrise-14', 14, 0, [rental]), b('p2-town', 3, 0, [rental]), b('p2-tower-25', 25, 4, [rental]), b('p2-school-ish', 3, 0, [commercialUse('other')]), b('p2-tower-41', 41, 5, [rental, retail])]],
  ['phase-3', [b('p3-industrial', 2, 0, [commercialUse('industrial')]), b('p3-lots', 2, 0, [lots]), b('p3-town-1', 1, 0, [rental]), b('p3-tower-30', 30, 3, [rental]), b('p3-midrise-6', 6, 1, [rental, retail])]],
])

const stressAttributes: Attributes = {
  'site.municipality': 'toronto', 'site.frontageRoadClass': 'Major Arterial', 'site.sidewalks': 'Sidewalk on both sides', 'site.nearestCrossingM': 48,
  'site.nearestTransitStopM': 38, 'site.nearestTransitStop': 'Example Station', 'design.vehicleAccessPoints': 2, 'planning.carParkingStalls': 900,
  'planning.parkingLevelsBelowGrade': 3, 'zoning.parkingZone': 'A', 'planning.bikeParking': 2_000, 'planning.loadingSpaces': 6, 'design.stormwaterTank': true,
  'site.highWaterTable': true, 'site.frontageM': 600, 'mp.parksHa': 4, 'mp.schoolSites': 1, 'mp.communityCentre': true, 'design.streetscapeM': 600,
  'mp.arterialM': 400, 'mp.localRoadM': 1_200, 'mp.watermainM': 2_000, 'mp.sanitaryM': 1_800, 'mp.swmPonds': 1, 'zoning.code': 'CR 5.0', 'site.nearAerodrome': true,
  // zoning areas: phase 1 at 20 storeys, phase 2 at 12 with one block in a 40-storey zone, phase 3 none
  'phase-1|zoning.heightLimitStoreys': 20, 'phase-2|zoning.heightLimitStoreys': 12, 'phase-2/p2-tower-41|zoning.heightLimitStoreys': 40,
  // phase 1 sits on a subway; one phase-3 block by a GO station; the rest are not near transit
  'phase-1|site.nearTtc60m': true, 'phase-3/p3-tower-30|mp.transitIntegration': true, 'phase-3/p3-tower-30|site.municipality': 'oshawa',
  // airport: tighter than zoning on one phase-1 tower, the only limit on one phase-3 block
  'phase-1/p1-tower-38|site.aeronauticalLimitM': 45, 'phase-3/p3-midrise-6|site.aeronauticalLimitM': 15,
  // features, spread over the blocks
  'phase-1/p1-tower-80|design.balconies': true, 'phase-1/p1-tower-80|program.pool': true, 'phase-1/p1-tower-80|program.rooftopAmenity': true,
  'phase-1/p1-heritage|site.heritage': true, 'phase-1/p1-midrise|design.greenRoofM2': 400, 'phase-1/p1-midrise|program.childcare': true,
  'phase-2/p2-tower-25|design.solarPv': true, 'phase-2/p2-tower-25|design.balconies': true, 'phase-2/p2-town|program.childcare': true,
  'phase-3/p3-industrial|design.solarPv': true, 'phase-3/p3-tower-30|design.greenRoofM2': 200,
}

const sceneFor = (node: Node, a: Attributes) => sceneOf(projectsUnder(node).map(({ path, project }) => ({ path, project, label: path.at(-1) })), a)
const render = (scene: Scene, style: ArtStyle, title: string) =>
  renderToStaticMarkup(createElement(StreetscapeSvg, { scene, style, title, uid: 's', stats: [['Homes', '1,000'], ['Total cost', '$1B']] }))
const write = (name: string, svg: string) => {
  mkdirSync('test-results/streetscape', { recursive: true })
  writeFileSync(`test-results/streetscape/${name}.svg`, svg.replace('width="100%" height="100%"', 'width="2400"'))
}
const count = (svg: string, needle: string) => svg.split(needle).length - 1

describe('streetscape: 15 buildings, mixed zoning, transit near some blocks', () => {
  const scene = sceneFor(stress, stressAttributes)

  it('scoped variables: building beats phase beats project', () => {
    expect(scoped(stressAttributes, ['phase-2', 'p2-tower-41'], 'zoning.heightLimitStoreys')).toBe(40)
    expect(scoped(stressAttributes, ['phase-2', 'p2-town'], 'zoning.heightLimitStoreys')).toBe(12)
    expect(scoped(stressAttributes, ['phase-3', 'p3-lots'], 'zoning.heightLimitStoreys')).toBeUndefined()
    expect(scoped(stressAttributes, ['phase-3', 'p3-lots'], 'site.frontageRoadClass')).toBe('Major Arterial')
  })

  it('classifies every building and lays them out in order without overlaps', () => {
    expect(scene.buildings.map((x) => x.kind)).toEqual(['tower', 'tower', 'office', 'midrise', 'midrise', 'midrise', 'townhouse', 'tower', 'institutional', 'tower', 'industrial', 'lots', 'townhouse', 'tower', 'midrise'])
    for (let i = 1; i < scene.parts.length; i++) expect(scene.parts[i]!.x).toBeGreaterThanOrEqual(scene.parts[i - 1]!.x + scene.parts[i - 1]!.w)
    expect(scene.W).toBeGreaterThan(sceneFor(plan([['phase-1', [b('a', 10, 0, [rental])]]]), {}).W * 3) // more buildings, wider drawing
  })

  it('stations only where blocks are near transit: one subway entrance before phase 1, one GO station in phase 3', () => {
    expect(scene.parts.filter((p) => p.kind === 'station').map((p) => (p as { transit: string }).transit)).toEqual(['subway', 'go'])
    expect(scene.buildings.filter((x) => x.transit).map((x) => x.id)).toEqual(['p1-tower-80', 'p1-tower-38', 'p1-office', 'p1-midrise', 'p1-heritage', 'p3-tower-30'])
  })

  it('limits differ by zone, so each building gets its own line; the lower of zoning and airport controls', () => {
    expect(scene.uniformLimit).toBeNull()
    const byId = Object.fromEntries(scene.buildings.map((x) => [x.id, x]))
    expect(controllingLimit(byId['p1-tower-38']!)).toBe(15) // airport 45 m ≈ 15 storeys beats zoning 20
    expect(controllingLimit(byId['p2-tower-41']!)).toBe(40) // its own zone
    expect(controllingLimit(byId['p3-midrise-6']!)).toBe(5) // airport only
    expect(controllingLimit(byId['p3-tower-30']!)).toBeNull()
    expect(scene.over.map((x) => x.id)).toEqual(['p1-tower-80', 'p1-tower-38', 'p1-office', 'p2-midrise-14', 'p2-tower-25', 'p2-tower-41', 'p3-midrise-6'])
    expect(scene.notes).toContain('near an aerodrome: aeronautical height limit to check') // blocks near the aerodrome with no limit entered
  })

  for (const style of ['sketch', 'blueprint'] as const) {
    it(`${style}: draws every building, feature and requirement, inside the picture`, () => {
      const svg = render(scene, style, 'Stress test')
      write(`stress-15-${style}`, svg)
      expect(count(svg, 'data-building=')).toBe(15)
      for (const f of ['subway-station', 'go-station', 'storefront', 'balconies', 'pool', 'rooftop-amenity', 'green-roof', 'solar', 'heritage', 'playground', 'curtain-wall', 'portico', 'townhouses', 'industrial', 'houses', 'park', 'school', 'community', 'crosswalk', 'driveway', 'car', 'curb', 'sidewalk', 'over-limit', 'limit-segment', 'air-limit-segment', 'tag', 'disclaimer']) {
        expect(svg, f).toContain(`data-feature="${f}"`)
      }
      expect(count(svg, 'data-feature="tag"')).toBe(scene.tags.length)
      expect(scene.tags.map((t) => t.title)).toEqual(['Street', 'Sidewalks', 'Crossing', 'Transit', 'Parking', 'Bicycle parking', 'Loading and access', 'Servicing', 'Frontage', 'New roads', 'New services'])
      // nothing drawn above the top of the picture, even the 80-storey tower with its roof: kit art is in metres
      // (y up is negative) under one scale, so check the scaled tallest piece and every limit line instead
      const K = kitLayout(scene)
      const tallest = Math.max(...K.placed.map((q) => q.top), ...scene.buildings.map((x) => (x.limitMetres ?? 0) + 2))
      expect(GROUND_Y - (tallest * K.S)).toBeGreaterThanOrEqual(0)
      // The paper deliberately runs past the frame (x, y negative); everything else stays inside
      const overlays = svg.replace(kitArt(scene, style === 'sketch' ? 'watercolour' : 'blueprint', 's', K), '').replace(/<rect x="-[\d.]+" y="-[\d.]+"[^>]*>/g, '')
      const ys = [...overlays.matchAll(/ y="(-?[\d.]+)"/g)].map((m) => Number(m[1]))
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(0)
    })
  }
})

describe('streetscape: real projects and edge cases', () => {
  it('Mock A: one tower over a single zoning line, by the subway', () => {
    const scene = sceneFor(mockAJson.input as Node, mockAJson.attributes as Attributes)
    expect(scene.uniformLimit).toBe(20)
    expect(scene.over.map((x) => x.storeys)).toEqual([38])
    for (const style of ['sketch', 'blueprint'] as const) {
      const svg = render(scene, style, 'Mock A')
      write(`mock-a-${style}`, svg)
      expect(svg).toContain('data-feature="limit-line"')
      expect(svg).toContain('data-feature="subway-station"')
    }
  })

  it('Mock B: a Durham master plan with no mapped limits draws no limit lines', () => {
    const scene = sceneFor(mockB, mockBMeta.attributes as Attributes)
    const svg = render(scene, 'sketch', 'Mock B')
    write('mock-b-sketch', svg)
    expect(svg).not.toContain('limit-line')
    expect(svg).not.toContain('limit-segment')
    expect(count(svg, 'data-building=')).toBe(projectsUnder(mockB).length)
  })

  it('one uniform airport limit draws a single blue line across', () => {
    const scene = sceneFor(b('solo', 30, 3, [rental]), { 'site.aeronauticalLimitM': 60, 'zoning.heightLimitStoreys': 25 })
    expect(scene.uniformAirLimit).toBe(20)
    const svg = render(scene, 'blueprint', 'Solo')
    write('airport-blueprint', svg)
    expect(svg).toContain('data-feature="air-limit-line"')
    expect(svg).toContain('data-feature="limit-line"')
  })
})

describe('streetscape: water and nature context from the map', () => {
  const kinds = (a: Attributes) => sceneOf([{ path: [], project: tinyProject() }], a).parts.map((p) => p.kind)
  it('a waterfront ends at the lake; a regulated ravine otherwise; a floodplain gets a creek; ponds from the plan', () => {
    expect(kinds({})).not.toEqual(expect.arrayContaining(['lake', 'ravine', 'creek', 'pond']))
    expect(kinds({ 'site.waterfront': true, 'site.regulatedArea': true })).toEqual(expect.arrayContaining(['lake']))
    expect(kinds({ 'site.waterfront': true, 'site.regulatedArea': true })).not.toContain('ravine')
    expect(kinds({ 'site.regulatedArea': true })).toContain('ravine')
    expect(kinds({ 'site.floodplain': true, 'mp.swmPonds': 2 })).toEqual(expect.arrayContaining(['creek', 'pond']))
    const svg = render(sceneOf([{ path: [], project: tinyProject() }], { 'site.waterfront': true, 'site.floodplain': true }), 'sketch', 'Water')
    write('water-sketch', svg)
    for (const f of ['lake', 'creek']) expect(svg).toContain(`data-feature="${f}"`)
  })
})

describe('streetscape: field-to-visual rules', () => {
  const one = (a: Attributes) => sceneOf([{ path: [], project: tinyProject() }], a)
  it('nothing extra is drawn when nothing is entered', () => {
    const svg = render(one({}), 'sketch', 'Bare')
    for (const f of ['rail-corridor', 'subway-tunnel', 'bus-stop', 'bike-rack', 'pops', 'garage', 'utility', 'woodland', 'phase-badge']) expect(svg).not.toContain(`data-feature="${f}"`)
  })
  it('each input draws its piece, and the drivers list names the input', () => {
    const a: Attributes = {
      'site.nearRailCorridor': true, 'site.transitInfrastructureBelow': true, 'site.nearestTransitStopM': 120, 'planning.bikeParking': 40,
      'planning.pops': true, 'planning.loadingSpaces': 1, 'design.hydroVault': true, 'site.greenbelt': true,
    }
    const scene = one(a)
    const svg = render(scene, 'blueprint', 'Everything')
    write('fields-blueprint', svg)
    for (const f of ['rail-corridor', 'subway-tunnel', 'bus-stop', 'bike-rack', 'pops', 'garage', 'utility', 'woodland']) expect(svg).toContain(`data-feature="${f}"`)
    const from = scene.drivers.map((d) => d.from).join(' | ')
    for (const label of ['Near a rail corridor', 'Bicycle parking spaces', 'Privately owned publicly accessible space', 'Inside the Greenbelt Area', 'Nearest TTC stop']) expect(from).toContain(label)
  })
  it('a plan of phases badges each building with its own phase', () => {
    const scene = sceneFor(plan([['p1', [b('a', 6, 0, [rental])]], ['p2', [b('b', 6, 0, [rental]), b('c', 6, 0, [rental])]]]), {})
    expect(scene.phases).toBe(2)
    expect(scene.buildings.map((x) => x.phase)).toEqual([1, 2, 2])
    expect(count(render(scene, 'sketch', 'Phases'), 'data-feature="phase-badge"')).toBe(3)
  })
})

describe('streetscape: policy cues and the height bar', () => {
  const one = (a: Attributes) => sceneOf([{ path: [], project: tinyProject() }], a)
  it('no policy entered: only the FSI the program gives, and the legend says the height limit is not set', () => {
    const scene = one({})
    expect(scene.cues.map((c) => c.id)).toEqual(['fsi'])
    const svg = render(scene, 'sketch', 'Bare')
    expect(svg).toContain('data-feature="height-bar"')
    expect(svg).toContain('not set: check the zoning')
    expect(svg).not.toContain('data-feature="height-band"')
  })
  it('each policy is said once, on the piece it concerns or in the ribbon, not also in the notes', () => {
    const a: Attributes = { 'site.heritage': true, 'site.nearRailCorridor': true, 'site.regulatedArea': true, 'zoning.holding': true, 'zoning.fsiLimit': 3, 'planning.inclusionaryZoning': true, 'planning.affordableShare': 0.1, 'site.greenbelt': true, 'zoning.heightLimitStoreys': 12 }
    const scene = one(a)
    const at = Object.fromEntries(scene.cues.map((c) => [c.id.replace(/-.*$/, ''), c.at.kind === 'part' ? c.at.part : c.at.kind]))
    expect(at).toMatchObject({ heritage: 'heritage', rail: 'plan', regulated: 'ravine', holding: 'plan', fsi: 'plan', iz: 'plan', greenbelt: 'greenbelt' })
    expect(scene.cues.find((c) => c.id === 'iz')!.text).toContain('10% affordable')
    expect(scene.notes.join(' ')).not.toMatch(/holding|heritage|regulated|FSI/i)
    const svg = render(scene, 'blueprint', 'Policy')
    write('policy-blueprint', svg)
    expect(count(svg, 'data-feature="cue"')).toBe(scene.cues.length)
    expect(svg).toContain('data-feature="height-band"')
  })
  it('FSI over the limit is a limit cue; under it is information', () => {
    const fsiOf = (gfa: number) => sceneOf([{ path: [], project: { ...tinyProject(), program: { ...tinyProject().program!, planningGfaSqft: gfa, lotAreaSqft: 10_000 } } }], { 'zoning.fsiLimit': 4 }).cues.find((c) => c.id === 'fsi')!
    expect(fsiOf(50_000)).toMatchObject({ text: 'FSI 5.0 of 4', tone: 'limit' })
    expect(fsiOf(30_000)).toMatchObject({ text: 'FSI 3.0 of 4', tone: 'info' })
  })
})

describe('streetscape: varied placement, grounded, nothing stacked', () => {
  const planAttrs: Attributes = { 'mp.parksHa': 2, 'mp.schoolSites': 1, 'mp.communityCentre': true, 'mp.swmPonds': 1, 'site.waterfront': true, 'site.nearestTransitStopM': 120, 'site.transitInfrastructureBelow': true }
  const scene = () => sceneFor(stress, planAttrs)
  it('the same project always draws the same street', () => {
    expect(scene().parts.map((p) => p.kind)).toEqual(scene().parts.map((p) => p.kind))
  })
  it('pieces never overlap, and each station sits just before the building it serves', () => {
    const K = kitLayout(scene())
    for (let i = 1; i < K.placed.length; i++) expect(K.placed[i]!.x).toBeGreaterThanOrEqual(K.placed[i - 1]!.x + K.placed[i - 1]!.w)
    scene().parts.forEach((p, i, all) => { if (p.kind === 'station') expect(all[i + 1]!.kind).toBe('building') })
  })
  it('shared pieces spread over different gaps instead of bunching at the end', () => {
    const kinds = scene().parts.map((p) => p.kind)
    const at = ['park', 'school', 'community', 'pond'].map((k) => kinds.indexOf(k as never))
    expect(new Set(at).size).toBe(4)
    expect(Math.max(...at) - Math.min(...at)).toBeGreaterThan(4) // not four in a row
  })
  it('the street stands on ground with a plain skyline behind it, and the tunnel holds one train', () => {
    const svg = kitArt(scene(), 'watercolour', 's')
    for (const f of ['ground', 'skyline', 'subway-tunnel']) expect(svg).toContain(`data-feature="${f}"`)
    const tunnel = svg.slice(svg.indexOf('data-feature="subway-tunnel"'))
    expect(tunnel.split('Q').length - 1).toBeGreaterThanOrEqual(1) // one lead car with a cab
  })
  it('the bus shelter stands on clear sidewalk, never in front of a building', () => {
    const K = kitLayout(scene())
    const svg = kitArt(scene(), 'watercolour', 's', K)
    const m = /data-feature="bus-stop"><g transform="translate\(([-\d.]+) /.exec(svg)
    expect(m).not.toBeNull()
    const x = Number(m![1]) - K.bleed
    for (const q of K.placed.filter((p) => p.part.kind === 'building')) expect(x + 5.5 <= q.x || x >= q.x + q.w).toBe(true)
  })
})

describe('streetscape: the legend carries everything, the drawing only numbered markers', () => {
  it('every cue, requirement and zoning note is a pill in its group; piece cues share their number with a marker', async () => {
    const { heightOf } = await import('../../src/ui/Streetscape')
    const a: Attributes = { 'site.heritage': true, 'site.regulatedArea': true, 'zoning.holding': true, 'planning.carParkingStalls': 120, 'zoning.code': 'CR 5.0', 'site.frontageRoadClass': 'major arterial' }
    const scene = sceneOf([{ path: [], project: tinyProject() }], a)
    const { legend, markers, H } = heightOf(scene)
    expect(legend.pills.filter((p) => p.kind === 'cue')).toHaveLength(scene.cues.length)
    expect(legend.pills.filter((p) => p.kind === 'tag')).toHaveLength(scene.tags.length)
    expect(legend.groups[0]!.label).toBe('Policy & zoning')
    expect(markers.map((m) => m.n)).toEqual(markers.map((_, i) => i + 1))
    for (const m of markers) expect(legend.pills.find((p) => p.id === m.cueId)!.marker).toBe(m.n)
    // pills never overlap on a row and stay inside the picture, and the picture is tall enough to hold them
    for (const p of legend.pills) {
      expect(p.x + p.w).toBeLessThanOrEqual(heightOf(scene).W - 20 + 0.001)
      expect(p.y + 20).toBeLessThanOrEqual(H)
      for (const q of legend.pills) if (q !== p && q.y === p.y) expect(q.x >= p.x + p.w || q.x + q.w <= p.x).toBe(true)
    }
    const svg = render(scene, 'sketch', 'Legend')
    write('legend-sketch', svg)
    expect(count(svg, 'data-feature="cue-marker"')).toBe(markers.length)
  })
})

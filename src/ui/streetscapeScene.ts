// Streetscape scene: what to draw and where, from the pro forma and its project variables. Pure (no React), so the
// layout, features and limits can be tested with many buildings without a browser.
//
// Variables can be scoped to a phase or building: "phase-1/block-a|zoning.heightLimitStoreys" beats
// "phase-1|zoning.heightLimitStoreys", which beats the project-wide "zoning.heightLimitStoreys". That is how one
// block can sit in a different zoning area, or next to a station, while the rest of a master plan does not.

import type { Attributes } from '../engine/catalogue'
import type { ProjectInput } from '../engine/project'
import { FLOOR_TO_FLOOR_M } from '../location/zoning'

export type Kind = 'tower' | 'midrise' | 'townhouse' | 'office' | 'industrial' | 'institutional' | 'lots'
export type Transit = 'subway' | 'go' | null

export interface Building {
  id: string
  path: string[]
  name: string
  kind: Kind
  storeys: number
  podium: number
  floorplate: number // ft², drives width
  retail: boolean
  label?: string
  // per-building facts (scoped variables, falling back to the project)
  limitStoreys: number | null
  limitMetres: number | null
  /** Aeronautical height limit above ground (Airport Zoning Regulations surface minus site elevation), entered by the user. */
  airLimitStoreys: number | null
  airLimitMetres: number | null
  nearAerodrome: boolean
  transit: Transit
  balconies: boolean
  greenRoof: boolean
  pool: boolean
  rooftopAmenity: boolean
  solar: boolean
  heritage: boolean
  childcare: boolean
}

export interface Street { roadClass: string | null; lanes: number; sidewalkNear: boolean; sidewalkFar: boolean; rowM: number | null; crossingM: number | null; stopM: number | null; accesses: number }
export interface Tag { title: string; text: string }

export type Part =
  | { kind: 'building'; b: Building; x: number; w: number }
  | { kind: 'station'; transit: Exclude<Transit, null>; x: number; w: number }
  | { kind: 'tree' | 'park' | 'school' | 'community' | 'pond' | 'creek' | 'ravine' | 'lake'; x: number; w: number }

type PartSpec = Part extends infer P ? (P extends Part ? Omit<P, 'x'> : never) : never

export interface Scene {
  buildings: Building[]
  parts: Part[]
  W: number
  street: Street
  tags: Tag[]
  notes: string[]
  /** One limit for every building (draw a single line) or per-building segments. */
  uniformLimit: number | null
  uniformAirLimit: number | null
  over: Building[]
}

export const scopedKey = (path: string[], id: string) => (path.length ? `${path.join('/')}|${id}` : id)

/** Most specific value for a variable: the building, then each enclosing phase, then the project. */
export function scoped(a: Attributes, path: string[], id: string): Attributes[string] {
  for (let i = path.length; i > 0; i--) {
    const v = a[`${path.slice(0, i).join('/')}|${id}`]
    if (v !== undefined && v !== null) return v
  }
  return a[id]
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

function kindOf(project: ProjectInput, storeys: number): Kind {
  const kinds = new Set(project.components.map((c) => (c.kind === 'commercial' ? c.use : c.kind)))
  if (kinds.size === 1 && kinds.has('landSale')) return 'lots'
  const residential = kinds.has('rental') || kinds.has('condo')
  if (!residential && kinds.has('industrial')) return 'industrial'
  if (!residential && kinds.has('office')) return 'office'
  if (!residential && kinds.has('other')) return 'institutional'
  return storeys > 14 ? 'tower' : storeys > 4 ? 'midrise' : 'townhouse'
}

export function buildingOf(project: ProjectInput, path: string[], a: Attributes, label?: string): Building {
  const v = (id: string) => scoped(a, path, id)
  const gca = project.program?.gcaAboveSqft ?? 0
  const storeys = Math.max(1, Math.round(project.program?.storeys ?? (gca / 9_000)))
  const kind = kindOf(project, storeys)
  const metres = num(v('zoning.heightLimitM')) || null
  const toronto = v('site.municipality') === 'toronto'
  // A station only where the map says subway (60 m review area) or a Toronto station area: most TTC stops are bus stops
  const subway = v('site.nearTtc60m') === true || (toronto && v('site.majorTransitStationArea') === true)
  const go = v('mp.transitIntegration') === true || (!toronto && v('site.majorTransitStationArea') === true)
  return {
    id: project.id, path, name: project.name, kind,
    storeys: kind === 'lots' ? 2 : storeys,
    podium: kind === 'lots' ? 0 : Math.min(storeys - 1, project.program?.podiumStoreys ?? 0),
    floorplate: gca / storeys,
    retail: project.components.some((c) => c.kind === 'commercial' && c.use === 'retail'),
    label,
    limitStoreys: num(v('zoning.heightLimitStoreys')) || (metres ? Math.floor(metres / FLOOR_TO_FLOOR_M) : null),
    limitMetres: metres,
    airLimitMetres: num(v('site.aeronauticalLimitM')) || null,
    airLimitStoreys: num(v('site.aeronauticalLimitM')) ? Math.floor(num(v('site.aeronauticalLimitM')) / FLOOR_TO_FLOOR_M) : null,
    nearAerodrome: v('site.nearAerodrome') === true || v('site.airportZoning') === true,
    transit: subway ? 'subway' : go ? 'go' : null,
    balconies: v('design.balconies') === true,
    greenRoof: num(v('design.greenRoofM2')) > 0,
    pool: v('program.pool') === true,
    rooftopAmenity: v('program.rooftopAmenity') === true,
    solar: v('design.solarPv') === true,
    heritage: v('site.heritage') === true,
    childcare: v('program.childcare') === true,
  }
}

/** Lanes drawn per road class: an illustration of the class, not a count of the actual street. */
const LANES: Record<string, number> = { local: 2, collector: 2, 'minor arterial': 4, 'major arterial': 4, expressway: 6 }

export function streetOf(a: Attributes): Street {
  const roadClass = typeof a['site.frontageRoadClass'] === 'string' ? a['site.frontageRoadClass'] : null
  const sidewalks = typeof a['site.sidewalks'] === 'string' ? a['site.sidewalks'].toLowerCase() : 'both'
  return {
    roadClass,
    lanes: LANES[(roadClass ?? '').toLowerCase()] ?? 2,
    sidewalkNear: !/no sidewalk/.test(sidewalks),
    sidewalkFar: /both/.test(sidewalks),
    rowM: num(a['site.rowWidthM']) || null,
    crossingM: num(a['site.nearestCrossingM']) || null,
    stopM: num(a['site.nearestTransitStopM']) || null,
    accesses: Math.min(3, num(a['design.vehicleAccessPoints'])),
  }
}

/** Street, traffic, servicing and parking requirements worth listing under the picture. */
export function tagsOf(a: Attributes, s: Street): Tag[] {
  const str = (id: string) => (typeof a[id] === 'string' ? (a[id] as string) : null)
  const n = (id: string) => num(a[id])
  const list = (...xs: Array<string | false | 0 | null>) => xs.filter(Boolean).join(' · ')
  const servicing = list(a['design.stormwaterTank'] === true && 'stormwater tank', a['site.highWaterTable'] === true && 'dewatering', a['site.utilityRelocation'] === true && 'utility relocation', a['design.hydroVault'] === true && 'hydro vault', a['mp.pumpingStation'] === true && 'pumping station')
  const tags: Array<Tag | null> = [
    s.roadClass || s.rowM ? { title: 'Street', text: `${s.roadClass ?? 'class unknown'} · ROW ${s.rowM ? `${s.rowM} m` : 'to check (OP Map 3)'}` } : null,
    str('site.sidewalks') ? { title: 'Sidewalks', text: str('site.sidewalks')! } : null,
    s.crossingM ? { title: 'Crossing', text: `${str('site.crossingType') ?? 'crossing'} · ${s.crossingM} m` } : null,
    s.stopM ? { title: 'Transit', text: `${str('site.nearestTransitStop') ?? 'TTC stop'} · ${s.stopM} m` } : null,
    n('planning.carParkingStalls') || str('zoning.parkingZone')
      ? { title: 'Parking', text: list(n('planning.carParkingStalls') && `${n('planning.carParkingStalls')} stalls`, n('planning.parkingLevelsBelowGrade') && `${n('planning.parkingLevelsBelowGrade')} levels below`, str('zoning.parkingZone') && `zone ${str('zoning.parkingZone')}`, a['site.municipality'] === 'toronto' && 'no res. minimum') }
      : null,
    n('planning.bikeParking') ? { title: 'Bicycle parking', text: `${n('planning.bikeParking')} spaces` } : null,
    n('planning.loadingSpaces') || s.accesses ? { title: 'Loading and access', text: list(n('planning.loadingSpaces') && `${n('planning.loadingSpaces')} loading`, s.accesses && `${s.accesses} driveway${s.accesses === 1 ? '' : 's'}`) } : null,
    servicing ? { title: 'Servicing', text: servicing } : null,
    n('site.frontageM') ? { title: 'Frontage', text: `${n('site.frontageM')} m` } : null,
    n('mp.arterialM') + n('mp.collectorM') + n('mp.localRoadM') ? { title: 'New roads', text: list(n('mp.arterialM') && `${n('mp.arterialM')} m arterial`, n('mp.collectorM') && `${n('mp.collectorM')} m collector`, n('mp.localRoadM') && `${n('mp.localRoadM')} m local`) } : null,
    n('mp.watermainM') + n('mp.sanitaryM') + n('mp.stormM') ? { title: 'New services', text: list(n('mp.watermainM') && `${n('mp.watermainM')} m water`, n('mp.sanitaryM') && `${n('mp.sanitaryM')} m sanitary`, n('mp.stormM') && `${n('mp.stormM')} m storm`, n('mp.swmPonds') && `${n('mp.swmPonds')} SWM ponds`) } : null,
  ]
  return tags.filter((t): t is Tag => t !== null)
}

export function zoningNotes(a: Attributes): string[] {
  const code = a['zoning.code']
  const exception = a['zoning.exception']
  return [
    typeof code === 'string' && `Zone ${code.replace(/\s+/g, ' ')}`,
    num(a['zoning.fsiLimit']) > 0 && `FSI ≤ ${num(a['zoning.fsiLimit'])}`,
    num(a['zoning.lotCoverageMax']) > 0 && `coverage ≤ ${Math.round(num(a['zoning.lotCoverageMax']) * 100)}%`,
    a['zoning.holding'] === true && 'holding (H)',
    typeof exception === 'string' && `exception ${exception}`,
    a['site.heritage'] === true && 'heritage',
    a['site.regulatedArea'] === true && 'conservation regulated',
  ].filter((x): x is string => typeof x === 'string')
}

/** The lower of the zoning and aeronautical limits: whichever is lower controls. */
export const controllingLimit = (b: Building) => {
  const xs = [b.limitStoreys, b.airLimitStoreys].filter((x): x is number => x !== null)
  return xs.length ? Math.min(...xs) : null
}

const GAP = 14
export const widthOf = (b: Building, single: boolean) => {
  if (b.kind === 'lots') return 130
  if (b.kind === 'townhouse') return 96
  if (b.kind === 'industrial') return 170
  const tower = Math.max(48, Math.min(single ? 230 : 140, Math.sqrt(Math.max(1, b.floorplate)) * (single ? 2 : 1.1)))
  return tower + (b.podium ? 26 : 0)
}

/**
 * Lay the buildings along one street. A station sits before each run of buildings served by the same transit;
 * a park after the middle building; school and community centre at the end.
 */
export function sceneOf(projects: Array<{ path: string[]; project: ProjectInput; label?: string }>, a: Attributes): Scene {
  const buildings = projects.map(({ path, project, label }) => buildingOf(project, path, a, label))
  const single = buildings.length === 1
  const trees = num(a['design.streetscapeM']) > 0 || num(a['site.protectedTrees']) > 0
  const park = num(a['mp.parksHa']) > 0 || a['planning.parklandOnSite'] === true
  const parts: Part[] = []
  let x = 30
  const push = (p: PartSpec) => { parts.push({ ...p, x } as Part); x += p.w + GAP }
  buildings.forEach((b, i) => {
    if (b.transit && buildings[i - 1]?.transit !== b.transit) push({ kind: 'station', transit: b.transit, w: 86 })
    push({ kind: 'building', b, w: widthOf(b, single) })
    if (trees || i < buildings.length - 1) push({ kind: 'tree', w: 26 })
    if (park && i === Math.max(0, Math.floor(buildings.length / 2) - 1)) push({ kind: 'park', w: 120 })
  })
  if (num(a['mp.schoolSites']) > 0) push({ kind: 'school', w: 104 })
  if (a['mp.communityCentre'] === true) push({ kind: 'community', w: 124 })
  // Water and nature context at the end of the street, only where the map or the program says so
  if (num(a['mp.swmPonds']) > 0) push({ kind: 'pond', w: 110 })
  if (a['site.floodplain'] === true) push({ kind: 'creek', w: 160 })
  if (a['site.waterfront'] === true || a['mp.shorelineWorks'] === true) push({ kind: 'lake', w: 180 })
  else if (a['site.regulatedArea'] === true) push({ kind: 'ravine', w: 180 })
  const W = Math.max(980, x + 30)
  const street = streetOf(a)
  const uniform = (pick: (b: Building) => number | null) => {
    const set = new Set(buildings.filter((b) => b.kind !== 'lots').map(pick))
    return set.size === 1 ? [...set][0] ?? null : null
  }
  const notes = zoningNotes(a)
  if (buildings.some((b) => b.nearAerodrome && b.airLimitStoreys === null)) notes.push('near an aerodrome: aeronautical height limit to check')
  return {
    buildings, parts, W, street, tags: tagsOf(a, street), notes, uniformLimit: uniform((b) => b.limitStoreys), uniformAirLimit: uniform((b) => b.airLimitStoreys),
    over: buildings.filter((b) => b.kind !== 'lots' && controllingLimit(b) !== null && b.storeys > controllingLimit(b)!),
  }
}

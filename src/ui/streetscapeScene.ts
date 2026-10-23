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
  /** Phase number in a plan of phases (1-based), null for a single building */
  phase: number | null
  /** The program provides bicycle parking: a rack on the sidewalk in front */
  bikeParking: boolean
}

export interface Street {
  roadClass: string | null; lanes: number; sidewalkNear: boolean; sidewalkFar: boolean; rowM: number | null; crossingM: number | null; stopM: number | null; accesses: number
  /** A rail corridor next to the site: track drawn behind the buildings */
  rail: boolean
  /** Subway or transit infrastructure under the frontage: a tunnel section below the street */
  tunnel: boolean
}
export interface Tag { title: string; text: string }

export type Part =
  | { kind: 'building'; b: Building; x: number; w: number }
  | { kind: 'station'; transit: Exclude<Transit, null>; x: number; w: number }
  | { kind: 'tree' | 'park' | 'school' | 'community' | 'pond' | 'creek' | 'ravine' | 'lake' | 'pops' | 'garage' | 'utility' | 'greenbelt'; x: number; w: number }

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
  /** Phases in a plan of phases (0 for a single building or a single phase) */
  phases: number
  /** What is drawn and the input that put it there, for the "what drives this picture" list */
  drivers: Driver[]
  /** Policy cues, drawn on the pieces they concern or in the top ribbon */
  cues: Cue[]
  /** FSI of the buildings drawn (by-law GFA ÷ lot area, the engine's formula), null without both inputs */
  fsi: number | null
}

export interface Driver { drawn: string; from: string }

/**
 * A policy that applies, said where it applies: on the piece it concerns (a building, the rail line, the ravine) or,
 * for the whole site, in the ribbon along the top. Each one is a prompt to confirm, never a ruling.
 */
export interface Cue {
  id: string
  text: string
  /** Hover text: what it means and what to check */
  detail: string
  at: { kind: 'plan' } | { kind: 'part'; part: Part['kind'] } | { kind: 'heritage'; building: string }
  /** 'limit' when it caps or forbids something, 'info' when it adds a study, review or requirement */
  tone: 'limit' | 'info'
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
    phase: null,
    bikeParking: num(v('planning.bikeParking')) > 0,
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
    rail: a['site.nearRailCorridor'] === true,
    tunnel: a['site.transitInfrastructureBelow'] === true,
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
    a['site.existingBuilding'] === true ? { title: 'Existing building', text: list('on site', n('site.existingRentalUnits') && `${n('site.existingRentalUnits')} rental units`) } : null,
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
    num(a['zoning.lotCoverageMax']) > 0 && `coverage ≤ ${Math.round(num(a['zoning.lotCoverageMax']) * 100)}%`,
    typeof exception === 'string' && `exception ${exception}`,
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
  // Phases: the first path segment of each building in a plan of phases, numbered in plan order
  const phaseIds = [...new Set(projects.filter((q) => q.path.length > 1).map((q) => q.path[0]))]
  const phases = phaseIds.length > 1 ? phaseIds.length : 0
  if (phases) buildings.forEach((b, i) => { const k = phaseIds.indexOf(projects[i]?.path[0] ?? ''); b.phase = k < 0 ? null : k + 1 })
  const single = buildings.length === 1
  const trees = num(a['design.streetscapeM']) > 0 || num(a['site.protectedTrees']) > 0 || num(a['design.landscapingM2']) > 0
  const loading = num(a['planning.loadingSpaces']) > 0 || num(a['planning.parkingLevelsBelowGrade']) > 0 || a['mp.sharedParkingStructure'] === true
  const utility = a['design.hydroVault'] === true || a['design.standbyGenerator'] === true || a['mp.districtEnergy'] === true || a['mp.pumpingStation'] === true
  const park = num(a['mp.parksHa']) > 0 || a['planning.parklandOnSite'] === true
  // Layout: each building travels with its station (in front, where it is near transit), its own pieces and a street
  // tree. Shared pieces (park, school, community centre, pond) take different gaps between buildings, and water and
  // woodland sit at one end of the street. The order is seeded by the project, so a project always looks the same and
  // only an input changes it; pieces are laid end to end, so nothing overlaps.
  const rand = seeded(projects.map((q) => q.project.id).join('|'))
  const groups: PartSpec[][] = buildings.map((b, i) => [
    ...(b.transit && buildings[i - 1]?.transit !== b.transit ? [{ kind: 'station', transit: b.transit, w: 86 } as PartSpec] : []),
    { kind: 'building', b, w: widthOf(b, single) },
    // Beside the first building: its public space, its garage or loading door and its utility box
    ...(i === 0 && a['planning.pops'] === true ? [{ kind: 'pops', w: 100 } as PartSpec] : []),
    ...(i === 0 && loading ? [{ kind: 'garage', w: 44 } as PartSpec] : []),
    ...(i === 0 && utility ? [{ kind: 'utility', w: 24 } as PartSpec] : []),
    ...(trees || i < buildings.length - 1 ? [{ kind: 'tree', w: 26 } as PartSpec] : []),
  ])
  const shared: PartSpec[] = [
    ...(park ? [{ kind: 'park', w: 120 } as PartSpec] : []),
    ...(num(a['mp.schoolSites']) > 0 ? [{ kind: 'school', w: 104 } as PartSpec] : []),
    ...(a['mp.communityCentre'] === true ? [{ kind: 'community', w: 124 } as PartSpec] : []),
    ...(num(a['mp.swmPonds']) > 0 ? [{ kind: 'pond', w: 110 } as PartSpec] : []),
  ]
  // Gaps after each building (and at the street's ends), shuffled, so shared pieces spread out rather than bunch up
  const gaps = shuffle(Array.from({ length: groups.length + 1 }, (_, k) => k), rand)
  const into = new Map<number, PartSpec[]>()
  shared.forEach((piece, k) => { const g = gaps[k % gaps.length]!; into.set(g, [...(into.get(g) ?? []), piece]) })
  const edge: PartSpec[] = [
    ...(a['site.floodplain'] === true ? [{ kind: 'creek', w: 160 } as PartSpec] : []),
    ...(a['site.waterfront'] === true || a['mp.shorelineWorks'] === true ? [{ kind: 'lake', w: 180 } as PartSpec] : a['site.regulatedArea'] === true ? [{ kind: 'ravine', w: 180 } as PartSpec] : []),
    ...(a['site.greenbelt'] === true ? [{ kind: 'greenbelt', w: 60 } as PartSpec] : []),
  ]
  const edgeFirst = rand() < 0.5
  const order: PartSpec[] = [
    ...(edgeFirst ? edge : []),
    ...(into.get(0) ?? []),
    ...groups.flatMap((g, k) => [...g, ...(into.get(k + 1) ?? [])]),
    ...(edgeFirst ? [] : edge),
  ]
  const parts: Part[] = []
  let x = 30
  for (const piece of order) { parts.push({ ...piece, x } as Part); x += piece.w + GAP }
  const W = Math.max(980, x + 30)
  const street = streetOf(a)
  const uniform = (pick: (b: Building) => number | null) => {
    const set = new Set(buildings.filter((b) => b.kind !== 'lots').map(pick))
    return set.size === 1 ? [...set][0] ?? null : null
  }
  const notes = zoningNotes(a)
  // FSI of what is drawn: by-law GFA over lot area, only where both are entered (the engine's FSI metric)
  const programs = projects.map((q) => q.project.program).filter((g) => g && g.planningGfaSqft !== null && g.lotAreaSqft)
  const fsi = programs.length ? programs.reduce((t, g) => t + g!.planningGfaSqft!, 0) / programs.reduce((t, g) => t + g!.lotAreaSqft!, 0) : null
  if (buildings.some((b) => b.nearAerodrome && b.airLimitStoreys === null)) notes.push('near an aerodrome: aeronautical height limit to check')
  return {
    buildings, parts, W, street, tags: tagsOf(a, street), notes, uniformLimit: uniform((b) => b.limitStoreys), uniformAirLimit: uniform((b) => b.airLimitStoreys),
    over: buildings.filter((b) => b.kind !== 'lots' && controllingLimit(b) !== null && b.storeys > controllingLimit(b)!),
    phases,
    drivers: driversOf(buildings, parts, street, a, phases),
    cues: cuesOf(buildings, parts, a, fsi),
    fsi,
  }
}

/** Every drawn feature with the input that put it in the picture: the field-to-visual rules, as the user sees them. */
function driversOf(buildings: Building[], parts: Part[], st: Street, a: Attributes, phases: number): Driver[] {
  const any = (f: (b: Building) => boolean) => buildings.some(f)
  const has = (k: Part['kind']) => parts.some((q) => q.kind === k)
  const rows: Array<[boolean, string, string]> = [
    [true, 'Building type, height and width', 'Program: components (rental, condo, office, industrial, lots), storeys and above-grade GCA'],
    [any((b) => b.podium > 0 || b.retail), 'Podium and shopfronts', 'Program: podium storeys, or a retail component'],
    [any((b) => b.retail), 'People, a bench and bins in front of shops', 'A retail component (illustrative street life)'],
    [any((b) => b.limitStoreys !== null), 'Zoning height line', 'Zoning height limit (site map)'],
    [any((b) => b.airLimitStoreys !== null), 'Aeronautical height line', 'Aeronautical height limit'],
    [true, 'Height bar on the left edge', 'The lower of the zoning and aeronautical limits (says "limit not set" when neither is entered)'],
    [true, 'Policy pills (on a piece, or in the top ribbon)', 'Heritage, rail corridor, transit review, transit station area, regulated area, floodplain, Greenbelt, holding (H), FSI, inclusionary zoning, secondary plan or site policy, highway, archaeology'],
    [any((b) => b.transit === 'subway'), 'Subway entrance', 'Within 60 m of TTC infrastructure, or a Toronto major transit station area (site map)'],
    [any((b) => b.transit === 'go'), 'GO platform and train', 'Transit integration, or a major transit station area outside Toronto'],
    [st.rail, 'Rail track behind the buildings', 'Near a rail corridor'],
    [st.tunnel, 'Subway tunnel under the street', 'Subway or transit infrastructure beneath or beside the site'],
    [any((b) => b.heritage), 'Heritage building kept in front', 'Listed or designated heritage property (site map)'],
    [any((b) => b.balconies), 'Balconies', 'Balconies'],
    [any((b) => b.greenRoof), 'Green roof', 'Green roof area'],
    [any((b) => b.solar), 'Solar panels', 'Solar PV'],
    [any((b) => b.rooftopAmenity), 'Roof terrace', 'Rooftop terrace / amenity'],
    [any((b) => b.pool), 'Pool badge', 'Pool'],
    [any((b) => b.childcare), 'Playground', 'Childcare centre'],
    [any((b) => b.bikeParking), 'Bicycle rack', 'Bicycle parking spaces'],
    [phases > 0, `Phase badges (phase n of ${phases})`, 'The plan: buildings grouped in phases'],
    [has('pops'), 'Plaza', 'Privately owned publicly accessible space'],
    [has('garage'), 'Garage and loading door', 'Loading spaces, below-grade parking levels or a shared parking structure'],
    [has('utility'), 'Utility box', 'Electrical vault, standby generator, district energy or a pumping station'],
    [has('tree'), 'Street trees', 'Streetscape frontage, landscaping or protected trees (otherwise only between buildings)'],
    [has('park'), 'Park', 'Parks to build, or parkland dedicated on site'],
    [has('school'), 'Reserved school site', 'School sites reserved'],
    [has('community'), 'Community centre', 'Community centre / library'],
    [has('pond'), 'Stormwater pond', 'Stormwater management ponds'],
    [has('creek'), 'Creek', 'Floodplain / special policy area'],
    [has('lake'), 'Lake edge', 'Waterfront, or shoreline works'],
    [has('ravine'), 'Ravine', 'Conservation-authority regulated area'],
    [has('greenbelt'), 'Woodland', 'Inside the Greenbelt Area'],
    [true, 'Lanes', `Frontage street class (${st.roadClass ?? 'unknown, so 2 lanes are drawn'})`],
    [true, 'Sidewalks', typeof a['site.sidewalks'] === 'string' ? 'Sidewalks on the frontage street (site map)' : 'Sidewalks on the frontage street (unknown, so both are drawn)'],
    [st.crossingM !== null, 'Crosswalk', 'Nearest signalled or marked crossing (site map)'],
    [st.accesses > 0, 'Driveways', 'Vehicle entries/exits'],
    [st.stopM !== null, 'Bus stop and shelter', 'Nearest TTC stop (site map)'],
  ]
  return rows.filter(([on]) => on).map(([, drawn, from]) => ({ drawn, from }))
}

function cuesOf(buildings: Building[], parts: Part[], a: Attributes, fsi: number | null): Cue[] {
  const str = (id: string) => (typeof a[id] === 'string' && (a[id] as string).trim() ? (a[id] as string).trim() : null)
  const has = (k: Part['kind']) => parts.some((q) => q.kind === k)
  const plan = { kind: 'plan' } as const
  const part = (k: Part['kind']) => ({ kind: 'part', part: k }) as const
  const water = (['ravine', 'lake', 'creek'] as const).find(has)
  const authority = str('site.conservationAuthority')
  const fsiLimit = num(a['zoning.fsiLimit']) || null
  const share = num(a['planning.affordableShare'])
  const cues: Array<Cue | false | null | ''> = [
    // On the pieces
    ...buildings.filter((b) => b.heritage).map((b): Cue => ({ id: `heritage-${b.id}`, text: 'Heritage: conserve', detail: 'Listed or designated heritage property: a heritage impact assessment, and the heritage attributes conserved (a heritage permit for designated properties).', at: { kind: 'heritage', building: b.id }, tone: 'limit' })),
    a['site.nearRailCorridor'] === true && { id: 'rail', text: 'Rail: setback, noise study', detail: 'Near a rail corridor: the railway guidelines (FCM/RAC 2013) call for a 30 m setback from a main line (15 m from a branch line), a safety berm or crash wall, and noise and vibration studies. Confirm with the railway.', at: has('station') ? part('station') : plan, tone: 'limit' },
    (a['site.transitInfrastructureBelow'] === true || a['site.nearTtc60m'] === true) && { id: 'transit-review', text: 'Transit review', detail: 'Within 60 m of TTC infrastructure, or over a transit line: the transit agency reviews the design, and its structure and easements can limit foundations and shoring.', at: has('station') && a['site.transitInfrastructureBelow'] !== true ? part('station') : plan, tone: 'info' },
    a['site.majorTransitStationArea'] === true && { id: 'mtsa', text: `${str('site.mtsaType') ?? 'Transit station area'}: minimum density`, detail: 'Major transit station area: the official plan sets a minimum density (people and jobs per hectare) and often limits parking. Check the delineated area and its policies.', at: has('station') ? part('station') : plan, tone: 'info' },
    a['site.regulatedArea'] === true && { id: 'regulated', text: `Regulated${authority ? ` (${authority})` : ''}: permit, setback`, detail: 'Conservation-authority regulated area: a permit is needed to build, and buildings stay back from the hazard (slope, valley or shoreline). Confirm the regulation limit with the authority.', at: water ? part(water) : plan, tone: 'limit' },
    a['site.floodplain'] === true && { id: 'floodplain', text: 'Floodplain: build above the flood line', detail: 'Floodplain or special policy area: development is limited or must be flood-proofed above the regulatory flood. Confirm the flood line with the conservation authority.', at: has('creek') ? part('creek') : plan, tone: 'limit' },
    a['site.greenbelt'] === true && { id: 'greenbelt', text: 'Greenbelt: development limited', detail: 'Inside the Greenbelt Area: urban development is generally not permitted outside existing settlement areas. Check the Greenbelt Plan designation.', at: has('greenbelt') ? part('greenbelt') : plan, tone: 'limit' },
    // The whole site
    a['zoning.holding'] === true && { id: 'holding', text: 'Holding (H): lift first', detail: 'A holding symbol: the zoning permits the use only once the conditions are met and council lifts the (H), often servicing or studies.', at: plan, tone: 'limit' },
    (fsi !== null || fsiLimit !== null) && { id: 'fsi', text: fsi !== null && fsiLimit !== null ? `FSI ${fsi.toFixed(1)} of ${fsiLimit}` : fsi !== null ? `FSI ${fsi.toFixed(1)}` : `FSI ≤ ${fsiLimit}`, detail: 'Floor space index: by-law gross floor area divided by lot area. Above the zoning maximum, a rezoning or minor variance is needed.', at: plan, tone: fsi !== null && fsiLimit !== null && fsi > fsiLimit ? 'limit' : 'info' },
    a['planning.inclusionaryZoning'] === true && { id: 'iz', text: `Inclusionary zoning${share > 0 ? `: ${Math.round(share * 100)}% affordable` : ''}`, detail: 'Inclusionary zoning applies: a share of the floor area or units must be affordable, for a set period. The share and term come from the by-law for the area.', at: plan, tone: 'info' },
    (str('site.secondaryPlan') || str('site.siteSpecificPolicy')) && { id: 'area-policy', text: str('site.secondaryPlan') ? `Secondary plan: ${str('site.secondaryPlan')}` : `Site policy ${str('site.siteSpecificPolicy')}`, detail: 'An area or site-specific policy adds to the official plan here (heights, uses, parks, streets). Read it before the zoning.', at: plan, tone: 'info' },
    a['site.nearHighway'] === true && { id: 'highway', text: 'Highway: MTO permits', detail: 'Near a provincial highway: inside the MTO permit control area (typically 45 m from the highway limit, wider near interchanges), building and access need MTO permits and setbacks.', at: plan, tone: 'limit' },
    a['site.archaeologicalPotential'] === true && { id: 'archaeology', text: 'Archaeological assessment', detail: 'Archaeological potential: a licensed archaeologist assesses the site before soil is disturbed (Stage 1, then 2 to 4 if needed).', at: plan, tone: 'info' },
  ]
  return cues.filter((c): c is Cue => typeof c === 'object' && c !== null)
}

/** A small seeded random generator (mulberry32 over a string hash): the same project always draws the same street. */
export function seeded(key: string): () => number {
  let h = 1779033703 ^ key.length
  for (let i = 0; i < key.length; i++) { h = Math.imul(h ^ key.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
  let t = h >>> 0
  return () => {
    t = (t + 0x6D2B79F5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const shuffle = <T>(xs: T[], rand: () => number): T[] => {
  const out = [...xs]
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j]!, out[i]!] }
  return out
}

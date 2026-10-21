// Policy cascade by location: which open-data layers contain (or are near) a site, and which project
// variables that sets, each with where it came from. Pure: layers come in as data, no IO or clock.

export type Position = [number, number] // [lng, lat], WGS84
export type Geometry =
  | { type: 'Point'; coordinates: Position }
  | { type: 'LineString'; coordinates: Position[] }
  | { type: 'MultiLineString'; coordinates: Position[][] }
  | { type: 'Polygon'; coordinates: Position[][] }
  | { type: 'MultiPolygon'; coordinates: Position[][][] }
export interface Feature { type: 'Feature'; properties: Record<string, unknown>; geometry: Geometry | null }
export interface FeatureCollection { type: 'FeatureCollection'; features: Feature[] }

export type Level = 'federal' | 'provincial' | 'regional' | 'municipal' | 'area'
export const LEVELS: Level[] = ['federal', 'provincial', 'regional', 'municipal', 'area']

export interface LayerRule { variable: string; value?: string | boolean; fromProperty?: string; map?: Record<string, string>; otherwise?: string }
export interface LayerMeta {
  id: string
  label: string
  level: Level
  kind: 'polygon' | 'buffer'
  bufferMetres?: number
  publisher: string
  sourceUrl: string
  licence: string
  dataDate: string
  retrievedAt: string
  featureCount: number
  nameProperty?: string
  coversMunicipality?: string
  sets: LayerRule[]
  caveat: string
}
export interface Layer { meta: LayerMeta; data: FeatureCollection }

export interface Provenance { layerId: string; layer: string; publisher: string; sourceUrl: string; licence: string; dataDate: string; retrievedAt: string; status: 'to-verify' }
export interface Derived { variable: string; value: string | boolean | null; provenance: Provenance }
export interface LayerResult {
  meta: LayerMeta
  status: 'inside' | 'outside' | 'not-covered'
  matches: Array<{ name: string | null; distanceM?: number; properties: Record<string, unknown> }>
}
export interface Cascade { point: Position; layers: LayerResult[]; derived: Derived[] }

// ---------------------------------------------------------------- geometry

/** Ray casting (even–odd) on one ring. Points exactly on an edge may fall either way. */
function inRing([x, y]: Position, ring: Position[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!
    const [xj, yj] = ring[j]!
    if ((yi > y) !== (yj > y) && x < (((xj - xi) * (y - yi)) / (yj - yi)) + xi) inside = !inside
  }
  return inside
}

/** Inside the outer ring and not inside any hole. */
const inPolygon = (p: Position, rings: Position[][]) => rings.length > 0 && inRing(p, rings[0]!) && !rings.slice(1).some((h) => inRing(p, h))

export function contains(g: Geometry, p: Position): boolean {
  if (g.type === 'Polygon') return inPolygon(p, g.coordinates)
  if (g.type === 'MultiPolygon') return g.coordinates.some((poly) => inPolygon(p, poly))
  return false
}

const M_PER_DEG_LAT = 111_132

/** Local equirectangular projection around the site: metres east/north of it. Accurate to well under 1% within 50 km. */
const project = (origin: Position) => {
  const kx = M_PER_DEG_LAT * Math.cos((origin[1] * Math.PI) / 180)
  return ([lng, lat]: Position): [number, number] => [(lng - origin[0]) * kx, (lat - origin[1]) * M_PER_DEG_LAT]
}

function segmentDistance(a: [number, number], b: [number, number]): number {
  // distance from the origin (the site) to segment ab
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = (dx * dx) + (dy * dy)
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -((a[0] * dx) + (a[1] * dy)) / len2))
  return Math.hypot(a[0] + (t * dx), a[1] + (t * dy))
}

function lineDistance(points: Position[], toLocal: (p: Position) => [number, number]): number {
  if (points.length === 1) return Math.hypot(...toLocal(points[0]!))
  let min = Infinity
  for (let i = 1; i < points.length; i++) min = Math.min(min, segmentDistance(toLocal(points[i - 1]!), toLocal(points[i]!)))
  return min
}

/** Metres from the site to the nearest part of a geometry (0 if a polygon contains it). */
export function distanceMetres(g: Geometry, p: Position): number {
  const toLocal = project(p)
  switch (g.type) {
    case 'Point': return Math.hypot(...toLocal(g.coordinates))
    case 'LineString': return lineDistance(g.coordinates, toLocal)
    case 'MultiLineString': return Math.min(...g.coordinates.map((l) => lineDistance(l, toLocal)))
    case 'Polygon': return contains(g, p) ? 0 : Math.min(...g.coordinates.map((r) => lineDistance(r, toLocal)))
    case 'MultiPolygon': return contains(g, p) ? 0 : Math.min(...g.coordinates.flat().map((r) => lineDistance(r, toLocal)))
  }
}

// ---------------------------------------------------------------- cascade

const asName = (v: unknown) => (v === undefined || v === null || v === '' ? null : String(v))

function evaluateLayer(layer: Layer, p: Position, municipality: string | null): LayerResult {
  const { meta } = layer
  if (meta.coversMunicipality && municipality !== meta.coversMunicipality) return { meta, status: 'not-covered', matches: [] }
  const matches: LayerResult['matches'] = []
  for (const f of layer.data.features) {
    if (!f.geometry) continue
    const name = meta.nameProperty ? asName(f.properties[meta.nameProperty]) : null
    if (meta.kind === 'polygon') {
      if (contains(f.geometry, p)) matches.push({ name, properties: f.properties })
    } else {
      const d = distanceMetres(f.geometry, p)
      if (d <= (meta.bufferMetres ?? 0)) matches.push({ name, distanceM: Math.round(d), properties: f.properties })
    }
  }
  matches.sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0))
  return { meta, status: matches.length ? 'inside' : 'outside', matches }
}

function derive(r: LayerResult): Derived[] {
  if (r.status === 'not-covered') return [] // the layer says nothing here; leave the variable to the user
  const { meta } = r
  const provenance: Provenance = { layerId: meta.id, layer: meta.label, publisher: meta.publisher, sourceUrl: meta.sourceUrl, licence: meta.licence, dataDate: meta.dataDate, retrievedAt: meta.retrievedAt, status: 'to-verify' }
  return meta.sets.map((rule): Derived => {
    if (rule.fromProperty) {
      const names = [...new Set(r.matches.map((m) => asName(m.properties[rule.fromProperty!])).filter((n): n is string => n !== null))]
      const raw = names.join(', ')
      const value = rule.map ? (names.length ? rule.map[names[0]!] ?? rule.otherwise ?? null : rule.otherwise ?? null) : raw || rule.otherwise || null
      return { variable: rule.variable, value, provenance }
    }
    const hit = typeof rule.value === 'boolean' ? r.status === 'inside' && rule.value : r.status === 'inside' ? rule.value ?? null : rule.otherwise ?? null
    return { variable: rule.variable, value: hit, provenance }
  })
}

/**
 * Evaluate every layer for a site, from federal down to area overlays. The lower-tier municipality
 * is found first because some layers (Toronto open data) only cover one municipality.
 */
export function cascade(point: Position, layers: Layer[]): Cascade {
  const municipal = layers.find((l) => l.meta.id === 'lower-tier')
  const municipality = municipal ? asName(evaluateLayer(municipal, point, null).matches[0]?.properties.MUNICIPAL_NAME_SHORTFORM) : null
  const results = [...layers]
    .sort((a, b) => LEVELS.indexOf(a.meta.level) - LEVELS.indexOf(b.meta.level))
    .map((l) => evaluateLayer(l, point, municipality))
  return { point, layers: results, derived: results.flatMap(derive) }
}

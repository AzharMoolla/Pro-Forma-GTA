// Fetches open-data policy layers for Toronto + Durham, clips to the pilot area, simplifies, and writes
// data/geo/<id>.geo.json plus data/geo/layers.json (source, licence, retrieval date, what each layer sets).
// Run: npm run geo   (re-run to refresh; commit the diff so every snapshot is dated and reviewable)

import { mkdirSync, writeFileSync } from 'node:fs'
import shp from 'shpjs'

type Position = [number, number]
type Geometry = { type: 'Polygon'; coordinates: Position[][] } | { type: 'MultiPolygon'; coordinates: Position[][][] } | { type: 'LineString'; coordinates: Position[] } | { type: 'MultiLineString'; coordinates: Position[][] }
interface Feature { type: 'Feature'; properties: Record<string, unknown>; geometry: Geometry | null }

const BBOX = { west: -79.66, south: 43.57, east: -78.55, north: 44.45 } // Toronto + Durham Region
const TODAY = new Date().toISOString().slice(0, 10)
const LIO = 'https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA'
const TO = 'https://ckan0.cf.opendata.inter.prod-toronto.ca'
const OGL_ON = 'Open Government Licence – Ontario'
const OGL_TO = 'Open Government Licence – Toronto'

// ---------------------------------------------------------------- geometry helpers (script only)

const round = (p: Position): Position => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5]

/** Douglas–Peucker on a ring or line, tolerance in degrees. */
function simplify(points: Position[], tol: number): Position[] {
  if (points.length < 4) return points.map(round)
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack: Array<[number, number]> = [[0, points.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    const [ax, ay] = points[a]!
    const [bx, by] = points[b]!
    let max = 0
    let idx = -1
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i]!
      const dx = bx - ax
      const dy = by - ay
      const len = (dx * dx) + (dy * dy)
      const t = len ? Math.max(0, Math.min(1, (((px - ax) * dx) + ((py - ay) * dy)) / len)) : 0
      const d = Math.hypot(px - (ax + (t * dx)), py - (ay + (t * dy)))
      if (d > max) { max = d; idx = i }
    }
    if (max > tol && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]) }
  }
  return points.filter((_, i) => keep[i]).map(round)
}

function simplifyGeometry(g: Geometry, tol: number): Geometry {
  switch (g.type) {
    case 'Polygon': return { ...g, coordinates: g.coordinates.map((r) => simplify(r, tol)).filter((r) => r.length >= 4) }
    case 'MultiPolygon': return { ...g, coordinates: g.coordinates.map((p) => p.map((r) => simplify(r, tol)).filter((r) => r.length >= 4)).filter((p) => p.length) }
    case 'LineString': return { ...g, coordinates: simplify(g.coordinates, tol) }
    case 'MultiLineString': return { ...g, coordinates: g.coordinates.map((l) => simplify(l, tol)) }
  }
}

function allPositions(g: Geometry): Position[] {
  switch (g.type) {
    case 'Polygon': return g.coordinates.flat()
    case 'MultiPolygon': return g.coordinates.flat(2)
    case 'LineString': return g.coordinates
    case 'MultiLineString': return g.coordinates.flat()
  }
}

const inBbox = (g: Geometry) => allPositions(g).some(([x, y]) => x >= BBOX.west && x <= BBOX.east && y >= BBOX.south && y <= BBOX.north)

// ---------------------------------------------------------------- sources

async function arcgis(path: string, outFields: string): Promise<Feature[]> {
  const q = new URLSearchParams({
    where: '1=1', geometry: `${BBOX.west},${BBOX.south},${BBOX.east},${BBOX.north}`, geometryType: 'esriGeometryEnvelope', inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects', outFields, outSR: '4326', returnGeometry: 'true', maxAllowableOffset: '0.0004', geometryPrecision: '5', f: 'geojson',
  })
  const res = await fetch(`${LIO}/${path}/query?${q}`)
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return ((await res.json()) as { features: Feature[] }).features
}

async function torontoGeoJson(url: string): Promise<Feature[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return ((await res.json()) as { features: Feature[] }).features
}

async function torontoShapefile(url: string): Promise<Feature[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  const out = (await shp(await res.arrayBuffer())) as { features: Feature[] } | Array<{ features: Feature[] }>
  return Array.isArray(out) ? out.flatMap((c) => c.features) : out.features
}

function pick(props: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(keys.filter((k) => props[k] !== undefined && props[k] !== null).map((k) => [k, props[k]]))
}

// ---------------------------------------------------------------- layers

export interface LayerMeta {
  id: string
  label: string
  level: 'federal' | 'provincial' | 'regional' | 'municipal' | 'area'
  kind: 'polygon' | 'buffer'
  bufferMetres?: number
  publisher: string
  sourceUrl: string
  licence: string
  dataDate: string // the publisher's own currency date, if stated
  retrievedAt: string
  featureCount: number
  nameProperty?: string // property shown as the matched feature's name
  coversMunicipality?: string // layer only covers this lower-tier municipality (MUNICIPAL_NAME_SHORTFORM); elsewhere it is 'not covered', not 'no'
  sets: Array<{ variable: string; value?: string | boolean; fromProperty?: string; map?: Record<string, string>; otherwise?: string }>
  caveat: string
}

const layers: LayerMeta[] = []

async function build(meta: Omit<LayerMeta, 'retrievedAt' | 'featureCount'>, load: () => Promise<Feature[]>, keep: string[], tol: number) {
  process.stdout.write(`${meta.id} … `)
  const features = (await load())
    .filter((f) => f.geometry && inBbox(f.geometry))
    .map((f) => ({ type: 'Feature' as const, properties: pick(f.properties ?? {}, keep), geometry: simplifyGeometry(f.geometry!, tol) }))
  writeFileSync(`data/geo/${meta.id}.geo.json`, JSON.stringify({ type: 'FeatureCollection', features }))
  layers.push({ ...meta, retrievedAt: TODAY, featureCount: features.length })
  console.log(`${features.length} features`)
}

mkdirSync('data/geo', { recursive: true })

await build({
  id: 'upper-tier', label: 'Upper-tier municipality (region)', level: 'regional', kind: 'polygon', publisher: 'Ontario Ministry of Municipal Affairs and Housing (Ontario GeoHub)',
  sourceUrl: `${LIO}/LIO_Open03/MapServer/13`, licence: OGL_ON, dataDate: '2026-03-13', nameProperty: 'MUNICIPAL_NAME_SHORTFORM',
  sets: [{ variable: 'site.region', fromProperty: 'MUNICIPAL_NAME_SHORTFORM' }],
  caveat: 'Single-tier cities (e.g. Toronto) have no upper tier; regional rules then do not apply.',
}, () => arcgis('LIO_Open03/MapServer/13', 'MUNICIPAL_NAME,MUNICIPAL_NAME_SHORTFORM,MUNICIPAL_TYPE,EFFECTIVE_DATETIME'), ['MUNICIPAL_NAME', 'MUNICIPAL_NAME_SHORTFORM', 'MUNICIPAL_TYPE'], 0.0005)

await build({
  id: 'lower-tier', label: 'Lower or single-tier municipality', level: 'municipal', kind: 'polygon', publisher: 'Ontario Ministry of Municipal Affairs and Housing (Ontario GeoHub)',
  sourceUrl: `${LIO}/LIO_Open03/MapServer/14`, licence: OGL_ON, dataDate: '2026-03-13', nameProperty: 'MUNICIPAL_NAME_SHORTFORM',
  sets: [{ variable: 'site.municipality', fromProperty: 'MUNICIPAL_NAME_SHORTFORM', map: { TORONTO: 'toronto', OSHAWA: 'oshawa' }, otherwise: 'other' }, { variable: 'site.municipalityName', fromProperty: 'MUNICIPAL_NAME_SHORTFORM' }],
  caveat: 'Municipal boundaries decide which DC, fee and zoning by-laws apply.',
}, () => arcgis('LIO_Open03/MapServer/14', 'MUNICIPAL_NAME,MUNICIPAL_NAME_SHORTFORM,UPPER_TIER_MUNICIPALITY,MUNICIPAL_TYPE'), ['MUNICIPAL_NAME', 'MUNICIPAL_NAME_SHORTFORM', 'UPPER_TIER_MUNICIPALITY', 'MUNICIPAL_TYPE'], 0.0004)

await build({
  id: 'greenbelt', label: 'Greenbelt Area', level: 'provincial', kind: 'polygon', publisher: 'Ontario Ministry of Municipal Affairs and Housing (Ontario GeoHub)',
  sourceUrl: `${LIO}/LIO_Open06/MapServer/17`, licence: OGL_ON, dataDate: '2025-11-27',
  sets: [{ variable: 'site.greenbelt', value: true }],
  caveat: 'Outer boundary only: Protected Countryside, Oak Ridges Moraine and Niagara Escarpment designations inside it differ.',
}, () => arcgis('LIO_Open06/MapServer/17', 'OGF_ID,EFFECTIVE_DATETIME'), ['OGF_ID'], 0.0004)

await build({
  id: 'conservation-authority', label: 'Conservation authority jurisdiction', level: 'provincial', kind: 'polygon', publisher: 'Ontario Ministry of the Environment, Conservation and Parks (Ontario GeoHub)',
  sourceUrl: `${LIO}/LIO_Open03/MapServer/11`, licence: OGL_ON, dataDate: '2026-10-21', nameProperty: 'COMMON_NAME',
  sets: [{ variable: 'site.conservationAuthority', fromProperty: 'COMMON_NAME' }],
  caveat: 'Jurisdiction only. Whether the site is inside the regulated area (valleys, floodplains, shorelines) needs the authority\'s own regulation mapping.',
}, () => arcgis('LIO_Open03/MapServer/11', 'LEGAL_NAME,COMMON_NAME'), ['LEGAL_NAME', 'COMMON_NAME'], 0.0005)

await build({
  id: 'toronto-mtsa', label: 'Major transit station area (Minister-approved)', level: 'area', kind: 'polygon', publisher: 'City of Toronto Open Data', coversMunicipality: 'TORONTO',
  sourceUrl: `${TO}/dataset/minister-approved-major-transit-station-areas`, licence: OGL_TO, dataDate: '2026-01', nameProperty: 'StationNam',
  sets: [{ variable: 'site.majorTransitStationArea', value: true }, { variable: 'site.mtsaType', fromProperty: 'MTSA_Type' }],
  caveat: 'Toronto only. Inclusionary zoning also needs the IZ market area (not published as open data) and is paused until 2027-07-01.',
}, () => torontoShapefile(`${TO}/dataset/f7128f82-810d-4677-8166-8892f51969d3/resource/2b66ca26-b345-4e62-8568-dcd2cd6c3f91/download/majortransitstationareadelinations_jan2026.shp.zip`), ['StationNam', 'MTSA_Type', 'SASP_No'], 0.00005)

await build({
  id: 'toronto-secondary-plans', label: 'Secondary plan', level: 'area', kind: 'polygon', publisher: 'City of Toronto Open Data', coversMunicipality: 'TORONTO',
  sourceUrl: `${TO}/dataset/secondary-plans`, licence: OGL_TO, dataDate: '2026-03-16', nameProperty: 'SECONDARY_PLAN_NAME',
  sets: [{ variable: 'site.secondaryPlan', fromProperty: 'SECONDARY_PLAN_NAME' }],
  caveat: 'Toronto only. Secondary plan policies override parent Official Plan designations for height, density and uses.',
}, () => torontoGeoJson(`${TO}/dataset/70a544e9-ee83-43a4-b0be-0dc973627ad7/resource/6bfd9ff1-2b6a-4c95-a425-2ea15ae3d846/download/secondary-plans-data-4326.geojson`), ['SECONDARY_PLAN_NAME', 'SECONDARY_PLAN_NUMBER'], 0.00005)

await build({
  id: 'toronto-sasp', label: 'Site and Area Specific Policy (Official Plan)', level: 'area', kind: 'polygon', publisher: 'City of Toronto Open Data', coversMunicipality: 'TORONTO',
  sourceUrl: `${TO}/dataset/site-and-area-specific-policies`, licence: OGL_TO, dataDate: '2026-03-16', nameProperty: 'SASP_NO',
  sets: [{ variable: 'site.siteSpecificPolicy', fromProperty: 'SASP_NO' }],
  caveat: 'Toronto only. Read the policy text: SASPs can add or remove permissions.',
}, () => torontoGeoJson(`${TO}/dataset/d610b767-1523-41ea-84df-b97a172416a9/resource/74dcfac9-d3ea-4a95-b699-8a37e360f3b2/download/site-and-area-specific-policies-data-4326.geojson`), ['SASP_NO'], 0.00005)

await build({
  id: 'ttc-subway', label: 'TTC subway: within 60 m (technical review)', level: 'area', kind: 'buffer', bufferMetres: 60, publisher: 'City of Toronto Open Data (TTC)', coversMunicipality: 'TORONTO',
  sourceUrl: `${TO}/dataset/ttc-subway-shapefiles`, licence: OGL_TO, dataDate: '2019-07-23', nameProperty: 'ROUTE_NAME',
  sets: [{ variable: 'site.nearTtc60m', value: true }],
  caveat: 'Subway centrelines from 2019: Lines 5 and 6 and the Ontario Line are missing, and 60 m is measured from the line, not from structures or entrances.',
}, () => torontoShapefile(`${TO}/dataset/c01c6d71-de1f-493d-91ba-364ce64884ac/resource/7d68bb52-3285-45d7-a248-7748cb47f6ce/download/ttc-subway-shapefile-wgs84.zip`), ['ROUTE_NAME'], 0.00002)

// Aeronautical screen: no AZR geometry is published as open data, so flag sites within 6 NM of an aerodrome.
const aerodromes: Array<[string, number, number]> = [['Toronto Pearson International (CYYZ)', -79.6306, 43.6777], ['Billy Bishop Toronto City (CYTZ)', -79.3962, 43.6275], ['Oshawa Executive (CYOO)', -78.895, 43.9228]]
writeFileSync('data/geo/aerodromes.geo.json', JSON.stringify({ type: 'FeatureCollection', features: aerodromes.map(([name, x, y]) => ({ type: 'Feature', properties: { NAME: name }, geometry: { type: 'Point', coordinates: [x, y] } })) }))
layers.push({
  id: 'aerodromes', label: 'Aerodrome within 6 NM (aeronautical review screen)', level: 'federal', kind: 'buffer', bufferMetres: 11_112, publisher: 'Aerodrome reference points (approximate)',
  sourceUrl: 'https://tc.canada.ca/en/aviation/operating-airports-aerodromes/airport-zoning-regulations', licence: 'Public facts', dataDate: TODAY, retrievedAt: TODAY, featureCount: aerodromes.length, nameProperty: 'NAME',
  sets: [{ variable: 'site.nearAerodrome', value: true }],
  caveat: 'A screen, not the Airport Zoning Regulations: AZR height surfaces are registered regulations without open GIS. Within 6 NM, or taller than about 100 ft near an airport, expect NAV CANADA and Transport Canada filings for the building and cranes.',
})

writeFileSync('data/geo/layers.json', JSON.stringify({
  generatedAt: TODAY,
  bbox: BBOX,
  layers,
  unavailable: [
    { label: 'Inclusionary zoning market areas (Toronto)', level: 'area', why: 'Published as a map on toronto.ca, not as open data. IZ is paused until 2027-07-01.', check: 'https://www.toronto.ca/city-government/planning-development/planning-studies-initiatives/zoning-for-major-transit-station-areas/' },
    { label: 'Conservation authority regulated areas (TRCA, CLOCA)', level: 'provincial', why: 'Regulation limits are kept by each authority.', check: 'https://trca.ca/planning-permits/' },
    { label: 'Airport Zoning Regulation surfaces (Pearson, Billy Bishop, Oshawa)', level: 'federal', why: 'Registered regulations with plan drawings; no open GIS.', check: 'https://tc.canada.ca/en/aviation/operating-airports-aerodromes/airport-zoning-regulations' },
    { label: 'Zoning by-law (Toronto 569-2013, Oshawa 60-94)', level: 'area', why: 'Toronto publishes zoning GIS but it is large and must be read with the by-law text; Oshawa zoning is not published as open data.', check: 'https://open.toronto.ca/dataset/zoning-by-law/' },
    { label: 'Durham Region and Oshawa secondary plans and Official Plan designations', level: 'regional', why: 'Durham ROP layers exist on maps.durham.ca with mixed licensing; Oshawa layers not found as open data.', check: 'https://maps.durham.ca/arcgis/rest/services/Open_Data' },
    { label: 'Heritage districts and listed properties', level: 'area', why: 'Not loaded yet.', check: 'https://www.toronto.ca/city-government/planning-development/heritage-preservation/' },
    { label: 'Area-specific development charges and community improvement plans', level: 'municipal', why: 'Defined in by-law schedules, not open GIS.', check: 'https://www.toronto.ca/city-government/budget-finances/city-finance/development-charges/' },
  ],
}, null, 2) + '\n')
console.log(`Wrote ${layers.length} layers to data/geo/`)

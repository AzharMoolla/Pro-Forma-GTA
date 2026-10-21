// Collect public planning data into source-linked WGS84 GeoJSON; never alters the financial engine.
// node scripts/collect-planning-map.mjs [--only=id,id] [--refresh]
import { mkdir, readFile, writeFile, rename, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { gzipSync, gunzipSync } from 'node:zlib'
import shp from 'shpjs'
import { iter } from 'but-unzip'

const CKAN = 'https://ckan0.cf.opendata.inter.prod-toronto.ca'
const OUT = 'data/planning-map'
const CACHE = 'data/planning-map-cache'
const only = process.argv.find((s) => s.startsWith('--only='))?.slice(7).split(',')
const refresh = process.argv.includes('--refresh')
const hash = (v) => createHash('sha256').update(v).digest('hex')
const attribution = 'Contains information licensed under the Open Government Licence – Toronto.'
await mkdir(OUT, { recursive: true })
await mkdir(CACHE, { recursive: true })
let old = { layers: [] }
try { old = JSON.parse(await readFile(`${OUT}/manifest.json`, 'utf8')) } catch { /* first run */ }
const layers = new Map(old.layers.map((l) => [l.id, l]))
const packages = new Map()

async function bytes(url, vintage = '') {
  const path = `${CACHE}/${hash(url + vintage)}.gz`
  if (!refresh) {
    try {
      const data=gunzipSync(await readFile(path))
      data.sourceRetrievedAt=(await stat(path)).mtime.toISOString()
      return data
    } catch { /* cache miss */ }
  }
  let last
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
      const data = Buffer.from(await res.arrayBuffer())
      await writeFile(path, gzipSync(data))
      data.sourceRetrievedAt=new Date().toISOString()
      return data
    } catch (error) { last = error }
  }
  throw last
}
async function api(action, params, vintage = '') {
  const url = `${CKAN}/api/3/action/${action}?${new URLSearchParams(params)}`
  const raw = await bytes(url, vintage)
  const json = JSON.parse(raw.toString())
  if (!json.success) throw new Error(`${action}: ${JSON.stringify(json.error)}`)
  return { result: json.result, url, sha256: hash(raw), retrievedAt: raw.sourceRetrievedAt }
}
async function pkg(slug) {
  if (!packages.has(slug)) {
    // Metadata is live; only large source responses are cached by publisher vintage.
    const res = await fetch(`${CKAN}/api/3/action/package_show?id=${encodeURIComponent(slug)}`, { signal: AbortSignal.timeout(30000) })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(`Package unavailable: ${slug}`)
    packages.set(slug, json.result)
    await writeFile(`${CACHE}/package-${slug}.json`, JSON.stringify(json.result))
  }
  return packages.get(slug)
}

// Analysis geometry is retained at source precision. No simplification or guessed geocoding.
function positions(v) {
  if (!Array.isArray(v)) throw new Error('coordinates are not arrays')
  return typeof v[0] === 'number' ? [v] : v.flatMap(positions)
}
function bbox(geometry) {
  const ps = positions(geometry.coordinates)
  if (!ps.length) throw new Error('empty geometry')
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity
  for (const [x, y] of ps) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < -81 || x > -77 || y < 42 || y > 46) throw new Error('coordinates outside regional bounds; inspect CRS')
    west = Math.min(west, x); south = Math.min(south, y); east = Math.max(east, x); north = Math.max(north, y)
  }
  return [west, south, east, north]
}
function feature(row) {
  let g = row.geometry ?? row.GEOMETRY
  if (typeof g === 'string') g = JSON.parse(g)
  if (!g) {
    const x = Number(row.Long ?? row.LONGITUDE ?? row.LONGITUDE_WGS84)
    const y = Number(row.Lat ?? row.LATITUDE ?? row.LATITUDE_WGS84)
    if (x && y) g = { type: 'Point', coordinates: [x, y] }
  }
  if (!g) return null
  if (g.type === 'MultiPoint' && g.coordinates.length === 1) g = { type: 'Point', coordinates: g.coordinates[0] }
  if (!['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'].includes(g.type)) throw new Error(`unsupported geometry ${g.type}`)
  return { type: 'Feature', geometry: g, bbox: bbox(g), properties: Object.fromEntries(Object.entries(row).filter(([k]) => !['geometry', 'GEOMETRY'].includes(k) && !/^CONTACT_/i.test(k))) }
}
async function records(resource, p, fields) {
  const rows = [], pages = [], ids = new Set()
  let total, fieldSchema
  for (let offset = 0; ; offset += 5000) {
    const params = { resource_id: resource.id, limit: '5000', offset: String(offset), sort: '_id asc' }
    if (fields) params.fields = fields.join(',')
    const r = await api('datastore_search', params, p.metadata_modified)
    total ??= r.result.total
    if (r.result.total !== total) throw new Error('source count changed during collection; retry')
    fieldSchema ??= r.result.fields
    pages.push({ url: r.url, sha256: r.sha256, count: r.result.records.length, retrievedAt:r.retrievedAt })
    for (const row of r.result.records) {
      if (ids.has(row._id)) throw new Error(`duplicate source row ${row._id}`)
      ids.add(row._id)
      rows.push(row)
    }
    if (rows.length >= total) break
    if (r.result.records.length !== 5000) throw new Error(`unexpected truncated page at ${offset}`)
    if (offset > 1500000) throw new Error('collection cap exceeded')
  }
  if (rows.length !== total) throw new Error(`count mismatch ${rows.length}/${total}`)
  return { rows, total, pages, fieldSchema }
}

const configurations = [
  ['addresses', 'Toronto municipal addresses', 'Site', 'address-points-municipal-toronto-one-address-repository', 'Address Points', 'addresses', 'Address points, not legal parcels or verified building entrances.'],
  ['wards', 'Toronto wards', 'Civic', 'city-wards', 'City Wards Data'],
  ['neighbourhoods', 'Toronto neighbourhoods', 'Civic', 'neighbourhoods', 'Neighbourhoods'],
  ['councillors', 'Wards and elected councillors', 'Civic', 'wards-and-elected-councillors', 'Ward and Elected Councillor', null, 'Check officeholder term and publication dates.'],
  ['zoning', 'Toronto zoning areas', 'Zoning', 'zoning-by-law', 'Zoning Area', null, '569-2013 coverage only; legacy by-laws, exceptions, amendments and in-force status must be checked.'],
  ['zoning-height', 'Zoning height overlay', 'Zoning', 'zoning-by-law', 'Zoning Height Overlay'],
  ['zoning-setback', 'Zoning building setback overlay', 'Zoning', 'zoning-by-law', 'Zoning Building Setback Overlay'],
  ['zoning-lot-coverage', 'Zoning lot coverage overlay', 'Zoning', 'zoning-by-law', 'Zoning Lot Coverage Overlay'],
  ['zoning-parking', 'Parking zone overlay', 'Zoning', 'zoning-by-law', 'Parking Zone Overlay'],
  ['zoning-policy-area', 'Zoning policy area overlay', 'Zoning', 'zoning-by-law', 'Zoning Policy Area Overlay'],
  ['zoning-policy-road', 'Zoning policy road overlay', 'Zoning', 'zoning-by-law', 'Zoning Policy Road Overlay'],
  ['zoning-retail', 'Priority retail street overlay', 'Zoning', 'zoning-by-law', 'Zoning Priority Retail Street Overlay'],
  ['secondary-plans', 'Secondary plans', 'Policy', 'secondary-plans', null],
  ['sasp', 'Site and area specific policies', 'Policy', 'site-and-area-specific-policies', null],
  ['mtsa', 'Minister-approved transit station areas', 'Policy', 'minister-approved-major-transit-station-areas', 'Major Transit Station Area Delineations', 'shp', 'MTSA/PMTSA boundaries do not independently establish inclusionary zoning applicability.'],
  ['parks', 'Parks', 'Amenities', 'parks', 'parks-wgs84', 'shp', 'Polygon boundary is not a confirmed public entrance.'],
  ['recreation', 'Parks and recreation facilities', 'Amenities', 'parks-and-recreation-facilities', 'Parks and Recreation Facilities'],
  ['libraries', 'Library branches', 'Amenities', 'library-branch-general-information', 'tpl-branch-general-information', null, 'Non-physical service records may appear; inspect PhysicalBranch.'],
  ['schools', 'Schools – all types', 'Amenities', 'school-locations-all-types', 'School locations-all types data', null, 'Location does not establish catchment, enrolment eligibility or spare capacity.'],
  ['childcare', 'Licensed child-care centres', 'Amenities', 'licensed-child-care-centres', 'Child care centres', null, 'Location/licensed capacity does not establish available spaces.'],
  ['heritage', 'Heritage register', 'Heritage', 'heritage-register', 'Heritage Register Data', 'shp', 'Retain designation/listing status and check recent changes.'],
  ['heritage-districts', 'Heritage conservation districts', 'Heritage', 'heritage-conservation-districts', 'Heritage Conservation Districts Data(2022)', 'shp', 'Publisher resource is labelled 2022; currency needs review.'],
  ['natural-heritage', 'Natural heritage system', 'Environment', 'natural-heritage-system', 'natural-heritage-area-wgs84', 'shp', 'Not a conservation-authority regulated-area layer.'],
  ['ravines', 'Ravine and natural-feature protection', 'Environment', 'ravine-natural-feature-protection-area', 'ravine-natural-feature-protection-area-wgs84', 'shp'],
  ['esa', 'Environmentally significant areas', 'Environment', 'environmentally-significant-areas', 'Environmentally Significant Areas'],
  ['walking', 'Pedestrian network', 'Transport', 'pedestrian-network', 'Pedestrian Network Data', null, 'Collected network segments; route connectivity/accessibility not yet validated.'],
  ['ttc-stops', 'TTC scheduled stops', 'Transport', 'ttc-routes-and-schedules', 'TTC Routes and Schedules Data', 'gtfs', 'Schedule stops do not prove service operation, accessible entrance or policy eligibility.'],
  ['applications', 'Development applications', 'Development activity', 'development-applications', 'Development Applications', 'applications', 'Application records, not unique development projects; do not sum proposed units across applications.'],
  ['pipeline', 'Development pipeline projects', 'Development activity', 'development-pipeline', 'Development Pipeline', 'pipeline', 'Source has no geometry; exact municipal address joins only. Unmatched records remain unmapped.'],
  ['coa-active', 'Committee of Adjustment – active', 'Development activity', 'committee-of-adjustment-applications', 'Active Applications', 'coa', 'Source has no geometry; exact municipal address joins only.'],
]

function csv(text) {
  const rows = []; let row = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted }
    else if (!quoted && c === ',') { row.push(cell); cell = '' }
    else if (!quoted && c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row) }
  const header = rows.shift()
  return rows.filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(header.map((h, i) => [h.replace(/^\uFEFF/, ''), r[i] ?? ''])))
}
const key = (s) => s.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
let addressIndex
async function addresses() {
  if (!addressIndex) {
    const stored = JSON.parse(await readFile(`${OUT}/addresses.index.json`, 'utf8'))
    addressIndex = new Map()
    for (const a of stored.rows) {
      const k = key(a[1])
      const existing = addressIndex.get(k)
      if (!existing || (existing[4] !== 'L' && a[4] === 'L')) addressIndex.set(k, a)
    }
  }
  return addressIndex
}
async function collect(c) {
  const [id, label, group, slug, resourceName, mode, caveat = 'Screening data; check source dates and operative policy documents.'] = c
  const p = await pkg(slug)
  let resource = p.resources.find((r) => r.name === resourceName)
  if (!resourceName) resource = p.resources.find((r) => r.url.includes('/datastore/dump/')) ?? p.resources.find((r) => /4326.*geojson/i.test(r.url))
  if (!resource) throw new Error(`Resource not found for ${id}`)
  const base = { id, label, group, publisher: p.organization?.title ?? 'City of Toronto', packageId: p.id, package: slug,
    catalogueUrl: `https://open.toronto.ca/dataset/${slug}/`, resourceId: resource.id, resourceUrl: resource.url,
    resourceName: resource.name, refreshRate: p.refresh_rate ?? null, metadataModified: p.metadata_modified,
    sourceModifiedAt: resource.last_modified ?? null, retrievedAt: new Date().toISOString(),
    licence: { name: 'Open Government Licence – Toronto', url: 'https://open.toronto.ca/open-data-licence/',
      evidence: `https://open.toronto.ca/dataset/${slug}/`, metadataLicenceId: p.license_id ?? null, attribution },
    crs: 'EPSG:4326', caveat, reviewStatus: 'downloaded-and-structurally-validated; legal and independent spatial review pending',
    publisherNotes: p.notes, publisherLimitations: p.limitations ?? null }
  let features = [], sourceCount, raws = [], fields, exclusions = []
  if (mode === 'shp' || mode === 'gtfs') {
    const raw = await bytes(resource.url, resource.last_modified ?? p.metadata_modified)
    raws.push({ url: resource.url, sha256: hash(raw), bytes: raw.length, retrievedAt:raw.sourceRetrievedAt })
    if (mode === 'shp') {
      const parsed = await shp(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength))
      const collections = Array.isArray(parsed) ? parsed : [parsed]
      const source = collections.flatMap((s) => s.features)
      sourceCount = source.length
      for (const [i, f] of source.entries()) {
        try { features.push({ ...f, id: f.id ?? i, bbox: bbox(f.geometry) }) }
        catch (error) { exclusions.push({ sourceRow: i, reason: String(error) }) }
      }
    } else {
      const stops = [...iter(raw)].find((f) => /(^|\/)stops\.txt$/i.test(f.filename))
      if (!stops) throw new Error('GTFS stops.txt missing')
      const rows = csv(Buffer.from(await stops.read()).toString())
      sourceCount = rows.length
      for (const r of rows) {
        try { const f = feature({ ...r, geometry: { type: 'Point', coordinates: [Number(r.stop_lon), Number(r.stop_lat)] } }); features.push(f) }
        catch (error) { exclusions.push({ sourceRow: r.stop_id, reason: String(error) }) }
      }
    }
  } else {
    const addressFields = ['_id', 'ADDRESS_POINT_ID', 'ADDRESS_FULL', 'ADDRESS_CLASS', 'WARD', 'geometry']
    const data = await records(resource, p, mode === 'addresses' ? addressFields : undefined)
    sourceCount = data.total; raws = data.pages; fields = data.fieldSchema
    if (mode === 'addresses') {
      const compact = []
      for (const r of data.rows) {
        try {
          const f = feature(r)
          if (!f || f.geometry.type !== 'Point') throw new Error('missing point')
          compact.push([r.ADDRESS_POINT_ID, r.ADDRESS_FULL, ...f.geometry.coordinates, r.ADDRESS_CLASS, r.WARD])
        } catch (error) { exclusions.push({ sourceRow: r._id, reason: String(error) }) }
      }
      const body = JSON.stringify({ fields: ['addressPointId', 'address', 'longitude', 'latitude', 'addressClass', 'ward'], rows: compact })
      await atomic(`${OUT}/${id}.index.json`, body)
      return { ...base, preparedAt:base.retrievedAt, retrievedAt:raws.map(r=>r.retrievedAt).sort().at(-1), status: 'ready', file: `${id}.index.json`, format: 'compact-address-index', sourceCount,
        featureCount: compact.length, excludedCount: exclusions.length, exclusions, fields, sourceResponses: raws,
        normalizedSha256: hash(body), bytes: Buffer.byteLength(body) }
    }
    const index = ['applications', 'pipeline', 'coa'].includes(mode) ? await addresses() : null
    for (const r of data.rows) {
      try {
        let f = feature(r)
        if (!f && index) {
          const address = mode === 'pipeline' ? r.Address : [r.STREET_NUM, r.STREET_NAME, r.STREET_TYPE, r.STREET_DIRECTION].filter(Boolean).join(' ')
          const match = index.get(key(address ?? ''))
          if (match) f = feature({ ...r, geometry: { type: 'Point', coordinates: [match[2], match[3]] },
            _locationMethod: 'exact-normalized-municipal-address-match', _addressPointId: match[0], _matchedAddress: match[1] })
        }
        if (!f) throw new Error('no geometry or exact address match; not guessed from projected X/Y')
        features.push(f)
      } catch (error) { exclusions.push({ sourceRow: r._id, reason: String(error) }) }
    }
  }
  const body = JSON.stringify({ type: 'FeatureCollection', features })
  await atomic(`${OUT}/${id}.geo.json`, body)
  await atomic(`${OUT}/${id}.unmapped.json`, JSON.stringify(exclusions, null, 2))
  return { ...base, preparedAt:base.retrievedAt, retrievedAt:raws.map(r=>r.retrievedAt).sort().at(-1), status: 'ready', file: `${id}.geo.json`, format: 'GeoJSON', sourceCount, featureCount: features.length,
    excludedCount: exclusions.length, exclusionFile: `${id}.unmapped.json`, fields: fields ?? null,
    sourceResponses: raws, normalizedSha256: hash(body), bytes: Buffer.byteLength(body), geometryTypes: [...new Set(features.map((f) => f.geometry.type))] }
}
async function atomic(path, body) {
  await writeFile(`${path}.tmp`, body)
  await rename(`${path}.tmp`, path)
}
async function manifest() {
  await atomic(`${OUT}/manifest.json`, JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(),
    scope: 'Toronto first; structurally validated source data for local planning-map preview',
    notes: ['Geometry is unsimplified; classification is preliminary screening, not a zoning opinion.',
      'Rows without validated geometry or an exact municipal address match are recorded as exclusions, never assigned guessed coordinates.',
      'Original records are cached locally by publisher vintage; no recurring refresh has been configured.'], layers: [...layers.values()] }, null, 2))
}
for (const c of configurations) {
  if (only && !only.includes(c[0])) continue
  process.stdout.write(`${c[0]} … `)
  try {
    const layer = await collect(c)
    layers.set(c[0], layer)
    console.log(`${layer.featureCount}/${layer.sourceCount} mapped; ${layer.excludedCount} excluded`)
  } catch (error) {
    const previous = layers.get(c[0])
    layers.set(c[0], previous ? { ...previous, lastAttemptError: String(error), lastAttemptAt: new Date().toISOString() }
      : { id: c[0], label: c[1], group: c[2], status: 'failed', error: String(error) })
    console.log(`FAILED: ${String(error)}`)
  }
  await manifest()
}
console.log(`Manifest: ${OUT}/manifest.json`)

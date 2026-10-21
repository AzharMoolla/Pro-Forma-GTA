// Research inventory only. Fetches public catalogue metadata, not policy conclusions or customer data.
// Run: node scripts/research-location-sources.mjs [--seed]
import { mkdir, writeFile } from 'node:fs/promises'

const base = 'https://ckan0.cf.opendata.inter.prod-toronto.ca'
const searches = [
  ['address', 'address'], ['zoning', 'zoning'], ['official-plan', 'official plan'],
  ['wards', 'wards'], ['neighbourhoods', 'neighbourhoods'], ['council', 'council members'],
  ['transit-station-areas', 'major transit station'], ['transit-stops', 'ttc routes schedules'],
  ['walking-network', 'pedestrian network'], ['parks', 'parks'], ['libraries', 'library branch'],
  ['schools', 'schools'], ['child-care', 'child care centres'],
  ['heritage', 'heritage'], ['development-applications', 'development applications'],
]

const results = await Promise.all(searches.map(async ([topic, query]) => {
  const url = `${base}/api/3/action/package_search?${new URLSearchParams({ q: query, rows: '6' })}`
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const body = await response.json()
    if (!body.success) throw new Error('CKAN returned success=false')
    return {
      topic, query, requestUrl: url, status: 'catalogue-metadata-retrieved', totalMatches: body.result.count,
      candidates: body.result.results.map((p) => ({
        id: p.id, name: p.name, title: p.title, catalogueUrl: `https://open.toronto.ca/dataset/${p.name}/`,
        metadataModified: p.metadata_modified, licenseId: p.license_id ?? null,
        licenseTitle: p.license_title ?? null, licenseUrl: p.license_url ?? null,
        organization: p.organization?.title ?? null, notes: p.notes ?? null,
        resources: (p.resources ?? []).map((r) => ({ id: r.id, name: r.name, format: r.format,
          url: r.url, lastModified: r.last_modified ?? null, sizeBytes: r.size ?? null })),
      })),
    }
  } catch (error) {
    return { topic, query, requestUrl: url, status: 'failed', error: String(error), candidates: [] }
  }
}))

const inventory = {
  schemaVersion: 1, retrievedAt: new Date().toISOString(), publisher: 'City of Toronto Open Data',
  purpose: 'Candidate source discovery for standalone address-based planning explorer',
  limitations: [
    'Search results are candidates; relevance, resource contents, completeness, CRS, licence and legal currency require separate review.',
    'Metadata modification dates are not legal effective dates or guarantees of geometry freshness.',
    'Default mode retrieves metadata only; --seed separately retrieves bounded research geometry/schema records outside the application layers.',
    'Missing licence metadata means licence verification is outstanding; do not infer redistribution permission.',
    'No customer address or project data is sent; only generic catalogue search terms.',
  ],
  results,
}
await mkdir('data/research', { recursive: true })
await writeFile('data/research/toronto-location-source-candidates.json', `${JSON.stringify(inventory, null, 2)}\n`)
for (const r of results) console.log(`${r.topic}: ${r.status}; ${r.candidates.map((c) => c.name).join(', ')}`)

// Optional bounded research seeds. Kept outside data/geo so they cannot masquerade as reviewed app layers.
if (process.argv.includes('--seed')) {
  const seeds = [
    ['city-wards', '7672dac5-b383-4d7c-90ec-291dc69d37bf', 500],
    ['neighbourhoods', '5e6095fc-1bef-4776-887c-28d37f722c51', 500],
    ['wards-and-elected-councillors', 'c76c2711-9e1e-4da4-8245-9ce3bb089a4b', 500],
    ['address-schema-sample', '0b3756af-9caf-4f0f-ac28-9c6617adede4', 1],
    ['zoning-schema-sample', '76a2620f-a6b4-495d-8e41-c0ede1f8a928', 1],
  ]
  await mkdir('data/research/location-seeds', { recursive: true })
  for (const [name, resourceId, limit] of seeds) {
    const requestUrl = `${base}/api/3/action/datastore_search?${new URLSearchParams({ resource_id: resourceId, limit: String(limit) })}`
    const response = await fetch(requestUrl, { signal: AbortSignal.timeout(30000) })
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`)
    const body = await response.json()
    if (!body.success) throw new Error(`${name}: CKAN returned success=false`)
    const records = body.result.records
    const geometries = records.map((r) => typeof r.geometry === 'string' ? JSON.parse(r.geometry) : r.geometry)
    const invalid = geometries.filter((g) => !g || !['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'].includes(g.type))
    if (invalid.length) throw new Error(`${name}: invalid or missing geometry`)
    const points = (v) => Array.isArray(v) && typeof v[0] === 'number' ? [v] : v.flatMap(points)
    const positions = geometries.flatMap((g) => points(g.coordinates))
    if (positions.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y) || x < -80 || x > -78 || y < 43 || y > 45)) {
      throw new Error(`${name}: coordinates outside Toronto-region sanity bounds; check CRS`)
    }
    const complete = records.length === body.result.total
    const metadata = { retrievedAt: new Date().toISOString(), requestUrl, resourceId,
      publisher: 'City of Toronto Open Data', reportedTotal: body.result.total, retrievedCount: records.length,
      completeResourceRetrieved: complete, geometryChecked: 'parse, type, finite coordinates and Toronto-region bounds only',
      reviewStatus: 'research-only; legal currency, licence and independent spatial accuracy review pending', fields: body.result.fields }
    await writeFile(`data/research/location-seeds/${name}.json`, `${JSON.stringify({ ...metadata, records }, null, 2)}\n`)
    if (complete) {
      const features = records.map((r, i) => ({ type: 'Feature', geometry: geometries[i],
        properties: Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'geometry')) }))
      await writeFile(`data/research/location-seeds/${name}.geo.json`, `${JSON.stringify({ type: 'FeatureCollection', researchMetadata: metadata, features })}\n`)
    }
    console.log(`${name}: ${records.length}/${body.result.total} rows; ${complete ? 'complete resource' : 'sample only'}; geometry sanity checks pass`)
  }
}

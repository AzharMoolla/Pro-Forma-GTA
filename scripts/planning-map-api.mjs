// Planning-map request handler: serves the map page, Leaflet, and the local data API from data/planning-map.
// Used by the standalone preview (scripts/planning-map-preview.mjs, prefix '') and by the pro forma dev server
// (vite.config.ts, prefix '/map'). Data loads lazily on first request, so the app starts fast and still runs
// when the git-ignored data has not been collected on this machine.
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { contains, distanceMetres } from '../src/location/cascade.ts'

const overlap = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]
const safeFields = (p) => Object.fromEntries(Object.entries(p).filter(([k]) => !/^CONTACT_|PHONE|EMAIL/i.test(k)))

function number(value, low, high) {
  const n = Number(value)
  if (value === null || !Number.isFinite(n) || n < low || n > high) throw new Error('Invalid coordinate/bounds')
  return n
}

function send(res, body, status = 200, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' })
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
}

export function planningMapHandler({ root = 'data/planning-map', prefix = '' } = {}) {
  root = resolve(root)
  let loaded = null
  const load = () => (loaded ??= (async () => {
    if (!existsSync(`${root}/manifest.json`)) throw Object.assign(new Error('Map data is not collected on this machine. Run npm run map:collect and npm run map:collect:regional.'), { status: 503 })
    const manifest = JSON.parse(await readFile(`${root}/manifest.json`, 'utf8'))
    const regionalPolicies = JSON.parse(await readFile(`${root}/regional-policy-sources.json`, 'utf8')).regions
    const definitions = new Map(manifest.layers.filter((l) => l.status === 'ready').map((l) => [l.id, l]))
    const addresses = JSON.parse(await readFile(`${root}/addresses.index.json`, 'utf8')).rows
    return { manifest, regionalPolicies, definitions, addresses, normalized: addresses.map((r) => r[1].toUpperCase()), datasets: new Map() }
  })().catch((error) => { loaded = null; throw error }))

  async function data(id) {
    const { definitions, datasets } = await load()
    const def = definitions.get(id)
    if (!def || def.format !== 'GeoJSON') throw new Error('Unknown geographic layer')
    if (!datasets.has(id)) datasets.set(id, JSON.parse(await readFile(`${root}/${def.file}`, 'utf8')).features)
    return datasets.get(id)
  }

  return async function handle(req, res, next) {
    const url = new URL(req.url, 'http://127.0.0.1')
    if (prefix && url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) return next?.()
    const path = url.pathname.slice(prefix.length) || '/'
    try {
      if (req.method !== 'GET') return send(res, { error: 'GET only' }, 405)
      if (path === '/') {
        if (prefix && url.pathname === prefix) { res.writeHead(301, { Location: `${prefix}/${url.search}` }); return res.end() }
        return send(res, await readFile('scripts/planning-map-preview.html'), 200, 'text/html; charset=utf-8')
      }
      if (path === '/fonts/plex.woff2') return send(res, await readFile('node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2'), 200, 'font/woff2')
      if (path.startsWith('/leaflet/')) {
        const base = resolve('node_modules/leaflet/dist')
        const file = resolve(base, path.slice('/leaflet/'.length))
        if (!file.startsWith(base + sep)) return send(res, { error: 'Invalid path' }, 400)
        const type = file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : 'application/octet-stream'
        return send(res, await readFile(file), 200, type)
      }
      if (path === '/api/manifest') return send(res, (await load()).manifest)
      if (path === '/api/search') {
        const { addresses, normalized } = await load()
        const q = (url.searchParams.get('q') ?? '').trim().toUpperCase().replace(/\s+/g, ' ')
        if (q.length < 3 || q.length > 120) return send(res, { rows: [] })
        const rows = []
        // Prefer a full address prefix, then substring; return multiple address points for user selection.
        for (const prefixMatch of [true, false]) {
          for (let i = 0; i < addresses.length && rows.length < 12; i++) {
            if (prefixMatch ? normalized[i].startsWith(q) : !normalized[i].startsWith(q) && normalized[i].includes(q)) rows.push(addresses[i])
          }
          if (rows.length >= 12) break
        }
        return send(res, { fields: ['addressPointId', 'address', 'longitude', 'latitude', 'class', 'ward'], rows })
      }
      if (path === '/api/features') {
        const { definitions } = await load()
        const id = url.searchParams.get('layer')
        const bounds = (url.searchParams.get('bbox') ?? '').split(',').map((v, i) => number(v, i % 2 === 0 ? -180 : -90, i % 2 === 0 ? 180 : 90))
        if (bounds.length !== 4 || bounds[0] > bounds[2] || bounds[1] > bounds[3]) throw new Error('Invalid viewport')
        const matching = (await data(id)).filter((f) => overlap(f.bbox, bounds))
        const cap = 1600
        return send(res, { type: 'FeatureCollection', features: matching.slice(0, cap).map((f) => ({ ...f, properties: safeFields(f.properties) })),
          matchingCount: matching.length, truncated: matching.length > cap, source: definitions.get(id) })
      }
      if (path === '/api/site') {
        const { definitions, regionalPolicies } = await load()
        const point = [number(url.searchParams.get('lng'), -81, -77), number(url.searchParams.get('lat'), 42, 46)]
        const matches = [], nearby = []
        for (const def of definitions.values()) {
          if (def.format !== 'GeoJSON' || def.id === 'walking') continue
          const all = await data(def.id)
          const hits = all.filter((f) => ['Polygon', 'MultiPolygon'].includes(f.geometry.type) && overlap(f.bbox, [...point, ...point]) && contains(f.geometry, point))
          if (hits.length) matches.push({ id: def.id, label: def.label, source: def, features: hits.slice(0, 20).map((f) => ({ properties: safeFields(f.properties) })), totalHits: hits.length })
          if (['parks', 'libraries', 'schools', 'childcare', 'ttc-stops', 'applications', 'pipeline'].includes(def.id)) {
            const close = all.filter((f) => overlap(f.bbox, [point[0] - .03, point[1] - .02, point[0] + .03, point[1] + .02]))
              .map((f) => ({ metres: Math.round(distanceMetres(f.geometry, point)), properties: safeFields(f.properties) }))
              .sort((a, b) => a.metres - b.metres).slice(0, 3)
            nearby.push({ id: def.id, label: def.label, source: def, results: close })
          }
        }
        const regionNames = new Set(matches.filter((m) => m.id === 'gta-regions').flatMap((m) => m.features.map((f) => f.properties.MUNICIPAL_NAME_SHORTFORM)))
        const regionalContext = regionalPolicies.filter((r) => regionNames.has(r.region))
        return send(res, { point, matches, nearby, regionalContext, measurement: 'Approximate straight-line distance to source geometry, not a walking route or a policy eligibility decision.',
          limitations: ['Point screening only; no parcel selection or boundary-tolerance classification yet.', 'Not found is not legal clearance; missing/legacy policy and unknown coverage remain possible.'] })
      }
      return send(res, { error: 'Not found' }, 404)
    } catch (error) {
      send(res, { error: error.message ?? String(error) }, error.status ?? 400)
    }
  }
}

// Pack the collected planning-map data into small static files the browser can fetch on demand:
//   public/map/data/manifest.json        layers (with sources and dates), grid, cells present
//   public/map/data/cells/<x>_<y>.json   every layer's features touching one grid cell, keyed by layer id
//   public/map/data/large/<layer>.json   features too large to repeat in every cell they touch
//   public/map/data/addresses/<key>.json Toronto address points, sharded by the street name's first two letters
// plus the map page, Leaflet and the font. Static files on Cloudflare are free and unlimited, and the map page runs the
// geometry checks in the browser, so no server compute is needed. Run after npm run map:collect. Output is git-ignored.
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const SRC = 'data/planning-map'
const OUT = 'public/map'
const CELL = 0.02 // degrees (~2.2 km × 1.6 km in the GTA)
const MAX_CELLS_PER_FEATURE = 36 // bigger features go to large/<layer>.json once instead of into every cell
const round = (n) => Math.round(n * 1e6) / 1e6
const roundCoords = (c) => (typeof c[0] === 'number' ? [round(c[0]), round(c[1])] : c.map(roundCoords))
const cellOf = (lng, lat) => [Math.floor(lng / CELL), Math.floor(lat / CELL)]
const safeFields = (p) => Object.fromEntries(Object.entries(p ?? {}).filter(([k]) => !/^CONTACT_|PHONE|EMAIL/i.test(k)))

if (!existsSync(`${SRC}/manifest.json`)) { console.error('No collected data: run npm run map:collect first.'); process.exit(1) }
const manifest = JSON.parse(await readFile(`${SRC}/manifest.json`, 'utf8'))
const layers = manifest.layers.filter((l) => l.status === 'ready' && l.format === 'GeoJSON')

await rm(`${OUT}/data`, { recursive: true, force: true })
for (const d of ['cells', 'large', 'addresses']) await mkdir(`${OUT}/data/${d}`, { recursive: true })

const cells = new Map() // "x_y" -> { layerId: features[] }
const large = new Map()
let featureCount = 0
for (const def of layers) {
  const { features } = JSON.parse(await readFile(`${SRC}/${def.file}`, 'utf8'))
  for (const f of features) {
    if (!f.geometry || !f.bbox) continue
    const slim = { type: 'Feature', bbox: f.bbox.map(round), properties: safeFields(f.properties), geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) } }
    const [x0, y0] = cellOf(f.bbox[0], f.bbox[1])
    const [x1, y1] = cellOf(f.bbox[2], f.bbox[3])
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > MAX_CELLS_PER_FEATURE) {
      if (!large.has(def.id)) large.set(def.id, [])
      large.get(def.id).push(slim)
    } else {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
        const key = `${x}_${y}`
        if (!cells.has(key)) cells.set(key, {})
        const c = cells.get(key)
        ;(c[def.id] ??= []).push(slim)
      }
    }
    featureCount++
  }
  process.stdout.write(`${def.id} `)
}
console.log()

let biggest = 0
for (const [key, c] of cells) {
  const text = JSON.stringify(c)
  biggest = Math.max(biggest, text.length)
  await writeFile(`${OUT}/data/cells/${key}.json`, text)
}
for (const [id, fs] of large) await writeFile(`${OUT}/data/large/${id}.json`, JSON.stringify(fs))

// Addresses: shard by the first two letters of the street name (after the house number)
const addresses = JSON.parse(await readFile(`${SRC}/addresses.index.json`, 'utf8')).rows
const shards = new Map()
export const streetKey = (s) => { const t = s.toUpperCase().split(/\s+/).find((w) => /^[A-Z]/.test(w)); return t ? t.replace(/[^A-Z]/g, '').slice(0, 2).padEnd(2, '_') : null }
for (const row of addresses) {
  const key = streetKey(row[1])
  if (!key) continue
  if (!shards.has(key)) shards.set(key, [])
  shards.get(key).push(row)
}
for (const [key, rows] of shards) await writeFile(`${OUT}/data/addresses/${key}.json`, JSON.stringify(rows))

const regional = JSON.parse(await readFile(`${SRC}/regional-policy-sources.json`, 'utf8'))
await writeFile(`${OUT}/data/manifest.json`, JSON.stringify({
  ...manifest, packedAt: new Date().toISOString(), cell: CELL, cells: [...cells.keys()], large: [...large.keys()],
  addressShards: [...shards.keys()], addressFields: ['addressPointId', 'address', 'longitude', 'latitude', 'class', 'ward'], regionalPolicies: regional.regions,
}))

// The map page and its assets, served next to the app at /map/
await mkdir(`${OUT}/leaflet/images`, { recursive: true })
await mkdir(`${OUT}/fonts`, { recursive: true })
// the hosted security policy allows scripts from files only, so the page's inline script becomes app.js
const page = await readFile('scripts/planning-map-preview.html', 'utf8')
const inline = page.match(/<script>([\s\S]*?)<\/script>/)
await writeFile(`${OUT}/app.js`, inline ? inline[1] : '')
await writeFile(`${OUT}/index.html`, inline ? page.replace(inline[0], '<script src="app.js"></script>') : page)
await copyFile('scripts/planning-map-static.js', `${OUT}/static-api.js`)
for (const f of ['leaflet.js', 'leaflet.css']) await copyFile(`node_modules/leaflet/dist/${f}`, `${OUT}/leaflet/${f}`)
for (const f of ['layers.png', 'layers-2x.png', 'marker-icon.png', 'marker-icon-2x.png', 'marker-shadow.png']) await copyFile(`node_modules/leaflet/dist/images/${f}`, `${OUT}/leaflet/images/${f}`)
await copyFile('node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2', `${OUT}/fonts/plex.woff2`)

console.log(`Packed ${featureCount} features from ${layers.length} layers into ${cells.size} cells (largest ${(biggest / 1e6).toFixed(1)} MB), ${large.size} large-feature files, ${shards.size} address shards (${addresses.length} addresses).`)

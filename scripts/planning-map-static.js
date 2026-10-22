// In-browser planning-map API for the hosted site: answers the same requests as scripts/planning-map-api.mjs
// (manifest, search, features, site) from packed static files (scripts/pack-planning-map.mjs), so no server compute is
// needed. Geometry matches src/location/cascade.ts (point in polygon with holes; distance in metres).
(() => {
  const cache = new Map()
  const get = (path) => {
    if (!cache.has(path)) cache.set(path, fetch(`data/${path}`).then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null)).catch(() => null))
    return cache.get(path)
  }
  const overlap = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]

  // ---- geometry (same rules as src/location/cascade.ts)
  const inRing = ([x, y], ring) => {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]; const [xj, yj] = ring[j]
      if ((yi > y) !== (yj > y) && x < (((xj - xi) * (y - yi)) / (yj - yi)) + xi) inside = !inside
    }
    return inside
  }
  const inPolygon = (p, rings) => rings.length > 0 && inRing(p, rings[0]) && !rings.slice(1).some((h) => inRing(p, h))
  const contains = (g, p) => (g.type === 'Polygon' ? inPolygon(p, g.coordinates) : g.type === 'MultiPolygon' ? g.coordinates.some((poly) => inPolygon(p, poly)) : false)
  const M = 111132
  const project = (o) => { const kx = M * Math.cos((o[1] * Math.PI) / 180); return ([lng, lat]) => [(lng - o[0]) * kx, (lat - o[1]) * M] }
  const seg = (a, b) => { const dx = b[0] - a[0]; const dy = b[1] - a[1]; const l = (dx * dx) + (dy * dy); const t = l === 0 ? 0 : Math.max(0, Math.min(1, -((a[0] * dx) + (a[1] * dy)) / l)); return Math.hypot(a[0] + (t * dx), a[1] + (t * dy)) }
  const line = (pts, f) => { if (pts.length === 1) return Math.hypot(...f(pts[0])); let m = Infinity; for (let i = 1; i < pts.length; i++) m = Math.min(m, seg(f(pts[i - 1]), f(pts[i]))); return m }
  const distance = (g, p) => {
    const f = project(p)
    switch (g.type) {
      case 'Point': return Math.hypot(...f(g.coordinates))
      case 'LineString': return line(g.coordinates, f)
      case 'MultiLineString': return Math.min(...g.coordinates.map((l) => line(l, f)))
      case 'Polygon': return contains(g, p) ? 0 : Math.min(...g.coordinates.map((r) => line(r, f)))
      case 'MultiPolygon': return contains(g, p) ? 0 : Math.min(...g.coordinates.flat().map((r) => line(r, f)))
      default: return Infinity
    }
  }

  // ---- data access
  let manifestPromise = null
  const manifest = () => (manifestPromise ??= get('manifest.json'))
  const cellKeys = (m, b) => {
    const k = (v) => Math.floor(v / m.cell)
    const present = new Set(m.cells)
    const keys = []
    for (let x = k(b[0]); x <= k(b[2]); x++) for (let y = k(b[1]); y <= k(b[3]); y++) if (present.has(`${x}_${y}`)) keys.push(`${x}_${y}`)
    return keys
  }
  /** Features of one layer touching a box: cells plus the layer's large features, each feature once. */
  async function featuresIn(m, layer, b, maxCells = 160) {
    const keys = cellKeys(m, b)
    if (keys.length > maxCells) return { features: [], tooMany: true }
    const cells = await Promise.all(keys.map((k) => get(`cells/${k}.json`)))
    const seen = new Set()
    const out = []
    for (const c of cells) for (const f of (c && c[layer]) || []) {
      const id = `${f.bbox.join(',')}|${JSON.stringify(f.geometry.coordinates).slice(0, 80)}`
      if (!seen.has(id) && overlap(f.bbox, b)) { seen.add(id); out.push(f) }
    }
    if (m.large.includes(layer)) for (const f of (await get(`large/${layer}.json`)) || []) if (overlap(f.bbox, b)) out.push(f)
    return { features: out, tooMany: false }
  }
  const streetKey = (s) => { const t = s.toUpperCase().split(/\s+/).find((w) => /^[A-Z]/.test(w)); return t ? t.replace(/[^A-Z]/g, '').slice(0, 2).padEnd(2, '_') : null }

  async function handle(url) {
    const u = new URL(url, location.href)
    const path = u.pathname.replace(/^.*\/api\//, '')
    const m = await manifest()
    if (!m) throw new Error('Map data is not available on this site yet.')
    const definitions = new Map(m.layers.filter((l) => l.status === 'ready').map((l) => [l.id, l]))
    if (path === 'manifest') return m
    if (path === 'search') {
      const q = (u.searchParams.get('q') || '').trim().toUpperCase().replace(/\s+/g, ' ')
      const key = streetKey(q)
      if (q.length < 3 || !key || !m.addressShards.includes(key)) return { fields: m.addressFields, rows: [] }
      const rows = (await get(`addresses/${key}.json`)) || []
      const hits = []
      for (const prefix of [true, false]) {
        for (const r of rows) { if (hits.length >= 12) break; const a = r[1].toUpperCase(); if (prefix ? a.startsWith(q) : !a.startsWith(q) && a.includes(q)) hits.push(r) }
      }
      return { fields: m.addressFields, rows: hits }
    }
    if (path === 'features') {
      const id = u.searchParams.get('layer')
      const b = (u.searchParams.get('bbox') || '').split(',').map(Number)
      if (!definitions.has(id) || b.length !== 4 || b.some((v) => !Number.isFinite(v))) throw new Error('Invalid request')
      const { features, tooMany } = await featuresIn(m, id, b)
      const cap = 1600
      return { type: 'FeatureCollection', features: features.slice(0, cap), matchingCount: tooMany ? cap + 1 : features.length, truncated: tooMany || features.length > cap, source: definitions.get(id) }
    }
    if (path === 'site') {
      const point = [Number(u.searchParams.get('lng')), Number(u.searchParams.get('lat'))]
      if (!point.every(Number.isFinite)) throw new Error('Invalid coordinate')
      const at = [...point, ...point]
      const matches = []
      const nearby = []
      const near = [point[0] - 0.03, point[1] - 0.02, point[0] + 0.03, point[1] + 0.02]
      for (const def of definitions.values()) {
        if (def.format !== 'GeoJSON' || def.id === 'walking') continue
        const { features } = await featuresIn(m, def.id, at)
        const hits = features.filter((f) => (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') && contains(f.geometry, point))
        if (hits.length) matches.push({ id: def.id, label: def.label, source: def, features: hits.slice(0, 20).map((f) => ({ properties: f.properties })), totalHits: hits.length })
        if (['parks', 'libraries', 'schools', 'childcare', 'ttc-stops', 'applications', 'pipeline'].includes(def.id)) {
          const close = (await featuresIn(m, def.id, near)).features.map((f) => ({ metres: Math.round(distance(f.geometry, point)), properties: f.properties })).sort((a, b) => a.metres - b.metres).slice(0, 3)
          nearby.push({ id: def.id, label: def.label, source: def, results: close })
        }
      }
      let street = null
      if (definitions.has('walking')) {
        const segs = (await featuresIn(m, 'walking', [point[0] - 0.004, point[1] - 0.003, point[0] + 0.004, point[1] + 0.003])).features
          .map((f) => ({ metres: Math.round(distance(f.geometry, point)), properties: f.properties })).sort((a, b) => a.metres - b.metres)
        const crossing = segs.find((s) => String(s.properties.PX || '').trim() || String(s.properties.CROSSWALK_TYPE || '').trim())
        street = { segments: segs.slice(0, 3), crossing: crossing || null, source: definitions.get('walking') }
      }
      const regions = new Set(matches.filter((x) => x.id === 'gta-regions').flatMap((x) => x.features.map((f) => f.properties.MUNICIPAL_NAME_SHORTFORM)))
      return {
        point, matches, nearby, street, regionalContext: (m.regionalPolicies || []).filter((r) => regions.has(r.region)),
        measurement: 'Approximate straight-line distance to source geometry, not a walking route or a policy eligibility decision.',
        limitations: ['Point screening only; no parcel selection or boundary-tolerance classification yet.', 'Not found is not legal clearance; missing/legacy policy and unknown coverage remain possible.'],
      }
    }
    throw new Error('Not found')
  }

  window.planningMapStatic = { available: async () => !!(await manifest()), handle }
})()

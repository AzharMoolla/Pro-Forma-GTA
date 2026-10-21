// Local inspection server for collected public data. Bind to localhost only; no production deployment.
// node --import tsx scripts/planning-map-preview.mjs   (the pro forma dev server also serves this map at /map/)
import { createServer } from 'node:http'
import { planningMapHandler } from './planning-map-api.mjs'

const handle = planningMapHandler()
createServer((req, res) => handle(req, res, () => { res.writeHead(404); res.end() }))
  .listen(4174, '127.0.0.1', () => console.log('Planning-map data preview: http://127.0.0.1:4174'))

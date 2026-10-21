// Supplement the Toronto collection using publisher Open_Data services, with ID-based pagination.
import { readFile, writeFile, mkdir, rename, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { gzipSync, gunzipSync } from 'node:zlib'
const output = 'data/planning-map', cache = 'data/planning-map-cache'
await mkdir(cache, { recursive: true })
const manifest = JSON.parse(await readFile(`${output}/manifest.json`, 'utf8'))
const hash = (s) => createHash('sha256').update(s).digest('hex')
const only = process.argv.find((s) => s.startsWith('--only='))?.slice(7).split(',')
const O = 'https://map.oshawa.ca/arcgis/rest/services/Operational/OpenData/MapServer'
const D = 'https://maps.durham.ca/arcgis/rest/services/Open_Data/Durham_OpenData/MapServer'
const DP = 'https://maps.durham.ca/arcgis/rest/services/Open_Data/OfficialPlanConsolidation2024_Map1/MapServer'
const oshawaLicence = 'https://map.oshawa.ca/OpenData/Open%20Government%20Licence%20version%202.0%20-%20Oshawa.pdf'
const durhamLicence = 'https://www.durham.ca/en/regional-government/resources/Documents/OpenDataLicenceAgreement.pdf'
const gtaNames=['TORONTO','AJAX','BROCK','CLARINGTON','OSHAWA','PICKERING','SCUGOG','UXBRIDGE','WHITBY','BURLINGTON','HALTON HILLS','MILTON','OAKVILLE','BRAMPTON','CALEDON','MISSISSAUGA','AURORA','EAST GWILLIMBURY','GEORGINA','KING','MARKHAM','NEWMARKET','RICHMOND HILL','VAUGHAN','WHITCHURCH-STOUFFVILLE']
const lowerFilter=`MUNICIPAL_NAME_SHORTFORM IN (${gtaNames.map(n=>`'${n}'`).join(',')})`
const entries = [
  ['gta-municipalities','GTA lower/single-tier municipalities','https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open03/MapServer',14,'Ontario','Name-filtered GTA municipalities. Source may represent multiple parts as separate records; feature count is not municipality count.',lowerFilter],
  ['gta-regions','GTA regional boundaries','https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open03/MapServer',13,'Ontario','York, Durham, Halton and Peel boundaries; Toronto is single-tier. Boundary membership does not establish current planning approval powers.',"MUNICIPAL_NAME_SHORTFORM IN ('YORK','DURHAM','HALTON','PEEL')"],
  ['oshawa-zoning','Oshawa zoning','https://map.oshawa.ca/arcgis/rest/services/Operational/PopularLayers/MapServer',17,'Oshawa','Official open-data item dee9180066de48c684a34ab6c35ac62a links the Oshawa licence. Check by-law text, exceptions and legal currency.'],
  ['oshawa-land-use','Oshawa existing land use',O,0,'Oshawa','Existing use, not an Official Plan designation or a zoning permission.'],
  ['oshawa-wards','Oshawa wards',O,11,'Oshawa','Source layer named WARDS_2018; confirm current ward model before elections/contact use.'],
  ['oshawa-neighbourhoods','Oshawa neighbourhoods',O,8,'Oshawa'],
  ['oshawa-parks','Oshawa parks',O,9,'Oshawa'],
  ['oshawa-schools','Oshawa education facilities',O,3,'Oshawa'],
  ['oshawa-community-centres','Oshawa community centres',O,7,'Oshawa'],
  ['durham-municipalities','Durham municipal boundaries',D,1,'Durham'],
  ['durham-schools','Durham education facilities',D,6,'Durham'],
  ['durham-childcare','Durham child care',D,3,'Durham'],
  ['durham-healthcare','Durham healthcare facilities',D,8,'Durham'],
  ['durham-pmtsa','Durham protected station areas',DP,20,'Durham','2024 consolidation service; legal in-force status/amendments need review.'],
  ['durham-op-community','Durham OP community areas',DP,27,'Durham','2024 consolidation service, not local zoning or a complete land-use designation mosaic.'],
  ['durham-op-employment','Durham OP employment areas',DP,28,'Durham','2024 consolidation service; later amendments require checking.'],
  ['durham-op-specific-policy','Durham OP specific policy areas',DP,18,'Durham'],
  ['durham-airports','Durham OP airports',DP,4,'Durham','Airport location symbols only; not flight paths, noise contours or legal height surfaces.'],
  ['trca-regulated','TRCA regulated area','https://services1.arcgis.com/d0ZCwU7eGKVeNiEE/arcgis/rest/services/TRCA_Regulation_Limit2/FeatureServer',0,'TRCA','Conceptual regulation screening boundary, not a precise legal delineation. Features can be regulated even if unmapped. Open-data item 77304275d0214ca99d146248f4b2baa5 explicitly links TRCA licence.'],
]
async function get(url, useCache = false) {
  const file = `${cache}/arc-${hash(url)}.gz`
  let raw,sourceRetrievedAt
  if (useCache && !process.argv.includes('--refresh')) { try { raw = gunzipSync(await readFile(file));sourceRetrievedAt=(await stat(file)).mtime.toISOString() } catch { /* fetch */ } }
  if (!raw) {
    const r = await fetch(url, { signal: AbortSignal.timeout(90000) })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    raw = Buffer.from(await r.arrayBuffer())
    sourceRetrievedAt=new Date().toISOString()
    if (useCache) await writeFile(file, gzipSync(raw))
  }
  const json = JSON.parse(raw.toString())
  if (json.error) throw new Error(JSON.stringify(json.error))
  return { json, sha256: hash(raw), url, retrievedAt:sourceRetrievedAt }
}
const coordinates = (v) => typeof v[0] === 'number' ? [v] : v.flatMap(coordinates)
for (const [id,label,service,layer,publisher,caveat='Publisher screening layer; independently review currency, attributes and policy applicability.',where='1=1'] of entries) {
  if (only && !only.includes(id)) continue
  process.stdout.write(`${id} … `)
  try {
    const sourceUrl = `${service}/${layer}`
    const metadata = (await get(`${sourceUrl}?f=pjson`)).json
    const ids = (await get(`${sourceUrl}/query?${new URLSearchParams({where,returnIdsOnly:'true',f:'json'})}`)).json
    const objectIds = [...new Set(ids.objectIds ?? [])].sort((a,b)=>a-b)
    if (!ids.objectIds) throw new Error('No object IDs returned')
    const features = [], responses = [], seen = new Set(), exclusions=[]
    const batchSize=publisher==='TRCA'?100:400
    for (let offset=0;offset<objectIds.length;offset+=batchSize) {
      const query = new URLSearchParams({ objectIds: objectIds.slice(offset,offset+batchSize).join(','), outFields:'*',returnGeometry:'true',outSR:'4326',f:'geojson' })
      const result = await get(`${sourceUrl}/query?${query}`, true)
      if (result.json.exceededTransferLimit) throw new Error('ArcGIS transfer limit exceeded')
      responses.push({ url:result.url, sha256:result.sha256, count:result.json.features.length,retrievedAt:result.retrievedAt })
      for (const f of result.json.features) {
        const sourceId = f.properties[ids.objectIdFieldName] ?? f.id
        if (seen.has(sourceId)) throw new Error('Duplicate feature ID')
        seen.add(sourceId)
        if (!f.geometry) { exclusions.push({sourceId,reason:'Source geometry is null'});continue }
        const ps=coordinates(f.geometry.coordinates), box=[Infinity,Infinity,-Infinity,-Infinity]
        if(!ps.length) {exclusions.push({sourceId,reason:'Source geometry has no positions'});continue}
        for (const [x,y] of ps) {
          if (!Number.isFinite(x)||!Number.isFinite(y)||x < -81||x > -77||y < 42||y > 46) throw new Error('Coordinate/CRS sanity check failed')
          box[0]=Math.min(box[0],x);box[1]=Math.min(box[1],y);box[2]=Math.max(box[2],x);box[3]=Math.max(box[3],y)
        }
        features.push({...f,bbox:box})
      }
    }
    if (features.length+exclusions.length!==objectIds.length) throw new Error('Source-ID/feature count mismatch')
    const body=JSON.stringify({type:'FeatureCollection',features})
    await writeFile(`${output}/${id}.geo.json.tmp`,body)
    await rename(`${output}/${id}.geo.json.tmp`,`${output}/${id}.geo.json`)
    await writeFile(`${output}/${id}.unmapped.json`,JSON.stringify(exclusions,null,2))
    const record={id,label,group:publisher,publisher:publisher==='TRCA'?'Toronto and Region Conservation Authority':publisher==='Oshawa'?'City of Oshawa':'Region of Durham',status:'ready',format:'GeoJSON',file:`${id}.geo.json`,
      catalogueUrl:sourceUrl,resourceUrl:sourceUrl,sourceCount:objectIds.length,featureCount:features.length,excludedCount:exclusions.length,exclusionFile:`${id}.unmapped.json`,
      sourceCrs:metadata.extent?.spatialReference??null,crs:'EPSG:4326',coordinateTransform:'ArcGIS server outSR=4326; no hand-selected projection',
      preparedAt:new Date().toISOString(),retrievedAt:responses.map(r=>r.retrievedAt).sort().at(-1)??new Date().toISOString(),sourceModifiedAt:metadata.editingInfo?.lastEditDate??null,caveat,normalizedSha256:hash(body),bytes:Buffer.byteLength(body),sourceResponses:responses,
      licence:{name:publisher==='TRCA'?'TRCA Open Data Licence v1.0':publisher==='Oshawa'?'Open Government Licence – City of Oshawa':'Region of Durham Open Data Licence',url:publisher==='TRCA'?'https://trca.ca/about/open-data-licence/':publisher==='Oshawa'?oshawaLicence:durhamLicence,
        evidence:publisher==='TRCA'?'https://www.arcgis.com/home/item.html?id=77304275d0214ca99d146248f4b2baa5':publisher==='Oshawa'?'https://www.oshawa.ca/city-hall/city-records/open-data/':'https://www.durham.ca/regional-government/access-to-information/open-data/',
        attribution:publisher==='TRCA'?"Contains information made available under the Toronto and Region Conservation Authority (TRCA)’s Open Data Licence v 1.0":publisher==='Oshawa'?'Contains information licensed under the Open Government Licence – The Corporation of the City of Oshawa.':"Contains public sector Information made available under The Regional Municipality of Durham's Open Data Licence."},
      reviewStatus:'downloaded-and-structurally-validated; independent spatial/legal currency review pending',fields:metadata.fields}
    if(publisher==='Ontario') {
      record.publisher='Ontario Land Information Ontario'
      record.licence={name:'Open Government Licence – Ontario',url:'https://www.ontario.ca/page/open-government-licence-ontario',evidence:sourceUrl,attribution:'Contains information licensed under the Open Government Licence – Ontario.'}
      record.sourceFilter=where
    }
    if(publisher==='Durham') record.licence.url='https://www.durham.ca/regional-government/access-to-information/open-data/'
    manifest.layers=manifest.layers.filter(l=>l.id!==id).concat(record)
    console.log(`${features.length} features; source IDs reconciled`)
  } catch(error) {
    console.log(`FAILED: ${error}`)
    const previous=manifest.layers.find(l=>l.id===id)
    if(previous) previous.lastAttemptError=String(error)
    else manifest.layers.push({id,label,group:publisher,status:'failed',error:String(error),resourceUrl:`${service}/${layer}`})
  }
  manifest.generatedAt=new Date().toISOString()
  await writeFile(`${output}/manifest.json.tmp`,JSON.stringify(manifest,null,2))
  await rename(`${output}/manifest.json.tmp`,`${output}/manifest.json`)
}

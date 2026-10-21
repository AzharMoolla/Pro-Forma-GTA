import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { contains } from '../src/location/cascade.ts'
const root='data/planning-map'
const manifest=JSON.parse(await readFile(`${root}/manifest.json`,'utf8'))
const report={checkedAt:new Date().toISOString(),layers:[],knownSiteChecks:[],sourceConsistencyChecks:[],failures:[]}
let addresses,wards
for(const layer of manifest.layers) {
  if(layer.status!=='ready') {report.failures.push(`${layer.id}: ${layer.error}`);continue}
  try {
    const raw=await readFile(`${root}/${layer.file}`)
    assert.equal(createHash('sha256').update(raw).digest('hex'),layer.normalizedSha256,'file SHA-256 mismatch')
    const parsed=JSON.parse(raw.toString())
    const count=layer.format==='GeoJSON'?parsed.features.length:parsed.rows.length
    assert.equal(count,layer.featureCount,'manifest count mismatch')
    assert.equal(layer.sourceCount,layer.featureCount+layer.excludedCount,'unreconciled source rows')
    assert.ok(layer.licence?.url&&layer.resourceUrl,'missing source/licence links')
    assert.ok(layer.sourceResponses?.length,'missing retrieval evidence')
    if(layer.format==='GeoJSON') {
      for(const f of parsed.features) {
        assert.equal(f.bbox.length,4)
        assert.ok(f.bbox.every(Number.isFinite),'invalid bbox')
        assert.ok(f.bbox[0]<=f.bbox[2]&&f.bbox[1]<=f.bbox[3],'inverted bbox')
        assert.ok(f.geometry&&f.type==='Feature','invalid feature')
      }
      if(layer.id==='wards') wards=parsed.features
    }
    if(layer.id==='addresses') addresses=parsed.rows
    report.layers.push({id:layer.id,features:count,excluded:layer.excludedCount,sha256:'matches',counts:'reconciled'})
  }catch(e){report.failures.push(`${layer.id}: ${e.message}`)}
}
if(addresses&&wards) {
  const cityHall=addresses.find(a=>a[1]==='100 Queen St W')
  assert.ok(cityHall,'City Hall official address missing')
  const match=wards.filter(f=>contains(f.geometry,[cityHall[2],cityHall[3]]))
  assert.equal(match.length,1,'City Hall should match one ward')
  assert.equal(Number(match[0].properties.AREA_SHORT_CODE),Number(cityHall[5]),'City Hall ward geometry/address attribute disagreement')
  assert.equal(Number(cityHall[5]),10,'Known City Hall ward fixture')
  report.knownSiteChecks.push({address:cityHall[1],addressPointId:cityHall[0],ward:cityHall[5],result:'address-source and ward-source agree with ward 10 fixture'})
  const mismatches=[];let checked=0
  // Deterministic geographic-source consistency sample. This does not prove independent surveying accuracy.
  for(let i=0;i<addresses.length;i+=Math.max(1,Math.floor(addresses.length/250))) {
    const a=addresses[i];if(!a[5])continue
    const hit=wards.filter(f=>f.bbox[0]<=a[2]&&f.bbox[2]>=a[2]&&f.bbox[1]<=a[3]&&f.bbox[3]>=a[3]&&contains(f.geometry,[a[2],a[3]]))
    checked++
    if(hit.length!==1||Number(hit[0].properties.AREA_SHORT_CODE)!==Number(a[5]))mismatches.push({addressPointId:a[0],address:a[1],expectedWard:a[5],mappedWards:hit.map(f=>f.properties.AREA_SHORT_CODE)})
  }
  report.sourceConsistencyChecks.push({kind:'address ward attribute vs downloaded ward geometry',checked,mismatches})
}
await writeFile(`${root}/verification.json`,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({layers:report.layers.length,knownSites:report.knownSiteChecks,sourceConsistency:report.sourceConsistencyChecks.map(c=>({checked:c.checked,mismatches:c.mismatches.length})),failures:report.failures},null,2))
if(report.failures.length)process.exitCode=1

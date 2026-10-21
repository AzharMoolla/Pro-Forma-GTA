// With npm run map:preview running: node scripts/verify-planning-map-browser.mjs
import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { writeFile } from 'node:fs/promises'
const browser=await chromium.launch({headless:true})
const context=await browser.newContext({viewport:{width:1600,height:1000}})
const page=await context.newPage()
const report={checkedAt:new Date().toISOString(),errors:[],externalRequests:[]}
page.on('pageerror',e=>report.errors.push(e.message))
page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4174'))report.externalRequests.push(r.url())})
try {
  await page.goto('http://127.0.0.1:4174')
  await page.getByLabel('Toronto municipal address').fill('2350 Yonge St')
  await page.getByRole('button',{name:'Search official address index'}).click()
  await page.locator('#results button').first().click()
  await page.getByRole('heading',{name:'Mapped polygon matches'}).waitFor()
  await page.locator('#layers details').evaluateAll(list=>list.forEach(d=>d.open=true))
  for(const name of ['Toronto zoning areas','Zoning height overlay','Parks','Library branches','Schools – all types','Licensed child-care centres','TTC scheduled stops'])await page.getByRole('checkbox',{name,exact:true}).check()
  await page.locator('#status-ttc-stops').filter({hasText:/in view|zoom in/}).waitFor()
  report.clustersBefore=await page.locator('.cluster-badge').count()
  const groupedAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()
  report.groupedAxeViolations=groupedAxe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))
  const cluster=page.locator('.place-icon').filter({has:page.locator('.cluster-badge')}).first()
  if(await cluster.count())await cluster.click()
  report.expandedMarkers=await page.locator('.place-icon').count()
  await page.locator('#layers').evaluate(e=>e.parentElement.scrollTop=300)
  await page.screenshot({path:'data/research/planning-map-preview-desktop.png',fullPage:true})
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()
  report.axeViolations=axe.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))
  await page.getByRole('checkbox',{name:'TTC scheduled stops',exact:true}).uncheck()
  report.disabledLayerStatus=await page.locator('#status-ttc-stops').innerText()
  await page.setViewportSize({width:390,height:844})
  await page.screenshot({path:'data/research/planning-map-preview-mobile.png',fullPage:true})
  report.mobileHorizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
}catch(error){report.errors.push(String(error))}
finally{
  await writeFile('data/research/planning-map-browser-check.json',JSON.stringify(report,null,2))
  await browser.close()
}
console.log(JSON.stringify(report))
if(report.errors.length||report.mobileHorizontalOverflow||report.axeViolations?.length||report.groupedAxeViolations?.length)process.exitCode=1

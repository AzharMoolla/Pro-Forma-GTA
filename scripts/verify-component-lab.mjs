import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { AxeBuilder } from '@axe-core/playwright'
import { unzipSync } from 'fflate'

const out = new URL('../data/research/component-lab/', import.meta.url)
const shot = name => fileURLToPath(new URL(name, out))
await mkdir(out, { recursive: true })
const browser = await chromium.launch()
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  const errors = [], externalRequests = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('request', r => { if (!new URL(r.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) externalRequests.push(r.url()) })
  await page.goto(process.env.LAB_URL ?? 'http://127.0.0.1:5184/component-lab/')
  await page.locator('#components article.piece').last().waitFor()
  assert.equal(await page.locator('#components article.piece').count(), 40)
  const geometryMatches = await page.locator('#components article.piece').evaluateAll(cards => cards.every(card => {
    const geometry = svg => [...svg.querySelector('g').querySelectorAll('path,rect,line,circle')].map(el =>
      ['tagName', 'x', 'y', 'width', 'height', 'd', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'transform'].map(k => k === 'tagName' ? el.tagName : el.getAttribute(k)))
    const svgs = card.querySelectorAll('.art > svg')
    return JSON.stringify(geometry(svgs[0])) === JSON.stringify(geometry(svgs[1]))
  }))
  assert.ok(geometryMatches, 'Both skins must preserve identical component geometry')
  const bodyHeight = id => page.locator(`.scene [data-instance="${id}"] > rect`).first().getAttribute('height').then(Number)
  assert.equal(await bodyHeight('01-4'), 50)
  assert.equal(await bodyHeight('01-45'), 40)
  const detailChecks = await page.locator('.scene').evaluate(el => ({
    closedRoofs:[...el.querySelectorAll('[data-feature="closed-roof"] > path:first-child')].every(p => p.getAttribute('d').trim().endsWith('Z') && p.getAttribute('fill') !== 'none'),
    roofCount:el.querySelectorAll('[data-feature="closed-roof"]').length,
    treeVariants:new Set([...el.querySelectorAll('[data-feature^="tree-"]')].map(e=>e.getAttribute('data-feature'))).size,
    lamps:el.querySelectorAll('[data-feature="warm-lamp"]').length,
    backdrop:el.querySelectorAll('[data-feature="illustrative-background"]').length,
  }))
  assert.ok(detailChecks.closedRoofs && detailChecks.roofCount >= 9)
  assert.equal(detailChecks.treeVariants, 3)
  assert.equal(detailChecks.lamps, 4)
  assert.equal(detailChecks.backdrop, 1)
  const selected=page.locator('.selectable-building').first()
  await selected.focus()
  await page.keyboard.press('Enter')
  assert.equal(await selected.getAttribute('aria-pressed'),'true')
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('[data-spotlight]').count(),0)
  for(const id of ['01','02','04','05','06']){
    const slider=page.locator(`#scale-${id}`)
    const original=await slider.inputValue()
    for(const limit of ['min','max']){
      await slider.fill(await slider.getAttribute(limit))
      await slider.dispatchEvent('input')
      const fits=await slider.locator('xpath=ancestor::article').locator('.art > svg').evaluateAll(svgs=>svgs.every(svg=>{const b=svg.querySelector('g').getBBox(),v=svg.viewBox.baseVal;return b.x>=v.x-.15&&b.y>=v.y-.15&&b.x+b.width<=v.x+v.width+.15&&b.y+b.height<=v.y+v.height+.15}))
      assert.ok(fits,`${id} must stay inside its SVG at ${limit} height`)
    }
    await slider.fill(original);await slider.dispatchEvent('input')
  }
  const bays=page.locator('#townhouse-bays')
  await bays.fill('12');await bays.dispatchEvent('input')
  const row=bays.locator('xpath=ancestor::article')
  assert.equal(await row.locator('.art').first().locator('[data-feature="townhouse-bay"]').count(),12)
  // 9 m eaves + 1.7 m gable; the receding roof slope adds ~.6 m in the oblique view
  assert.ok(await row.locator('.art > svg').first().evaluate(svg=>{const b=svg.querySelector('g').getBBox();return b.y>-12&&b.y+b.height<.6&&svg.viewBox.baseVal.width>50}))
  await bays.fill('4');await bays.dispatchEvent('input')
  await page.getByLabel('Scale check', { exact: false }).focus()
  await page.keyboard.press('Home')
  assert.equal(await bodyHeight('01-45'), 20)
  assert.equal(await bodyHeight('01-4'), 50)
  await page.keyboard.press('End')
  assert.equal(await bodyHeight('01-45'), 50)
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  const scan = async () => (await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations.map(v => ({ id:v.id, targets:v.nodes.map(n=>n.target) }))
  const desktopAxe = await scan()
  assert.deepEqual(desktopAxe, [])
  await page.screenshot({ path: shot('desktop.png'), fullPage:true })
  await page.locator('.assembly').screenshot({ path: shot('assembly-watercolour.png') })
  await page.getByRole('button', { name:'Blueprint',exact:true }).click()
  await page.locator('.assembly').screenshot({ path: shot('assembly-blueprint.png') })
  await page.getByRole('button', { name:'Inspect Apartment block' }).click()
  const dialogAxe = await scan()
  assert.deepEqual(dialogAxe, [])
  const ids = await page.locator('[id]').evaluateAll(els => els.map(e=>e.id))
  assert.equal(new Set(ids).size, ids.length, 'No duplicated SVG paint definitions in inspector')
  await page.screenshot({ path: shot('inspector.png') })
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('dialog[open]').count(), 0)
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name:'Download 88 SVGs .zip' }).click()
  const download = await downloadEvent
  const stream = await download.createReadStream(), chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  const zip = unzipSync(Buffer.concat(chunks))
  const svgNames = Object.keys(zip).filter(k=>k.endsWith('.svg'))
  assert.equal(svgNames.length, 88) // 40 components and 4 podiums, two skins each
  const xmlErrors = await page.evaluate(svgs => svgs.flatMap(([name,text]) => {
    const parsed = new DOMParser().parseFromString(text,'image/svg+xml')
    if(parsed.querySelector('parsererror'))return [name]
    const ids=new Set([...parsed.querySelectorAll('[id]')].map(e=>e.id))
    return [...text.matchAll(/url\(#([^)]*)\)/g)].some(m=>!ids.has(m[1])) ? [`${name}: missing paint reference`] : []
  }), svgNames.map(name=>[name,new TextDecoder().decode(zip[name])]))
  assert.deepEqual(xmlErrors, [])
  await page.setViewportSize({ width:390,height:844 })
  const mobileAxe = await scan()
  assert.deepEqual(mobileAxe, [])
  const overflow = await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)
  assert.equal(overflow, 0)
  await page.screenshot({ path: shot('mobile.png'), fullPage:true })
  assert.deepEqual(errors, [])
  assert.deepEqual(externalRequests, [])
  const result = { pieces:20, exportedSvgCount:48, identicalSkinGeometry:geometryMatches, sharedScaleAndKeyboardSlider:true,detailChecks, desktopAxe,dialogAxe,mobileAxe,mobilePageOverflow:overflow,xmlErrors,errors,externalRequests }
  await writeFile(new URL('verification.json',out),JSON.stringify(result,null,2))
  console.log(JSON.stringify(result,null,2))
} finally { await browser.close() }

import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const sections = ['Overview', 'Site map', 'Market evidence', 'People & affordability', 'Site & program', 'Cost & budget', 'Revenue & operations', 'Finance & ledger', 'Returns & range', 'Feasibility & stress', 'Assumptions', 'Charts', 'Scenarios', 'Sources & audit', 'Report & export']

async function fresh(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Mock A')
}

const openSection = (page: Page, name: string) => page.getByRole('navigation', { name: 'Workspace sections' }).getByRole('button', { name, exact: true }).click()

test('every section renders without axe violations', async ({ page }) => {
  await fresh(page)
  for (const name of sections) {
    await openSection(page, name)
    await expect(page.locator('main')).not.toBeEmpty()
    // @axe-core/playwright types lag @playwright/test by a minor version; runtime API is identical
    const { violations } = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
    expect(violations.map((v) => `${name}: ${v.id} (${v.nodes.length})`)).toEqual([])
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test('editing a cost line recalculates the headline', async ({ page }) => {
  await fresh(page)
  const tdc = page.getByRole('button', { name: /^Total development cost: / })
  const before = await tdc.innerText()
  await openSection(page, 'Cost & budget')
  const field = page.getByRole('textbox', { name: /Above-grade hard cost.*Rate/ })
  await field.fill('420')
  await field.press('Enter')
  await expect(tdc).not.toHaveText(before)
})

test('locking a scenario hashes it and compares against the draft', async ({ page }) => {
  await fresh(page)
  await openSection(page, 'Scenarios')
  await page.getByLabel('Name').fill('Base')
  await page.getByLabel(/Purpose/).fill('Reference case for comparison')
  await page.getByRole('button', { name: 'Lock scenario' }).click()
  await expect(page.getByText('verified')).toBeVisible()
  await page.getByRole('checkbox', { name: 'Compare Base' }).check()
  await expect(page.getByRole('table', { name: 'Scenario comparison' })).toContainText('Current draft')
  await expect(page.getByText('No input differences.')).toBeVisible()
})

test('switching a project variable surfaces the costs it triggers', async ({ page }) => {
  await fresh(page)
  await openSection(page, 'Site & program')
  await page.getByText('program (19)').click()
  await page.getByRole('combobox', { name: 'Pool' }).selectOption('yes')
  await openSection(page, 'Sources & audit')
  await expect(page.getByRole('table', { name: 'Checklist coverage' })).toContainText('Pool (structure, mechanical, finishes)')
})

test('master plan: plan tree, roll-up and range run in a worker', async ({ page }) => {
  test.setTimeout(90_000)
  await fresh(page)
  await page.getByLabel('Project', { exact: true }).selectOption('mock-b')
  await expect(page.getByRole('table', { name: 'Children of this level' })).toContainText('Phase 3')
  await page.getByRole('button', { name: 'Block A: condo towers' }).click()
  await expect(page.getByRole('button', { name: /^Total development cost: / })).toBeVisible()
  await openSection(page, 'Returns & range')
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.getByRole('table', { name: 'Monte Carlo percentiles' })).toBeVisible({ timeout: 60_000 })
})

test('overview shows the sketch and colour-coded analysis', async ({ page }) => {
  await fresh(page)
  await expect(page.getByRole('img', { name: /Pencil sketch streetscape of .*38-storey tower by a station.*zoning height limit of about 20 storeys.*1 building is taller/ })).toBeVisible()
  for (const style of ['Blueprint', 'Pencil sketch']) {
    await page.getByText(style, { exact: true }).click()
    await expect(page.getByRole('img', { name: new RegExp(`^${style} streetscape`) })).toBeVisible()
  }
  await expect(page.getByRole('heading', { name: 'Decision summary' })).toBeVisible()
  await page.getByRole('button', { name: /Show all \d+ observations/ }).click()
  await expect(page.getByText('Negative development spread')).toBeVisible()
  await expect(page.getByText(/Land-to-revenue/).first()).toBeVisible()
})

test('glossary: definitions and formulas on hover and keyboard focus', async ({ page }) => {
  await fresh(page)
  const kpis = page.getByRole('list', { name: /Headline results/ })
  await kpis.getByRole('button', { name: 'Yield on cost', exact: true }).focus()
  await expect(page.getByRole('tooltip')).toContainText('Yield on cost = stabilized NOI ÷ TDC')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await kpis.getByRole('button', { name: 'Levered IRR', exact: true }).hover()
  await expect(page.getByRole('tooltip')).toContainText('Internal rate of return')
})

test('tracker: close tasks, record an actual with a receipt, push it into the model', async ({ page }) => {
  await fresh(page)
  await openSection(page, 'Development tracker')
  await expect(page.getByText('Current stage', { exact: true })).toBeVisible()
  const task = page.getByRole('listitem').filter({ has: page.getByText('Market study and appraisal', { exact: false }) }).first()
  const row = page.locator('li', { hasText: 'Market study, appraisal, broker opinion of value' }).last()
  await row.getByLabel('Status').selectOption('done')
  const actual = row.getByRole('textbox', { name: 'Actual spent' })
  await actual.fill('75000')
  await actual.press('Enter')
  await expect(row.getByText(/Over by/)).toBeVisible()
  await row.locator('input[type=file]').setInputFiles({ name: 'invoice.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test invoice') })
  await expect(row.getByRole('button', { name: 'invoice.pdf', exact: true })).toBeVisible()
  await row.getByRole('button', { name: 'Use final actual in model' }).click()
  await openSection(page, 'Cost & budget')
  await expect(page.getByRole('textbox', { name: /Market study and appraisal Amount/ })).toHaveValue('75000')
  void task
})

test('plan change: adding a building turns a single tower into a plan', async ({ page }) => {
  await fresh(page)
  await openSection(page, 'Development tracker')
  await page.getByRole('button', { name: /Add a building like/ }).click()
  await expect(page.getByRole('navigation', { name: 'Workspace sections' }).getByText('Plan structure')).toBeVisible()
  await expect(page.getByRole('button', { name: /\(building 2\)/ })).toBeVisible()
})

test('account: signed-out state is honest and the sign-in form is accessible', async ({ page }) => {
  await fresh(page)
  await expect(page.getByText('Not signed in: saved in this browser only')).toBeVisible()
  await page.getByRole('button', { name: 'Sign in to save' }).click()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create account' })).toBeDisabled()
  // @axe-core/playwright types lag @playwright/test by a minor version; runtime API is identical
  const { violations } = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
})

test('readiness: record a source on a cost line, review it, and the header counts it', async ({ page }) => {
  await fresh(page)
  const header = page.getByRole('button', { name: /Open sources and audit/ })
  await expect(header).toHaveAccessibleName(/Model: calculates.*Sources: 0\/\d+ reviewed/)
  await openSection(page, 'Cost & budget')
  await page.locator('main').getByRole('button', { name: 'Survey', exact: true }).click()
  const form = page.getByRole('form', { name: 'Source of this figure' })
  await form.getByLabel('Kind').selectOption('quote')
  await form.getByLabel(/Reference/).fill('Survey quote Q-2041')
  await form.getByLabel(/Value date/).fill('2026-09-30')
  await form.getByRole('button', { name: /Save source/ }).click()
  await form.getByLabel('Reviewed by').fill('cost consultant')
  await form.getByRole('button', { name: 'Mark reviewed' }).click()
  await expect(form.getByText(/Reviewed by cost consultant on \d{4}-\d{2}-\d{2}/)).toBeVisible()
  await expect(header).toHaveAccessibleName(/Sources: 1\/\d+ reviewed/)
  const { violations } = await new AxeBuilder({ page: page as never }).include('form[aria-label="Source of this figure"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([])
  await header.click()
  await expect(page.getByRole('heading', { name: 'Readiness: three separate questions' })).toBeVisible()
})

test('report: the Excel workbook downloads; charts switch to tables', async ({ page }) => {
  await fresh(page)
  await openSection(page, 'Report & export')
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download Excel workbook (.xlsx)' }).click()])
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
  const bytes = await (await download.createReadStream()).toArray()
  expect(Buffer.concat(bytes).subarray(0, 2).toString()).toBe('PK') // a zip package
  await expect(page.getByRole('heading', { name: 'Key results' })).toBeVisible()
  await openSection(page, 'Charts')
  const card = page.locator('section', { has: page.getByRole('heading', { name: 'What makes it expensive' }) })
  await card.getByRole('button', { name: 'Table' }).click()
  await expect(card.getByRole('table')).toBeVisible()
})

test('analysis: zoning checks, and modelling the rezoning locks the as-of-right case', async ({ page }) => {
  await fresh(page)
  await expect(page.getByText(/over the zoning height/).first()).toBeVisible()
  await page.locator('#observations summary', { hasText: /over the zoning height/ }).click()
  const before = await page.getByRole('button', { name: /^Total development cost: / }).getAttribute('aria-label')
  await page.getByRole('button', { name: 'Lock the current draft and model the rezoning' }).click()
  await expect(page.getByText(/Draft from scenario/)).toBeVisible()
  await expect(page.getByRole('button', { name: /^Total development cost: / })).not.toHaveAttribute('aria-label', before!)
})

test('projects: create, rename, duplicate, export, import and delete', async ({ page }) => {
  await fresh(page)
  const menu = () => page.getByRole('dialog', { name: 'Projects' })
  const open = async () => { if (!(await menu().isVisible())) await page.getByRole('button', { name: 'Projects', exact: true }).click() }
  const select = page.getByLabel('Project', { exact: true })

  // create from a template
  await open()
  await menu().getByLabel('Name', { exact: true }).fill('12 Main St rental')
  await menu().getByLabel('Start from').selectOption({ index: 1 })
  await menu().getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('12 Main St rental')
  await expect(select.locator('option')).toHaveCount(4)

  // rename
  await menu().getByLabel('New name').fill('12 Main Street')
  await menu().getByRole('button', { name: 'Rename' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('12 Main Street')

  // duplicate
  await menu().getByRole('button', { name: 'Duplicate' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('12 Main Street (copy)')
  await expect(select.locator('option')).toHaveCount(5)

  // export, then import the file back
  const [download] = await Promise.all([page.waitForEvent('download'), menu().getByRole('button', { name: 'Export project file' }).click()])
  expect(download.suggestedFilename()).toBe('12-main-street-copy-.plangta.json')
  const file = Buffer.concat(await (await download.createReadStream()).toArray())
  await menu().locator('input[type=file]').setInputFiles({ name: 'p.plangta.json', mimeType: 'application/json', buffer: file })
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('12 Main Street (copy) (imported)')
  await expect(select.locator('option')).toHaveCount(6)

  // a broken file is refused with a message
  await menu().locator('input[type=file]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"other"}') })
  await expect(menu().getByRole('status')).toContainText('not a PlanGTA project file')

  // delete needs a confirmation, and survives a reload
  await menu().getByRole('button', { name: 'Delete project…' }).click()
  await menu().getByRole('button', { name: 'Delete "12 Main Street (copy) (imported)"' }).click()
  await expect(select.locator('option')).toHaveCount(5)
  await expect(select.locator('option', { hasText: '(imported)' })).toHaveCount(0)
  await page.reload()
  await expect(select.locator('option')).toHaveCount(5)
  await expect(select.locator('option', { hasText: '12 Main Street' })).toHaveCount(2)
})

test('privacy policy and terms open from the footer and by link', async ({ page }) => {
  await fresh(page)
  await page.getByText('Privacy and data').click()
  await page.getByRole('link', { name: 'Privacy policy' }).click()
  await expect(page.getByRole('heading', { name: 'Privacy policy' })).toBeVisible()
  await expect(page.getByText(/Canada Central/).first()).toBeVisible()
  await page.goto('/#terms')
  await expect(page.getByRole('heading', { name: 'Terms of use' })).toBeVisible()
  const { violations } = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(violations.map((v) => v.id)).toEqual([])
})

test('site variables: unset reads as unknown, never as No or 0', async ({ page }) => {
  await fresh(page)
  await openSection(page, 'Site & program')
  const pool = page.getByRole('combobox', { name: 'Waterfront (shoreline works)' })
  await expect(pool).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Inside the Greenbelt Area' })).toHaveValue('no') // Mock A: set by the map
  const unknown = page.getByRole('combobox', { name: 'Aeronautical height limit above ground (AZR surface elevation − site elevation)' })
  await expect(unknown).toHaveCount(0) // numbers are text boxes…
  const air = page.getByRole('textbox', { name: 'Aeronautical height limit above ground (AZR surface elevation − site elevation)' })
  await expect(air).toHaveValue('') // …and an unset one is blank
  await expect(air).toHaveAttribute('placeholder', 'unknown')
})

test('overview: decision summary with expandable findings and next actions', async ({ page }) => {
  await fresh(page)
  await expect(page.getByRole('heading', { name: 'Decision summary' })).toBeVisible()
  await expect(page.getByText(/Relies on a rezoning|Does not fit the mapped limits/)).toBeVisible()
  const first = page.locator('#observations details').first()
  await expect(first).not.toHaveAttribute('open', '')
  await first.locator('summary').click()
  await expect(first).toHaveAttribute('open', '')
  await page.getByRole('button', { name: /Show all \d+ observations/ }).click()
  await expect(page.locator('#observations details')).not.toHaveCount(3)
})

test('people & affordability: income drives the 30% test; Indigenous context on the report', async ({ page }) => {
  await fresh(page)
  await openSection(page, 'People & affordability')
  await expect(page.getByText(/Enter the median renter household income/)).toBeVisible()
  const income = page.getByRole('textbox', { name: 'Median renter household income (before tax)' })
  await income.fill('62000')
  await income.press('Enter')
  await expect(page.getByText(/studio: \d+% in year 1/)).toBeVisible()
  await expect(page.getByRole('img', { name: /against the 30% threshold/ })).toBeVisible()
  await openSection(page, 'Report & export')
  await expect(page.getByRole('heading', { name: 'Indigenous context: treaty and territory' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Mississaugas of the Credit First Nation' })).toBeVisible()
})

test('feasibility solves residual land, shows the funding gap and combined downside', async ({ page }) => {
  await fresh(page)
  await openSection(page, 'Feasibility & stress')
  await expect(page.getByText(/Funding gap \$|No funding gap/)).toBeVisible()
  const land = page.getByRole('row', { name: /residual land value/ })
  await expect(land.getByRole('cell').nth(1)).toHaveText(/^\$\d/)
  const before = await land.getByRole('cell').nth(1).textContent()
  await page.getByLabel('of (%)').fill('20')
  await expect(land.getByRole('cell').nth(1)).not.toHaveText(before!)
  await expect(page.getByRole('row', { name: /^All together/ })).toBeVisible()
  await page.getByLabel('Rebate').selectOption('none')
  await expect(page.getByText(/is a permanent cost not yet in total development cost/)).toBeVisible()
})

test('funding gap and combined downside reach the decision summary and the report', async ({ page }) => {
  await fresh(page)
  await expect(page.getByRole('button', { name: /Close the funding gap/ })).toBeVisible()
  await openSection(page, 'Report & export')
  const report = page.getByRole('article', { name: 'Report' })
  await expect(report.getByRole('heading', { name: 'Funding and downside' })).toBeVisible()
  await expect(report.getByRole('row', { name: /^All together/ })).toBeVisible()
  await expect(report.getByText(/Funding gap of \$/)).toBeVisible()
})

test('assumptions: switching one off changes results, shows everywhere, and turns back on', async ({ page }) => {
  await fresh(page)
  const poc = page.getByRole('button', { name: /^Profit on cost: / })
  const before = await poc.textContent()
  await openSection(page, 'Assumptions')
  await page.getByRole('switch', { name: /Construction contingency/ }).uncheck()
  await expect(page.getByText('1 switched off')).toBeVisible()
  await expect(poc).not.toHaveText(before!)
  await expect(page.getByRole('button', { name: '1 assumption off' })).toBeVisible()
  await openSection(page, 'Overview')
  await expect(page.getByText(/leave out 1 assumption you switched off/)).toBeVisible()
  await openSection(page, 'Report & export')
  await expect(page.getByRole('article', { name: 'Report' }).getByRole('row', { name: /Construction contingency.*OFF/ })).toBeVisible()
  await openSection(page, 'Assumptions')
  await page.getByRole('button', { name: 'Turn all back on' }).click()
  await expect(poc).toHaveText(before!)
})

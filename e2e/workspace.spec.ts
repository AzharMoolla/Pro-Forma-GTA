import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const sections = ['Overview', 'Site map', 'Market evidence', 'Site & program', 'Cost & budget', 'Revenue & operations', 'Finance & ledger', 'Returns & range', 'Scenarios', 'Sources & audit']

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
  await page.getByRole('checkbox', { name: 'Pool' }).check()
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
  await expect(page.getByRole('heading', { name: /Analysis/ })).toBeVisible()
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

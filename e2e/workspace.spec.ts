import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const sections = ['Overview', 'Market evidence', 'Site & program', 'Cost & budget', 'Revenue & operations', 'Finance & ledger', 'Returns & range', 'Scenarios', 'Sources & audit']

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
  const tdc = page.getByRole('button', { name: /Total development cost/ })
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
  await expect(page.getByRole('button', { name: /Total development cost/ })).toBeVisible()
  await openSection(page, 'Returns & range')
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.getByRole('table', { name: 'Monte Carlo percentiles' })).toBeVisible({ timeout: 60_000 })
})

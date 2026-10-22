// Regressions for CURRENT_PRODUCT_REVIEW-2026-10-21 (P1/P2): recurring carry, unresolved inventory, portfolio
// validation, per-building scope of site checks, and the profit vs levered IRR explanation.
import { describe, expect, it } from 'vitest'
import { analyze, siteInsights, type SiteFacts } from '../../src/engine/insights'
import { runNode } from '../../src/engine/portfolio'
import { runProject, type CondoComponent, type ProjectInput } from '../../src/engine/project'
import { REZONING_DEFAULTS, rezoneProject } from '../../src/scenario/rezoning'
import { tinyProject } from './fixtures'

describe('recurring carrying costs grow with a delay', () => {
  it('$1,000 a month for three months stays $1,000 a month for six', () => {
    const p: ProjectInput = { ...tinyProject(), costLines: [...tinyProject().costLines, { id: 'holding-tax', label: 'Tax during hold', catalogueId: 'holding-tax', driver: { kind: 'lumpSum', amount: 3_000 }, timing: { kind: 'spread', from: 0, to: 2 }, estimateClass: 'B' }] }
    const r = rezoneProject(p, { ...REZONING_DEFAULTS, months: 3 })
    const line = r.costLines.find((l) => l.id === 'holding-tax')!
    expect(line.timing).toEqual({ kind: 'spread', from: 0, to: 5 })
    expect(line.driver).toEqual({ kind: 'lumpSum', amount: 6_000 })
  })
})

describe('unresolved condo inventory', () => {
  it('total revenue is withheld (known proceeds would understate it), with the reason', () => {
    const condo: CondoComponent = { kind: 'condo', id: 'c', units: [{ id: 'u', count: 10, netSqftPerUnit: 500, pricePerSqft: 1_000 }], salesStartMonth: 0, salesPerMonth: 1, depositFraction: 0.2, depositsUsable: false, occupancyMonths: 0, occupancyFeePerUnitMonthly: 0, commissionFraction: 0 }
    const m = runProject(tinyProject({ components: [condo] })).metrics.totalRevenue!
    expect(m.value).toBeNull()
    expect(m.missing).toContain('c:unsold-inventory')
  })
})

describe('portfolio inputs', () => {
  it('a non-finite or impossible discount rate is refused, not reported as a NaN NPV', () => {
    const plan = (discountRate: number) => ({ id: 'mp', name: 'MP', discountRate, costEscalation: 0, costLines: [], children: [{ offsetMonths: 0, node: tinyProject() }] })
    expect(() => runNode(plan(Number.NaN))).toThrow(/discountRate/)
    expect(() => runNode(plan(-1.5))).toThrow(/discountRate/)
    expect(() => runNode(plan(0.08))).not.toThrow()
  })
})

describe('site checks use each building\'s own scope', () => {
  const base: SiteFacts = { buildings: [], fsiLimit: 5, zbaPlanned: false, holding: false, exception: null, heritage: false, heritageDistrict: null, regulatedArea: false, greenbelt: false, nearAerodrome: false, protectedStationArea: false, residential: true, source: () => 'project-level source' }
  it('a block in a higher-density zone passes; one in the base zone fails, and the citation is the block\'s own', () => {
    const facts: SiteFacts = { ...base, buildings: [
      { name: 'Block A', storeys: 10, limitStoreys: null, limitMetres: null, airLimitStoreys: null, fsi: 7, fsiLimit: 8, source: () => 'Block A zone' },
      { name: 'Block B', storeys: 10, limitStoreys: null, limitMetres: null, airLimitStoreys: null, fsi: 6, fsiLimit: null, source: () => 'Block B zone' },
    ] }
    const fsi = siteInsights(facts).find((i) => i.id === 'fsi-over')!
    expect(fsi.title).toMatch(/6\.00 FSI against 5/)
    expect(fsi.detail).toMatch(/^Block B exceeds/)
    expect(fsi.source).toBe('Block B zone')
  })
})

describe('profit vs levered IRR', () => {
  it('explains a positive profit next to a negative levered IRR', () => {
    const ids = analyze({ items: [{ id: 'x', label: 'x', total: 100, bucket: 'construction', where: 'p' } as never], metrics: { profit: { value: 73e6 }, leveredIrr: { value: -0.031 }, unleveredIrr: { value: 0.027 } }, isMasterPlan: false }).insights.map((i) => i.id)
    expect(ids).toContain('profit-vs-irr')
  })
})

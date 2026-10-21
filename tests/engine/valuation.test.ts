// R7 (ASSESSMENT-2026-10-21): unstabilized exits, unsold condo inventory, matching profit-on-cost bases,
// gross portfolio equity multiple. IRR uniqueness is in primitives.test.ts.
import { describe, expect, it } from 'vitest'
import { runNode } from '../../src/engine/portfolio'
import { runProject, validateProject, type CondoComponent, type RentalComponent } from '../../src/engine/project'
import { tinyProject } from './fixtures'

describe('unstabilized exit', () => {
  // Tiny building: 2 units × $1,000, no opex, completion month 2, lease-up 4 months → 25/50/75/100% in months 3–6.
  // Exit month 4: forward stabilized NOI 24,000 ÷ 6% = 400,000. Still to lease: month 5 (1,500 of 2,000 → 500
  // short), month 6 (full). Lease-up adjustment 500 → value 399,500.
  const base = tinyProject()
  const rental = base.components[0] as RentalComponent
  const r = runProject({ ...base, components: [{ ...rental, leaseUpMonths: 4 }] })

  it('deducts the remaining lease-up shortfall from the stabilized value', () => {
    expect(r.metrics.leaseUpAdjustment!.value).toBe(500)
    expect(r.metrics.exitValue!.value).toBe(399_500)
    expect(r.warnings.join()).toMatch(/before stabilization \(month 6\).*\$500/)
  })
  it('a stabilized exit has no adjustment', () => {
    expect(runProject(base).metrics.leaseUpAdjustment!.value).toBe(0)
    expect(runProject(base).warnings.join()).not.toMatch(/before stabilization/)
  })
})

describe('unsold condo inventory', () => {
  // 10 units × 500 ft² × $1,000 = $500,000 each, one sale a month from month 0. By exit (month 4) 5 are sold.
  const condo: CondoComponent = {
    kind: 'condo', id: 'c', units: [{ id: 'u', count: 10, netSqftPerUnit: 500, pricePerSqft: 1_000 }], salesStartMonth: 0, salesPerMonth: 1,
    depositFraction: 0.2, depositsUsable: false, occupancyMonths: 0, occupancyFeePerUnitMonthly: 0, commissionFraction: 0,
  }
  const p = tinyProject({ components: [condo] })

  it('without a chosen disposition, dependent results are withheld (not assumed sold)', () => {
    const r = runProject(p)
    expect(r.missing).toContain('c:unsold-inventory')
    expect(r.metrics.profit!.value).toBeNull()
    expect(r.warnings.join()).toMatch(/5 units unsold at exit and no disposition chosen/)
  })
  it('a bulk sale sells the rest at exit at the discounted average price', () => {
    const r = runProject(tinyProject({ components: [{ ...condo, unsoldAtExit: { bulkSaleDiscount: 0.2 } }] }))
    expect(r.missing).toEqual([])
    const unbulked = runProject(tinyProject({ components: [{ ...condo, unsoldAtExit: { bulkSaleDiscount: 0.999 } }] })) // ~nothing for the bulk units
    expect(r.ledger[4]!.salesProceeds - unbulked.ledger[4]!.salesProceeds).toBeCloseTo(5 * 500_000 * (0.8 - 0.001), 0)
  })
  it('a final closing after exit is refused: sold units would never close', () => {
    expect(validateProject(tinyProject({ components: [{ ...condo, occupancyMonths: 3 }] })).join()).toMatch(/final closing \(month 5\)/)
  })
})

describe('profit on cost bases and equity multiple', () => {
  const r = runProject(tinyProject())
  const v = (id: string) => r.metrics[id]!.value!

  it('headline is after construction interest over TDC incl. it; the other excludes financing from both', () => {
    expect(v('capitalizedInterest')).toBe(250) // rental.test.ts: month 2 interest on 25,000
    expect(v('profitOnCost')).toBeCloseTo((v('profit') - 250) / v('totalDevelopmentCost'), 12)
    expect(v('profitOnCostBeforeFinancing')).toBeCloseTo(v('profit') / (v('totalDevelopmentCost') - 250), 12)
  })

  it('portfolio equity multiple uses gross child flows, not netted months', () => {
    const child = tinyProject()
    const mp = runNode({ id: 'mp', name: 'MP', discountRate: 0.1, costEscalation: 0, costLines: [{ id: 'park', label: 'Park', driver: { kind: 'lumpSum', amount: 10_000 }, timing: { kind: 'month', month: 0 }, estimateClass: 'C' }], children: [{ offsetMonths: 0, node: child }, { offsetMonths: 2, node: { ...child, id: 'b' } }] })
    const c = runProject(child).metrics
    expect(mp.metrics.equityMultiple!.value).toBeCloseTo((2 * c.equityReturned!.value!) / (10_000 + (2 * c.equityContributed!.value!)), 12)
  })
})

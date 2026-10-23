import { describe, expect, it } from 'vitest'
import { adjust, DEFAULT_APPRAISAL, directComparison, existingUseValue, monthsBetween, reconcile, type AppraisalInput, type Comparable } from '../../src/engine/landValue'

const comp = (over: Partial<Comparable> = {}): Comparable => ({ id: 'a', label: '1 Main St', saleDate: '2025-10-22', price: 12_000_000, acres: 1, buildableSqft: 200_000, adjustments: { location: 0, siteAndZoning: 0, other: 0 }, source: 'RealTrack', ...over })
const input = (over: Partial<AppraisalInput> = {}): AppraisalInput => ({ ...DEFAULT_APPRAISAL, effectiveDate: '2026-10-22', ...over })

describe('land value: direct comparison', () => {
  it('months between dates, and a sale a year old in a market falling 6% a year is adjusted down 6%', () => {
    expect(monthsBetween('2025-10-22', '2026-10-22')).toBe(12)
    expect(monthsBetween('bad', '2026-10-22')).toBeNull()
    const a = adjust(comp(), input({ marketChangePerYear: -0.06 }))
    expect(a.time).toBeCloseTo(-0.06, 10)
    expect(a.perBuildableSqft).toBeCloseTo(60 * 0.94, 10) // $12M ÷ 200,000 ft² = $60, less 6%
    expect(a.perAcre).toBeCloseTo(12_000_000 * 0.94, 4)
  })
  it('adds the adjustments (net) and flags a weak comparable past 15% net or 25% gross', () => {
    const a = adjust(comp({ adjustments: { location: 0.1, siteAndZoning: -0.1, other: 0.08 } }), input())
    expect(a.net).toBeCloseTo(0.08, 10)
    expect(a.gross).toBeCloseTo(0.28, 10)
    expect(a.weak).toBe(true)
    expect(adjust(comp({ adjustments: { location: 0.05, siteAndZoning: 0, other: 0 } }), input()).weak).toBe(false)
  })
  it('refuses a sale after the effective date or with a bad price, rather than guessing', () => {
    expect(adjust(comp({ saleDate: '2027-01-01' }), input()).problems).toContain('sale is after the effective date')
    expect(adjust(comp({ price: 0 }), input()).perBuildableSqft).toBeNull()
  })
  it('uses the median rate per buildable ft², and falls back to per acre when buildable area is unknown', () => {
    const comps = [comp({ id: 'a', price: 10e6 }), comp({ id: 'b', price: 12e6 }), comp({ id: 'c', price: 20e6 })]
    const d = directComparison(input({ comps }), { buildableSqft: 100_000, acres: 2 })!
    expect(d.basis).toBe('buildable ft²')
    expect(d.rate).toEqual({ low: 50, mid: 60, high: 100 })
    expect(d.mid).toBe(6_000_000)
    const byAcre = directComparison(input({ comps }), { buildableSqft: null, acres: 2 })!
    expect(byAcre.basis).toBe('acre')
    expect(byAcre.mid).toBe(24_000_000)
    expect(directComparison(input(), { buildableSqft: 100_000, acres: 2 })).toBeNull()
  })
})

describe('land value: existing use and reconciliation', () => {
  it('existing-use value is NOI ÷ cap rate, unknown when either is missing', () => {
    expect(existingUseValue(input({ existingUse: { noi: 300_000, capRate: 0.06 } }))).toBeCloseTo(5_000_000, 6)
    expect(existingUseValue(input({ existingUse: { noi: 300_000, capRate: null } }))).toBeNull()
  })
  it('weights comparables against the residual, spans the indications, and tests the existing-use floor with the margin', () => {
    const comps = { basis: 'buildable ft²' as const, used: 3, rate: { low: 50, mid: 60, high: 100 }, low: 5e6, mid: 6e6, high: 10e6 }
    const r = reconcile(comps, 8e6, 6.5e6, input({ comparablesWeight: 0.25 }))
    expect(r.value).toBeCloseTo(7.5e6, 6) // 25% × 6M + 75% × 8M
    expect([r.low, r.high]).toEqual([5e6, 10e6])
    expect(r.redevelopmentMakesSense).toBe(true) // 7.5M ≥ 6.5M × 1.1 = 7.15M
    expect(reconcile(comps, 8e6, 7e6, input({ comparablesWeight: 0.25 })).redevelopmentMakesSense).toBe(false) // needs 7.7M
  })
  it('with one approach it carries all the weight; with none, the value is unknown', () => {
    expect(reconcile(null, 8e6, null, input()).value).toBe(8e6)
    expect(reconcile(null, null, 5e6, input()).value).toBeNull()
    expect(reconcile(null, null, 5e6, input()).redevelopmentMakesSense).toBeNull()
  })
})

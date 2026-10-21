import { describe, expect, it } from 'vitest'
import { annualizeMonthly, annuityPayment, annuityPresentValue, irr, monthlyFromEffectiveAnnual, npv, sizeLoan } from '../../src/engine/finance'
import { roundCents, sumCents } from '../../src/engine/money'

describe('roundCents (C3, half-even)', () => {
  it.each([
    [0.125, 0.12], // tie → even
    [0.135, 0.14], // tie → even
    [2.675, 2.68], // float 267.4999… treated as the decimal tie it represents
    [-0.125, -0.12],
    [1.234, 1.23],
    [1.236, 1.24],
    [-0.001, 0], // no -0
  ])('%d → %d', (input, expected) => expect(roundCents(input)).toBe(expected))

  it('sums ten 0.1s to exactly 1', () => expect(sumCents(Array(10).fill(0.1))).toBe(1))
})

describe('time value', () => {
  it('annuity: $100,000 at 5%/12 over 360 months = $536.82', () => {
    expect(roundCents(annuityPayment(100_000, 0.05 / 12, 360))).toBe(536.82)
  })
  it('annuity at zero rate is straight-line (no divide by zero)', () => {
    expect(annuityPayment(1200, 0, 12)).toBe(100)
    expect(annuityPresentValue(100, 0, 12)).toBe(1200)
  })
  it('annuity PV inverts payment', () => {
    expect(annuityPresentValue(annuityPayment(500_000, 0.005, 300), 0.005, 300)).toBeCloseTo(500_000, 6)
  })
  it('npv discounts period ends, period 0 undiscounted', () => {
    expect(npv(0.1, [-100, 110])).toBeCloseTo(0, 10)
    expect(npv(0.1, [-100, 0, 121])).toBeCloseTo(0, 10)
  })
  it('effective annual ↔ monthly round-trips (C4)', () => {
    expect(annualizeMonthly(monthlyFromEffectiveAnnual(0.08))).toBeCloseTo(0.08, 12)
  })
})

describe('irr', () => {
  it('[-100, 110] → 10% per period', () => expect(irr([-100, 110]).rate).toBeCloseTo(0.1, 10))
  it('[-100, 0, 121] → 10% per period', () => expect(irr([-100, 0, 121]).rate).toBeCloseTo(0.1, 10))
  it('total loss has no sign change → unavailable, not a fake number', () => expect(irr([-100, 0]).rate).toBeNull())
  it('no sign change → unavailable with a reason', () => {
    const result = irr([100, 50])
    expect(result.rate).toBeNull()
    expect(result.warnings[0]).toMatch(/never change sign/)
  })
  it('multiple sign changes are flagged', () => {
    expect(irr([-100, 230, -132]).warnings.join()).toMatch(/not be unique/)
  })
})

describe('sizeLoan (C13)', () => {
  // NOI 120,000 ÷ DSCR 1.25 = 96,000/yr = 8,000/mo. 0% over 25 yrs (300 mo) → 2,400,000.
  // Value 2,000,000 × 65% = 1,300,000. Cost 3,000,000 × 70% = 2,100,000. LTV binds.
  const base = { noiAnnual: 120_000, value: 2_000_000, cost: 3_000_000, annualRate: 0, amortizationYears: 25, dscr: 1.25, ltv: 0.65, ltc: 0.7 }

  it('takes the minimum and names the binding constraint (PF-008: LTV applies)', () => {
    const sized = sizeLoan(base)
    expect(sized.capacities).toEqual({ dscr: 2_400_000, ltv: 1_300_000, ltc: 2_100_000 })
    expect(sized.amount).toBe(1_300_000)
    expect(sized.binding).toBe('ltv')
  })
  it('PF-001: DSCR divides NOI, it does not subtract the ratio', () => {
    const sized = sizeLoan({ ...base, value: 5_000_000, ltv: 1, ltc: 1 }) // value and cost caps 5.0M and 3.0M sit above DSCR's 2.4M
    expect(sized.binding).toBe('dscr')
    expect(sized.amount).toBe(2_400_000)
  })
  it('negative NOI gives zero DSCR capacity, never a positive loan', () => {
    const sized = sizeLoan({ ...base, noiAnnual: -5_000 })
    expect(sized.amount).toBe(0)
    expect(sized.warnings).toHaveLength(1)
  })
})

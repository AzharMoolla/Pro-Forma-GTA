import { describe, expect, it } from 'vitest'
import demo from '../../data/projects/demo-rental.json'
import { npv } from '../../src/engine/finance'
import { runRental, validateRentalInput, type RentalInput } from '../../src/engine/rental'

// Hand-derived fixture. Every expected number below is worked out in the comments, not copied from engine output.
//
// 2 units × $1,000/mo, 0% vacancy, no opex. GCA 1,000 ft² × $100 = hard $100,000. Land $50,000. No soft/contingency/levies.
// Build months 1–2, operating from month 3, exit at month 4. Debt 12%/yr nominal = 1%/mo, LTC 50%.
// Budget 150,000 → equity required 75,000.
//   m0  land 50,000         equity 50,000
//   m1  hard 50,000         equity 25,000, debt 25,000, interest on opening 0 = 0
//   m2  hard 50,000         debt 50,000, interest 25,000 × 1% = 250 capitalized → closing 75,250
//   m3  NOI 2,000           interest 752.50 paid → equity +1,247.50
//   m4  NOI 2,000           interest 752.50; sale 24,000 ÷ 6% = 400,000; repay 75,250
//                           equity +1,247.50 + 400,000 − 75,250 = 325,997.50
const tiny: RentalInput = {
  unitMix: [{ id: 'one_bed', count: 2, netSqftPerUnit: 500, monthlyRent: 1000, vacancy: 0 }],
  lotAreaSqft: 2000,
  planningGfaSqft: 900,
  gcaAboveSqft: 1000,
  gcaBelowSqft: 0,
  landCost: 50_000,
  levies: 0,
  hardCostPerGcaSqft: 100,
  softCostFraction: 0,
  contingencyFraction: 0,
  opexPerUnitMonthly: 0,
  otherIncomeMonthly: 0,
  timing: { preConstructionMonths: 0, constructionMonths: 2, leaseUpMonths: 0, exitMonth: 4 },
  debt: { annualRate: 0.12, ltc: 0.5, ltv: 0.65, dscr: 1.25, amortizationYears: 25 },
  exit: { capRate: 0.06, sellingCostFraction: 0 },
  discountRate: 0.1,
}

describe('runRental: hand-derived fixture', () => {
  const result = runRental(tiny)
  const row = (m: number) => result.ledger[m]!

  it('funds equity first, then debt (C8)', () => {
    expect([0, 1, 2].map((m) => row(m).equityDraw)).toEqual([50_000, 25_000, 0])
    expect([0, 1, 2].map((m) => row(m).debtDraw)).toEqual([0, 25_000, 50_000])
  })

  it('accrues interest on the opening balance and capitalizes it during construction (C9, PF-004)', () => {
    expect(row(1).interest).toBe(0)
    expect(row(2).interestCapitalized).toBe(250)
    expect(row(2).closingDebt).toBe(75_250)
    expect(row(3).interest).toBe(752.5)
    expect(row(3).interestCapitalized).toBe(0)
  })

  it('produces the expected cash flows', () => {
    expect(result.ledger.map((r) => r.projectCashFlow)).toEqual([-50_000, -50_000, -50_000, 2_000, 402_000])
    expect(result.ledger.map((r) => r.equityCashFlow)).toEqual([-50_000, -25_000, 0, 1_247.5, 325_997.5])
  })

  it('reconciles: sources = uses and the debt ledger closes to zero', () => {
    expect(result.checks).toEqual({ sourcesEqualUses: true, ledgerCloses: true })
  })

  it('reports metrics with their basis', () => {
    const m = result.metrics
    expect(m.totalDevelopmentCost!.value).toBe(150_250)
    expect(m.stabilizedNoi!.value).toBe(24_000)
    expect(m.exitValue!.value).toBe(400_000)
    expect(m.equityContributed!.value).toBe(75_000)
    expect(m.equityMultiple!.value).toBeCloseTo(327_245 / 75_000, 12) // PF-009: equity, not loan, is the denominator
    expect(m.peakDebt!.value).toBe(75_250)
    expect(m.yieldOnCost!.value).toBeCloseTo(24_000 / 150_250, 12)
    expect(m.fsi!.value).toBeCloseTo(0.45, 12) // 900 ÷ 2,000
    expect(m.efficiency!.value).toBeCloseTo(1, 12) // 1,000 NSF ÷ 1,000 GCA
  })

  it('IRRs are true roots of their cash flows', () => {
    const monthly = (annual: number) => (1 + annual) ** (1 / 12) - 1
    expect(npv(monthly(result.metrics.unleveredIrr!.value!), result.ledger.map((r) => r.projectCashFlow))).toBeCloseTo(0, 4)
    expect(npv(monthly(result.metrics.leveredIrr!.value!), result.ledger.map((r) => r.equityCashFlow))).toBeCloseTo(0, 4)
  })

  it('warns when capitalized interest pushes the loan past LTC', () => {
    // 75,250 ÷ 150,250 = 50.08% > 50%
    expect(result.warnings.join()).toMatch(/above the LTC limit/)
  })
})

describe('runRental: conventions and audit regressions', () => {
  it('C11 linear lease-up to stabilized occupancy', () => {
    const r = runRental({ ...tiny, timing: { ...tiny.timing, leaseUpMonths: 4, exitMonth: 8 } })
    expect(r.ledger.slice(3, 8).map((x) => x.revenue)).toEqual([500, 1_000, 1_500, 2_000, 2_000])
    expect(r.ledger.slice(3, 8).map((x) => x.phase)).toEqual(['lease-up', 'lease-up', 'lease-up', 'stabilized', 'stabilized'])
  })

  it('PF-002: each unit type uses its own vacancy', () => {
    const r = runRental({
      ...tiny,
      unitMix: [
        { id: 'studio', count: 10, netSqftPerUnit: 40, monthlyRent: 1000, vacancy: 0.1 }, // 9,000/mo
        { id: 'one_bed', count: 10, netSqftPerUnit: 60, monthlyRent: 2000, vacancy: 0 }, // 20,000/mo
      ],
    })
    expect(r.metrics.stabilizedNoi!.value).toBe(29_000 * 12)
  })

  it('PF-005: FSI uses by-law GFA and is withheld without it, never GCA', () => {
    const r = runRental({ ...tiny, planningGfaSqft: null, gcaBelowSqft: 5_000 })
    expect(r.metrics.fsi!.value).toBeNull()
  })

  it('straight-line spend ties exactly when the total does not divide evenly', () => {
    const r = runRental({ ...tiny, hardCostPerGcaSqft: 100.01, timing: { ...tiny.timing, constructionMonths: 3, exitMonth: 5 } })
    const hard = r.ledger.map((x) => x.hard)
    expect(hard.slice(1, 4)).toEqual([33_336.67, 33_336.67, 33_336.66])
    expect(r.checks.sourcesEqualUses).toBe(true)
  })

  it('operating shortfalls are funded by equity and counted as contributions', () => {
    const r = runRental({ ...tiny, opexPerUnitMonthly: 1_500 }) // NOI = 2,000 − 3,000 = −1,000/mo
    expect(r.ledger[3]!.equityDraw).toBe(1_752.5) // 1,000 shortfall + 752.50 interest
    expect(r.metrics.maxPermanentLoan!.value).toBe(0)
  })

  it('C16: unknown levies withhold cost-dependent results instead of treating them as zero', () => {
    const r = runRental({ ...tiny, levies: null })
    expect(r.complete).toBe(false)
    expect(r.missing).toEqual(['levies'])
    expect(r.metrics.leveredIrr!.value).toBeNull()
    expect(r.metrics.leveredIrr!.missing).toEqual(['levies'])
    expect(r.metrics.stabilizedNoi!.value).toBe(24_000) // not cost-dependent, still shown
  })

  it('levies post at construction start', () => {
    const r = runRental({ ...tiny, levies: 10_000, timing: { ...tiny.timing, preConstructionMonths: 2, exitMonth: 6 } })
    expect(r.ledger.findIndex((x) => x.levies > 0)).toBe(3)
    expect(r.checks).toEqual({ sourcesEqualUses: true, ledgerCloses: true })
  })

  it('rejects invalid input at the boundary with every reason', () => {
    const errors = validateRentalInput({ ...tiny, timing: { ...tiny.timing, exitMonth: 2 }, debt: { ...tiny.debt, ltc: 1.2 } })
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/exitMonth/), expect.stringMatching(/ltc/)]))
    expect(() => runRental({ ...tiny, exit: { ...tiny.exit, capRate: 0 } })).toThrow(/capRate/)
  })
})

describe('synthetic 120-unit Oshawa demo', () => {
  const result = runRental(demo.input as RentalInput)

  it('runs, reconciles, and withholds results until levies are verified', () => {
    expect(result.checks).toEqual({ sourcesEqualUses: true, ledgerCloses: true })
    expect(result.complete).toBe(false)
    expect(result.metrics.totalUnits!.value).toBe(120)
    expect(result.metrics.leveredIrr!.value).toBeNull()
  })

  it('produces full results once levies are supplied', () => {
    const r = runRental({ ...(demo.input as RentalInput), levies: 0 })
    expect(r.complete).toBe(true)
    expect(r.metrics.unleveredIrr!.value).not.toBeNull()
    expect(r.ledger).toHaveLength(61)
  })
})

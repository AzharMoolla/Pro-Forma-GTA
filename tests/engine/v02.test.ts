import { describe, expect, it } from 'vitest'
import { lineTotals, scheduleLine, validateCostLines, type CostLine } from '../../src/engine/costs'
import { runNode, type PortfolioInput } from '../../src/engine/portfolio'
import { runProject, type ProjectInput, type RentalComponent } from '../../src/engine/project'
import { listUncertainties, percentile, rng, simulate, tornado, triangular } from '../../src/engine/uncertainty'
import { tinyProject } from './fixtures'

const line = (over: Partial<CostLine> & Pick<CostLine, 'id' | 'driver'>): CostLine => ({ label: over.id, timing: { kind: 'month', month: 0 }, estimateClass: 'C', ...over })

describe('cost lines', () => {
  it('percentOf chains resolve; unknowns propagate; cycles and dangling refs are refused', () => {
    const totals = lineTotals([
      line({ id: 'hard', driver: { kind: 'perArea', rate: 300, area: 1_000 } }), // 300,000
      line({ id: 'soft', driver: { kind: 'percentOf', rate: 0.15, of: ['hard'] } }), // 45,000
      line({ id: 'contingency', driver: { kind: 'percentOf', rate: 0.1, of: ['hard', 'soft'] } }), // 34,500
      line({ id: 'levies', driver: null }),
      line({ id: 'levyAdmin', driver: { kind: 'percentOf', rate: 0.01, of: ['levies'] } }),
    ])
    expect([...totals.entries()]).toEqual([['hard', 300_000], ['soft', 45_000], ['contingency', 34_500], ['levies', null], ['levyAdmin', null]])
    expect(validateCostLines([line({ id: 'a', driver: { kind: 'percentOf', rate: 1, of: ['b'] } }), line({ id: 'b', driver: { kind: 'percentOf', rate: 1, of: ['a'] } })]).join()).toMatch(/depends on itself/)
    expect(validateCostLines([line({ id: 'a', driver: { kind: 'percentOf', rate: 1, of: ['zzz'] } })]).join()).toMatch(/unknown cost line "zzz"/)
  })

  it('drivers: per unit, per linear metre, per hectare', () => {
    const totals = lineTotals([
      line({ id: 'tarion', driver: { kind: 'perUnit', rate: 1_500, units: 10 } }),
      line({ id: 'road', driver: { kind: 'perLinear', rate: 4_000, metres: 250 } }),
      line({ id: 'grading', driver: { kind: 'perHectare', rate: 60_000, hectares: 2.5 } }),
    ])
    expect([...totals.values()]).toEqual([15_000, 1_000_000, 150_000])
  })

  it('C19 escalation: 1,200 over months 1–2 at 12%/yr → 600 × 1.12^(1/12) and 600 × 1.12^(2/12)', () => {
    const schedule = scheduleLine(1_200, line({ id: 'x', driver: null, timing: { kind: 'spread', from: 1, to: 2 }, escalate: true }), { preConstructionMonths: 0, constructionMonths: 1, escalation: 0.12 })
    expect([...schedule.entries()]).toEqual([[1, 605.69], [2, 611.44]])
  })
})

describe('rental growth', () => {
  // 10%/yr growth steps at month 12 and 24. Exit month 14 → forward NOI = months 15–23 at 2,200 (9) + months 24–26 at 2,420 (3)
  // = 19,800 + 7,260 = 27,060 → sale 27,060 ÷ 6% = 451,000.
  const base = tinyProject()
  const rental = base.components[0] as RentalComponent
  const r = runProject({ ...base, timing: { ...base.timing, exitMonth: 14 }, components: [{ ...rental, rentGrowth: 0.1 }] })

  it('steps rents every 12 months', () => {
    expect(r.ledger[11]!.revenue).toBe(2_000)
    expect(r.ledger[12]!.revenue).toBe(2_200)
  })
  it('values the exit on trended forward NOI', () => {
    expect(r.metrics.forwardNoi!.value).toBe(27_060)
    expect(r.metrics.exitValue!.value).toBe(451_000)
    expect(r.metrics.stabilizedNoi!.value).toBe(24_000) // yield on cost stays untrended
  })
})

describe('refinance at stabilization', () => {
  // Month 3: forward NOI 24,000; value 400,000. Perm 0% over 10 yrs, DSCR 1.2 → 200,000; LTV 45% → 180,000 (binds).
  // Fee 1% = 1,800. Construction payoff 75,250. Net to equity 180,000 − 1,800 − 75,250 = 102,950, plus month-3 surplus 1,247.50.
  // Perm payment 180,000 ÷ 120 = 1,500/mo → months 4–6 equity 2,000 − 1,500 = 500.
  // Exit month 6: perm balance 180,000 − 3 × 1,500 = 175,500 → 400,000 − 175,500 + 500 = 225,000.
  const base = tinyProject()
  const r = runProject({ ...base, timing: { ...base.timing, exitMonth: 6 }, debt: { ...base.debt, refinance: { month: 3, annualRate: 0, amortizationYears: 10, dscr: 1.2, ltv: 0.45, feeFraction: 0.01 } } })

  it('repays construction, funds the permanent loan and distributes the excess', () => {
    expect(r.metrics.permanentLoan!.value).toBe(180_000)
    expect(r.metrics.permanentLoan!.basis).toMatch(/LTV/)
    expect(r.ledger.map((x) => x.equityCashFlow)).toEqual([-50_000, -25_000, 0, 104_197.5, 500, 500, 225_000])
    expect(r.ledger.map((x) => x.permClosing)).toEqual([0, 0, 0, 180_000, 178_500, 177_000, 0])
    expect(r.checks).toEqual({ sourcesEqualUses: true, ledgerCloses: true })
  })
  it('leaves unlevered cash flows untouched', () => {
    expect(r.ledger.map((x) => x.projectCashFlow)).toEqual([-50_000, -50_000, -50_000, 2_000, 2_000, 2_000, 402_000])
  })
})

describe('condo', () => {
  // 10 units × 1,000 ft² × $500 = $500,000 each. Sales start month 0 at 5/month → sold out month 1. Deposits 20% held in trust.
  // Land 1,000,000 (m0); hard 2,000,000 over m1–m2. LTC 60% → equity 1,200,000. Loan 1%/mo.
  //   m0 equity 1,000,000 · m1 equity 200,000 + debt 800,000 · m2 debt 1,000,000 + interest 8,000 → 1,808,000
  //   m3 final closing (1 month occupancy, fee 0): 10 × 500,000 = 5,000,000; commission 5% = 250,000; interest 18,080 paid
  //      cash 4,731,920 → sweep repays 1,808,000 → equity 2,923,920
  const condo: ProjectInput = {
    id: 'condo', name: 'Condo',
    timing: { preConstructionMonths: 0, constructionMonths: 2, exitMonth: 3 },
    costEscalation: 0,
    costLines: [
      line({ id: 'land', driver: { kind: 'lumpSum', amount: 1_000_000 }, estimateClass: 'exact' }),
      line({ id: 'hard', driver: { kind: 'lumpSum', amount: 2_000_000 }, timing: { kind: 'construction' } }),
    ],
    components: [{
      kind: 'condo', id: 'tower', units: [{ id: '1b', count: 10, netSqftPerUnit: 1_000, pricePerSqft: 500 }],
      salesStartMonth: 0, salesPerMonth: 5, depositFraction: 0.2, depositsUsable: false,
      occupancyMonths: 1, occupancyFeePerUnitMonthly: 0, commissionFraction: 0.05,
    }],
    debt: { annualRate: 0.12, ltc: 0.6, ltv: 0.65, dscr: 1.25, amortizationYears: 25, sweepAfterCompletion: true, presaleThreshold: 0.7 },
    exit: { sellingCostFraction: 0 },
    discountRate: 0.1,
  }
  const r = runProject(condo)

  it('holds deposits in trust until closing, then closes and sweeps the loan', () => {
    expect(r.ledger.map((x) => x.depositsHeld)).toEqual([500_000, 1_000_000, 1_000_000, 0])
    expect(r.ledger.map((x) => x.salesProceeds)).toEqual([0, 0, 0, 5_000_000])
    expect(r.ledger[3]!.costs['tower:commission']).toBe(250_000)
    expect(r.ledger.map((x) => x.equityCashFlow)).toEqual([-1_000_000, -200_000, 0, 2_923_920])
    expect(r.ledger[3]!.repayment).toBe(1_808_000)
    expect(r.checks).toEqual({ sourcesEqualUses: true, ledgerCloses: true })
  })
  it('reports condo metrics and no exit value', () => {
    expect(r.metrics.totalDevelopmentCost!.value).toBe(3_258_000) // 3,000,000 + 8,000 interest + 250,000 commission
    expect(r.metrics.profit!.value).toBe(1_750_000)
    expect(r.metrics.peakDepositsHeld!.value).toBe(1_000_000)
    expect(r.metrics.exitValue!.value).toBe(0)
    expect(r.warnings.join()).not.toMatch(/Presales/)
  })
  it('flags presales below the lender threshold', () => {
    const late = runProject({ ...condo, components: [{ ...(condo.components[0] as Extract<ProjectInput['components'][number], { kind: 'condo' }>), salesStartMonth: 1, salesPerMonth: 5 }] })
    expect(late.warnings.join()).toMatch(/Presales at construction start are 50.0%, below the 70%/)
  })
})

describe('commercial', () => {
  // 10,000 ft² at $30/ft²/yr = 25,000/mo. No lease-up ramp, 1 free month. TI $50 + LC $5 paid when leased (month 3).
  const base = tinyProject()
  const r = runProject({
    ...base,
    components: [{ kind: 'commercial', id: 'retail', use: 'retail', netLeasableSqft: 10_000, rentPerSqftYear: 30, rentGrowth: 0, vacancy: 0, leaseUpMonths: 0, freeRentMonths: 1, tiPerSqft: 50, leasingCommissionPerSqft: 5, unrecoveredOpexPerSqftYear: 0, exitCapRate: 0.06 }],
  })
  it('pays TI and leasing at lease-up, rent after free months', () => {
    expect(r.ledger[3]!.costs['retail:ti']).toBe(500_000)
    expect(r.ledger[3]!.costs['retail:leasing']).toBe(50_000)
    expect(r.ledger.map((x) => x.revenue)).toEqual([0, 0, 0, 0, 25_000])
    expect(r.metrics.exitValue!.value).toBe(5_000_000) // 300,000 ÷ 6%
  })
})

describe('portfolio roll-up', () => {
  const a = tinyProject({ id: 'a', name: 'A' })
  const b = tinyProject({ id: 'b', name: 'B' })
  const mp: PortfolioInput = {
    id: 'mp', name: 'Master plan', discountRate: 0.1, costEscalation: 0,
    costLines: [line({ id: 'road', driver: { kind: 'perLinear', rate: 100, metres: 100 }, timing: { kind: 'month', month: 1 } })],
    children: [{ offsetMonths: 0, node: a }, { offsetMonths: 3, node: b }],
  }
  const r = runNode(mp)
  const child = runProject(a).ledger.map((x) => x.projectCashFlow) // [-50,000, -50,000, -50,000, 2,000, 402,000]

  it('sums offset children and its own shared costs month by month', () => {
    expect(r.projectCashFlow).toEqual([-50_000, -60_000, -50_000, -48_000, 352_000, -50_000, 2_000, 402_000])
    expect(r.metrics.profit!.value).toBe(2 * child.reduce((s, v) => s + v, 0) - 10_000)
    expect(r.metrics.totalUnits!.value).toBe(4)
    expect(r.metrics.sharedCosts!.value).toBe(10_000)
  })
  it('propagates unknowns with their path and withholds results', () => {
    const incomplete = runNode({ ...mp, children: [{ offsetMonths: 0, node: { ...a, costLines: a.costLines.map((l) => (l.id === 'levies' ? { ...l, driver: null } : l)) } }] })
    expect(incomplete.missing).toEqual(['mp/a/levies'])
    expect(incomplete.metrics.leveredIrr!.value).toBeNull()
    expect(incomplete.metrics.totalUnits!.value).toBe(2)
  })
})

describe('uncertainty', () => {
  it('rng is deterministic per seed', () => {
    const a = rng(42)
    const b = rng(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('triangular inverse CDF hits its bounds and mode', () => {
    expect(triangular(0, 0.7, 1, 1.5)).toBeCloseTo(0.7, 12)
    expect(triangular(1, 0.7, 1, 1.5)).toBeCloseTo(1.5, 12)
    expect(triangular(0.375, 0.7, 1, 1.5)).toBeCloseTo(1, 12) // F(mode) = (1 − 0.7) ÷ (1.5 − 0.7)
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5)
  })
  it('lists class bands as uncertainties; exact lines carry none', () => {
    expect(listUncertainties(tinyProject()).map((u) => u.key)).toEqual(['tiny/cost:hard', 'tiny/cost:soft', 'tiny/cost:contingency'])
  })
  it('same seed → same P-values; P10 ≤ P50 ≤ P90; base sits inside', () => {
    const p = tinyProject()
    const s1 = simulate(p, { draws: 300, seed: 7, metrics: ['unleveredIrr', 'totalDevelopmentCost'] })
    const s2 = simulate(p, { draws: 300, seed: 7, metrics: ['unleveredIrr', 'totalDevelopmentCost'] })
    expect(s1).toEqual(s2)
    const tdc = s1.metrics.totalDevelopmentCost!
    expect(tdc.p10!).toBeLessThanOrEqual(tdc.p50!)
    expect(tdc.p50!).toBeLessThanOrEqual(tdc.p90!)
    expect(tdc.p10!).toBeLessThan(tdc.base!) // class C band: −20% / +30% on hard
    expect(tdc.p90!).toBeGreaterThan(tdc.base!)
  })
  it('a model with no bands has a zero-width distribution', () => {
    const p = tinyProject()
    const exact = { ...p, costLines: p.costLines.map((l) => ({ ...l, estimateClass: 'exact' as const })) }
    const s = simulate(exact, { draws: 20, seed: 1, metrics: ['totalDevelopmentCost'] }).metrics.totalDevelopmentCost!
    expect([s.p10, s.p50, s.p90]).toEqual([s.base, s.base, s.base])
  })
  it('tornado ranks hard cost above soft and contingency (both zero here)', () => {
    const t = tornado(tinyProject(), 'unleveredIrr')
    expect(t.bars[0]!.key).toBe('tiny/cost:hard')
    expect(t.bars[0]!.swing).toBeGreaterThan(0)
  })
  it('refuses to simulate an incomplete model', () => {
    const p = tinyProject()
    const incomplete = { ...p, costLines: p.costLines.map((l) => (l.id === 'levies' ? { ...l, driver: null } : l)) }
    expect(() => simulate(incomplete, { draws: 10, seed: 1, metrics: ['profit'] })).toThrow(/levies/)
  })
})

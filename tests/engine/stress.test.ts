import { describe, expect, it } from 'vitest'
import { funding } from '../../src/engine/funding'
import { runNode } from '../../src/engine/portfolio'
import { runProject } from '../../src/engine/project'
import { downside, landTotal, solve, stress } from '../../src/engine/stress'
import { hstTiming } from '../../src/engine/tax'
import { tinyProject } from './fixtures'

describe('funding gap', () => {
  it('compares the loan with LTC × full budget (hand-derived)', () => {
    // Land 50k (equity), month 1: 50k cost → 25k equity (to 75k = 50% of 150k) + 25k debt.
    // Month 2: 250 interest capitalized (25k × 1%), 50k debt → 75,250. Limit 0.5 × (150k + 250) = 75,125.
    const p = tinyProject()
    const f = funding(p, runProject(p))
    expect(f.facilityLimit).toBe(75_125)
    expect(f.peakDebt).toBe(75_250)
    expect(f.peakDebtMonth).toBe(2)
    expect(f.constructionGap).toBe(125) // the equity share of capitalized interest
    expect(f.peakEquity).toBe(75_000)
    expect(f.exitGap).toBe(0)
    expect(f.refinance).toBeNull()
  })

  it('shows the equity call when a refinance does not repay the construction loan', () => {
    const p = tinyProject({ timing: { preConstructionMonths: 0, constructionMonths: 2, exitMonth: 6 } })
    p.debt = { ...p.debt, refinance: { month: 4, annualRate: 0.05, amortizationYears: 25, dscr: 1.25, ltv: 0.1, feeFraction: 0.01 } }
    const f = funding(p, runProject(p))
    expect(f.refinance!.constructionBalance).toBeGreaterThan(f.refinance!.netProceeds)
    expect(f.refinance!.gap).toBeCloseTo(f.refinance!.constructionBalance - f.refinance!.netProceeds, 2)
  })
})

describe('stress and solve', () => {
  it('is the identity with no stress, and moves timing, rates and costs', () => {
    const p = tinyProject()
    expect(stress(p, {})).toEqual(p)
    const s = stress(p, { delayMonths: 3, rateBps: 100, cost: 1.1, land: 2 }) as typeof p
    expect(s.timing).toEqual({ ...p.timing, constructionMonths: 5, exitMonth: 7 })
    expect(s.debt.annualRate).toBeCloseTo(0.13, 10)
    expect(landTotal(s)).toBe(100_000)
    expect(runProject(s).metrics.totalDevelopmentCost!.value!).toBeGreaterThan(runProject(p).metrics.totalDevelopmentCost!.value!)
  })

  it('residual land value hits the target return exactly', () => {
    const p = tinyProject()
    const s = solve(p, 'land', 'profitOnCost', 0.15)
    expect(s.multiplier).not.toBeNull()
    const poc = runNode(stress(p, { land: s.multiplier! })).metrics.profitOnCost!.value!
    expect(poc).toBeCloseTo(0.15, 4)
  })

  it('break-even revenue gives zero profit on cost; unreachable targets say why', () => {
    const p = tinyProject()
    const s = solve(p, 'revenue', 'profitOnCost', 0)
    expect(runNode(stress(p, { revenue: s.multiplier! })).metrics.profitOnCost!.value!).toBeCloseTo(0, 4)
    const none = solve(p, 'land', 'profitOnCost', 50)
    expect(none.multiplier).toBeNull()
  })

  it('combined downside is worse than any single shock', () => {
    const rows = downside(tinyProject())
    const poc = (id: string) => rows.find((r) => r.id === id)!.result!.metrics.profitOnCost!.value!
    for (const id of ['cost', 'delay', 'rate', 'revenue']) expect(poc('combined')).toBeLessThan(poc(id))
    expect(poc('base')).toBeGreaterThan(poc('combined'))
    expect(rows.every((r) => r.fundingGap !== null)).toBe(true)
  })
})

describe('HST timing (rental self-supply)', () => {
  // Hard cost 100k over months 1–2 → 6,500 HST each month, recovered 2 months later. FMV = 24k NOI ÷ 6% = 400k.
  it('pays, recovers and self-assesses (hand-derived)', () => {
    const h = hstTiming(tinyProject(), { rebate: 'standard', itcLagMonths: 2 })
    expect(h.fmv).toBe(400_000)
    expect(h.taxOnFmv).toBe(52_000)
    expect(h.months.map((m) => m.paid)).toEqual([0, 6500, 6500, 0, 0])
    expect(h.months.map((m) => m.recovered)).toEqual([0, 0, 0, 6500, 6500])
    expect(h.peakOutstanding).toBe(13_000)
    // $200k per unit: federal 36% × 5% = 3,600; Ontario 75% × 8% = 12,000; × 2 units
    expect(h.rebate).toBe(31_200)
    expect(h.netCost).toBe(20_800)
    expect(h.exemptLines).toEqual(['Land', 'Levies'])
  })

  it('the enhanced rental rebate removes the permanent cost but not the timing', () => {
    const h = hstTiming(tinyProject(), { rebate: 'enhanced', itcLagMonths: 2 })
    expect(h.netCost).toBe(0)
    expect(h.peakOutstanding).toBe(13_000)
    expect(h.carryCost).toBeGreaterThan(0)
  })
})

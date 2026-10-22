import { describe, expect, it } from 'vitest'
import { AFFORDABLE_SHARE, affordability, canadianMortgageMonthlyRate, implications, OWNERSHIP_DEFAULTS, type AreaProfile } from '../../src/engine/affordability'
import type { CondoComponent, RentalComponent } from '../../src/engine/project'
import { tinyProject } from './fixtures'

const area: AreaProfile = { income: 60_000, incomeGrowth: 0.02, avgHouseholdSize: 2, age0to14Share: 0.15, age65PlusShare: 0.2, employmentRate: 0.6, transitCommuteShare: 0.4 }

describe('affordability', () => {
  it('rent $1,000/month against a $60,000 income is 20% in the first year of occupancy', () => {
    // tiny project: occupancy starts in year 0 (completion month 2); no rent growth
    const [row] = affordability(tinyProject(), area)
    expect(row!.monthlyCost).toBe(1_000)
    expect(row!.incomeNeeded).toBe(40_000) // 12,000 ÷ 30%
    expect(row!.shares[0]).toBeCloseTo(0.2, 10)
    expect(row!.shares[1]).toBeCloseTo(0.2 / 1.02, 10) // incomes grow, rent does not
  })

  it('rents growing faster than incomes push the share up over time', () => {
    const p = tinyProject()
    const rental = { ...(p.components[0] as RentalComponent), rentGrowth: 0.05 }
    const [row] = affordability({ ...p, components: [rental] }, area)
    expect(row!.shares[9]!).toBeGreaterThan(row!.shares[0]!)
  })

  it('ownership cost uses a semi-annually compounded mortgage, fees and tax', () => {
    expect(canadianMortgageMonthlyRate(0.05)).toBeCloseTo(0.0041239, 6)
    const condo: CondoComponent = { kind: 'condo', id: 'c', units: [{ id: '1bd', count: 10, netSqftPerUnit: 600, pricePerSqft: 1_000 }], salesStartMonth: 0, salesPerMonth: 5, depositFraction: 0.2, depositsUsable: false, occupancyMonths: 0, occupancyFeePerUnitMonthly: 0, commissionFraction: 0 }
    const [row] = affordability(tinyProject({ components: [condo] }), { ...area, income: 120_000 })
    // $600,000: $480,000 over 25 years ≈ $2,792/month, fees 600 × $0.75 = $450, tax 0.7% ÷ 12 = $350
    expect(row!.tenure).toBe('ownership')
    expect(row!.monthlyCost).toBeGreaterThan(3_580)
    expect(row!.monthlyCost).toBeLessThan(3_600)
    expect(row!.shares[0]!).toBeGreaterThan(AFFORDABLE_SHARE)
    expect(OWNERSHIP_DEFAULTS.downPayment).toBe(0.2)
  })

  it('unknown income gives no shares, not a guess', () => {
    expect(affordability(tinyProject(), { ...area, income: null })[0]!.shares).toEqual([])
  })

  it('population implications follow the area profile; unknowns stay unknown', () => {
    expect(implications(100, area)).toEqual({ homes: 100, residents: 200, children: 30, seniors: 40, transitCommuters: 200 * 0.85 * 0.6 * 0.4 })
    expect(implications(100, { ...area, avgHouseholdSize: null }).residents).toBeNull()
  })
})

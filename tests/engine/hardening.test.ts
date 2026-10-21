// Regression tests for the 2026-10-21 assessment findings (docs/implementation/ASSESSMENT-2026-10-21.md, R3 and R4).
import { describe, expect, it } from 'vitest'
import { runNode } from '../../src/engine/portfolio'
import { nonFinitePaths, runProject, validateProject, type ProjectInput, type RentalComponent } from '../../src/engine/project'
import { tinyProject } from './fixtures'

describe('R3: C8 funding order', () => {
  // Land $100,000 at month 0, construction $100,000 over months 3–4 (two pre-construction months), 90% LTC.
  // Budget to completion 200,000 → equity requirement 20,000. Land is still all equity (C8), so equity = 100,000
  // and construction is all debt. The assessment's probe drew 80,000 of construction debt in month 0.
  const p: ProjectInput = tinyProject({
    timing: { preConstructionMonths: 2, constructionMonths: 2, exitMonth: 6 },
    costLines: [
      { id: 'land', label: 'Land', driver: { kind: 'lumpSum', amount: 100_000 }, timing: { kind: 'month', month: 0 }, estimateClass: 'exact' },
      { id: 'hard', label: 'Hard', driver: { kind: 'lumpSum', amount: 100_000 }, timing: { kind: 'construction' }, estimateClass: 'C' },
    ],
    debt: { ...tinyProject().debt, ltc: 0.9 },
  })
  const r = runProject(p)

  it('land and pre-construction are all equity, even beyond the (1 − LTC) requirement', () => {
    expect(r.ledger[0]).toMatchObject({ equityDraw: 100_000, debtDraw: 0 })
    expect(r.ledger.slice(3, 5).map((row) => [row.equityDraw, row.debtDraw])).toEqual([[0, 50_000], [0, 50_000]])
    expect(r.checks.sourcesEqualUses).toBe(true)
  })
})

describe('R4: runtime validation', () => {
  const rental = tinyProject().components[0] as RentalComponent

  it('rejects non-finite numbers anywhere, with the field path', () => {
    expect(nonFinitePaths({ a: [1, { b: Infinity }], c: NaN, d: 'x' })).toEqual(['a[1].b', 'c'])
    expect(validateProject(tinyProject({ debt: { ...tinyProject().debt, annualRate: Infinity } }))).toContain('debt.annualRate must be a finite number')
    expect(() => runProject(tinyProject({ debt: { ...tinyProject().debt, annualRate: Infinity } }))).toThrow(RangeError)
  })

  it('rejects out-of-range growth, refinance, condo and duplicate-id inputs', () => {
    const bad = (over: Partial<ProjectInput>) => validateProject(tinyProject(over)).join('\n')
    expect(bad({ components: [{ ...rental, rentGrowth: -1 }] })).toMatch(/rentGrowth/)
    expect(bad({ components: [{ ...rental, unitMix: [rental.unitMix[0]!, rental.unitMix[0]!] }] })).toMatch(/repeated/)
    expect(bad({ costEscalation: -1.5 })).toMatch(/costEscalation/)
    expect(bad({ costLines: [...tinyProject().costLines, tinyProject().costLines[0]!] })).toMatch(/cost line id .* repeated/)
    expect(bad({ debt: { ...tinyProject().debt, refinance: { month: 3, annualRate: 0.05, amortizationYears: 0, dscr: 1.2, ltv: 1.4, feeFraction: 0.01 } } })).toMatch(/amortizationYears[\s\S]*ltv/)
    expect(bad({ components: [{ kind: 'condo', id: 'c', units: [{ id: 'u', count: 1.5, netSqftPerUnit: 500, pricePerSqft: -1 }], salesStartMonth: 0, salesPerMonth: 1, depositFraction: 0.2, depositsUsable: false, occupancyMonths: 0, occupancyFeePerUnitMonthly: 0, commissionFraction: 1.2 }] }))
      .toMatch(/count must be a whole number[\s\S]*price and area[\s\S]*commissionFraction/)
  })

  it('portfolios reject duplicate child ids', () => {
    const child = tinyProject()
    expect(() => runNode({ id: 'mp', name: 'MP', discountRate: 0.1, costEscalation: 0, costLines: [], children: [{ offsetMonths: 0, node: child }, { offsetMonths: 1, node: child }] })).toThrow(/repeated/)
  })
})

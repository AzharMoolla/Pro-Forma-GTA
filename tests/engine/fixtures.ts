import type { ProjectInput } from '../../src/engine/project'
import { toProject, type RentalInput } from '../../src/engine/rental'

// Same tiny building as rental.test.ts (hand-derived there): 2 units × $1,000, land 50k, hard 100k over months 1–2,
// 12%/yr construction loan at 50% LTC, exit month 4 at a 6% cap.
export const tinyRental: RentalInput = {
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

export const tinyProject = (overrides: Partial<ProjectInput> = {}): ProjectInput => ({ ...toProject(tinyRental), id: 'tiny', name: 'Tiny', ...overrides })

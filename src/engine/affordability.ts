// Affordability and population implications from the program and the area's demographics. Pure.
//
// Affordability: shelter cost as a share of before-tax household income, against CMHC's 30% threshold (the measure
// behind "core housing need"). Rental cost = rent; ownership cost = mortgage payment + condo fee + property tax.
// Projected year by year with rents (or carrying costs) and incomes growing at their own rates. Unknown → no answer.

import { annuityPayment, monthlyLoanRate } from './finance'

/** Canadian fixed-rate mortgages compound semi-annually (Interest Act): monthly rate = (1 + r/2)^(1/6) − 1. */
export const canadianMortgageMonthlyRate = (nominal: number) => monthlyLoanRate(nominal, 'semiAnnual')
import type { ProjectInput } from './project'

export const AFFORDABLE_SHARE = 0.3

export interface AreaProfile {
  income: number | null // median household income of the group the homes are for (renters for rental), CAD/yr before tax
  incomeGrowth: number // per year
  avgHouseholdSize: number | null
  age0to14Share: number | null
  age65PlusShare: number | null
  employmentRate: number | null // employed ÷ population 15+
  transitCommuteShare: number | null // of employed commuters
}

export interface OwnershipAssumptions {
  downPayment: number // fraction of price
  mortgageRate: number // nominal annual, compounded semi-annually
  amortizationYears: number
  condoFeePerSqftMonth: number
  propertyTaxRate: number // of price per year
}

/** Common screening defaults, all editable: 20% down, 5.0% over 25 years, $0.75/ft²/month fees, 0.7% tax. */
export const OWNERSHIP_DEFAULTS: OwnershipAssumptions = { downPayment: 0.2, mortgageRate: 0.05, amortizationYears: 25, condoFeePerSqftMonth: 0.75, propertyTaxRate: 0.007 }

export interface AffordabilityRow {
  unit: string
  tenure: 'rental' | 'ownership'
  count: number
  monthlyCost: number // year 1 of occupancy
  incomeNeeded: number // annual income at which the cost is exactly 30%
  shares: number[] // cost ÷ income for each year shown; empty when income is unknown
}

export function affordability(project: ProjectInput, area: AreaProfile, years = 10, own: OwnershipAssumptions = OWNERSHIP_DEFAULTS): AffordabilityRow[] {
  const startYear = Math.floor((project.timing.preConstructionMonths + project.timing.constructionMonths + 1) / 12)
  const rows: AffordabilityRow[] = []
  const shares = (monthly: (y: number) => number) =>
    area.income === null || area.income <= 0 ? [] : Array.from({ length: years }, (_, y) => (monthly(y) * 12) / (area.income! * ((1 + area.incomeGrowth) ** (startYear + y))))
  for (const c of project.components) {
    if (c.kind === 'rental') {
      for (const u of c.unitMix) {
        const rentAt = (y: number) => u.monthlyRent * ((1 + c.rentGrowth) ** (startYear + y))
        rows.push({ unit: u.id, tenure: 'rental', count: u.count, monthlyCost: rentAt(0), incomeNeeded: (rentAt(0) * 12) / AFFORDABLE_SHARE, shares: shares(rentAt) })
      }
    } else if (c.kind === 'condo') {
      for (const u of c.units) {
        const price = u.pricePerSqft * u.netSqftPerUnit
        const mortgage = annuityPayment(price * (1 - own.downPayment), canadianMortgageMonthlyRate(own.mortgageRate), own.amortizationYears * 12)
        const fees = u.netSqftPerUnit * own.condoFeePerSqftMonth
        const tax = (price * own.propertyTaxRate) / 12
        // the mortgage payment is fixed; fees and tax grow with incomes (a neutral assumption)
        const costAt = (y: number) => mortgage + ((fees + tax) * ((1 + area.incomeGrowth) ** y))
        rows.push({ unit: u.id, tenure: 'ownership', count: u.count, monthlyCost: costAt(0), incomeNeeded: (costAt(0) * 12) / AFFORDABLE_SHARE, shares: shares(costAt) })
      }
    }
  }
  return rows
}

export interface Implications { homes: number; residents: number | null; children: number | null; seniors: number | null; transitCommuters: number | null }

/** Rough population effects of the new homes, from the area's household size and age and commuting shares. */
export function implications(homes: number, area: AreaProfile): Implications {
  const residents = area.avgHouseholdSize ? homes * area.avgHouseholdSize : null
  const of = (share: number | null) => (residents !== null && share !== null ? residents * share : null)
  const working = residents !== null && area.employmentRate !== null && area.age0to14Share !== null ? residents * (1 - area.age0to14Share) * area.employmentRate : null
  return { homes, residents, children: of(area.age0to14Share), seniors: of(area.age65PlusShare), transitCommuters: working !== null && area.transitCommuteShare !== null ? working * area.transitCommuteShare : null }
}

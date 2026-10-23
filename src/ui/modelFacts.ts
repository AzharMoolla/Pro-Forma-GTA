// One question, one place. Some project variables describe what the pro forma already holds (storeys, units, retail
// area, construction months, loan terms). Those are read from the model, never asked again, so a cost trigger can't
// disagree with the numbers. Others are asked on another page; the variables list points there instead of repeating.

import type { Attributes } from '../engine/catalogue'
import { isPortfolio, type Node } from '../engine/portfolio'
import type { ProjectInput } from '../engine/project'
import { projectsUnder } from './coverage'

const SQFT_PER_HA = 107_639.1

/** Variables the pro forma already answers, with where in the model the answer lives. */
export const FROM_MODEL: Record<string, string> = {
  'planning.storeys': 'program storeys (tallest building)',
  'planning.residentialUnits': 'unit mix, Revenue & operations',
  'program.tenure': 'the components: rental, condo or both',
  'program.retailNla': 'retail net leasable area, Revenue & operations',
  'program.officeNla': 'office net leasable area, Revenue & operations',
  'program.industrialGfa': 'industrial area, Revenue & operations',
  'program.gcaAboveSqft': 'building program',
  'program.gcaBelowSqft': 'building program',
  'program.planningGfaSqft': 'building program',
  'site.areaHa': 'lot area in the building program',
  'construction.months': 'construction months, Finance & ledger',
  'construction.escalation': 'cost escalation, Finance & ledger',
  'finance.constructionRate': 'construction rate, Finance & ledger',
  'finance.ltc': 'loan-to-cost, Finance & ledger',
  'finance.refinance': 'refinance terms, Finance & ledger',
  'finance.discountRate': 'discount rate of the plan',
  'mp.phases': 'the phasing plan, above',
  'planning.carParkingStalls': 'the parking line, Cost & budget',
}

/** Variables asked on another page: listed there, not here. */
export const ASKED_ELSEWHERE: Record<string, string> = {
  'deal.landPrice': 'Cost & budget (the land line)',
  'finance.requiredSpread': 'Feasibility & stress (rental return test)',
  'deal.holdMonths': 'Finance & ledger (pre-construction months)',
  'market.rentsByType': 'Revenue & operations', 'market.rentGrowth': 'Revenue & operations', 'market.condoPsf': 'Revenue & operations',
  'market.absorption': 'Revenue & operations', 'market.depositStructure': 'Revenue & operations', 'market.retailRentPsf': 'Revenue & operations',
  'market.officeRentPsf': 'Revenue & operations', 'market.industrialRentPsf': 'Revenue & operations', 'market.tiPsf': 'Revenue & operations',
  'market.freeRentMonths': 'Revenue & operations', 'market.capRates': 'Revenue & operations', 'market.parkingRevenue': 'Revenue & operations',
  'market.affordableRentLevel': 'Revenue & operations', 'market.landSalePrice': 'Revenue & operations',
}
/** Whole groups asked on their own page. */
export const GROUPS_ELSEWHERE: Record<string, string> = { demographics: 'People & affordability' }

/** The few questions Simple mode asks: the ones that switch the most costs, most of them filled in by the site map. */
export const SIMPLE_QUESTIONS = [
  'site.municipality', 'site.existingBuilding', 'site.existingRentalUnits', 'site.contamination', 'site.heritage', 'site.regulatedArea',
  'site.floodplain', 'site.nearTtc60m', 'planning.zba', 'planning.sitePlan', 'planning.affordableShare',
  'planning.parkingLevelsBelowGrade',
]

const sum = (xs: number[]) => xs.reduce((t, x) => t + x, 0)
const same = <T,>(xs: T[]): T | null => (xs.length && xs.every((x) => x === xs[0]) ? xs[0]! : null)

/** The variables the model answers, as attributes. Only what the model actually holds; anything else stays unset. */
export function fromModel(node: Node): Attributes {
  const ps: ProjectInput[] = projectsUnder(node).map((q) => q.project)
  const comps = ps.flatMap((p) => p.components)
  const nla = (use: string) => sum(comps.flatMap((c) => (c.kind === 'commercial' && c.use === use ? [c.netLeasableSqft] : [])))
  const units = sum(comps.flatMap((c) => (c.kind === 'rental' ? c.unitMix.map((u) => u.count) : c.kind === 'condo' ? c.units.map((u) => u.count) : [])))
  const rental = comps.some((c) => c.kind === 'rental'), condo = comps.some((c) => c.kind === 'condo')
  const progs = ps.flatMap((p) => (p.program ? [p.program] : []))
  const lots = progs.map((g) => g.lotAreaSqft)
  const a: Attributes = {
    'planning.residentialUnits': units,
    'program.retailNla': nla('retail'),
    'program.officeNla': nla('office'),
    'program.industrialGfa': nla('industrial'),
    'construction.months': Math.max(...ps.map((p) => p.timing.constructionMonths)),
    'finance.refinance': ps.some((p) => p.debt.refinance !== undefined),
    'finance.discountRate': node.discountRate,
    'mp.phases': isPortfolio(node) && node.children.every((c) => isPortfolio(c.node)) ? node.children.length : 1,
  }
  // Stalls from the parking lines carried as stalls × area × $/ft² (a $/stall line counts its units)
  const stallLines = ps.flatMap((p) => p.costLines).filter((l) => l.catalogueId === 'underground-parking')
  if (stallLines.length) a['planning.carParkingStalls'] = sum(stallLines.map((l) => (l.driver?.kind === 'perStall' ? l.driver.stalls : l.driver?.kind === 'perUnit' ? l.driver.units : 0)))
  if (rental || condo) a['program.tenure'] = rental && condo ? 'mixed' : rental ? 'rental' : 'condo'
  if (progs.length === ps.length && progs.length) {
    a['program.gcaAboveSqft'] = sum(progs.map((g) => g.gcaAboveSqft))
    a['program.gcaBelowSqft'] = sum(progs.map((g) => g.gcaBelowSqft))
    const storeys = progs.map((g) => g.storeys).filter((s): s is number => s !== undefined)
    if (storeys.length) a['planning.storeys'] = Math.max(...storeys)
    if (progs.every((g) => g.planningGfaSqft !== null)) a['program.planningGfaSqft'] = sum(progs.map((g) => g.planningGfaSqft!))
    if (lots.every((l) => l !== null)) a['site.areaHa'] = Number((sum(lots as number[]) / SQFT_PER_HA).toFixed(3))
  }
  const esc = same(ps.map((p) => p.costEscalation)), rate = same(ps.map((p) => p.debt.annualRate)), ltc = same(ps.map((p) => p.debt.ltc))
  if (esc !== null) a['construction.escalation'] = esc
  if (rate !== null) a['finance.constructionRate'] = rate
  if (ltc !== null) a['finance.ltc'] = ltc
  return a
}

/** What cost triggers read: the user's answers, with the model's own figures in place of any duplicate. */
export function withModel(attributes: Attributes, node: Node): Attributes {
  return { ...attributes, ...fromModel(node) }
}

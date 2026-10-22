// Assumptions register: everything the model assumes rather than being told, in one list, each with its value, basis
// and effect. The growth rates and rule-of-thumb cost lines can be switched off; switching one off re-runs everything
// without it and the register, report and workbook say so. Conventions are always on and are listed so they are seen.
// Pure.

import { DEFAULT_BANDS, type CostLine } from './costs'
import { OWNERSHIP_DEFAULTS } from './affordability'
import { isPortfolio, type Node } from './portfolio'
import { DOWNSIDE } from './stress'
import { HST_RATE } from './tax'

/** Project variable holding the switched-off assumption ids, as a JSON array (so locked scenarios keep them). */
export const OFF_KEY = 'assumptions.off'

export function offSet(attributes: Record<string, unknown>): Set<string> {
  try {
    const v = JSON.parse(String(attributes[OFF_KEY] ?? '[]')) as unknown
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

export type AssumptionGroup = 'growth' | 'rule' | 'convention' | 'analysis'

export interface Assumption {
  id: string
  group: AssumptionGroup
  label: string
  value: string
  basis: string // why this number, or where it comes from
  effect: string // what it does to the results
  toggle: boolean
  on: boolean
  toVerify?: boolean // the line or rule says it is a placeholder to check
}

/** A cost line that is a rule of thumb rather than a quote or schedule: a percentage of other lines, an allowance or a contingency. */
export const isRuleLine = (line: CostLine) =>
  line.driver !== null && (line.driver.kind === 'percentOf' || /allowance|contingency|assumed/i.test(line.label))
const toVerify = (line: CostLine) => /verify|assumed|allowance/i.test(line.label)

function allLines(node: Node): CostLine[] {
  return [...node.costLines, ...(isPortfolio(node) ? node.children.flatMap((c) => allLines(c.node)) : [])]
}
function projects(node: Node): Array<Exclude<Node, { children: unknown }>> {
  return isPortfolio(node) ? node.children.flatMap((c) => projects(c.node)) : [node]
}

/** The draft as the model runs it: switched-off growth set to 0, switched-off rule lines zeroed (kept, so they still show). */
export function applyAssumptions(node: Node, off: Set<string>): Node {
  if (!off.size) return node
  const costLines = node.costLines.map((line) => {
    if (!off.has(`line:${line.id}`) || line.driver === null) return line
    const d = line.driver
    return { ...line, driver: d.kind === 'lumpSum' ? { ...d, amount: 0 } : { ...d, rate: 0 } }
  })
  const costEscalation = off.has('escalation') ? 0 : node.costEscalation
  if (isPortfolio(node)) return { ...node, costLines, costEscalation, children: node.children.map((c) => ({ ...c, node: applyAssumptions(c.node, off) })) }
  return {
    ...node,
    costLines,
    costEscalation,
    components: node.components.map((c) => {
      if (c.kind === 'rental') return { ...c, rentGrowth: off.has('rentGrowth') ? 0 : c.rentGrowth, opexInflation: off.has('opexInflation') ? 0 : c.opexInflation }
      if (c.kind === 'commercial') return { ...c, rentGrowth: off.has('rentGrowth') ? 0 : c.rentGrowth }
      return c
    }),
  }
}

const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`
const range = (xs: number[], f: (v: number) => string) => {
  const u = [...new Set(xs)].sort((a, b) => a - b)
  return u.length ? (u.length === 1 ? f(u[0]!) : `${f(u[0]!)} – ${f(u.at(-1)!)}`) : 'none'
}

/** Every assumption that applies to this draft, with whether it is on. `node` is the stored draft, before switches. */
export function listAssumptions(node: Node, off: Set<string>): Assumption[] {
  const ps = projects(node)
  const rentals = ps.flatMap((p) => p.components.filter((c) => c.kind === 'rental'))
  const income = ps.flatMap((p) => p.components.filter((c) => c.kind === 'rental' || c.kind === 'commercial'))
  const lines = allLines(node)
  const escalating = lines.filter((l) => l.escalate)
  const out: Assumption[] = []

  const escalations = [node.costEscalation, ...ps.map((p) => p.costEscalation)]
  if (escalating.length) out.push({ id: 'escalation', group: 'growth', label: 'Construction cost escalation', value: `${range(escalations, (v) => `${pct(v)}/yr`)} on ${escalating.length} line${escalating.length === 1 ? '' : 's'}`, basis: 'Costs are entered in today\'s dollars and grow each year to the month they are spent (C19). Check against a current cost guide or your cost consultant.', effect: 'Raises hard costs spent later; off = everything priced at today\'s cost.', toggle: true, on: !off.has('escalation') })
  if (income.length) out.push({ id: 'rentGrowth', group: 'growth', label: 'Rent growth', value: `${range(income.map((c) => (c as { rentGrowth: number }).rentGrowth), (v) => `${pct(v)}/yr`)}`, basis: 'Rents step up every 12 months from month 0. A forecast, not a contract: compare with CMHC rental market data and recent comparables.', effect: 'Raises rents at lease-up and the exit value; off = today\'s rents throughout.', toggle: true, on: !off.has('rentGrowth') })
  if (rentals.length) out.push({ id: 'opexInflation', group: 'growth', label: 'Operating cost inflation', value: `${range(rentals.map((c) => (c as { opexInflation: number }).opexInflation), (v) => `${pct(v)}/yr`)}`, basis: 'Operating costs per unit grow each year.', effect: 'Lowers NOI over time; off = today\'s operating costs throughout.', toggle: true, on: !off.has('opexInflation') })

  const seen = new Set<string>()
  for (const line of lines.filter(isRuleLine)) {
    if (seen.has(line.id)) continue
    seen.add(line.id)
    const d = line.driver!
    const value = d.kind === 'percentOf' ? `${pct(d.rate, d.rate < 0.01 ? 2 : 1)} of ${d.of.length} line${d.of.length === 1 ? '' : 's'}` : d.kind === 'lumpSum' ? `${d.amount < 0 ? '−' : ''}$${Math.round(Math.abs(d.amount)).toLocaleString('en-CA')}` : `$${d.rate.toLocaleString('en-CA')} × ${(d.kind === 'perUnit' ? d.units : d.kind === 'perArea' ? d.area : d.kind === 'perLinear' ? d.metres : d.hectares).toLocaleString('en-CA')}`
    out.push({ id: `line:${line.id}`, group: 'rule', label: line.label, value, basis: line.source?.ref ?? (line.estimateClass === 'exact' ? 'Entered as exact.' : `Estimate class ${line.estimateClass}${line.source ? ` (${line.source.kind})` : ''}.`), effect: '', toggle: true, on: !off.has(`line:${line.id}`), toVerify: toVerify(line) })
  }

  out.push(
    { id: 'conv-funding', group: 'convention', label: 'Funding order', value: 'Land and pre-construction all equity; then equity to (1 − LTC) × budget; then the loan (C8)', basis: 'Typical Canadian construction lending: equity in first.', effect: 'Equity goes in early, which lowers levered IRR.', toggle: false, on: true },
    { id: 'conv-interest', group: 'convention', label: 'Construction interest', value: 'Nominal annual ÷ 12 on the opening balance, capitalized to completion (C4, C9)', basis: 'Lenders accrue monthly; interest reserve inside the budget.', effect: 'Adds capitalized interest to total development cost.', toggle: false, on: true },
    ...(ps.some((p) => p.debt.refinance) ? [{ id: 'conv-compounding', group: 'convention' as const, label: 'Refinance rate compounding', value: [...new Set(ps.filter((p) => p.debt.refinance).map((p) => (p.debt.refinance!.compounding === 'semiAnnual' ? 'semi-annual (Canadian fixed mortgage)' : 'monthly (rate ÷ 12)')))].join(' / '), basis: 'Canadian fixed-rate mortgages quote rates compounded semi-annually (Interest Act s.6); construction loans accrue monthly. Set per project on Finance & ledger.', effect: 'Semi-annual gives a slightly lower payment, so about 0.5% more loan at 4–5% rates.', toggle: false, on: true }] : []),
    { id: 'conv-commitment', group: 'convention', label: 'Lender commitment', value: 'Loan-to-cost × (costs to completion + capitalized interest)', basis: 'Lenders size the facility on the full budget.', effect: 'Anything above it is a funding gap.', toggle: false, on: true },
    { id: 'conv-exit', group: 'convention', label: 'Exit value', value: 'Forward 12-month NOI ÷ exit cap rate, less a lease-up adjustment if not stabilized', basis: 'Direct capitalization, as appraisers value stabilized income property.', effect: 'Drives exit value and refinance size.', toggle: false, on: true },
    { id: 'conv-irr', group: 'convention', label: 'IRR shown only when unique', value: 'One rate between −99% and +1,000% per period, else unavailable (C15)', basis: 'Several sign changes can give several IRRs.', effect: 'Use NPV when IRR is unavailable.', toggle: false, on: true },
    { id: 'conv-poc', group: 'convention', label: 'Profit on cost basis', value: 'After capitalized interest, over total development cost including it', basis: 'Matching bases (D-20).', effect: 'A before-financing version is shown alongside.', toggle: false, on: true },
    { id: 'an-bands', group: 'analysis', label: 'Estimate ranges by class (simulation)', value: (['D', 'C', 'B', 'A'] as const).map((k) => `${k} ${pct(DEFAULT_BANDS[k].low, 0)} / +${pct(DEFAULT_BANDS[k].high, 0)}`).join(' · '), basis: 'Cost estimate accuracy ranges by class, following the AACE estimate-class idea; a line can set its own.', effect: 'Used only by the P10–P90 simulation.', toggle: false, on: true },
    { id: 'an-downside', group: 'analysis', label: 'Downside shocks', value: DOWNSIDE.map((d) => d.label).join(' · '), basis: 'Round numbers for a screening test, not a forecast.', effect: 'Feasibility & stress only; never changes the base case.', toggle: false, on: true },
    { id: 'an-hst', group: 'analysis', label: 'HST overlay (rental)', value: `${pct(HST_RATE, 0)}; credits 2 months later; self-supply at first occupancy on stabilized NOI ÷ cap`, basis: 'Excise Tax Act self-supply; rebates as announced to April 2026.', effect: 'Shown beside the results; not in total development cost.', toggle: false, on: true },
    { id: 'an-ownership', group: 'analysis', label: 'Ownership cost (affordability)', value: `${pct(OWNERSHIP_DEFAULTS.downPayment, 0)} down, ${pct(OWNERSHIP_DEFAULTS.mortgageRate)} over ${OWNERSHIP_DEFAULTS.amortizationYears} years, $${OWNERSHIP_DEFAULTS.condoFeePerSqftMonth}/ft²/month fees, ${pct(OWNERSHIP_DEFAULTS.propertyTaxRate)} property tax`, basis: 'Typical first-time buyer terms; mortgage compounded semi-annually (Interest Act).', effect: 'People & affordability only.', toggle: false, on: true },
  )
  return out
}

/** A stored input and its project variables, as the model runs them. */
export const modelOf = (input: Node, attributes: Record<string, unknown> | null | undefined) => applyAssumptions(input, offSet(attributes ?? {}))

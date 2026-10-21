// Surface-level analysis of a model result: cost buckets, outliers and plain-language observations.
// These are SCREENING HEURISTICS chosen for this tool, not market benchmarks. They only compare a project's own numbers
// with each other (shares, spreads, signs); thresholds are deliberately round and live here so they can be tuned.

import { lineTotals } from './costs'
import { isPortfolio, type Node, type NodeResult } from './portfolio'

export type BucketId = 'acquisition' | 'approvals' | 'site' | 'construction' | 'soft' | 'financing' | 'selling' | 'infrastructure'
export type Severity = 'good' | 'info' | 'watch' | 'concern'

export const BUCKETS: Array<{ id: BucketId; label: string; stages: string[] }> = [
  { id: 'acquisition', label: 'Acquisition', stages: ['s0', 's1'] },
  { id: 'approvals', label: 'Studies, approvals & levies', stages: ['s2', 's3', 's4', 's5'] },
  { id: 'site', label: 'Site prep & remediation', stages: ['s6'] },
  { id: 'construction', label: 'Construction', stages: ['s7'] },
  { id: 'soft', label: 'Soft costs', stages: ['s8'] },
  { id: 'financing', label: 'Financing', stages: ['s9'] },
  { id: 'selling', label: 'Selling, leasing & operations', stages: ['s10', 's11', 's12', 's13', 's14'] },
  { id: 'infrastructure', label: 'Community infrastructure', stages: ['s15'] },
]
const bucketOfStage = new Map(BUCKETS.flatMap((b) => b.stages.map((s) => [s, b.id] as const)))

export interface CostItem { key: string; label: string; catalogueId?: string; bucket: BucketId; total: number; where: string }

/** Every dollar of cost in a result, with its bucket. Stage comes from the catalogue via `stageOf`. */
export function costItems(node: Node, result: NodeResult, stageOf: (catalogueId: string | undefined) => string | undefined, where = node.name): CostItem[] {
  const bucket = (catalogueId?: string): BucketId => bucketOfStage.get(stageOf(catalogueId) ?? 's8') ?? 'soft'
  if (isPortfolio(node)) {
    const totals = lineTotals(node.costLines)
    return [
      ...node.costLines.map((l) => ({ key: `${where}/${l.id}`, label: l.label, catalogueId: l.catalogueId, bucket: bucket(l.catalogueId), total: totals.get(l.id) ?? 0, where })),
      ...node.children.flatMap((c, i) => costItems(c.node, result.children[i]!.result, stageOf, c.node.name)),
    ]
  }
  const ledger = result.project!.ledger
  const sums = new Map<string, number>()
  for (const row of ledger) for (const [k, v] of Object.entries(row.costs)) sums.set(k, (sums.get(k) ?? 0) + v)
  const lines = new Map(node.costLines.map((l) => [l.id, l]))
  const items: CostItem[] = [...sums.entries()].map(([k, total]) => {
    const line = lines.get(k)
    return line
      ? { key: `${where}/${k}`, label: line.label, catalogueId: line.catalogueId, bucket: bucket(line.catalogueId), total, where }
      : { key: `${where}/${k}`, label: k.replace(':', ' · '), bucket: 'selling', total, where } // component costs: TI, leasing, commissions
  })
  const interest = ledger.reduce((s, r) => s + r.interest + r.permInterest + r.refinanceFee, 0)
  if (interest) items.push({ key: `${where}/interest`, label: 'Interest and refinance fees', bucket: 'financing', total: interest, where })
  return items
}

export interface Bucket { id: BucketId; label: string; total: number; share: number; severity: Severity; top: CostItem[] }

export interface Insight {
  id: string
  severity: Severity
  title: string
  detail: string
  drivers: string[] // the lines or metrics behind it
}

export interface Analysis { buckets: Bucket[]; insights: Insight[]; total: number }

export interface AnalysisInput {
  items: CostItem[]
  metrics: Record<string, { value: number | null } | undefined>
  isMasterPlan: boolean
  range?: { p10Profit: number | null; p50Profit: number | null }
  unaccountedItems?: number
  buildableSqft?: number | null // by-law GFA (or above-grade GCA) for land $/buildable ft²
}

const pct = (v: number) => `${(v * 100).toFixed(0)}%`
const M = (v: number) => `$${(v / 1e6).toFixed(1)}M`
const severityRank: Record<Severity, number> = { concern: 0, watch: 1, info: 2, good: 3 }

export function analyze(input: AnalysisInput): Analysis {
  const { items, metrics, isMasterPlan } = input
  const value = (id: string) => metrics[id]?.value ?? null
  const total = items.reduce((s, i) => s + i.total, 0)
  const insights: Insight[] = []
  const add = (i: Insight) => insights.push(i)

  const buckets: Bucket[] = BUCKETS.map((b) => {
    const inBucket = items.filter((i) => i.bucket === b.id).sort((x, y) => Math.abs(y.total) - Math.abs(x.total))
    const sum = inBucket.reduce((s, i) => s + i.total, 0)
    return { id: b.id, label: b.label, total: sum, share: total ? sum / total : 0, severity: 'info' as Severity, top: inBucket.slice(0, 3) }
  }).filter((b) => Math.abs(b.total) > 0.5)
  const share = (id: BucketId) => buckets.find((b) => b.id === id)?.share ?? 0
  const top = (id: BucketId) => (buckets.find((b) => b.id === id)?.top ?? []).map((i) => `${i.label} ${M(i.total)}`)
  const flag = (id: BucketId, severity: Severity) => {
    const b = buckets.find((x) => x.id === id)
    if (b && severityRank[severity] < severityRank[b.severity]) b.severity = severity
  }

  if (total <= 0) return { buckets, insights, total }

  // --- bucket shares
  const land = share('acquisition')
  if (land > 0.45) {
    flag('acquisition', 'concern')
    add({ id: 'land-heavy', severity: 'concern', title: `Acquisition is ${pct(land)} of total cost`, detail: 'Land dominates the budget. Either the land price is high for what is being built, the program is too small for the site, or other costs are missing or under-estimated. Check density and that every applicable cost is in the model before negotiating land.', drivers: top('acquisition') })
  } else if (land > 0.3) {
    flag('acquisition', 'watch')
    add({ id: 'land-high', severity: 'watch', title: `Acquisition is ${pct(land)} of total cost`, detail: 'A large share of the budget is land. Small changes in land price move returns a lot; a denser program spreads it further.', drivers: top('acquisition') })
  } else if (land < 0.06 && !isMasterPlan && land > 0) {
    flag('acquisition', 'watch')
    add({ id: 'land-low', severity: 'watch', title: `Acquisition is only ${pct(land)} of total cost`, detail: 'Unusually small. Confirm the land price, transfer taxes and holding costs were entered.', drivers: top('acquisition') })
  }

  const build = share('construction')
  if (!isMasterPlan && build > 0 && build < 0.35) {
    flag('construction', 'watch')
    add({ id: 'construction-low', severity: 'watch', title: `Construction is only ${pct(build)} of total cost`, detail: 'Hard costs are a small part of the budget. Either other buckets are heavy, or the hard-cost estimate is incomplete.', drivers: top('construction') })
  }

  const fin = share('financing')
  if (fin > 0.2) {
    flag('financing', 'concern')
    add({ id: 'financing-heavy', severity: 'concern', title: `Financing is ${pct(fin)} of total cost`, detail: 'Interest is eating the project. Usually a long schedule, slow lease-up or sales, or high leverage at a high rate. Shortening the timeline or adding equity cuts this directly.', drivers: top('financing') })
  } else if (fin > 0.12) {
    flag('financing', 'watch')
    add({ id: 'financing-high', severity: 'watch', title: `Financing is ${pct(fin)} of total cost`, detail: 'Interest is a meaningful cost. Check the schedule, draw timing and rate assumptions.', drivers: top('financing') })
  }

  const site = share('site')
  if (site > 0.08) {
    flag('site', 'concern')
    add({ id: 'site-heavy', severity: 'concern', title: `Site prep and remediation are ${pct(site)} of total cost`, detail: 'Contamination, excavation or shoring is a major risk item. These are usually wide-band estimates until Phase Two ESA and geotechnical work are done.', drivers: top('site') })
  } else if (site > 0.04) {
    flag('site', 'watch')
    add({ id: 'site-high', severity: 'watch', title: `Site prep and remediation are ${pct(site)} of total cost`, detail: 'Noticeable site costs: get the studies that narrow these early.', drivers: top('site') })
  }

  const approvals = share('approvals')
  if (approvals > 0.15) {
    flag('approvals', 'watch')
    add({ id: 'approvals-high', severity: 'watch', title: `Studies, approvals and levies are ${pct(approvals)} of total cost`, detail: 'Development charges, parkland and land-value charges are heavy. Check available DC discounts, exemptions and deferrals for the unit mix and tenure.', drivers: top('approvals') })
  }

  // "Soft" here is consultants, management, insurance and overhead only. Industry figures that include levies and
  // interest run far higher (Donnelly: ~75% of hard costs in Toronto today vs ~25% historically), so this threshold
  // applies to the narrow definition.
  const soft = buckets.find((b) => b.id === 'soft')?.total ?? 0
  const hard = buckets.find((b) => b.id === 'construction')?.total ?? 0
  if (hard > 0 && soft / hard > 0.3) {
    flag('soft', 'watch')
    add({ id: 'soft-high', severity: 'watch', title: `Consultant and management costs are ${pct(soft / hard)} of hard costs`, detail: 'High relative to construction even before levies and interest. Check for duplicated allowances.', drivers: top('soft') })
  }

  const contingency = items.filter((i) => i.catalogueId === 'design-contingency' || i.catalogueId === 'construction-contingency').reduce((s, i) => s + i.total, 0)
  if (hard > 0 && contingency / hard < 0.05) {
    add({ id: 'contingency-thin', severity: 'watch', title: `Contingency is ${pct(contingency / hard)} of construction`, detail: 'Thin for an early-stage estimate. Contingency usually shrinks as design and pricing firm up, not before.', drivers: [] })
  }

  const biggest = [...items].sort((a, b) => b.total - a.total)[0]
  if (biggest && biggest.total / total > 0.3 && biggest.bucket !== 'acquisition') {
    add({ id: 'single-line', severity: 'info', title: `One line is ${pct(biggest.total / total)} of total cost`, detail: `${biggest.label} (${biggest.where}) drives the budget. Its estimate class decides most of the uncertainty: tightening it is the best use of early design and pricing effort.`, drivers: [`${biggest.label} ${M(biggest.total)}`] })
  }

  // --- land against revenue (Bullpen & Batory Q4-2019: GTA high-density land traded at ~10–15% of expected revenue)
  const landPrice = items.filter((i) => i.catalogueId === 'land-price').reduce((s, i) => s + i.total, 0)
  const revenue = value('totalRevenue')
  if (landPrice > 0 && revenue) {
    const ratio = landPrice / revenue
    const perBuildable = input.buildableSqft ? ` ($${(landPrice / input.buildableSqft).toFixed(0)} per buildable ft²)` : ''
    const detail = `Land is ${pct(ratio)} of projected revenue${perBuildable}. GTA high-density land traded at roughly 10–15% of expected revenue in 2018–19 (Bullpen & Batory, Q4-2019; dated benchmark).`
    if (ratio > 0.2) add({ id: 'land-to-revenue-high', severity: 'watch', title: `Land-to-revenue ${pct(ratio)}`, detail: `${detail} A high ratio leaves less of each sales dollar for construction and profit.`, drivers: [`Land $${(landPrice / 1e6).toFixed(1)}M`] })
    else add({ id: 'land-to-revenue', severity: 'info', title: `Land-to-revenue ${pct(ratio)}`, detail, drivers: [`Land $${(landPrice / 1e6).toFixed(1)}M`] })
  }

  // --- returns
  const poc = value('profitOnCost')
  if (poc !== null) {
    if (poc < 0) add({ id: 'margin-negative', severity: 'concern', title: `Unlevered profit on cost is ${pct(poc)}`, detail: 'As entered, the project loses money before financing. Something has to change: price, density, cost, or the land deal.', drivers: ['profitOnCost'] })
    else if (poc < 0.15) add({ id: 'margin-thin', severity: 'watch', title: `Profit on cost is ${pct(poc)}`, detail: 'Below the 15–20% margin developers and lenders commonly look for. Thin margins leave little room for the cost bands to land high.', drivers: ['profitOnCost'] })
    else add({ id: 'margin-ok', severity: 'good', title: `Profit on cost is ${pct(poc)}`, detail: 'At or above a common developer margin hurdle on these inputs.', drivers: ['profitOnCost'] })
  }

  const yoc = value('yieldOnCost')
  const fwd = value('forwardNoi')
  const exit = value('exitValue')
  if (yoc !== null && fwd !== null && exit) {
    const cap = fwd / exit
    const spread = yoc - cap
    const detail = `Yield on cost ${(yoc * 100).toFixed(2)}% vs implied exit cap ${(cap * 100).toFixed(2)}%.`
    if (spread < 0) add({ id: 'spread-negative', severity: 'concern', title: 'Negative development spread', detail: `${detail} The stabilized building is worth less than it costs to build. Returns rely on rent growth or cap-rate compression.`, drivers: ['yieldOnCost', 'exitValue'] })
    else if (spread < 0.01) add({ id: 'spread-thin', severity: 'watch', title: `Thin development spread (${(spread * 1e4).toFixed(0)} bps)`, detail: `${detail} A spread under ~100 bps leaves little margin for building versus buying.`, drivers: ['yieldOnCost', 'exitValue'] })
    else add({ id: 'spread-ok', severity: 'good', title: `Development spread ${(spread * 1e4).toFixed(0)} bps`, detail, drivers: ['yieldOnCost', 'exitValue'] })
  }

  const lev = value('leveredIrr')
  const unlev = value('unleveredIrr')
  if (lev !== null && unlev !== null && lev < unlev) {
    add({ id: 'negative-leverage', severity: 'watch', title: 'Negative leverage', detail: `Levered IRR (${pct(lev)}) is below unlevered (${pct(unlev)}): debt costs more than the project earns, so borrowing reduces equity returns.`, drivers: ['leveredIrr', 'unleveredIrr'] })
  }
  const em = value('equityMultiple')
  if (em !== null && em < 1) add({ id: 'equity-loss', severity: 'concern', title: `Equity multiple ${em.toFixed(2)}×`, detail: 'Investors get back less than they put in on these inputs.', drivers: ['equityMultiple'] })

  const units = value('totalUnits')
  const tdc = value('totalDevelopmentCost')
  if (units && tdc && exit && !isMasterPlan) {
    add({ id: 'per-door', severity: 'info', title: `${M(tdc / units)} cost per home vs ${M(exit / units)} value per home at exit`, detail: 'Per-unit view of cost against the stabilized value (includes commercial value where present).', drivers: ['totalDevelopmentCost', 'exitValue', 'totalUnits'] })
  }

  // --- uncertainty and completeness
  if (input.range) {
    const { p10Profit, p50Profit } = input.range
    if (p50Profit !== null && p50Profit < 0) add({ id: 'range-loss-likely', severity: 'concern', title: 'Likely outcome is a loss', detail: `The median simulated profit is ${M(p50Profit)}. Upward-skewed cost bands pull the likely result below the base case.`, drivers: ['profit'] })
    else if (p10Profit !== null && p10Profit < 0) add({ id: 'range-loss-tail', severity: 'watch', title: 'At least a 1-in-10 chance of a loss', detail: `The P10 profit is ${M(p10Profit)}. Narrowing the widest cost bands reduces this.`, drivers: ['profit'] })
  }
  if (input.unaccountedItems) {
    add({ id: 'unaccounted', severity: 'watch', title: `${input.unaccountedItems} applicable cost items are not in the model`, detail: 'The checklist says these apply to this project. Totals are understated until they are estimated or marked as covered.', drivers: [] })
  }

  insights.sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
  return { buckets, insights, total }
}

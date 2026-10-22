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
  action?: 'model-rezoning' // something the workspace can do about it
  source?: string // where a site fact came from (layer and date)
}

/** One building's mapped limits and proposal, for the site checks. Built by the UI from (scoped) project variables. */
export interface SiteBuilding {
  name: string
  storeys: number
  limitStoreys: number | null
  limitMetres: number | null
  airLimitStoreys: number | null
  fsi: number | null // proposed, by-law GFA ÷ lot area
  fsiLimit?: number | null // this building's own mapped maximum (scoped), else the site's
  source?: (variable: string) => string | undefined // citation from this building's own scope
}

/** Site facts from the map (or entered), for the zoning and site checks. All optional: unknown means no check. */
export interface SiteFacts {
  buildings: SiteBuilding[]
  fsiLimit: number | null
  zbaPlanned: boolean // planning.zba
  holding: boolean
  exception: string | null
  heritage: boolean
  heritageDistrict: string | null
  regulatedArea: boolean
  greenbelt: boolean
  nearAerodrome: boolean
  protectedStationArea: boolean // Toronto PMTSA (inclusionary zoning area)
  residential: boolean
  source: (variable: string) => string | undefined
}

export interface Analysis { buckets: Bucket[]; insights: Insight[]; total: number }

export interface AnalysisInput {
  items: CostItem[]
  metrics: Record<string, { value: number | null } | undefined>
  isMasterPlan: boolean
  range?: { p10Profit: number | null; p50Profit: number | null }
  unaccountedItems?: number
  buildableSqft?: number | null // by-law GFA (or above-grade GCA) for land $/buildable ft²
  site?: SiteFacts
  feasibility?: FeasibilityFacts
}

/** From src/engine/stress.ts: funding gaps (one building) and the combined downside. */
export interface FeasibilityFacts {
  funding: { construction: number; refinance: number; exit: number } | null
  combined: { profitOnCost: number | null; fundingGap: number | null; shocks: string }
}

/** Zoning and site checks: where the proposal sits against mapped limits and policy areas. */
export function siteInsights(site: SiteFacts): Insight[] {
  const out: Insight[] = []
  const names = (bs: SiteBuilding[]) => (bs.length === 1 ? bs[0]!.name : `${bs.length} buildings (${bs.slice(0, 3).map((b) => b.name).join(', ')}${bs.length > 3 ? ', …' : ''})`)
  const overHeight = site.buildings.filter((b) => b.limitStoreys !== null && b.storeys > b.limitStoreys)
  if (overHeight.length) {
    const worst = overHeight.reduce((a, b) => (b.storeys - b.limitStoreys! > a.storeys - a.limitStoreys! ? b : a))
    const by = `${worst.storeys} storeys against a mapped limit of about ${worst.limitStoreys}${worst.limitMetres ? ` (${worst.limitMetres} m)` : ''}`
    const cite = worst.source?.('zoning.heightLimitStoreys') ?? site.source('zoning.heightLimitStoreys')
    out.push(site.zbaPlanned
      ? { id: 'height-rezoning-assumed', severity: 'watch', title: `${names(overHeight)} over the zoning height: rezoning assumed`, detail: `${by}. The project variables say a zoning by-law amendment is planned. Check its fees, studies and the extra months are in the model; an appeal to the Ontario Land Tribunal adds more.`, drivers: [], action: 'model-rezoning', source: cite }
      : { id: 'height-over', severity: 'concern', title: `${names(overHeight)} over the zoning height`, detail: `${by}. As drawn this needs a zoning by-law amendment (or a minor variance for a small overage), which the model does not include yet: fees, studies and 12–24+ months of carry.`, drivers: [], action: 'model-rezoning', source: cite })
  }
  const overAir = site.buildings.filter((b) => b.airLimitStoreys !== null && b.storeys > b.airLimitStoreys)
  if (overAir.length) {
    out.push({ id: 'airport-over', severity: 'concern', title: `${names(overAir)} above the airport height limit`, detail: 'Airport Zoning Regulations are federal: a city rezoning cannot raise them. The building (and its cranes) must stay below the surface, or the design changes. NAV CANADA and Transport Canada reviews apply regardless.', drivers: [], source: overAir[0]!.source?.('site.aeronauticalLimitM') ?? site.source('site.aeronauticalLimitM') })
  } else if (site.nearAerodrome && site.buildings.some((b) => b.airLimitStoreys === null)) {
    out.push({ id: 'airport-check', severity: 'watch', title: 'Near an aerodrome: airport height limit not checked', detail: 'Within the 6 nautical mile screen. Check the Airport Zoning Regulation plan for this airport and enter the limit above ground (surface elevation minus site elevation), then file with NAV CANADA for the building and cranes.', drivers: [], source: site.source('site.nearAerodrome') })
  }
  // each building against its own limit (a block can sit in a different zone from the rest of the plan)
  const limitOf = (b: SiteBuilding) => (b.fsiLimit !== undefined && b.fsiLimit !== null ? b.fsiLimit : site.fsiLimit)
  const overFsi = site.buildings.filter((b) => b.fsi !== null && limitOf(b) !== null && b.fsi > limitOf(b)! + 1e-9)
  if (overFsi.length) {
    const b = overFsi[0]!
    out.push({ id: 'fsi-over', severity: site.zbaPlanned ? 'watch' : 'concern', title: `Density ${b.fsi!.toFixed(2)} FSI against ${limitOf(b)} as-of-right`, detail: `${names(overFsi)} exceed${overFsi.length === 1 ? 's' : ''} the mapped maximum FSI. Additional density needs a rezoning; in Toronto it may also bring community benefits charges and parkland on the extra GFA.`, drivers: ['fsi'], action: 'model-rezoning', source: b.source?.('zoning.fsiLimit') ?? site.source('zoning.fsiLimit') })
  }
  if (site.holding) out.push({ id: 'holding', severity: 'watch', title: 'Holding (H) symbol on the zoning', detail: 'The permissions only take effect once the holding symbol is lifted, usually after conditions such as servicing or agreements are met. Plan for the application and the time before a building permit.', drivers: [], source: site.source('zoning.holding') })
  if (site.exception) out.push({ id: 'exception', severity: 'info', title: `Site-specific zoning exception ${site.exception}`, detail: 'Exceptions can add or remove permissions (height, density, uses, setbacks). Read the exception text before relying on the base zone.', drivers: [], source: site.source('zoning.exception') })
  if (site.greenbelt) out.push({ id: 'greenbelt', severity: 'concern', title: 'Inside the Greenbelt', detail: 'Urban development is generally not permitted in the Protected Countryside; settlement areas and existing permissions are limited. Confirm the designation before modelling anything else.', drivers: [], source: site.source('site.greenbelt') })
  if (site.heritage) out.push({ id: 'heritage', severity: 'watch', title: `Heritage${site.heritageDistrict ? `: ${site.heritageDistrict}` : ''}`, detail: 'Expect a heritage impact assessment, a heritage permit and design constraints on the base building; conservation work and longer review are common costs.', drivers: [], source: site.source('site.heritage') })
  if (site.regulatedArea) out.push({ id: 'regulated', severity: 'watch', title: 'Conservation authority regulated area', detail: 'A permit from the conservation authority may be needed (valley, floodplain, wetland or shoreline). The mapped limit is a screen; the authority confirms.', drivers: [], source: site.source('site.regulatedArea') })
  if (site.protectedStationArea && site.residential) out.push({ id: 'iz', severity: 'info', title: 'Protected major transit station area', detail: "Toronto's inclusionary zoning applies in these areas once in force; implementation is paused until 2027-07-01. Check whether this application's timing would bring affordable-unit requirements.", drivers: [], source: site.source('site.mtsaType') })
  return out
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
    if (poc < 0) add({ id: 'margin-negative', severity: 'concern', title: `Profit on cost is ${pct(poc)}`, detail: 'As entered, the project loses money after construction interest. Something has to change: price, density, cost, or the land deal.', drivers: ['profitOnCost'] })
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
  const profitValue = value('profit')
  if (profitValue !== null && profitValue > 0 && lev !== null && lev < 0) {
    add({ id: 'profit-vs-irr', severity: 'info', title: 'Positive profit, negative levered IRR', detail: `The ${M(profitValue)} profit is undiscounted and before financing. Levered IRR counts interest, loan fees and timing: equity goes in early and comes back late, so investors can lose money in present-value terms while the project shows a profit.`, drivers: ['profit', 'leveredIrr'] })
  }
  const em = value('equityMultiple')
  if (em !== null && em < 1) add({ id: 'equity-loss', severity: 'concern', title: `Equity multiple ${em.toFixed(2)}×`, detail: 'Investors get back less than they put in on these inputs.', drivers: ['equityMultiple'] })

  const fz = input.feasibility
  const fund = fz?.funding
  const gap = fund ? fund.construction + fund.refinance + fund.exit : 0
  if (fund && gap > 0.5) {
    const parts = [
      fund.construction > 0.5 ? `${M(fund.construction)} of construction loan above what a lender would commit (loan-to-cost × the full budget)` : '',
      fund.refinance > 0.5 ? `${M(fund.refinance)} of construction loan the refinance does not repay` : '',
      fund.exit > 0.5 ? `${M(fund.exit)} of loans the sale does not repay` : '',
    ].filter(Boolean)
    add({ id: 'funding-gap', severity: 'concern', title: `Funding gap of ${M(gap)}`, detail: `The plan needs ${parts.join('; ')}. That money has to come from more equity, mezzanine debt or a larger facility, and the returns shown assume it appears. See Feasibility & stress.`, drivers: ['peakDebt', 'debt.ltc', 'permanentLoan'] })
  }
  const base = value('profitOnCost')
  const worst = fz?.combined.profitOnCost ?? null
  if (fz && base !== null && worst !== null) {
    const detail = `With ${fz.combined.shocks} all at once, profit on cost goes from ${(base * 100).toFixed(1)}% to ${(worst * 100).toFixed(1)}%${fz.combined.fundingGap ? ` and the funding gap to ${M(fz.combined.fundingGap)}` : ''}.`
    if (worst < 0) add({ id: 'downside-loss', severity: 'concern', title: 'Loses money if several things go wrong together', detail: `${detail} Deals rarely fail from one shock; check the break-even rents and costs on Feasibility & stress.`, drivers: ['profitOnCost'] })
    else if (worst < base / 2) add({ id: 'downside-thin', severity: 'watch', title: 'Thin margin in a combined downside', detail: `${detail} The margin more than halves.`, drivers: ['profitOnCost'] })
    else add({ id: 'downside-holds', severity: 'good', title: 'Holds up in a combined downside', detail, drivers: ['profitOnCost'] })
  }

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
  const siteFindings = input.site ? siteInsights(input.site) : []
  insights.push(...siteFindings)
  if (input.unaccountedItems) {
    add({ id: 'unaccounted', severity: 'watch', title: `${input.unaccountedItems} applicable cost items are not in the model`, detail: 'The checklist says these apply to this project. Totals are understated until they are estimated or marked as covered.', drivers: [] })
  }

  // most severe first; within a severity, site findings (what the land allows) before the project's own numbers
  const fromSite = new Set(siteFindings.map((i) => i.id))
  insights.sort((a, b) => (severityRank[a.severity] - severityRank[b.severity]) || (Number(fromSite.has(b.id)) - Number(fromSite.has(a.id))))
  return { buckets, insights, total }
}

// ADR-002 decision 2: every uncertain driver carries a band; results are P10 / P50 / P90.
// Deterministic: the seed is an input (ADR-001), so the same inputs and seed always give the same answer.

import { bandOf, type Band, type CostLine, type Driver } from './costs'
import { isPortfolio, runNode, type Node, type NodeResult } from './portfolio'
import type { Component, ProjectInput } from './project'

export interface Uncertainty {
  key: string // "<path>/cost:<line>" | "<path>/<component>:revenue" | "<path>/<component>:cap"
  label: string
  band: Band
}

const hasWidth = (band: Band) => band.low !== 0 || band.high !== 0

export function listUncertainties(node: Node, path = node.id, isChild = false): Uncertainty[] {
  const where = isChild ? ` · ${node.name}` : '' // keeps labels unique when many blocks share line names
  const list: Uncertainty[] = node.costLines
    .filter((line) => line.driver !== null && hasWidth(bandOf(line)))
    .map((line) => ({ key: `${path}/cost:${line.id}`, label: `${line.label} (${line.estimateClass === 'exact' ? 'override' : `class ${line.estimateClass}`})${where}`, band: bandOf(line) }))
  if (isPortfolio(node)) {
    for (const child of node.children) list.push(...listUncertainties(child.node, `${path}/${child.node.id}`, true))
    return list
  }
  for (const c of node.components) {
    if (c.revenueBand && hasWidth(c.revenueBand)) list.push({ key: `${path}/${c.id}:revenue`, label: `${c.id} rents/prices${where}`, band: c.revenueBand })
    if ((c.kind === 'rental' || c.kind === 'commercial') && c.capRateBand && hasWidth(c.capRateBand)) {
      list.push({ key: `${path}/${c.id}:cap`, label: `${c.id} exit cap rate${where}`, band: c.capRateBand })
    }
  }
  return list
}

function scaleDriver(d: Driver, k: number): Driver {
  switch (d.kind) {
    case 'lumpSum': return { ...d, amount: d.amount * k }
    case 'percentOf': return { ...d, rate: d.rate * k }
    default: return { ...d, rate: d.rate * k }
  }
}

function scaleComponent(c: Component, revenue: number, cap: number): Component {
  switch (c.kind) {
    case 'rental': return { ...c, unitMix: c.unitMix.map((u) => ({ ...u, monthlyRent: u.monthlyRent * revenue })), otherIncomeMonthly: c.otherIncomeMonthly * revenue, exitCapRate: c.exitCapRate * cap }
    case 'commercial': return { ...c, rentPerSqftYear: c.rentPerSqftYear * revenue, exitCapRate: c.exitCapRate * cap }
    case 'condo': return { ...c, units: c.units.map((u) => ({ ...u, pricePerSqft: u.pricePerSqft * revenue })) }
    case 'landSale': return { ...c, sales: c.sales.map((s) => ({ ...s, amount: s.amount * revenue })) }
  }
}

/** Returns a copy of the node with multipliers applied by uncertainty key. Missing keys mean ×1. */
export function applyMultipliers(node: Node, multipliers: Map<string, number>, path = node.id): Node {
  const k = (key: string) => multipliers.get(key) ?? 1
  const costLines: CostLine[] = node.costLines.map((line) =>
    line.driver === null ? line : { ...line, driver: scaleDriver(line.driver, k(`${path}/cost:${line.id}`)) })
  if (isPortfolio(node)) {
    return { ...node, costLines, children: node.children.map((c) => ({ ...c, node: applyMultipliers(c.node, multipliers, `${path}/${c.node.id}`) })) }
  }
  const project: ProjectInput = {
    ...node,
    costLines,
    components: node.components.map((c) => scaleComponent(c, k(`${path}/${c.id}:revenue`), k(`${path}/${c.id}:cap`))),
  }
  return project
}

/** mulberry32: small, fast, deterministic PRNG. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Inverse-CDF sample from a triangular distribution (low a, mode c, high b). */
export function triangular(u: number, a: number, c: number, b: number): number {
  if (b === a) return a
  const f = (c - a) / (b - a)
  return u < f ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c))
}

export function percentile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo]! + ((sorted[hi]! - sorted[lo]!) * (pos - lo))
}

export interface Distribution {
  p10: number | null
  p50: number | null
  p90: number | null
  mean: number | null
  base: number | null
  unavailable: number // draws where the metric had no value (e.g. IRR with no sign change)
  valid: number // draws with a result; percentiles are conditional on these
  shareBelowZero: number | null // share of valid draws below zero, under the model's own band assumptions
}

export interface Simulation {
  draws: number
  seed: number
  metrics: Record<string, Distribution>
}

/**
 * Monte Carlo over all bands, sampled independently.
 * ponytail: independent draws ignore correlation (e.g. all hard trades moving together); add a correlation matrix when calibrating against real tenders.
 */
export function simulate(node: Node, options: { draws: number; seed: number; metrics: string[] }): Simulation {
  const base = runNode(node)
  if (!base.complete) throw new RangeError(`Cannot simulate an incomplete model; not yet estimated: ${base.missing.join(', ')}`)
  const uncertainties = listUncertainties(node)
  const next = rng(options.seed)
  const samples: Record<string, number[]> = Object.fromEntries(options.metrics.map((id) => [id, []]))
  const unavailable: Record<string, number> = Object.fromEntries(options.metrics.map((id) => [id, 0]))

  for (let i = 0; i < options.draws; i++) {
    const multipliers = new Map(uncertainties.map((u) => [u.key, triangular(next(), 1 + u.band.low, 1, 1 + u.band.high)]))
    const result = runNode(applyMultipliers(node, multipliers))
    for (const id of options.metrics) {
      const v = result.metrics[id]?.value
      if (v === null || v === undefined) unavailable[id]!++
      else samples[id]!.push(v)
    }
  }

  const metrics: Record<string, Distribution> = {}
  for (const id of options.metrics) {
    const sorted = samples[id]!.sort((a, b) => a - b)
    const has = sorted.length > 0
    metrics[id] = {
      p10: has ? percentile(sorted, 0.1) : null,
      p50: has ? percentile(sorted, 0.5) : null,
      p90: has ? percentile(sorted, 0.9) : null,
      mean: has ? sorted.reduce((s, v) => s + v, 0) / sorted.length : null,
      base: base.metrics[id]?.value ?? null,
      unavailable: unavailable[id]!,
      valid: sorted.length,
      shareBelowZero: has ? sorted.filter((v) => v < 0).length / sorted.length : null,
    }
  }
  return { draws: options.draws, seed: options.seed, metrics }
}

export interface TornadoBar {
  key: string
  label: string
  low: number | null // metric with this driver at its low end
  high: number | null // metric with this driver at its high end
  swing: number // |high − low|, 0 when unavailable
}

/** One-at-a-time sensitivity: which drivers move the metric most. */
export function tornado(node: Node, metricId: string): { base: number | null; bars: TornadoBar[] } {
  const base: NodeResult = runNode(node)
  const read = (n: Node) => runNode(n).metrics[metricId]?.value ?? null
  const bars = listUncertainties(node).map((u) => {
    const low = read(applyMultipliers(node, new Map([[u.key, 1 + u.band.low]])))
    const high = read(applyMultipliers(node, new Map([[u.key, 1 + u.band.high]])))
    return { key: u.key, label: u.label, low, high, swing: low === null || high === null ? 0 : Math.abs(high - low) }
  })
  return { base: base.metrics[metricId]?.value ?? null, bars: bars.sort((a, b) => b.swing - a.swing) }
}

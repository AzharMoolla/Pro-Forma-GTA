// Cost lines (ADR-002 decision 4): the engine only knows driver kinds; what a line *is* lives in data/costs/catalogue.json.

import { roundCents } from './money'

export type EstimateClass = 'A' | 'B' | 'C' | 'D' | 'exact'

/** Fractional range around the base estimate, e.g. { low: -0.3, high: 0.5 }. */
export interface Band {
  low: number
  high: number
}

// ADR-002 defaults: D, C, A from Alberta Infrastructure (ASTM E2516-11 + CIQS); B interpolated. Overridable per line.
export const DEFAULT_BANDS: Record<EstimateClass, Band> = {
  D: { low: -0.3, high: 0.5 },
  C: { low: -0.2, high: 0.3 },
  B: { low: -0.15, high: 0.2 },
  A: { low: -0.05, high: 0.1 },
  exact: { low: 0, high: 0 },
}

export type Driver =
  | { kind: 'lumpSum'; amount: number }
  | { kind: 'perUnit'; rate: number; units: number }
  | { kind: 'perArea'; rate: number; area: number }
  | { kind: 'perLinear'; rate: number; metres: number }
  | { kind: 'perHectare'; rate: number; hectares: number }
  | { kind: 'percentOf'; rate: number; of: string[] }

export type Timing =
  | { kind: 'month'; month: number }
  | { kind: 'spread'; from: number; to: number } // inclusive, straight-line
  | { kind: 'constructionStart' }
  | { kind: 'construction' } // C7: straight-line over construction months
  | { kind: 'completion' }

/**
 * Where a cost line's figure comes from (per-field provenance). Review is recorded by a person; a catalogue
 * "verified" tag says the rule's source was checked, not that this project's figure was.
 */
export interface SourceRecord {
  kind: 'quote' | 'benchmark' | 'schedule' | 'contract' | 'actual' | 'estimate' | 'synthetic'
  ref?: string // document, URL or quote number
  valueDate?: string // YYYY-MM-DD the figure applies to (quote date, schedule effective date, benchmark edition)
  retrievedAt?: string // YYYY-MM-DD it was looked up
  owner?: string // who stands behind the assumption
  reviewed?: { by: string; at: string } // YYYY-MM-DD
  note?: string
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export interface CostLine {
  id: string
  label: string
  catalogueId?: string
  driver: Driver | null // null = not yet estimated (C16)
  timing: Timing
  estimateClass: EstimateClass
  band?: Band // overrides the class default
  escalate?: boolean // C19: escalate from month 0 to the month spent
  source?: SourceRecord
}

export interface ScheduleContext {
  preConstructionMonths: number
  constructionMonths: number
  escalation: number // annual
}

export function bandOf(line: CostLine): Band {
  return line.band ?? DEFAULT_BANDS[line.estimateClass]
}

function baseAmount(driver: Exclude<Driver, { kind: 'percentOf' }>): number {
  switch (driver.kind) {
    case 'lumpSum': return driver.amount
    case 'perUnit': return driver.rate * driver.units
    case 'perArea': return driver.rate * driver.area
    case 'perLinear': return driver.rate * driver.metres
    case 'perHectare': return driver.rate * driver.hectares
  }
}

/** Unescalated line totals. null = not yet estimated, or depends on a line that is not. */
export function lineTotals(lines: CostLine[]): Map<string, number | null> {
  const byId = new Map(lines.map((line) => [line.id, line]))
  if (byId.size !== lines.length) throw new RangeError('Cost line ids must be unique')
  const totals = new Map<string, number | null>()
  const visiting = new Set<string>()

  const resolve = (id: string): number | null => {
    if (totals.has(id)) return totals.get(id)!
    const line = byId.get(id)
    if (!line) throw new RangeError(`percentOf references unknown cost line "${id}"`)
    if (visiting.has(id)) throw new RangeError(`Cost line "${id}" depends on itself`)
    visiting.add(id)
    const driver = line.driver
    let total: number | null
    if (driver === null) total = null
    else if (driver.kind === 'percentOf') {
      const bases = driver.of.map(resolve)
      total = bases.includes(null) ? null : roundCents(driver.rate * (bases as number[]).reduce((sum, b) => sum + b, 0))
    } else total = roundCents(baseAmount(driver))
    visiting.delete(id)
    totals.set(id, total)
    return total
  }

  for (const line of lines) resolve(line.id)
  return totals
}

export function timingMonths(timing: Timing, ctx: ScheduleContext): number[] {
  const start = ctx.preConstructionMonths + 1
  const end = ctx.preConstructionMonths + ctx.constructionMonths
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
  switch (timing.kind) {
    case 'month': return [timing.month]
    case 'spread': return range(timing.from, timing.to)
    case 'constructionStart': return [start]
    case 'construction': return range(start, end)
    case 'completion': return [end]
  }
}

/** Monthly amounts for one line. The last month takes the rounding remainder, so unescalated totals tie exactly. */
export function scheduleLine(total: number, line: CostLine, ctx: ScheduleContext): Map<number, number> {
  const months = timingMonths(line.timing, ctx)
  const perMonth = roundCents(total / months.length)
  const schedule = new Map<number, number>()
  months.forEach((month, i) => {
    const base = i < months.length - 1 ? perMonth : roundCents(total - (perMonth * (months.length - 1)))
    const amount = line.escalate ? roundCents(base * ((1 + ctx.escalation) ** (month / 12))) : base
    schedule.set(month, roundCents((schedule.get(month) ?? 0) + amount))
  })
  return schedule
}

export function validateCostLines(lines: CostLine[], allowConstructionTiming = true): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  for (const line of lines) {
    if (ids.has(line.id)) errors.push(`cost line id "${line.id}" is repeated`)
    ids.add(line.id)
    const t = line.timing
    if (!allowConstructionTiming && t.kind !== 'month' && t.kind !== 'spread') {
      errors.push(`${line.id}: only month/spread timing is allowed here`)
    }
    if (t.kind === 'month' && !(Number.isInteger(t.month) && t.month >= 0)) errors.push(`${line.id}: month must be a whole number ≥ 0`)
    if (t.kind === 'spread' && !(Number.isInteger(t.from) && Number.isInteger(t.to) && t.from >= 0 && t.to >= t.from)) {
      errors.push(`${line.id}: spread needs whole months with 0 ≤ from ≤ to`)
    }
    const band = bandOf(line)
    if (!(band.low <= 0 && band.low > -1 && band.high >= 0)) errors.push(`${line.id}: band must satisfy -1 < low ≤ 0 ≤ high`)
    const src = line.source
    if (src) {
      for (const [k, v] of [['valueDate', src.valueDate], ['retrievedAt', src.retrievedAt], ['reviewed.at', src.reviewed?.at]] as const) {
        if (v !== undefined && !ISO_DATE.test(v)) errors.push(`${line.id}: source.${k} must be YYYY-MM-DD`)
      }
      if (src.reviewed && !src.reviewed.by.trim()) errors.push(`${line.id}: source.reviewed.by must name the reviewer`)
    }
    const d = line.driver
    if (d) {
      const numbers = Object.values(d).filter((v): v is number => typeof v === 'number')
      if (!numbers.every(Number.isFinite)) errors.push(`${line.id}: driver values must be finite numbers`)
    }
  }
  try {
    lineTotals(lines)
  } catch (error) {
    errors.push((error as Error).message)
  }
  return errors
}

// Land value: the three ways an appraiser values development land, side by side, then reconciled.
//
// 1. Direct comparison: recent land sales, each adjusted to the subject (time, location, site and zoning), expressed
//    per buildable ft² (or per acre when buildable area is unknown), applied to the subject.
// 2. Residual: what the project supports after every cost and the developer's required return (solved by the model;
//    passed in here as a number, so this module stays a pure calculator).
// 3. Existing use: what the site is worth as it is (its net operating income ÷ a cap rate). Not a value for the
//    redevelopment, but the floor: an owner will not sell for less, so redevelopment needs the land value to beat it.
//
// Pure: dates arrive as strings (no clock), and every result says what it rests on. Unknown stays unknown.

export interface Comparable {
  id: string
  label: string
  /** YYYY-MM-DD */
  saleDate: string
  price: number
  acres: number | null
  /** Permitted or approved gross floor area the price bought (ft²); null when unknown */
  buildableSqft: number | null
  /** Percent adjustments to make the sale like the subject: + when the subject is better, − when worse */
  adjustments: { location: number; siteAndZoning: number; other: number }
  source: string
  url?: string
}

export interface AppraisalInput {
  /** YYYY-MM-DD the value is estimated at */
  effectiveDate: string
  /** Annual change in land values since each sale (time adjustment), e.g. −0.05 in a falling market */
  marketChangePerYear: number
  comps: Comparable[]
  existingUse: { noi: number | null; capRate: number | null }
  /** Weight given to comparables against the residual when reconciling (0–1); the residual gets the rest */
  comparablesWeight: number
  /** How far the land value must exceed existing-use value for redevelopment to make sense (NBLC uses 10%) */
  redevelopmentMargin: number
}

export interface Subject { buildableSqft: number | null; acres: number | null }

export interface AdjustedComparable {
  comp: Comparable
  months: number | null
  time: number | null
  net: number | null
  gross: number | null
  perBuildableSqft: number | null
  perAcre: number | null
  /** Appraisal rule of thumb: a sale needing more than 25% gross or 15% net adjustment is a weak comparable */
  weak: boolean
  problems: string[]
}

export interface Indication { low: number; mid: number; high: number; basis: 'buildable ft²' | 'acre'; used: number; rate: { low: number; mid: number; high: number } }

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

/** Whole months from one date to another (positive when `to` is later); null for a malformed date. */
export function monthsBetween(from: string, to: string): number | null {
  const a = ISO.exec(from), b = ISO.exec(to)
  if (!a || !b) return null
  const months = ((Number(b[1]) - Number(a[1])) * 12) + (Number(b[2]) - Number(a[2])) + ((Number(b[3]) - Number(a[3])) / 30.4375)
  return Math.round(months * 10) / 10
}

export function adjust(c: Comparable, input: AppraisalInput): AdjustedComparable {
  const problems: string[] = []
  if (!(c.price > 0)) problems.push('price must be above zero')
  if (c.acres !== null && !(c.acres > 0)) problems.push('site area must be above zero')
  if (c.buildableSqft !== null && !(c.buildableSqft > 0)) problems.push('buildable area must be above zero')
  const months = monthsBetween(c.saleDate, input.effectiveDate)
  if (months === null) problems.push('sale date must be YYYY-MM-DD')
  else if (months < 0) problems.push('sale is after the effective date')
  const time = months === null ? null : input.marketChangePerYear * (months / 12)
  const parts = [c.adjustments.location, c.adjustments.siteAndZoning, c.adjustments.other]
  // Additive adjustments, the common practice for land: net = sum, gross = sum of sizes
  const net = time === null ? null : time + parts.reduce((t, x) => t + x, 0)
  const gross = time === null ? null : Math.abs(time) + parts.reduce((t, x) => t + Math.abs(x), 0)
  const ok = problems.length === 0 && net !== null
  const k = ok ? 1 + net! : null
  return {
    comp: c, months, time, net, gross,
    perBuildableSqft: ok && c.buildableSqft ? (c.price / c.buildableSqft) * k! : null,
    perAcre: ok && c.acres ? (c.price / c.acres) * k! : null,
    weak: gross !== null && (gross > 0.25 || Math.abs(net!) > 0.15),
    problems,
  }
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2 }

/** Direct comparison: per buildable ft² when the subject and at least one sale have it, otherwise per acre. */
export function directComparison(input: AppraisalInput, subject: Subject): Indication | null {
  const adjusted = input.comps.map((c) => adjust(c, input)).filter((a) => a.problems.length === 0)
  const pick = (basis: Indication['basis'], rates: number[], size: number | null): Indication | null => {
    if (!rates.length || !size) return null
    const r = { low: Math.min(...rates), mid: median(rates), high: Math.max(...rates) }
    return { basis, used: rates.length, rate: r, low: r.low * size, mid: r.mid * size, high: r.high * size }
  }
  return pick('buildable ft²', adjusted.flatMap((a) => (a.perBuildableSqft === null ? [] : [a.perBuildableSqft])), subject.buildableSqft)
    ?? pick('acre', adjusted.flatMap((a) => (a.perAcre === null ? [] : [a.perAcre])), subject.acres)
}

export const existingUseValue = (input: AppraisalInput): number | null =>
  input.existingUse.noi !== null && input.existingUse.capRate !== null && input.existingUse.capRate > 0 ? input.existingUse.noi / input.existingUse.capRate : null

export interface Reconciled {
  /** Weighted value of the market indications available (comparables' median and the residual) */
  value: number | null
  low: number | null
  high: number | null
  weights: { comparables: number; residual: number }
  /** Existing use as a floor: does the land value beat it by the margin? null when either is unknown */
  redevelopmentMakesSense: boolean | null
  basis: string[]
}

export function reconcile(comps: Indication | null, residual: number | null, existingUse: number | null, input: AppraisalInput): Reconciled {
  const w = Math.min(1, Math.max(0, input.comparablesWeight))
  const weights = comps && residual !== null ? { comparables: w, residual: 1 - w } : comps ? { comparables: 1, residual: 0 } : residual !== null ? { comparables: 0, residual: 1 } : { comparables: 0, residual: 0 }
  const value = comps || residual !== null ? ((comps?.mid ?? 0) * weights.comparables) + ((residual ?? 0) * weights.residual) : null
  const points = [...(comps && weights.comparables > 0 ? [comps.low, comps.high] : []), ...(residual !== null && weights.residual > 0 ? [residual] : [])]
  const basis = [
    comps ? `comparables: median of ${comps.used} adjusted sale${comps.used === 1 ? '' : 's'} per ${comps.basis}, weight ${Math.round(weights.comparables * 100)}%` : 'comparables: none usable',
    residual !== null ? `residual: from the model at your target return, weight ${Math.round(weights.residual * 100)}%` : 'residual: not available',
    existingUse !== null ? `existing use: NOI ÷ cap rate, used as the floor with a ${Math.round(input.redevelopmentMargin * 100)}% margin` : 'existing use: not entered',
  ]
  return {
    value, low: points.length ? Math.min(...points) : null, high: points.length ? Math.max(...points) : null, weights,
    redevelopmentMakesSense: value !== null && existingUse !== null ? value >= existingUse * (1 + input.redevelopmentMargin) : null,
    basis,
  }
}

export const DEFAULT_APPRAISAL: Omit<AppraisalInput, 'effectiveDate'> = {
  marketChangePerYear: 0, comps: [], existingUse: { noi: null, capRate: null }, comparablesWeight: 0.5, redevelopmentMargin: 0.1,
}

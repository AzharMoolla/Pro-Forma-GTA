// Time-value primitives. Rates here are per period unless a name says annual.

export function monthlyFromNominalAnnual(annualRate: number): number {
  return annualRate / 12 // C4: lending rates are nominal annual
}

export function monthlyFromEffectiveAnnual(annualRate: number): number {
  return ((1 + annualRate) ** (1 / 12)) - 1 // C4: discount rates are effective annual
}

export function annualizeMonthly(monthlyRate: number): number {
  return ((1 + monthlyRate) ** 12) - 1
}

export function annuityPayment(principal: number, rate: number, periods: number): number {
  if (periods <= 0) throw new RangeError('periods must be positive')
  if (rate === 0) return principal / periods
  return (principal * rate) / (1 - ((1 + rate) ** -periods))
}

export function annuityPresentValue(payment: number, rate: number, periods: number): number {
  if (periods <= 0) throw new RangeError('periods must be positive')
  if (rate === 0) return payment * periods
  return (payment * (1 - ((1 + rate) ** -periods))) / rate
}

/** Flows at period ends; index 0 is undiscounted. */
export function npv(rate: number, flows: number[]): number {
  return flows.reduce((total, flow, t) => total + (flow / ((1 + rate) ** t)), 0)
}

export interface IrrResult {
  rate: number | null
  warnings: string[]
}

/** Periodic IRR by bisection. Returns null rather than a misleading number. */
export function irr(flows: number[]): IrrResult {
  const nonZero = flows.filter((flow) => flow !== 0)
  let signChanges = 0
  for (let i = 1; i < nonZero.length; i++) {
    if (Math.sign(nonZero[i]!) !== Math.sign(nonZero[i - 1]!)) signChanges++
  }
  if (signChanges === 0) return { rate: null, warnings: ['IRR unavailable: cash flows never change sign'] }

  const f = (rate: number) => npv(rate, flows)
  if (signChanges > 1) {
    // C15: several sign changes can give several rates with NPV = 0. Report one only if it is the only one.
    const brackets = rootBrackets(f)
    if (brackets.length > 1) return { rate: null, warnings: [`IRR unavailable: ${brackets.length} different rates give NPV = 0 (cash flows change sign ${signChanges} times). Use NPV at a stated discount rate`] }
    if (!brackets.length) return { rate: null, warnings: ['IRR unavailable: no root found'] }
    return { rate: bisect(f, ...brackets[0]!), warnings: ['Cash flows change sign more than once; only one IRR exists between −99% and +1,000% per period'] }
  }

  // One sign change (Descartes): exactly one root above −100%.
  // Widen the bracket only while NPV stays finite: near −100% per period, long series underflow to ∞ − ∞ = NaN.
  let low = -0.5
  let high = 1
  const bracketed = () => Number.isFinite(f(low)) && Number.isFinite(f(high)) && f(low) * f(high) <= 0
  for (const candidate of [-0.9, -0.99, -0.999]) {
    if (bracketed() || !Number.isFinite(f(candidate))) break
    low = candidate
  }
  while (!bracketed() && high < 1e6 && Number.isFinite(f(high * 2))) high *= 2
  if (!bracketed()) return { rate: null, warnings: ['IRR unavailable: no root found'] }
  return { rate: bisect(f, low, high), warnings: [] }
}

function bisect(f: (rate: number) => number, low: number, high: number): number {
  for (let i = 0; i < 300; i++) {
    const mid = (low + high) / 2
    if (f(low) * f(mid) <= 0) high = mid
    else low = mid
    if (high - low < 1e-13) break
  }
  return (low + high) / 2
}

/** Intervals where NPV changes sign, over a grid of per-period rates geometric in (1 + r) from −99% to +1,000%. */
function rootBrackets(f: (rate: number) => number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  let previous: [number, number] | null = null
  for (let i = 0; i <= 2_000; i++) {
    const rate = (0.01 * (1_100 ** (i / 2_000))) - 1
    const value = f(rate)
    if (!Number.isFinite(value)) continue
    if (previous && (value === 0 || Math.sign(value) !== Math.sign(previous[1]))) out.push([previous[0], rate])
    previous = value === 0 ? null : [rate, value]
  }
  return out
}

export type LoanConstraint = 'dscr' | 'ltv' | 'ltc'

export interface LoanSizing {
  amount: number
  binding: LoanConstraint
  capacities: Record<LoanConstraint, number>
  warnings: string[]
}

/** C13: maxLoan = min(DSCR capacity, value x LTV, cost x LTC). Audit PF-001 (divide, not subtract), PF-008 (LTV applies). */
export function sizeLoan(input: {
  noiAnnual: number
  value: number
  cost: number
  annualRate: number
  amortizationYears: number
  dscr: number
  ltv: number
  ltc: number
}): LoanSizing {
  const warnings: string[] = []
  let dscrCapacity = 0
  if (input.noiAnnual <= 0) warnings.push('NOI is not positive: no DSCR loan capacity')
  else {
    const maxMonthlyDebtService = input.noiAnnual / input.dscr / 12
    dscrCapacity = annuityPresentValue(
      maxMonthlyDebtService,
      monthlyFromNominalAnnual(input.annualRate),
      input.amortizationYears * 12,
    )
  }
  const capacities: Record<LoanConstraint, number> = {
    dscr: dscrCapacity,
    ltv: Math.max(0, input.value * input.ltv),
    ltc: Math.max(0, input.cost * input.ltc),
  }
  const binding = (Object.keys(capacities) as LoanConstraint[]).reduce((a, b) => (capacities[b] < capacities[a] ? b : a))
  return { amount: capacities[binding], binding, capacities, warnings }
}

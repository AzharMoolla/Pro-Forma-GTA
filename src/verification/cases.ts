// Expected vs actual. Each case states its inputs, the expected answer worked out by hand (or from a statute or
// textbook formula, written here independently of the engine), and the engine's actual answer. The same list runs in
// the test suite and on the Verification page, so a wrong formula fails the build and is visible to users. Pure.

import mockAJson from '../../data/projects/mock-a-toronto-mixed-use.json'
import { applyAssumptions } from '../engine/assumptions'
import { lineTotals } from '../engine/costs'
import { annualizeMonthly, annuityPayment, irr, monthlyFromNominalAnnual, sizeLoan } from '../engine/finance'
import { funding } from '../engine/funding'
import { runNode } from '../engine/portfolio'
import { runProject, type ProjectInput } from '../engine/project'
import { toProject } from '../engine/rental'
import { solve, stress } from '../engine/stress'
import { hstTiming, ontarioLtt } from '../engine/tax'
import { canadianMortgageMonthlyRate } from '../engine/affordability'

export interface Case {
  id: string
  kind: 'math' | 'fact' | 'behaviour'
  title: string
  inputs: string
  expected: number
  derivation: string // how the expected value was worked out, or the source
  actual: () => number | null
  tolerance: number // absolute
  unit: 'CAD' | 'rate' | 'ratio'
}

export interface CaseResult { case: Case; actual: number | null; diff: number | null; pass: boolean; error?: string }

export function runCase(c: Case): CaseResult {
  try {
    const actual = c.actual()
    const diff = actual === null ? null : actual - c.expected
    return { case: c, actual, diff, pass: diff !== null && Math.abs(diff) <= c.tolerance }
  } catch (e) {
    return { case: c, actual: null, diff: null, pass: false, error: (e as Error).message }
  }
}

/** Two units at $1,000/month, land $50k at month 0, hard cost $100 × 1,000 ft² over months 1–2, 12%/yr loan at 50% LTC, exit month 4 at a 6% cap. */
export const tiny = (): ProjectInput => ({
  ...toProject({
    unitMix: [{ id: 'one_bed', count: 2, netSqftPerUnit: 500, monthlyRent: 1000, vacancy: 0 }],
    lotAreaSqft: 2000, planningGfaSqft: 900, gcaAboveSqft: 1000, gcaBelowSqft: 0, landCost: 50_000, levies: 0, hardCostPerGcaSqft: 100,
    softCostFraction: 0, contingencyFraction: 0, opexPerUnitMonthly: 0, otherIncomeMonthly: 0,
    timing: { preConstructionMonths: 0, constructionMonths: 2, leaseUpMonths: 0, exitMonth: 4 },
    debt: { annualRate: 0.12, ltc: 0.5, ltv: 0.65, dscr: 1.25, amortizationYears: 25 },
    exit: { capRate: 0.06, sellingCostFraction: 0 }, discountRate: 0.1,
  }),
  id: 'tiny', name: 'Tiny',
})

const mockA = mockAJson.input as unknown as ProjectInput
const lineTotal = (p: ProjectInput, id: string) => lineTotals(p.costLines).get(id) ?? null

export const CASES: Case[] = [
  // ---- arithmetic
  { id: 'V-01', kind: 'math', title: 'Annuity payment', inputs: '$100,000 at 6% nominal, monthly, 25 years', expected: 644.30, derivation: 'P·r ÷ (1 − (1 + r)^−n), r = 0.5%, n = 300 → 644.3014', actual: () => annuityPayment(100_000, monthlyFromNominalAnnual(0.06), 300), tolerance: 0.01, unit: 'CAD' },
  { id: 'V-02', kind: 'math', title: 'IRR, annualized', inputs: 'Flows −100 then +110 one month later', expected: 2.138428, derivation: 'Monthly IRR 10%; (1.10)^12 − 1 = 2.138428', actual: () => { const r = irr([-100, 110]).rate; return r === null ? null : annualizeMonthly(r) }, tolerance: 1e-6, unit: 'rate' },
  { id: 'V-03', kind: 'math', title: 'IRR refused when not unique', inputs: 'Flows −100, +230, −132 (roots at 10% and 20%)', expected: 1, derivation: 'Two sign changes and two roots: C15 says show none (1 = unavailable)', actual: () => (irr([-100, 230, -132]).rate === null ? 1 : 0), tolerance: 0, unit: 'ratio' },
  { id: 'V-04', kind: 'math', title: 'DSCR loan size', inputs: 'NOI $120,000/yr, DSCR 1.25, 5% nominal, 25 years', expected: 1_368_480.38, derivation: 'Max payment 120,000 ÷ 1.25 ÷ 12 = 8,000/month; PV over 300 months at 5%/12 = 1,368,480.38', actual: () => sizeLoan({ noiAnnual: 120_000, value: 1e12, cost: 1e12, annualRate: 0.05, amortizationYears: 25, dscr: 1.25, ltv: 1, ltc: 1 }).amount, tolerance: 0.01, unit: 'CAD' },
  { id: 'V-05', kind: 'math', title: 'Canadian mortgage monthly rate', inputs: '5% compounded semi-annually (Interest Act)', expected: 0.004123915, derivation: '(1 + 0.05/2)^(1/6) − 1', actual: () => canadianMortgageMonthlyRate(0.05), tolerance: 1e-9, unit: 'rate' },
  // ---- the engine on a project small enough to do by hand
  { id: 'V-06', kind: 'math', title: 'Exit value by direct capitalization', inputs: 'Tiny: 2 × $1,000/month, no vacancy or opex, 6% cap', expected: 400_000, derivation: '24,000 NOI ÷ 0.06', actual: () => runProject(tiny()).metrics.exitValue!.value, tolerance: 0.01, unit: 'CAD' },
  { id: 'V-07', kind: 'math', title: 'Equity before the loan (C8)', inputs: 'Tiny: budget to completion $150,000, LTC 50%', expected: 75_000, derivation: 'Land 50k all equity, then equity to (1 − 0.5) × 150k = 75k', actual: () => runProject(tiny()).ledger.reduce((s, r) => s + (r.month <= 2 ? r.equityDraw : 0), 0), tolerance: 0.01, unit: 'CAD' },
  { id: 'V-08', kind: 'math', title: 'Peak construction loan', inputs: 'Tiny: 25k drawn month 1, 1% interest, 50k drawn month 2', expected: 75_250, derivation: '25,000 + 250 capitalized + 50,000', actual: () => funding(tiny(), runProject(tiny())).peakDebt, tolerance: 0.01, unit: 'CAD' },
  { id: 'V-09', kind: 'math', title: 'Funding gap above the commitment', inputs: 'Tiny', expected: 125, derivation: 'Commitment 0.5 × (150,000 + 250) = 75,125; loan 75,250 → 125 (the equity share of interest)', actual: () => funding(tiny(), runProject(tiny())).constructionGap, tolerance: 0.01, unit: 'CAD' },
  { id: 'V-10', kind: 'math', title: 'HST rebate, standard rental rules', inputs: 'Tiny: FMV $400,000, 2 units ($200k each)', expected: 31_200, derivation: 'Federal 36% × 5% × 200k = 3,600 (under $6,300); Ontario 75% × 8% × 200k = 12,000 (under $24,000); × 2', actual: () => hstTiming(tiny(), { rebate: 'standard', itcLagMonths: 2 }).rebate, tolerance: 0.01, unit: 'CAD' },
  // ---- facts: the model against statutes and published rules
  { id: 'V-11', kind: 'fact', title: 'Ontario land transfer tax on $62M (non-residential)', inputs: 'Statutory brackets', expected: 1_236_475, derivation: '0.5% × 55k + 1% × 195k + 1.5% × 150k + 2% × 61.6M (Land Transfer Tax Act; 2.5% band is for 1–2 single-family homes only)', actual: () => ontarioLtt(62_000_000), tolerance: 0.01, unit: 'CAD' },
  { id: 'V-12', kind: 'fact', title: 'Mock A provincial LTT line matches the statute', inputs: 'Mock A land $62M', expected: ontarioLtt(62_000_000), derivation: 'Same statute applied to the land line', actual: () => lineTotal(mockA, 'ontario-ltt'), tolerance: 1, unit: 'CAD' },
  { id: 'V-13', kind: 'fact', title: 'Parkland cash-in-lieu within the Planning Act cap', inputs: 'Mock A, site ≤ 5 ha', expected: 0.1, derivation: 'Planning Act s.42 (Bill 23): ≤ 10% of land value for sites ≤ 5 ha. Actual = charge ÷ land', actual: () => { const l = lineTotal(mockA, 'land-price'); const c = lineTotal(mockA, 'parkland-cil'); return l && c !== null ? c / l : null }, tolerance: 1e-9, unit: 'ratio' },
  { id: 'V-14', kind: 'fact', title: 'Community Benefits Charge within the cap', inputs: 'Mock A', expected: 0.04, derivation: 'Planning Act s.37: ≤ 4% of land value. Actual = charge ÷ land', actual: () => { const l = lineTotal(mockA, 'land-price'); const c = lineTotal(mockA, 'cbc'); return l && c !== null ? c / l : null }, tolerance: 1e-9, unit: 'ratio' },
  // ---- behaviour: solved values hit their targets, switches do what they say
  { id: 'V-15', kind: 'behaviour', title: 'Residual land value hits the target', inputs: 'Tiny, profit on cost 15%', expected: 0.15, derivation: 'Solve for land, re-run, read profit on cost', actual: () => { const s = solve(tiny(), 'land', 'profitOnCost', 0.15); return s.multiplier === null ? null : runNode(stress(tiny(), { land: s.multiplier })).metrics.profitOnCost!.value }, tolerance: 1e-4, unit: 'rate' },
  { id: 'V-16', kind: 'behaviour', title: 'Switching off escalation prices at today\'s cost', inputs: 'Mock A, escalation off', expected: 0, derivation: 'Escalated lines total = their entered amounts when escalation is 0 (actual = difference)', actual: () => { const off = applyAssumptions(mockA, new Set(['escalation'])) as ProjectInput; const r = runProject(off); const ids = off.costLines.filter((l) => l.escalate).map((l) => l.id); const spent = r.ledger.reduce((s, row) => s + ids.reduce((t, id) => t + (row.costs[id] ?? 0), 0), 0); return spent - ids.reduce((s, id) => s + (lineTotal(off, id) ?? 0), 0) }, tolerance: 1, unit: 'CAD' },
]

export const runAll = () => CASES.map(runCase)

/** Try-your-own-numbers checks: an independent closed-form answer beside the engine's, for any inputs. */
export interface Calculator {
  id: string
  title: string
  fields: Array<{ id: string; label: string; value: number }>
  formula: string
  expected: (v: Record<string, number>) => number
  actual: (v: Record<string, number>) => number | null
  unit: 'CAD' | 'rate'
}

export const CALCULATORS: Calculator[] = [
  {
    id: 'payment', title: 'Loan payment (monthly)', unit: 'CAD', formula: 'P × r ÷ (1 − (1 + r)^−n), r = annual ÷ 12, n = years × 12',
    fields: [{ id: 'principal', label: 'Loan ($)', value: 1_000_000 }, { id: 'rate', label: 'Rate (%, nominal)', value: 5 }, { id: 'years', label: 'Amortization (years)', value: 25 }],
    expected: (v) => { const r = v.rate! / 1200; const n = v.years! * 12; return r === 0 ? v.principal! / n : (v.principal! * r) / (1 - ((1 + r) ** -n)) },
    actual: (v) => annuityPayment(v.principal!, monthlyFromNominalAnnual(v.rate! / 100), v.years! * 12),
  },
  {
    id: 'dscr', title: 'Largest loan the income supports (DSCR)', unit: 'CAD', formula: 'Payment = NOI ÷ DSCR ÷ 12; loan = payment × (1 − (1 + r)^−n) ÷ r',
    fields: [{ id: 'noi', label: 'NOI ($/yr)', value: 1_000_000 }, { id: 'dscr', label: 'DSCR', value: 1.2 }, { id: 'rate', label: 'Rate (%, nominal)', value: 5 }, { id: 'years', label: 'Amortization (years)', value: 40 }],
    expected: (v) => { const pay = v.noi! / v.dscr! / 12; const r = v.rate! / 1200; const n = v.years! * 12; return r === 0 ? pay * n : (pay * (1 - ((1 + r) ** -n))) / r },
    actual: (v) => sizeLoan({ noiAnnual: v.noi!, value: 1e15, cost: 1e15, annualRate: v.rate! / 100, amortizationYears: v.years!, dscr: v.dscr!, ltv: 1, ltc: 1 }).amount,
  },
  {
    id: 'cap', title: 'Value from income (cap rate)', unit: 'CAD', formula: 'NOI ÷ cap rate (the engine values a one-building rental with that NOI)',
    fields: [{ id: 'noi', label: 'NOI ($/yr)', value: 2_400_000 }, { id: 'cap', label: 'Cap rate (%)', value: 4.5 }],
    expected: (v) => v.noi! / (v.cap! / 100),
    actual: (v) => { const p = tiny(); const c = p.components[0]!; if (c.kind !== 'rental') return null; return runProject({ ...p, components: [{ ...c, unitMix: [{ ...c.unitMix[0]!, monthlyRent: v.noi! / 24 }], exitCapRate: v.cap! / 100 }] }).metrics.exitValue!.value },
  },
  {
    id: 'ltt', title: 'Ontario land transfer tax (not 1–2 single-family homes)', unit: 'CAD', formula: '0.5% to $55k + 1% to $250k + 1.5% to $400k + 2% above',
    fields: [{ id: 'price', label: 'Price ($)', value: 10_000_000 }],
    expected: (v) => { const p = v.price!; return (0.005 * Math.min(p, 55_000)) + (0.01 * Math.max(0, Math.min(p, 250_000) - 55_000)) + (0.015 * Math.max(0, Math.min(p, 400_000) - 250_000)) + (0.02 * Math.max(0, p - 400_000)) },
    actual: (v) => ontarioLtt(v.price!),
  },
]

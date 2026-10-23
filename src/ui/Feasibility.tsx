import { useCallback, useMemo, useState } from 'react'
import type { FundingMonth } from '../engine/funding'
import { isPortfolio } from '../engine/portfolio'
import { DOWNSIDE, landTotal, solve, type Lever } from '../engine/stress'
import { hstTiming, type RebateRule } from '../engine/tax'
import { toCsv } from './chartData'
import { Card, Chip, TableWrap, td, tdNum, th } from './components'
import { money, pct } from './format'
import { useAnalysis } from './sections3'
import { ChartFigure } from './Visuals'
import { axis, EChart, type EChartsOption, type Tokens } from './EChart'
import { useWorkspace } from './workspace'
import { projectsUnder } from './coverage'

export const SPREAD_KEY = 'finance.requiredSpread'

/**
 * Rental return test: a rental is worth building when what it yields on its cost beats what buyers pay for it (the
 * exit cap rate) by the spread the investors require for the risk and the wait. The spread is the user's, never a
 * default: published studies disagree on it (docs/implementation/BENCHMARK.md).
 */
function RentalReturn() {
  const { node, nodeResult, state, dispatch } = useWorkspace()
  const attributes = state.projects[state.projectId]!.attributes
  const required = typeof attributes[SPREAD_KEY] === 'number' ? (attributes[SPREAD_KEY] as number) : null
  const caps = [...new Set(projectsUnder(node).flatMap(({ project }) => project.components.flatMap((c) => (c.kind === 'rental' ? [c.exitCapRate] : []))))]
  const yoc = nodeResult?.metrics.yieldOnCost?.value ?? null
  const cap = caps.length === 1 ? caps[0]! : null
  const land = useMemo(() => (cap !== null && required !== null && !isPortfolio(node) ? solve(node, 'land', 'yieldOnCost', cap + required) : null), [node, cap, required])
  if (!caps.length) return null
  const achieved = yoc !== null && cap !== null ? yoc - cap : null
  const landNow = landTotal(node)
  return (
    <Card title="Rental return test">
      <p className="mb-3 text-sm text-ink-soft">A rental pays when its yield on cost (stabilized NOI ÷ total development cost) beats the exit cap rate (what a buyer would pay for that NOI) by the spread your investors require for the risk and the years of waiting. The spread is yours to set: there is no safe default, and published studies disagree.</p>
      <div className="flex flex-wrap items-end gap-4">
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div><dt className="text-xs text-ink-soft"><GlossaryText text="Yield on cost" /></dt><dd className="num text-lg">{yoc === null ? '—' : pct(yoc, 2)}</dd></div>
          <div><dt className="text-xs text-ink-soft"><GlossaryText text="Exit cap rate" /></dt><dd className="num text-lg">{cap === null ? 'varies by block' : pct(cap, 2)}</dd></div>
          <div><dt className="text-xs text-ink-soft">Spread achieved</dt><dd className="num text-lg">{achieved === null ? '—' : `${achieved >= 0 ? '+' : ''}${(achieved * 100).toFixed(2)} pts`}</dd></div>
        </dl>
        <label className="flex items-center gap-2 text-sm">Required spread
          <input aria-label="Required spread (percentage points)" inputMode="decimal" placeholder="not set" className="num min-h-9 w-20 rounded border border-line-strong bg-surface px-2 text-right" defaultValue={required === null ? '' : String(Number((required * 100).toFixed(4)))} key={String(required)}
            onBlur={(e) => { const t = e.target.value.trim(); const n = t === '' ? null : Number(t) / 100; if (n !== null && !Number.isFinite(n)) return; if (n !== required) dispatch({ type: 'attribute', id: SPREAD_KEY, value: n }) }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
          <span className="text-ink-mute">points</span>
        </label>
      </div>
      {required === null ? (
        <p className="mt-3 text-sm text-ink-soft">Set the spread your investors require to test the rental and see the land price it supports.</p>
      ) : achieved !== null && (
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <p><Chip tone={achieved >= required ? 'good' : 'bad'}>{achieved >= required ? `Meets the required ${(required * 100).toFixed(2)}-point spread` : `Short of the required spread by ${((required - achieved) * 100).toFixed(2)} points`}</Chip></p>
          {land && <p>Most you could pay for the land and still earn a {pct(cap! + required, 2)} yield on cost: <strong className="num">{land.multiplier === null ? (land.reason.startsWith('no land') ? `not reachable through the land price: even free land leaves the yield on cost below ${pct(cap! + required, 2)}, so rents or costs have to change` : land.reason) : landNow === null ? 'land price not estimated' : money(landNow * land.multiplier)}</strong>{landNow !== null && <span className="text-ink-soft"> (land as entered: {money(landNow)})</span>}</p>}
        </div>
      )}
    </Card>
  )
}
import { GlossaryText } from './Glossary'

// Feasibility: can the project be funded, what land price and revenue it supports, how it holds up when several
// things go wrong at once, and what HST does to cash. Every figure re-runs the same engine on a changed input.

function FundingChart({ months }: { months: FundingMonth[] }) {
  const option = useCallback((t: Tokens): EChartsOption => {
    const line = (name: string, data: Array<number | null>, color: string, dashed = false) => ({ name, type: 'line', data, showSymbol: false, symbolSize: 8, lineStyle: { width: 2, color, type: dashed ? 'dashed' : 'solid' }, itemStyle: { color }, emphasis: { focus: 'series' } })
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v: unknown) => (typeof v === 'number' ? money(v) : '—') },
      xAxis: { type: 'category', data: months.map((m) => `M${m.month}`), ...axis(t), axisLabel: { color: t.mute, interval: 11, formatter: (_: string, i: number) => `Y${Math.floor(i / 12) + 1}` }, splitLine: { show: false } },
      yAxis: { type: 'value', ...axis(t), axisLabel: { color: t.mute, formatter: (v: number) => money(v) } },
      series: [
        line('Construction loan', months.map((m) => m.debt), t.out),
        line('Lender commitment (LTC × budget)', months.map((m) => (m.limit ? m.limit : null)), t.mute, true),
        line('Equity out of pocket', months.map((m) => m.equityNet), t.in),
      ],
    }
  }, [months])
  return <EChart option={option} height={300} label="Construction loan against the lender's commitment, and equity out of pocket, by month." />
}

const METRICS = [
  { id: 'profitOnCost', label: 'Profit on cost', target: 0.15 },
  { id: 'yieldOnCost', label: 'Yield on cost', target: 0.05 },
  { id: 'unleveredIrr', label: 'Unlevered IRR', target: 0.1 },
  { id: 'leveredIrr', label: 'Levered IRR', target: 0.15 },
]

export function Feasibility() {
  const { node, nodeResult } = useWorkspace()
  const [metric, setMetric] = useState(METRICS[0]!)
  const [targetText, setTargetText] = useState('15')
  const [rebate, setRebate] = useState<RebateRule>('enhanced')
  const target = Number(targetText) / 100
  const project = isPortfolio(node) ? null : node

  const analysis = useAnalysis()
  const fund = analysis?.feasibility.funding ?? null
  const solved = useMemo(() => {
    if (!Number.isFinite(target)) return null
    const one = (lever: Lever, t: number) => solve(node, lever, metric.id, t)
    return { land: one('land', target), revenue: one('revenue', target), cost: one('cost', target), revenueZero: one('revenue', 0), costZero: one('cost', 0) }
  }, [node, metric, target])
  const rows = analysis?.feasibility.downside ?? []
  const hst = useMemo(() => (project ? hstTiming(project, { rebate, itcLagMonths: 2 }) : null), [project, rebate])
  if (!nodeResult) return null

  const land = landTotal(node)
  const solvedText = (s: ReturnType<typeof solve>, base: number | null, as: 'money' | 'change') => {
    if (s.multiplier === null) return <span className="text-ink-soft">{s.reason}</span>
    if (as === 'money') return base === null ? 'land price not estimated' : money(base * s.multiplier)
    return `${s.multiplier >= 1 ? '+' : ''}${pct(s.multiplier - 1, 1)}`
  }
  const totalGap = fund ? fund.constructionGap + (fund.refinance?.gap ?? 0) + fund.exitGap : 0

  return (
    <div className="flex flex-col gap-4">
      {fund ? (
        <ChartFigure
          title="Can it be funded?"
          about="The construction loan month by month against what a lender would commit (loan-to-cost × the full budget including capitalized interest), and how much equity is out of pocket. Anything above the commitment, any construction balance the refinance does not repay, and any loan the sale does not repay must come from more equity, mezzanine debt or a bigger facility."
          csv={toCsv(['Month', 'Construction loan', 'Commitment', 'Permanent loan', 'Equity out of pocket (net)', 'Equity contributed (gross)'], fund.months.map((m) => [m.month, Math.round(m.debt), Math.round(m.limit), Math.round(m.permanent), Math.round(m.equityNet), Math.round(m.equityGross)]))}
          id="funding-gap"
          file={`${node.id}-funding-gap`}
          table={(
            <TableWrap caption="Funding by month">
              <thead><tr>{['Month', 'Loan', 'Commitment', 'Permanent loan', 'Equity out'].map((h, i) => <th key={h} scope="col" className={i ? `${th} text-right` : th}><GlossaryText text={h} /></th>)}</tr></thead>
              <tbody>{fund.months.map((m) => <tr key={m.month}><td className={td}>{m.month}</td><td className={tdNum}>{money(m.debt, false)}</td><td className={tdNum}>{m.limit ? money(m.limit, false) : '—'}</td><td className={tdNum}>{money(m.permanent, false)}</td><td className={tdNum}>{money(m.equityNet, false)}</td></tr>)}</tbody>
            </TableWrap>
          )}
        >
          <ul className="mb-3 flex flex-wrap gap-2">
            <li><Chip tone={totalGap > 0 ? 'bad' : 'good'}>{totalGap > 0 ? `Funding gap ${money(totalGap)}` : 'No funding gap'}</Chip></li>
            <li><Chip tone={fund.constructionGap > 0 ? 'warn' : 'neutral'}>Loan peak {money(fund.peakDebt)} (month {fund.peakDebtMonth}) vs commitment {money(fund.facilityLimit)}</Chip></li>
            {fund.refinance && <li><Chip tone={fund.refinance.gap > 0 ? 'bad' : 'neutral'}>Refinance month {fund.refinance.month}: repays {money(fund.refinance.constructionBalance)} with {money(fund.refinance.netProceeds)} net{fund.refinance.gap > 0 ? `, short ${money(fund.refinance.gap)}` : ''}</Chip></li>}
            {fund.exitGap > 0 && <li><Chip tone="bad">Sale short of loans by {money(fund.exitGap)}</Chip></li>}
            <li><Chip>Peak equity out {money(fund.peakEquity)} (month {fund.peakEquityMonth})</Chip></li>
          </ul>
          <FundingChart months={fund.months} />
        </ChartFigure>
      ) : (
        <Card title="Can it be funded?"><p className="text-sm text-ink-soft">Each building carries its own construction loan: choose a building to see its funding gap. The combined downside below covers the whole plan.</p></Card>
      )}

      <RentalReturn />

      <Card title="Residual land value and break-even">
        <div className="mb-3 flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">Target
            <select className="min-h-9 rounded border border-line-strong bg-surface px-2" value={metric.id} onChange={(e) => { const m = METRICS.find((x) => x.id === e.target.value)!; setMetric(m); setTargetText(String(m.target * 100)) }}>
              {METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">of (%)
            <input className="num min-h-9 w-24 rounded border border-line-strong bg-surface px-2 text-right" inputMode="decimal" value={targetText} onChange={(e) => setTargetText(e.target.value)} />
          </label>
        </div>
        {!solved ? <p className="text-sm text-warn">Enter a target as a number.</p> : (
          <TableWrap caption="Solved values">
            <thead><tr>{['Question', 'Answer', 'As modelled'].map((h, i) => <th key={h} scope="col" className={i ? `${th} text-right` : th}><GlossaryText text={h} /></th>)}</tr></thead>
            <tbody>
              <tr><td className={td}>Most you could pay for the land and still reach {metric.label.toLowerCase()} {pct(target, 1)} (residual land value)</td><td className={tdNum}>{solvedText(solved.land, land, 'money')}</td><td className={tdNum}>{land === null ? 'not estimated' : money(land)}</td></tr>
              <tr><td className={td}>Rents and prices needed for {pct(target, 1)}</td><td className={tdNum}>{solvedText(solved.revenue, null, 'change')}</td><td className={tdNum}>as entered</td></tr>
              <tr><td className={td}>Cost overrun the deal absorbs and still reaches {pct(target, 1)}</td><td className={tdNum}>{solvedText(solved.cost, null, 'change')}</td><td className={tdNum}>as entered</td></tr>
              <tr><td className={td}>Break-even rents and prices ({metric.label.toLowerCase()} 0%)</td><td className={tdNum}>{solvedText(solved.revenueZero, null, 'change')}</td><td className={tdNum}>as entered</td></tr>
              <tr><td className={td}>Break-even cost overrun ({metric.label.toLowerCase()} 0%)</td><td className={tdNum}>{solvedText(solved.costZero, null, 'change')}</td><td className={tdNum}>as entered</td></tr>
            </tbody>
          </TableWrap>
        )}
        <p className="mt-2 text-xs text-ink-mute">Each answer re-runs the full model, moving one lever until the target is met. Land changes the land price lines (transfer tax follows); costs change every estimated line except land; revenue changes rents, prices and land sales. Unknown costs make results unavailable rather than optimistic.</p>
      </Card>

      <Card title="Combined downside">
        <p className="mb-3 text-sm text-ink-soft">Each shock alone, then all at once. Deals rarely fail from one thing going wrong; they fail when costs rise, the schedule slips, rates climb and the market softens together.</p>
        <TableWrap caption="Downside scenarios">
          <thead><tr>{['Scenario', 'Profit on cost', 'Levered IRR', 'Unlevered profit', 'Funding gap'].map((h, i) => <th key={h} scope="col" className={i ? `${th} text-right` : th}><GlossaryText text={h} /></th>)}</tr></thead>
          <tbody>{rows.map((r) => {
            const v = (id: string) => r.result?.metrics[id]?.value ?? null
            return (
              <tr key={r.id} className={r.id === 'combined' ? 'font-semibold' : undefined}>
                <td className={td}>{r.label}</td>
                <td className={tdNum}>{v('profitOnCost') === null ? 'n/a' : pct(v('profitOnCost'), 1)}</td>
                <td className={tdNum}>{v('leveredIrr') === null ? 'n/a' : pct(v('leveredIrr'), 1)}</td>
                <td className={tdNum}>{v('profit') === null ? 'n/a' : money(v('profit'))}</td>
                <td className={tdNum}>{r.fundingGap === null ? 'per building' : r.fundingGap > 0 ? money(r.fundingGap) : 'none'}</td>
              </tr>
            )
          })}</tbody>
        </TableWrap>
        <p className="mt-2 text-xs text-ink-mute">Shocks: {DOWNSIDE.map((d) => d.label.toLowerCase()).join('; ')}. A delay lengthens construction and moves the refinance and exit; costs timed to fixed months stay put. n/a means unavailable (unknown costs, or no unique IRR).</p>
      </Card>

      {hst?.applies ? (
        <Card title="HST: cash timing and cost (rental)">
          <div className="mb-3 flex flex-wrap items-end gap-3 text-sm">
            <label className="flex flex-col gap-1">Rebate
              <select className="min-h-9 rounded border border-line-strong bg-surface px-2" value={rebate} onChange={(e) => setRebate(e.target.value as RebateRule)}>
                <option value="enhanced">Purpose-built rental: full 13% rebated</option>
                <option value="federal-only">Federal 5% rebated only</option>
                <option value="standard">Standard rental rebates</option>
                <option value="none">No rebate</option>
              </select>
            </label>
          </div>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              ['Fair market value (self-supply)', money(hst.fmv)],
              ['HST on that value', money(hst.taxOnFmv)],
              ['Rebate', money(hst.rebate)],
              ['Net HST cost', money(hst.netCost)],
              ['Peak HST waiting for credits', money(hst.peakOutstanding)],
              ['Interest on that wait', money(hst.carryCost)],
            ].map(([k, v]) => <div key={k}><dt className="text-xs text-ink-soft">{k}</dt><dd className="num text-lg font-semibold">{v}</dd></div>)}
          </dl>
          <p className="mt-3 text-sm text-ink-soft">The cost lines are before HST. During construction the builder pays 13% on taxable costs and recovers it as input tax credits about two months later. At first occupancy (month {hst.selfSupplyMonth}) it self-assesses HST on the building's value, less the rebate. {hst.netCost > 0 ? `${money(hst.netCost)} is a permanent cost not yet in total development cost.` : 'With the full rebate, HST costs only the interest on the timing gap.'}</p>
          <p className="mt-2 text-xs text-ink-mute">Treated as HST-exempt: {hst.exemptLines.join(', ') || 'none'}. Value is stabilized NOI ÷ exit cap (untrended). The full rebate needs at least 4 units (or 10 rooms), 90% held for long-term rental, and construction starting 14 Sep 2023 – 31 Dec 2030; Ontario's matching 8% relief and its 2026 expansion follow federal legislation. Rules as announced to April 2026; confirm eligibility with a tax adviser. Condo HST is not modelled.</p>
        </Card>
      ) : project && <Card title="HST: cash timing and cost"><p className="text-sm text-ink-soft">The HST self-supply overlay covers rental homes. This building has none; condo HST (collected from buyers, with their rebates assigned to the builder) is not modelled yet.</p></Card>}
    </div>
  )
}

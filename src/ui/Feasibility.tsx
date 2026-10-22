import { useMemo, useState } from 'react'
import type { FundingMonth } from '../engine/funding'
import { isPortfolio } from '../engine/portfolio'
import { DOWNSIDE, landTotal, solve, type Lever } from '../engine/stress'
import { hstTiming, type RebateRule } from '../engine/tax'
import { toCsv } from './chartData'
import { Card, Chip, TableWrap, td, tdNum, th } from './components'
import { money, pct } from './format'
import { useAnalysis } from './sections3'
import { ChartFigure } from './Visuals'
import { useWorkspace } from './workspace'

// Feasibility: can the project be funded, what land price and revenue it supports, how it holds up when several
// things go wrong at once, and what HST does to cash. Every figure re-runs the same engine on a changed input.

const LINES = [
  { id: 'debt', label: 'Construction loan', colour: 'var(--chart-out)' },
  { id: 'limit', label: 'Lender commitment (LTC × budget)', colour: 'var(--ink-mute)', dashed: true },
  { id: 'equityNet', label: 'Equity out of pocket', colour: 'var(--chart-in)' },
] as const

function FundingChart({ months }: { months: FundingMonth[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 760
  const H = 260
  const pad = { l: 64, r: 8, t: 10, b: 26 }
  const top = Math.max(1, ...months.flatMap((m) => [m.debt, m.limit, m.equityNet]))
  const bottom = Math.min(0, ...months.map((m) => m.equityNet))
  const x = (i: number) => pad.l + ((i / Math.max(1, months.length - 1)) * (W - pad.l - pad.r))
  const y = (v: number) => pad.t + (((top - v) / (top - bottom)) * (H - pad.t - pad.b))
  const step = Math.max(1, Math.ceil(months.length / 12 / 10)) * 12
  const h = hover === null ? null : months[hover]!
  return (
    <div className="relative">
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        {LINES.map((l) => <li key={l.id} className="flex items-center gap-1.5"><svg width="18" height="6" aria-hidden><line x1="0" x2="18" y1="3" y2="3" stroke={l.colour} strokeWidth="2" strokeDasharray={'dashed' in l ? '5 3' : undefined} /></svg>{l.label}</li>)}
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Construction loan against the lender's commitment, and equity out of pocket, by month. Table view available." onMouseLeave={() => setHover(null)}>
        {[top, top / 2, 0, bottom].filter((v, i, a) => a.indexOf(v) === i).map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={t === 0 ? 1.5 : 1} />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ink-mute)">{money(t)}</text>
          </g>
        ))}
        {LINES.map((l) => {
          const pts = months.map((m, i) => (l.id === 'limit' && m.limit === 0 ? null : `${x(i)},${y(m[l.id])}`)).filter(Boolean)
          return <polyline key={l.id} fill="none" stroke={l.colour} strokeWidth={2} strokeDasharray={'dashed' in l ? '6 4' : undefined} points={pts.join(' ')} />
        })}
        {months.map((m, i) => (m.month % step === 0 ? <text key={m.month} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--ink-mute)">Y{(m.month / 12) + 1}</text> : null))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--ink-mute)" strokeDasharray="2 3" />}
        {months.map((m, i) => <rect key={m.month} x={x(i) - ((W - pad.l - pad.r) / months.length / 2)} y={pad.t} width={(W - pad.l - pad.r) / months.length} height={H - pad.t - pad.b} fill="transparent" onMouseEnter={() => setHover(i)} />)}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-8 right-2 rounded border border-line bg-surface px-2 py-1 text-xs shadow-sm" role="status">
          <p className="font-medium">Month {h.month}</p>
          <p>Loan: <span className="num">{money(h.debt)}</span>{h.limit ? <> of <span className="num">{money(h.limit)}</span></> : null}</p>
          <p>Equity out: <span className="num">{money(h.equityNet)}</span></p>
        </div>
      )}
    </div>
  )
}

const METRICS = [
  { id: 'profitOnCost', label: 'Profit on cost', target: 0.15 },
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
          file={`${node.id}-funding-gap`}
          table={(
            <TableWrap caption="Funding by month">
              <thead><tr>{['Month', 'Loan', 'Commitment', 'Permanent loan', 'Equity out'].map((h, i) => <th key={h} scope="col" className={i ? `${th} text-right` : th}>{h}</th>)}</tr></thead>
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
            <thead><tr>{['Question', 'Answer', 'As modelled'].map((h, i) => <th key={h} scope="col" className={i ? `${th} text-right` : th}>{h}</th>)}</tr></thead>
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
          <thead><tr>{['Scenario', 'Profit on cost', 'Levered IRR', 'Unlevered profit', 'Funding gap'].map((h, i) => <th key={h} scope="col" className={i ? `${th} text-right` : th}>{h}</th>)}</tr></thead>
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

// Land value (side tool): comparable sales, the residual the project supports, and the existing use, reconciled
// into a value and a range. Inputs live in the project (`land.appraisal`), so they are saved and locked with it.

import { useMemo, useState } from 'react'
import type { Attributes } from '../engine/catalogue'
import type { Node } from '../engine/portfolio'
import { adjust, DEFAULT_APPRAISAL, directComparison, existingUseValue, reconcile, type AppraisalInput, type Comparable } from '../engine/landValue'
import { landTotal, solve } from '../engine/stress'
import { Button, Card, Chip, TableWrap, cx, td, tdNum, th } from './components'
import { projectsUnder } from './coverage'
import { money, num, pct } from './format'
import { GlossaryText } from './Glossary'
import { useWorkspace } from './workspace'

export const APPRAISAL_KEY = 'land.appraisal'
export interface Appraisal extends AppraisalInput { residualMetric: 'profitOnCost' | 'leveredIrr' | 'yieldOnCost'; residualTarget: number }

const TARGETS = { profitOnCost: 'Profit on cost', leveredIrr: 'Levered IRR', yieldOnCost: 'Yield on cost' } as const

export function appraisalOf(attributes: Attributes, today: string): Appraisal {
  const base: Appraisal = { ...DEFAULT_APPRAISAL, effectiveDate: today, residualMetric: 'profitOnCost', residualTarget: 0.15 }
  try {
    const v = JSON.parse(String(attributes[APPRAISAL_KEY] ?? '{}')) as Partial<Appraisal>
    return { ...base, ...v, existingUse: { ...base.existingUse, ...v.existingUse }, comps: Array.isArray(v.comps) ? v.comps : [] }
  } catch {
    return base
  }
}

const field = 'min-h-9 rounded border border-line-strong bg-surface px-2'
const numberOrNull = (t: string) => { const s = t.replace(/[,$\s%]/g, ''); if (s === '') return null; const n = Number(s); return Number.isFinite(n) ? n : undefined }

/** A number box that commits on blur or Enter; blank means unknown. `scale` shows fractions as percent. */
function Num({ label, value, onCommit, scale = 1, suffix, width = 'w-32' }: { label: string; value: number | null; onCommit: (v: number | null) => void; scale?: number; suffix?: string; width?: string }) {
  const shown = value === null ? '' : String(Number((value * scale).toPrecision(10)))
  return (
    <label className="flex flex-col gap-1 text-sm"><GlossaryText text={label} />
      <span className="flex items-center gap-1">
        <input aria-label={label} inputMode="decimal" placeholder="unknown" className={cx(field, 'num text-right', width)} defaultValue={shown} key={shown}
          onBlur={(e) => { const n = numberOrNull(e.target.value); if (n === undefined) { e.target.value = shown; return } const v = n === null ? null : n / scale; if (v !== value) onCommit(v) }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
        {suffix && <span className="text-ink-mute">{suffix}</span>}
      </span>
    </label>
  )
}

/** The dots on the range bar, each with its key label and colour (unknowns left out). */
const DOTS = (comps: number | null, residual: number | null, model: number | null, value: number | null) =>
  ([[comps, 'Comparables (median)', 'bg-accent'], [residual, 'Residual', 'bg-ink'], [model, 'Land in the model', 'bg-warn'], [value, 'Reconciled value', 'bg-good']] as Array<[number | null, string, string]>)
    .filter((d): d is [number, string, string] => d[0] !== null)

/** Every land-value figure for a node and its appraisal inputs: shared by the Land value tab and the report. */
export function landSummary(node: Node, a: Appraisal) {
  // The subject, from the model: buildable area (by-law GFA, else above-grade GCA) and site area
  const programs = projectsUnder(node).map(({ project }) => project.program).filter((g) => g !== undefined)
  const gfa = programs.length && programs.every((g) => g!.planningGfaSqft !== null) ? programs.reduce((t, g) => t + g!.planningGfaSqft!, 0) : null
  const gca = programs.length ? programs.reduce((t, g) => t + g!.gcaAboveSqft, 0) : null
  const lot = programs.length && programs.every((g) => g!.lotAreaSqft) ? programs.reduce((t, g) => t + g!.lotAreaSqft!, 0) : null
  const subject = { buildableSqft: gfa ?? gca, acres: lot === null ? null : lot / 43_560 }
  const landNow = landTotal(node)
  let residual: { value: number | null; reason: string } = { value: null, reason: 'the land price is not estimated in the model' }
  if (landNow !== null) {
    const s = solve(node, 'land', a.residualMetric, a.residualTarget)
    residual = s.multiplier === null ? { value: null, reason: s.reason } : { value: landNow * s.multiplier, reason: '' }
  }
  const comps = directComparison(a, subject)
  const existing = existingUseValue(a)
  return { subject, landNow, residual, comps, existing, r: reconcile(comps, residual.value, existing, a) }
}

export function LandValue() {
  const { node, state, dispatch } = useWorkspace()
  const [today] = useState(() => new Date().toISOString().slice(0, 10)) // the effective-date default, fixed for the visit
  const attributes = state.projects[state.projectId]!.attributes
  const a = appraisalOf(attributes, today)
  const save = (next: Partial<Appraisal>) => dispatch({ type: 'attribute', id: APPRAISAL_KEY, value: JSON.stringify({ ...a, ...next }) })
  const raw = attributes[APPRAISAL_KEY]
  const { subject, landNow, residual, comps, existing, r } = useMemo(() => landSummary(node, appraisalOf({ [APPRAISAL_KEY]: raw ?? null }, today)), [node, raw, today])

  // One scale for the range bar: every indication and the model's land price
  const marks = [comps?.low, comps?.high, residual.value, existing, landNow, r.value].filter((v): v is number => typeof v === 'number')
  // Zoomed to the evidence (not from zero), with a little room either side
  const span = Math.max(...marks, 1) - Math.min(...marks, 0)
  const lo = Math.min(...marks) - (span * 0.12), hi = Math.max(...marks) + (span * 0.12)
  const at = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`

  return (
    <div className="flex flex-col gap-4">
      <Card title="Land value">
        <p className="mb-3 text-sm text-ink-soft">Three ways an appraiser values development land: what similar sites sold for (comparables), what this project can afford after every cost and your required return (residual), and what the site is worth as it is today (existing use, the floor below which an owner won't sell). Comparables and the residual are weighed into a value; existing use tests whether redevelopment makes sense. A screening estimate, not an appraisal.</p>
        <div className="grid gap-4 sm:grid-cols-4">
          <div><p className="text-xs text-ink-soft">Reconciled value</p><p className="num text-2xl">{r.value === null ? '—' : money(r.value)}</p>{r.value !== null && subject.buildableSqft ? <p className="text-xs text-ink-mute num">{money(r.value / subject.buildableSqft, false)} per buildable ft²</p> : null}</div>
          <div><p className="text-xs text-ink-soft">Range</p><p className="num text-lg">{r.low === null ? '—' : `${money(r.low)} – ${money(r.high!)}`}</p></div>
          <div><p className="text-xs text-ink-soft">Land in the model</p><p className="num text-lg">{landNow === null ? 'not estimated' : money(landNow)}</p>{landNow !== null && r.low !== null && <p className={cx('text-xs', landNow > r.high! ? 'text-bad' : landNow < r.low ? 'text-good' : 'text-ink-mute')}>{landNow > r.high! ? 'above the range: paying more than the evidence supports' : landNow < r.low ? 'below the range' : 'within the range'}</p>}</div>
          <div><p className="text-xs text-ink-soft">Redevelopment</p><p className="mt-1">{r.redevelopmentMakesSense === null ? <Chip>enter the existing use</Chip> : <Chip tone={r.redevelopmentMakesSense ? 'good' : 'bad'}>{r.redevelopmentMakesSense ? `Beats existing use by ${pct(a.redevelopmentMargin, 0)}+` : 'Does not beat existing use'}</Chip>}</p></div>
        </div>
        {marks.length > 0 && (
          <div className="mt-5" role="img" aria-label={`Range bar: ${r.basis.join('; ')}`}>
            <div className="relative h-12">
              <div className="absolute top-6 h-1.5 w-full rounded bg-sunken" />
              {comps && <div className="absolute top-5 h-3.5 rounded bg-accent/30" style={{ left: at(comps.low), width: `calc(${at(comps.high)} - ${at(comps.low)})` }} title={`Comparables ${money(comps.low)} – ${money(comps.high)}`} />}
              {existing !== null && <div className="absolute top-2 h-10 border-l-2 border-dashed border-bad" style={{ left: at(existing * (1 + a.redevelopmentMargin)) }} title="Existing use plus margin: the floor" />}
              {DOTS(comps?.mid ?? null, residual.value, landNow, r.value).map(([v, , colour]) => (
                <span key={colour} className={cx('absolute top-[18px] block size-3.5 -translate-x-1/2 rounded-full ring-2 ring-surface', colour)} style={{ left: at(v) }} />
              ))}
            </div>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
              {DOTS(comps?.mid ?? null, residual.value, landNow, r.value).map(([v, label, colour]) => <li key={label} className="flex items-center gap-1.5"><span className={cx('inline-block size-2.5 rounded-full', colour)} />{label} <span className="num">{money(v)}</span></li>)}
              {comps && <li className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-4 rounded bg-accent/30" />Comparables range <span className="num">{money(comps.low)} – {money(comps.high)}</span></li>}
              {existing !== null && <li className="flex items-center gap-1.5"><span className="inline-block h-3 border-l-2 border-dashed border-bad" />Existing use + {pct(a.redevelopmentMargin, 0)} <span className="num">{money(existing * (1 + a.redevelopmentMargin))}</span></li>}
            </ul>
          </div>
        )}
        <ul className="mt-3 list-disc pl-5 text-xs text-ink-soft">{r.basis.map((b) => <li key={b}>{b}</li>)}</ul>
      </Card>

      <Comparables a={a} save={save} subject={subject} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Residual land value">
          <p className="mb-3 text-sm text-ink-soft">The most the project can pay for the land and still earn your target, solved by the model (every cost, financing and timing included).</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">Target
              <select className={field} value={a.residualMetric} onChange={(e) => save({ residualMetric: e.target.value as Appraisal['residualMetric'] })}>
                {Object.entries(TARGETS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
            <Num label="of" value={a.residualTarget} scale={100} suffix="%" width="w-20" onCommit={(v) => v !== null && save({ residualTarget: v })} />
          </div>
          <p className="mt-3 num text-lg">{residual.value === null ? <span className="text-sm text-ink-soft">Not available: {residual.reason}</span> : money(residual.value)}</p>
        </Card>
        <Card title="Existing-use value">
          <p className="mb-3 text-sm text-ink-soft">What the site earns as it stands (rent from the current building or parking, less operating costs), capitalized. An owner rarely sells for less, so redevelopment needs to beat it.</p>
          <div className="flex flex-wrap items-end gap-3">
            <Num label="Net operating income" value={a.existingUse.noi} suffix="$/yr" onCommit={(v) => save({ existingUse: { ...a.existingUse, noi: v } })} />
            <Num label="Cap rate" value={a.existingUse.capRate} scale={100} suffix="%" width="w-20" onCommit={(v) => save({ existingUse: { ...a.existingUse, capRate: v } })} />
            <Num label="Margin to redevelop" value={a.redevelopmentMargin} scale={100} suffix="%" width="w-20" onCommit={(v) => v !== null && save({ redevelopmentMargin: v })} />
          </div>
          <p className="mt-3 num text-lg">{existing === null ? <span className="text-sm text-ink-soft">Enter the income and cap rate.</span> : money(existing)}</p>
        </Card>
      </div>

      <Card title="Reconciliation">
        <p className="mb-3 text-sm text-ink-soft">How much to trust the sales against the model. Lean on comparables when there are several recent, similar sales needing small adjustments; lean on the residual when sales are scarce or unlike this site.</p>
        <label className="flex flex-wrap items-center gap-3 text-sm">Comparables {pct(a.comparablesWeight, 0)}
          <input aria-label="Weight on comparables" type="range" min={0} max={100} step={5} value={Math.round(a.comparablesWeight * 100)} onChange={(e) => save({ comparablesWeight: Number(e.target.value) / 100 })} className="w-64" />
          Residual {pct(1 - a.comparablesWeight, 0)}
        </label>
      </Card>
    </div>
  )
}

function Comparables({ a, save, subject }: { a: Appraisal; save: (n: Partial<Appraisal>) => void; subject: { buildableSqft: number | null; acres: number | null } }) {
  const blank = { label: '', saleDate: '', price: '', acres: '', buildable: '', location: '', site: '', other: '', source: '', url: '' }
  const [d, setD] = useState(blank)
  const [problem, setProblem] = useState<string | null>(null)
  const add = () => {
    const n = (s: string) => numberOrNull(s)
    const price = n(d.price), acres = n(d.acres), buildable = n(d.buildable)
    const adj = [n(d.location), n(d.site), n(d.other)]
    if (!d.label.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(d.saleDate) || !price || !d.source.trim() || price === undefined || acres === undefined || buildable === undefined || adj.some((x) => x === undefined) || (acres === null && buildable === null)) {
      setProblem('Enter the address, sale date, price, site area or buildable area, and where the sale comes from')
      return
    }
    const c: Comparable = { id: `c-${a.comps.length + 1}-${d.saleDate}`, label: d.label.trim(), saleDate: d.saleDate, price, acres, buildableSqft: buildable, adjustments: { location: (adj[0] ?? 0) / 100, siteAndZoning: (adj[1] ?? 0) / 100, other: (adj[2] ?? 0) / 100 }, source: d.source.trim(), ...(d.url.trim() ? { url: d.url.trim() } : {}) }
    const check = adjust(c, a)
    if (check.problems.length) { setProblem(check.problems.join(' · ')); return }
    setProblem(null)
    save({ comps: [...a.comps, c] })
    setD(blank)
  }
  const rows = a.comps.map((c) => adjust(c, a))
  return (
    <Card title={`Comparable land sales (${a.comps.length})`}>
      <p className="mb-3 text-sm text-ink-soft">Recent sales of development sites, each adjusted to this one: time (the market's change since the sale), location, site and zoning (an approved site is worth more than one needing a rezoning), and anything else. Positive when this site is better, negative when worse. Land sales come from RealTrack, Altus Data Studio, MPAC or broker reports: cite where each came from.</p>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">Value as of<input type="date" className={field} value={a.effectiveDate} onChange={(e) => e.target.value && save({ effectiveDate: e.target.value })} /></label>
        <Num label="Market change per year" value={a.marketChangePerYear} scale={100} suffix="%" width="w-20" onCommit={(v) => save({ marketChangePerYear: v ?? 0 })} />
        <p className="text-xs text-ink-mute">Subject: {subject.buildableSqft === null ? 'buildable area unknown' : `${num(subject.buildableSqft)} buildable ft²`} · {subject.acres === null ? 'site area unknown' : `${subject.acres.toFixed(2)} acres`} (from the building program).</p>
      </div>
      {rows.length > 0 && (
        <TableWrap caption="Comparable land sales, adjusted">
          <thead><tr>{['Sale', 'Date', 'Price', 'Time', 'Net adj.', '$ / buildable ft²', '$ / acre', ''].map((h, i) => <th key={h || i} scope="col" className={cx(th, i >= 2 && i <= 6 && 'text-right')}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.comp.id}>
              <td className={td}>{r.comp.url ? <a className="text-accent underline" href={r.comp.url} target="_blank" rel="noreferrer">{r.comp.label}</a> : r.comp.label}<div className="text-xs text-ink-mute">{r.comp.source}{r.weak && <> · <Chip tone="warn">weak comparable</Chip></>}</div></td>
              <td className={`${td} num`}>{r.comp.saleDate}</td>
              <td className={tdNum}>{money(r.comp.price)}</td>
              <td className={tdNum}>{r.time === null ? '—' : pct(r.time, 1)}</td>
              <td className={tdNum}>{r.net === null ? '—' : pct(r.net, 1)}</td>
              <td className={tdNum}>{r.perBuildableSqft === null ? '—' : money(r.perBuildableSqft, false)}</td>
              <td className={tdNum}>{r.perAcre === null ? '—' : money(r.perAcre)}</td>
              <td className={td}><button type="button" className="text-xs text-ink-soft underline" onClick={() => save({ comps: a.comps.filter((c) => c.id !== r.comp.id) })}>Remove</button></td>
            </tr>
          ))}</tbody>
        </TableWrap>
      )}
      <fieldset className="mt-3 grid gap-2 text-sm sm:grid-cols-3 lg:grid-cols-5">
        <legend className="mb-1 font-medium">Add a sale</legend>
        {([['label', 'Address or name', 'text'], ['saleDate', 'Sale date', 'date'], ['price', 'Price ($)', 'text'], ['acres', 'Site area (acres)', 'text'], ['buildable', 'Buildable area (ft²)', 'text'], ['location', 'Location adj. (%)', 'text'], ['site', 'Site & zoning adj. (%)', 'text'], ['other', 'Other adj. (%)', 'text'], ['source', 'Source', 'text'], ['url', 'Link (optional)', 'text']] as const).map(([k, label, type]) => (
          <label key={k} className="flex flex-col gap-1">{label}<input type={type} className={field} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} inputMode={['price', 'acres', 'buildable', 'location', 'site', 'other'].includes(k) ? 'decimal' : undefined} /></label>
        ))}
      </fieldset>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={add}>Add sale</Button>
        {problem && <p role="alert" className="text-sm text-bad">{problem}</p>}
      </div>
      <p className="mt-2 text-xs text-ink-mute">A sale needing more than 15% net or 25% gross adjustment is marked weak: it says more about the adjustments than about this site.</p>
    </Card>
  )
}

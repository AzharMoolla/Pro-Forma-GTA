import { useEffect, useMemo, useRef, useState } from 'react'
import { isPortfolio, runNode, type Node, type NodeResult } from '../engine/portfolio'
import { ENGINE_VERSION, type Component, type ProjectInput } from '../engine/project'
import type { Simulation, TornadoBar } from '../engine/uncertainty'
import { createSnapshot, diffInputs, lock, verify, type Snapshot } from '../scenario/snapshot'
import { saveScenario } from '../cloud/cloud'
import { Tornado } from './charts'
import { MetricLabel } from './Glossary'
import { Button, Card, Chip, NumberField, SourceChip, TableWrap, cx, td, tdNum, th } from './components'
import { coverage, type CoverageStatus } from './coverage'
import { dataContext, findings, findingsCovered, stageLabel } from './data'
import { metricValue, money, monthLabel, pct } from './format'
import type { SimRequest } from './simulate.worker'
import { atLeast } from './store'
import { useWorkspace } from './workspace'

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  URL.revokeObjectURL(url)
}

const csv = (rows: Array<Array<string | number>>) => rows.map((r) => r.map((c) => (typeof c === 'string' && /[",\n]/.test(c) ? `"${c.replaceAll('"', '""')}"` : c)).join(',')).join('\n')

function SelectBlock() {
  return <p className="rounded border border-line bg-surface p-4 text-sm text-ink-soft">This level is a portfolio. Choose a block under <strong>Plan structure</strong> to see and edit its revenue, operations and financing.</p>
}

// ---------------------------------------------------------------- revenue

export function Revenue() {
  const { node, state, dispatch } = useWorkspace()
  if (isPortfolio(node)) return <SelectBlock />
  const edit = (id: string, update: (c: Component) => Component) =>
    dispatch({ type: 'edit', path: state.path, update: (n) => ({ ...(n as ProjectInput), components: (n as ProjectInput).components.map((c) => (c.id === id ? update(c) : c)) }) })
  const field = (c: Component, key: string, label: string, opts: { scale?: number; suffix?: string } = {}) => (
    <NumberField key={key} label={label} value={(c as unknown as Record<string, number>)[key]!} scale={opts.scale} suffix={opts.suffix} onCommit={(v) => edit(c.id, (x) => ({ ...x, [key]: v }) as Component)} />
  )
  return (
    <div className="flex flex-col gap-4">
      {node.components.map((c) => (
        <Card key={c.id} title={`${c.id} · ${c.kind === 'commercial' ? c.use : c.kind}`}>
          {c.kind === 'rental' && (
            <div className="flex flex-col gap-4">
              <TableWrap caption={`${c.id} unit mix`}>
                <thead><tr>{['Unit type', 'Units', 'Rent / month', 'Vacancy %'].map((h, i) => <th key={h} scope="col" className={cx(th, i > 0 && 'text-right')}>{h}</th>)}</tr></thead>
                <tbody>{c.unitMix.map((u) => {
                  const setU = (patch: Partial<typeof u>) => edit(c.id, (x) => (x.kind === 'rental' ? { ...x, unitMix: x.unitMix.map((y) => (y.id === u.id ? { ...y, ...patch } : y)) } : x))
                  return (
                    <tr key={u.id}>
                      <td className={td}>{u.id.replaceAll('_', ' ')}</td>
                      <td className={`${td} w-28`}><NumberField compact label={`${u.id} units`} value={u.count} onCommit={(v) => setU({ count: Math.max(0, Math.round(v)) })} /></td>
                      <td className={`${td} w-36`}><NumberField compact label={`${u.id} rent`} value={u.monthlyRent} onCommit={(v) => setU({ monthlyRent: v })} /></td>
                      <td className={`${td} w-28`}><NumberField compact label={`${u.id} vacancy`} value={u.vacancy} scale={100} onCommit={(v) => setU({ vacancy: v })} /></td>
                    </tr>
                  )
                })}</tbody>
              </TableWrap>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {field(c, 'otherIncomeMonthly', 'Other income / month', { suffix: '$' })}
                {field(c, 'opexPerUnitMonthly', 'Opex / unit / month', { suffix: '$' })}
                {field(c, 'leaseUpMonths', 'Lease-up', { suffix: 'months' })}
                {field(c, 'rentGrowth', 'Rent growth', { scale: 100, suffix: '%/yr' })}
                {field(c, 'opexInflation', 'Opex inflation', { scale: 100, suffix: '%/yr' })}
                {field(c, 'exitCapRate', 'Exit cap rate', { scale: 100, suffix: '%' })}
              </div>
            </div>
          )}
          {c.kind === 'condo' && (
            <div className="flex flex-col gap-4">
              <TableWrap caption={`${c.id} units`}>
                <thead><tr>{['Unit type', 'Units', 'Net ft²', '$ / ft²'].map((h, i) => <th key={h} scope="col" className={cx(th, i > 0 && 'text-right')}>{h}</th>)}</tr></thead>
                <tbody>{c.units.map((u) => {
                  const setU = (patch: Partial<typeof u>) => edit(c.id, (x) => (x.kind === 'condo' ? { ...x, units: x.units.map((y) => (y.id === u.id ? { ...y, ...patch } : y)) } : x))
                  return (
                    <tr key={u.id}>
                      <td className={td}>{u.id}</td>
                      <td className={`${td} w-28`}><NumberField compact label={`${u.id} units`} value={u.count} onCommit={(v) => setU({ count: Math.max(0, Math.round(v)) })} /></td>
                      <td className={`${td} w-28`}><NumberField compact label={`${u.id} net ft²`} value={u.netSqftPerUnit} onCommit={(v) => setU({ netSqftPerUnit: v })} /></td>
                      <td className={`${td} w-28`}><NumberField compact label={`${u.id} price per ft²`} value={u.pricePerSqft} onCommit={(v) => setU({ pricePerSqft: v })} /></td>
                    </tr>
                  )
                })}</tbody>
              </TableWrap>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {field(c, 'salesStartMonth', 'Sales start', { suffix: 'month' })}
                {field(c, 'salesPerMonth', 'Sales pace', { suffix: 'units/mo' })}
                {field(c, 'depositFraction', 'Deposits', { scale: 100, suffix: '%' })}
                {field(c, 'occupancyMonths', 'Interim occupancy', { suffix: 'months' })}
                {field(c, 'occupancyFeePerUnitMonthly', 'Occupancy fee', { suffix: '$/unit/mo' })}
                {field(c, 'commissionFraction', 'Commissions', { scale: 100, suffix: '%' })}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={c.depositsUsable} onChange={(e) => edit(c.id, (x) => ({ ...x, depositsUsable: e.target.checked }) as Component)} />
                Deposits insured and usable for construction (otherwise held in trust until closing)
              </label>
            </div>
          )}
          {c.kind === 'commercial' && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {field(c, 'netLeasableSqft', 'Net leasable area', { suffix: 'ft²' })}
              {field(c, 'rentPerSqftYear', 'Net rent', { suffix: '$/ft²/yr' })}
              {field(c, 'vacancy', 'Vacancy', { scale: 100, suffix: '%' })}
              {field(c, 'leaseUpMonths', 'Lease-up', { suffix: 'months' })}
              {field(c, 'freeRentMonths', 'Free rent', { suffix: 'months' })}
              {field(c, 'tiPerSqft', 'Tenant improvements', { suffix: '$/ft²' })}
              {field(c, 'leasingCommissionPerSqft', 'Leasing commissions', { suffix: '$/ft²' })}
              {field(c, 'unrecoveredOpexPerSqftYear', 'Unrecovered opex', { suffix: '$/ft²/yr' })}
              {field(c, 'rentGrowth', 'Rent growth', { scale: 100, suffix: '%/yr' })}
              {field(c, 'exitCapRate', 'Exit cap rate', { scale: 100, suffix: '%' })}
            </div>
          )}
          {c.kind === 'landSale' && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {c.sales.map((s, i) => (
                <li key={i}><NumberField label={`${s.label ?? 'Sale'} in month ${s.month}`} value={s.amount} suffix="$" onCommit={(v) => edit(c.id, (x) => (x.kind === 'landSale' ? { ...x, sales: x.sales.map((y, j) => (j === i ? { ...y, amount: v } : y)) } : x))} /></li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- finance

export function Finance() {
  const { node, nodeResult, state, dispatch, demo } = useWorkspace()
  if (!nodeResult) return null
  const exportJson = () => download(`${demo.id}-draft.json`, JSON.stringify({ project: demo.id, exportedAt: new Date().toISOString(), input: node }, null, 2), 'application/json')

  if (isPortfolio(node)) {
    const exportRoll = () => download(`${node.id}-cashflows.csv`, csv([['month', 'shared_costs', 'project_cash_flow', 'equity_cash_flow'], ...nodeResult.projectCashFlow.map((v, m) => [m, nodeResult.sharedCosts[m] ?? 0, v, nodeResult.equityCashFlow[m] ?? 0])]), 'text/csv')
    return (
      <Card title={`${node.name}: rolled-up cash flows`} actions={<div className="flex gap-2"><Button onClick={exportRoll}>Export CSV</Button><Button onClick={exportJson}>Export JSON</Button></div>}>
        <p className="text-sm text-ink-soft">Shared costs at this level are equity-funded: there is no portfolio-level facility yet. Each block carries its own construction loan; choose a block to see its ledger.</p>
      </Card>
    )
  }

  const p = node
  const ledger = nodeResult.project!.ledger
  const setDebt = (patch: Partial<ProjectInput['debt']>) => dispatch({ type: 'edit', path: state.path, update: (n) => ({ ...(n as ProjectInput), debt: { ...(n as ProjectInput).debt, ...patch } }) })
  const setRefi = (patch: Partial<NonNullable<ProjectInput['debt']['refinance']>>) => setDebt({ refinance: { ...p.debt.refinance!, ...patch } })
  const setTiming = (patch: Partial<ProjectInput['timing']>) => dispatch({ type: 'edit', path: state.path, update: (n) => ({ ...(n as ProjectInput), timing: { ...(n as ProjectInput).timing, ...patch } }) })
  const exportLedger = () => download(`${p.id}-ledger.csv`, csv([
    ['month', 'phase', 'total_cost', 'revenue', 'opex', 'noi', 'sales_proceeds', 'equity_draw', 'debt_draw', 'interest', 'interest_capitalized', 'repayment', 'closing_debt', 'perm_closing', 'distribution', 'sale_value', 'project_cash_flow', 'equity_cash_flow'],
    ...ledger.map((r) => [r.month, r.phase, r.totalCost, r.revenue, r.opex, r.noi, r.salesProceeds, r.equityDraw, r.debtDraw, r.interest, r.interestCapitalized, r.repayment, r.closingDebt, r.permClosing, r.distribution, r.saleValue, r.projectCashFlow, r.equityCashFlow]),
  ]), 'text/csv')

  return (
    <div className="flex flex-col gap-4">
      <Card title="Timing and debt">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <NumberField label="Pre-construction" suffix="months" value={p.timing.preConstructionMonths} onCommit={(v) => setTiming({ preConstructionMonths: Math.round(v) })} />
          <NumberField label="Construction" suffix="months" value={p.timing.constructionMonths} onCommit={(v) => setTiming({ constructionMonths: Math.round(v) })} />
          <NumberField label="Exit" suffix="month" value={p.timing.exitMonth} onCommit={(v) => setTiming({ exitMonth: Math.round(v) })} />
          <NumberField label="Cost escalation" scale={100} suffix="%/yr" value={p.costEscalation} onCommit={(v) => dispatch({ type: 'edit', path: state.path, update: (n) => ({ ...(n as ProjectInput), costEscalation: v }) })} />
          <NumberField label="Construction rate" scale={100} suffix="%/yr" value={p.debt.annualRate} onCommit={(v) => setDebt({ annualRate: v })} />
          <NumberField label="Loan-to-cost" scale={100} suffix="%" value={p.debt.ltc} onCommit={(v) => setDebt({ ltc: v })} />
          <NumberField label="Loan-to-value" scale={100} suffix="%" value={p.debt.ltv} onCommit={(v) => setDebt({ ltv: v })} />
          <NumberField label="DSCR" suffix="×" value={p.debt.dscr} onCommit={(v) => setDebt({ dscr: v })} />
        </div>
        <p className="mt-3 text-xs text-ink-mute">Rate = dated benchmark + spread. The demo uses the Bank of Canada posted prime fixture of 4.45% (2026-10-14) plus a hypothetical spread; the live adapter arrives in Milestone D. Not a loan offer.</p>
        {p.debt.refinance && (
          <>
            <h3 className="mt-4 mb-2 text-sm font-semibold">Refinance at stabilization</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <NumberField label="Month" value={p.debt.refinance.month} onCommit={(v) => setRefi({ month: Math.round(v) })} />
              <NumberField label="Rate" scale={100} suffix="%/yr" value={p.debt.refinance.annualRate} onCommit={(v) => setRefi({ annualRate: v })} />
              <NumberField label="LTV" scale={100} suffix="%" value={p.debt.refinance.ltv} onCommit={(v) => setRefi({ ltv: v })} />
              <NumberField label="DSCR" suffix="×" value={p.debt.refinance.dscr} onCommit={(v) => setRefi({ dscr: v })} />
              <NumberField label="Fees incl. insurance" scale={100} suffix="%" value={p.debt.refinance.feeFraction} onCommit={(v) => setRefi({ feeFraction: v })} />
            </div>
          </>
        )}
      </Card>
      <Card title="Monthly ledger" actions={<div className="flex gap-2"><Button onClick={exportLedger}>Export CSV</Button><Button onClick={exportJson}>Export JSON</Button></div>}>
        <p className="mb-2 text-sm text-ink-soft">Checks: sources = uses <Chip tone={nodeResult.project!.checks.sourcesEqualUses ? 'good' : 'bad'}>{nodeResult.project!.checks.sourcesEqualUses ? 'pass' : 'fail'}</Chip> · debt ledger closes <Chip tone={nodeResult.project!.checks.ledgerCloses ? 'good' : 'bad'}>{nodeResult.project!.checks.ledgerCloses ? 'pass' : 'fail'}</Chip></p>
        <div className="max-h-[480px] overflow-auto" role="region" aria-label="Monthly ledger" tabIndex={0}>
          <table className="w-full border-collapse text-xs">
            <caption className="sr-only">Monthly ledger for {p.name}</caption>
            <thead className="sticky top-0 bg-surface">
              <tr>{['Month', 'Phase', 'Costs', 'NOI', 'Sales', 'Equity in', 'Debt draw', 'Interest', 'Loan balance', 'Perm balance', 'To equity', 'Equity CF'].map((h, i) => <th key={h} scope="col" className={cx(th, i > 1 && 'text-right')}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {ledger.map((r) => (
                <tr key={r.month}>
                  <td className={td}>{monthLabel(r.month)}</td><td className={td}>{r.phase}</td>
                  <td className={tdNum}>{money(r.totalCost)}</td><td className={tdNum}>{money(r.noi)}</td><td className={tdNum}>{money(r.salesProceeds)}</td>
                  <td className={tdNum}>{money(r.equityDraw)}</td><td className={tdNum}>{money(r.debtDraw)}</td><td className={tdNum}>{money(r.interest + r.permInterest)}</td>
                  <td className={tdNum}>{money(r.closingDebt)}</td><td className={tdNum}>{money(r.permClosing)}</td><td className={tdNum}>{money(r.distribution)}</td><td className={tdNum}>{money(r.equityCashFlow)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------- returns and range

type SimState = { status: 'idle' } | { status: 'running' } | { status: 'done'; sim: Simulation; tornado: { base: number | null; bars: TornadoBar[] } } | { status: 'error'; error: string }

export function Returns() {
  const { nodeResult, node, state, dispatch } = useWorkspace()
  const [draws, setDraws] = useState(500)
  const [seed, setSeed] = useState(2026)
  const [simState, setSimState] = useState<{ for: Node | null; sim: SimState }>({ for: null, sim: { status: 'idle' } })
  const sim: SimState = simState.for === node ? simState.sim : { status: 'idle' } // results belong to the inputs they ran on
  const setSim = (s: SimState) => setSimState({ for: node, sim: s })
  const worker = useRef<Worker | null>(null)
  useEffect(() => () => worker.current?.terminate(), [])
  if (!nodeResult) return null
  const showRange = atLeast(state.mode, 'professional')

  const run = () => {
    worker.current?.terminate()
    worker.current = new Worker(new URL('./simulate.worker.ts', import.meta.url), { type: 'module' })
    setSim({ status: 'running' })
    worker.current.onmessage = (e: MessageEvent<{ ok: boolean; sim: Simulation; tornado: { base: number | null; bars: TornadoBar[] }; error: string }>) =>
      setSim(e.data.ok ? { status: 'done', sim: e.data.sim, tornado: e.data.tornado } : { status: 'error', error: e.data.error })
    const request: SimRequest = { node, draws, seed, metrics: ['totalDevelopmentCost', 'profit', 'profitOnCost', 'unleveredIrr', 'leveredIrr'], tornadoMetric: 'profit' }
    worker.current.postMessage(request)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="All metrics">
        <TableWrap caption="Metrics">
          <thead><tr><th scope="col" className={th}>Metric</th><th scope="col" className={`${th} text-right`}>Value</th><th scope="col" className={th}>Basis</th></tr></thead>
          <tbody>{Object.values(nodeResult.metrics).map((m) => (
            <tr key={m.id} className={cx(state.inspect?.kind === 'metric' && state.inspect.id === m.id && 'bg-accent-soft')}>
              <td className={td}><MetricLabel id={m.id} label={m.label} /></td>
              <td className={tdNum}><button type="button" className="hover:underline" aria-label={`Show how ${m.label} is calculated`} onClick={() => dispatch({ type: 'inspect', inspect: { kind: 'metric', id: m.id } })}>{m.value === null && m.missing.length ? <Chip tone="warn">withheld</Chip> : metricValue(m)}</button></td>
              <td className={`${td} text-xs text-ink-soft`}>{m.basis}</td>
            </tr>
          ))}</tbody>
        </TableWrap>
      </Card>
      {showRange && (
        <Card title="Range: what could happen" actions={
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col text-xs text-ink-soft">Draws
              <select className="min-h-10 rounded border border-line-strong bg-surface px-2 text-sm text-ink" value={draws} onChange={(e) => setDraws(Number(e.target.value))}>{[200, 500, 1000].map((d) => <option key={d}>{d}</option>)}</select>
            </label>
            <div className="w-24"><NumberField label="Seed" value={seed} onCommit={(v) => setSeed(Math.round(v))} /></div>
            <Button variant="primary" onClick={run} disabled={sim.status === 'running' || !nodeResult.complete}>{sim.status === 'running' ? 'Running…' : 'Run'}</Button>
          </div>
        }>
          <p className="text-sm text-ink-soft">Every cost line varies within its estimate-class band (D −30/+50%, C −20/+30%, B −15/+20%, A −5/+10%), and rents, prices and cap rates within their bands. Triangular draws, seeded, so the same seed always reproduces the same range. Cost bands skew upward, so the likely (P50) result is usually worse than the single-point base.</p>
          {!nodeResult.complete && <p className="mt-2 text-sm text-warn">Ranges need a complete model: some values are not yet estimated.</p>}
          <div aria-live="polite">
            {sim.status === 'error' && <p role="alert" className="mt-2 text-sm text-bad">{sim.error}</p>}
            {sim.status === 'done' && (
              <div className="mt-3 flex flex-col gap-4">
                <TableWrap caption="Monte Carlo percentiles">
                  <thead><tr>{['Metric', 'P10', 'P50', 'P90', 'Base'].map((h, i) => <th key={h} scope="col" className={cx(th, i > 0 && 'text-right')}>{h}</th>)}</tr></thead>
                  <tbody>{Object.entries(sim.sim.metrics).map(([id, d]) => {
                    const m = nodeResult.metrics[id]!
                    const f = (v: number | null) => metricValue({ unit: m.unit, value: v })
                    return <tr key={id}><td className={td}>{m.label}</td><td className={tdNum}>{f(d.p10)}</td><td className={tdNum}>{f(d.p50)}</td><td className={tdNum}>{f(d.p90)}</td><td className={tdNum}>{f(d.base)}</td></tr>
                  })}</tbody>
                </TableWrap>
                {atLeast(state.mode, 'institutional') ? (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">What moves profit most</h3>
                    <Tornado base={sim.tornado.base ?? 0} rows={sim.tornado.bars.slice(0, 12)} format={(v) => money(v)} />
                  </div>
                ) : <p className="text-xs text-ink-mute">Switch to Institutional to see which drivers move profit most.</p>}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- scenarios

export function Scenarios() {
  const { state, dispatch, draft, demo, cloud } = useWorkspace()
  const project = state.projects[state.projectId]!
  const [saveError, setSaveError] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [integrity, setIntegrity] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    Promise.all(project.scenarios.map(async (s) => [s.id, await verify(s)] as const)).then((r) => live && setIntegrity(Object.fromEntries(r)))
    return () => { live = false }
  }, [project.scenarios])

  const save = async () => {
    setBusy(true)
    const snapshot = lock(await createSnapshot({ input: draft, attributes: project.attributes, context: dataContext, label: label.trim(), note: note.trim(), createdAt: new Date().toISOString(), parentId: project.draftParentId, sequence: project.scenarios.length + 1 }))
    if (cloud.projectId) {
      // the database re-checks the hash; a locked scenario must exist in the account before it shows as locked
      try {
        await saveScenario(cloud.projectId, snapshot)
      } catch (e) {
        setSaveError((e as Error).message)
        setBusy(false)
        return
      }
    }
    setSaveError(null)
    dispatch({ type: 'addSnapshot', snapshot })
    setLabel('')
    setNote('')
    setBusy(false)
  }

  const compared = project.scenarios.filter((s) => selected.includes(s.id))
  const results = useMemo(() => compared.map((s) => ({ s, r: safeRun(s.input) })), [compared])
  const draftResult = useMemo(() => safeRun(draft), [draft])
  const rows = ['totalUnits', 'totalDevelopmentCost', 'totalRevenue', 'profit', 'profitOnCost', 'yieldOnCost', 'unleveredIrr', 'leveredIrr', 'unleveredNpv', 'equityContributed']

  return (
    <div className="flex flex-col gap-4">
      <Card title="Lock the current draft as a scenario">
        <form className="grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-end" onSubmit={(e) => { e.preventDefault(); if (label.trim() && note.trim()) void save() }}>
          <label className="flex flex-col gap-1 text-sm"><span className="text-xs text-ink-soft">Name</span>
            <input required className="min-h-10 rounded border border-line-strong bg-surface px-2" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. 40% affordable" />
          </label>
          <label className="flex flex-col gap-1 text-sm"><span className="text-xs text-ink-soft">Purpose (required: what this scenario tests)</span>
            <input required className="min-h-10 rounded border border-line-strong bg-surface px-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Does deeper affordability still clear a 6% unlevered IRR?" />
          </label>
          <Button type="submit" variant="primary" disabled={busy || !label.trim() || !note.trim()}>Lock scenario</Button>
        </form>
        {saveError && <p role="alert" className="mt-2 text-sm text-bad">{saveError}</p>}
        <p className="mt-2 text-xs text-ink-mute">Locked scenarios are hashed (SHA-256 of the canonical inputs, site and policy variables, reference-data versions and engine version) and never change. Editing one branches a new draft. {cloud.projectId ? 'Saved to your account: the database re-verifies the hash and refuses edits or deletion.' : 'Saved in this browser only: sign in to keep them in your account.'}</p>
      </Card>

      <Card title={`Scenarios (${project.scenarios.length})`} actions={<Button onClick={() => dispatch({ type: 'resetDraft' })}>Reset draft to {demo.name.split(':')[0]}</Button>}>
        {project.scenarios.length === 0 ? <p className="text-sm text-ink-soft">No locked scenarios yet. Edit inputs, then lock the draft above to compare versions side by side.</p> : (
          <TableWrap caption="Locked scenarios">
            <thead><tr>{['Compare', 'Name', 'Purpose', 'Parent', 'Hash', 'Integrity', ''].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
            <tbody>{project.scenarios.map((s) => (
              <tr key={s.id}>
                <td className={td}><input type="checkbox" aria-label={`Compare ${s.label}`} className="size-5 accent-[var(--accent)]" checked={selected.includes(s.id)} onChange={(e) => setSelected((x) => (e.target.checked ? [...x, s.id].slice(-3) : x.filter((y) => y !== s.id)))} /></td>
                <td className={td}>{s.label}</td>
                <td className={`${td} text-xs text-ink-soft`}>{s.note}</td>
                <td className={`${td} num text-xs`}>{s.parentId ?? '—'}</td>
                <td className={`${td} num text-xs`} title={s.inputHash}>{s.inputHash.slice(0, 12)}</td>
                <td className={td}>{integrity[s.id] === undefined ? '…' : integrity[s.id] ? <Chip tone="good">verified</Chip> : <Chip tone="bad">changed</Chip>}</td>
                <td className={td}><Button variant="ghost" disabled={integrity[s.id] !== true} title={integrity[s.id] === false ? 'This scenario no longer matches its hash, so it cannot be branched' : undefined} onClick={() => dispatch({ type: 'branch', snapshotId: s.id })}>Branch</Button></td>
              </tr>
            ))}</tbody>
          </TableWrap>
        )}
      </Card>

      {compared.length > 0 && (
        <Card title="Compare">
          <TableWrap caption="Scenario comparison">
            <thead><tr><th scope="col" className={th}>Metric</th>{results.map(({ s }) => (
              <th key={s.id} scope="col" className={`${th} text-right`}>
                {s.label}
                {s.engineVersion !== ENGINE_VERSION && <span className="block text-xs font-normal text-warn">locked under engine {s.engineVersion}; recomputed with {ENGINE_VERSION}</span>}
                {integrity[s.id] === false && <span className="block text-xs font-normal text-bad">hash mismatch: results not trusted</span>}
              </th>
            ))}<th scope="col" className={`${th} text-right`}>Current draft</th></tr></thead>
            <tbody>{rows.map((id) => {
              const m = draftResult?.metrics[id]
              if (!m) return null
              return (
                <tr key={id}>
                  <th scope="row" className={`${td} text-left font-normal`}>{m.label}</th>
                  {results.map(({ s, r }) => <td key={s.id} className={tdNum}>{metricValue(r?.metrics[id])}</td>)}
                  <td className={tdNum}>{metricValue(m)}</td>
                </tr>
              )
            })}</tbody>
          </TableWrap>
          <h3 className="mt-4 mb-2 text-sm font-semibold">Inputs changed: {compared[0]!.label} → {compared[1]?.label ?? 'current draft'}</h3>
          <InputDiff before={compared[0]!} after={compared[1]?.input ?? draft} />
        </Card>
      )}
    </div>
  )
}

function safeRun(node: Node): NodeResult | null {
  try { return runNode(node) } catch { return null }
}

function InputDiff({ before, after }: { before: Snapshot; after: Node }) {
  const changes = diffInputs(before.input, after)
  if (!changes.length) return <p className="text-sm text-ink-soft">No input differences.</p>
  return (
    <ul className="flex flex-col gap-1 text-xs">
      {changes.slice(0, 60).map((c) => (
        <li key={c.path} className="num"><span className="text-ink-soft">{c.path}</span>: {JSON.stringify(c.before)} → <strong>{JSON.stringify(c.after)}</strong></li>
      ))}
      {changes.length > 60 && <li className="text-ink-mute">+{changes.length - 60} more</li>}
    </ul>
  )
}

// ---------------------------------------------------------------- audit

const STATUS: Record<CoverageStatus, { label: string; tone: 'good' | 'accent' | 'bad' | 'warn' }> = {
  line: { label: 'cost line', tone: 'good' },
  covered: { label: 'covered', tone: 'accent' },
  unaccounted: { label: 'not in model', tone: 'bad' },
  'to-confirm': { label: 'to confirm', tone: 'warn' },
}

export function Audit() {
  const { demo, state, draft, result } = useWorkspace()
  const attributes = state.projects[state.projectId]!.attributes
  const entries = useMemo(() => coverage(demo.projectType, attributes, draft, demo.coverage), [demo, attributes, draft])
  const [filter, setFilter] = useState<CoverageStatus | 'all'>('unaccounted')
  const counts = Object.fromEntries((['line', 'covered', 'unaccounted', 'to-confirm'] as CoverageStatus[]).map((s) => [s, entries.filter((e) => e.status === s).length])) as Record<CoverageStatus, number>
  const shown = filter === 'all' ? entries : entries.filter((e) => e.status === filter)

  return (
    <div className="flex flex-col gap-4">
      {result && result.missing.length > 0 && (
        <Card title={`Not yet estimated (${result.missing.length})`}>
          <p className="mb-2 text-sm text-ink-soft">These values are unknown, so every result that depends on them is withheld rather than calculated as zero.</p>
          <ul className="list-disc pl-5 text-sm">{result.missing.map((m) => <li key={m} className="num">{m}</li>)}</ul>
        </Card>
      )}
      <Card title="Cost checklist coverage">
        <p className="mb-3 text-sm text-ink-soft">Every catalogue item that applies to a <strong>{demo.projectType}</strong> project with these variables, and where the model carries it. Change variables under Site &amp; program to see costs switch on or off.</p>
        <fieldset className="mb-3 flex flex-wrap gap-2 text-sm">
          <legend className="sr-only">Filter by status</legend>
          {(['unaccounted', 'to-confirm', 'line', 'covered', 'all'] as const).map((f) => (
            <label key={f} className={cx('cursor-pointer rounded-md border px-3 py-1.5', filter === f ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink-soft')}>
              <input type="radio" name="cov" className="sr-only" checked={filter === f} onChange={() => setFilter(f)} />
              {f === 'all' ? `All (${entries.length})` : `${STATUS[f].label} (${counts[f]})`}
            </label>
          ))}
        </fieldset>
        {shown.length === 0 ? <p className="text-sm text-good">Nothing in this group: every applicable item is accounted for.</p> : (
          <TableWrap caption="Checklist coverage">
            <thead><tr>{['Item', 'Stage', 'Status', 'Source', 'Where it is'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
            <tbody>{shown.map((e) => (
              <tr key={e.item.id}>
                <td className={td}>{e.item.label}</td>
                <td className={`${td} text-xs text-ink-soft`}>{stageLabel.get(e.item.stage)}</td>
                <td className={td}><Chip tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Chip></td>
                <td className={td}><SourceChip tag={e.item.src} /></td>
                <td className={`${td} text-xs text-ink-soft`}>{e.note}</td>
              </tr>
            ))}</tbody>
          </TableWrap>
        )}
      </Card>
      <Card title={`Issue log: legacy workbook audit (${findings.length})`}>
        <p className="mb-2 text-sm text-ink-soft">Findings from the static audit of the five reference workbooks. The engine re-derives these formulas rather than copying them; covered items have a regression test or rule.</p>
        <TableWrap caption="Audit findings">
          <thead><tr>{['ID', 'Priority', 'Type', 'Finding', 'Engine status'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
          <tbody>{findings.map((f) => (
            <tr key={f.id}>
              <td className={`${td} num`}>{f.id}</td>
              <td className={td}><Chip tone={f.priority === 'Critical' ? 'bad' : f.priority === 'High' ? 'warn' : 'neutral'}>{f.priority}</Chip></td>
              <td className={`${td} text-xs`}>{f.classification}</td>
              <td className={`${td} text-xs`}>{f.finding}</td>
              <td className={td}>{findingsCovered[f.id] ? <span className="text-xs text-good">{findingsCovered[f.id]}</span> : <Chip>open</Chip>}</td>
            </tr>
          ))}</tbody>
        </TableWrap>
      </Card>
      <p className="text-xs text-ink-mute">Rates {pct(0.0445, 2)} BoC prime fixture (2026-10-14) · catalogue as of 2026-10-21 · verify every source before relying on it.</p>
    </div>
  )
}

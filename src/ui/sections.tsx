import { useState } from 'react'
import type { CostLine, Driver } from '../engine/costs'
import { isPortfolio } from '../engine/portfolio'
import { CashFlowChart } from './chartViews'
import { Button, Card, Chip, NumberField, SourceChip, TableWrap, cx, td, tdNum, th } from './components'
import { projectsUnder } from './coverage'
import { catalogue, catalogueItem, variableInfo } from './data'
import { metricValue, money, num, pct } from './format'
import { lineTotal } from './Inspector'
import { Audit, Finance, Returns, Revenue, Scenarios } from './sections2'
import { CostBuckets, DecisionSummary, Progress } from './sections3'
import { readSources, SiteMap } from './SiteMap'
import { Streetscape } from './Streetscape'
import { Visuals } from './Visuals'
import { Feasibility } from './Feasibility'
import { Assumptions } from './Assumptions'
import { Verification } from './Verification'
import { People } from './People'
import { Report } from './Report'
import { PrivacyPolicy, Terms } from './Legal'
import { atLeast, type SectionId } from './store'
import { getResult } from './tree'
import { useWorkspace } from './workspace'
import { GlossaryText, VarHint } from './Glossary'

export function Sections({ section }: { section: SectionId }) {
  switch (section) {
    case 'overview': return <Overview />
    case 'map': return <SiteMap />
    case 'charts': return <Visuals />
    case 'feasibility': return <Feasibility />
    case 'assumptions': return <Assumptions />
    case 'verification': return <Verification />
    case 'people': return <People />
    case 'report': return <Report />
    case 'privacy': return <PrivacyPolicy />
    case 'terms': return <Terms />
    case 'progress': return <Progress />
    case 'market': return <Market />
    case 'program': return <Program />
    case 'costs': return <Costs />
    case 'revenue': return <Revenue />
    case 'finance': return <Finance />
    case 'returns': return <Returns />
    case 'scenarios': return <Scenarios />
    case 'audit': return <Audit />
  }
}

const yearly = (values: number[]) => {
  const out: number[] = []
  values.forEach((v, m) => (out[Math.floor(m / 12)] = (out[Math.floor(m / 12)] ?? 0) + v))
  return out
}

function Overview() {
  const { demo, nodeResult, node, dispatch, state, result } = useWorkspace()
  const [basis, setBasis] = useState<'project' | 'equity'>('project')
  if (!nodeResult || !result) return null
  const flows = basis === 'project' ? nodeResult.projectCashFlow : nodeResult.equityCashFlow
  return (
    <div className="flex flex-col gap-4">
      <DecisionSummary />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Where the money goes"><CostBuckets /></Card>
      <Card
        title="Cash flow by year"
        actions={
          <fieldset className="flex gap-1 text-sm">
            <legend className="sr-only">Cash-flow basis</legend>
            {(['project', 'equity'] as const).map((b) => (
              <label key={b} className={cx('cursor-pointer rounded px-2 py-1', basis === b ? 'bg-accent-soft text-accent' : 'text-ink-soft hover:bg-sunken')}>
                <input type="radio" className="sr-only" name="cf-basis" checked={basis === b} onChange={() => setBasis(b)} />
                {b === 'project' ? 'Unlevered (project)' : 'Levered (equity)'}
              </label>
            ))}
          </fieldset>
        }
      >
        <CashFlowChart values={yearly(flows)} title={`${basis === 'project' ? 'Unlevered project' : 'Levered equity'} cash flow by year, ${node.name}`} />
      </Card>
      </div>
      <details open className="group rounded-lg border border-line bg-surface">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 [&::-webkit-details-marker]:hidden">
          <span className="text-base font-semibold">Streetscape</span>
          <span className="text-xs text-ink-mute"><span className="group-open:hidden">Show</span><span className="hidden group-open:inline">Hide</span> ▾</span>
        </summary>
        <div className="px-4 pb-4">
          <Streetscape key={`${state.projectId}/${node.id}`} node={node} result={nodeResult} attributes={state.projects[state.projectId]!.attributes} />
          <Button className="mt-2" onClick={() => dispatch({ type: 'section', id: 'map' })}>{state.projects[state.projectId]!.attributes['site.lat'] ? 'Open the site map' : 'Locate on the site map'}</Button>
        </div>
      </details>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title={state.path.length ? node.name : 'About this project'}>
          <p className="text-sm text-ink-soft">{demo.reference}</p>
          {!state.path.length && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-accent">Assumptions and limits ({demo.notes.length})</summary>
              <ul className="mt-2 list-disc pl-5 text-ink-soft">{demo.notes.map((n) => <li key={n}>{n}</li>)}</ul>
            </details>
          )}
        </Card>
        {nodeResult.warnings.length > 0 && (
          <Card title={`Model warnings (${nodeResult.warnings.length})`}>
            <ul className="flex flex-col gap-1.5 text-sm">{nodeResult.warnings.map((w) => (
              <li key={w}><details className="rounded border border-warn bg-warn-soft px-2 py-1.5 text-warn"><summary className="cursor-pointer">{w.length > 90 ? `${w.slice(0, w.lastIndexOf(' ', 88))}…` : w}</summary>{w.length > 90 && <p className="mt-1">{w}</p>}</details></li>
            ))}</ul>
          </Card>
        )}
      </div>
      {isPortfolio(node) && (
        <Card title="Phases and blocks">
          <TableWrap caption="Children of this level">
            <thead><tr>{['Name', 'Starts', 'Units', 'Total cost', 'Profit', 'Profit on cost', 'Levered IRR'].map((h, i) => <th key={h} scope="col" className={cx(th, i > 0 && 'text-right')}><GlossaryText text={h} /></th>)}</tr></thead>
            <tbody>
              {node.children.map((c) => {
                const r = getResult(nodeResult, [c.node.id])
                return (
                  <tr key={c.node.id}>
                    <td className={td}><button type="button" className="text-left text-accent underline" onClick={() => dispatch({ type: 'path', path: [...state.path, c.node.id] })}>{c.node.name}</button></td>
                    <td className={tdNum}>M{c.offsetMonths}</td>
                    <td className={tdNum}>{num(r.metrics.totalUnits?.value)}</td>
                    <td className={tdNum}>{metricValue(r.metrics.totalDevelopmentCost)}</td>
                    <td className={tdNum}>{metricValue(r.metrics.profit)}</td>
                    <td className={tdNum}>{metricValue(r.metrics.profitOnCost)}</td>
                    <td className={tdNum}>{metricValue(r.metrics.leveredIrr)}</td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrap>
        </Card>
      )}
    </div>
  )
}

function Market() {
  const { node } = useWorkspace()
  const projects = projectsUnder(node)
  const provenance = (
    <p className="text-xs text-ink-mute">
      <Chip>user assumption · synthetic</Chip>{' '}
      Live sources load in Milestone D: CMHC Rental Market Survey (rents and vacancy by bedroom type and zone), Urbanation / Altus Data Studio (condo pricing and absorption), broker reports and CBRE cap-rate surveys.
    </p>
  )
  return (
    <div className="flex flex-col gap-4">
      {projects.map(({ path, project }) => (
        <Card key={path.join('/') || project.id} title={`${project.name}: market assumptions`}>
          <div className="flex flex-col gap-4">
            {project.components.map((c) => {
              if (c.kind === 'rental') return (
                <TableWrap key={c.id} caption={`${c.id} rents`}>
                  <thead><tr>{['Unit type', 'Units', 'Net ft²', 'Rent / month', 'Rent / ft²', 'Vacancy'].map((h, i) => <th key={h} scope="col" className={cx(th, i > 0 && 'text-right')}><GlossaryText text={h} /></th>)}</tr></thead>
                  <tbody>{c.unitMix.map((u) => (
                    <tr key={u.id}>
                      <td className={td}>{u.id.replaceAll('_', ' ')}{u.id.includes('affordable') && <> <Chip tone="accent">affordable</Chip></>}</td>
                      <td className={tdNum}>{u.count}</td><td className={tdNum}>{u.netSqftPerUnit}</td>
                      <td className={tdNum}>{money(u.monthlyRent, false)}</td><td className={tdNum}>${(u.monthlyRent / u.netSqftPerUnit).toFixed(2)}</td><td className={tdNum}>{pct(u.vacancy)}</td>
                    </tr>
                  ))}</tbody>
                </TableWrap>
              )
              if (c.kind === 'condo') return (
                <TableWrap key={c.id} caption={`${c.id} pricing`}>
                  <thead><tr>{['Unit type', 'Units', 'Net ft²', '$ / ft²', 'Avg price'].map((h, i) => <th key={h} scope="col" className={cx(th, i > 0 && 'text-right')}><GlossaryText text={h} /></th>)}</tr></thead>
                  <tbody>{c.units.map((u) => (
                    <tr key={u.id}><td className={td}>{u.id}</td><td className={tdNum}>{u.count}</td><td className={tdNum}>{u.netSqftPerUnit}</td><td className={tdNum}>${u.pricePerSqft}</td><td className={tdNum}>{money(u.netSqftPerUnit * u.pricePerSqft)}</td></tr>
                  ))}</tbody>
                </TableWrap>
              )
              if (c.kind === 'commercial') return (
                <p key={c.id} className="text-sm">{c.use} {num(c.netLeasableSqft)} ft² at <span className="num">${c.rentPerSqftYear}</span>/ft²/yr net, {pct(c.vacancy)} vacancy, exit cap {pct(c.exitCapRate, 2)}.</p>
              )
              return <p key={c.id} className="text-sm">Land sales: {c.sales.map((s) => `${money(s.amount)} in month ${s.month}`).join(' · ')}</p>
            })}
            {provenance}
          </div>
        </Card>
      ))}
    </div>
  )
}

function Program() {
  const { nodeResult, demo, state, dispatch } = useWorkspace()
  const attributes = state.projects[state.projectId]!.attributes
  const mapSources = readSources(attributes)
  const groups = new Map<string, typeof catalogue.variables>()
  for (const v of catalogue.variables) groups.set(v.group, [...(groups.get(v.group) ?? []), v])
  const ids = ['totalUnits', 'totalNsf', 'commercialNla', 'efficiency', 'fsi', 'costPerGcaSqft']
  return (
    <div className="flex flex-col gap-4">
      {nodeResult && (
        <Card title="Program">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ids.map((id) => nodeResult.metrics[id]).filter(Boolean).map((m) => (
              <div key={m!.id}><dt className="text-xs text-ink-soft">{m!.label}</dt><dd className="num text-lg">{metricValue(m)}</dd>{m!.warnings[0] && <dd className="text-xs text-warn">{m!.warnings[0]}</dd>}</div>
            ))}
          </dl>
        </Card>
      )}
      <Card title={`Project variables (${catalogue.variables.length})`}>
        <p className="mb-3 text-sm text-ink-soft">
          These switches decide which costs apply ({demo.projectType}). Change one and <strong>Sources &amp; audit</strong> immediately lists the costs it adds or removes, flagging any the model does not carry yet.
        </p>
        <div className="flex flex-col gap-2">
          {[...groups.entries()].map(([group, vars]) => (
            <details key={group} className="rounded border border-line" open={group === 'site'}>
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium capitalize">{group.replace('-', ' ')} ({vars.length})</summary>
              <ul className="grid gap-x-6 gap-y-2 px-3 pb-3 sm:grid-cols-2">
                {vars.map((v) => {
                  const value = attributes[v.id]
                  return (
                    <li key={v.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0">
                        <GlossaryText text={v.label} />{v.unit && <span className="text-ink-mute"> ({v.unit})</span>} <VarHint v={v} />
                        {mapSources[v.id] && (mapSources[v.id]!.value === value
                          ? <> <Chip tone="accent" title={`${mapSources[v.id]!.layer} · retrieved ${mapSources[v.id]!.retrievedAt}`}>from map</Chip></>
                          : <> <Chip tone="warn" title={`Map said ${String(mapSources[v.id]!.value)} (${mapSources[v.id]!.layer})`}>changed from map</Chip></>)}
                      </span>
                      {v.type === 'boolean' ? (
                        <select aria-label={v.label} className="rounded border border-line-strong bg-surface px-1 py-1" value={value === true ? 'yes' : value === false ? 'no' : ''} onChange={(e) => dispatch({ type: 'attribute', id: v.id, value: e.target.value === '' ? null : e.target.value === 'yes' })}>
                          <option value="">unknown</option><option value="yes">yes</option><option value="no">no</option>
                        </select>
                      ) : v.type === 'enum' ? (
                        <select aria-label={v.label} className="rounded border border-line-strong bg-surface px-1 py-1" value={String(value ?? '')} onChange={(e) => dispatch({ type: 'attribute', id: v.id, value: e.target.value || null })}>
                          <option value="">not set</option>
                          {v.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : v.type === 'number' ? (
                        <input aria-label={v.label} inputMode="decimal" placeholder="unknown" className="num min-h-9 w-28 shrink-0 rounded border border-line-strong bg-surface px-2 text-right" defaultValue={typeof value === 'number' ? String(value) : ''} key={String(value)}
                          onBlur={(e) => { const t = e.target.value.replace(/[,$\s]/g, ''); const n = t === '' ? null : Number(t); if (n !== null && !Number.isFinite(n)) { e.target.value = typeof value === 'number' ? String(value) : ''; return } if (n !== (typeof value === 'number' ? value : null)) dispatch({ type: 'attribute', id: v.id, value: n }) }}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
                      ) : v.type === 'text' ? (
                        <input aria-label={v.label} className="min-h-9 w-44 shrink-0 rounded border border-line-strong bg-surface px-2" defaultValue={typeof value === 'string' ? value : ''} key={String(value)} onBlur={(e) => { const t = e.target.value.trim(); if (t !== (value ?? '')) dispatch({ type: 'attribute', id: v.id, value: t || null }) }} />
                      ) : (
                        <span className="text-xs text-ink-mute">table</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </details>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------- costs

function primaryField(d: Driver): { key: string; label: string; scale: number; suffix: string } {
  switch (d.kind) {
    case 'lumpSum': return { key: 'amount', label: 'Amount', scale: 1, suffix: '$' }
    case 'percentOf': return { key: 'rate', label: 'Rate', scale: 100, suffix: `% of ${d.of.join(' + ')}` }
    case 'perUnit': return { key: 'rate', label: 'Rate', scale: 1, suffix: `$ × ${num(d.units)}` }
    case 'perArea': return { key: 'rate', label: 'Rate', scale: 1, suffix: `$ × ${num(d.area)}` }
    case 'perLinear': return { key: 'rate', label: 'Rate', scale: 1, suffix: `$/m × ${num(d.metres)}` }
    case 'perHectare': return { key: 'rate', label: 'Rate', scale: 1, suffix: `$/ha × ${d.hectares}` }
  }
}

function Costs() {
  const ws = useWorkspace()
  const { node, state, dispatch, nodeResult } = ws
  const editable = atLeast(state.mode, 'professional')
  const stageOf = (l: CostLine) => (l.catalogueId && catalogueItem.get(l.catalogueId)?.stage) || 's8'
  const editLine = (lineId: string, key: string, value: number) =>
    dispatch({ type: 'edit', path: state.path, update: (n) => ({ ...n, costLines: n.costLines.map((l) => (l.id === lineId && l.driver ? { ...l, driver: { ...l.driver, [key]: value } as Driver, source: l.source && { ...l.source, reviewed: undefined } } : l)) }) })

  const componentCosts = new Map<string, number>()
  nodeResult?.project?.ledger.forEach((r) => Object.entries(r.costs).forEach(([k, v]) => k.includes(':') && componentCosts.set(k, (componentCosts.get(k) ?? 0) + v)))
  const interest = nodeResult?.project?.ledger.reduce((s, r) => s + r.interest + r.permInterest + r.refinanceFee, 0)

  const rows = catalogue.stages.map((s) => {
    const lines = node.costLines.filter((l) => stageOf(l) === s.id)
    const total = lines.reduce((sum, l) => sum + (lineTotal(l, ws, state.path) ?? 0), 0)
    return { stage: s, lines, total }
  }).filter((r) => r.lines.length)
  const grand = rows.reduce((s, r) => s + r.total, 0)

  return (
    <div className="flex flex-col gap-4">
      {isPortfolio(node) && <p className="rounded border border-line bg-surface p-3 text-sm text-ink-soft">These are the shared costs carried at <strong>{node.name}</strong> level (land, remediation, infrastructure, parks). Each block's own budget is under its name in Plan structure.</p>}
      <Card title={`Budget by stage · ${money(grand)}`} actions={<Chip tone="neutral">{editable ? 'Editable: commit with Enter' : 'Switch to Professional to edit lines'}</Chip>}>
        <TableWrap caption="Cost lines by stage">
          <thead>
            <tr>
              <th scope="col" className={th}>Line</th>
              <th scope="col" className={th}>Class</th>
              <th scope="col" className={th}>Source</th>
              {editable && <th scope="col" className={`${th} text-right`}>Driver</th>}
              <th scope="col" className={`${th} text-right`}>Total</th>
            </tr>
          </thead>
          {rows.map(({ stage, lines, total }) => (
            <tbody key={stage.id}>
              <tr className="bg-sunken">
                <th scope="rowgroup" colSpan={editable ? 4 : 3} className="px-2 py-2 text-left text-sm font-semibold">{stage.label}</th>
                <td className={`${tdNum} font-semibold`}>{money(total)}</td>
              </tr>
              {lines.map((l) => {
                const item = l.catalogueId ? catalogueItem.get(l.catalogueId) : undefined
                const f = l.driver ? primaryField(l.driver) : null
                return (
                  <tr key={l.id} className={cx(state.inspect?.kind === 'line' && state.inspect.lineId === l.id && 'bg-accent-soft')}>
                    <td className={td}>
                      <button type="button" className="text-left hover:underline" onClick={() => dispatch({ type: 'inspect', inspect: { kind: 'line', path: state.path, lineId: l.id } })}>{l.label}</button>
                    </td>
                    <td className={td}><Chip>{l.estimateClass === 'exact' ? 'exact' : `class ${l.estimateClass}`}</Chip></td>
                    <td className={td}>{item ? <SourceChip tag={item.src} /> : <Chip tone="warn">unmapped</Chip>}</td>
                    {editable && (
                      <td className={`${td} w-64`}>
                        {l.driver && f ? (
                          <NumberField compact label={`${l.label} ${f.label}`} value={(l.driver as Record<string, unknown>)[f.key] as number} scale={f.scale} suffix={f.suffix} onCommit={(v) => editLine(l.id, f.key, v)} />
                        ) : <Chip tone="warn">not yet estimated</Chip>}
                      </td>
                    )}
                    <td className={tdNum}>{l.driver === null ? '—' : money(lineTotal(l, ws, state.path))}</td>
                  </tr>
                )
              })}
            </tbody>
          ))}
          {componentCosts.size > 0 && (
            <tbody>
              <tr className="bg-sunken"><th scope="rowgroup" colSpan={editable ? 4 : 3} className="px-2 py-2 text-left text-sm font-semibold">From revenue components (TI, leasing, sales commissions)</th><td className={`${tdNum} font-semibold`}>{money([...componentCosts.values()].reduce((a, b) => a + b, 0))}</td></tr>
              {[...componentCosts.entries()].map(([k, v]) => <tr key={k}><td className={td} colSpan={editable ? 4 : 3}>{k.replace(':', ' · ')}</td><td className={tdNum}>{money(v)}</td></tr>)}
            </tbody>
          )}
          {interest !== undefined && (
            <tbody><tr className="bg-sunken"><th scope="rowgroup" colSpan={editable ? 4 : 3} className="px-2 py-2 text-left text-sm font-semibold">Financing: interest and refinance fees (from the ledger)</th><td className={`${tdNum} font-semibold`}>{money(interest)}</td></tr></tbody>
          )}
        </TableWrap>
      </Card>
      {state.path.length === 0 && <AttributeHint />}
    </div>
  )
}

function AttributeHint() {
  const { state, dispatch } = useWorkspace()
  const attrs = state.projects[state.projectId]!.attributes
  const quick = ['site.contamination', 'planning.affordableShare', 'site.nearTtc60m', 'program.pool', 'design.elevators'].filter((id) => variableInfo.has(id))
  return (
    <Card title="What switches costs on">
      <p className="text-sm text-ink-soft">Examples of variables for this project. See all {catalogue.variables.length} under Site &amp; program.</p>
      <ul className="mt-2 flex flex-wrap gap-2 text-sm">
        {quick.map((id) => <li key={id}><Chip>{variableInfo.get(id)!.label}: {String(attrs[id] ?? 'not set')}</Chip></li>)}
      </ul>
      <Button className="mt-3" onClick={() => dispatch({ type: 'section', id: 'program' })}>Edit project variables</Button>
    </Card>
  )
}

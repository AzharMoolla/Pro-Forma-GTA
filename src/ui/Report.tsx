import { useMemo, useState } from 'react'
import { CONVENTION_VERSION, ENGINE_VERSION } from '../engine/project'
import { workbookSheets } from '../export/workbook'
import { xlsx } from '../export/xlsx'
import { sensitivityGrid } from './chartData'
import { Button, Card, Chip, TableWrap, td, tdNum, th } from './components'
import { coverage, projectsUnder } from './coverage'
import { catalogue, dataContext, variableInfo } from './data'
import { metricValue, money } from './format'
import { readinessLabels, useReadiness } from './sections2'
import { useAnalysis, useTrackerView } from './sections3'
import { readSources } from './SiteMap'
import { StreetscapeSvg } from './Streetscape'
import { sceneOf } from './streetscapeScene'
import { getResult } from './tree'
import { IndigenousCard } from './Indigenous'
import { useWorkspace } from './workspace'

const KEY_METRICS = ['totalUnits', 'totalDevelopmentCost', 'totalRevenue', 'profit', 'profitOnCost', 'profitOnCostBeforeFinancing', 'yieldOnCost', 'unleveredIrr', 'leveredIrr', 'equityMultiple', 'equityContributed', 'peakDebt']
const SITE_VARS = ['site.address', 'site.municipality', 'site.region', 'site.ward', 'site.treaty', 'zoning.code', 'zoning.heightLimitM', 'zoning.heightLimitStoreys', 'zoning.fsiLimit', 'zoning.exception', 'zoning.holding', 'site.secondaryPlan', 'site.mtsaType', 'site.heritage', 'site.regulatedArea', 'site.greenbelt', 'site.nearAerodrome', 'site.aeronauticalLimitM', 'site.frontageRoadClass', 'site.nearestTransitStop', 'planning.zba']

/** Report & export: an Excel workbook with every input, line, ledger row and source, and a printable report (PDF). */
export function Report() {
  const { demo, draft, result, state, node, nodeResult } = useWorkspace()
  const project = state.projects[state.projectId]!
  const ready = useReadiness()
  const labels = readinessLabels(ready)
  const { view: tracker } = useTrackerView()
  const [busy, setBusy] = useState(false)
  const synthetic = !project.draft || demo.notes.some((n) => /synthetic/i.test(n))

  const analysis = useAnalysis()
  const insights = analysis?.insights ?? []
  const feas = analysis?.feasibility
  const entries = useMemo(() => coverage(demo.projectType, project.attributes, draft, demo.coverage), [demo, project.attributes, draft])
  const sources = readSources(project.attributes)
  const scene = useMemo(() => {
    if (!nodeResult) return null
    const projects = projectsUnder(node)
    return sceneOf(projects.map(({ path, project: p }) => ({ path: [...state.path, ...path], project: p, label: projects.length > 1 ? money((path.length ? getResult(nodeResult, path) : nodeResult).metrics.profit?.value) : undefined })), project.attributes)
  }, [node, nodeResult, state.path, project.attributes])
  if (!result || !nodeResult) return null

  const exportedAt = new Date().toISOString()
  const fileBase = `${demo.id}-${exportedAt.slice(0, 10)}`
  const downloadXlsx = () => {
    setBusy(true)
    const bytes = xlsx(workbookSheets({
      projectName: demo.name, projectType: demo.projectType, draft, result, attributes: project.attributes, catalogue,
      coverage: entries, readiness: { model: labels.model.text, scope: labels.scope.text, sources: labels.sources.text },
      insights, tracker, scenarios: project.scenarios, draftParentId: project.draftParentId, dataContext, exportedAt, synthetic,
      sensitivity: { metric: 'Profit on cost', ...sensitivityGrid(draft, 'profitOnCost') }, feasibility: feas,
    }))
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    Object.assign(document.createElement('a'), { href: url, download: `${fileBase}.xlsx` }).click()
    URL.revokeObjectURL(url)
    setBusy(false)
  }

  const m = nodeResult.metrics
  const counts = ready.scope.counts
  return (
    <div className="flex flex-col gap-4">
      <Card title="Export" className="print:hidden">
        <p className="mb-3 text-sm text-ink-soft">The workbook has every input, cost line (with its source), the monthly ledger, site and policy facts with their map sources, the checklist, tracker, analysis, scenarios and a sensitivity grid. Unknowns stay blank and are listed, never written as zero. The report below prints to PDF from your browser.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={downloadXlsx} disabled={busy}>Download Excel workbook (.xlsx)</Button>
          <Button onClick={() => window.print()}>Print or save as PDF</Button>
        </div>
        {project.draftParentId === null && <p className="mt-2 text-xs text-warn">This is an unsaved draft: lock a scenario first if the report needs a citable, hashed version.</p>}
      </Card>

      <article className="report flex flex-col gap-4 rounded-lg border border-line bg-surface p-6 print:border-0 print:p-0" aria-label="Report">
        <header>
          <p className="text-xs tracking-wide text-ink-mute uppercase">Development pro forma · {demo.projectType}</p>
          <h2 className="text-2xl font-semibold">{node.name}</h2>
          <p className="text-sm text-ink-soft">Exported {exportedAt.slice(0, 16).replace('T', ' ')} UTC · {project.draftParentId ? `draft from scenario ${project.draftParentId}` : 'unsaved draft'} · engine {ENGINE_VERSION}, conventions {CONVENTION_VERSION} · {Object.values(dataContext).join(' · ')}</p>
          <p className="mt-1 flex flex-wrap gap-1">
            <Chip tone={labels.model.tone}>{labels.model.text}</Chip><Chip tone={labels.scope.tone}>{labels.scope.text}</Chip><Chip tone={labels.sources.tone}>{labels.sources.text}</Chip>
            {synthetic && <Chip tone="warn">Synthetic demo figures</Chip>}
          </p>
        </header>

        <section>
          <h3 className="mb-2 text-base font-semibold">Key results</h3>
          <TableWrap caption="Key results">
            <thead><tr>{['Metric', 'Value', 'Basis'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
            <tbody>{KEY_METRICS.map((id) => m[id]).filter((x) => x !== undefined).map((x) => (
              <tr key={x.id}><td className={td}>{x.label}</td><td className={tdNum}>{metricValue(x)}</td><td className={`${td} text-xs text-ink-soft`}>{x.missing.length ? `withheld: ${x.missing.length} unknown` : x.basis}</td></tr>
            ))}</tbody>
          </TableWrap>
        </section>

        {scene && (
          <section className="break-inside-avoid">
            <h3 className="mb-2 text-base font-semibold">Streetscape</h3>
            <div className="h-[340px] rounded border border-line">
              <StreetscapeSvg scene={scene} style="sketch" stats={[['Homes', metricValue(m.totalUnits)], ['Total cost', metricValue(m.totalDevelopmentCost)], ['Profit on cost', metricValue(m.profitOnCost)]]} title={node.name} uid="report" />
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-base font-semibold">Observations</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {insights.map((i) => <li key={i.id} className="break-inside-avoid"><strong>{i.severity === 'concern' ? '▲ Concern' : i.severity === 'watch' ? '! Watch' : i.severity === 'good' ? '✓ Strength' : 'i Note'}: {i.title}.</strong> <span className="text-ink-soft">{i.detail}</span>{i.source && <span className="text-xs text-ink-mute"> Source: {i.source}.</span>}</li>)}
          </ul>
        </section>

        {feas && (
          <section className="break-inside-avoid">
            <h3 className="mb-2 text-base font-semibold">Funding and downside</h3>
            {feas.funding && (
              <p className="mb-2 text-sm">
                {feas.fundingGap ? <strong>Funding gap {money(feas.fundingGap)}. </strong> : <strong>No funding gap. </strong>}
                <span className="text-ink-soft">Construction loan peaks at {money(feas.funding.peakDebt)} (month {feas.funding.peakDebtMonth}) against a commitment of {money(feas.funding.facilityLimit)} (loan-to-cost × budget incl. capitalized interest){feas.funding.refinance ? `; the refinance in month ${feas.funding.refinance.month} nets ${money(feas.funding.refinance.netProceeds)} against a ${money(feas.funding.refinance.constructionBalance)} construction balance` : ''}{feas.funding.exitGap ? `; the sale falls ${money(feas.funding.exitGap)} short of the loans` : ''}. Peak equity out of pocket {money(feas.funding.peakEquity)}.</span>
              </p>
            )}
            <TableWrap caption="Combined downside">
              <thead><tr>{['Scenario', 'Profit on cost', 'Levered IRR', 'Unlevered profit', 'Funding gap'].map((h, i) => <th key={h} scope="col" className={i ? `${th} text-right` : th}>{h}</th>)}</tr></thead>
              <tbody>{feas.downside.map((r) => {
                const v = (id: string) => r.result?.metrics[id] ?? undefined
                return <tr key={r.id}><td className={td}>{r.label}</td><td className={tdNum}>{metricValue(v('profitOnCost'))}</td><td className={tdNum}>{metricValue(v('leveredIrr'))}</td><td className={tdNum}>{metricValue(v('profit'))}</td><td className={tdNum}>{r.fundingGap === null ? 'per building' : r.fundingGap > 0 ? money(r.fundingGap) : 'none'}</td></tr>
              })}</tbody>
            </TableWrap>
            <p className="mt-1 text-xs text-ink-mute">Each row re-runs the model with the shock applied; "All together" applies all four.</p>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-base font-semibold">Site and policy</h3>
          <TableWrap caption="Site and policy facts">
            <thead><tr>{['Fact', 'Value', 'Source'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
            <tbody>{SITE_VARS.filter((id) => project.attributes[id] !== undefined && project.attributes[id] !== null).map((id) => (
              <tr key={id}><td className={td}>{variableInfo.get(id)?.label ?? id}</td><td className={td}>{String(project.attributes[id])}</td><td className={`${td} text-xs text-ink-soft`}>{sources[id] ? `${sources[id]!.layer} · ${sources[id]!.retrievedAt}` : variableInfo.get(id)?.source ?? ''}</td></tr>
            ))}</tbody>
          </TableWrap>
          <p className="mt-1 text-xs text-ink-mute">Screening data from public sources; not a zoning opinion. Check the operative by-laws, plans and exceptions.</p>
        </section>

        <section>
          <h3 className="mb-2 text-base font-semibold">Scope</h3>
          <p className="text-sm text-ink-soft">{ready.scope.applicable} catalogue items apply: {counts.line} own cost lines, {counts.covered} inside other figures, {counts.excluded} excluded, {counts.gap} known gaps, {counts.unaccounted} not in the model, {counts.stale} stale, {counts['to-confirm']} waiting on a project variable.</p>
          {counts.unaccounted + counts.gap > 0 && (
            <ul className="mt-1 list-disc pl-5 text-sm">
              {entries.filter((e) => e.status === 'unaccounted' || e.status === 'gap').map((e) => <li key={e.item.id}>{e.item.label} <span className="text-xs text-ink-mute">({e.status === 'gap' ? 'known gap' : 'not in model'})</span></li>)}
            </ul>
          )}
        </section>

        <section className="break-inside-avoid">
          <IndigenousCard treaty={typeof project.attributes['site.treaty'] === 'string' ? project.attributes['site.treaty'] : null} municipality={typeof project.attributes['site.municipality'] === 'string' ? project.attributes['site.municipality'] : null} />
        </section>

        {project.scenarios.length > 0 && (
          <section>
            <h3 className="mb-2 text-base font-semibold">Locked scenarios</h3>
            <ul className="text-sm">{project.scenarios.map((s) => <li key={s.id}><span className="num text-xs">{s.inputHash.slice(0, 12)}</span> {s.label}: <span className="text-ink-soft">{s.note}</span></li>)}</ul>
          </section>
        )}

        <footer className="border-t border-line pt-2 text-xs text-ink-mute">
          Not financial, tax, lending, legal or planning advice. {synthetic ? 'Figures are synthetic placeholders for illustration. ' : ''}Map facts contain information licensed under the Open Government Licence – Ontario and – Toronto, and Durham, Oshawa and TRCA open data under their terms.
        </footer>
      </article>
    </div>
  )
}

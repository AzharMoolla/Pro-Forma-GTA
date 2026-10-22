import { AFFORDABLE_SHARE, affordability, implications, type AreaProfile } from '../engine/affordability'
import { toCsv } from './chartData'
import { Card, Chip, TableWrap, td, tdNum, th } from './components'
import { projectsUnder } from './coverage'
import { catalogue } from './data'
import { money, num, pct } from './format'
import { ChartFigure } from './Visuals'
import { AffordabilityChart } from './chartViews'
import { atLeast } from './store'
import { useWorkspace } from './workspace'

const SIMPLE_PEOPLE = ['demo.medianHouseholdIncome', 'demo.medianRenterIncome', 'demo.medianOwnerIncome', 'demo.incomeGrowth']
import { GlossaryText, VarHint } from './Glossary'

// People & affordability: who the homes are for, whether they can afford them over time, and what the new residents
// mean for schools, seniors' services and transit. Demographics are user-entered from the Census Profile, with source.

const YEARS = 10
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export function People() {
  const { state, dispatch, node } = useWorkspace()
  const a = state.projects[state.projectId]!.attributes
  // Simple asks only the incomes the 30% test runs on; Full detail adds the rest of the area's profile
  const simple = !atLeast(state.mode, 'professional')
  const vars = catalogue.variables.filter((v) => v.group === 'demographics' && (!simple || SIMPLE_PEOPLE.includes(v.id)))
  const projects = projectsUnder(node)
  const rental = projects.some(({ project }) => project.components.some((c) => c.kind === 'rental'))
  const income = rental ? n(a['demo.medianRenterIncome']) ?? n(a['demo.medianHouseholdIncome']) : n(a['demo.medianOwnerIncome']) ?? n(a['demo.medianHouseholdIncome'])
  const area: AreaProfile = {
    income, incomeGrowth: n(a['demo.incomeGrowth']) ?? 0.02, avgHouseholdSize: n(a['demo.avgHouseholdSize']), age0to14Share: n(a['demo.age0to14Share']),
    age65PlusShare: n(a['demo.age65PlusShare']), employmentRate: n(a['demo.employmentRate']), transitCommuteShare: n(a['demo.transitCommuteShare']),
  }
  const rows = projects.flatMap(({ project }) => affordability(project, area, YEARS).map((r) => ({ ...r, unit: projects.length > 1 ? `${project.name}: ${r.unit}` : r.unit })))
  const homes = projects.reduce((s, { project }) => s + project.components.reduce((t, c) => t + (c.kind === 'rental' ? c.unitMix.reduce((u, x) => u + x.count, 0) : c.kind === 'condo' ? c.units.reduce((u, x) => u + x.count, 0) : 0), 0), 0)
  const imp = implications(homes, area)
  const set = (id: string, raw: string) => {
    const t = raw.replace(/[,$%\s]/g, '')
    const v = t === '' ? null : Number(t)
    if (v === null || Number.isFinite(v)) dispatch({ type: 'attribute', id, value: v })
  }
  const shown = rows.filter((r) => r.shares.length)

  return (
    <div className="flex flex-col gap-4">
      <Card title="Who lives here now">
        <p className="mb-3 text-sm text-ink-soft">
          Enter the area's figures from the <a className="text-accent underline" href="https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/index.cfm" target="_blank" rel="noreferrer">Statistics Canada Census Profile</a> (census tract or dissemination area) or the City's neighbourhood profiles. Fractions as decimals (0.35 for 35%). Unknown stays blank.
        </p>
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
          {vars.map((v) => {
            const value = a[v.id]
            return (
              <label key={v.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0"><GlossaryText text={v.label} />{v.unit && <span className="text-ink-mute"> ({v.unit})</span>} <VarHint v={v} /></span>
                <input aria-label={v.label} placeholder={v.id === 'demo.incomeGrowth' ? '0.02' : 'unknown'} inputMode={v.type === 'number' ? 'decimal' : undefined}
                  className="num min-h-9 w-32 shrink-0 rounded border border-line-strong bg-surface px-2 text-right"
                  defaultValue={value === null || value === undefined ? '' : String(value)} key={String(value)}
                  onBlur={(e) => (v.type === 'number' ? set(v.id, e.target.value) : dispatch({ type: 'attribute', id: v.id, value: e.target.value.trim() || null }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
              </label>
            )
          })}
        </div>
      </Card>

      <ChartFigure
        title="Can the people who live here afford it?"
        about={`Housing cost as a share of the ${rental ? 'median renter' : 'median'} household income, year by year from first occupancy, against CMHC's 30% affordability threshold. Rents grow at the model's rent growth and incomes at the income growth assumption. Ownership costs use 20% down, 5.0% compounded semi-annually over 25 years, $0.75/ft²/month condo fees and 0.7% property tax. A median is the middle household: above 30% at the median means most households here could not afford the home.`}
        csv={toCsv(['Unit', 'Tenure', 'Homes', 'Monthly cost (year 1)', 'Income needed at 30%', ...Array.from({ length: YEARS }, (_, k) => `Year ${k + 1} share`)], rows.map((r) => [r.unit, r.tenure, r.count, Math.round(r.monthlyCost), Math.round(r.incomeNeeded), ...r.shares.map((s) => Number(s.toFixed(4)))]))}
        file={`${node.id}-affordability`}
        table={(
          <TableWrap caption="Affordability by unit type">
            <thead><tr>{['Unit', 'Homes', 'Monthly cost', 'Income needed at 30%', 'Year 1', `Year ${YEARS}`].map((h, i) => <th key={h} scope="col" className={i ? `${th} text-right` : th}><GlossaryText text={h} /></th>)}</tr></thead>
            <tbody>{rows.map((r) => <tr key={r.unit}><td className={td}>{r.unit} <span className="text-xs text-ink-mute">({r.tenure})</span></td><td className={tdNum}>{r.count}</td><td className={tdNum}>{money(r.monthlyCost, false)}</td><td className={tdNum}>{money(r.incomeNeeded, false)}</td><td className={tdNum}>{r.shares[0] === undefined ? 'income unknown' : pct(r.shares[0], 1)}</td><td className={tdNum}>{r.shares.at(-1) === undefined ? '—' : pct(r.shares.at(-1)!, 1)}</td></tr>)}</tbody>
          </TableWrap>
        )}
      >
        {!rows.length ? <p className="text-sm text-ink-soft">No homes in this selection.</p> : !shown.length ? (
          <p className="rounded border border-warn bg-warn-soft p-3 text-sm text-warn">Enter the {rental ? 'median renter' : 'median'} household income above to test affordability. Meanwhile, the income each home needs at 30%: {rows.map((r) => `${r.unit} ${money(r.incomeNeeded)}`).join(' · ')}.</p>
        ) : (
          <>
            <ul className="mb-2 flex flex-wrap gap-2">
              {shown.map((r) => <li key={r.unit}><Chip tone={r.shares[0]! <= AFFORDABLE_SHARE ? 'good' : 'bad'}>{r.unit}: {pct(r.shares[0]!, 0)} in year 1 {r.shares[0]! <= AFFORDABLE_SHARE ? '· affordable' : '· above 30%'}</Chip></li>)}
            </ul>
            <AffordabilityChart rows={shown} startLabel="Y1" />
          </>
        )}
      </ChartFigure>

      <Card title="What the new residents mean">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ['New homes', num(imp.homes)],
            ['Residents', imp.residents === null ? 'needs household size' : num(Math.round(imp.residents))],
            ['Children 0–14 (school places)', imp.children === null ? 'needs age shares' : num(Math.round(imp.children))],
            ['Seniors 65+', imp.seniors === null ? 'needs age shares' : num(Math.round(imp.seniors))],
            ['Transit commuters', imp.transitCommuters === null ? 'needs employment and commute shares' : num(Math.round(imp.transitCommuters))],
          ].map(([k, v]) => <div key={k}><dt className="text-xs text-ink-soft">{k}</dt><dd className="num text-lg font-semibold">{v}</dd></div>)}
        </dl>
        <p className="mt-2 text-xs text-ink-mute">Screening estimates from the area's averages: new buildings often house smaller or larger households than the area (studios versus family units), so school boards, transit agencies and service planners use their own yields. Check with the school boards and the City's community services.</p>
      </Card>
    </div>
  )
}

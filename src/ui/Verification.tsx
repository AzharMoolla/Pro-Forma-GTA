import { useEffect, useMemo, useRef, useState } from 'react'
import { CALCULATORS, runAll, type Calculator } from '../verification/cases'
import { FITTED_RENTAL_SPREAD, NBLC_PEEL_2021, type BenchmarkRow, type DirectionRow } from '../verification/benchmarks'
import { Button, Card, Chip, TableWrap, td, tdNum, th } from './components'
import { money, pct } from './format'
import { GlossaryText } from './Glossary'

// Verification: the model's answers beside answers worked out independently (by hand, from a statute or a textbook
// formula). The same cases run in the test suite on every build.

const fmt = (v: number | null, unit: 'CAD' | 'rate' | 'ratio') => (v === null ? 'n/a' : unit === 'CAD' ? money(v, false) : unit === 'rate' ? pct(v, 4) : v.toFixed(4))
const KIND = { math: 'Arithmetic', fact: 'Fact check', behaviour: 'Behaviour' } as const

export function Verification() {
  const results = useMemo(() => runAll(), [])
  const failed = results.filter((r) => !r.pass).length
  return (
    <div className="flex flex-col gap-4">
      <Card title="Expected vs actual">
        <p className="text-sm text-ink-soft">Each check states its inputs and the answer worked out independently of the model (by hand, from the statute or from the textbook formula), then shows what the model produced. Fact checks hold the model's figures against the rules they come from. These run on every build, so a broken formula can't be deployed. Sources and benchmarks are in the literature review (docs/implementation/LITERATURE_REVIEW.md).</p>
        <p className="mt-2"><Chip tone={failed ? 'bad' : 'good'}>{failed ? `${failed} of ${results.length} checks fail` : `All ${results.length} checks pass`}</Chip></p>
        <div className="mt-3">
          <TableWrap caption="Verification checks">
            <thead><tr>{['Check', 'Inputs', 'Expected', 'Model', 'Difference', 'Result'].map((h, i) => <th key={h} scope="col" className={i >= 2 && i <= 4 ? `${th} text-right` : th}><GlossaryText text={h} /></th>)}</tr></thead>
            <tbody>{results.map((r) => (
              <tr key={r.case.id}>
                <td className={td}><span className="num text-xs text-ink-mute">{r.case.id}</span> <span className="font-medium"><GlossaryText text={r.case.title} /></span> <Chip>{KIND[r.case.kind]}</Chip><p className="text-xs text-ink-soft">{r.case.derivation}</p></td>
                <td className={`${td} text-xs`}>{r.case.inputs}</td>
                <td className={tdNum}>{fmt(r.case.expected, r.case.unit)}</td>
                <td className={tdNum}>{fmt(r.actual, r.case.unit)}</td>
                <td className={tdNum}>{r.diff === null ? '—' : fmt(r.diff, r.case.unit)}</td>
                <td className={td}><Chip tone={r.pass ? 'good' : 'bad'}>{r.pass ? 'Pass' : r.error ? 'Error' : 'Fail'}</Chip></td>
              </tr>
            ))}</tbody>
          </TableWrap>
        </div>
      </Card>

      <Card title="Try your own numbers">
        <p className="mb-3 text-sm text-ink-soft">Enter any inputs. The expected answer comes from the formula written out here; the model's answer comes from the engine itself. They should match to the cent.</p>
        <div className="grid gap-4 lg:grid-cols-2">{CALCULATORS.map((c) => <Calc key={c.id} c={c} />)}</div>
      </Card>
      <Benchmark />
    </div>
  )
}

/** The model against a published pro forma with known answers: NBLC's residual land values for 15 Peel sites. */
function Benchmark() {
  const [rows, setRows] = useState<{ condo: BenchmarkRow[]; rental: BenchmarkRow[]; toronto: DirectionRow[] } | null>(null)
  const [state, setState] = useState<'idle' | 'running' | string>('idle')
  const worker = useRef<Worker | null>(null)
  useEffect(() => () => worker.current?.terminate(), [])
  const run = () => {
    setState('running')
    worker.current?.terminate()
    worker.current = new Worker(new URL('./benchmark.worker.ts', import.meta.url), { type: 'module' })
    worker.current.onmessage = (e: MessageEvent<{ ok: boolean; condo: BenchmarkRow[]; rental: BenchmarkRow[]; toronto: DirectionRow[]; error?: string }>) => {
      if (e.data.ok) { setRows({ condo: e.data.condo, rental: e.data.rental, toronto: e.data.toronto }); setState('idle') } else setState(e.data.error ?? 'failed')
    }
    worker.current.postMessage(null)
  }
  const revenue = (i: number) => { const s = NBLC_PEEL_2021[i]!; return (s.units * s.unitSqft * s.condoPsf) + (Math.round(s.units * s.parkingRes) * s.stallPrice) }
  const within = rows ? rows.condo.filter((r, i) => r.error !== null && Math.abs(r.error) / revenue(i) <= 0.02).length : 0
  return (
    <Card title="Benchmark: published pro formas">
      <p className="text-sm text-ink-soft">
        The model rebuilds each of the 15 transit-area sites in NBLC's 2021 Inclusionary Zoning Evaluation for Peel from the study's own published inputs (site, units, prices, rents, hard and soft costs, development charges, financing), then solves the land value the way the study does: the price at which profit after financing is 15% of revenue (condo), or the stabilized value at the cap rate plus a profit spread covers every cost (rental). It compares that with the study's stated land values. A residual magnifies small differences: missing by 1% of revenue moves land by about 1% of revenue.
      </p>
      <p className="mt-2 text-xs text-ink-mute">Where the study is silent, one assumption applies to every site: 375 ft² of underground parking per stall, 18 months before construction, 20–36 months to build by height, HST remitted net of the Ontario rebate, deposits held in trust. The rental profit spread is unpublished; {pct(FITTED_RENTAL_SPREAD, 2)} is the one value fitted to the study. Full method and results: docs/implementation/BENCHMARK.md.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={run} disabled={state === 'running'}>{state === 'running' ? 'Running 52 land solves…' : rows ? 'Run again' : 'Run the benchmark'}</Button>
        {rows && <Chip tone={within >= 9 ? 'good' : 'warn'}>Peel condo: {within} of 15 within 2% of revenue</Chip>}
        {rows && <Chip tone="neutral">Toronto: {rows.toronto.filter((r) => r.agrees).length} of {rows.toronto.length} viable/challenge calls agree</Chip>}
        {state !== 'idle' && state !== 'running' && <span role="alert" className="text-sm text-bad">{state}</span>}
      </div>
      {rows && (
        <div className="mt-3">
          <TableWrap caption="Residual land value: study vs this model">
            <thead><tr>{['Site', 'Condo: study', 'Condo: model', 'Miss (% of revenue)', 'Rental: study', 'Rental: model', 'Miss'].map((h, i) => <th key={h} scope="col" className={i ? `${th} text-right` : th}>{h}</th>)}</tr></thead>
            <tbody>{NBLC_PEEL_2021.map((site, i) => {
              const c = rows.condo[i]!, r = rows.rental[i]!
              const share = c.error === null ? null : c.error / revenue(i)
              return (
                <tr key={site.name}>
                  <td className={td}>{site.name}</td>
                  <td className={tdNum}>{money(c.stated)}</td>
                  <td className={tdNum}>{c.ours === null ? 'n/a' : money(c.ours)}</td>
                  <td className={tdNum}><span className={share !== null && Math.abs(share) <= 0.02 ? 'text-good' : 'text-warn'}>{share === null ? 'n/a' : pct(share, 1)}</span></td>
                  <td className={tdNum}>{money(r.stated)}</td>
                  <td className={tdNum}>{r.ours === null ? 'n/a' : money(r.ours)}</td>
                  <td className={tdNum}>{r.error === null ? 'n/a' : money(r.error)}</td>
                </tr>
              )
            })}</tbody>
          </TableWrap>
          <h3 className="mt-4 mb-1 text-sm font-semibold">Second answer key: Toronto 2019 (direction)</h3>
          <p className="mb-2 text-xs text-ink-soft">NBLC's 2019 Toronto study publishes inputs for 11 sites but states results only as viable (land value at least 10% above the existing site's value) or challenge. The rental spread is Peel's, not refitted, so this half is out of sample.</p>
          <TableWrap caption="Toronto 2019: viable or challenge, study vs this model">
            <thead><tr>{['Site', 'Tenure', 'Viable above', 'Model land value', 'Study', 'Model', ''].map((h, i) => <th key={h || i} scope="col" className={i >= 2 && i <= 3 ? `${th} text-right` : th}>{h}</th>)}</tr></thead>
            <tbody>{rows.toronto.map((r) => (
              <tr key={`${r.site}-${r.tenure}`}>
                <td className={td}>{r.site}</td>
                <td className={td}>{r.tenure}</td>
                <td className={tdNum}>{money(r.threshold)}</td>
                <td className={tdNum}>{r.ours === null ? 'n/a' : money(r.ours)}</td>
                <td className={td}>{r.studyViable ? 'viable' : 'challenge'}</td>
                <td className={td}>{r.modelViable === null ? 'n/a' : r.modelViable ? 'viable' : 'challenge'}</td>
                <td className={td}><span className={r.agrees ? 'text-good' : 'text-warn'}>{r.agrees ? '✓ agrees' : '✗ differs'}</span></td>
              </tr>
            ))}</tbody>
          </TableWrap>
        </div>
      )}
    </Card>
  )
}

function Calc({ c }: { c: Calculator }) {
  const [text, setText] = useState<Record<string, string>>(() => Object.fromEntries(c.fields.map((f) => [f.id, String(f.value)])))
  const values = Object.fromEntries(Object.entries(text).map(([k, v]) => [k, Number(v.replace(/[,$%\s]/g, ''))]))
  const valid = Object.values(values).every((v) => Number.isFinite(v)) && Object.values(values).every((v) => v >= 0)
  let expected: number | null = null
  let actual: number | null = null
  if (valid) {
    try { expected = c.expected(values); actual = c.actual(values) } catch { actual = null }
  }
  const diff = expected !== null && actual !== null ? actual - expected : null
  const ok = diff !== null && Math.abs(diff) < 0.01
  return (
    <section className="rounded-md border border-line p-3">
      <h3 className="mb-1 text-sm font-semibold">{c.title}</h3>
      <p className="mb-2 text-xs text-ink-mute">{c.formula}</p>
      <div className="mb-2 flex flex-wrap gap-2">
        {c.fields.map((f) => (
          <label key={f.id} className="flex flex-col gap-1 text-xs text-ink-soft">{f.label}
            <input className="num min-h-9 w-36 rounded border border-line-strong bg-surface px-2 text-right text-sm text-ink" inputMode="decimal" value={text[f.id]} onChange={(e) => setText({ ...text, [f.id]: e.target.value })} />
          </label>
        ))}
      </div>
      {!valid ? <p className="text-sm text-warn">Enter numbers of zero or more.</p> : (
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div><dt className="text-xs text-ink-soft">Expected</dt><dd className="num font-semibold">{fmt(expected, c.unit)}</dd></div>
          <div><dt className="text-xs text-ink-soft">Model</dt><dd className="num font-semibold">{fmt(actual, c.unit)}</dd></div>
          <div><dt className="text-xs text-ink-soft">Result</dt><dd><Chip tone={ok ? 'good' : 'bad'}>{ok ? 'Match' : diff === null ? 'n/a' : `Off by ${fmt(diff, c.unit)}`}</Chip></dd></div>
        </dl>
      )}
    </section>
  )
}

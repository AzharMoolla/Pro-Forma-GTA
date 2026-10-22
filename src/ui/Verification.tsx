import { useMemo, useState } from 'react'
import { CALCULATORS, runAll, type Calculator } from '../verification/cases'
import { Card, Chip, TableWrap, td, tdNum, th } from './components'
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
    </div>
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

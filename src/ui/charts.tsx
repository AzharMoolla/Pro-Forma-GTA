import { useId, useState } from 'react'
import { money } from './format'
import { TableWrap, td, tdNum, th } from './components'

/** Annual net cash flow, polarity-coloured (validated pair, see dataviz check), labelled so colour is never the only cue. */
export function CashFlowChart({ values, title }: { values: number[]; title: string }) {
  const id = useId()
  const [hover, setHover] = useState<number | null>(null)
  const W = 720
  const H = 220
  const pad = { l: 64, r: 8, t: 12, b: 28 }
  const max = Math.max(1, ...values.map((v) => Math.abs(v)))
  const hasNeg = values.some((v) => v < 0)
  const hasPos = values.some((v) => v > 0)
  const top = hasPos ? max : 0
  const bottom = hasNeg ? -max : 0
  const y = (v: number) => pad.t + ((top - v) / (top - bottom || 1)) * (H - pad.t - pad.b)
  const band = (W - pad.l - pad.r) / Math.max(1, values.length)
  const barW = Math.max(3, Math.min(28, band - 2))
  const ticks = [top, top / 2, 0, bottom / 2, bottom].filter((v, i, a) => a.indexOf(v) === i)

  return (
    <figure className="flex flex-col gap-2" aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium">{title}</span>
        <span className="flex items-center gap-3 text-xs text-ink-soft">
          <span className="flex items-center gap-1"><span aria-hidden className="inline-block size-2.5 rounded-sm" style={{ background: 'var(--chart-in)' }} />Net inflow (+)</span>
          <span className="flex items-center gap-1"><span aria-hidden className="inline-block size-2.5 rounded-sm" style={{ background: 'var(--chart-out)' }} />Net outflow (−)</span>
        </span>
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${title}. ${values.length} years. Table view below.`} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={t === 0 ? 1.5 : 1} />
              <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="num" fontSize="11" fill="var(--ink-mute)">{money(t)}</text>
            </g>
          ))}
          {values.map((v, i) => {
            const x = pad.l + i * band + (band - barW) / 2
            const y0 = y(0)
            const y1 = y(v)
            const h = Math.max(1, Math.abs(y1 - y0))
            const r = Math.min(4, h / 2, barW / 2)
            // rounded end at the data end, square at the baseline
            const d = v >= 0
              ? `M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + barW - r} Q${x + barW},${y1} ${x + barW},${y1 + r} V${y0} Z`
              : `M${x},${y0} V${y1 - r} Q${x},${y1} ${x + r},${y1} H${x + barW - r} Q${x + barW},${y1} ${x + barW},${y1 - r} V${y0} Z`
            return (
              <g key={i}>
                <path d={d} fill={v >= 0 ? 'var(--chart-in)' : 'var(--chart-out)'} opacity={hover === null || hover === i ? 1 : 0.55} />
                <rect x={pad.l + i * band} y={pad.t} width={band} height={H - pad.t - pad.b} fill="transparent" onMouseEnter={() => setHover(i)} />
                {(values.length <= 20 || i % 2 === 0) && <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--ink-mute)">Y{i + 1}</text>}
              </g>
            )
          })}
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute top-1 right-2 rounded border border-line bg-surface px-2 py-1 text-xs shadow-sm" role="status">
            Year {hover + 1}: <span className="num font-medium">{money(values[hover]!)}</span>
          </div>
        )}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-accent">Table view</summary>
        <TableWrap caption={title}>
          <thead><tr><th scope="col" className={th}>Year</th><th scope="col" className={`${th} text-right`}>Net cash flow</th></tr></thead>
          <tbody>{values.map((v, i) => <tr key={i}><td className={td}>{i + 1}</td><td className={tdNum}>{money(v, false)}</td></tr>)}</tbody>
        </TableWrap>
      </details>
    </figure>
  )
}

export interface TornadoRow { label: string; low: number | null; high: number | null }

/** One-at-a-time sensitivity around the base value. Bars show how far each end of a driver's band moves the metric. */
export function Tornado({ base, rows, format }: { base: number; rows: TornadoRow[]; format: (v: number) => string }) {
  const span = Math.max(1, ...rows.flatMap((r) => [r.low, r.high].filter((v): v is number => v !== null).map((v) => Math.abs(v - base))))
  const pctOf = (v: number) => (Math.abs(v - base) / span) * 50
  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex flex-wrap gap-3 text-xs text-ink-soft">
        <span className="flex items-center gap-1"><span aria-hidden className="inline-block size-2.5 rounded-sm" style={{ background: 'var(--chart-out)' }} />Worse than base</span>
        <span className="flex items-center gap-1"><span aria-hidden className="inline-block size-2.5 rounded-sm" style={{ background: 'var(--chart-in)' }} />Better than base</span>
        <span>Base {format(base)}</span>
      </p>
      <ul className="flex flex-col gap-1">
        {rows.map((r) => {
          const ends = [r.low, r.high].filter((v): v is number => v !== null)
          const worst = Math.min(...ends, base)
          const best = Math.max(...ends, base)
          return (
            <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_4.5rem_minmax(6rem,1.4fr)_4.5rem] items-center gap-2 text-xs">
              <span className="truncate" title={r.label}>{r.label}</span>
              <span className="num text-right text-ink-soft">{format(worst)}</span>
              <span className="relative h-4" role="img" aria-label={`${r.label}: ${format(worst)} to ${format(best)}`}>
                <span className="absolute inset-y-0 left-1/2 w-px bg-line-strong" aria-hidden />
                <span className="absolute inset-y-0.5 rounded-l" style={{ right: '50%', width: `${pctOf(worst)}%`, background: 'var(--chart-out)' }} aria-hidden />
                <span className="absolute inset-y-0.5 rounded-r" style={{ left: '50%', width: `${pctOf(best)}%`, background: 'var(--chart-in)' }} aria-hidden />
              </span>
              <span className="num text-ink-soft">{format(best)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

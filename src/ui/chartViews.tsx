import { useCallback, useId } from 'react'
import type { Series, StackedRow, timeline } from './chartData'
import { TableWrap, td, tdNum, th } from './components'
import { axis, EChart, type EChartsOption, type Tokens } from './EChart'
import { money, pct } from './format'
import type { AffordabilityRow } from '../engine/affordability'
import { AFFORDABLE_SHARE } from '../engine/affordability'

// Every chart in the app, drawn with Apache ECharts on the shared theme (EChart.tsx). Props match the hand-drawn
// versions they replace, so the tables, CSV and SVG downloads around them are unchanged.

/** 'var(--chart-in)' → the token's current value. */
const resolve = (colour: string) => {
  const m = /^var\((--[\w-]+)\)$/.exec(colour)
  return m ? getComputedStyle(document.documentElement).getPropertyValue(m[1]!).trim() || colour : colour
}
const moneyAxis = (t: Tokens) => ({ type: 'value' as const, ...axis(t), axisLabel: { color: t.mute, formatter: (v: number) => money(v) } })
const fmtMoney = (v: unknown) => (typeof v === 'number' ? money(v) : '—')

/** Annual net cash flow, coloured by sign, with a table view. */
export function CashFlowChart({ values, title }: { values: number[]; title: string }) {
  const id = useId()
  const option = useCallback((t: Tokens): EChartsOption => ({
    legend: { show: false },
    grid: { left: 8, right: 16, top: 12, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: fmtMoney },
    xAxis: { type: 'category', data: values.map((_, i) => `Y${i + 1}`), ...axis(t), splitLine: { show: false } },
    yAxis: moneyAxis(t),
    series: [{
      name: 'Net cash flow', type: 'bar', barMaxWidth: 28,
      data: values.map((v) => ({ value: v, itemStyle: { color: v >= 0 ? t.in : t.out, borderRadius: v >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4] } })),
    }],
  }), [values])
  return (
    <figure className="flex flex-col gap-2" aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium">{title}</span>
        <span className="flex items-center gap-3 text-xs text-ink-soft">
          <span className="flex items-center gap-1"><span aria-hidden className="inline-block size-2.5 rounded-sm bg-[var(--chart-in)]" />Net inflow (+)</span>
          <span className="flex items-center gap-1"><span aria-hidden className="inline-block size-2.5 rounded-sm bg-[var(--chart-out)]" />Net outflow (−)</span>
        </span>
      </figcaption>
      <EChart option={option} height={230} label={`${title}. ${values.length} years.`} />
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

/** Diverging stacked bars: sources up, spending down, one money axis. */
export function StackedBars({ series, rows, label }: { series: Series[]; rows: StackedRow[]; label: string }) {
  const option = useCallback((t: Tokens): EChartsOption => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: unknown) => (typeof v === 'number' ? money(Math.abs(v)) : '—') },
    xAxis: { type: 'category', data: rows.map((r) => r.label), ...axis(t), splitLine: { show: false } },
    yAxis: moneyAxis(t),
    series: series.map((s) => ({
      name: `${s.label} (${s.sign > 0 ? 'up' : 'down'})`, type: 'bar', stack: s.sign > 0 ? 'up' : 'down', barMaxWidth: 30,
      itemStyle: { color: resolve(s.colour), borderColor: t.surface, borderWidth: 1 },
      emphasis: { focus: 'series' },
      data: rows.map((r) => s.sign * (r.values[s.id] ?? 0)),
    })),
  }), [series, rows])
  return <EChart option={option} height={300} label={label} />
}

/** Horizontal waterfall: each bucket adds to the running total. */
export function Waterfall({ steps }: { steps: Array<{ label: string; value: number }> }) {
  const option = useCallback((t: Tokens): EChartsOption => {
    const total = steps.reduce((s, x) => s + x.value, 0)
    const starts = steps.map((_, i) => steps.slice(0, i).reduce((s, v) => s + v.value, 0))
    const labels = [...steps.map((s) => s.label), 'Total']
    return {
      legend: { show: false },
      grid: { left: 8, right: 96, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: unknown) => { const i = (p as Array<{ dataIndex: number }>)[0]!.dataIndex; const v = i < steps.length ? steps[i]!.value : total; return `${labels[i]}<br/><b>${money(v)}</b> · ${pct(v / total, 1)} of total` } },
      xAxis: { ...moneyAxis(t) },
      yAxis: { type: 'category', inverse: true, data: labels, ...axis(t), axisLabel: { color: t.soft, fontSize: 11.5 }, splitLine: { show: false } },
      series: [
        { name: 'before', type: 'bar', stack: 'w', silent: true, itemStyle: { color: 'transparent' }, data: [...starts, 0] },
        {
          name: 'Cost', type: 'bar', stack: 'w', barMaxWidth: 18,
          data: [...steps.map((s) => ({ value: s.value, itemStyle: { color: t.out, borderRadius: 3 } })), { value: total, itemStyle: { color: t.mute, borderRadius: 3 } }],
          label: { show: true, position: 'right', color: t.soft, fontSize: 11, formatter: (p: { dataIndex: number; value: number }) => (p.dataIndex < steps.length ? `${money(p.value)} · ${pct(p.value / total, 0)}` : money(p.value)) },
        },
      ],
    }
  }, [steps])
  return <EChart option={option} height={(steps.length + 1) * 30 + 24} label={`Cost build-up to ${money(steps.reduce((s, x) => s + x.value, 0))}.`} />
}

/** Sensitivity heatmap, value written in every cell; colour diverges around the base case (centre cell outlined). */
export function HeatmapChart({ rows, cols, cells, base, format, rowLabel, colLabel }: { rows: string[]; cols: string[]; cells: Array<Array<number | null>>; base: number | null; format: (v: number) => string; rowLabel: string; colLabel: string }) {
  const option = useCallback((t: Tokens): EChartsOption => {
    const values = cells.flat().filter((v): v is number => v !== null)
    const mid = base ?? 0
    const span = Math.max(1e-9, ...values.map((v) => Math.abs(v - mid)))
    const ci = Math.floor(rows.length / 2)
    const cj = Math.floor(cols.length / 2)
    return {
      legend: { show: false },
      grid: { left: 8, right: 8, top: 8, bottom: 40, containLabel: true },
      tooltip: { formatter: (p: { data: [number, number, number | null] }) => `${rowLabel} ${rows[p.data[1]]}, ${colLabel} ${cols[p.data[0]]}<br/><b>${p.data[2] === null ? 'n/a' : format(p.data[2])}</b>` },
      xAxis: { type: 'category', data: cols, name: colLabel, nameLocation: 'middle', nameGap: 26, ...axis(t), splitLine: { show: false } },
      yAxis: { type: 'category', data: rows, inverse: true, ...axis(t), axisLabel: { color: t.mute, formatter: (v: string) => `${rowLabel} ${v}` }, splitLine: { show: false } },
      visualMap: { show: false, min: mid - span, max: mid + span, dimension: 2, inRange: { color: [t.out, t.surface, t.in] } },
      series: [{
        type: 'heatmap',
        data: rows.flatMap((_, i) => cols.map((__, j) => ({ value: [j, i, cells[i]![j] ?? null], itemStyle: i === ci && j === cj ? { borderColor: t.ink, borderWidth: 2 } : { borderColor: t.surface, borderWidth: 3, borderRadius: 4 } }))),
        label: { show: true, color: t.ink, fontSize: 12, formatter: (p: { data: { value: [number, number, number | null] } }) => (p.data.value[2] === null ? 'n/a' : format(p.data.value[2])) },
      }],
    }
  }, [rows, cols, cells, base, format, rowLabel, colLabel])
  return <EChart option={option} height={rows.length * 44 + 60} label={`Sensitivity grid: ${rowLabel} by ${colLabel}. Base case is the centre cell.`} />
}

/** Schedule per building as stacked horizontal segments. */
export function Gantt({ bars }: { bars: ReturnType<typeof timeline> }) {
  const option = useCallback((t: Tokens): EChartsOption => {
    const segs = [...new Map(bars.flatMap((b) => b.segments).map((s) => [s.id, s])).values()]
    return {
      grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
      tooltip: { trigger: 'item', formatter: (p: { seriesName: string; name: string; value: number }) => `${p.name}<br/>${p.seriesName}: <b>${p.value} months</b>` },
      xAxis: { type: 'value', ...axis(t), max: (v: { max: number }) => Math.ceil(v.max / 12) * 12, interval: 12, axisLabel: { color: t.mute, formatter: (m: number) => `Y${(m / 12) + 1}` } },
      yAxis: { type: 'category', inverse: true, data: bars.map((b) => (b.name.length > 26 ? `${b.name.slice(0, 25)}…` : b.name)), ...axis(t), axisLabel: { color: t.soft }, splitLine: { show: false } },
      series: [
        { name: 'offset', type: 'bar', stack: 'g', silent: true, itemStyle: { color: 'transparent' }, data: bars.map((b) => b.start) },
        ...segs.map((s) => ({ name: s.label, type: 'bar', stack: 'g', barMaxWidth: 16, itemStyle: { color: resolve(s.colour), borderColor: t.surface, borderWidth: 1, borderRadius: 2 }, data: bars.map((b) => b.segments.find((x) => x.id === s.id)?.months ?? 0) })),
      ],
      legend: { data: segs.map((s) => s.label) },
    }
  }, [bars])
  return <EChart option={option} height={bars.length * 28 + 60} label={`Schedule of ${bars.length} buildings.`} />
}

/** Small multiples: one horizontal bar chart per metric (each on its own axis). The last row is highlighted. */
export function ScenarioBars({ names, metrics }: { names: string[]; metrics: Array<{ label: string; values: Array<number | null>; format: (v: number) => string }> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {metrics.map((m) => <SmallBars key={m.label} names={names} m={m} />)}
    </div>
  )
}

function SmallBars({ names, m }: { names: string[]; m: { label: string; values: Array<number | null>; format: (v: number) => string } }) {
  const option = useCallback((t: Tokens): EChartsOption => ({
    legend: { show: false },
    title: { text: m.label, left: 0, top: 0, textStyle: { color: t.ink, fontSize: 13, fontWeight: 600, fontFamily: t.font } },
    grid: { left: 8, right: 72, top: 28, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: unknown) => (typeof v === 'number' ? m.format(v) : 'n/a') },
    xAxis: { type: 'value', ...axis(t), axisLabel: { show: false }, splitLine: { show: false } },
    yAxis: { type: 'category', inverse: true, data: names, ...axis(t), axisLabel: { color: t.soft, width: 110, overflow: 'truncate' } },
    series: [{
      type: 'bar', barMaxWidth: 14, name: m.label,
      data: m.values.map((v, i) => ({ value: v ?? 0, itemStyle: { color: v !== null && v < 0 ? t.out : i === names.length - 1 ? t.c3 : t.in, borderRadius: 3 } })),
      label: { show: true, position: 'right', color: t.soft, fontSize: 11, formatter: (p: { dataIndex: number }) => { const v = m.values[p.dataIndex]; return v === null || v === undefined ? 'n/a' : m.format(v) } },
    }],
  }), [names, m])
  return <EChart option={option} height={names.length * 26 + 44} label={`${m.label} by scenario.`} />
}

export interface TornadoRow { label: string; low: number | null; high: number | null }

/** One-at-a-time sensitivity around the base value: how far each end of a driver's band moves the metric. */
export function Tornado({ base, rows, format }: { base: number; rows: TornadoRow[]; format: (v: number) => string }) {
  const option = useCallback((t: Tokens): EChartsOption => {
    const ends = rows.map((r) => [r.low, r.high].filter((v): v is number => v !== null))
    return {
      grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: unknown) => { const i = (p as Array<{ dataIndex: number }>)[0]!.dataIndex; const e = ends[i]!; return `${rows[i]!.label}<br/>${format(Math.min(...e, base))} to ${format(Math.max(...e, base))}<br/><span style="opacity:.7">base ${format(base)}</span>` } },
      xAxis: { type: 'value', ...axis(t), axisLabel: { color: t.mute, formatter: (v: number) => format(base + v) } },
      yAxis: { type: 'category', inverse: true, data: rows.map((r) => r.label), ...axis(t), axisLabel: { color: t.soft, width: 180, overflow: 'truncate' }, splitLine: { show: false } },
      series: [
        { name: 'Worse than base', type: 'bar', stack: 't', barMaxWidth: 14, itemStyle: { color: t.out, borderRadius: [3, 0, 0, 3] }, data: ends.map((e) => Math.min(...e, base) - base) },
        { name: 'Better than base', type: 'bar', stack: 't', barMaxWidth: 14, itemStyle: { color: t.in, borderRadius: [0, 3, 3, 0] }, data: ends.map((e) => Math.max(...e, base) - base) },
      ],
    }
  }, [base, rows, format])
  return <EChart option={option} height={rows.length * 26 + 60} label={`Sensitivity of the result to each driver around a base of ${format(base)}.`} />
}

/** Housing cost as a share of income, by unit type, against the 30% threshold. */
export function AffordabilityChart({ rows, startLabel }: { rows: AffordabilityRow[]; startLabel: string }) {
  const option = useCallback((t: Tokens): EChartsOption => {
    const years = Math.max(0, ...rows.map((r) => r.shares.length))
    const colours = [t.in, t.c3, t.c4, t.out]
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v: unknown) => (typeof v === 'number' ? pct(v, 1) : '—') },
      xAxis: { type: 'category', boundaryGap: false, data: Array.from({ length: years }, (_, k) => (k === 0 ? startLabel : `+${k}`)), ...axis(t), splitLine: { show: false } },
      yAxis: { type: 'value', ...axis(t), min: 0, max: (v: { max: number }) => Math.max(0.45, Math.ceil(v.max * 20) / 20), axisLabel: { color: t.mute, formatter: (v: number) => pct(v, 0) } },
      series: rows.map((r, i) => ({
        name: r.unit, type: 'line', data: r.shares, symbolSize: 7, lineStyle: { width: 2, color: colours[i % colours.length] }, itemStyle: { color: colours[i % colours.length] }, emphasis: { focus: 'series' },
        ...(i === 0 ? { markLine: { silent: true, symbol: 'none', lineStyle: { color: t.bad, type: 'dashed', width: 2 }, label: { formatter: '30% threshold', color: t.bad, fontWeight: 600 }, data: [{ yAxis: AFFORDABLE_SHARE }] } } : {}),
      })),
    }
  }, [rows, startLabel])
  return <EChart option={option} height={300} label="Share of household income spent on housing over time, by unit type, against the 30% threshold." />
}

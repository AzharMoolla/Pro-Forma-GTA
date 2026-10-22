import { useEffect, useRef, useState } from 'react'
import type { ECharts, EChartsCoreOption } from 'echarts/core'

// Apache ECharts (6.1.0, loaded on demand from echartsCore.ts), SVG renderer (crisp in print, and the SVG download
// keeps working). Every chart gets the app's colour tokens for the current theme, so light and dark both use the
// validated palette.

export type Tokens = Record<'font' | 'ink' | 'soft' | 'mute' | 'border' | 'surface' | 'in' | 'out' | 'c3' | 'c4' | 'bad' | 'good' | 'warn' | 'accent', string>
export type EChartsOption = EChartsCoreOption

const VARS: Record<Exclude<keyof Tokens, 'font'>, string> = { ink: '--ink', soft: '--ink-soft', mute: '--ink-mute', border: '--border', surface: '--surface', in: '--chart-in', out: '--chart-out', c3: '--chart-3', c4: '--chart-4', bad: '--bad', good: '--good', warn: '--warn', accent: '--accent' }

function readTokens(el: Element): Tokens {
  const s = getComputedStyle(el)
  return { ...Object.fromEntries(Object.entries(VARS).map(([k, v]) => [k, s.getPropertyValue(v).trim() || '#888'])), font: s.fontFamily } as Tokens
}

/** Re-reads the tokens when the OS colour scheme or the app's data-theme changes. */
function useTokens(ref: React.RefObject<HTMLElement | null>): Tokens | null {
  const [t, setT] = useState<Tokens | null>(null)
  useEffect(() => {
    const read = () => ref.current && setT(readTokens(ref.current))
    read()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', read)
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => { mq.removeEventListener('change', read); mo.disconnect() }
  }, [ref])
  return t
}

/** Shared look: quiet axes and grid, app font, tooltip on the surface colour. */
export function base(t: Tokens): EChartsOption {
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.font, color: t.soft, fontSize: 11 },
    animation: false, // charts are read, printed and screenshotted: always drawn complete
    tooltip: { backgroundColor: t.surface, borderColor: t.border, textStyle: { color: t.ink, fontSize: 12, fontFamily: t.font }, extraCssText: 'box-shadow:0 2px 8px rgba(0,0,0,.12);border-radius:6px;' },
    legend: { top: 0, left: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: t.soft, fontSize: 12, fontFamily: t.font } },
    grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
  }
}

export const axis = (t: Tokens) => ({
  axisLine: { lineStyle: { color: t.border } },
  axisTick: { show: false },
  axisLabel: { color: t.mute, fontSize: 11 },
  splitLine: { lineStyle: { color: t.border } },
})

/** One ECharts chart. `option` is built from the theme tokens; `label` describes it for screen readers. */
export function EChart({ option, height, label }: { option: (t: Tokens) => EChartsOption; height: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const chart = useRef<ECharts | null>(null)
  const [ready, setReady] = useState(false)
  const tokens = useTokens(ref)

  useEffect(() => {
    let ro: ResizeObserver | null = null
    let live = true
    void import('./echartsCore').then(({ init }) => {
      if (!live || !ref.current) return
      const c = init(ref.current)
      chart.current = c
      ro = new ResizeObserver(() => c.resize())
      ro.observe(ref.current)
      setReady(true)
    })
    return () => { live = false; ro?.disconnect(); chart.current?.dispose(); chart.current = null }
  }, [])

  useEffect(() => {
    if (!ready || !tokens || !chart.current) return
    const b = base(tokens) as Record<string, object>
    const o = option(tokens) as Record<string, unknown>
    // Chart settings refine the shared ones (a chart's legend keeps the shared position unless it says otherwise)
    const merged: Record<string, unknown> = { ...b, ...o }
    for (const k of ['textStyle', 'tooltip', 'legend', 'grid']) if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) merged[k] = { ...b[k], ...(o[k] as object) }
    chart.current.setOption({ ...merged, aria: { enabled: true, label: { description: label } } }, { notMerge: true })
  }, [ready, tokens, option, label])

  return <div ref={ref} style={{ height }} className="w-full" role="img" aria-label={`${label} Table view available.`} />
}

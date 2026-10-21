import type { Metric } from '../engine/project'

const cad0 = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })

export function money(v: number | null | undefined, compact = true): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  if (!compact) return cad0.format(v)
  const a = Math.abs(v)
  const sign = v < 0 ? '−' : ''
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(a >= 1e8 ? 0 : 1)}M`
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(a >= 1e5 ? 0 : 1)}k`
  return `${sign}$${a.toFixed(0)}`
}

export const pct = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(digits)}%`

export const num = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : Math.round(v).toLocaleString('en-CA')

export function metricValue(m: Pick<Metric, 'unit' | 'value'> | undefined): string {
  if (!m || m.value === null) return '—'
  switch (m.unit) {
    case 'fraction': return pct(m.value)
    case 'CAD': case 'CAD/yr': return money(m.value)
    case 'CAD/sqft': return `$${m.value.toFixed(0)}/ft²`
    case 'ratio': return `${m.value.toFixed(2)}×`
    case 'sqft': return `${num(m.value)} ft²`
    default: return num(m.value)
  }
}

export const monthLabel = (m: number) => `M${m} · Y${Math.floor(m / 12) + 1}`

// Charts pinned to the report: kept with the project (so locked scenarios and the cloud copy keep them), and a
// context that tells a chart it is being drawn inside the report.

import { createContext, useContext } from 'react'
import type { Attributes } from '../engine/catalogue'

export const PIN_KEY = 'report.charts'
/** Pinned until the user changes them: the money over time, what drives cost, and the schedule. */
export const DEFAULT_PINS = ['funding', 'costs', 'timeline']

export function pinnedOf(attributes: Attributes): string[] {
  if (attributes[PIN_KEY] === undefined || attributes[PIN_KEY] === null) return DEFAULT_PINS
  try {
    const v = JSON.parse(String(attributes[PIN_KEY])) as unknown
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : DEFAULT_PINS
  } catch {
    return DEFAULT_PINS
  }
}

export const togglePin = (pins: string[], id: string) => JSON.stringify(pins.includes(id) ? pins.filter((p) => p !== id) : [...pins, id])

/** Inside the report: only pinned charts draw, without their buttons, and each hands its data to the workbook. */
export interface ReportCharts { only: Set<string>; collect: (id: string, title: string, csv: string) => void }
export const ReportChartsContext = createContext<ReportCharts | null>(null)
export const useReportCharts = () => useContext(ReportChartsContext)

/** Parse the charts' own CSV (quoted fields, numbers as numbers) for a workbook sheet. */
export function fromCsv(csv: string): Array<Array<string | number | null>> {
  return csv.split('\n').map((line) => {
    const cells: string[] = []
    let cur = '', quoted = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ } else if (ch === '"') quoted = false
        else cur += ch
      } else if (ch === '"') quoted = true
      else if (ch === ',') { cells.push(cur); cur = '' } else cur += ch
    }
    cells.push(cur)
    return cells.map((c) => (c === '' ? null : /^-?\d+(\.\d+)?$/.test(c) ? Number(c) : c.replace(/^'(?=[=+\-@])/, '')))
  })
}

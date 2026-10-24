// A blank project: no figures from any mock. Every cost the project type needs is listed as "not yet estimated"
// (so results are withheld, never optimistic), there is no revenue until a stream is added, and no loan until one is
// set. The schedule needs whole months to run, so it starts at stated placeholders for the user to replace.

import { checklist, type Catalogue, type CatalogueItem } from '../engine/catalogue'
import type { CostLine, Timing } from '../engine/costs'
import type { ProjectInput } from '../engine/project'

/** Drivers that are costs the user estimates (revenue, ledger and schedule items are carried elsewhere). */
const COST_DRIVERS = new Set(['lumpSum', 'perArea', 'percentOf', 'rate', 'perMonth', 'perUnit', 'perHectare', 'perLinear', 'perVolume', 'schedule', 'indexed'])

/** When a catalogue item is paid, by its timing note. */
export function timingOf(item: CatalogueItem): Timing {
  const t = String((item as { timing?: unknown }).timing ?? '')
  if (/construction/.test(t)) return { kind: 'construction' }
  if (/operations|sales/.test(t)) return { kind: 'completion' }
  if (/building permit|before construction|before demolition/.test(t)) return { kind: 'constructionStart' }
  return { kind: 'month', month: 0 }
}

export const BLANK_SCHEDULE = { preConstructionMonths: 12, constructionMonths: 24, exitMonth: 60 }

export function blankProject(catalogue: Catalogue, projectType: string, id: string, name: string): ProjectInput {
  const items = checklist(catalogue, projectType, {}).stages.flatMap((s) => s.entries).filter((e) => e.status === 'applies' && COST_DRIVERS.has(String(e.item.driver)))
  const costLines: CostLine[] = [
    { id: 'land', label: 'Land price', catalogueId: 'land-price', driver: null, timing: { kind: 'month', month: 0 }, estimateClass: 'C' },
    ...items.filter((e) => e.item.id !== 'land-price').map((e): CostLine => ({ id: e.item.id, label: e.item.label, catalogueId: e.item.id, driver: null, timing: timingOf(e.item), estimateClass: 'C' })),
  ]
  return {
    id, name,
    program: { lotAreaSqft: null, planningGfaSqft: null, gcaAboveSqft: 0, gcaBelowSqft: 0 },
    timing: { ...BLANK_SCHEDULE },
    costLines,
    costEscalation: 0,
    components: [],
    // No loan until one is set: all-equity is a real, neutral starting point, not an invented rate
    debt: { annualRate: 0, ltc: 0, ltv: 0, dscr: 1.2, amortizationYears: 25 },
    exit: { sellingCostFraction: 0 },
    discountRate: 0.08,
  }
}

// R5 (ASSESSMENT-2026-10-21): model completeness, scope completeness and source review are separate questions.
import { describe, expect, it } from 'vitest'
import { validateCostLines, type CostLine } from '../../src/engine/costs'
import { runProject } from '../../src/engine/project'
import mockAJson from '../../data/projects/mock-a-toronto-mixed-use.json'
import { coverage, readiness } from '../../src/ui/coverage'
import type { ProjectInput } from '../../src/engine/project'
import { tinyProject } from './fixtures'

const mockA = mockAJson.input as ProjectInput

describe('readiness', () => {
  it('coverage notes become excluded, gap, or stale when the line they name is gone', () => {
    const notes = mockAJson.coverage as Record<string, string>
    const entries = coverage(mockAJson.projectType, mockAJson.attributes as never, mockA, notes)
    const status = (id: string) => entries.find((e) => e.item.id === id)?.status
    const excluded = Object.keys(notes).find((k) => notes[k]!.startsWith('excluded:') && entries.some((e) => e.item.id === k))!
    const gap = Object.keys(notes).find((k) => notes[k]!.startsWith('gap:') && entries.some((e) => e.item.id === k))!
    expect(status(excluded)).toBe('excluded')
    expect(status(gap)).toBe('gap')
    expect(status('site-plan-securities')).toBe('covered') // "line: letters-of-credit" and that line exists
    const without = { ...mockA, costLines: mockA.costLines.filter((l) => l.id !== 'letters-of-credit') }
    const after = coverage(mockAJson.projectType, mockAJson.attributes as never, without, notes)
    expect(after.find((e) => e.item.id === 'site-plan-securities')!.status).toBe('stale')
  })

  it('the three answers are independent: a model can calculate yet have scope gaps and no reviewed sources', () => {
    const entries = coverage(mockAJson.projectType, mockAJson.attributes as never, mockA, mockAJson.coverage)
    const r = readiness(entries, mockA, [], '2026-10-21')
    expect(r.model.complete).toBe(true)
    expect(r.scope.counts.gap).toBeGreaterThan(0)
    expect(r.scope.complete).toBe(true) // gaps are named, nothing is unaccounted
    expect(r.sources).toMatchObject({ lines: mockA.costLines.length, sourced: 3, reviewed: 0 }) // the three Toronto DC lines cite the City schedule; nobody has reviewed them yet
  })

  it('counts sourced, reviewed, old and undated lines; synthetic is never "sourced"', () => {
    const p = tinyProject()
    const [land, hard] = p.costLines as [CostLine, CostLine]
    const lines: CostLine[] = [
      { ...land, source: { kind: 'quote', ref: 'Q-12', valueDate: '2025-01-15', reviewed: { by: 'cost consultant', at: '2026-10-01' } } },
      { ...hard, source: { kind: 'benchmark' } },
      { ...hard, id: 'demo', source: { kind: 'synthetic' } },
    ]
    const r = readiness([], { ...p, costLines: lines }, [], '2026-10-21')
    expect(r.sources).toEqual({ lines: 3, sourced: 2, reviewed: 1, synthetic: 1, old: [land.label], undated: 1 })
  })

  it('source dates and reviewers are validated', () => {
    const [land] = tinyProject().costLines as [CostLine]
    expect(validateCostLines([{ ...land, source: { kind: 'quote', valueDate: '15/01/2025' } }]).join()).toMatch(/valueDate must be YYYY-MM-DD/)
    expect(validateCostLines([{ ...land, source: { kind: 'quote', reviewed: { by: ' ', at: '2026-10-01' } } }]).join()).toMatch(/name the reviewer/)
  })

  it('a gross refinance loan shown alongside unknown costs says net proceeds are withheld', () => {
    const p = tinyProject({ debt: { ...tinyProject().debt, refinance: { month: 3, annualRate: 0, amortizationYears: 10, dscr: 1.2, ltv: 0.45, feeFraction: 0.01 } } })
    const unknown = { ...p, costLines: [...p.costLines, { id: 'unknown-fee', label: 'Unknown fee', driver: null, timing: { kind: 'month' as const, month: 0 }, estimateClass: 'C' as const }] }
    const m = runProject(unknown).metrics.permanentLoan!
    expect(m.value).not.toBeNull()
    expect(m.warnings.join()).toMatch(/Net proceeds to equity/)
    expect(runProject(p).metrics.permanentLoan!.warnings.join()).not.toMatch(/Net proceeds/)
  })
})

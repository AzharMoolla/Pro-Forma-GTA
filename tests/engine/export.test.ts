import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import catalogueJson from '../../data/costs/catalogue.json'
import mockAJson from '../../data/projects/mock-a-toronto-mixed-use.json'
import { mockB } from '../../data/projects/mock-b-durham-master-plan'
import type { Catalogue } from '../../src/engine/catalogue'
import { runNode, type Node } from '../../src/engine/portfolio'
import { simulate } from '../../src/engine/uncertainty'
import { flatten, workbookSheets } from '../../src/export/workbook'
import { xlsx } from '../../src/export/xlsx'
import { equityByYear, fundingByYear, sensitivityGrid, timeline, toCsv } from '../../src/ui/chartData'
import { stress } from '../../src/engine/stress'
import { tinyProject } from './fixtures'

const mockA = mockAJson.input as Node

describe('xlsx export', () => {
  const input = {
    projectName: 'Mock A', projectType: 'rental-highrise', draft: mockA, result: runNode(mockA), catalogue: catalogueJson as unknown as Catalogue,
    attributes: { ...mockAJson.attributes, 'phase-1|zoning.heightLimitStoreys': 12, 'location.sources': JSON.stringify({ 'zoning.code': { value: 'CR 5.0 (c4.0; r3.0) SS2  (x2507)', layer: 'Toronto zoning areas', url: 'https://open.toronto.ca/dataset/zoning-by-law/', retrievedAt: '2026-10-21' } }) },
    coverage: [{ item: { id: 'x', label: '=HYPERLINK("http://evil")', stage: 's0', src: 'S' }, status: 'unaccounted', note: '<b>&' }],
    readiness: { model: 'Model: calculates', scope: 'Scope: 8 known gaps', sources: 'Sources: 0/100 reviewed' },
    insights: [], tracker: { stages: [], current: null, done: 0, total: 0, budget: 0, actual: { known: 0, unknown: 0 }, forecast: { known: 0, unknown: 0 } },
    scenarios: [], draftParentId: null, dataContext: { catalogue: '0.1.0' }, exportedAt: '2026-10-21T00:00:00Z', synthetic: true,
  }
  const files = unzipSync(xlsx(workbookSheets(input)))
  const text = (name: string) => strFromU8(files[name]!)

  it('is a valid OOXML package with one worksheet per sheet', () => {
    expect(Object.keys(files)).toEqual(expect.arrayContaining(['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet1.xml']))
    const names = [...text('xl/workbook.xml').matchAll(/<sheet name="([^"]+)"/g)].map((m) => m[1])
    expect(names).toEqual(['Summary', 'Inputs', 'Cost lines', 'Ledger (monthly)', 'Site &amp; policy', 'Checklist', 'Tracker', 'Analysis', 'Scenarios', 'Licences &amp; notes'])
  })

  it('text is inline strings (never formulas) and is escaped', () => {
    const checklist = text('xl/worksheets/sheet6.xml')
    expect(checklist).not.toContain('<f>')
    expect(checklist).toContain('=HYPERLINK(&quot;http://evil&quot;)')
    expect(checklist).toContain('&lt;b&gt;&amp;')
  })

  it('keeps map provenance and scoped values, and labels synthetic data', () => {
    const site = text('xl/worksheets/sheet5.xml')
    expect(site).toContain('Toronto zoning areas')
    expect(site).toContain('phase-1')
    expect(text('xl/worksheets/sheet1.xml')).toContain('SYNTHETIC demo figures')
  })

  it('a ledger row per month; unknown metrics stay blank, not zero', () => {
    const ledger = text('xl/worksheets/sheet4.xml')
    expect((ledger.match(/<row /g) ?? []).length).toBe(runNode(mockA).project!.ledger.length + 1)
    const incomplete = workbookSheets({ ...input, result: runNode({ ...tinyProject(), costLines: [...tinyProject().costLines, { id: 'u', label: 'Unknown', driver: null, timing: { kind: 'month', month: 0 }, estimateClass: 'C' }] }) })
    const tdc = incomplete[0]!.rows.find((r) => String(r[0]).startsWith('Total development cost'))!
    expect(tdc[1]).toBeNull()
    expect(String(tdc[2])).toMatch(/withheld: u/)
  })

  it('flattens inputs to paths, arrays of objects keyed by id', () => {
    expect(flatten({ debt: { ltc: 0.6 }, components: [{ id: 'r', exitCapRate: 0.05 }] })).toEqual([['debt.ltc', 0.6], ['components.r.id', 'r'], ['components.r.exitCapRate', 0.05]])
  })
})

describe('chart data', () => {
  it('funding by year: equity, loans and income above, costs below; totals match the ledger', () => {
    const r = runNode(mockA).project!
    const f = fundingByYear(r)
    const sum = (id: string) => f.rows.reduce((s, x) => s + (x.values[id] ?? 0), 0)
    expect(sum('costs')).toBeCloseTo(r.ledger.reduce((s, x) => s + x.totalCost, 0), 2)
    expect(sum('equity')).toBeCloseTo(r.ledger.reduce((s, x) => s + x.equityDraw, 0), 2)
    expect(f.rows).toHaveLength(Math.ceil(r.ledger.length / 12))
  })

  it('equity by year for a master plan splits calls and distributions', () => {
    const r = runNode(mockB)
    const e = equityByYear(r)
    const net = e.rows.reduce((s, x) => s + (x.values.distributions ?? 0) - (x.values.calls ?? 0), 0)
    expect(net).toBeCloseTo(r.equityCashFlow.reduce((s, v) => s + v, 0), 0)
  })

  it('sensitivity grid: centre equals the base case; more revenue and lower caps raise profit on cost', () => {
    const g = sensitivityGrid(mockA, 'profitOnCost')
    expect(g.cells[2]![2]).toBeCloseTo(runNode(mockA).metrics.profitOnCost!.value!, 10)
    expect(g.cells[4]![2]!).toBeGreaterThan(g.cells[0]![2]!)
    expect(g.cells[2]![0]!).toBeGreaterThan(g.cells[2]![4]!)
    expect(stress(tinyProject(), { revenue: 1, capBps: 0 })).toEqual(tinyProject())
  })

  it('timeline covers every month to exit and follows plan offsets', () => {
    const [bar] = timeline(mockA)
    expect(bar!.segments.reduce((s, x) => s + x.months, 0)).toBe((mockA as { timing: { exitMonth: number } }).timing.exitMonth + 1)
    const plan = timeline(mockB)
    expect(plan.length).toBeGreaterThan(3)
    expect(Math.max(...plan.map((b) => b.start))).toBeGreaterThan(0)
  })

  it('CSV quotes and neutralizes formula injection', () => {
    expect(toCsv(['a', 'b'], [['=1+1', 'x,"y"'], [-5, null]])).toBe(`a,b\n'=1+1,"x,""y"""\n-5,`)
  })
})

describe('simulation outputs (R8)', () => {
  it('reports valid draws and the share below zero, conditional on the bands', () => {
    const s = simulate(tinyProject(), { draws: 200, seed: 7, metrics: ['profit', 'leveredIrr'] })
    expect(s.metrics.profit!.valid + s.metrics.profit!.unavailable).toBe(200)
    expect(s.metrics.profit!.shareBelowZero).toBeGreaterThanOrEqual(0)
    expect(s.metrics.profit!.shareBelowZero).toBeLessThanOrEqual(1)
  })
})

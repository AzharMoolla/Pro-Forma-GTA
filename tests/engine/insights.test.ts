import { describe, expect, it } from 'vitest'
import catalogueJson from '../../data/costs/catalogue.json'
import mockAJson from '../../data/projects/mock-a-toronto-mixed-use.json'
import type { Catalogue } from '../../src/engine/catalogue'
import { analyze, costItems, type CostItem } from '../../src/engine/insights'
import { runNode } from '../../src/engine/portfolio'
import type { ProjectInput } from '../../src/engine/project'

const stage = new Map((catalogueJson as unknown as Catalogue).items.map((i) => [i.id, i.stage]))
const stageOf = (id?: string) => (id ? stage.get(id) : undefined)
const item = (bucket: CostItem['bucket'], total: number, label: string = bucket): CostItem => ({ key: label, label, bucket, total, where: 'test' })

describe('insights', () => {
  it('buckets every dollar of Mock A and the shares sum to 1', () => {
    const node = mockAJson.input as ProjectInput
    const r = runNode(node)
    const items = costItems(node, r, stageOf)
    const a = analyze({ items, metrics: r.metrics, isMasterPlan: false })
    expect(a.buckets.reduce((s, b) => s + b.share, 0)).toBeCloseTo(1, 10)
    // bucket total = TDC: every cost line + component costs + all interest (TDC counts capitalized interest only)
    const ledger = r.project!.ledger
    const expected = ledger.reduce((s, row) => s + row.totalCost + row.interest + row.permInterest + row.refinanceFee, 0)
    expect(a.total).toBeCloseTo(expected, 2)
    expect(a.buckets.map((b) => b.id)).toEqual(expect.arrayContaining(['acquisition', 'construction', 'financing', 'site']))
  })

  it('flags land-heavy budgets as a concern and names the driver', () => {
    // 75 of 100 on land
    const a = analyze({ items: [item('acquisition', 75, 'Land'), item('construction', 25)], metrics: {}, isMasterPlan: false })
    const land = a.insights.find((i) => i.id === 'land-heavy')!
    expect(land.severity).toBe('concern')
    expect(land.title).toContain('75%')
    expect(land.drivers[0]).toContain('Land')
    expect(a.buckets.find((b) => b.id === 'acquisition')!.severity).toBe('concern')
  })

  it('reads returns: negative margin, negative spread, negative leverage, equity loss', () => {
    const a = analyze({
      items: [item('acquisition', 20), item('construction', 80)],
      metrics: { profitOnCost: { value: -0.05 }, yieldOnCost: { value: 0.04 }, forwardNoi: { value: 5 }, exitValue: { value: 100 }, leveredIrr: { value: -0.03 }, unleveredIrr: { value: 0.02 }, equityMultiple: { value: 0.8 } },
      isMasterPlan: false,
    })
    const ids = a.insights.map((i) => i.id)
    expect(ids).toEqual(expect.arrayContaining(['margin-negative', 'spread-negative', 'negative-leverage', 'equity-loss']))
    expect(a.insights[0]!.severity).toBe('concern') // sorted worst first
  })

  it('recognizes a healthy deal', () => {
    const a = analyze({
      items: [item('acquisition', 20), item('construction', 60), item('soft', 10), item('financing', 10)],
      metrics: { profitOnCost: { value: 0.22 }, yieldOnCost: { value: 0.065 }, forwardNoi: { value: 4.5 }, exitValue: { value: 100 } },
      isMasterPlan: false,
    })
    expect(a.insights.filter((i) => i.severity === 'good').map((i) => i.id)).toEqual(expect.arrayContaining(['margin-ok', 'spread-ok']))
    expect(a.insights.some((i) => i.severity === 'concern')).toBe(false)
  })

  it('uses the simulated range and completeness', () => {
    const a = analyze({ items: [item('construction', 1)], metrics: {}, isMasterPlan: false, range: { p10Profit: -5e6, p50Profit: 2e6 }, unaccountedItems: 3 })
    expect(a.insights.map((i) => i.id)).toEqual(expect.arrayContaining(['range-loss-tail', 'unaccounted']))
  })
})

import { describe, expect, it } from 'vitest'
import type { CatalogueItem } from '../../src/engine/catalogue'
import { isPortfolio, runNode, type PortfolioInput } from '../../src/engine/portfolio'
import { addBuilding, buildTracker, defaultTiming, lineFromActual, lineFromItem, removeNode, taskKey, validateReceipt } from '../../src/tracker/tracker'
import { tinyProject } from './fixtures'

const item = (id: string, stage: string): CatalogueItem => ({ id, stage, label: id, types: 'all', driver: 'lumpSum', class: 'B', timing: '', src: 'Q' })
const stages = [{ id: 's1', label: 'Land' }, { id: 's2', label: 'Studies' }, { id: 's7', label: 'Build' }]

describe('tracker', () => {
  const entries = [
    { item: item('land-price', 's1'), status: 'line' as const, note: '' },
    { item: item('survey', 's1'), status: 'covered' as const, note: 'in legal' },
    { item: item('geotech', 's2'), status: 'unaccounted' as const, note: '' },
    { item: item('pool', 's7'), status: 'to-confirm' as const, note: '' },
  ]

  it('groups tasks by stage, skips to-confirm items, and finds the current stage', () => {
    const v = buildTracker({ scope: [], stages, entries, budgets: new Map([['land-price', 50_000]]), state: {} })
    expect(v.stages.map((s) => [s.id, s.total])).toEqual([['s1', 2], ['s2', 1]])
    expect(v.current).toBe('s1')
    expect(v.stages[0]!.tasks.map((t) => t.inModel)).toEqual(['line', 'covered'])
    expect(v.budget).toBe(50_000)
  })

  it('advances when a stage is done or not applicable, and sums actuals', () => {
    const state = {
      [taskKey([], 'land-price')]: { status: 'done' as const, actual: 52_000, receipts: [], notes: '' },
      [taskKey([], 'survey')]: { status: 'not-applicable' as const, actual: null, receipts: [], notes: '' },
    }
    const v = buildTracker({ scope: [], stages, entries, budgets: new Map([['land-price', 50_000]]), state })
    expect(v.stages[0]!.complete).toBe(true)
    expect(v.current).toBe('s2')
    expect(v.actual).toEqual({ known: 52_000, unknown: 0 })
    expect(v.done).toBe(2)
  })

  it('keeps unknown actuals and forecasts visible instead of counting them as zero', () => {
    const budgets = new Map([['land-price', 50_000], ['geotech', 20_000]])
    const state = {
      [taskKey([], 'land-price')]: { status: 'done' as const, actual: null, receipts: [], notes: '' }, // finished, spend not recorded
      [taskKey([], 'geotech')]: { status: 'in-progress' as const, actual: 5_000, receipts: [], notes: '' }, // partial invoice
    }
    const v = buildTracker({ scope: [], stages, entries, budgets, state })
    expect(v.actual).toEqual({ known: 5_000, unknown: 1 })
    // land: done, unknown · survey: open, no budget → unknown · geotech: open, max(20,000, 5,000)
    expect(v.forecast).toEqual({ known: 20_000, unknown: 2 })
    const over = buildTracker({ scope: [], stages, entries, budgets, state: { [taskKey([], 'geotech')]: { status: 'in-progress' as const, actual: 26_000, receipts: [], notes: '' } } })
    expect(over.stages[1]!.forecast).toEqual({ known: 26_000, unknown: 0 })
  })

  it('scopes keys by building so two buildings track separately', () => {
    expect(taskKey(['phase-1', 'block-a'], 'building-permit')).toBe('phase-1/block-a|building-permit')
    expect(taskKey([], 'building-permit')).not.toBe(taskKey(['block-b'], 'building-permit'))
  })

  it('a final actual replaces the estimate as an exact lump sum that is not escalated again', () => {
    const land = { ...tinyProject().costLines.find((l) => l.id === 'hard')!, escalate: true }
    const updated = lineFromActual(land, 104_500)
    expect(updated).toMatchObject({ driver: { kind: 'lumpSum', amount: 104_500 }, estimateClass: 'exact', timing: land.timing, escalate: false })
  })

  it('adds a missing item to the model with stage-appropriate timing and a unique id', () => {
    const p = tinyProject()
    const line = lineFromItem(item('hard', 's2'), 12_000, p, new Set(p.costLines.map((l) => l.id)))
    expect(line.id).toBe('hard-2')
    expect(line.timing).toEqual({ kind: 'month', month: 0 }) // no pre-construction months in the tiny project
    expect(defaultTiming('s4', p)).toEqual({ kind: 'constructionStart' })
    expect(defaultTiming('s7', p)).toEqual({ kind: 'construction' })
    expect(defaultTiming('s7', { id: 'mp', name: 'MP', discountRate: 0.1, costEscalation: 0, costLines: [], children: [] })).toEqual({ kind: 'month', month: 0 })
  })

  it('validates receipts', () => {
    expect(validateReceipt({ name: 'r.pdf', type: 'application/pdf', size: 1000 })).toBeNull()
    expect(validateReceipt({ name: 'r.exe', type: 'application/x-msdownload', size: 1000 })).toMatch(/only PDF/)
    expect(validateReceipt({ name: 'big.pdf', type: 'application/pdf', size: 16 * 1024 * 1024 })).toMatch(/15 MB/)
  })
})

describe('plan changes', () => {
  it('adding a building to a single project turns it into a two-building plan that still runs', () => {
    const p = tinyProject()
    const { root, path } = addBuilding(p, [], 6)
    expect(isPortfolio(root)).toBe(true)
    expect((root as PortfolioInput).children.map((c) => [c.node.id, c.offsetMonths])).toEqual([['tiny', 0], ['tiny-copy', 6]])
    expect(path).toEqual(['tiny-copy'])
    const r = runNode(root)
    expect(r.metrics.totalUnits!.value).toBe(4)
  })

  it('duplicates a building inside a phase with unique ids, and removes it again', () => {
    const plan: PortfolioInput = { id: 'mp', name: 'MP', discountRate: 0.1, costEscalation: 0, costLines: [], children: [{ offsetMonths: 0, node: { id: 'p1', name: 'Phase 1', discountRate: 0.1, costEscalation: 0, costLines: [], children: [{ offsetMonths: 3, node: tinyProject({ id: 'a', name: 'A' }) }] } }] }
    const once = addBuilding(plan, ['p1', 'a'], 12)
    const twice = addBuilding(once.root, ['p1', 'a'], 12)
    expect(twice.path).toEqual(['p1', 'a-copy-2'])
    const phase = (twice.root as PortfolioInput).children[0]!.node as PortfolioInput
    expect(phase.children.map((c) => [c.node.id, c.offsetMonths])).toEqual([['a', 3], ['a-copy', 15], ['a-copy-2', 15]])
    const back = removeNode(twice.root, ['p1', 'a-copy'])
    expect(((back as PortfolioInput).children[0]!.node as PortfolioInput).children).toHaveLength(2)
    expect(() => removeNode(plan, ['p1', 'a'])).toThrow(/at least one/)
    expect(() => removeNode(plan, [])).toThrow(/cannot be removed/)
  })
})

import { describe, expect, it } from 'vitest'
import { mockB } from '../../data/projects/mock-b-durham-master-plan'
import { isPortfolio, runNode, type PortfolioInput } from '../../src/engine/portfolio'
import { addPhase, isPhased, makePhased, moveBuilding, overlaps, rename, schedule, setOffset, stagger } from '../../src/tracker/phasing'
import { tinyProject } from './fixtures'

const plan = mockB as PortfolioInput
const phaseIds = (p: PortfolioInput) => p.children.map((c) => c.node.id)

describe('phasing plan', () => {
  it('schedule: absolute starts add up phase and building offsets; construction follows pre-construction', () => {
    const rows = schedule(plan)
    const p1 = plan.children[0]!
    const first = (p1.node as PortfolioInput).children[0]!
    const row = rows.find((r) => r.path.join('/') === `${p1.node.id}/${first.node.id}`)!
    expect(row.start).toBe(p1.offsetMonths + first.offsetMonths)
    if (!isPortfolio(first.node)) expect(row.constructionStart).toBe(row.start + first.node.timing.preConstructionMonths)
  })
  it('a single building becomes Phase 1 of a plan, with the same results', () => {
    const one = tinyProject()
    const phased = makePhased(one)
    expect(isPhased(phased)).toBe(true)
    expect(runNode(phased).metrics.profit?.value).toBe(runNode(one).metrics.profit?.value)
  })
  it('moving a phase start moves its cash flows; adding and spacing phases', () => {
    const later = setOffset(plan, [plan.children[2]!.node.id], plan.children[2]!.offsetMonths + 24) as PortfolioInput
    expect(runNode(later).projectCashFlow.length).toBe(runNode(plan).projectCashFlow.length + 24)
    const { root, path } = addPhase(plan, 140)
    expect(root.children).toHaveLength(4)
    expect(root.children[3]!.offsetMonths).toBe(140)
    expect(() => runNode(root)).not.toThrow()
    expect(path[0]).toBe(root.children[3]!.node.id)
    expect((stagger(root, 12) as PortfolioInput).children.map((c) => c.offsetMonths)).toEqual([0, 12, 24, 36])
    expect(() => setOffset(plan, [plan.children[0]!.node.id], -1)).toThrow()
  })
  it('a building moves between phases; a phase keeps at least one building', () => {
    const [a, b] = phaseIds(plan) as [string, string]
    const firstA = (plan.children[0]!.node as PortfolioInput).children[0]!.node.id
    const moved = moveBuilding(plan, [a, firstA], b) as PortfolioInput
    expect((moved.children[1]!.node as PortfolioInput).children.map((c) => c.node.id)).toContain(firstA)
    expect((moved.children[0]!.node as PortfolioInput).children.map((c) => c.node.id)).not.toContain(firstA)
    const single = stagger(makePhased(tinyProject()), 0)
    const { root } = addPhase(single, 0)
    const [p1, p2] = phaseIds(root) as [string, string]
    expect(() => moveBuilding(root, [p1, (root.children[0]!.node as PortfolioInput).children[0]!.node.id], p2)).toThrow(/at least one/)
    expect(() => rename(plan, [a], '  ')).toThrow()
  })
  it('flags phases that build at the same time, and stops flagging once spaced apart', () => {
    expect(overlaps(stagger(plan, 0)).length).toBeGreaterThan(0)
    expect(overlaps(stagger(plan, 200))).toEqual([])
  })
})

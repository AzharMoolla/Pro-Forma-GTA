import { describe, expect, it } from 'vitest'
import mockAJson from '../../data/projects/mock-a-toronto-mixed-use.json'
import { applyAssumptions, listAssumptions, modelOf, offSet, OFF_KEY } from '../../src/engine/assumptions'
import { runNode, type Node } from '../../src/engine/portfolio'
import type { ProjectInput } from '../../src/engine/project'

const mockA = mockAJson.input as unknown as ProjectInput

describe('assumptions register', () => {
  it('lists growth, rule-of-thumb lines, conventions and analysis settings', () => {
    const list = listAssumptions(mockA, new Set())
    const ids = list.map((a) => a.id)
    expect(ids).toEqual(expect.arrayContaining(['escalation', 'rentGrowth', 'opexInflation', 'line:construction-contingency', 'line:parkland-cil', 'conv-funding', 'an-downside']))
    expect(list.every((a) => a.on)).toBe(true)
    expect(list.find((a) => a.id === 'line:toronto-mltt')!.toVerify).toBe(true)
    // Quotes and plain lump sums are not rule-of-thumb lines
    expect(ids).not.toContain('line:land-price')
    expect(ids).not.toContain('line:hard-benchmark')
  })

  it('is the identity with nothing off, and leaves the stored draft untouched', () => {
    expect(applyAssumptions(mockA, new Set())).toBe(mockA)
    const before = JSON.stringify(mockA)
    applyAssumptions(mockA, new Set(['escalation', 'line:construction-contingency']))
    expect(JSON.stringify(mockA)).toBe(before)
  })

  it('switching off growth and a contingency changes the results the way it says', () => {
    const base = runNode(mockA).metrics
    const noEsc = runNode(applyAssumptions(mockA, new Set(['escalation']))).metrics
    expect(noEsc.totalDevelopmentCost!.value!).toBeLessThan(base.totalDevelopmentCost!.value!)
    const noRent = runNode(applyAssumptions(mockA, new Set(['rentGrowth']))).metrics
    expect(noRent.exitValue!.value!).toBeLessThan(base.exitValue!.value!)
    const off = applyAssumptions(mockA, new Set(['line:construction-contingency'])) as ProjectInput
    const line = off.costLines.find((l) => l.id === 'construction-contingency')!
    expect(line.driver).toMatchObject({ kind: 'percentOf', rate: 0 })
    // Removing a 5% contingency of the hard costs lowers TDC by more than zero and less than 5% of TDC
    const tdc = runNode(off).metrics.totalDevelopmentCost!.value!
    expect(tdc).toBeLessThan(base.totalDevelopmentCost!.value!)
    expect(base.totalDevelopmentCost!.value! - tdc).toBeLessThan(0.05 * base.totalDevelopmentCost!.value!)
  })

  it('switches travel with the project variables (so locked scenarios re-run the same)', () => {
    const attributes = { [OFF_KEY]: JSON.stringify(['escalation']) }
    expect([...offSet(attributes)]).toEqual(['escalation'])
    expect((modelOf(mockA, attributes) as ProjectInput).costEscalation).toBe(0)
    expect(modelOf(mockA, null)).toBe(mockA)
    expect(offSet({ [OFF_KEY]: 'not json' }).size).toBe(0)
  })

  it('applies to every building in a plan', () => {
    const plan: Node = { id: 'plan', name: 'Plan', discountRate: 0.08, costEscalation: 0.03, costLines: [], children: [{ offsetMonths: 0, node: mockA }, { offsetMonths: 12, node: { ...mockA, id: 'b' } }] }
    const off = applyAssumptions(plan, new Set(['escalation'])) as Extract<Node, { children: unknown }>
    expect(off.costEscalation).toBe(0)
    expect(off.children.every((c) => (c.node as ProjectInput).costEscalation === 0)).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import mockAJson from '../../data/projects/mock-a-toronto-mixed-use.json'
import { runNode, type Node } from '../../src/engine/portfolio'
import { runProject, type ProjectInput } from '../../src/engine/project'
import { siteInsights, type SiteFacts } from '../../src/engine/insights'
import { applyRezoning, hasRezoning, REZONING_DEFAULTS, rezoneProject } from '../../src/scenario/rezoning'

const mockA = mockAJson.input as ProjectInput

describe('modelling a rezoning', () => {
  const r = rezoneProject(mockA, REZONING_DEFAULTS)

  it('pushes the schedule out, extends carrying costs, adds the application costs once', () => {
    expect(r.timing.preConstructionMonths).toBe(mockA.timing.preConstructionMonths + 18)
    expect(r.timing.exitMonth).toBe(mockA.timing.exitMonth + 18)
    expect(r.debt.refinance?.month).toBe(mockA.debt.refinance!.month + 18)
    const line = (n: ProjectInput, id: string) => n.costLines.find((l) => l.id === id)!
    expect(line(r, 'holding-tax').timing).toEqual({ kind: 'spread', from: 0, to: 36 }) // was 0–18
    expect(line(r, 'planning-justification').timing).toEqual({ kind: 'spread', from: 19, to: 26 }) // was 1–8
    expect(line(r, 'land-price').timing).toEqual(line(mockA, 'land-price').timing) // month 0 stays
    expect(r.costLines.filter((l) => l.catalogueId === 'fee-zba')).toHaveLength(1) // Mock A already has one: kept, not duplicated
    expect(line(r, 'rezoning-studies')).toMatchObject({ estimateClass: 'D', source: { kind: 'estimate' } })
    expect(hasRezoning(r)).toBe(true)
    expect(rezoneProject(r, REZONING_DEFAULTS)).toBe(r) // idempotent
  })

  it('moves the money: more cost, cash flows later (IRR direction depends on rent growth vs cost escalation)', () => {
    const before = runProject(mockA)
    const after = runProject(r)
    expect(after.metrics.totalDevelopmentCost!.value!).toBeGreaterThan(before.metrics.totalDevelopmentCost!.value!)
    const firstIncome = (x: typeof before) => x.ledger.findIndex((row) => row.noi > 0)
    expect(firstIncome(after)).toBe(firstIncome(before) + 18)
  })

  it('in a master plan, only the chosen blocks are rezoned', () => {
    const plan: Node = { id: 'mp', name: 'MP', discountRate: 0.1, costEscalation: 0, costLines: [], children: [{ offsetMonths: 0, node: mockA }, { offsetMonths: 6, node: { ...mockA, id: 'b' } }] }
    const out = applyRezoning(plan, [['b']], REZONING_DEFAULTS) as typeof plan
    expect(hasRezoning(out.children[0]!.node as ProjectInput)).toBe(false)
    expect(hasRezoning(out.children[1]!.node as ProjectInput)).toBe(true)
    expect(() => runNode(out)).not.toThrow()
  })
})

describe('site checks', () => {
  const base: SiteFacts = { buildings: [{ name: 'Tower', storeys: 38, limitStoreys: 20, limitMetres: 61, airLimitStoreys: null, fsi: 5.9 }], fsiLimit: 5, zbaPlanned: false, holding: false, exception: '900.11.10(2507)', heritage: false, heritageDistrict: null, regulatedArea: false, greenbelt: false, nearAerodrome: true, protectedStationArea: true, residential: true, source: () => 'Zoning height overlay · 2026-10-21' }
  const ids = (s: SiteFacts) => siteInsights(s).map((i) => `${i.id}:${i.severity}`)

  it('over height without a planned rezoning is a concern with an action; with one it is a watch', () => {
    expect(ids(base)).toEqual(['height-over:concern', 'airport-check:watch', 'fsi-over:concern', 'exception:info', 'iz:info'])
    expect(siteInsights(base)[0]).toMatchObject({ action: 'model-rezoning', source: 'Zoning height overlay · 2026-10-21' })
    expect(ids({ ...base, zbaPlanned: true })[0]).toBe('height-rezoning-assumed:watch')
  })

  it('an airport limit below the building is a concern a rezoning cannot fix', () => {
    const s = { ...base, buildings: [{ ...base.buildings[0]!, airLimitStoreys: 15 }] }
    const air = siteInsights(s).find((i) => i.id === 'airport-over')!
    expect(air.severity).toBe('concern')
    expect(air.action).toBeUndefined()
  })

  it('unknown limits mean no check, never a pass', () => {
    const none = { ...base, buildings: [{ ...base.buildings[0]!, limitStoreys: null, limitMetres: null }], fsiLimit: null, nearAerodrome: false, exception: null, protectedStationArea: false }
    expect(siteInsights(none)).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import { lineTotals, type CostLine } from '../../src/engine/costs'
import { evidenceOf, evidenceProblems, EVIDENCE_KEY } from '../../src/ui/evidence'
import { fromModel } from '../../src/ui/modelFacts'
import { toPerStall } from '../../src/ui/sections'
import { tinyProject } from './fixtures'

const perUnit: CostLine = { id: 'p', label: 'Parking', catalogueId: 'underground-parking', driver: { kind: 'perUnit', rate: 150_000, units: 120 }, timing: { kind: 'construction' }, estimateClass: 'C' }

describe('parking: stalls × area per stall × $/ft²', () => {
  it('totals stalls × area × rate, and converting a $/stall line keeps its total', () => {
    const stall = toPerStall(perUnit)
    expect(stall.driver).toEqual({ kind: 'perStall', stalls: 120, sqftPerStall: 400, rate: 375 })
    expect(lineTotals([stall]).get('p')).toBe(18_000_000)
    expect(lineTotals([perUnit]).get('p')).toBe(18_000_000)
  })
  it('the stall count comes from the model, so it is not asked twice', () => {
    expect(fromModel(tinyProject({ costLines: [toPerStall(perUnit)] }))['planning.carParkingStalls']).toBe(120)
    expect(fromModel(tinyProject())['planning.carParkingStalls']).toBeUndefined()
  })
})

describe('market evidence', () => {
  const ok = { source: 'TRREB Rental Report', url: 'https://trreb.ca/market-data/', figure: 'Average 1-bed lease, C01', value: '$2,450', period: '2026 Q3', retrievedAt: '2026-10-22' }
  it('needs a source, an https link, the figure, its value, the period and the date read', () => {
    expect(evidenceProblems(ok)).toEqual([])
    expect(evidenceProblems({ ...ok, url: 'trreb.ca' })).toContain('Link to the source (https://…)')
    expect(evidenceProblems({ ...ok, retrievedAt: 'Oct 22' })).toContain('Date read must be YYYY-MM-DD')
    expect(evidenceProblems({ ...ok, period: ' ' })).toHaveLength(1)
  })
  it('reads back what was saved, and nothing from a damaged value', () => {
    expect(evidenceOf({ [EVIDENCE_KEY]: JSON.stringify([{ id: 'a', ...ok }]) })).toHaveLength(1)
    expect(evidenceOf({ [EVIDENCE_KEY]: '{not json' })).toEqual([])
    expect(evidenceOf({})).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import mockAJson from '../../data/projects/mock-a-toronto-mixed-use.json'
import { mockB } from '../../data/projects/mock-b-durham-master-plan'
import type { Node } from '../../src/engine/portfolio'
import { catalogue } from '../../src/ui/data'
import { ASKED_ELSEWHERE, FROM_MODEL, GROUPS_ELSEWHERE, SIMPLE_QUESTIONS, fromModel, withModel } from '../../src/ui/modelFacts'

const ids = new Set(catalogue.variables.map((v) => v.id))
const mockA = mockAJson.input as Node

describe('each question asked once', () => {
  it('every named variable exists, and none is both read from the model and asked elsewhere', () => {
    for (const id of [...Object.keys(FROM_MODEL), ...Object.keys(ASKED_ELSEWHERE), ...SIMPLE_QUESTIONS]) expect(ids.has(id), id).toBe(true)
    for (const id of Object.keys(FROM_MODEL)) expect(ASKED_ELSEWHERE[id], id).toBeUndefined()
    for (const g of Object.keys(GROUPS_ELSEWHERE)) expect(catalogue.variables.some((v) => v.group === g)).toBe(true)
  })
  it('Simple asks only real questions: none the model answers or another page asks', () => {
    for (const id of SIMPLE_QUESTIONS) expect(id in FROM_MODEL || id in ASKED_ELSEWHERE, id).toBe(false)
    expect(SIMPLE_QUESTIONS.length).toBeLessThanOrEqual(15)
  })
  it('the model answers its own figures, and they win over a typed duplicate', () => {
    const a = fromModel(mockB)
    expect(a['mp.phases']).toBe(3)
    expect(a['planning.residentialUnits']).toBeGreaterThan(3_000)
    expect(withModel({ 'planning.residentialUnits': 1, 'site.heritage': true }, mockB)).toMatchObject({ 'planning.residentialUnits': a['planning.residentialUnits'], 'site.heritage': true })
    const one = fromModel(mockA)
    expect(one['mp.phases']).toBe(1)
    expect(one['program.retailNla']).toBeGreaterThan(0)
    for (const id of Object.keys(one)) expect(id in FROM_MODEL, id).toBe(true)
  })
})

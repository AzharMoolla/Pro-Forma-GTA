import { describe, expect, it } from 'vitest'
import { indigenousContext } from '../../src/location/indigenous'

describe('indigenous context', () => {
  it('Toronto: Southern Ontario Treaties with the Mississaugas of the Credit, the City\'s acknowledgement and its office', () => {
    const c = indigenousContext('Southern Ontario Treaties (1764-1862)', 'toronto')
    expect(c.treaties[0]!.nations.map((n) => n.name)).toContain('Mississaugas of the Credit First Nation')
    expect(c.acknowledgement).toMatch(/Treaty 13/)
    expect(c.contacts.map((x) => x.name)).toContain('City of Toronto Indigenous Affairs Office')
  })
  it('Durham: Williams Treaties with the seven Nations; no Toronto acknowledgement', () => {
    const c = indigenousContext('Williams Treaties (1923)', 'oshawa')
    expect(c.treaties[0]!.nations.length).toBeGreaterThanOrEqual(6)
    expect(c.acknowledgement).toBeNull()
  })
  it('two overlapping treaties are both listed; an unknown site lists none', () => {
    expect(indigenousContext('Southern Ontario Treaties (1764-1862), Williams Treaties (1923)', 'toronto').treaties).toHaveLength(2)
    expect(indigenousContext(null, null).treaties).toEqual([])
  })
})

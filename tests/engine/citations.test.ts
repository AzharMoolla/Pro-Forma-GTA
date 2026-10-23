import { describe, expect, it } from 'vitest'
import { CITATION_NOTICE, CITATIONS, citationsForCue, citationsForInsight, mappedIds } from '../../src/ui/citations'

describe('policy citation library', () => {
  it('every citation is complete: instrument, section, an exact quote, an official https link, its currency and the date checked', () => {
    for (const c of CITATIONS) {
      expect(c.instrument, c.id).toBeTruthy()
      expect(c.section, c.id).toBeTruthy()
      expect(c.quote.length, c.id).toBeGreaterThan(40)
      expect(c.url, c.id).toMatch(/^https:\/\//)
      expect(c.currency, c.id).toBeTruthy()
      expect(c.verified, c.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      // Statutes link to the official sources (Ontario e-Laws, federal Justice Laws)
      if (c.kind === 'statute') expect(c.url, c.id).toMatch(/^https:\/\/(www\.ontario\.ca\/laws\/|laws-lois\.justice\.gc\.ca\/)/)
    }
    expect(new Set(CITATIONS.map((c) => c.id)).size).toBe(CITATIONS.length)
  })
  it('guidance is never presented as law, and second-hand figures say so', () => {
    for (const c of CITATIONS.filter((x) => x.kind === 'guideline')) expect(c.secondary, c.id).toMatch(/confirm/i)
  })
  it('every mapping points at a citation that exists', () => {
    const ids = new Set(CITATIONS.map((c) => c.id))
    for (const id of mappedIds()) expect(ids.has(id), id).toBe(true)
  })
  it('pills and findings get their sections; anything without a checked source gets none', () => {
    expect(citationsForCue('holding').map((c) => c.section)).toEqual(['s. 36 (1)'])
    expect(citationsForCue('heritage-tower-a')[0]!.instrument).toMatch(/Ontario Heritage Act/)
    expect(citationsForInsight('height-over').map((c) => c.id)).toEqual(['pa-34-1-4', 'pa-45-1'])
    expect(citationsForCue('transit-review')).toEqual([])
    expect(citationsForCue('area-policy')).toEqual([])
  })
  it('carries the reproduction notice the King\'s Printer requires', () => {
    expect(CITATION_NOTICE).toMatch(/© King's Printer for Ontario/)
    expect(CITATION_NOTICE).toMatch(/not the official versions/)
  })
})

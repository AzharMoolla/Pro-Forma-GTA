import { describe, expect, it } from 'vitest'
import catalogueJson from '../../data/costs/catalogue.json'
import type { Catalogue } from '../../src/engine/catalogue'
import { runNode } from '../../src/engine/portfolio'
import { blankProject } from '../../src/ui/blank'

const catalogue = catalogueJson as unknown as Catalogue

describe('blank project', () => {
  it('for every project type: runs, lists its costs as not yet estimated, and claims no results it cannot back', () => {
    for (const t of catalogue.projectTypes) {
      const p = blankProject(catalogue, t.id, 'p', 'Blank')
      expect(p.costLines.length, t.id).toBeGreaterThan(5)
      expect(p.costLines.every((l) => l.driver === null), t.id).toBe(true)
      expect(p.components).toEqual([])
      const r = runNode(p)
      expect(r.complete, t.id).toBe(false)
      expect(r.missing.length, t.id).toBe(p.costLines.length)
      expect(r.metrics.profit?.value ?? null, t.id).toBeNull()
      expect(r.metrics.totalDevelopmentCost?.value ?? null, t.id).toBeNull()
    }
  })
  it('has no loan until one is set', () => {
    const p = blankProject(catalogue, 'rental-midrise', 'p', 'Blank')
    expect(p.debt.ltc).toBe(0)
  })
})

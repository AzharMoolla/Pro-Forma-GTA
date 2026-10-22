import { describe, expect, it } from 'vitest'
import { CASES, runCase } from '../../src/verification/cases'

describe('verification cases: expected vs actual', () => {
  for (const c of CASES) {
    it(`${c.id} ${c.title}`, () => {
      const r = runCase(c)
      expect(r.error).toBeUndefined()
      expect(r.actual, `${c.derivation}`).not.toBeNull()
      expect(Math.abs(r.diff!), `expected ${c.expected}, got ${r.actual}`).toBeLessThanOrEqual(c.tolerance)
    })
  }
})

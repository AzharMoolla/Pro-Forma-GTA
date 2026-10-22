import { describe, expect, it } from 'vitest'
import { benchmark, NBLC_PEEL_2021 } from '../../src/verification/benchmarks'

// Answer key: NBLC's published residual land values for 15 Peel transit-area sites (docs/implementation/BENCHMARK.md).
// These guard against drift: a change that moves the engine away from a published pro forma fails here.
const revenue = (s: (typeof NBLC_PEEL_2021)[number]) => (s.units * s.unitSqft * s.condoPsf) + (Math.round(s.units * s.parkingRes) * s.stallPrice)

describe('benchmark: published pro formas (NBLC, Peel 2021)', () => {
  it('the transcribed sites are internally consistent (83% net-to-gross, as the study states)', () => {
    for (const s of NBLC_PEEL_2021) expect(Math.abs((s.units * s.unitSqft / s.gfaSqft) - 0.83), s.name).toBeLessThan(0.006)
  })
  it('condo: land value within 2% of revenue at 9 or more of 15 sites, and never off by more than 13%', () => {
    const errs = benchmark('condo').map((r, i) => Math.abs(r.error!) / revenue(NBLC_PEEL_2021[i]!))
    expect(errs.filter((e) => e <= 0.02).length).toBeGreaterThanOrEqual(9)
    expect(Math.max(...errs)).toBeLessThan(0.13)
  }, 120_000)
  it('rental (one fitted spread): median miss under $1.5M, 9 or more sites within $2M', () => {
    const errs = benchmark('rental').map((r) => Math.abs(r.error!)).sort((a, b) => a - b)
    expect(errs[7]!).toBeLessThan(1.5e6)
    expect(errs.filter((e) => e <= 2e6).length).toBeGreaterThanOrEqual(9)
  }, 120_000)
})

describe('benchmark: Toronto 2019 (direction: viable or challenge)', () => {
  it('agrees with the study on 18 or more of 22 site and tenure cases, using the Peel rental spread unchanged', async () => {
    const { torontoDirection } = await import('../../src/verification/benchmarks')
    const rows = torontoDirection()
    expect(rows).toHaveLength(22)
    expect(rows.filter((r) => r.agrees).length).toBeGreaterThanOrEqual(18)
    expect(rows.filter((r) => r.tenure === 'condo' && r.agrees).length).toBeGreaterThanOrEqual(9)
  }, 120_000)
})

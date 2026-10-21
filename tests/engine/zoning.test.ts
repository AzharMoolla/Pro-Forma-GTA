import { describe, expect, it } from 'vitest'
import { considerationsFrom, heightCheck, type SiteMatch } from '../../src/location/zoning'

const src = { catalogueUrl: 'https://open.toronto.ca/dataset/zoning-by-law/', retrievedAt: '2026-10-21T21:45:22Z' }
// Properties as the planning map returned them for Yonge–Eglinton on 2026-10-21
const yongeEglinton: SiteMatch[] = [
  { id: 'zoning', label: 'Toronto zoning areas', source: src, features: [{ ZN_STRING: 'CR 5.0 (c4.0; r3.0) SS2  (x2507)', ZN_HOLDING: 'N', FSI_TOTAL: 5, COVERAGE: null, ZN_EXCPTN: 'Y', EXCPTN_NO: 2507, ZBL_EXCPTN: '900.11.10(2507)' }] },
  { id: 'zoning-height', label: 'Zoning height overlay', source: src, features: [{ HT_STORIES: null, HT_STRING: 'HT 61.0', HT_LABEL: 61 }] },
  { id: 'zoning-parking', label: 'Parking zone overlay', source: src, features: [{ ZN_PARKZONE: 'A' }] },
  { id: 'wards', label: 'Toronto wards', source: src, features: [{ AREA_NAME: "Toronto-St. Paul's", AREA_DESC: "Toronto-St. Paul's (12)" }] },
]
const get = (c: ReturnType<typeof considerationsFrom>, v: string) => c.find((x) => x.variable === v)?.value

describe('planning-map matches → project variables', () => {
  const c = considerationsFrom(yongeEglinton)

  it('reads zone, FSI, exception, height and parking, each with source and date', () => {
    expect(get(c, 'zoning.code')).toBe('CR 5.0 (c4.0; r3.0) SS2  (x2507)')
    expect(get(c, 'zoning.fsiLimit')).toBe(5)
    expect(get(c, 'zoning.exception')).toBe('900.11.10(2507)')
    expect(get(c, 'zoning.holding')).toBe(false)
    expect(get(c, 'zoning.heightLimitM')).toBe(61)
    expect(get(c, 'zoning.heightLimitStoreys')).toBe(20) // 61 m ÷ 3 m, rounded down
    expect(get(c, 'zoning.parkingZone')).toBe('A')
    expect(get(c, 'site.ward')).toBe("Toronto-St. Paul's (12)")
    for (const x of c) expect(x).toMatchObject({ sourceUrl: src.catalogueUrl, retrievedAt: '2026-10-21' })
  })

  it('never turns -1 / null "no value" codes into limits, and a missing screening layer sets nothing', () => {
    expect(get(c, 'zoning.lotCoverageMax')).toBeUndefined() // COVERAGE null
    const sentinel = considerationsFrom([{ id: 'zoning', label: 'z', source: src, features: [{ ZN_STRING: 'UT', FSI_TOTAL: -1, ZN_HOLDING: 'N' }] }])
    expect(get(sentinel, 'zoning.fsiLimit')).toBeUndefined()
    expect(get(c, 'site.heritage')).toBeUndefined() // not "false": absence from a district layer is not clearance
    expect(get(c, 'site.regulatedArea')).toBeUndefined()
  })

  it('compares the proposal against the limit', () => {
    expect(heightCheck(38, 20, null)).toEqual({ proposedStoreys: 38, limitStoreys: 20, exceedsBy: 18 })
    expect(heightCheck(12, null, 61)!.exceedsBy).toBe(0)
    expect(heightCheck(null, 20, null)).toBeNull()
  })
})

// Planning-map site matches → project variables, each with its source. Pure: the matches come in as data
// (from the planning map's /api/site), no IO or clock.
//
// Only what a layer actually says is set. Where a layer can only say "yes" (a heritage district, the TRCA
// regulated area), no hit leaves the variable alone: absence from a screening layer is not clearance.

export interface SiteMatch {
  id: string // planning-map layer id
  label: string
  source: { publisher?: string; catalogueUrl?: string; retrievedAt?: string; metadataModified?: string; licence?: string }
  features: Array<Record<string, unknown>>
}

/** Frontage street and nearby transit, as the planning map returns them (pedestrian network, TTC stops). */
export interface StreetContext {
  street?: { segments: Array<{ metres: number; properties: Record<string, unknown> }>; crossing: { metres: number; properties: Record<string, unknown> } | null; source: { catalogueUrl?: string; retrievedAt?: string } } | null
  nearby?: Array<{ id: string; label: string; results: Array<{ metres: number; name: string | null }> }>
}

const CROSSING: Record<string, string> = { ts: 'traffic signal', px: 'pedestrian crossover', pxo: 'pedestrian crossover' }

export interface Consideration {
  variable: string
  value: string | number | boolean
  label: string // what the value means, in words
  layerId: string
  layer: string
  sourceUrl: string
  retrievedAt: string // YYYY-MM-DD
  note?: string
}

/** Typical floor-to-floor height used to turn a zoning height in metres into storeys for sketches and checks. */
export const FLOOR_TO_FLOOR_M = 3.0

/** Source values of -1 (and null/empty) are "no value" codes in Toronto's zoning data, never real limits. */
const positive = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null)
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null)

export function considerationsFrom(matches: SiteMatch[], context: StreetContext = {}): Consideration[] {
  const out: Consideration[] = []
  const add = (m: SiteMatch, variable: string, value: string | number | boolean | null, label: string, note?: string) => {
    if (value === null) return
    out.push({ variable, value, label, layerId: m.id, layer: m.label, sourceUrl: m.source.catalogueUrl ?? '', retrievedAt: (m.source.retrievedAt ?? '').slice(0, 10), note })
  }
  const first = (id: string) => matches.find((m) => m.id === id)

  const zoning = first('zoning')
  if (zoning) {
    const z = zoning.features[0]!
    add(zoning, 'zoning.code', text(z.ZN_STRING), `Zone ${text(z.ZN_STRING)} (By-law 569-2013)`, zoning.features.length > 1 ? `${zoning.features.length} zone polygons meet here; check the parcel` : undefined)
    add(zoning, 'zoning.fsiLimit', positive(z.FSI_TOTAL), `Maximum FSI ${positive(z.FSI_TOTAL)}`)
    const coverage = positive(z.COVERAGE)
    add(zoning, 'zoning.lotCoverageMax', coverage === null ? null : coverage / 100, `Maximum lot coverage ${coverage}%`)
    add(zoning, 'zoning.holding', z.ZN_HOLDING === 'Y', z.ZN_HOLDING === 'Y' ? 'Holding (H) symbol applies' : 'No holding symbol')
    if (z.ZN_EXCPTN === 'Y') add(zoning, 'zoning.exception', text(z.ZBL_EXCPTN) ?? text(z.EXCPTN_NO), `Site-specific exception ${text(z.ZBL_EXCPTN) ?? text(z.EXCPTN_NO)}`, 'Exceptions can change height, density and uses: read the exception text')
  }
  const oshawa = first('oshawa-zoning')
  if (oshawa) add(oshawa, 'zoning.code', text(oshawa.features[0]!.DESCRIPTION), `Zone ${text(oshawa.features[0]!.DESCRIPTION)} (Oshawa By-law 60-94)`)

  const height = first('zoning-height')
  if (height) {
    const h = height.features[0]!
    const metres = positive(h.HT_LABEL)
    add(height, 'zoning.heightLimitM', metres, `Height limit ${metres} m`)
    const storeys = positive(h.HT_STORIES) ?? (metres === null ? null : Math.floor(metres / FLOOR_TO_FLOOR_M))
    add(height, 'zoning.heightLimitStoreys', storeys, positive(h.HT_STORIES) ? `${storeys} storeys (by-law)` : `≈ ${storeys} storeys at ${FLOOR_TO_FLOOR_M} m per storey`)
  }
  const lot = first('zoning-lot-coverage')
  if (lot && !out.some((c) => c.variable === 'zoning.lotCoverageMax')) {
    const pctCover = positive(lot.features[0]!.PRCNT_CVER)
    add(lot, 'zoning.lotCoverageMax', pctCover === null ? null : pctCover / 100, `Maximum lot coverage ${pctCover}%`)
  }
  const parking = first('zoning-parking')
  if (parking) add(parking, 'zoning.parkingZone', text(parking.features[0]!.ZN_PARKZONE), `Parking zone ${text(parking.features[0]!.ZN_PARKZONE)}`)

  const heritage = first('heritage-districts')
  if (heritage) {
    add(heritage, 'site.heritage', true, 'Inside a heritage conservation district')
    add(heritage, 'site.heritageDistrict', text(heritage.features[0]!.HCD_NAME), `${text(heritage.features[0]!.HCD_NAME)} (${text(heritage.features[0]!.HCD_TYPE) ?? 'district'})`)
  }
  const trca = first('trca-regulated')
  if (trca) add(trca, 'site.regulatedArea', true, 'Inside the TRCA regulated area (screening limit)', 'Conceptual limit: TRCA confirms whether a permit is needed')
  const durhamStation = first('durham-pmtsa')
  if (durhamStation) add(durhamStation, 'site.majorTransitStationArea', true, `${text(durhamStation.features[0]!.NAME)} protected major transit station area`)

  const ward = first('wards') ?? first('oshawa-wards')
  if (ward) add(ward, 'site.ward', text(ward.features[0]!.AREA_DESC) ?? text(ward.features[0]!.AREA_NAME) ?? text(ward.features[0]!.NAME), 'Ward')
  const hood = first('neighbourhoods') ?? first('oshawa-neighbourhoods')
  if (hood) add(hood, 'site.neighbourhood', text(hood.features[0]!.AREA_NAME) ?? text(hood.features[0]!.NAME), 'Neighbourhood')
  // Frontage: the nearest road segment that is a road (not a walkway), from the pedestrian network
  const st = context.street
  if (st) {
    const m: SiteMatch = { id: 'walking', label: 'Pedestrian network', source: st.source, features: [] }
    const road = st.segments.find((x) => !/walkway|trail|lane/i.test(String(x.properties.ROAD_TYPE ?? '')))
    if (road) {
      add(m, 'site.frontageRoadClass', text(road.properties.ROAD_TYPE), `${text(road.properties.ROAD_TYPE)} ${road.metres} m from the point`)
      add(m, 'site.sidewalks', text(road.properties.SIDEWALK_DESCRIPTION), 'Sidewalks on the frontage street')
    }
    if (st.crossing) {
      const kind = CROSSING[String(st.crossing.properties.PX_TYPE ?? '').trim().toLowerCase()] ?? 'marked crossing'
      add(m, 'site.nearestCrossingM', st.crossing.metres, `Nearest ${kind}, ${st.crossing.metres} m (straight line)`)
      add(m, 'site.crossingType', kind, 'Nearest crossing')
    }
  }
  const stop = context.nearby?.find((n) => n.id === 'ttc-stops')?.results[0]
  if (stop) {
    const m: SiteMatch = { id: 'ttc-stops', label: 'TTC scheduled stops', source: { catalogueUrl: 'https://open.toronto.ca/dataset/ttc-routes-and-schedules/', retrievedAt: st?.source.retrievedAt }, features: [] }
    add(m, 'site.nearestTransitStopM', stop.metres, `${stop.name ?? 'TTC stop'}, ${stop.metres} m (straight line)`)
    add(m, 'site.nearestTransitStop', stop.name, 'Nearest TTC stop')
  }
  return out
}

/** Does the proposal fit the mapped height limit? null when either side is unknown. */
export function heightCheck(proposedStoreys: number | null, limitStoreys: number | null, limitMetres: number | null) {
  if (!proposedStoreys || !(limitStoreys || limitMetres)) return null
  const limit = limitStoreys ?? Math.floor(limitMetres! / FLOOR_TO_FLOOR_M)
  return { proposedStoreys, limitStoreys: limit, exceedsBy: Math.max(0, proposedStoreys - limit) }
}

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Attributes } from '../engine/catalogue'
import type { Node, NodeResult } from '../engine/portfolio'
import type { ProjectInput } from '../engine/project'
import { FLOOR_TO_FLOOR_M } from '../location/zoning'
import { Button, cx } from './components'
import { projectsUnder } from './coverage'
import { metricValue, money, num } from './format'
import { getResult } from './tree'

// A playful, not-to-scale picture of the project in one of four looks. Buildings, storeys, podiums, retail, parks,
// transit, schools and green roofs come from the pro forma; zoning limits from the site map draw over it. It is an
// illustration, not a drawing: no CAD accuracy, legal envelope or surveyed layout is implied.

export type ArtStyle = 'watercolour' | 'sketch' | 'blueprint' | 'model'
export const ART_STYLES: Array<{ id: ArtStyle; label: string }> = [
  { id: 'watercolour', label: 'Watercolour' },
  { id: 'sketch', label: 'Pencil sketch' },
  { id: 'blueprint', label: 'Blueprint' },
  { id: 'model', label: 'Massing model' },
]

interface Massing { id: string; kind: 'tower' | 'midrise' | 'office' | 'lots'; storeys: number; podium: number; floorplate: number; retail: boolean; label?: string }
interface Features { transit: 'subway' | 'go' | null; park: boolean; school: boolean; community: boolean; trees: boolean; greenRoof: boolean; pool: boolean }
interface Zoning { storeys: number | null; metres: number | null; notes: string[] }

/** Fixed palettes per look (the picture has its own background, like a print), each text ink ≥ 4.5:1 on it. */
const LOOKS: Record<ArtStyle, {
  bg: string; ground: string; walls: string[]; window: string; line: string; lineW: number; fillOpacity: number; text: string; soft: string
  limit: string; green: string; filter: 'wash' | 'pencil' | 'shadow' | null; hatch: boolean; extrude: boolean; grid: boolean
}> = {
  watercolour: { bg: '#f7f1e3', ground: '#c9b99a', walls: ['#e0a96d', '#7fb2c4', '#d98a72', '#a99bd1', '#9cc48a', '#e9c46a'], window: '#3d5a6c', line: '#5b4636', lineW: 1, fillOpacity: 0.62, text: '#3b2f25', soft: '#5f5040', limit: '#b23a2a', green: '#5f9e57', filter: 'wash', hatch: false, extrude: false, grid: false },
  sketch: { bg: '#fbfaf6', ground: '#77736b', walls: ['#ffffff'], window: '#2f2f2f', line: '#2f2f2f', lineW: 1.3, fillOpacity: 1, text: '#262626', soft: '#555049', limit: '#b0281a', green: '#3f6b3a', filter: 'pencil', hatch: true, extrude: false, grid: false },
  blueprint: { bg: '#123f66', ground: '#cfe3f5', walls: ['#123f66'], window: '#9cc3e6', line: '#e6f1fb', lineW: 1.1, fillOpacity: 1, text: '#e6f1fb', soft: '#b7d3ec', limit: '#ffd166', green: '#9fe0b7', filter: null, hatch: false, extrude: false, grid: true },
  model: { bg: '#e9eaec', ground: '#c4c7cb', walls: ['#fbfbfb', '#f2f3f4', '#ffffff'], window: '#c9d3db', line: '#8e969d', lineW: 0.8, fillOpacity: 1, text: '#24292e', soft: '#4c545b', limit: '#c0392b', green: '#7fae7a', filter: 'shadow', hatch: false, extrude: true, grid: false },
}

const FLOOR_H = 3.2 // drawing units per storey before scaling
const seeded = (seed: string) => {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return (i: number) => ((((Math.sin(h + (i * 12.9898)) * 43758.5453) % 1) + 1) % 1)
}

function massingOf(project: ProjectInput, label?: string): Massing {
  const kinds = new Set(project.components.map((c) => (c.kind === 'commercial' ? c.use : c.kind)))
  const gca = project.program?.gcaAboveSqft ?? 0
  if (kinds.size === 1 && kinds.has('landSale')) return { id: project.id, kind: 'lots', storeys: 2, podium: 0, floorplate: 0, retail: false, label }
  const storeys = Math.max(1, Math.round(project.program?.storeys ?? gca / 9_000))
  const office = kinds.has('office') && !kinds.has('rental') && !kinds.has('condo')
  return { id: project.id, kind: office ? 'office' : storeys > 14 ? 'tower' : 'midrise', storeys, podium: Math.min(storeys - 1, project.program?.podiumStoreys ?? 0), floorplate: gca / storeys, retail: kinds.has('retail'), label }
}

const n = (a: Attributes, id: string) => (typeof a[id] === 'number' ? (a[id] as number) : 0)

function featuresOf(a: Attributes): Features {
  const toronto = a['site.municipality'] === 'toronto'
  return {
    transit: a['site.nearTtc60m'] === true || (toronto && a['site.majorTransitStationArea'] === true) ? 'subway' : a['mp.transitIntegration'] === true || a['site.majorTransitStationArea'] === true ? 'go' : null,
    park: n(a, 'mp.parksHa') > 0 || a['planning.parklandOnSite'] === true,
    school: n(a, 'mp.schoolSites') > 0,
    community: a['mp.communityCentre'] === true || a['program.institutional'] === true,
    trees: n(a, 'design.streetscapeM') > 0 || n(a, 'site.protectedTrees') > 0,
    greenRoof: n(a, 'design.greenRoofM2') > 0,
    pool: a['program.pool'] === true,
  }
}

export function zoningOf(a: Attributes): Zoning | null {
  const metres = n(a, 'zoning.heightLimitM') || null
  const storeys = n(a, 'zoning.heightLimitStoreys') || (metres ? Math.floor(metres / FLOOR_TO_FLOOR_M) : null)
  const code = a['zoning.code']
  const exception = a['zoning.exception']
  const notes = [
    typeof code === 'string' && `Zone ${code.replace(/\s+/g, ' ')}`,
    n(a, 'zoning.fsiLimit') > 0 && `FSI ≤ ${n(a, 'zoning.fsiLimit')}`,
    n(a, 'zoning.lotCoverageMax') > 0 && `coverage ≤ ${Math.round(n(a, 'zoning.lotCoverageMax') * 100)}%`,
    a['zoning.holding'] === true && 'holding (H)',
    typeof exception === 'string' && `exception ${exception}`,
    a['site.heritage'] === true && 'heritage',
    a['site.regulatedArea'] === true && 'conservation regulated',
  ].filter((x): x is string => typeof x === 'string')
  return storeys || notes.length ? { storeys, metres, notes } : null
}

interface Street { roadClass: string | null; lanes: number; sidewalkNear: boolean; sidewalkFar: boolean; rowM: number | null; crossingM: number | null; stopM: number | null; accesses: number }

/** Lanes drawn per road class: an illustration of the class, not a count of the actual street. */
const LANES: Record<string, number> = { local: 2, collector: 2, 'minor arterial': 4, 'major arterial': 4, expressway: 6 }

function streetOf(a: Attributes): Street {
  const roadClass = typeof a['site.frontageRoadClass'] === 'string' ? a['site.frontageRoadClass'] : null
  const sidewalks = typeof a['site.sidewalks'] === 'string' ? a['site.sidewalks'].toLowerCase() : 'both'
  return {
    roadClass,
    lanes: LANES[(roadClass ?? '').toLowerCase()] ?? 2,
    sidewalkNear: !/no sidewalk/.test(sidewalks),
    sidewalkFar: /both/.test(sidewalks),
    rowM: n(a, 'site.rowWidthM') || null,
    crossingM: n(a, 'site.nearestCrossingM') || null,
    stopM: n(a, 'site.nearestTransitStopM') || null,
    accesses: Math.min(3, n(a, 'design.vehicleAccessPoints')),
  }
}

interface Tag { title: string; text: string; anchor: 'road' | 'sidewalk' | 'crossing' | 'stop' | 'building' | 'curb' | 'ground' }

/** Street, traffic, servicing and parking requirements worth seeing on the picture, from the project's variables. */
function tagsOf(a: Attributes, s: Street): Tag[] {
  const str = (id: string) => (typeof a[id] === 'string' ? (a[id] as string) : null)
  const tags: Array<Tag | null> = [
    s.roadClass || s.rowM ? { title: 'Street', text: `${s.roadClass ?? 'class unknown'} · ROW ${s.rowM ? `${s.rowM} m` : 'to check (OP Map 3)'}`, anchor: 'road' } : null,
    str('site.sidewalks') ? { title: 'Sidewalks', text: str('site.sidewalks')!, anchor: 'sidewalk' } : null,
    s.crossingM ? { title: 'Crossing', text: `${str('site.crossingType') ?? 'crossing'} · ${s.crossingM} m`, anchor: 'crossing' } : null,
    s.stopM ? { title: 'Transit', text: `${str('site.nearestTransitStop') ?? 'TTC stop'} · ${s.stopM} m`, anchor: 'stop' } : null,
    n(a, 'planning.carParkingStalls') || str('zoning.parkingZone') ? {
      title: 'Parking',
      text: [n(a, 'planning.carParkingStalls') && `${n(a, 'planning.carParkingStalls')} stalls`, n(a, 'planning.parkingLevelsBelowGrade') && `${n(a, 'planning.parkingLevelsBelowGrade')} levels below`, str('zoning.parkingZone') && `zone ${str('zoning.parkingZone')}`, a['site.municipality'] === 'toronto' && 'no res. minimum'].filter(Boolean).join(' · '),
      anchor: 'building',
    } : null,
    n(a, 'planning.bikeParking') ? { title: 'Bicycle parking', text: `${n(a, 'planning.bikeParking')} spaces`, anchor: 'building' } : null,
    n(a, 'planning.loadingSpaces') || s.accesses ? { title: 'Loading and access', text: [n(a, 'planning.loadingSpaces') && `${n(a, 'planning.loadingSpaces')} loading`, s.accesses && `${s.accesses} driveway${s.accesses === 1 ? '' : 's'}`].filter(Boolean).join(' · '), anchor: 'curb' } : null,
    (() => {
      const flags = [a['design.stormwaterTank'] === true && 'stormwater tank', a['site.highWaterTable'] === true && 'dewatering', a['site.utilityRelocation'] === true && 'utility relocation', a['design.hydroVault'] === true && 'hydro vault'].filter(Boolean)
      return flags.length ? { title: 'Servicing', text: flags.join(' · '), anchor: 'ground' as const } : null
    })(),
    n(a, 'site.frontageM') ? { title: 'Frontage', text: `${n(a, 'site.frontageM')} m`, anchor: 'sidewalk' } : null,
  ]
  return tags.filter((t): t is Tag => t !== null)
}

const readStyle = (): ArtStyle => {
  try { const s = localStorage.getItem('gta-proforma:art'); return ART_STYLES.some((x) => x.id === s) ? (s as ArtStyle) : 'watercolour' } catch { return 'watercolour' }
}

export function Streetscape({ node, result, attributes }: { node: Node; result: NodeResult; attributes: Attributes }) {
  const uid = useId().replace(/:/g, '')
  const svgRef = useRef<SVGSVGElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ cx: number; cy: number; x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const [style, setStyle] = useState<ArtStyle>(readStyle)
  const choose = (s: ArtStyle) => { setStyle(s); try { localStorage.setItem('gta-proforma:art', s) } catch { /* per-viewer convenience only */ } }

  const scene = useMemo(() => {
    const projects = projectsUnder(node)
    const multi = projects.length > 1
    const buildings = projects.map(({ path, project }) => massingOf(project, multi ? money((path.length ? getResult(result, path) : result).metrics.profit?.value) : undefined))
    return { buildings, features: featuresOf(attributes), zoning: zoningOf(attributes) }
  }, [node, result, attributes])

  const look = LOOKS[style]
  const { buildings, features, zoning } = scene
  const rand = seeded(node.id)
  const single = buildings.length === 1

  // Layout: one row along the street, left to right
  const widthOf = (b: Massing) => (b.kind === 'lots' ? 130 : Math.max(48, Math.min(single ? 230 : 140, Math.sqrt(Math.max(1, b.floorplate)) * (single ? 2 : 1.1))) + (b.podium ? 26 : 0))
  type Part = { kind: 'building'; b: Massing; w: number } | { kind: 'tree' | 'transit' | 'park' | 'school' | 'community'; w: number }
  const parts: Part[] = []
  if (features.transit) parts.push({ kind: 'transit', w: 70 })
  buildings.forEach((b, i) => {
    parts.push({ kind: 'building', b, w: widthOf(b) })
    if (features.trees || i < buildings.length - 1) parts.push({ kind: 'tree', w: 26 })
    if (features.park && i === Math.max(0, Math.floor(buildings.length / 2) - 1)) parts.push({ kind: 'park', w: 120 })
  })
  if (features.school) parts.push({ kind: 'school', w: 100 })
  if (features.community) parts.push({ kind: 'community', w: 120 })
  const gap = 14
  const W = Math.max(980, parts.reduce((s, p) => s + p.w + gap, 60))
  const street = streetOf(attributes)
  const tags = tagsOf(attributes, street)
  const perRow = Math.max(1, Math.floor((W - 40) / 230))
  const tagRows = Math.ceil(tags.length / perRow)
  const notesH = zoning?.notes.length ? 22 : 0
  const groundY = 384
  const roadTop = groundY + 12 // near sidewalk, then curb
  const laneH = Math.min(9, 40 / street.lanes)
  const roadBottom = roadTop + (laneH * street.lanes)
  const streetBottom = roadBottom + 10 // far sidewalk
  const tagsTop = streetBottom + 40
  const H = tagsTop + (tagRows * 60) + notesH + 16
  const maxStoreys = Math.max(4, zoning?.storeys ?? 0, ...buildings.map((b) => b.storeys + 1.5))
  const scale = Math.min(4, (groundY - 90) / (maxStoreys * FLOOR_H))
  const floorH = FLOOR_H * scale

  let x = 24
  const placed = parts.map((p) => { const at = x; x += p.w + gap; return { ...p, x: at } })
  const filter = look.filter ? `url(#${uid}-${look.filter})` : undefined
  const limitY = zoning?.storeys ? groundY - (zoning.storeys * floorH) : null
  const over = zoning?.storeys ? buildings.filter((b) => b.kind !== 'lots' && b.storeys > zoning.storeys!).length : 0
  const m = result.metrics
  const stats: Array<[string, string]> = [['Homes', num(m.totalUnits?.value)], ['Total cost', metricValue(m.totalDevelopmentCost)], ['Profit', metricValue(m.profit)], ['Profit on cost', metricValue(m.profitOnCost)]]
  const summary = `${ART_STYLES.find((s) => s.id === style)!.label} streetscape of ${node.name}: ${buildings.map((b) => (b.kind === 'lots' ? 'a row of lots' : `${b.storeys}-storey ${b.kind}`)).join(', ')}.${zoning?.storeys ? ` Dashed line: zoning height limit of about ${zoning.storeys} storeys; ${over ? `${over} building${over === 1 ? ' is' : 's are'} taller, so a rezoning is likely` : 'every building fits under it'}.` : ''} ${stats.map(([k, v]) => `${k} ${v}`).join(', ')}.${tags.length ? ` ${tags.map((t) => `${t.title}: ${t.text}`).join('. ')}.` : ''}`

  const wall = (i: number) => look.walls[i % look.walls.length]!
  const shape = (d: ReactNode) => <g filter={filter}>{d}</g>

  const drawBuilding = (b: Massing, bx: number, w: number, i: number) => {
    if (b.kind === 'lots') {
      return shape(Array.from({ length: 4 }, (_, k) => {
        const hx = bx + (k * 32)
        return (
          <g key={k}>
            <path d={`M${hx},${groundY} v-20 l14,-13 l14,13 v20 z`} fill={wall(i + k)} fillOpacity={look.fillOpacity} stroke={look.line} strokeWidth={look.lineW} strokeLinejoin="round" />
            <rect x={hx + 10} y={groundY - 11} width={8} height={11} fill={look.window} opacity={0.8} />
          </g>
        )
      }))
    }
    const podiumW = b.podium ? w : w
    const towerW = b.podium ? w - 26 : w
    const towerX = bx + ((podiumW - towerW) / 2)
    const height = b.storeys * floorH
    const podiumH = b.podium * floorH
    const top = groundY - height
    const step = b.storeys > 45 ? 3 : b.storeys > 24 ? 2 : 1
    const cols = Math.max(2, Math.floor(towerW / 14))
    const fill = look.hatch ? `url(#${uid}-hatch)` : wall(i)
    const depth = look.extrude ? 12 : 0
    return (
      <g>
        {look.extrude && shape(<path d={`M${towerX + towerW},${top} l${depth},${-depth * 0.6} v${height - podiumH} l${-depth},${depth * 0.6} z`} fill="#d5d9dd" stroke={look.line} strokeWidth={look.lineW} />)}
        {look.extrude && shape(<path d={`M${towerX},${top} l${depth},${-depth * 0.6} h${towerW} l${-depth},${depth * 0.6} z`} fill="#ffffff" stroke={look.line} strokeWidth={look.lineW} />)}
        {shape(<rect x={towerX} y={top} width={towerW} height={height - podiumH} fill={fill} fillOpacity={look.fillOpacity} stroke={look.line} strokeWidth={look.lineW * 1.3} />)}
        {/* floors and windows */}
        {Array.from({ length: Math.floor((b.storeys - b.podium) / step) }, (_, f) => {
          const y = top + (f * floorH * step)
          return (
            <g key={f}>
              {style !== 'watercolour' && f > 0 && <line x1={towerX + 1} x2={towerX + towerW - 1} y1={y} y2={y} stroke={look.line} strokeWidth={0.5} opacity={0.45} />}
              {b.kind === 'office'
                ? <rect x={towerX + 4} y={y + (floorH * step * 0.2)} width={towerW - 8} height={Math.max(1.2, floorH * step * 0.55)} fill={look.window} opacity={style === 'watercolour' ? 0.45 : 0.6} />
                : Array.from({ length: cols }, (_, c) => (rand((i * 997) + (f * 31) + c) > 0.62 ? null : (
                  <rect key={c} x={towerX + 5 + (c * ((towerW - 10) / cols))} y={y + (floorH * step * 0.3)} width={Math.max(2.5, ((towerW - 10) / cols) - 4)} height={Math.max(1.5, floorH * 0.5)} fill={look.window} opacity={style === 'watercolour' ? 0.4 : style === 'blueprint' ? 0.8 : 0.55} />
                )))}
            </g>
          )
        })}
        {/* roof: mechanical penthouse, green roof, pool */}
        {shape(<rect x={towerX + (towerW * 0.3)} y={top - (floorH * 1.2)} width={towerW * 0.4} height={floorH * 1.2} fill={look.hatch ? look.bg : wall(i + 1)} fillOpacity={look.fillOpacity} stroke={look.line} strokeWidth={look.lineW} />)}
        {features.greenRoof && <rect x={towerX + 2} y={top - 3} width={towerW - 4} height={3} fill={look.green} opacity={0.85} />}
        {features.pool && b.kind === 'tower' && <rect x={towerX + 4} y={top - 3} width={towerW * 0.22} height={3} fill="#4aa3df" />}
        {/* podium with retail awnings */}
        {b.podium > 0 && shape(<rect x={bx} y={groundY - podiumH} width={podiumW} height={podiumH} fill={look.hatch ? look.bg : wall(i + 2)} fillOpacity={look.fillOpacity} stroke={look.line} strokeWidth={look.lineW * 1.3} />)}
        {b.podium > 0 && b.retail && Array.from({ length: Math.floor(podiumW / 22) }, (_, k) => (
          <path key={k} d={`M${bx + 4 + (k * 22)},${groundY - podiumH + (floorH * 0.9)} q9,${-floorH * 0.55} 18,0`} fill="none" stroke={style === 'blueprint' ? look.limit : '#c0533a'} strokeWidth={1.5} />
        ))}
        <rect x={bx + (podiumW / 2) - 6} y={groundY - Math.min(Math.max(podiumH, floorH), floorH * 1.4)} width={12} height={Math.min(Math.max(podiumH, floorH), floorH * 1.4)} fill={look.window} opacity={0.75} />
        {style === 'blueprint' && (
          <g fontSize="10" fill={look.soft}>
            <line x1={bx + podiumW + 4} x2={bx + podiumW + 4} y1={top} y2={groundY} stroke={look.soft} strokeWidth={0.8} markerStart={`url(#${uid}-tick)`} markerEnd={`url(#${uid}-tick)`} />
            <text x={bx + podiumW + 7} y={top + 12} className="num">{b.storeys} st</text>
          </g>
        )}
        {b.label && <text x={bx + (podiumW / 2)} y={top - (floorH * 1.2) - 6} textAnchor="middle" fontSize="11" fontWeight={600} fill={look.text} className="num">{b.label}</text>}
      </g>
    )
  }

  const tree = (tx: number, k: number) => shape(
    <g key={`t${k}`}>
      <line x1={tx + 13} x2={tx + 13} y1={groundY} y2={groundY - 14} stroke={style === 'blueprint' ? look.line : '#6b4f3a'} strokeWidth={1.6} />
      <circle cx={tx + 13} cy={groundY - 22} r={10} fill={style === 'sketch' || style === 'blueprint' ? 'none' : look.green} fillOpacity={style === 'model' ? 0.9 : 0.7} stroke={style === 'model' ? 'none' : look.green} strokeWidth={1.3} />
    </g>,
  )
  const sign = (sx: number, w: number, text: string, colour: string) => (
    <g>
      {shape(<rect x={sx} y={groundY - 54} width={w} height={54} fill={look.hatch ? look.bg : wall(3)} fillOpacity={look.fillOpacity} stroke={look.line} strokeWidth={look.lineW} />)}
      <rect x={sx + 8} y={groundY - 46} width={w - 16} height={16} rx={3} fill={colour} />
      <text x={sx + (w / 2)} y={groundY - 34} textAnchor="middle" fontSize="10" fontWeight={700} fill="#ffffff">{text}</text>
    </g>
  )

  // Zoom and pan: the view is a window (x, y, zoom k ≥ 1) onto the whole W × H drawing
  const clampView = (v: { x: number; y: number; k: number }) => {
    const k = Math.min(8, Math.max(1, v.k))
    return { k, x: Math.min(W - (W / k), Math.max(0, v.x)), y: Math.min(H - (H / k), Math.max(0, v.y)) }
  }
  const zoomAround = (factor: number, px: number, py: number) =>
    setView((v) => { const k = Math.min(8, Math.max(1, v.k * factor)); return clampView({ k, x: px - ((px - v.x) * (v.k / k)), y: py - ((py - v.y) * (v.k / k)) }) })
  const zoomBy = (factor: number) => zoomAround(factor, view.x + (W / view.k / 2), view.y + (H / view.k / 2))
  /** Drawing units per screen pixel at the current zoom (the SVG is letterboxed to fit). */
  const unitsPerPx = () => {
    const r = boxRef.current?.getBoundingClientRect()
    return r ? Math.max((W / view.k) / r.width, (H / view.k) / r.height) : 1
  }
  const toDrawing = (clientX: number, clientY: number): [number, number] => {
    const ctm = svgRef.current?.getScreenCTM()
    if (!ctm) return [view.x, view.y]
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
    return [p.x, p.y]
  }
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { cx: e.clientX, cy: e.clientY, x: view.x, y: view.y }
    setDragging(true)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const u = unitsPerPx()
    setView((v) => clampView({ ...v, x: d.x - ((e.clientX - d.cx) * u), y: d.y - ((e.clientY - d.cy) * u) }))
  }
  const onKey = (e: React.KeyboardEvent) => {
    const step = 60 / view.k
    const moves: Record<string, () => void> = {
      '+': () => zoomBy(1.4), '=': () => zoomBy(1.4), '-': () => zoomBy(1 / 1.4), '0': () => setView({ x: 0, y: 0, k: 1 }),
      ArrowLeft: () => setView((v) => clampView({ ...v, x: v.x - step })), ArrowRight: () => setView((v) => clampView({ ...v, x: v.x + step })),
      ArrowUp: () => setView((v) => clampView({ ...v, y: v.y - step })), ArrowDown: () => setView((v) => clampView({ ...v, y: v.y + step })),
    }
    if (moves[e.key]) { e.preventDefault(); moves[e.key]!() }
  }
  // Wheel zoom needs a non-passive listener to stop the page scrolling
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const [px, py] = toDrawing(e.clientX, e.clientY)
      zoomAround(e.deltaY < 0 ? 1.15 : 1 / 1.15, px, py)
    }
    box.addEventListener('wheel', onWheel, { passive: false })
    return () => box.removeEventListener('wheel', onWheel)
  })

  // Anchors for the callouts: where on the picture each requirement belongs
  const firstBuilding = placed.find((p) => p.kind === 'building')
  const buildingX = firstBuilding ? firstBuilding.x + (firstBuilding.w / 2) : W / 3
  const stopX = placed.find((p) => p.kind === 'transit')?.x ?? Math.max(30, (firstBuilding?.x ?? 60) - 30)
  const crossingX = W - 120
  const anchorOf = (a: Tag['anchor']): [number, number] => ({
    road: [W * 0.55, (roadTop + roadBottom) / 2], sidewalk: [buildingX + 40, groundY + 6], crossing: [crossingX + 20, roadBottom],
    stop: [stopX + 6, groundY + 4], building: [buildingX, groundY - 8], curb: [buildingX - 30, roadTop], ground: [buildingX + 60, groundY + 2],
  } as Record<Tag['anchor'], [number, number]>)[a]

  const download = () => {
    const svg = svgRef.current?.cloneNode(true) as SVGSVGElement | undefined
    if (!svg) return
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    svg.setAttribute('width', String(W))
    svg.setAttribute('height', String(H))
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }))
    Object.assign(document.createElement('a'), { href: url, download: `${node.id}-${style}.svg` }).click()
    URL.revokeObjectURL(url)
  }

  return (
    <figure className="flex flex-col gap-2">
      <fieldset className="flex flex-wrap items-center gap-1 text-sm">
        <legend className="sr-only">Picture style</legend>
        {ART_STYLES.map((s) => (
          <label key={s.id} className={cx('min-h-9 cursor-pointer rounded-md border px-3 py-1.5', style === s.id ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink-soft hover:bg-sunken')}>
            <input type="radio" name={`${uid}-art`} value={s.id} checked={style === s.id} onChange={() => choose(s.id)} className="sr-only" />
            {s.label}
          </label>
        ))}
      </fieldset>
      <div
        ref={boxRef}
        className={cx('relative h-[min(70vh,560px)] touch-none overflow-hidden rounded-lg border border-line select-none focus-visible:outline-2 focus-visible:outline-accent', dragging ? 'cursor-grabbing' : 'cursor-grab')}
        style={{ background: look.bg }}
        tabIndex={0}
        role="group"
        aria-label="Streetscape. Zoom with + and −, move with the arrow keys, 0 to reset"
        onKeyDown={onKey}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { drag.current = null; setDragging(false) }}
        onPointerCancel={() => { drag.current = null; setDragging(false) }}
      >
        <div className="absolute right-2 bottom-2 z-10 flex gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <Button aria-label="Zoom in" onClick={() => zoomBy(1.4)}>+</Button>
          <Button aria-label="Zoom out" onClick={() => zoomBy(1 / 1.4)}>−</Button>
          <Button onClick={() => setView({ x: 0, y: 0, k: 1 })}>Reset</Button>
        </div>
        <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`${view.x} ${view.y} ${W / view.k} ${H / view.k}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label={summary} className="block" style={{ fontFamily: 'IBM Plex Sans, system-ui, sans-serif' }}>
          <defs>
            <filter id={`${uid}-wash`} x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={3} seed={7} result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale={7} xChannelSelector="R" yChannelSelector="G" result="bleed" />
              <feGaussianBlur in="bleed" stdDeviation={0.7} />
            </filter>
            <filter id={`${uid}-pencil`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={1} seed={3} result="grain" />
              <feDisplacementMap in="SourceGraphic" in2="grain" scale={2.2} xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx={6} dy={4} stdDeviation={3} floodColor="#6b7178" floodOpacity={0.35} />
            </filter>
            <filter id={`${uid}-paper`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} seed={11} />
              <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.28  0 0 0 0.08 0" />
            </filter>
            <pattern id={`${uid}-hatch`} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width={6} height={6} fill="#ffffff" />
              <line x1={0} y1={0} x2={0} y2={6} stroke="#2f2f2f" strokeWidth={0.6} opacity={0.35} />
            </pattern>
            <pattern id={`${uid}-grid`} width={20} height={20} patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" fill="none" stroke="#2e6a99" strokeWidth={0.6} />
            </pattern>
            <marker id={`${uid}-tick`} viewBox="0 0 10 10" refX={5} refY={5} markerWidth={6} markerHeight={6}><path d="M0 5H10" stroke={look.soft} strokeWidth={1.5} /></marker>
            <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#bcd6e6" stopOpacity={0.55} />
              <stop offset="0.7" stopColor="#f7f1e3" stopOpacity={0} />
            </linearGradient>
          </defs>

          <rect width={W} height={H} fill={look.bg} />
          {style === 'watercolour' && <><rect width={W} height={H} fill={`url(#${uid}-sky)`} /><rect width={W} height={H} filter={`url(#${uid}-paper)`} /></>}
          {style === 'sketch' && <rect width={W} height={H} filter={`url(#${uid}-paper)`} opacity={0.6} />}
          {look.grid && <rect width={W} height={H} fill={`url(#${uid}-grid)`} />}

          {/* stats card */}
          <g>
            <rect x={W - 214} y={14} width={196} height={18 + (stats.length * 16)} rx={style === 'blueprint' ? 0 : 8} fill={style === 'blueprint' ? look.bg : '#ffffff'} fillOpacity={style === 'blueprint' ? 1 : 0.85} stroke={look.line} strokeWidth={0.8} />
            {stats.map(([k, v], i) => (
              <g key={k} fontSize="11.5">
                <text x={W - 204} y={36 + (i * 16)} fill={look.soft}>{k}</text>
                <text x={W - 28} y={36 + (i * 16)} textAnchor="end" fontWeight={600} fill={look.text} className="num">{v}</text>
              </g>
            ))}
          </g>

          {/* street section in front: near sidewalk, curb (with driveway cuts), lanes, far sidewalk */}
          {shape(<rect x={0} y={groundY} width={W} height={12} fill={street.sidewalkNear ? look.ground : look.bg} fillOpacity={style === 'blueprint' ? 0.25 : 0.55} />)}
          {shape(<rect x={0} y={roadTop} width={W} height={roadBottom - roadTop} fill={style === 'blueprint' ? '#0d3456' : style === 'sketch' ? '#ebe9e3' : '#6f7378'} fillOpacity={style === 'watercolour' ? 0.45 : style === 'model' ? 0.35 : 1} />)}
          {shape(<rect x={0} y={roadBottom} width={W} height={10} fill={street.sidewalkFar ? look.ground : look.bg} fillOpacity={style === 'blueprint' ? 0.25 : 0.55} />)}
          <line x1={0} x2={W} y1={groundY} y2={groundY} stroke={look.line} strokeWidth={look.lineW} />
          <line x1={0} x2={W} y1={roadTop} y2={roadTop} stroke={look.line} strokeWidth={look.lineW * 1.4} strokeDasharray={street.accesses ? undefined : undefined} />
          {Array.from({ length: street.accesses }, (_, k) => <rect key={k} x={buildingX - 40 + (k * 22)} y={roadTop - 1} width={12} height={3} fill={look.bg} />)}
          <line x1={0} x2={W} y1={roadBottom} y2={roadBottom} stroke={look.line} strokeWidth={look.lineW * 1.4} />
          {Array.from({ length: street.lanes - 1 }, (_, k) => {
            const y = roadTop + ((k + 1) * laneH)
            const centre = k + 1 === street.lanes / 2
            return <line key={k} x1={0} x2={W} y1={y} y2={y} stroke={centre ? '#e9c46a' : '#f4f4f4'} strokeWidth={centre ? 1.6 : 1} strokeDasharray={centre ? undefined : '14 12'} opacity={style === 'sketch' ? 0.9 : 0.85} />
          })}
          {street.crossingM !== null && Array.from({ length: 6 }, (_, k) => <rect key={k} x={crossingX + (k * 7)} y={roadTop + 1} width={4} height={roadBottom - roadTop - 2} fill={style === 'sketch' ? '#2f2f2f' : '#f4f4f4'} opacity={0.85} />)}
          {street.stopM !== null && (
            <g>
              <line x1={stopX + 6} x2={stopX + 6} y1={groundY + 8} y2={groundY - 34} stroke={look.line} strokeWidth={1.4} />
              <rect x={stopX - 4} y={groundY - 46} width={20} height={14} rx={2} fill="#c8102e" />
              <text x={stopX + 6} y={groundY - 36} textAnchor="middle" fontSize="8" fontWeight={700} fill="#ffffff">TTC</text>
            </g>
          )}
          {/* right of way dimension at the left edge */}
          <g fill={look.soft} fontSize="10">
            <line x1={10} x2={10} y1={groundY} y2={streetBottom} stroke={look.soft} strokeWidth={0.9} markerStart={`url(#${uid}-tick)`} markerEnd={`url(#${uid}-tick)`} />
            <text x={14} y={streetBottom + 13}>{street.rowM ? `ROW ${street.rowM} m` : 'ROW width: check OP Map 3'}</text>
          </g>

          {placed.map((p, k) => {
            if (p.kind === 'building') return <g key={k}>{drawBuilding(p.b, p.x, p.w, k)}</g>
            if (p.kind === 'tree') return <g key={k}>{tree(p.x, k)}</g>
            if (p.kind === 'transit') return <g key={k}>{sign(p.x, p.w, features.transit === 'subway' ? 'TTC' : 'GO', features.transit === 'subway' ? '#c8102e' : '#3a8a2e')}</g>
            if (p.kind === 'park') return (
              <g key={k}>
                {[0, 30, 62, 92].map((dx, t) => <g key={t}>{tree(p.x + dx, (k * 10) + t)}</g>)}
                <text x={p.x + (p.w / 2)} y={groundY - 40} textAnchor="middle" fontSize="11" fontWeight={600} fill={look.text}>Park</text>
              </g>
            )
            return <g key={k}>{sign(p.x, p.w, p.kind === 'school' ? 'SCHOOL' : 'COMMUNITY', style === 'blueprint' ? '#2e6a99' : '#0b5f70')}</g>
          })}

          {/* zoning: dashed height limit across the whole street, notes under it */}
          {limitY !== null && (
            <g>
              <line x1={0} x2={W} y1={limitY} y2={limitY} stroke={look.limit} strokeWidth={2} strokeDasharray="10 6" />
              <rect x={10} y={limitY - 21} width={300} height={17} rx={3} fill={look.bg} fillOpacity={0.85} />
              <text x={16} y={limitY - 8} fontSize="11.5" fontWeight={700} fill={look.limit}>
                Zoning height {zoning!.metres ? `${zoning!.metres} m ≈ ` : '≈ '}{zoning!.storeys} storeys{over ? ` · ${over} over` : ''}
              </text>
            </g>
          )}
          {/* requirement callouts: labelled tags along the bottom, each with a leader to where it applies */}
          {tags.map((t, k) => {
            const tw = Math.min(220, ((W - 40) / perRow) - 12)
            const tx = 20 + ((k % perRow) * (tw + 12))
            const ty = tagsTop + (Math.floor(k / perRow) * 60)
            const [ax, ay] = anchorOf(t.anchor)
            return (
              <g key={t.title}>
                <title>{`${t.title}: ${t.text}`}</title>
                <path d={`M${tx + (tw / 2)},${ty} C${tx + (tw / 2)},${ty - 24} ${ax},${ay + 24} ${ax},${ay}`} fill="none" stroke={look.soft} strokeWidth={0.9} strokeDasharray="3 3" opacity={0.8} />
                <circle cx={ax} cy={ay} r={2.5} fill={look.soft} />
                <rect x={tx} y={ty} width={tw} height={44} rx={style === 'blueprint' ? 0 : 8} fill={style === 'blueprint' ? look.bg : '#ffffff'} fillOpacity={style === 'blueprint' ? 1 : 0.88} stroke={look.line} strokeWidth={0.8} />
                <text x={tx + 9} y={ty + 16} fontSize="11" fontWeight={700} fill={look.text}>{t.title}</text>
                <text x={tx + 9} y={ty + 33} fontSize="10.5" fill={look.soft}>{t.text.length > (tw / 5.6) ? `${t.text.slice(0, Math.floor(tw / 5.6) - 1)}…` : t.text}</text>
              </g>
            )
          })}
          {zoning?.notes.length ? <text x={16} y={H - 14} fontSize="11.5" fill={look.text}>{zoning.notes.join(' · ')}</text> : null}
        </svg>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-mute">
        <span>Drag to move, scroll or use + and − to zoom. Illustration, not to scale; lanes are drawn by street class, not counted. Buildings, parks, transit and roofs come from the pro forma; the dashed line and notes come from the site map's zoning, and they are not a legal building envelope.</span>
        <Button onClick={download}>Download .svg</Button>
      </figcaption>
    </figure>
  )
}

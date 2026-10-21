import { useId, useMemo, useRef, useState, type ReactNode } from 'react'
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

const readStyle = (): ArtStyle => {
  try { const s = localStorage.getItem('gta-proforma:art'); return ART_STYLES.some((x) => x.id === s) ? (s as ArtStyle) : 'watercolour' } catch { return 'watercolour' }
}

export function Streetscape({ node, result, attributes }: { node: Node; result: NodeResult; attributes: Attributes }) {
  const uid = useId().replace(/:/g, '')
  const svgRef = useRef<SVGSVGElement>(null)
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
  const W = Math.max(820, parts.reduce((s, p) => s + p.w + gap, 40))
  const notesH = zoning?.notes.length ? 22 : 0
  const H = 430 + notesH
  const groundY = H - 46 - notesH
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
  const summary = `${ART_STYLES.find((s) => s.id === style)!.label} streetscape of ${node.name}: ${buildings.map((b) => (b.kind === 'lots' ? 'a row of lots' : `${b.storeys}-storey ${b.kind}`)).join(', ')}.${zoning?.storeys ? ` Dashed line: zoning height limit of about ${zoning.storeys} storeys; ${over ? `${over} building${over === 1 ? ' is' : 's are'} taller, so a rezoning is likely` : 'every building fits under it'}.` : ''} ${stats.map(([k, v]) => `${k} ${v}`).join(', ')}.`

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

  const download = () => {
    const svg = svgRef.current
    if (!svg) return
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
      <div className="overflow-x-auto rounded-lg border border-line" tabIndex={0} role="region" aria-label="Streetscape (scrolls sideways)">
        <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={summary} className="block max-w-none" style={{ fontFamily: 'IBM Plex Sans, system-ui, sans-serif' }}>
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

          {/* ground and street */}
          {shape(<rect x={0} y={groundY} width={W} height={8} fill={look.ground} fillOpacity={style === 'blueprint' ? 0.25 : 0.8} />)}
          <line x1={0} x2={W} y1={groundY} y2={groundY} stroke={look.line} strokeWidth={look.lineW} />
          <line x1={0} x2={W} y1={groundY + 22} y2={groundY + 22} stroke={look.soft} strokeWidth={1.2} strokeDasharray="18 14" opacity={0.6} />

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
          {zoning?.notes.length ? <text x={16} y={H - 14} fontSize="11.5" fill={look.text}>{zoning.notes.join(' · ')}</text> : null}
        </svg>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-mute">
        <span>Illustration, not to scale. Buildings, parks, transit and roofs come from the pro forma; the dashed line and notes come from the site map's zoning, and they are not a legal building envelope.</span>
        <Button onClick={download}>Download .svg</Button>
      </figcaption>
    </figure>
  )
}

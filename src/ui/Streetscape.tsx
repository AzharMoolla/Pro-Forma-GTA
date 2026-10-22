import { forwardRef, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Attributes } from '../engine/catalogue'
import type { Node, NodeResult } from '../engine/portfolio'
import { Button, cx } from './components'
import { projectsUnder } from './coverage'
import { metricValue, money, num } from './format'
import { controllingLimit, sceneOf, type Building, type Part, type Scene } from './streetscapeScene'
import { getResult } from './tree'

// A playful, not-to-scale picture of the project: buildings, storeys, podiums, storefronts, roofs, stations, parks and
// schools come from the pro forma; zoning limits and street facts from the site map. Layout lives in
// streetscapeScene.ts; this file only draws. It is an illustration, not a legal envelope or a surveyed layout.

export type ArtStyle = 'sketch' | 'blueprint'
export const ART_STYLES: Array<{ id: ArtStyle; label: string }> = [
  { id: 'sketch', label: 'Pencil sketch' },
  { id: 'blueprint', label: 'Blueprint' },
]

/** Fixed palettes (the picture is a print with its own paper), every text ink ≥ 4.5:1 on its background. */
const LOOKS = {
  sketch: { bg: '#fbfaf6', paper: '#ffffff', ground: '#d8d4ca', road: '#cfccc4', line: '#2f2f2f', lineW: 1.25, glass: '#d9e4ea', text: '#262626', soft: '#555049', limit: '#b0281a', air: '#1f5fa8', green: '#3f6b3a', water: '#4a90b8', ttc: '#c8102e', go: '#3a7d2c', accent: '#8a5a2b' },
  blueprint: { bg: '#123f66', paper: '#123f66', ground: '#1d5486', road: '#0d3456', line: '#e6f1fb', lineW: 1.05, glass: '#1b4f7d', text: '#e6f1fb', soft: '#b7d3ec', limit: '#ffd166', air: '#8fd3ff', green: '#9fe0b7', water: '#7cc4f2', ttc: '#ff8a8a', go: '#9fe0b7', accent: '#ffd166' },
} as const
type Look = (typeof LOOKS)[ArtStyle]

const FLOOR_H = 3.2 // drawing units per storey before scaling
const GROUND_Y = 384

const seeded = (seed: string) => {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return (i: number) => ((((Math.sin(h + (i * 12.9898)) * 43758.5453) % 1) + 1) % 1)
}

export interface SvgProps { scene: Scene; style: ArtStyle; stats: Array<[string, string]>; title: string; uid: string; viewBox?: string }

/** Zoning notes wrapped to the picture width (about 6.3 drawing units per character at 11.5 px). */
export function noteLines(scene: Scene): string[] {
  const budget = Math.floor((scene.W - 32) / 6.3)
  const lines: string[] = []
  for (const note of scene.notes) {
    const last = lines.at(-1)
    if (last !== undefined && last.length + note.length + 3 <= budget) lines[lines.length - 1] = `${last} · ${note}`
    else lines.push(note)
  }
  return lines
}

/** Layout height for a scene (street section, requirement boxes and notes below the buildings). */
export function heightOf(scene: Scene) {
  const perRow = Math.max(1, Math.floor((scene.W - 40) / 230))
  const laneH = Math.min(9, 40 / scene.street.lanes)
  const streetBottom = GROUND_Y + 12 + (laneH * scene.street.lanes) + 10
  return { perRow, laneH, streetBottom, tagsTop: streetBottom + 26, H: streetBottom + 26 + (Math.ceil(scene.tags.length / perRow) * 60) + (noteLines(scene).length * 17) + 16 }
}

export function summaryOf(scene: Scene, style: ArtStyle, title: string, stats: Array<[string, string]>) {
  const describe = (b: Building) => (b.kind === 'lots' ? 'a row of lots' : `${b.storeys}-storey ${b.kind}${b.transit ? ' by a station' : ''}`)
  const limits = (scene.uniformLimit ? ` Red dashed line: zoning height limit of about ${scene.uniformLimit} storeys.` : scene.buildings.some((b) => b.limitStoreys) ? ' Red dashed lines: each building\'s zoning height limit.' : '')
    + (scene.uniformAirLimit ? ` Blue dotted line: airport height limit of about ${scene.uniformAirLimit} storeys.` : scene.buildings.some((b) => b.airLimitStoreys) ? ' Blue dotted lines: airport height limits.' : '')
  const over = scene.over.length ? ` ${scene.over.length} building${scene.over.length === 1 ? ' is' : 's are'} taller than the limit, so a rezoning is likely.` : limits ? ' Every building fits under its limit.' : ''
  return `${ART_STYLES.find((s) => s.id === style)!.label} streetscape of ${title}: ${scene.buildings.map(describe).join(', ')}.${limits}${over} ${stats.map(([k, v]) => `${k} ${v}`).join(', ')}.${scene.tags.length ? ` ${scene.tags.map((t) => `${t.title}: ${t.text}`).join('. ')}.` : ''}`
}

/** The drawing alone (no interaction): used by the interactive view and by the stress tests. */
export const StreetscapeSvg = forwardRef<SVGSVGElement, SvgProps>(function StreetscapeSvg({ scene, style, stats, title, uid, viewBox }, ref) {
  const L: Look = LOOKS[style]
  const { W, street, parts } = scene
  const { perRow, laneH, streetBottom, tagsTop, H } = heightOf(scene)
  const roadTop = GROUND_Y + 12
  const roadBottom = roadTop + (laneH * street.lanes)
  const maxStoreys = Math.max(4, ...scene.buildings.map((b) => Math.max(b.storeys + 1.5, b.limitStoreys ?? 0)))
  const floorH = FLOOR_H * Math.min(4, (GROUND_Y - 90) / (maxStoreys * FLOOR_H))
  const rand = seeded(title)
  const pencil = style === 'sketch' ? `url(#${uid}-pencil)` : undefined
  const stroke = { stroke: L.line, strokeWidth: L.lineW, strokeLinejoin: 'round' as const }
  const wall = style === 'sketch' ? `url(#${uid}-hatch)` : L.paper
  const g = (feature: string, children: ReactNode, key?: string | number) => <g key={key} data-feature={feature} filter={pencil}>{children}</g>
  const buildingParts = parts.filter((p): p is Extract<Part, { kind: 'building' }> => p.kind === 'building')
  const firstBuilding = buildingParts[0]
  const crossingX = W - 130

  // ------------------------------------------------------------ pieces

  const storefront = (x: number, w: number, podiumTop: number) => {
    const bays = Math.max(2, Math.floor((w - 8) / 16))
    const bw = (w - 8) / bays
    const glassTop = GROUND_Y - (floorH * 0.82)
    return g('storefront', <>
      <rect x={x + 2} y={podiumTop + 2} width={w - 4} height={Math.max(3, GROUND_Y - podiumTop - (floorH * 1.05))} fill="none" />
      <rect x={x + 2} y={glassTop - (floorH * 0.32)} width={w - 4} height={floorH * 0.22} fill={L.paper} {...stroke} strokeWidth={0.8} />
      <line x1={x} x2={x + w} y1={glassTop - 2} y2={glassTop - 2} {...stroke} strokeWidth={1.6} />
      {Array.from({ length: bays }, (_, k) => (
        <g key={k}>
          <rect x={x + 4 + (k * bw)} y={glassTop} width={bw - 2} height={GROUND_Y - glassTop} fill={L.glass} {...stroke} strokeWidth={0.7} />
          <line x1={x + 4 + (k * bw)} x2={x + 2 + ((k + 1) * bw)} y1={glassTop + ((GROUND_Y - glassTop) * 0.62)} y2={glassTop + ((GROUND_Y - glassTop) * 0.62)} {...stroke} strokeWidth={0.5} />
        </g>
      ))}
    </>)
  }

  const roof = (b: Building, x: number, w: number, top: number, key: string) => (
    <g key={key}>
      {b.kind !== 'townhouse' && g('mechanical', <rect x={x + (w * 0.32)} y={top - (floorH * 1.1)} width={w * 0.36} height={floorH * 1.1} fill={L.paper} {...stroke} />)}
      {b.greenRoof && g('green-roof', Array.from({ length: Math.floor(w / 7) }, (_, k) => <path key={k} d={`M${x + 3 + (k * 7)},${top} q2,-5 4,0`} fill="none" stroke={L.green} strokeWidth={1.2} />))}
      {b.pool && g('pool', <rect x={x + 4} y={top - 3} width={Math.min(26, w * 0.25)} height={3} fill={L.water} />)}
      {b.rooftopAmenity && g('rooftop-amenity', <>
        <line x1={x + (w * 0.72)} x2={x + w - 2} y1={top - 6} y2={top - 6} {...stroke} strokeWidth={0.7} />
        {[0.76, 0.88].map((f) => <path key={f} d={`M${x + (w * f)},${top} v-9 m-5,0 l5,-4 l5,4 z`} fill={L.paper} {...stroke} strokeWidth={0.8} />)}
      </>)}
      {b.solar && g('solar', Array.from({ length: Math.max(1, Math.floor(w * 0.25 / 8)) }, (_, k) => <path key={k} d={`M${x + 4 + (k * 8)},${top} l6,-4`} {...stroke} strokeWidth={2} />))}
    </g>
  )

  const building = (p: Extract<Part, { kind: 'building' }>, i: number) => {
    const { b, x, w } = p
    // label just above whatever is tallest: houses are a fixed size, townhouses have a gable, others a penthouse
    const labelY = b.kind === 'lots' ? GROUND_Y - 40 : b.kind === 'townhouse' ? GROUND_Y - (b.storeys * floorH) - (floorH * 0.9) - 8 : b.kind === 'industrial' ? GROUND_Y - (Math.max(2, b.storeys) * floorH * 1.6) - (floorH * 0.9) - 8 : GROUND_Y - (b.storeys * floorH) - (floorH * 1.4) - 8
    const label = b.label && <text x={x + (w / 2)} y={labelY} textAnchor="middle" fontSize="11" fontWeight={600} fill={L.text}>{b.label}</text>

    if (b.kind === 'lots') {
      return <g key={i} data-building={b.id}>{g('houses', Array.from({ length: 4 }, (_, k) => {
        const hx = x + (k * 32)
        return (
          <g key={k}>
            <path d={`M${hx},${GROUND_Y} v-18 l14,-12 l14,12 v18 z`} fill={wall} {...stroke} />
            <rect x={hx + 10} y={GROUND_Y - 10} width={8} height={10} fill={L.glass} {...stroke} strokeWidth={0.6} />
          </g>
        )
      }))}{label}</g>
    }

    if (b.kind === 'townhouse') {
      const unitW = w / 3
      const h = b.storeys * floorH
      return (
        <g key={i} data-building={b.id}>
          {g('townhouses', Array.from({ length: 3 }, (_, k) => {
            const ux = x + (k * unitW)
            return (
              <g key={k}>
                <rect x={ux} y={GROUND_Y - h} width={unitW - 2} height={h} fill={wall} {...stroke} />
                <path d={`M${ux - 2},${GROUND_Y - h} l${(unitW / 2) + 1},-${floorH * 0.9} l${(unitW / 2) + 1},${floorH * 0.9}`} fill={L.paper} {...stroke} />
                {Array.from({ length: b.storeys }, (_, f) => <rect key={f} x={ux + (unitW * 0.55)} y={GROUND_Y - ((f + 1) * floorH) + (floorH * 0.25)} width={unitW * 0.3} height={floorH * 0.45} fill={L.glass} {...stroke} strokeWidth={0.6} />)}
                <rect x={ux + 4} y={GROUND_Y - (floorH * 0.85)} width={unitW * 0.22} height={floorH * 0.85} fill={L.paper} {...stroke} strokeWidth={0.8} />
                <path d={`M${ux + 2},${GROUND_Y} h${unitW * 0.3} v-2 h-${unitW * 0.3}`} {...stroke} strokeWidth={0.8} fill="none" />
              </g>
            )
          }))}
          {roof(b, x, w, GROUND_Y - h - (floorH * 0.9), 'roof')}
          {b.childcare && playground(x + w - 10)}
          {label}
        </g>
      )
    }

    if (b.kind === 'industrial') {
      const h = Math.max(2, b.storeys) * floorH * 1.6
      const top = GROUND_Y - h
      return (
        <g key={i} data-building={b.id}>
          {g('industrial', <>
            <rect x={x} y={top} width={w} height={h} fill={wall} {...stroke} />
            <path d={`M${x},${top} ${Array.from({ length: 6 }, () => `l${w / 12},-${floorH * 0.9} v${floorH * 0.9} l${w / 12},0`).join(' ')}`} fill={L.paper} {...stroke} />
            {[0.12, 0.38, 0.64].map((f) => <rect key={f} x={x + (w * f)} y={GROUND_Y - (floorH * 1.3)} width={w * 0.2} height={floorH * 1.3} fill={L.glass} {...stroke} strokeWidth={0.7} />)}
            {[0.12, 0.38, 0.64].map((f) => Array.from({ length: 4 }, (_, k) => <line key={`${f}${k}`} x1={x + (w * f)} x2={x + (w * (f + 0.2))} y1={GROUND_Y - (floorH * 1.3) + (k * floorH * 0.32)} y2={GROUND_Y - (floorH * 1.3) + (k * floorH * 0.32)} {...stroke} strokeWidth={0.5} />))}
          </>)}
          {roof(b, x, w, top - (floorH * 0.9), 'roof')}
          {label}
        </g>
      )
    }

    const podiumW = w
    const towerW = b.podium ? w - 26 : w
    const towerX = x + ((podiumW - towerW) / 2)
    const height = b.storeys * floorH
    const podiumH = b.podium * floorH
    const top = GROUND_Y - height
    const step = b.storeys > 45 ? 3 : b.storeys > 24 ? 2 : 1
    const cols = Math.max(2, Math.floor(towerW / 14))
    const towerFloors = Math.floor((b.storeys - b.podium) / step)
    const limitY = b.limitStoreys ? GROUND_Y - (b.limitStoreys * floorH) : null
    const airY = b.airLimitStoreys ? GROUND_Y - (b.airLimitStoreys * floorH) : null
    const control = controllingLimit(b)
    const controlY = control ? GROUND_Y - (control * floorH) : null

    return (
      <g key={i} data-building={b.id} data-kind={b.kind}>
        {g('tower', <rect x={towerX} y={top} width={towerW} height={height - podiumH} fill={wall} {...stroke} strokeWidth={L.lineW * 1.25} />)}
        {Array.from({ length: towerFloors }, (_, f) => {
          const y = top + (f * floorH * step)
          return (
            <g key={f}>
              {f > 0 && <line x1={towerX + 1} x2={towerX + towerW - 1} y1={y} y2={y} stroke={L.line} strokeWidth={0.45} opacity={0.5} />}
              {b.kind === 'office' || b.kind === 'institutional'
                ? <rect x={towerX + 4} y={y + (floorH * step * 0.2)} width={towerW - 8} height={Math.max(1.2, floorH * step * 0.55)} fill={L.glass} opacity={0.9} />
                : Array.from({ length: cols }, (_, c) => (rand((i * 997) + (f * 31) + c) > 0.66 ? null : (
                  <rect key={c} x={towerX + 5 + (c * ((towerW - 10) / cols))} y={y + (floorH * step * 0.3)} width={Math.max(2.5, ((towerW - 10) / cols) - 4)} height={Math.max(1.5, floorH * 0.5)} fill={L.glass} stroke={L.line} strokeWidth={0.35} />
                )))}
            </g>
          )
        })}
        {b.kind === 'office' && g('curtain-wall', Array.from({ length: Math.max(2, Math.floor(towerW / 12)) }, (_, c) => <line key={c} x1={towerX + ((c + 1) * (towerW / (Math.floor(towerW / 12) + 1)))} x2={towerX + ((c + 1) * (towerW / (Math.floor(towerW / 12) + 1)))} y1={top + 2} y2={GROUND_Y - podiumH - 2} stroke={L.line} strokeWidth={0.5} opacity={0.6} />))}
        {b.balconies && g('balconies', Array.from({ length: towerFloors }, (_, f) => {
          const y = top + ((f + 0.85) * floorH * step)
          return <g key={f}><line x1={towerX - 4} x2={towerX + 8} y1={y} y2={y} {...stroke} strokeWidth={1.1} /><line x1={towerX + towerW - 8} x2={towerX + towerW + 4} y1={y} y2={y} {...stroke} strokeWidth={1.1} /></g>
        }))}
        {roof(b, towerX, towerW, top, 'roof')}
        {b.podium > 0 && g('podium', <rect x={x} y={GROUND_Y - podiumH} width={podiumW} height={podiumH} fill={b.heritage ? `url(#${uid}-brick)` : L.paper} {...stroke} strokeWidth={L.lineW * 1.25} />)}
        {b.heritage && g('heritage', Array.from({ length: Math.max(2, Math.floor(podiumW / 22)) }, (_, k) => {
          const ax = x + 6 + (k * ((podiumW - 12) / Math.max(2, Math.floor(podiumW / 22))))
          const ay = GROUND_Y - Math.max(podiumH, floorH * 2) + (floorH * 0.5)
          return <path key={k} d={`M${ax},${ay + (floorH * 0.9)} v-${floorH * 0.5} a5,5 0 0 1 10,0 v${floorH * 0.5} z`} fill={L.glass} {...stroke} strokeWidth={0.7} />
        }))}
        {b.retail ? storefront(x, podiumW, GROUND_Y - podiumH) : g('entrance', <rect x={x + (podiumW / 2) - 6} y={GROUND_Y - Math.min(floorH * 1.2, Math.max(podiumH, floorH))} width={12} height={Math.min(floorH * 1.2, Math.max(podiumH, floorH))} fill={L.glass} {...stroke} strokeWidth={0.8} />)}
        {b.kind === 'institutional' && g('portico', <>
          <path d={`M${x + (podiumW / 2) - 22},${GROUND_Y - (floorH * 1.6)} l22,-${floorH * 0.7} l22,${floorH * 0.7} z`} fill={L.paper} {...stroke} />
          {[-16, -6, 4, 14].map((dx) => <line key={dx} x1={x + (podiumW / 2) + dx} x2={x + (podiumW / 2) + dx} y1={GROUND_Y - (floorH * 1.6)} y2={GROUND_Y} {...stroke} strokeWidth={1.4} />)}
        </>)}
        {b.childcare && playground(x + podiumW + 2)}
        {style === 'blueprint' && (
          <g data-feature="dimension" fontSize="10" fill={L.soft}>
            <line x1={x + podiumW + 4} x2={x + podiumW + 4} y1={top} y2={GROUND_Y} stroke={L.soft} strokeWidth={0.8} markerStart={`url(#${uid}-tick)`} markerEnd={`url(#${uid}-tick)`} />
            <text x={x + podiumW + 7} y={top + 12}>{b.storeys} st</text>
          </g>
        )}
        {/* over the zoning limit: the part above the line is hatched */}
        {controlY !== null && top < controlY && <rect data-feature="over-limit" x={towerX} y={top} width={towerW} height={controlY - top} fill={`url(#${uid}-over)`} />}
        {/* per-building limit when buildings differ */}
        {limitY !== null && scene.uniformLimit === null && (
          <g data-feature="limit-segment">
            <line x1={x - 8} x2={x + w + 8} y1={limitY} y2={limitY} stroke={L.limit} strokeWidth={2} strokeDasharray="8 5" />
            <rect x={x - 2} y={limitY + 3} width={78} height={13} rx={2} fill={L.bg} fillOpacity={0.92} />
            <text x={x + 2} y={limitY + 13} fontSize="10" fontWeight={700} fill={L.limit}>zoning ≤ {b.limitStoreys} st</text>
          </g>
        )}
        {airY !== null && scene.uniformAirLimit === null && (
          <g data-feature="air-limit-segment">
            <line x1={x - 8} x2={x + w + 8} y1={airY} y2={airY} stroke={L.air} strokeWidth={2} strokeDasharray="3 4" />
            <rect x={x - 2} y={airY + 3} width={82} height={13} rx={2} fill={L.bg} fillOpacity={0.92} />
            <text x={x + 2} y={airY + 13} fontSize="10" fontWeight={700} fill={L.air}>airport ≤ {b.airLimitStoreys} st</text>
          </g>
        )}
        {label}
      </g>
    )
  }

  const playground = (px: number) => g('playground', <>
    <path d={`M${px},${GROUND_Y} l7,-16 l7,16 M${px + 3},${GROUND_Y - 8} h8`} fill="none" {...stroke} strokeWidth={1} />
    <path d={`M${px + 7},${GROUND_Y - 16} v8 m-3,0 h6`} {...stroke} strokeWidth={0.8} />
  </>)

  const tree = (tx: number, key: string | number) => g('tree', <>
    <line x1={tx + 13} x2={tx + 13} y1={GROUND_Y} y2={GROUND_Y - 13} stroke={L.line} strokeWidth={1.4} />
    <path d={`M${tx + 13},${GROUND_Y - 36} c-11,2 -13,12 -7,16 c-6,6 4,10 7,6 c3,4 13,0 7,-6 c6,-4 4,-14 -7,-16 z`} fill="none" stroke={L.green} strokeWidth={1.3} />
  </>, key)

  /** A station entrance: glass pavilion with a canopy, stairs going down, and a pylon with the operator's sign. */
  const station = (p: Extract<Part, { kind: 'station' }>, i: number) => {
    const { x, w } = p
    const sub = p.transit === 'subway'
    const colour = sub ? L.ttc : L.go
    const bodyX = x + 22
    const bodyW = w - 26
    const h = Math.max(floorH * 3.2, 26) // stays readable when one very tall tower sets the scale
    return (
      <g key={i} data-feature={sub ? 'subway-station' : 'go-station'}>
        {g('station-pavilion', <>
          <rect x={bodyX} y={GROUND_Y - h} width={bodyW} height={h} fill={L.glass} {...stroke} />
          {Array.from({ length: 4 }, (_, k) => <line key={k} x1={bodyX + ((k + 1) * (bodyW / 5))} x2={bodyX + ((k + 1) * (bodyW / 5))} y1={GROUND_Y - h} y2={GROUND_Y} {...stroke} strokeWidth={0.6} />)}
          <path d={`M${bodyX - 8},${GROUND_Y - h} h${bodyW + 16} v-4 h-${bodyW + 16} z`} fill={L.paper} {...stroke} />
          {/* stairs down, seen through the glass */}
          <path d={`M${bodyX + 6},${GROUND_Y - (h * 0.75)} ${Array.from({ length: 5 }, () => `h5 v${h * 0.15}`).join(' ')}`} fill="none" {...stroke} strokeWidth={0.9} />
        </>)}
        {/* pylon and sign: TTC roundel or GO */}
        <line x1={x + 9} x2={x + 9} y1={GROUND_Y} y2={GROUND_Y - (h * 1.35)} {...stroke} strokeWidth={1.8} />
        {sub
          ? <g><circle cx={x + 9} cy={GROUND_Y - (h * 1.35) - 9} r={10} fill={style === 'sketch' ? colour : 'none'} stroke={colour} strokeWidth={1.6} /><text x={x + 9} y={GROUND_Y - (h * 1.35) - 6} textAnchor="middle" fontSize="7.5" fontWeight={800} fill={style === 'sketch' ? '#ffffff' : colour}>TTC</text></g>
          : <g><rect x={x} y={GROUND_Y - (h * 1.35) - 16} width={20} height={14} rx={3} fill={style === 'sketch' ? colour : 'none'} stroke={colour} strokeWidth={1.4} /><text x={x + 10} y={GROUND_Y - (h * 1.35) - 6} textAnchor="middle" fontSize="8" fontWeight={800} fill={style === 'sketch' ? '#ffffff' : colour}>GO</text></g>}
        <text x={bodyX + (bodyW / 2)} y={GROUND_Y - h - 8} textAnchor="middle" fontSize="9.5" fontWeight={600} fill={L.text}>{sub ? 'Station' : 'GO station'}</text>
      </g>
    )
  }

  const civic = (p: Part, labelText: string, feature: string, i: number) => {
    const h = floorH * (feature === 'school' ? 3 : 2.6)
    return (
      <g key={i} data-feature={feature}>
        {g(feature, <>
          <rect x={p.x} y={GROUND_Y - h} width={p.w} height={h} fill={wall} {...stroke} />
          {feature === 'school' && <path d={`M${p.x + (p.w / 2)},${GROUND_Y - h} v-${floorH * 1.6} l12,4 l-12,4`} fill={L.accent} stroke={L.line} strokeWidth={1} />}
          {feature === 'community' && <path d={`M${p.x - 4},${GROUND_Y - h} q${(p.w / 2) + 4},-${floorH * 1.2} ${p.w + 8},0`} fill="none" {...stroke} />}
          {Array.from({ length: Math.floor(p.w / 18) }, (_, k) => <rect key={k} x={p.x + 6 + (k * 18)} y={GROUND_Y - (h * 0.7)} width={10} height={h * 0.3} fill={L.glass} {...stroke} strokeWidth={0.6} />)}
          <rect x={p.x + (p.w / 2) - 7} y={GROUND_Y - (floorH * 1.1)} width={14} height={floorH * 1.1} fill={L.glass} {...stroke} strokeWidth={0.8} />
        </>)}
        <text x={p.x + (p.w / 2)} y={GROUND_Y - h - 6} textAnchor="middle" fontSize="10" fontWeight={600} fill={L.text}>{labelText}</text>
      </g>
    )
  }

  // ------------------------------------------------------------ picture

  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={viewBox ?? `0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label={summaryOf(scene, style, title, stats)} className="block" style={{ fontFamily: 'IBM Plex Sans, system-ui, sans-serif' }}>
      <defs>
        <filter id={`${uid}-pencil`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={1} seed={3} result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale={2} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id={`${uid}-paper`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} seed={11} />
          <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.28  0 0 0 0.06 0" />
        </filter>
        <pattern id={`${uid}-hatch`} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={6} height={6} fill="#ffffff" />
          <line x1={0} y1={0} x2={0} y2={6} stroke="#2f2f2f" strokeWidth={0.5} opacity={0.3} />
        </pattern>
        <pattern id={`${uid}-brick`} width={12} height={6} patternUnits="userSpaceOnUse">
          <rect width={12} height={6} fill={L.paper} />
          <path d="M0 3H12M0 6H12M6 0V3M0 3V6M12 3V6" stroke={L.line} strokeWidth={0.4} opacity={0.6} />
        </pattern>
        <pattern id={`${uid}-over`} width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <line x1={0} y1={0} x2={0} y2={5} stroke={L.limit} strokeWidth={1.2} opacity={0.55} />
        </pattern>
        <pattern id={`${uid}-grid`} width={20} height={20} patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#2e6a99" strokeWidth={0.6} />
        </pattern>
        <marker id={`${uid}-tick`} viewBox="0 0 10 10" refX={5} refY={5} markerWidth={6} markerHeight={6}><path d="M0 5H10" stroke={L.soft} strokeWidth={1.5} /></marker>
      </defs>

      <rect width={W} height={H} fill={L.bg} />
      {style === 'sketch' && <rect width={W} height={H} filter={`url(#${uid}-paper)`} />}
      {style === 'blueprint' && <rect width={W} height={H} fill={`url(#${uid}-grid)`} />}

      {/* stats card */}
      <g>
        <rect x={W - 214} y={14} width={196} height={18 + (stats.length * 16)} rx={style === 'blueprint' ? 0 : 8} fill={L.paper} fillOpacity={0.9} stroke={L.line} strokeWidth={0.8} />
        {stats.map(([k, v], i) => (
          <g key={k} fontSize="11.5">
            <text x={W - 204} y={36 + (i * 16)} fill={L.soft}>{k}</text>
            <text x={W - 28} y={36 + (i * 16)} textAnchor="end" fontWeight={600} fill={L.text}>{v}</text>
          </g>
        ))}
      </g>

      {/* street section in front: sidewalk with pavers, boulevard, curb, lanes with arrows, far sidewalk */}
      <g data-feature="sidewalk">
        <rect x={0} y={GROUND_Y} width={W} height={8} fill={street.sidewalkNear ? L.ground : L.bg} />
        {street.sidewalkNear && Array.from({ length: Math.floor(W / 14) }, (_, k) => <line key={k} x1={k * 14} x2={k * 14} y1={GROUND_Y} y2={GROUND_Y + 8} stroke={L.line} strokeWidth={0.35} opacity={0.5} />)}
        <rect x={0} y={GROUND_Y + 8} width={W} height={3} fill={style === 'sketch' ? '#c7d6bf' : '#2c6a5a'} />
      </g>
      <rect data-feature="curb" x={0} y={roadTop - 1.5} width={W} height={2.5} fill={L.paper} stroke={L.line} strokeWidth={0.6} />
      <rect x={0} y={roadTop + 1} width={W} height={roadBottom - roadTop - 1} fill={L.road} />
      {style === 'sketch' && <rect x={0} y={roadTop + 1} width={W} height={roadBottom - roadTop - 1} filter={`url(#${uid}-paper)`} />}
      <rect x={0} y={roadBottom} width={W} height={10} fill={street.sidewalkFar ? L.ground : L.bg} />
      {street.sidewalkFar && Array.from({ length: Math.floor(W / 14) }, (_, k) => <line key={k} x1={(k * 14) + 7} x2={(k * 14) + 7} y1={roadBottom} y2={roadBottom + 10} stroke={L.line} strokeWidth={0.35} opacity={0.5} />)}
      <line x1={0} x2={W} y1={GROUND_Y} y2={GROUND_Y} stroke={L.line} strokeWidth={L.lineW} />
      <line x1={0} x2={W} y1={roadBottom} y2={roadBottom} stroke={L.line} strokeWidth={L.lineW * 1.2} />
      {firstBuilding && Array.from({ length: street.accesses }, (_, k) => <rect key={k} data-feature="driveway" x={firstBuilding.x + 8 + (k * 22)} y={GROUND_Y + 8} width={14} height={roadTop - GROUND_Y - 6} fill={L.road} stroke={L.line} strokeWidth={0.5} />)}
      {Array.from({ length: street.lanes - 1 }, (_, k) => {
        const y = roadTop + ((k + 1) * laneH)
        const centre = k + 1 === street.lanes / 2
        const yellow = style === 'sketch' ? '#b8860b' : L.limit
        return centre
          ? <g key={k}><line x1={0} x2={W} y1={y - 0.9} y2={y - 0.9} stroke={yellow} strokeWidth={0.8} /><line x1={0} x2={W} y1={y + 0.9} y2={y + 0.9} stroke={yellow} strokeWidth={0.8} /></g>
          : <line key={k} x1={0} x2={W} y1={y} y2={y} stroke={style === 'sketch' ? '#ffffff' : L.line} strokeWidth={1} strokeDasharray="14 12" opacity={0.9} />
      })}
      {/* direction arrows and manholes */}
      {Array.from({ length: street.lanes }, (_, k) => {
        const y = roadTop + ((k + 0.5) * laneH)
        const east = k >= street.lanes / 2
        return Array.from({ length: Math.floor(W / 420) }, (_, j) => {
          const ax = 200 + (j * 420) + (k * 37)
          return <path key={`${k}-${j}`} d={east ? `M${ax},${y} h12 m-4,-2 l4,2 l-4,2` : `M${ax + 12},${y} h-12 m4,-2 l-4,2 l4,2`} fill="none" stroke={style === 'sketch' ? '#ffffff' : L.line} strokeWidth={1} opacity={0.85} />
        })
      })}
      {Array.from({ length: Math.floor(W / 300) }, (_, j) => <ellipse key={j} cx={140 + (j * 300)} cy={roadTop + (laneH * 0.5)} rx={3.5} ry={1.6} fill="none" stroke={L.line} strokeWidth={0.6} />)}
      {/* a few generic cars, so it reads as a street */}
      {Array.from({ length: Math.max(1, Math.floor(W / 520)) }, (_, j) => {
        const cx = 320 + (j * 520)
        const cy = roadTop + (laneH * (street.lanes > 2 ? 1.5 : 0.5))
        return <g key={j} data-feature="car" filter={pencil}><rect x={cx} y={cy - 2.6} width={18} height={5.2} rx={2} fill={L.paper} stroke={L.line} strokeWidth={0.8} /><rect x={cx + 5} y={cy - 1.8} width={6} height={3.6} fill={L.glass} stroke={L.line} strokeWidth={0.4} /></g>
      })}
      {/* crosswalk: stop bars and a ladder of bars across every lane, labelled */}
      {street.crossingM !== null && (
        <g data-feature="crosswalk">
          <rect x={crossingX - 6} y={roadTop + 1} width={2} height={roadBottom - roadTop - 2} fill={style === 'sketch' ? '#ffffff' : L.line} stroke={L.line} strokeWidth={0.3} />
          <rect x={crossingX + 48} y={roadTop + 1} width={2} height={roadBottom - roadTop - 2} fill={style === 'sketch' ? '#ffffff' : L.line} stroke={L.line} strokeWidth={0.3} />
          {Array.from({ length: Math.max(3, street.lanes * 2) }, (_, k) => {
            const bh = (roadBottom - roadTop - 2) / Math.max(3, street.lanes * 2)
            return <rect key={k} x={crossingX} y={roadTop + 1 + (k * bh) + (bh * 0.15)} width={42} height={bh * 0.6} fill={style === 'sketch' ? '#ffffff' : 'none'} stroke={L.line} strokeWidth={0.5} />
          })}
          <text x={crossingX + 21} y={roadBottom + 22} textAnchor="middle" fontSize="9.5" fill={L.soft}>{`nearest crossing ${street.crossingM} m away`}</text>
        </g>
      )}
      <g fill={L.soft} fontSize="10">
        <line x1={12} x2={12} y1={GROUND_Y} y2={streetBottom} stroke={L.soft} strokeWidth={0.9} markerStart={`url(#${uid}-tick)`} markerEnd={`url(#${uid}-tick)`} />
        <text x={16} y={streetBottom + 13}>{street.rowM ? `ROW ${street.rowM} m` : 'ROW width: check OP Map 3'}</text>
      </g>

      {parts.map((p, i) => {
        if (p.kind === 'building') return building(p, i)
        if (p.kind === 'station') return station(p, i)
        if (p.kind === 'tree') return tree(p.x, i)
        if (p.kind === 'park') return (
          <g key={i} data-feature="park">
            {[0, 30, 62, 92].map((dx, t) => tree(p.x + dx, t))}
            <path d={`M${p.x + 40},${GROUND_Y} v-7 h22 v7 M${p.x + 38},${GROUND_Y - 7} h26`} fill="none" stroke={L.line} strokeWidth={1} />
            <text x={p.x + (p.w / 2)} y={GROUND_Y - 44} textAnchor="middle" fontSize="11" fontWeight={600} fill={L.text}>Park</text>
          </g>
        )
        return civic(p, p.kind === 'school' ? 'School' : 'Community centre', p.kind, i)
      })}

      {/* one zoning limit for everything: a single line across */}
      {scene.uniformLimit !== null && (() => {
        const y = GROUND_Y - (scene.uniformLimit * floorH)
        const b = scene.buildings.find((x) => x.limitStoreys === scene.uniformLimit)!
        return (
          <g data-feature="limit-line">
            <line x1={0} x2={W} y1={y} y2={y} stroke={L.limit} strokeWidth={2} strokeDasharray="10 6" />
            <rect x={10} y={y - 21} width={300} height={17} rx={3} fill={L.bg} fillOpacity={0.9} />
            <text x={16} y={y - 8} fontSize="11.5" fontWeight={700} fill={L.limit}>
              Zoning height {b.limitMetres ? `${b.limitMetres} m ≈ ` : '≈ '}{scene.uniformLimit} storeys{scene.over.length ? ` · ${scene.over.length} over` : ''}
            </text>
          </g>
        )
      })()}

      {scene.uniformAirLimit !== null && (() => {
        const y = GROUND_Y - (scene.uniformAirLimit * floorH)
        const b = scene.buildings.find((x) => x.airLimitStoreys === scene.uniformAirLimit)!
        return (
          <g data-feature="air-limit-line">
            <line x1={0} x2={W} y1={y} y2={y} stroke={L.air} strokeWidth={2} strokeDasharray="3 4" />
            <rect x={W - 330} y={y - 21} width={320} height={17} rx={3} fill={L.bg} fillOpacity={0.9} />
            <text x={W - 16} y={y - 8} textAnchor="end" fontSize="11.5" fontWeight={700} fill={L.air}>Airport height limit {b.airLimitMetres} m ≈ {scene.uniformAirLimit} storeys</text>
          </g>
        )
      })()}

      {/* not a drawing: said on the picture itself so it travels with downloads */}
      <text x={16} y={22} fontSize="10.5" fill={L.soft} data-feature="disclaimer">Illustration only · not to scale · not a building envelope, survey or approval</text>

      {/* requirements, listed along the bottom */}
      {scene.tags.map((t, k) => {
        const tw = Math.min(220, ((W - 40) / perRow) - 12)
        const tx = 20 + ((k % perRow) * (tw + 12))
        const ty = tagsTop + (Math.floor(k / perRow) * 60)
        return (
          <g key={t.title} data-feature="tag">
            <title>{`${t.title}: ${t.text}`}</title>
            <rect x={tx} y={ty} width={tw} height={44} rx={style === 'blueprint' ? 0 : 8} fill={L.paper} fillOpacity={0.9} stroke={L.line} strokeWidth={0.8} />
            <text x={tx + 9} y={ty + 16} fontSize="11" fontWeight={700} fill={L.text}>{t.title}</text>
            <text x={tx + 9} y={ty + 33} fontSize="10.5" fill={L.soft}>{t.text.length > (tw / 5.6) ? `${t.text.slice(0, Math.floor(tw / 5.6) - 1)}…` : t.text}</text>
          </g>
        )
      })}
      {noteLines(scene).map((line, k, all) => <text key={k} x={16} y={H - 14 - ((all.length - 1 - k) * 17)} fontSize="11.5" fill={L.text}>{line}</text>)}
    </svg>
  )
})

const readStyle = (): ArtStyle => {
  try { const s = localStorage.getItem('gta-proforma:art'); return ART_STYLES.some((x) => x.id === s) ? (s as ArtStyle) : 'sketch' } catch { return 'sketch' }
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
    return sceneOf(projects.map(({ path, project }) => ({ path, project, label: multi ? money((path.length ? getResult(result, path) : result).metrics.profit?.value) : undefined })), attributes)
  }, [node, result, attributes])
  const { W, H } = { W: scene.W, H: heightOf(scene).H }
  const m = result.metrics
  const stats: Array<[string, string]> = [['Homes', num(m.totalUnits?.value)], ['Total cost', metricValue(m.totalDevelopmentCost)], ['Profit', metricValue(m.profit)], ['Profit on cost', metricValue(m.profitOnCost)]]

  // Zoom and pan: the view is a window (x, y, zoom k ≥ 1) onto the whole W × H drawing
  const clampView = (v: { x: number; y: number; k: number }) => {
    const k = Math.min(12, Math.max(1, v.k))
    return { k, x: Math.min(W - (W / k), Math.max(0, v.x)), y: Math.min(H - (H / k), Math.max(0, v.y)) }
  }
  const zoomAround = (factor: number, px: number, py: number) =>
    setView((v) => { const k = Math.min(12, Math.max(1, v.k * factor)); return clampView({ k, x: px - ((px - v.x) * (v.k / k)), y: py - ((py - v.y) * (v.k / k)) }) })
  const zoomBy = (factor: number) => zoomAround(factor, view.x + (W / view.k / 2), view.y + (H / view.k / 2))
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
        style={{ background: LOOKS[style].bg }}
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
        <StreetscapeSvg ref={svgRef} scene={scene} style={style} stats={stats} title={node.name} uid={uid} viewBox={`${view.x} ${view.y} ${W / view.k} ${H / view.k}`} />
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-mute">
        <span>Drag to move, scroll or use + and − to zoom. Illustration, not to scale; lanes are drawn by street class, not counted. Buildings, roofs, storefronts and stations come from the pro forma; the dashed lines and notes come from the site map's zoning (hatched where a building is over), and they are not a legal building envelope.</span>
        <Button onClick={download}>Download .svg</Button>
      </figcaption>
    </figure>
  )
}

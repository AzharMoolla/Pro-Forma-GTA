import { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Attributes } from '../engine/catalogue'
import type { Node, NodeResult } from '../engine/portfolio'
import { Button, cx } from './components'
import { projectsUnder } from './coverage'
import { metricValue, money, num } from './format'
import { buildingKey, GROUND_Y, KIT_MARGIN, kitArt, kitLayout, limitMetresOf, metresOf, px, py, type KitLayout } from './kitStreetscape'
import { controllingLimit, sceneOf, type Building, type Scene } from './streetscapeScene'
import { getResult } from './tree'
import { useWorkspace } from './workspace'

// A picture of the project assembled from the component kit (src/design-lab/components.ts): buildings, podiums,
// storefronts, roofs, stations, parks and schools come from the pro forma; zoning limits and street facts from the site
// map. Layout lives in streetscapeScene.ts and kitStreetscape.ts; this file adds the lines and words on top. It is an
// illustration, not a legal envelope or a surveyed layout.

export type ArtStyle = 'sketch' | 'blueprint'
export const ART_STYLES: Array<{ id: ArtStyle; label: string }> = [
  { id: 'sketch', label: 'Pencil sketch' },
  { id: 'blueprint', label: 'Blueprint' },
]

/** Text and line inks over the kit's papers, every text ink ≥ 4.5:1 on its background. */
const LOOKS = {
  sketch: { bg: '#faf8f1', paper: '#ffffff', line: '#2f2f2f', text: '#262626', soft: '#555049', limit: '#b0281a', air: '#1f5fa8' },
  blueprint: { bg: '#123958', paper: '#123958', line: '#e6f1fb', text: '#e6f1fb', soft: '#b7d3ec', limit: '#ffd166', air: '#8fd3ff' },
} as const
const skinOf = (style: ArtStyle) => (style === 'sketch' ? 'watercolour' : 'blueprint')

export interface SvgProps { scene: Scene; style: ArtStyle; stats: Array<[string, string]>; title: string; uid: string; viewBox?: string; /** data-building key of the spotlit building */ selected?: string | null }

/** Zoning notes wrapped to the picture width (about 6.3 drawing units per character at 11.5 px). */
export function noteLines(scene: Scene, W = kitLayout(scene).W): string[] {
  const budget = Math.floor((W - 32) / 6.3)
  const lines: string[] = []
  for (const note of scene.notes) {
    const last = lines.at(-1)
    if (last !== undefined && last.length + note.length + 3 <= budget) lines[lines.length - 1] = `${last} · ${note}`
    else lines.push(note)
  }
  return lines
}

/** Layout for a scene: the kit layout, then requirement boxes and notes below the street. */
export function heightOf(scene: Scene, K: KitLayout = kitLayout(scene)) {
  const perRow = Math.max(1, Math.floor((K.W - 40) / 230))
  const tagsTop = K.streetBottom + 30
  return { K, W: K.W, perRow, streetBottom: K.streetBottom, tagsTop, H: tagsTop + (Math.ceil(scene.tags.length / perRow) * 60) + (noteLines(scene, K.W).length * 17) + 16 }
}

export function summaryOf(scene: Scene, style: ArtStyle, title: string, stats: Array<[string, string]>) {
  const describe = (b: Building) => (b.kind === 'lots' ? 'a row of lots' : `${b.storeys}-storey ${b.kind}${b.transit ? ' by a station' : ''}`)
  const limits = (scene.uniformLimit ? ` Dashed line: zoning height limit of about ${scene.uniformLimit} storeys.` : scene.buildings.some((b) => b.limitStoreys) ? ' Dashed lines: each building\'s zoning height limit.' : '')
    + (scene.uniformAirLimit ? ` Dotted line: airport height limit of about ${scene.uniformAirLimit} storeys.` : scene.buildings.some((b) => b.airLimitStoreys) ? ' Dotted lines: airport height limits.' : '')
  const over = scene.over.length ? ` ${scene.over.length} building${scene.over.length === 1 ? ' is' : 's are'} taller than the limit (hatched), so a rezoning is likely.` : limits ? ' Every building fits under its limit.' : ''
  return `${ART_STYLES.find((s) => s.id === style)!.label} streetscape of ${title}: ${scene.buildings.map(describe).join(', ')}.${limits}${over} ${stats.map(([k, v]) => `${k} ${v}`).join(', ')}.${scene.tags.length ? ` ${scene.tags.map((t) => `${t.title}: ${t.text}`).join('. ')}.` : ''}`
}

/** Spotlight glow: warm window-light gold, the same in both styles. */
const GLOW = '#ffd36b'

/** The drawing alone (no interaction): used by the interactive view, the report and the stress tests. */
export const StreetscapeSvg = forwardRef<SVGSVGElement, SvgProps>(function StreetscapeSvg({ scene, style, stats, title, uid, viewBox, selected = null }, ref) {
  const L = LOOKS[style]
  const { K, W, perRow, tagsTop, H } = heightOf(scene)
  // The spotlit building gets an id so the window shine can be masked to its silhouette
  const art = selected ? kitArt(scene, skinOf(style), uid, K).replace(`data-building="${selected}"`, `data-building="${selected}" id="${uid}-spot"`) : kitArt(scene, skinOf(style), uid, K)
  const buildings = K.placed.filter((q): q is typeof q & { part: Extract<Scene['parts'][number], { kind: 'building' }> } => q.part.kind === 'building')
  const stations = K.placed.filter((q) => q.part.kind === 'station')
  const uniformY = (storeys: number | null, metres: number | null) => { const m = limitMetresOf(storeys, metres); return m === null ? null : py(K, m) }
  const firstLimitMetres = scene.buildings.find((b) => b.limitStoreys === scene.uniformLimit)?.limitMetres ?? null
  const firstAirMetres = scene.buildings.find((b) => b.airLimitStoreys === scene.uniformAirLimit)?.airLimitMetres ?? null
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={viewBox ?? `0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label={summaryOf(scene, style, title, stats)} className="block" style={{ fontFamily: 'IBM Plex Sans, system-ui, sans-serif' }}>
      <defs>
        <pattern id={`${uid}-over`} width={5} height={5} patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <line x1={0} y1={0} x2={0} y2={5} stroke={L.limit} strokeWidth={1.2} opacity={0.6} />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={L.bg} />
      {/* Spotlight: the night falls on everything else; the selected building glows and a light sweeps across its glass */}
      {selected && <style>{`#${uid}-art > :not([data-building="${selected}"]):not(defs) { filter: brightness(.4) saturate(.55); transition: filter .25s }
#${uid}-art > [data-building="${selected}"] { filter: drop-shadow(0 0 .25px ${GLOW}) drop-shadow(0 0 1.6px ${GLOW}cc) }
@media (prefers-reduced-motion: reduce) { .${uid}-shine { display: none } }`}</style>}
      {selected && <rect width={W} height={H} fill="#050a14" opacity={0.45} pointerEvents="none" />}
      <g id={`${uid}-art`} transform={`translate(${KIT_MARGIN} ${GROUND_Y}) scale(${K.S})`} dangerouslySetInnerHTML={{ __html: art }} />
      {selected && (() => {
        const q = buildings.find(({ part }) => buildingKey(part.b.id) === selected)
        if (!q) return null
        return (
          <g data-feature="spotlight" transform={`translate(${KIT_MARGIN} ${GROUND_Y}) scale(${K.S})`} pointerEvents="none">
            <defs>
              <mask id={`${uid}-spot-mask`} maskUnits="userSpaceOnUse"><use href={`#${uid}-spot`} style={{ filter: 'brightness(0) invert(1)' }} /></mask>
              {/* Diagonal in the building's own box, so the sweep spans its full height however tall it is */}
              <linearGradient id={`${uid}-shine`} x1="0" y1="1" x2="1" y2="0">
                <stop offset=".38" stopColor="#fff" stopOpacity={0} />
                <stop offset=".5" stopColor="#fff" stopOpacity={0.6} />
                <stop offset=".62" stopColor="#fff" stopOpacity={0} />
                <animateTransform attributeName="gradientTransform" type="translate" values="-1 0;1 0;1 0" keyTimes="0;.55;1" dur="3.6s" repeatCount="indefinite" />
              </linearGradient>
            </defs>
            <g mask={`url(#${uid}-spot-mask)`}>
              <rect className={`${uid}-shine`} x={q.x} y={-q.top} width={q.w} height={q.top} fill={`url(#${uid}-shine)`} style={{ mixBlendMode: 'screen' }} />
            </g>
          </g>
        )
      })()}

      {/* Over the controlling limit: the part of each building above it is hatched */}
      {buildings.map(({ part: { b }, x, w }) => {
        const limit = controllingLimit(b)
        if (limit === null || b.storeys <= limit || b.kind === 'lots') return null
        const top = py(K, metresOf(b)), cut = py(K, limit * 3)
        return (
          <g key={b.id} data-feature="over-limit">
            <rect x={px(K, x)} y={top} width={w * K.S} height={cut - top} fill={L.limit} fillOpacity={0.14} />
            <rect x={px(K, x)} y={top} width={w * K.S} height={cut - top} fill={`url(#${uid}-over)`} />
          </g>
        )
      })}

      {/* One limit for everything: a single line across; otherwise a segment per building */}
      {scene.uniformLimit !== null && (() => {
        const y = uniformY(scene.uniformLimit, firstLimitMetres)!
        return (
          <g data-feature="limit-line">
            <line x1={0} x2={W} y1={y} y2={y} stroke={L.limit} strokeWidth={2} strokeDasharray="10 6" />
            <rect x={10} y={y - 21} width={300} height={17} rx={3} fill={L.bg} fillOpacity={0.9} />
            <text x={16} y={y - 8} fontSize="11.5" fontWeight={700} fill={L.limit}>Zoning height {firstLimitMetres ? `${firstLimitMetres} m ≈ ` : '≈ '}{scene.uniformLimit} storeys{scene.over.length ? ` · ${scene.over.length} over` : ''}</text>
          </g>
        )
      })()}
      {scene.uniformAirLimit !== null && (() => {
        const y = uniformY(scene.uniformAirLimit, firstAirMetres)!
        return (
          <g data-feature="air-limit-line">
            <line x1={0} x2={W} y1={y} y2={y} stroke={L.air} strokeWidth={2} strokeDasharray="3 4" />
            <rect x={W - 330} y={y - 21} width={320} height={17} rx={3} fill={L.bg} fillOpacity={0.9} />
            <text x={W - 16} y={y - 8} textAnchor="end" fontSize="11.5" fontWeight={700} fill={L.air}>Airport height limit {firstAirMetres} m ≈ {scene.uniformAirLimit} storeys</text>
          </g>
        )
      })()}
      {buildings.map(({ part: { b }, x, w, top }) => {
        const x0 = px(K, x) - 4, x1 = px(K, x + w) + 4
        const zy = scene.uniformLimit === null ? uniformY(b.limitStoreys, b.limitMetres) : null
        const ay = scene.uniformAirLimit === null ? uniformY(b.airLimitStoreys, b.airLimitMetres) : null
        return (
          <g key={b.id}>
            {zy !== null && (
              <g data-feature="limit-segment">
                <line x1={x0} x2={x1} y1={zy} y2={zy} stroke={L.limit} strokeWidth={2} strokeDasharray="8 5" />
                <rect x={x0 + 2} y={zy + 3} width={78} height={13} rx={2} fill={L.bg} fillOpacity={0.92} />
                <text x={x0 + 6} y={zy + 13} fontSize="10" fontWeight={700} fill={L.limit}>zoning ≤ {b.limitStoreys} st</text>
              </g>
            )}
            {ay !== null && (
              <g data-feature="air-limit-segment">
                <line x1={x0} x2={x1} y1={ay} y2={ay} stroke={L.air} strokeWidth={2} strokeDasharray="3 4" />
                <rect x={x0 + 2} y={ay + 3} width={82} height={13} rx={2} fill={L.bg} fillOpacity={0.92} />
                <text x={x0 + 6} y={ay + 13} fontSize="10" fontWeight={700} fill={L.air}>airport ≤ {b.airLimitStoreys} st</text>
              </g>
            )}
            {b.label && <text x={px(K, x + (w / 2))} y={Math.max(14, py(K, top) - 6)} textAnchor="middle" fontSize="11" fontWeight={600} fill={L.text}>{b.label}</text>}
          </g>
        )
      })}
      {stations.map(({ part, x, w, top }) => (
        <text key={x} x={px(K, x + (w / 2))} y={py(K, top) - 6} textAnchor="middle" fontSize="10" fontWeight={600} fill={L.text}>{part.kind === 'station' && part.transit === 'subway' ? 'Subway entrance' : 'GO station'}</text>
      ))}

      {/* Right-of-way marker beside the street */}
      <g fontSize="10.5" fill={L.soft}>
        <line x1={12} x2={12} y1={GROUND_Y} y2={K.streetBottom} stroke={L.soft} strokeWidth={0.9} />
        <text x={16} y={K.streetBottom + 14}>{scene.street.rowM ? `ROW ${scene.street.rowM} m` : 'ROW width: check OP Map 3'}{scene.street.roadClass ? ` · ${scene.street.roadClass}` : ''}</text>
      </g>

      {/* Not a drawing: said on the picture itself so it travels with downloads */}
      <text x={16} y={22} fontSize="10.5" fill={L.soft} data-feature="disclaimer">Illustration only · not to scale horizontally · not a building envelope, survey or approval</text>

      {/* Requirements, listed along the bottom */}
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
      {noteLines(scene, W).map((line, k, all) => <text key={k} x={16} y={H - 14 - ((all.length - 1 - k) * 17)} fontSize="11.5" fill={L.text}>{line}</text>)}
    </svg>
  )
})

const readStyle = (): ArtStyle => {
  try { const s = localStorage.getItem('gta-proforma:art'); return ART_STYLES.some((x) => x.id === s) ? (s as ArtStyle) : 'sketch' } catch { return 'sketch' }
}

const KIND_LABEL: Record<Building['kind'], string> = { tower: 'Tower', midrise: 'Mid-rise', townhouse: 'Townhouses', office: 'Office', industrial: 'Industrial', institutional: 'Civic', lots: 'Serviced lots' }

/** Key numbers for the spotlit building: what it is, how it sits against its limits, and what it earns. */
function BuildingCard({ b, r, onClose, onEdit }: { b: Building; r: NodeResult; onClose: () => void; onEdit: () => void }) {
  const limit = controllingLimit(b)
  const over = limit !== null && b.storeys > limit ? b.storeys - limit : 0
  const m = r.metrics
  const features = [b.retail && 'retail at grade', b.balconies && 'balconies', b.greenRoof && 'green roof', b.solar && 'solar', b.pool && 'pool', b.rooftopAmenity && 'rooftop amenity', b.childcare && 'childcare', b.heritage && 'heritage', b.transit === 'subway' && 'by the subway', b.transit === 'go' && 'by GO'].filter(Boolean) as string[]
  const rows: Array<[string, string]> = [
    ['Units', num(m.totalUnits?.value)],
    ['Total development cost', metricValue(m.totalDevelopmentCost)],
    ['Profit', metricValue(m.profit)],
    ['Profit on cost', metricValue(m.profitOnCost)],
  ]
  return (
    <div role="dialog" aria-label={`${b.name}: key numbers`} className="absolute top-2 left-2 z-10 w-72 rounded-lg border border-[#ffd36b]/40 bg-[#0b1220]/95 p-3 text-sm text-white shadow-[0_0_24px_rgba(255,211,107,.25)] backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{b.name}</p>
          <p className="text-xs text-white/70">{KIND_LABEL[b.kind]}{b.kind === 'lots' ? '' : ` · ${b.storeys} storeys · about ${b.storeys * 3} m`}{b.podium ? ` · ${b.podium}-storey podium` : ''}</p>
        </div>
        <button type="button" className="min-h-8 rounded px-2 text-white/70 hover:bg-white/10" aria-label="Close" onClick={onClose}>×</button>
      </div>
      {limit !== null && b.kind !== 'lots' && (
        <p className={cx('mt-2 rounded px-2 py-1 text-xs', over ? 'bg-white/10 text-[#ffa391]' : 'bg-white/10 text-[#8ee6a8]')}>
          {over ? `${over} storeys over the ${limit}-storey limit: a rezoning is needed` : `Fits under the ${limit}-storey limit`}
        </p>
      )}
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-xs text-white/70">{k}</dt><dd className="num text-right text-sm font-semibold text-[#ffd36b] [text-shadow:0_0_8px_rgba(255,211,107,.65)]">{v}</dd></div>)}
      </dl>
      {features.length > 0 && <p className="mt-2 text-xs text-white/70">{features.join(' · ')}</p>}
      <button type="button" className="mt-2 text-xs text-[#7dd3fc] underline" onClick={onEdit}>Edit this building</button>
    </div>
  )
}

export function Streetscape({ node, result, attributes }: { node: Node; result: NodeResult; attributes: Attributes }) {
  const uid = useId().replace(/:/g, '')
  const svgRef = useRef<SVGSVGElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ cx: number; cy: number; x: number; y: number; moved: boolean } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const { state, dispatch } = useWorkspace()
  const [dragging, setDragging] = useState(false)
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const [style, setStyle] = useState<ArtStyle>(readStyle)
  const choose = (s: ArtStyle) => { setStyle(s); try { localStorage.setItem('gta-proforma:art', s) } catch { /* per-viewer convenience only */ } }

  const scene = useMemo(() => {
    const projects = projectsUnder(node)
    const multi = projects.length > 1
    return sceneOf(projects.map(({ path, project }) => ({ path, project, label: multi ? money((path.length ? getResult(result, path) : result).metrics.profit?.value) : undefined })), attributes)
  }, [node, result, attributes])
  const { W, H } = heightOf(scene)
  const spot = scene.buildings.find((b) => buildingKey(b.id) === selected) ?? null
  const m = result.metrics
  const stats: Array<[string, string]> = [['Units', num(m.totalUnits?.value)], ['Total cost', metricValue(m.totalDevelopmentCost)], ['Profit', metricValue(m.profit)], ['Profit on cost', metricValue(m.profitOnCost)]]

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
    drag.current = { cx: e.clientX, cy: e.clientY, x: view.x, y: view.y, moved: false }
    setDragging(true)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    if (Math.hypot(e.clientX - d.cx, e.clientY - d.cy) > 4) d.moved = true
    const u = unitsPerPx()
    setView((v) => clampView({ ...v, x: d.x - ((e.clientX - d.cx) * u), y: d.y - ((e.clientY - d.cy) * u) }))
  }
  const onKey = (e: React.KeyboardEvent) => {
    const step = 60 / view.k
    const moves: Record<string, () => void> = {
      Escape: () => setSelected(null), '+': () => zoomBy(1.4), '=': () => zoomBy(1.4), '-': () => zoomBy(1 / 1.4), '0': () => setView({ x: 0, y: 0, k: 1 }),
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
        <label className="ml-auto flex items-center gap-2 text-ink-soft">Spotlight
          <select className="min-h-9 rounded border border-line-strong bg-surface px-2 text-ink" value={selected ?? ''} onChange={(e) => setSelected(e.target.value || null)}>
            <option value="">None</option>
            {scene.buildings.map((b) => <option key={b.id} value={buildingKey(b.id)}>{b.name}</option>)}
          </select>
        </label>
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
        onPointerUp={(e) => {
          // A click (not a drag) spotlights the building under the pointer, or clears the spotlight on empty space
          if (drag.current && !drag.current.moved) {
            const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-building]')?.getAttribute('data-building') ?? null
            setSelected((cur) => (hit && hit !== cur ? hit : null))
          }
          drag.current = null
          setDragging(false)
        }}
        onPointerCancel={() => { drag.current = null; setDragging(false) }}
      >
        <div className="absolute right-2 bottom-2 z-10 flex gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <Button aria-label="Zoom in" onClick={() => zoomBy(1.4)}>+</Button>
          <Button aria-label="Zoom out" onClick={() => zoomBy(1 / 1.4)}>−</Button>
          <Button onClick={() => setView({ x: 0, y: 0, k: 1 })}>Reset</Button>
        </div>
        {spot && <BuildingCard b={spot} r={spot.path.length ? getResult(result, spot.path) : result} onClose={() => setSelected(null)} onEdit={() => { dispatch({ type: 'path', path: [...state.path, ...spot.path] }); dispatch({ type: 'section', id: 'program' }) }} />}
        <StreetscapeSvg ref={svgRef} scene={scene} style={style} stats={stats} title={node.name} uid={uid} selected={selected} viewBox={`${view.x} ${view.y} ${W / view.k} ${H / view.k}`} />
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-mute">
        <span>Click a building to spotlight it and see its numbers (Escape clears). Drag to move, scroll or use + and − to zoom. Illustration, not to scale; lanes are drawn by street class, not counted. Buildings, roofs, storefronts and stations come from the pro forma; the dashed lines and notes come from the site map's zoning (hatched where a building is over), and they are not a legal building envelope.</span>
        <Button onClick={download}>Download .svg</Button>
      </figcaption>
    </figure>
  )
}

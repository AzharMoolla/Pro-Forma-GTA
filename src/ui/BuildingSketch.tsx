import { useId } from 'react'
import type { Node, NodeResult } from '../engine/portfolio'
import type { ProjectInput } from '../engine/project'
import { metricValue, money, num } from './format'
import { projectsUnder } from './coverage'
import { getResult } from './tree'

// A playful, not-to-scale sketch: floors and podium follow the inputs, width follows the floorplate, and the
// headline numbers float above. It is a differentiator, not a drawing: no CAD accuracy is implied.

interface Massing {
  id: string
  name: string
  kind: 'tower' | 'midrise' | 'office' | 'lots'
  storeys: number
  podium: number
  floorplate: number // ft², drives width
  retail: boolean
  result: NodeResult
}

function massingOf(project: ProjectInput, result: NodeResult): Massing {
  const kinds = new Set(project.components.map((c) => (c.kind === 'commercial' ? c.use : c.kind)))
  const gca = project.program?.gcaAboveSqft ?? 0
  if (kinds.size === 1 && kinds.has('landSale')) return { id: project.id, name: project.name, kind: 'lots', storeys: 2, podium: 0, floorplate: 0, retail: false, result }
  const storeys = Math.max(1, Math.round(project.program?.storeys ?? gca / 9_000))
  const office = kinds.has('office') && !kinds.has('rental') && !kinds.has('condo')
  return {
    id: project.id, name: project.name,
    kind: office ? 'office' : storeys > 14 ? 'tower' : 'midrise',
    storeys,
    podium: Math.min(storeys - 1, project.program?.podiumStoreys ?? 0),
    floorplate: gca / storeys,
    retail: kinds.has('retail'),
    result,
  }
}

/** Deterministic jitter so each building wobbles the same way every render. */
function jitter(seed: string) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return (i: number) => (((Math.sin(h + i * 12.9898) * 43758.5453) % 1) + 1) % 1 - 0.5
}

const FLOOR_H = 3.2 // relative units per storey

const widthOf = (m: Massing, boost: number) => (m.kind === 'lots' ? 120 : Math.max(46, Math.min(150 * boost, Math.sqrt(m.floorplate) * 1.15 * boost)))

function Building({ m, x, baseY, scale, filterId, hatchId, boost }: { m: Massing; x: number; baseY: number; scale: number; filterId: string; hatchId: string; boost: number }) {
  const j = jitter(m.id)
  const width = widthOf(m, boost)
  if (m.kind === 'lots') {
    return (
      <g filter={`url(#${filterId})`}>
        {Array.from({ length: 5 }, (_, i) => {
          const hx = x + i * 26
          return (
            <g key={i}>
              <path d={`M${hx},${baseY} v-16 l11,-11 l11,11 v16`} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.4} strokeLinejoin="round" />
              <rect x={hx + 8} y={baseY - 9} width={6} height={9} fill="var(--accent-soft)" stroke="var(--ink)" strokeWidth={1} />
            </g>
          )
        })}
      </g>
    )
  }
  const floorH = FLOOR_H * scale
  const height = m.storeys * floorH
  const podiumH = m.podium * floorH
  const podiumW = m.podium ? width + 26 : width
  const towerX = x + (podiumW - width) / 2
  const top = baseY - height
  const step = m.storeys > 45 ? 3 : m.storeys > 24 ? 2 : 1
  const cols = Math.max(2, Math.floor(width / 13))
  return (
    <g filter={`url(#${filterId})`} className="sketch-building">
      {/* tower */}
      <rect x={towerX} y={top} width={width} height={height - podiumH} fill={`url(#${hatchId})`} stroke="var(--ink)" strokeWidth={1.6} rx={1.5} />
      {Array.from({ length: Math.floor((m.storeys - m.podium) / step) }, (_, f) => {
        const y = top + (f + 1) * floorH * step
        return y < baseY - podiumH - 2 ? <line key={f} x1={towerX + 2} x2={towerX + width - 2 + j(f) * 2} y1={y} y2={y + j(f + 7)} stroke="var(--ink)" strokeWidth={0.6} opacity={0.55} /> : null
      })}
      {m.kind !== 'office' && Array.from({ length: Math.floor((m.storeys - m.podium) / step) }, (_, f) =>
        Array.from({ length: cols }, (_, c) => {
          if (j(f * 31 + c) > 0.32) return null // some windows lit, some not
          const wx = towerX + 5 + c * ((width - 10) / cols)
          const wy = top + f * floorH * step + floorH * 0.35
          return <rect key={`${f}-${c}`} x={wx} y={wy} width={Math.max(2.5, (width - 10) / cols - 4)} height={Math.max(1.5, floorH * 0.45)} fill="var(--accent-soft)" stroke="var(--ink)" strokeWidth={0.5} />
        }),
      )}
      {m.kind === 'office' && Array.from({ length: cols }, (_, c) => (
        <line key={c} x1={towerX + (c + 1) * (width / (cols + 1))} x2={towerX + (c + 1) * (width / (cols + 1))} y1={top + 3} y2={baseY - podiumH - 2} stroke="var(--ink)" strokeWidth={0.6} opacity={0.5} />
      ))}
      {/* rooftop mechanical penthouse */}
      <rect x={towerX + width * 0.3} y={top - floorH * 1.2} width={width * 0.4} height={floorH * 1.2} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.2} />
      {/* podium */}
      {m.podium > 0 && (
        <g>
          <rect x={x} y={baseY - podiumH} width={podiumW} height={podiumH} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.6} />
          {m.retail && Array.from({ length: Math.floor(podiumW / 22) }, (_, i) => (
            <path key={i} d={`M${x + 4 + i * 22},${baseY - podiumH + floorH * 0.9} q9,${-floorH * 0.5} 18,0`} fill="none" stroke="var(--chart-out)" strokeWidth={1.4} />
          ))}
          <rect x={x + podiumW / 2 - 6} y={baseY - Math.min(podiumH, floorH * 1.4)} width={12} height={Math.min(podiumH, floorH * 1.4)} fill="var(--accent-soft)" stroke="var(--ink)" strokeWidth={1} />
        </g>
      )}
      {/* a sketchy tree or two */}
      <circle cx={x - 10} cy={baseY - 12} r={8} fill="none" stroke="var(--good)" strokeWidth={1.3} />
      <line x1={x - 10} x2={x - 10} y1={baseY - 4} y2={baseY} stroke="var(--good)" strokeWidth={1.3} />
    </g>
  )
}

function Bubble({ x, y, lines, anchorX, anchorY, wide }: { x: number; y: number; lines: Array<[string, string]>; anchorX: number; anchorY: number; wide?: boolean }) {
  const w = wide ? 190 : 150
  const h = 14 + lines.length * 15
  return (
    <g>
      <path d={`M${anchorX},${anchorY} C${anchorX},${(anchorY + y + h) / 2} ${x + w / 2},${(anchorY + y + h) / 2} ${x + w / 2},${y + h}`} fill="none" stroke="var(--ink-mute)" strokeWidth={1} strokeDasharray="3 3" />
      <rect x={x} y={y} width={w} height={h} rx={10} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.3} />
      {lines.map(([k, v], i) => (
        <g key={k}>
          <text x={x + 10} y={y + 18 + i * 15} fontSize="11" fill="var(--ink-soft)">{k}</text>
          <text x={x + w - 10} y={y + 18 + i * 15} fontSize="11.5" textAnchor="end" fill="var(--ink)" fontWeight={600} className="num">{v}</text>
        </g>
      ))}
    </g>
  )
}

export function BuildingSketch({ node, result }: { node: Node; result: NodeResult }) {
  const uid = useId().replace(/:/g, '')
  const filterId = `wobble-${uid}`
  const hatchId = `hatch-${uid}`
  const projects = projectsUnder(node).map(({ path, project }) => massingOf(project, path.length ? getResult(result, path) : result))
  const W = 800
  const H = 380
  const baseY = H - 26
  const maxStoreys = Math.max(...projects.map((p) => p.storeys + 1.2))
  const scale = Math.min(1.6, (H - 150) / (maxStoreys * FLOOR_H)) // leave room for the bubbles
  const gap = 34
  const boost = projects.length === 1 ? 1.8 : 1
  const widths = projects.map((p) => (p.kind === 'lots' ? 130 : widthOf(p, boost) + (p.podium ? 26 : 0)))
  const fit = Math.min(1, (W - 60) / (widths.reduce((s, w) => s + w, 0) + gap * (projects.length - 1)))
  const placed = projects.map((p, i) => ({ p, w: widths[i]!, x: 30 + widths.slice(0, i).reduce((s, w) => s + (w + gap) * fit, 0) }))
  const single = projects.length === 1
  const m = result.metrics
  const headline: Array<[string, string]> = [
    ['Homes', num(m.totalUnits?.value)],
    ['Total cost', metricValue(m.totalDevelopmentCost)],
    ['Profit', metricValue(m.profit)],
    ['Profit on cost', metricValue(m.profitOnCost)],
    ['Levered IRR', metricValue(m.leveredIrr)],
  ]
  const summary = `Sketch of ${node.name}: ${projects.map((p) => (p.kind === 'lots' ? `${p.name}, lots` : `${p.name}, ${p.storeys} storeys`)).join('; ')}. ${headline.map(([k, v]) => `${k} ${v}`).join(', ')}.`

  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={summary}>
        <defs>
          <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={3} />
            <feDisplacementMap in="SourceGraphic" scale={2.2} />
          </filter>
          <pattern id={hatchId} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={6} height={6} fill="var(--surface)" />
            <line x1={0} x2={0} y1={0} y2={6} stroke="var(--border)" strokeWidth={1.4} />
          </pattern>
        </defs>
        <path d={`M8,${baseY + 1} C200,${baseY - 1} 600,${baseY + 2} ${W - 8},${baseY}`} fill="none" stroke="var(--ink)" strokeWidth={1.6} filter={`url(#${filterId})`} />
        <g transform={`translate(0 0) scale(${fit} 1)`} style={{ transformOrigin: `0px ${baseY}px` }}>
          {placed.map(({ p, x }) => <Building key={p.id} m={p} x={x / fit} baseY={baseY} scale={scale} filterId={filterId} hatchId={hatchId} boost={boost} />)}
        </g>
        {placed.map(({ p, x, w }) => {
          const centre = x + (w * fit) / 2
          const roof = baseY - (p.kind === 'lots' ? 30 : (p.storeys + 1.2) * FLOOR_H * scale)
          return (
            <g key={`label-${p.id}`}>
              <text x={centre} y={baseY + 18} textAnchor="middle" fontSize="10.5" fill="var(--ink-soft)">{p.kind === 'lots' ? 'lots' : `${p.storeys} st`}</text>
              {!single && <text x={centre} y={roof - 6} textAnchor="middle" fontSize="10.5" fill="var(--ink)" className="num">{money(p.result.metrics.profit?.value)}</text>}
            </g>
          )
        })}
        {single ? (
          <Bubble x={Math.min(W - 200, placed[0]!.x + placed[0]!.w * fit + 40)} y={20} lines={headline} anchorX={placed[0]!.x + (placed[0]!.w * fit) / 2} anchorY={baseY - (projects[0]!.storeys + 1.2) * FLOOR_H * scale - 4} wide />
        ) : (
          <Bubble x={W - 210} y={10} lines={headline} anchorX={W - 120} anchorY={84} wide />
        )}
      </svg>
      <figcaption className="text-xs text-ink-mute">Not to scale: storeys and floorplate come from the inputs; the figures above are this model's current results{single ? '' : ' (profit shown over each building)'}.</figcaption>
    </figure>
  )
}

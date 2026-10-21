import { useMemo, useState } from 'react'
import type { Attributes } from '../engine/catalogue'
import type { Node, NodeResult } from '../engine/portfolio'
import type { ProjectInput } from '../engine/project'
import { banner, streetscape, type Ink, type StreetBuilding, type StreetFeatures } from './ascii'
import { Button } from './components'
import { projectsUnder } from './coverage'
import { metricValue, money, num } from './format'
import { getResult } from './tree'

// Fixed terminal palette (same in light and dark mode): every ink is ≥ 4.5:1 on the background (axe treats it as text).
const INK: Record<Ink, string> = {
  sand: '#e0b16b', teal: '#7fc8d6', brick: '#e38b6f', lavender: '#b9a3e3', sage: '#a8d08d', gold: '#f2d16b',
  lit: '#ffe9a8', dark: '#7a8b92', green: '#6fcf73', road: '#8a959a', text: '#e8eceb', red: '#ff7b72', blue: '#79b8ff', white: '#f4f4f4',
}
const BG = '#0f1418'

function toStreetBuilding(project: ProjectInput, result: NodeResult, labelled: boolean): StreetBuilding {
  const kinds = new Set(project.components.map((c) => (c.kind === 'commercial' ? c.use : c.kind)))
  const label = labelled ? money(result.metrics.profit?.value) : undefined
  if (kinds.size === 1 && kinds.has('landSale')) return { id: project.id, kind: 'lots', storeys: 2, podium: 0, retail: false, label }
  const gca = project.program?.gcaAboveSqft ?? 0
  const storeys = Math.max(1, Math.round(project.program?.storeys ?? gca / 9_000))
  const office = kinds.has('office') && !kinds.has('rental') && !kinds.has('condo')
  return {
    id: project.id,
    kind: office ? 'office' : storeys > 14 ? 'tower' : 'midrise',
    storeys,
    podium: Math.min(storeys - 1, project.program?.podiumStoreys ?? 0),
    retail: kinds.has('retail'),
    label,
  }
}

const n = (a: Attributes, id: string) => (typeof a[id] === 'number' ? (a[id] as number) : 0)

export function featuresFrom(a: Attributes): StreetFeatures {
  const toronto = a['site.municipality'] === 'toronto'
  const parksHa = n(a, 'mp.parksHa')
  return {
    transit: a['site.nearTtc60m'] === true || (toronto && a['site.majorTransitStationArea'] === true) ? 'subway'
      : a['mp.transitIntegration'] === true || a['site.majorTransitStationArea'] === true ? 'go' : null,
    parks: parksHa >= 3 ? 2 : parksHa > 0 || a['planning.parklandOnSite'] === true ? 1 : 0,
    school: n(a, 'mp.schoolSites') > 0,
    community: a['mp.communityCentre'] === true || a['program.institutional'] === true,
    playground: a['program.childcare'] === true || n(a, 'mp.schoolSites') > 0,
    greenRoof: n(a, 'design.greenRoofM2') > 0,
    streetTrees: n(a, 'design.streetscapeM') > 0 || n(a, 'site.protectedTrees') > 0,
    bikes: n(a, 'planning.bikeParking') > 0,
    pool: a['program.pool'] === true,
  }
}

export function AsciiStreet({ node, result, attributes, seed }: { node: Node; result: NodeResult; attributes: Attributes; seed: string }) {
  const [copied, setCopied] = useState(false)
  const art = useMemo(() => {
    const projects = projectsUnder(node)
    const labelled = projects.length > 1
    const buildings = projects.map(({ path, project }) => toStreetBuilding(project, path.length ? getResult(result, path) : result, labelled))
    const street = streetscape(buildings, featuresFrom(attributes), `${seed}/${node.id}`)
    const m = result.metrics
    const box = banner(node.name, [
      ['Homes', num(m.totalUnits?.value)],
      ['Total cost', metricValue(m.totalDevelopmentCost)],
      ['Profit', metricValue(m.profit)],
      ['Profit on cost', metricValue(m.profitOnCost)],
      ['Levered IRR', metricValue(m.leveredIrr)],
    ])
    const summary = `ASCII streetscape of ${node.name}: ${buildings.map((b) => (b.kind === 'lots' ? 'a row of lots' : `${b.storeys}-storey ${b.kind}`)).join(', ')}. ${box.slice(2, -1).map((l) => l.replace(/[│]/g, '').trim().replace(/\s{2,}/g, ' ')).join(', ')}.`
    return { street, box, summary, plain: [...box, '', street.text].join('\n') }
  }, [node, result, attributes, seed])

  const copy = async () => {
    await navigator.clipboard.writeText(art.plain)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([art.plain], { type: 'text/plain;charset=utf-8' }))
    Object.assign(document.createElement('a'), { href: url, download: `${node.id}-streetscape.txt` }).click()
    URL.revokeObjectURL(url)
  }

  return (
    <figure className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-lg" style={{ background: BG }} tabIndex={0} role="region" aria-label="Streetscape (scrolls sideways)">
        <pre role="img" aria-label={art.summary} className="num m-0 w-max p-4 text-[12px] leading-[1.15]" style={{ color: INK.text }}>
          <span style={{ color: INK.gold }}>{art.box.join('\n')}</span>
          {'\n\n'}
          {art.street.rows.map((row, y) => (
            <span key={y}>
              {groupRuns(row).map((run, i) => <span key={i} style={{ color: INK[run.ink] }}>{run.text}</span>)}
              {'\n'}
            </span>
          ))}
        </pre>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-mute">
        <span>Just for fun and not to scale: buildings, parks, transit, schools, green roofs and street furniture come from what this pro forma contains.</span>
        <span className="flex gap-2">
          <Button onClick={() => void copy()} aria-live="polite">{copied ? 'Copied' : 'Copy as text'}</Button>
          <Button onClick={download}>Download .txt</Button>
        </span>
      </figcaption>
    </figure>
  )
}

function groupRuns(row: Array<{ ch: string; ink: Ink }>) {
  const runs: Array<{ text: string; ink: Ink }> = []
  for (const c of row) {
    const last = runs.at(-1)
    if (last && (last.ink === c.ink || c.ch === ' ')) last.text += c.ch
    else runs.push({ text: c.ch, ink: c.ink })
  }
  return runs
}

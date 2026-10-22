import { useEffect, useMemo, useRef, useState } from 'react'
import type { Attributes } from '../engine/catalogue'
import { isPortfolio } from '../engine/portfolio'
import { cascade, type Layer, type LayerMeta, type Position } from '../location/cascade'
import { considerationsFrom, heightCheck, type SiteMatch, type StreetContext } from '../location/zoning'
import registry from '../../data/geo/layers.json'
import { Button, Card, Chip, TableWrap, td, th } from './components'
import { projectsUnder } from './coverage'
import { variableInfo } from './data'
import { scoped, scopedKey } from './streetscapeScene'
import { useWorkspace } from './workspace'

interface SiteMessage extends StreetContext { type: 'planning-map:site'; name: string; point: Position; matches: SiteMatch[] }

/** One row of "what this site means for the pro forma", with where it came from. */
export interface Row { variable: string; value: string | number | boolean; label: string; layer: string; sourceUrl: string; retrievedAt: string; note?: string }

/** Where each map-derived value came from, kept with the project's variables (and so in every locked scenario). */
export const SOURCES_KEY = 'location.sources'
export type SourceMap = Record<string, { value: Row['value']; layer: string; url: string; retrievedAt: string }>
export const readSources = (a: Attributes): SourceMap => {
  try { return typeof a[SOURCES_KEY] === 'string' ? JSON.parse(a[SOURCES_KEY] as string) as SourceMap : {} } catch { return {} }
}

// Small provincial/Toronto policy layers (data/geo, committed) run in the browser; zoning detail comes from the map
const files = import.meta.glob('../../data/geo/*.geo.json', { import: 'default' })
let layersPromise: Promise<Layer[]> | null = null
const loadLayers = () => (layersPromise ??= Promise.all((registry.layers as LayerMeta[]).map(async (meta) => ({ meta, data: (await files[`../../data/geo/${meta.id}.geo.json`]!()) as Layer['data'] }))))

const show = (v: unknown) => (v === undefined || v === null || v === '' ? '—' : typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v))

export function SiteMap() {
  const { state, dispatch, demo, draft, node } = useWorkspace()
  const attributes = state.projects[state.projectId]!.attributes
  // With a phase or building selected, values can apply to it alone (scoped), e.g. one block by a station
  const [scope, setScope] = useState<'project' | 'selection'>('project')
  const path = scope === 'selection' ? state.path : []
  const current = (id: string) => scoped(attributes, path, id)
  const target = path.length ? node.name : demo.name.split(':')[0]
  const frame = useRef<HTMLIFrameElement>(null)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [site, setSite] = useState<SiteMessage | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [skip, setSkip] = useState<Set<string>>(new Set())
  const [applied, setApplied] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    fetch('map/api/manifest').then((r) => live && setAvailable(r.ok)).catch(() => live && setAvailable(false))
    return () => { live = false }
  }, [])

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow) return
      const data = e.data as SiteMessage
      if (data?.type === 'planning-map:site' && Array.isArray(data.point) && Array.isArray(data.matches)) { setSite(data); setApplied(null) }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Proposed height: tallest building in the draft (storeys), compared against the mapped limit
  const proposedStoreys = useMemo(() => Math.max(0, ...projectsUnder(draft).map(({ project }) => project.program?.storeys ?? 0)) || null, [draft])

  useEffect(() => {
    if (!site) return
    let live = true
    void loadLayers().then((layers) => {
      if (!live) return
      const today = new Date().toISOString().slice(0, 10)
      const fromCascade: Row[] = cascade(site.point, layers).derived
        .filter((d) => d.value !== null)
        .map((d) => ({ variable: d.variable, value: d.value!, label: `${d.provenance.layer}`, layer: d.provenance.layer, sourceUrl: d.provenance.sourceUrl, retrievedAt: d.provenance.retrievedAt }))
      const fromMap: Row[] = considerationsFrom(site.matches, { street: site.street, nearby: site.nearby })
      const located: Row[] = [
        { variable: 'site.lat', value: Number(site.point[1].toFixed(6)), label: 'Latitude', layer: 'Selected on the site map', sourceUrl: '', retrievedAt: today },
        { variable: 'site.lng', value: Number(site.point[0].toFixed(6)), label: 'Longitude', layer: 'Selected on the site map', sourceUrl: '', retrievedAt: today },
        ...(site.name && !/point|coordinates/i.test(site.name) ? [{ variable: 'site.address', value: site.name, label: 'Official address point', layer: 'Toronto address index', sourceUrl: 'https://open.toronto.ca/dataset/address-points-municipal-toronto-one-address-repository/', retrievedAt: today }] : []),
      ]
      // The detailed planning map wins where both say something (e.g. zoning-level layers over the screening layers)
      const merged = new Map<string, Row>()
      for (const r of [...located, ...fromCascade, ...fromMap]) merged.set(r.variable, r)
      const limit = merged.get('zoning.heightLimitStoreys')?.value
      const check = heightCheck(proposedStoreys, typeof limit === 'number' ? limit : null, null)
      if (check?.exceedsBy) {
        const h = merged.get('zoning.heightLimitStoreys')!
        merged.set('planning.zba', { variable: 'planning.zba', value: true, label: `Proposed ${check.proposedStoreys} storeys is ${check.exceedsBy} over the ~${check.limitStoreys}-storey limit: a zoning by-law amendment is likely`, layer: h.layer, sourceUrl: h.sourceUrl, retrievedAt: h.retrievedAt })
      }
      setRows([...merged.values()])
      setSkip(new Set())
    })
    return () => { live = false }
  }, [site, proposedStoreys])

  const changed = rows.filter((r) => current(r.variable) !== r.value)
  const apply = () => {
    const chosen = rows.filter((r) => !skip.has(r.variable))
    const sources: SourceMap = { ...readSources(attributes) }
    for (const r of chosen) {
      const id = scopedKey(path, r.variable)
      dispatch({ type: 'attribute', id, value: r.value })
      sources[id] = { value: r.value, layer: r.layer, url: r.sourceUrl, retrievedAt: r.retrievedAt }
    }
    dispatch({ type: 'attribute', id: SOURCES_KEY, value: JSON.stringify(sources) })
    setApplied(path.length
      ? `${chosen.length} values applied to ${target} only. The streetscape uses them for this building; project-wide checklists still use the project's values.`
      : `${chosen.length} values applied to ${target}. The cost checklist, streetscape and analysis now use them.`)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="Site map">
        <p className="mb-3 text-sm text-ink-soft">
          Search an address or click the map to screen a site against zoning, policy, heritage, environmental and transit layers. Then bring what applies into this pro forma below.
          {isPortfolio(draft) ? ' For a master plan, pick a point inside the site; parcel-level checks per block come later.' : ''}
        </p>
        {available === false ? (
          <p role="status" className="rounded border border-warn bg-warn-soft p-3 text-sm text-warn">
            Map data isn't on this machine yet. Run <code>npm run map:collect</code> and <code>npm run map:collect:regional</code>, then reload.
          </p>
        ) : (
          <iframe ref={frame} title="Planning map" src="map/" className="h-[calc(100vh-150px)] min-h-[640px] w-full rounded border border-line bg-sunken" />
        )}
      </Card>

      <Card title={site ? `What this site means for the pro forma · ${site.name}` : 'What this site means for the pro forma'}>
        {!site ? (
          <p className="text-sm text-ink-soft">Choose a site on the map. Its zoning, height limit, policy areas and screening flags appear here with their sources, ready to apply to <strong>{demo.name.split(':')[0]}</strong>.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-ink-soft">Each value comes from the layer named beside it. Untick anything you don't want; you can still change every value later under Site &amp; program. Screening only: a missing match isn't clearance, and a zone label isn't a zoning opinion.</p>
            <TableWrap caption="Values from the map">
              <thead><tr>{['Apply', 'Variable', 'From the map', 'Now in the project', 'Source'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
              <tbody>{rows.map((r) => {
                const info = variableInfo.get(r.variable)
                const same = current(r.variable) === r.value
                return (
                  <tr key={r.variable}>
                    <td className={td}><input type="checkbox" className="size-5 accent-[var(--accent)]" aria-label={`Apply ${info?.label ?? r.variable}`} checked={!skip.has(r.variable)} onChange={(e) => setSkip((s) => { const n = new Set(s); if (e.target.checked) n.delete(r.variable); else n.add(r.variable); return n })} /></td>
                    <td className={td}>{info?.label ?? r.variable}{info?.unit ? <span className="text-ink-mute"> ({info.unit})</span> : ''}</td>
                    <td className={td}><span className="num">{show(r.value)}</span>{r.label !== info?.label && <span className="block text-xs text-ink-soft">{r.label}</span>}{r.note && <span className="block text-xs text-warn">{r.note}</span>}</td>
                    <td className={td}>{same ? <Chip tone="good">same</Chip> : <span className="num">{show(current(r.variable))}</span>}</td>
                    <td className={`${td} text-xs text-ink-soft`}>{r.sourceUrl ? <a className="text-accent underline" href={r.sourceUrl} target="_blank" rel="noreferrer">{r.layer}</a> : r.layer}{r.retrievedAt && ` · ${r.retrievedAt}`}</td>
                  </tr>
                )
              })}</tbody>
            </TableWrap>
            {state.path.length > 0 && (
              <fieldset className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <legend className="mb-1 text-xs text-ink-soft">Apply to</legend>
                <label className="flex min-h-9 items-center gap-2"><input type="radio" name="map-scope" className="size-4 accent-[var(--accent)]" checked={scope === 'project'} onChange={() => setScope('project')} />the whole project</label>
                <label className="flex min-h-9 items-center gap-2"><input type="radio" name="map-scope" className="size-4 accent-[var(--accent)]" checked={scope === 'selection'} onChange={() => setScope('selection')} />{node.name} only (e.g. a different zoning area or a station nearby)</label>
              </fieldset>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={apply} disabled={rows.length === skip.size}>Apply {rows.length - skip.size} to {target}</Button>
              <span className="text-xs text-ink-mute">{changed.length} differ from the project now.</span>
              {applied && <p role="status" className="text-sm text-good">{applied}</p>}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

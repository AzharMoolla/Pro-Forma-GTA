import { checklist, type Attributes, type CatalogueItem } from '../engine/catalogue'
import type { CostLine } from '../engine/costs'
import { isPortfolio, type Node } from '../engine/portfolio'
import type { ProjectInput } from '../engine/project'
import { catalogue } from './data'
import type { NodePath } from './tree'

/**
 * Disposition of each applicable catalogue item:
 * line = its own cost line · covered = carried inside another figure (benchmark, allowance, component, engine)
 * excluded = deliberately left out, with a reason · gap = a known, named omission · stale = its coverage note points
 * at a cost line that is no longer in the model · unaccounted = applies but nothing carries it · to-confirm = depends
 * on a project variable that is not set yet.
 */
export type CoverageStatus = 'line' | 'covered' | 'excluded' | 'gap' | 'stale' | 'unaccounted' | 'to-confirm'

export interface CoverageEntry { item: CatalogueItem; status: CoverageStatus; note: string }

function allLines(node: Node): CostLine[] {
  return [...node.costLines, ...(isPortfolio(node) ? node.children.flatMap((c) => allLines(c.node)) : [])]
}

export function modelledIds(node: Node): Set<string> {
  return new Set(allLines(node).flatMap((l) => (l.catalogueId ? [l.catalogueId] : [])))
}

export function coverage(projectType: string, attributes: Attributes, draft: Node, notes: Record<string, string>): CoverageEntry[] {
  const lines = modelledIds(draft)
  const lineIds = new Set(allLines(draft).map((l) => l.id))
  return checklist(catalogue, projectType, attributes).stages.flatMap((s) =>
    s.entries.map((e): CoverageEntry => {
      if (lines.has(e.item.id)) return { item: e.item, status: 'line', note: 'Cost line in the model' }
      const note = notes[e.item.id]
      if (note) {
        // "line: <id>" names the one cost line that carries the item; if that line was deleted the note no longer holds
        const target = /^line: ([a-z0-9-]+)$/.exec(note)?.[1]
        if (target && !lineIds.has(target)) return { item: e.item, status: 'stale', note: `Said to be inside cost line "${target}", which is no longer in the model` }
        if (note.startsWith('excluded:')) return { item: e.item, status: 'excluded', note }
        if (note.startsWith('gap:')) return { item: e.item, status: 'gap', note }
        return { item: e.item, status: 'covered', note }
      }
      if (e.status === 'to-confirm') return { item: e.item, status: 'to-confirm', note: `Depends on: ${e.unsetVariables.join(', ')}` }
      return { item: e.item, status: 'unaccounted', note: 'Applies to this project but is not in the model yet' }
    }),
  )
}

export function projectsUnder(node: Node, path: NodePath = []): Array<{ path: NodePath; project: ProjectInput }> {
  return isPortfolio(node) ? node.children.flatMap((c) => projectsUnder(c.node, [...path, c.node.id])) : [{ path, project: node }]
}

// ---------------------------------------------------------------- readiness: three separate questions

export interface Readiness {
  /** Can the engine calculate? Every cost line in the model has a value (C16). */
  model: { complete: boolean; unknown: string[] }
  /** Is everything that applies accounted for? Each applicable item has a disposition. */
  scope: { complete: boolean; applicable: number; counts: Record<CoverageStatus, number> }
  /** Who stands behind the numbers? Per cost line: source recorded, reviewed by a person, and how old. */
  sources: { lines: number; sourced: number; reviewed: number; synthetic: number; old: string[]; undated: number }
}

/** Value dates older than this are flagged for re-checking (charges and benchmarks are re-issued about yearly). */
export const SOURCE_MAX_AGE_MONTHS = 12

const monthsBetween = (from: string, to: string) => {
  const [fy, fm] = from.split('-').map(Number) as [number, number]
  const [ty, tm] = to.split('-').map(Number) as [number, number]
  return ((ty - fy) * 12) + (tm - fm)
}

/** `today` is YYYY-MM-DD, passed in so the result is reproducible. */
export function readiness(entries: CoverageEntry[], draft: Node, unknown: string[], today: string): Readiness {
  const counts = Object.fromEntries((['line', 'covered', 'excluded', 'gap', 'stale', 'unaccounted', 'to-confirm'] as CoverageStatus[]).map((s) => [s, 0])) as Record<CoverageStatus, number>
  for (const e of entries) counts[e.status]++
  const lines = allLines(draft)
  const sourced = lines.filter((l) => l.source && l.source.kind !== 'synthetic')
  return {
    model: { complete: unknown.length === 0, unknown },
    scope: { complete: counts.unaccounted + counts.stale + counts['to-confirm'] === 0, applicable: entries.length, counts },
    sources: {
      lines: lines.length,
      sourced: sourced.length,
      reviewed: sourced.filter((l) => l.source!.reviewed).length,
      synthetic: lines.filter((l) => l.source?.kind === 'synthetic').length,
      old: sourced.filter((l) => l.source!.valueDate && monthsBetween(l.source!.valueDate, today) > SOURCE_MAX_AGE_MONTHS).map((l) => l.label),
      undated: sourced.filter((l) => !l.source!.valueDate).length,
    },
  }
}

import { checklist, type Attributes, type CatalogueItem } from '../engine/catalogue'
import { isPortfolio, type Node } from '../engine/portfolio'
import type { ProjectInput } from '../engine/project'
import { catalogue } from './data'
import type { NodePath } from './tree'

export type CoverageStatus = 'line' | 'covered' | 'unaccounted' | 'to-confirm'

export interface CoverageEntry { item: CatalogueItem; status: CoverageStatus; note: string }

export function modelledIds(node: Node): Set<string> {
  const ids = new Set<string>()
  const walk = (n: Node) => {
    n.costLines.forEach((l) => l.catalogueId && ids.add(l.catalogueId))
    if (isPortfolio(n)) n.children.forEach((c) => walk(c.node))
  }
  walk(node)
  return ids
}

export function coverage(projectType: string, attributes: Attributes, draft: Node, notes: Record<string, string>): CoverageEntry[] {
  const lines = modelledIds(draft)
  return checklist(catalogue, projectType, attributes).stages.flatMap((s) =>
    s.entries.map((e): CoverageEntry => {
      if (lines.has(e.item.id)) return { item: e.item, status: 'line', note: 'Cost line in the model' }
      if (notes[e.item.id]) return { item: e.item, status: 'covered', note: notes[e.item.id]! }
      if (e.status === 'to-confirm') return { item: e.item, status: 'to-confirm', note: `Depends on: ${e.unsetVariables.join(', ')}` }
      return { item: e.item, status: 'unaccounted', note: 'Applies to this project but is not in the model yet' }
    }),
  )
}

export function projectsUnder(node: Node, path: NodePath = []): Array<{ path: NodePath; project: ProjectInput }> {
  return isPortfolio(node) ? node.children.flatMap((c) => projectsUnder(c.node, [...path, c.node.id])) : [{ path, project: node }]
}

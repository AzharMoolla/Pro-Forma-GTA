// Phasing plan: pure edits to the plan tree (which buildings go in which phase, and when each starts) and the
// schedule facts finance needs (when each phase builds, and where two phases build at once).
//
// A phased plan is a root whose children are all phases (portfolios), each holding buildings. Offsets are months
// after the parent starts, so moving a phase moves its buildings with it.

import { isPortfolio, type Node, type PortfolioInput } from '../engine/portfolio'
import { allIds, uniqueId } from './tracker'

export interface ScheduleRow {
  path: string[]
  name: string
  isPhase: boolean
  depth: number
  /** Months after the parent starts (what the user edits) */
  offset: number
  /** Months after the whole plan starts */
  start: number
  /** Construction window, months after the plan starts: [constructionStart, constructionEnd) */
  constructionStart: number
  constructionEnd: number
}

/** Every phase and building with its absolute start and construction window, in plan order. */
export function schedule(root: Node): ScheduleRow[] {
  const rows: ScheduleRow[] = []
  const walk = (node: Node, path: string[], offset: number, start: number): ScheduleRow => {
    const row: ScheduleRow = { path, name: node.name, isPhase: isPortfolio(node), depth: path.length, offset, start, constructionStart: start, constructionEnd: start }
    if (path.length) rows.push(row)
    if (isPortfolio(node)) {
      const kids = node.children.map((c) => walk(c.node, [...path, c.node.id], c.offsetMonths, start + c.offsetMonths))
      row.constructionStart = Math.min(...kids.map((k) => k.constructionStart))
      row.constructionEnd = Math.max(...kids.map((k) => k.constructionEnd))
    } else {
      row.constructionStart = start + node.timing.preConstructionMonths
      row.constructionEnd = row.constructionStart + node.timing.constructionMonths
    }
    return row
  }
  walk(root, [], 0, 0)
  return rows
}

export const isPhased = (root: Node): root is PortfolioInput => isPortfolio(root) && root.children.length > 0 && root.children.every((c) => isPortfolio(c.node))

/** Phases whose construction overlaps the phase before (by start): two loans drawing and two sites building at once. */
export function overlaps(root: Node): Array<{ earlier: string; later: string; months: number }> {
  if (!isPhased(root)) return []
  const phases = schedule(root).filter((r) => r.depth === 1).sort((a, b) => a.constructionStart - b.constructionStart)
  return phases.slice(1).flatMap((later, i) => {
    const earlier = phases[i]!
    const months = Math.min(earlier.constructionEnd, later.constructionEnd) - later.constructionStart
    return months > 0 ? [{ earlier: earlier.name, later: later.name, months }] : []
  })
}

/** Apply `f` to the node at `path` (an empty path is the root). */
function at(root: Node, path: string[], f: (n: Node) => Node): Node {
  if (!path.length) return f(root)
  if (!isPortfolio(root)) throw new Error('Path does not lead anywhere')
  if (!root.children.some((c) => c.node.id === path[0])) throw new Error(`No "${path[0]}" in ${root.name}`)
  return { ...root, children: root.children.map((c) => (c.node.id === path[0] ? { ...c, node: at(c.node, path.slice(1), f) } : c)) }
}

/** Set when a phase or building starts, in months after its parent starts. */
export function setOffset(root: Node, path: string[], months: number): Node {
  if (!path.length) throw new Error('The plan itself starts at month 0')
  if (!(Number.isInteger(months) && months >= 0)) throw new Error('Start must be a whole number of months, 0 or more')
  const id = path.at(-1)!
  return at(root, path.slice(0, -1), (parent) => ({ ...(parent as PortfolioInput), children: (parent as PortfolioInput).children.map((c) => (c.node.id === id ? { ...c, offsetMonths: months } : c)) }))
}

export function rename(root: Node, path: string[], name: string): Node {
  const n = name.trim()
  if (!n) throw new Error('A name is needed')
  return at(root, path, (node) => ({ ...node, name: n }))
}

const phase = (id: string, name: string, like: Node, children: PortfolioInput['children']): PortfolioInput => ({
  id, name, discountRate: like.discountRate, costEscalation: like.costEscalation, costLines: [], children,
})

/** Turn a single building, or a plan of loose buildings, into a plan of phases: everything so far becomes Phase 1. */
export function makePhased(root: Node): PortfolioInput {
  if (isPhased(root)) return root
  const taken = allIds(root)
  const id = taken.has('phase-1') ? uniqueId('phase-1', taken) : 'phase-1'
  if (!isPortfolio(root)) return { ...phase(`${root.id}-plan`, root.name, root, [{ offsetMonths: 0, node: phase(id, 'Phase 1', root, [{ offsetMonths: 0, node: root }]) }]) }
  const loose = root.children.filter((c) => !isPortfolio(c.node))
  return { ...root, children: [{ offsetMonths: 0, node: phase(id, 'Phase 1', root, loose) }, ...root.children.filter((c) => isPortfolio(c.node))] }
}

/** Add a phase starting `offsetMonths` after the plan starts, with one building like the last phase's first. */
export function addPhase(root: Node, offsetMonths: number): { root: PortfolioInput; path: string[] } {
  const plan = makePhased(root)
  const last = plan.children.at(-1)!.node as PortfolioInput
  const model = last.children[0]!.node
  const taken = allIds(plan)
  const k = plan.children.length + 1
  const id = taken.has(`phase-${k}`) ? uniqueId(`phase-${k}`, taken) : `phase-${k}`
  taken.add(id)
  const building = { ...structuredClone(model), id: uniqueId(model.id, taken), name: `${model.name.split(':')[0]} (phase ${k})` }
  return { root: { ...plan, children: [...plan.children, { offsetMonths, node: phase(id, `Phase ${k}`, plan, [{ offsetMonths: 0, node: building }]) }] }, path: [id, building.id] }
}

/** Move a building into another phase, keeping its start relative to its phase. Its old phase must keep one. */
export function moveBuilding(root: Node, from: string[], toPhase: string): Node {
  if (!isPhased(root) || from.length !== 2) throw new Error('Choose a building inside a phase')
  const [fromPhase, id] = from as [string, string]
  if (fromPhase === toPhase) return root
  const source = root.children.find((c) => c.node.id === fromPhase)?.node as PortfolioInput | undefined
  const moving = source?.children.find((c) => c.node.id === id)
  if (!source || !moving) throw new Error(`No building "${id}" in that phase`)
  if (!root.children.some((c) => c.node.id === toPhase)) throw new Error(`No phase "${toPhase}"`)
  if (source.children.length <= 1) throw new Error(`${source.name} needs at least one building: remove the phase instead`)
  return {
    ...root,
    children: root.children.map((c) => {
      const p = c.node as PortfolioInput
      if (p.id === fromPhase) return { ...c, node: { ...p, children: p.children.filter((k) => k.node.id !== id) } }
      if (p.id === toPhase) return { ...c, node: { ...p, children: [...p.children, moving] } }
      return c
    }),
  }
}

/** Start each phase `months` after the one before (phase 1 at month 0), in plan order. */
export function stagger(root: Node, months: number): Node {
  if (!isPhased(root)) throw new Error('Set up phases first')
  if (!(Number.isInteger(months) && months >= 0)) throw new Error('Gap must be a whole number of months, 0 or more')
  return { ...root, children: root.children.map((c, i) => ({ ...c, offsetMonths: i * months })) }
}

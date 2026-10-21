// Development tracker: the procedural side of the pro forma. For one building (or the master-plan level), every
// applicable catalogue item becomes a task, grouped by stage, with status, actual spend, receipts and notes.
// Pure: no storage, no clock (callers pass timestamps).

import type { CatalogueItem } from '../engine/catalogue'
import type { CostLine, Timing } from '../engine/costs'
import { isPortfolio, type Node } from '../engine/portfolio'

export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'not-applicable'

export interface Receipt {
  id: string
  name: string
  type: string
  size: number
  sha256: string
  addedAt: string
}

export interface TaskRecord {
  status: TaskStatus
  actual: number | null // spent to date, CAD
  receipts: Receipt[]
  notes: string
  updatedAt?: string
}

/** Keyed by `${scopeKey}|${catalogueId}`; scopeKey = node path joined by '/' ('' for the root). */
export type TrackerState = Record<string, TaskRecord>

export const taskKey = (scope: string[], catalogueId: string) => `${scope.join('/')}|${catalogueId}`
export const emptyRecord = (): TaskRecord => ({ status: 'todo', actual: null, receipts: [], notes: '' })

export interface Task {
  key: string
  item: CatalogueItem
  inModel: 'line' | 'covered' | 'missing'
  coverageNote: string
  budget: number | null // modelled total for this item in this scope; null when not a cost line
  record: TaskRecord
}

export interface StageProgress {
  id: string
  label: string
  tasks: Task[]
  done: number // done or not-applicable
  total: number
  budget: number
  actual: number
  complete: boolean
}

export interface TrackerView {
  stages: StageProgress[]
  current: string | null // first stage not complete; null when everything is done
  done: number
  total: number
  budget: number
  actual: number
}

const closed = (s: TaskStatus) => s === 'done' || s === 'not-applicable'

export function buildTracker(args: {
  scope: string[]
  stages: Array<{ id: string; label: string }>
  entries: Array<{ item: CatalogueItem; status: 'line' | 'covered' | 'unaccounted' | 'to-confirm'; note: string }>
  budgets: Map<string, number> // catalogueId → modelled total in this scope
  state: TrackerState
}): TrackerView {
  const tasks: Task[] = args.entries
    .filter((e) => e.status !== 'to-confirm')
    .map((e) => {
      const key = taskKey(args.scope, e.item.id)
      return {
        key,
        item: e.item,
        inModel: e.status === 'line' ? 'line' : e.status === 'covered' ? 'covered' : 'missing',
        coverageNote: e.note,
        budget: args.budgets.get(e.item.id) ?? null,
        record: args.state[key] ?? emptyRecord(),
      }
    })
  const stages = args.stages
    .map((s) => {
      const inStage = tasks.filter((t) => t.item.stage === s.id)
      const done = inStage.filter((t) => closed(t.record.status)).length
      return {
        id: s.id, label: s.label, tasks: inStage, done, total: inStage.length,
        budget: inStage.reduce((sum, t) => sum + (t.budget ?? 0), 0),
        actual: inStage.reduce((sum, t) => sum + (t.record.actual ?? 0), 0),
        complete: inStage.length > 0 && done === inStage.length,
      }
    })
    .filter((s) => s.total > 0)
  return {
    stages,
    current: stages.find((s) => !s.complete)?.id ?? null,
    done: stages.reduce((s, x) => s + x.done, 0),
    total: stages.reduce((s, x) => s + x.total, 0),
    budget: stages.reduce((s, x) => s + x.budget, 0),
    actual: stages.reduce((s, x) => s + x.actual, 0),
  }
}

/** Default timing when a missing item is added to the model, by stage. Portfolios only accept month/spread timing. */
export function defaultTiming(stage: string, node: Node): Timing {
  if (isPortfolio(node)) return { kind: 'month', month: 0 }
  const pre = node.timing.preConstructionMonths
  if (['s0', 's1'].includes(stage)) return { kind: 'month', month: 0 }
  if (['s2', 's3'].includes(stage)) return pre > 0 ? { kind: 'spread', from: 1, to: pre } : { kind: 'month', month: 0 }
  if (['s4', 's5', 's6'].includes(stage)) return { kind: 'constructionStart' }
  if (['s7', 's8', 's9', 's15'].includes(stage)) return { kind: 'construction' }
  return { kind: 'completion' }
}

/** A recorded actual replaces the estimate: the line becomes an exact lump sum (class tightens to "exact"). */
export function lineFromActual(line: CostLine, actual: number): CostLine {
  return { ...line, driver: { kind: 'lumpSum', amount: actual }, estimateClass: 'exact', band: undefined }
}

export function lineFromItem(item: CatalogueItem, amount: number, node: Node, existingIds: Set<string>): CostLine {
  let id = item.id
  for (let n = 2; existingIds.has(id); n++) id = `${item.id}-${n}`
  return {
    id, label: item.label, catalogueId: item.id,
    driver: { kind: 'lumpSum', amount },
    timing: defaultTiming(item.stage, node),
    estimateClass: (['A', 'B', 'C', 'D', 'exact'].includes(item.class) ? item.class : 'C') as CostLine['estimateClass'],
  }
}

// ---------------------------------------------------------------- receipts

export const RECEIPT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'text/csv']
export const RECEIPT_MAX_BYTES = 15 * 1024 * 1024

export function validateReceipt(file: { name: string; type: string; size: number }): string | null {
  if (!RECEIPT_TYPES.includes(file.type)) return `${file.name}: only PDF, PNG, JPEG, WebP, HEIC or CSV receipts are accepted`
  if (file.size > RECEIPT_MAX_BYTES) return `${file.name}: larger than 15 MB`
  if (file.size === 0) return `${file.name}: empty file`
  return null
}

// ---------------------------------------------------------------- plan changes

const uniqueId = (base: string, taken: Set<string>) => {
  let id = `${base}-copy`
  for (let n = 2; taken.has(id); n++) id = `${base}-copy-${n}`
  return id
}

function allIds(node: Node, out = new Set<string>()): Set<string> {
  out.add(node.id)
  if (isPortfolio(node)) node.children.forEach((c) => allIds(c.node, out))
  return out
}

/**
 * Adds a copy of the building at `path` beside it (same phase), starting `offsetMonths` later.
 * If the root itself is a single project, it becomes a plan with the original and the copy.
 * Returns the new root and the path to the new building.
 */
export function addBuilding(root: Node, path: string[], offsetMonths: number): { root: Node; path: string[] } {
  const taken = allIds(root)
  if (!path.length) {
    if (isPortfolio(root)) throw new Error('Choose a building to duplicate')
    const copy = { ...structuredClone(root), id: uniqueId(root.id, taken), name: `${root.name} (building 2)` }
    return {
      root: { id: `${root.id}-plan`, name: root.name, discountRate: root.discountRate, costEscalation: root.costEscalation, costLines: [], children: [{ offsetMonths: 0, node: root }, { offsetMonths, node: copy }] },
      path: [copy.id],
    }
  }
  const parentPath = path.slice(0, -1)
  const id = path.at(-1)!
  const insert = (node: Node, rest: string[]): Node => {
    if (!isPortfolio(node)) throw new Error('Path does not lead to a building')
    if (rest.length) return { ...node, children: node.children.map((c) => (c.node.id === rest[0] ? { ...c, node: insert(c.node, rest.slice(1)) } : c)) }
    const original = node.children.find((c) => c.node.id === id)
    if (!original) throw new Error(`No building "${id}"`)
    const copy = { ...structuredClone(original.node), id: uniqueId(id, taken), name: `${original.node.name} (copy)` }
    return { ...node, children: [...node.children, { offsetMonths: original.offsetMonths + offsetMonths, node: copy }] }
  }
  const newRoot = insert(root, parentPath)
  const parent = parentPath.reduce<Node>((n, p) => (isPortfolio(n) ? n.children.find((c) => c.node.id === p)!.node : n), newRoot)
  const added = isPortfolio(parent) ? parent.children.at(-1)!.node.id : id
  return { root: newRoot, path: [...parentPath, added] }
}

export function removeNode(root: Node, path: string[]): Node {
  if (!path.length) throw new Error('The whole project cannot be removed')
  const remove = (node: Node, rest: string[]): Node => {
    if (!isPortfolio(node)) throw new Error('Path does not lead to a building')
    if (rest.length === 1) {
      if (node.children.length <= 1) throw new Error('A plan needs at least one building or phase')
      return { ...node, children: node.children.filter((c) => c.node.id !== rest[0]) }
    }
    return { ...node, children: node.children.map((c) => (c.node.id === rest[0] ? { ...c, node: remove(c.node, rest.slice(1)) } : c)) }
  }
  return remove(root, path)
}

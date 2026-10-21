// Catalogue checklist: given a project type and its variables, which cost items apply, by stage.
// Import-free on purpose so scripts can load it with plain Node type stripping.

export type SourceTag = 'V' | 'S' | 'Q' | 'P'
export type Attributes = Record<string, boolean | number | string | null | undefined>

export interface CatalogueItem {
  id: string
  stage: string
  label: string
  types: 'all' | string[]
  except?: string[]
  when?: string[]
  driver: string
  basis?: string
  value?: number
  unit?: string
  class: string
  timing: string
  src: SourceTag
  ref?: string
}

export interface Catalogue {
  version: string
  asOf: string
  stages: Array<{ id: string; label: string }>
  projectTypes: Array<{ id: string; label: string; components: string[]; example: string }>
  variables: Array<{ id: string; group: string; label: string; type: string; unit?: string; options?: string[]; source: string; ref?: string }>
  items: CatalogueItem[]
}

const parse = (condition: string) => {
  const ge = condition.split('>=')
  if (ge.length === 2) return { variable: ge[0]!, op: '>=' as const, operand: ge[1]! }
  const eq = condition.split('=')
  if (eq.length === 2) return { variable: eq[0]!, op: '=' as const, operand: eq[1]! }
  return { variable: condition, op: 'truthy' as const, operand: '' }
}

/** true / false, or null when the variable is not set yet (the item is "to confirm"). */
export function evaluate(condition: string, attributes: Attributes): boolean | null {
  const { variable, op, operand } = parse(condition)
  const value = attributes[variable]
  if (value === undefined || value === null) return null
  if (op === '=') return String(value) === operand
  if (op === '>=') return Number(value) >= Number(operand)
  return typeof value === 'number' ? value > 0 : Boolean(value)
}

export const appliesToType = (item: CatalogueItem, type: string) =>
  (item.types === 'all' || item.types.includes(type)) && !(item.except ?? []).includes(type)

export interface ChecklistEntry {
  item: CatalogueItem
  status: 'applies' | 'to-confirm' // to-confirm: depends on a variable not set yet
  unsetVariables: string[]
}

export interface Checklist {
  type: string
  stages: Array<{ id: string; label: string; entries: ChecklistEntry[] }>
  counts: { applies: number; toConfirm: number; excluded: number }
}

export function checklist(catalogue: Catalogue, type: string, attributes: Attributes = {}): Checklist {
  if (!catalogue.projectTypes.some((t) => t.id === type)) throw new RangeError(`Unknown project type "${type}"`)
  let excluded = 0
  const entries: ChecklistEntry[] = []
  for (const item of catalogue.items) {
    if (!appliesToType(item, type)) {
      excluded++
      continue
    }
    const results = (item.when ?? []).map((c) => ({ c, r: evaluate(c, attributes) }))
    if (results.some((x) => x.r === false)) {
      excluded++
      continue
    }
    const unset = results.filter((x) => x.r === null).map((x) => parse(x.c).variable)
    entries.push({ item, status: unset.length ? 'to-confirm' : 'applies', unsetVariables: unset })
  }
  const stages = catalogue.stages
    .map((s) => ({ ...s, entries: entries.filter((e) => e.item.stage === s.id) }))
    .filter((s) => s.entries.length)
  return {
    type,
    stages,
    counts: { applies: entries.filter((e) => e.status === 'applies').length, toConfirm: entries.filter((e) => e.status === 'to-confirm').length, excluded },
  }
}

export function validateCatalogue(catalogue: Catalogue): string[] {
  const errors: string[] = []
  const stageIds = new Set(catalogue.stages.map((s) => s.id))
  const typeIds = new Set(catalogue.projectTypes.map((t) => t.id))
  const variables = new Map(catalogue.variables.map((v) => [v.id, v]))
  const seen = new Set<string>()
  if (variables.size !== catalogue.variables.length) errors.push('variable ids must be unique')
  for (const item of catalogue.items) {
    if (seen.has(item.id)) errors.push(`${item.id}: duplicate item id`)
    seen.add(item.id)
    if (!stageIds.has(item.stage)) errors.push(`${item.id}: unknown stage ${item.stage}`)
    for (const t of [...(item.types === 'all' ? [] : item.types), ...(item.except ?? [])]) {
      if (!typeIds.has(t)) errors.push(`${item.id}: unknown project type ${t}`)
    }
    for (const condition of item.when ?? []) {
      const { variable, op, operand } = parse(condition)
      const v = variables.get(variable)
      if (!v) errors.push(`${item.id}: unknown variable ${variable}`)
      else if (op === '=' && v.type === 'enum' && !(v.options ?? []).includes(operand)) errors.push(`${item.id}: ${variable} has no option "${operand}"`)
    }
    if (!['V', 'S', 'Q', 'P'].includes(item.src)) errors.push(`${item.id}: bad src tag`)
    if (item.src === 'V' && !item.ref) errors.push(`${item.id}: verified items need a ref`)
  }
  return errors
}

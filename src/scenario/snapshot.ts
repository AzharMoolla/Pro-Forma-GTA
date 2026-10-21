// Scenario snapshots (ADR-001): canonical JSON + SHA-256, locked snapshots never change, edits branch a child.

import type { Attributes } from '../engine/catalogue'
import { CONVENTION_VERSION, ENGINE_VERSION } from '../engine/project'
import type { Node } from '../engine/portfolio'

/** Schema 1 hashed the financial input only. Schema 2 hashes the whole evidence envelope (see `envelope`). */
export const SNAPSHOT_SCHEMA = 2

/** Stable JSON: object keys sorted at every level, so equal inputs always hash equally. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`
}

export async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface Snapshot {
  schema: 1 | 2
  id: string // = hash prefix + sequence, stable for display
  parentId: string | null
  label: string
  note: string // purpose, recorded before results are viewed (QuantLab pre-registration)
  createdAt: string // ISO, supplied by the caller (the engine never reads the clock)
  engineVersion: string
  conventionVersion: string
  inputHash: string // SHA-256 of canonical(envelope(snapshot))
  locked: boolean
  input: Node
  attributes: Attributes | null // site, policy and program variables (schema 2)
  context: Record<string, string> | null // data versions the result depends on: catalogue, map layers (schema 2)
}

/** What a snapshot's hash covers. Schema 2 pins inputs, project variables, data versions and engine/convention versions together. */
export function envelope(s: Pick<Snapshot, 'schema' | 'input' | 'attributes' | 'context' | 'engineVersion' | 'conventionVersion'>): unknown {
  if (s.schema === 1) return s.input
  return { schema: 2, input: s.input, attributes: s.attributes, context: s.context, engineVersion: s.engineVersion, conventionVersion: s.conventionVersion }
}

/** Reads a stored envelope back (schema 2), or a bare schema-1 input. */
export function fromEnvelope(stored: unknown): Pick<Snapshot, 'schema' | 'input' | 'attributes' | 'context'> {
  const e = stored as { schema?: number; input?: Node; attributes?: Attributes | null; context?: Record<string, string> | null }
  return e && e.schema === 2 && e.input
    ? { schema: 2, input: e.input, attributes: e.attributes ?? null, context: e.context ?? null }
    : { schema: 1, input: stored as Node, attributes: null, context: null }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}

export async function createSnapshot(args: {
  input: Node; attributes: Attributes; context: Record<string, string>; label: string; note: string; createdAt: string; parentId: string | null; sequence: number
}): Promise<Snapshot> {
  const body = {
    schema: SNAPSHOT_SCHEMA as 2, input: structuredClone(args.input), attributes: structuredClone(args.attributes), context: { ...args.context },
    engineVersion: ENGINE_VERSION, conventionVersion: CONVENTION_VERSION,
  }
  const inputHash = await sha256(canonical(envelope(body)))
  return { ...body, id: `${args.sequence}-${inputHash.slice(0, 8)}`, parentId: args.parentId, label: args.label, note: args.note, createdAt: args.createdAt, inputHash, locked: false }
}

/** Locking freezes the whole snapshot, nested input included (Object.freeze alone is shallow). */
export const lock = (s: Snapshot): Snapshot => deepFreeze({ ...structuredClone(s), locked: true })

/** Editing a locked snapshot is refused; callers branch a child instead. */
export function assertEditable(s: Snapshot): void {
  if (s.locked) throw new Error(`Scenario "${s.label}" is locked. Branch a new scenario to change it.`)
}

/** Verifies a stored snapshot still matches its hash (detects tampering or silent mutation). */
export async function verify(s: Snapshot): Promise<boolean> {
  return (await sha256(canonical(envelope(s)))) === s.inputHash
}

/** Flattened path → value for every leaf that differs between two inputs. */
export function diffInputs(a: unknown, b: unknown, path = ''): Array<{ path: string; before: unknown; after: unknown }> {
  if (canonical(a) === canonical(b)) return []
  const isObj = (v: unknown) => v !== null && typeof v === 'object'
  if (!isObj(a) || !isObj(b) || Array.isArray(a) !== Array.isArray(b)) return [{ path: path || '(root)', before: a, after: b }]
  // Arrays of objects with ids are matched by id so reordering is not a change.
  const keyed = (v: unknown): Map<string, unknown> | null =>
    Array.isArray(v) && v.every((x) => isObj(x) && typeof (x as { id?: unknown }).id === 'string')
      ? new Map(v.map((x) => [(x as { id: string }).id, x]))
      : null
  const ka = keyed(a)
  const kb = keyed(b)
  const left: Map<string, unknown> = ka ?? new Map(Object.entries(a as object))
  const right: Map<string, unknown> = kb ?? new Map(Object.entries(b as object))
  const keys = [...new Set([...left.keys(), ...right.keys()])]
  return keys.flatMap((k) => diffInputs(left.get(k), right.get(k), path ? `${path}.${k}` : k))
}

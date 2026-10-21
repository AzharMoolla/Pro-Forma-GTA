// Scenario snapshots (ADR-001): canonical JSON + SHA-256, locked snapshots never change, edits branch a child.

import { CONVENTION_VERSION, ENGINE_VERSION } from '../engine/project'
import type { Node } from '../engine/portfolio'

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
  id: string // = hash prefix + sequence, stable for display
  parentId: string | null
  label: string
  note: string // purpose, recorded before results are viewed (QuantLab pre-registration)
  createdAt: string // ISO, supplied by the caller (the engine never reads the clock)
  engineVersion: string
  conventionVersion: string
  inputHash: string
  locked: boolean
  input: Node
}

export async function createSnapshot(args: { input: Node; label: string; note: string; createdAt: string; parentId: string | null; sequence: number }): Promise<Snapshot> {
  const inputHash = await sha256(canonical(args.input))
  return {
    id: `${args.sequence}-${inputHash.slice(0, 8)}`,
    parentId: args.parentId,
    label: args.label,
    note: args.note,
    createdAt: args.createdAt,
    engineVersion: ENGINE_VERSION,
    conventionVersion: CONVENTION_VERSION,
    inputHash,
    locked: false,
    input: structuredClone(args.input),
  }
}

export const lock = (s: Snapshot): Snapshot => Object.freeze({ ...s, locked: true })

/** Editing a locked snapshot is refused; callers branch a child instead. */
export function assertEditable(s: Snapshot): void {
  if (s.locked) throw new Error(`Scenario "${s.label}" is locked. Branch a new scenario to change it.`)
}

/** Verifies a stored snapshot still matches its hash (detects tampering or silent mutation). */
export async function verify(s: Snapshot): Promise<boolean> {
  return (await sha256(canonical(s.input))) === s.inputHash
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

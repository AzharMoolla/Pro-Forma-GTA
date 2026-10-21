// Runs Monte Carlo and tornado off the main thread so the page stays responsive.
import type { Node } from '../engine/portfolio'
import { simulate, tornado } from '../engine/uncertainty'

export interface SimRequest { node: Node; draws: number; seed: number; metrics: string[]; tornadoMetric: string }

const ctx = self as unknown as { onmessage: ((e: MessageEvent<SimRequest>) => void) | null; postMessage: (m: unknown) => void }

ctx.onmessage = (e) => {
  try {
    const { node, draws, seed, metrics, tornadoMetric } = e.data
    ctx.postMessage({ ok: true, sim: simulate(node, { draws, seed, metrics }), tornado: tornado(node, tornadoMetric) })
  } catch (error) {
    ctx.postMessage({ ok: false, error: (error as Error).message })
  }
}

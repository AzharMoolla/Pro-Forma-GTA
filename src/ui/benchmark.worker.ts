// Runs the published-pro-forma benchmark off the main thread (thirty residual-land solves take a few seconds).
import { benchmark } from '../verification/benchmarks'

const ctx = self as unknown as { onmessage: (() => void) | null; postMessage: (m: unknown) => void }

ctx.onmessage = () => {
  try {
    ctx.postMessage({ ok: true, condo: benchmark('condo'), rental: benchmark('rental') })
  } catch (error) {
    ctx.postMessage({ ok: false, error: (error as Error).message })
  }
}

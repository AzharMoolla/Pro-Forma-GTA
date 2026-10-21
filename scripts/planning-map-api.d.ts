declare module '*/planning-map-api.mjs' {
  import type { IncomingMessage, ServerResponse } from 'node:http'
  export function planningMapHandler(options?: { root?: string; prefix?: string }): (req: IncomingMessage, res: ServerResponse, next?: () => void) => Promise<void>
}

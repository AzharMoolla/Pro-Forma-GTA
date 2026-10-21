import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { planningMapHandler } from './scripts/planning-map-api.mjs'

// The planning map (scripts/planning-map-preview.html + local data API) is served at /map/ by the dev and preview
// servers. Its data is local and git-ignored; a production host needs its own API (not deployed yet, D-12).
const planningMap = (): Plugin => {
  const handle = planningMapHandler({ prefix: '/map' })
  return {
    name: 'planning-map',
    configureServer: (server) => { server.middlewares.use((req, res, next) => void handle(req, res, next)) },
    configurePreviewServer: (server) => { server.middlewares.use((req, res, next) => void handle(req, res, next)) },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), planningMap()],
  server: { port: Number(process.env.PORT) || 5180, strictPort: false },
  test: { include: ['tests/**/*.test.ts'] },
})

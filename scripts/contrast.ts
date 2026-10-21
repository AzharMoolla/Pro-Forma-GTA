// WCAG contrast check for the UI tokens in src/ui/styles.css (light and dark). Exits 1 on failure.
import { readFileSync } from 'node:fs'

const css = readFileSync('src/ui/styles.css', 'utf8')
const block = (re: RegExp) => Object.fromEntries([...(css.match(re)?.[1] ?? '').matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1]!, m[2]!]))
const themes = { light: block(/:root \{([\s\S]*?)\}/), dark: block(/:root\[data-theme='dark'\] \{([\s\S]*?)\}/) }
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05) }
const checks: Array<[string, string, number]> = [
  ['ink', 'page', 4.5], ['ink', 'surface', 4.5], ['ink-soft', 'surface', 4.5], ['ink-mute', 'surface', 4.5], ['ink-mute', 'page', 4.5],
  ['ink-mute', 'sunken', 4.5], ['accent', 'surface', 4.5], ['accent', 'page', 4.5], ['on-accent', 'accent', 4.5], ['accent', 'accent-soft', 4.5],
  ['warn', 'warn-soft', 4.5], ['bad', 'bad-soft', 4.5], ['good', 'good-soft', 4.5], ['border-strong', 'surface', 3], ['chart-in', 'surface', 3], ['chart-out', 'surface', 3],
]
let failed = 0
for (const [name, t] of Object.entries(themes)) for (const [fg, bg, min] of checks) {
  const r = ratio(t[fg]!, t[bg]!)
  if (r < min) { failed++; console.log(`FAIL ${name} ${fg} on ${bg}: ${r.toFixed(2)} < ${min}`) }
}
console.log(failed ? `${failed} contrast failures` : `All ${checks.length * 2} contrast checks pass`)
process.exit(failed ? 1 : 0)

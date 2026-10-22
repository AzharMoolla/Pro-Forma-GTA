import { mkdir, writeFile } from 'node:fs/promises'
import { strToU8, zipSync } from 'fflate'
import { pieces, pieceSvg, sceneSvg, podiumTypes, podiumSvg, type Skin } from '../src/design-lab/components'
import { inventory } from '../src/design-lab/inventory'

const out = new URL('../docs/design/component-lab-2026-10-21/', import.meta.url)
await mkdir(new URL('svg/', out), { recursive: true })
const files: Record<string, Uint8Array> = {}
for (const piece of pieces) for (const skin of ['watercolour', 'blueprint'] as Skin[]) {
  const name = `${piece.id}-${piece.name.toLowerCase().replace(/[^a-z0-9+]+/g, '-')}-${skin}.svg`
  const svg = pieceSvg(piece, skin)
  files[name] = strToU8(svg)
  await writeFile(new URL(`svg/${name}`, out), svg)
}
for(const kind of podiumTypes)for(const skin of ['watercolour','blueprint'] as Skin[]){const name=`podium-${kind}-${skin}.svg`;const svg=podiumSvg(kind,skin);files[name]=strToU8(svg);await writeFile(new URL(`svg/${name}`,out),svg)}
for (const skin of ['watercolour', 'blueprint'] as Skin[]) await writeFile(new URL(`assembled-${skin}.svg`, out), sceneSvg(skin))
files['README.txt'] = strToU8(`PlanGTA original component trial. Transparent SVGs; metre coordinates; y=0 is ground. ${pieces.length} components, two skins. Synthetic examples; no actual site, design, amenity placement or policy clearance is established. See the lab for triggers and limits.`)
await writeFile(new URL('component-kit.zip', out), zipSync(files))
await writeFile(new URL('inventory.json', out), JSON.stringify({ plannedComponents: inventory.reduce((n, group) => n + group.length - 1, 0), trialComponents: pieces.map(({id,name,size,trigger,note}) => ({id,name,size,trigger,note})), inventory }, null, 2))
console.log(`Exported ${pieces.length*2+8} transparent component SVGs, two assembled strips, inventory and ZIP to docs/design/component-lab-2026-10-21/`)

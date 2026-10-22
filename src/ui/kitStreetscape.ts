// The streetscape drawn with the component kit (src/design-lab/components.ts). Pure: turns a Scene (from the pro forma
// and its project variables, streetscapeScene.ts) into kit art in metres plus the layout the text overlays need.
// Only what the data says is drawn; everything is illustrative, not a surveyed layout or a building envelope.

import {
  RISE, amenityBadge, background, building, creek, lakeEdge, pond, ravine, bus, car, civic, definitions, existingBuilding, greenRoof, industrial, lamp, landPlot, office,
  palettes, park, phaseBadge, pieces, playgroundPiece, railPlatform, roofTerrace, schoolSite, solar, subway, townhouses, train, tree, uniqueSvg,
  type Palette, type Skin,
} from '../design-lab/components'
import { FLOOR_TO_FLOOR_M } from '../location/zoning'
import { controllingLimit, type Building, type Part, type Scene } from './streetscapeScene'

export const GROUND_Y = 384 // drawing units: the street front, as before
const MARGIN = 40
const GAP = 3 // metres between pieces

export interface Placed { part: Part; x: number; w: number; top: number } // metres: left, width, height above ground
export interface KitLayout { S: number; placed: Placed[]; Wm: number; W: number; streetM: number; streetBottom: number; padding: number; /** metres drawn past each edge, so the street and city run to the frame however wide it is */ bleed: number }

/** Height of a building in metres (storeys at the shared floor-to-floor). */
export const metresOf = (b: Building) => b.storeys * FLOOR_TO_FLOOR_M
export const limitMetresOf = (storeys: number | null, metres: number | null) => metres ?? (storeys === null ? null : storeys * FLOOR_TO_FLOOR_M)
const townBays = (b: Building) => Math.max(3, Math.min(8, Math.round((b.floorplate * b.storeys) / 1800)))

function size(part: Part): { w: number; top: number } {
  if (part.kind === 'building') {
    const b = part.b
    const h = metresOf(b)
    const extra = (b.heritage ? 16.7 : 0) + (b.childcare ? 13 : 0)
    if (b.kind === 'townhouse') return { w: (townBays(b) * 4.4) + 1.1 + extra, top: 11 }
    if (b.kind === 'office') return { w: 18.7 + extra, top: h + 1 }
    if (b.kind === 'industrial') return { w: 24.7 + extra, top: Math.max(6, h) + 1 }
    if (b.kind === 'institutional') return { w: 13.7 + extra, top: Math.max(6.7, h) + 1 }
    if (b.kind === 'lots') return { w: 22 + extra, top: 3 }
    return { w: (b.retail || b.podium ? 19.4 : 16.7) + extra, top: h + 3 }
  }
  if (part.kind === 'station') return part.transit === 'subway' ? { w: 7.5, top: 5 } : { w: 29.5, top: 7 }
  if (part.kind === 'tree') return { w: 5, top: 10 }
  if (part.kind === 'park') return { w: 18, top: 9 }
  if (part.kind === 'school') return { w: 23.5, top: 3.5 }
  if (part.kind === 'pond') return { w: 10.4, top: 1.2 }
  if (part.kind === 'creek') return { w: 17, top: 2.6 }
  if (part.kind === 'lake' || part.kind === 'ravine') return { w: 18.5, top: part.kind === 'ravine' ? 7 : 2 }
  if (part.kind === 'pops') return { w: 19, top: 5.5 }
  if (part.kind === 'garage') return { w: 7.8, top: 4.1 }
  if (part.kind === 'utility') return { w: 4.2, top: 1.9 }
  if (part.kind === 'greenbelt') return { w: 10.5, top: 10 }
  return { w: 13.7, top: 7.5 }
}

/** Positions in metres and one scale that fits the tallest piece or limit inside the picture. */
export function kitLayout(scene: Scene): KitLayout {
  let x = 4
  const placed: Placed[] = scene.parts.map((part) => {
    const { w, top } = size(part)
    const p = { part, x, w, top }
    x += w + GAP
    return p
  })
  const Wm = x + 2
  const limits = scene.buildings.flatMap((b) => [limitMetresOf(b.limitStoreys, b.limitMetres), b.airLimitMetres]).filter((v): v is number => v !== null)
  const tallest = Math.max(12, ...placed.map((p) => p.top), ...limits.map((l) => l + 2))
  const S = Math.min(9, (GROUND_Y - 60) / tallest)
  const lanes = scene.street.lanes
  const streetM = 2 + (lanes * 3.2) + (scene.street.sidewalkFar ? 2 : .6) + (scene.street.tunnel ? 7 : 0)
  // A short project leaves the picture wide: the street runs edge to edge, the project sits in the middle, and the
  // extra frontage on either side is shown as street trees (context, not part of the project)
  const W = Math.max(980, (Wm * S) + (2 * MARGIN))
  const fullM = (W - (2 * MARGIN)) / S
  const shift = (fullM - Wm) / 2
  if (shift > 0) for (const q of placed) q.x += shift
  return { S, placed, Wm: fullM, W, streetM, streetBottom: GROUND_Y + (streetM * S) + 4, padding: shift > 6 ? shift : 0, bleed: W / S }
}

/** Kit pieces drawn through the lab's catalogue (the ones not exported one by one). */
const piece = (p: Palette, id: string) => pieces.find((q) => q.id === id)!.draw(p)

const wrap = (feature: string, art: string, extra = '') => `<g data-feature="${feature}"${extra}>${art}</g>`
const at = (x: number, art: string, y = 0) => `<g transform="translate(${x} ${y})">${art}</g>`

function buildingArt(p: Palette, b: Building, x: number, phases: number): string {
  const h = metresOf(b)
  let s = ''
  let bx = x
  if (b.heritage) { s += wrap('heritage', at(bx, existingBuilding(p, 9))); bx += 16.7 }
  if (b.kind === 'townhouse') s += wrap('townhouses', at(bx, townhouses(p, townBays(b))))
  else if (b.kind === 'office') s += wrap('curtain-wall', at(bx, office(p, Math.max(8, h))))
  else if (b.kind === 'industrial') s += wrap('industrial', at(bx, industrial(p, Math.max(6, h))))
  else if (b.kind === 'institutional') s += wrap('portico', at(bx, civic(p, Math.max(6.7, h))))
  else if (b.kind === 'lots') s += wrap('houses', at(bx, landPlot(p)))
  else {
    const podium = b.retail || b.podium > 0
    s += wrap(podium ? 'storefront' : 'tower', at(bx, building(p, Math.max(6, h), podium)))
    if (b.balconies) s += `<g data-feature="balconies"></g>` // the corner balcony stack is part of the tower drawing
    // Roof attachments sit on the roof (the setback crown when the tower has one)
    const roofX = bx + (podium ? 1.4 : 0) + (h - (podium ? .67 : 0) >= 18 ? 1.4 : 0)
    const roofY = -Math.max(6, h)
    if (b.greenRoof && !podium) s += wrap('green-roof', at(roofX, greenRoof(p, 12, 0), roofY))
    else if (b.greenRoof) s += `<g data-feature="green-roof"></g>` // drawn with the podium tower
    if (b.solar) s += wrap('solar', at(roofX + 5.2, `<g transform="scale(.9)">${solar(p)}</g>`, roofY))
    if (b.rooftopAmenity) s += wrap('rooftop-amenity', at(roofX + .2, `<g transform="scale(.5)">${roofTerrace(p)}</g>`, roofY))
    if (b.pool) s += wrap('pool', at(roofX + 9.5, `<g transform="scale(.8)">${amenityBadge(p)}</g>`, roofY))
  }
  // Phase marker at the building's foot, in a plan of phases
  if (b.phase !== null && phases > 0) s += wrap('phase-badge', at(x - 2.6, phaseBadge(p, b.phase, phases)), ` data-phase="${b.phase}"`)
  // Street life in front of shops, and a bicycle rack where the program provides bike parking (on the sidewalk)
  if (b.retail) s += wrap('street-life', at(x + 2, piece(p, '48'), 1.3) + at(x + 9, piece(p, '52'), 1.1) + at(x + 11.6, piece(p, '53'), 1.1))
  if (b.bikeParking) s += wrap('bike-rack', at(x + 13.6, piece(p, '38'), 1.6))
  if (b.childcare) s += wrap('playground', at(x + size({ kind: 'building', b, x: 0, w: 0 }).w - 12.6, `<g transform="scale(.95)">${playgroundPiece(p)}</g>`))
  return `<g data-building="${buildingKey(b.id)}">${s}</g>`
}

function partArt(p: Palette, placed: Placed, phases: number): string {
  const { part, x } = placed
  if (part.kind === 'building') return buildingArt(p, part.b, x, phases)
  if (part.kind === 'station') return part.transit === 'subway'
    ? wrap('subway-station', at(x, subway(p)))
    // Train first, set back by the platform's 3 m depth on the shared projection, so the platform floor hides its wheels
    : wrap('go-station', at(x + 3.4, train(p), -3 * RISE) + at(x, railPlatform(p, 26, false)))
  if (part.kind === 'tree') return at(x + 2.5, tree(p, 0, 0, .7, Math.round(x) % 3))
  if (part.kind === 'park') return wrap('park', at(x, park(p)))
  if (part.kind === 'school') return wrap('school', at(x, schoolSite(p)))
  if (part.kind === 'pond') return wrap('pond', at(x, pond(p)))
  if (part.kind === 'creek') return wrap('creek', at(x, creek(p)))
  if (part.kind === 'lake') return wrap('lake', at(x, lakeEdge(p)))
  if (part.kind === 'ravine') return wrap('ravine', at(x, ravine(p)))
  if (part.kind === 'pops') return wrap('pops', at(x, piece(p, '23')))
  if (part.kind === 'garage') return wrap('garage', at(x, piece(p, '56')))
  if (part.kind === 'utility') return wrap('utility', at(x, piece(p, '57')))
  if (part.kind === 'greenbelt') return wrap('woodland', at(x, piece(p, '19')))
  return wrap('community', at(x, civic(p, 6.7)))
}

/** The street in front, in metres below the ground line: sidewalks, curbs, lanes, a crossing, driveways and traffic. */
function streetArt(p: Palette, scene: Scene, L: KitLayout): string {
  const e = L.bleed, Wm = L.Wm + (2 * e)
  const st = scene.street
  const road0 = 2, road1 = 2 + (st.lanes * 3.2)
  let s = ''
  if (st.sidewalkNear) s += wrap('sidewalk', `<rect x="0" y="0" width="${Wm}" height="2" fill="${p.wall}"/>` + Array.from({ length: Math.floor(Wm / 1.2) }, (_, i) => `<line x1="${i * 1.2}" y1="0" x2="${i * 1.2}" y2="2" stroke="${p.fine}" stroke-width=".02"/>`).join(''))
  s += wrap('curb', `<rect x="0" y="${road0 - .15}" width="${Wm}" height=".15" fill="${p.shade}" stroke="${p.ink}" stroke-width=".04"/><rect x="0" y="${road1}" width="${Wm}" height=".15" fill="${p.shade}" stroke="${p.ink}" stroke-width=".04"/>`)
  s += `<rect x="0" y="${road0}" width="${Wm}" height="${road1 - road0}" fill="${p.road}"/>`
  for (let k = 1; k < st.lanes; k++) {
    const y = road0 + (k * 3.2)
    s += `<line x1="0" y1="${y}" x2="${Wm}" y2="${y}" stroke="${k === st.lanes / 2 ? p.warm : p.paper}" stroke-width="${k === st.lanes / 2 ? .14 : .1}" ${k === st.lanes / 2 ? '' : 'stroke-dasharray="1.6 1.4"'}/>`
  }
  // A subway under the frontage: the tube in section below the street
  if (st.tunnel) {
    const ty = road1 + (st.sidewalkFar ? 2 : .15)
    let t = ''
    for (let tx = 0; tx < Wm; tx += 18) t += at(tx, piece(p, '62'), ty + .2)
    s += wrap('subway-tunnel', t)
  }
  if (st.sidewalkFar) s += `<rect x="0" y="${road1 + .15}" width="${Wm}" height="1.85" fill="${p.wall}"/>`
  // Driveways: dropped curbs at the first buildings, one per mapped access
  const firstBuildings = L.placed.filter((q) => q.part.kind === 'building').slice(0, st.accesses)
  for (const q of firstBuildings) s += wrap('driveway', `<rect x="${e + q.x + q.w - 4.5}" y="0" width="3.2" height="${road0}" fill="${p.shade}" stroke="${p.ink}" stroke-width=".03"/><path d="M${e + q.x + q.w - 4.5},${road0 - .15} l.4,.15 h2.4 l.4,-.15" fill="none" stroke="${p.ink}" stroke-width=".05"/>`)
  // A marked crossing where the map has one
  if (st.crossingM) { const cx = e + L.Wm - 14; s += wrap('crosswalk', Array.from({ length: Math.round((road1 - road0) / .9) }, (_, i) => `<rect x="${cx}" y="${road0 + .15 + (i * .9)}" width="4" height=".45" fill="${p.paper}"/>`).join('')) }
  // Traffic for scale: cars in alternate lanes, a bus when the site is on transit
  const laneMid = (k: number) => road0 + (k * 3.2) + 2.4
  for (let i = 0, cx = 8; cx < Wm - 10; i++, cx += 23) s += wrap('car', at(cx, car(p), laneMid(i % st.lanes)))
  // The nearest stop, when the map has one: a shelter and pole on the near sidewalk, behind the bus
  const busX = e + Math.min(L.Wm - 16, L.Wm * .55)
  if (st.stopM) s += wrap('bus-stop', at(busX - 7, piece(p, '39'), 1.8) + at(busX - 1.2, piece(p, '40'), 1.8))
  if (scene.buildings.some((b) => b.transit) || st.stopM) s += at(busX, bus(p), laneMid(0))
  return s
}

/** Street lamps on the near sidewalk, drawn last so they stand in front of buildings and trains. */
const lamps = (p: Palette, L: KitLayout) => {
  let s = ''
  for (let lx = 6 - (Math.ceil(L.bleed / 30) * 30); lx < L.Wm + L.bleed; lx += 30) s += at(0, lamp(p, lx), .2)
  return `<g data-feature="street-lamps">${s}</g>`
}

/** Kit art for the whole scene, in metres; the caller places it with translate(MARGIN, GROUND_Y) scale(S). */
export function kitArt(scene: Scene, skin: Skin, uid: string, L: KitLayout = kitLayout(scene)): string {
  const p = palettes[skin]
  // Context street trees in the padding either side of the project
  let context = ''
  for (let x = 4 - (Math.ceil(L.bleed / 9) * 9); x < L.padding - 4; x += 9) context += at(x, tree(p, 0, 0, .55, Math.round(x) % 3)) + at(L.Wm - x, tree(p, 0, 0, .55, (Math.round(x) + 1) % 3))
  // A soft city backdrop behind everything, tiled across the width (atmosphere, not the actual neighbours)
  let backdrop = ''
  for (let x = -L.bleed - 10; x < L.Wm + L.bleed; x += 178) backdrop += at(x, background(p))
  // A rail corridor beside the site: track behind the buildings, on the GO train's line (3 m back on the shared projection)
  let rail = ''
  if (scene.street.rail) for (let x = -L.bleed; x < L.Wm + L.bleed; x += 20) rail += at(x, piece(p, '61'), -3 * RISE)
  const art = definitions(skin) + backdrop + (rail && `<g data-feature="rail-corridor">${rail}</g>`) + `<g data-feature="street" transform="translate(${-L.bleed} 0)">${streetArt(p, scene, L)}</g>` + `<g data-feature="context" opacity=".85">${context}</g>` + L.placed.map((q) => partArt(p, q, scene.phases)).join('') + lamps(p, L)
  return uniqueSvg(art, `kit-${uid}`)
}

export const KIT_MARGIN = MARGIN
/** The id a building carries in the drawing (data-building), safe for attribute selectors. */
export const buildingKey = (id: string) => id.replace(/[^\w-]/g, '')
/** Drawing-unit x of a metre position, and y of a height above ground. */
export const px = (L: KitLayout, xm: number) => MARGIN + (xm * L.S)
export const py = (L: KitLayout, hm: number) => GROUND_Y - (hm * L.S)
export const overLimit = (b: Building) => { const c = controllingLimit(b); return c !== null && b.storeys > c }

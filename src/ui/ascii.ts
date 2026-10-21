// ASCII/ANSI streetscape: a playful, not-to-scale picture of the project that grows with what the pro forma contains.
// Pure and seeded: the same project always draws the same street. Characters are ASCII + box drawing only, so the
// columns stay aligned in IBM Plex Mono and survive "copy as text".

import { rng } from '../engine/uncertainty'

export type Ink = 'sand' | 'teal' | 'brick' | 'lavender' | 'sage' | 'gold' | 'lit' | 'dark' | 'green' | 'road' | 'text' | 'red' | 'blue' | 'white'
export interface Cell { ch: string; ink: Ink }
type Sprite = Cell[][] // rows top → bottom, all the same width

export interface StreetBuilding {
  id: string
  kind: 'tower' | 'midrise' | 'office' | 'lots'
  storeys: number
  podium: number // podium storeys (retail awnings if `retail`)
  retail: boolean
  label?: string // shown above the building (e.g. its profit)
}

export interface StreetFeatures {
  transit: 'subway' | 'go' | null
  parks: number // 0, 1 or 2 park sprites
  school: boolean
  community: boolean
  playground: boolean
  greenRoof: boolean
  streetTrees: boolean
  bikes: boolean
  pool: boolean
}

const WALL_INKS: Ink[] = ['sand', 'teal', 'brick', 'lavender', 'sage', 'gold']
const WALLS: Array<[string, string]> = [['║', '║'], ['│', '│'], ['[', ']']]
const ROOFS: Array<[string, string, string]> = [['╔', '═', '╗'], ['┌', '─', '┐'], ['.', '-', '.']]
const WINDOWS = ['#', 'o', '=', '+', '"']
const MAX_ROWS = 20

const seedOf = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261)

function blank(w: number, h: number): Sprite {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => ({ ch: ' ', ink: 'text' as Ink })))
}
function put(s: Sprite, x: number, y: number, text: string, ink: Ink) {
  ;[...text].forEach((ch, i) => {
    const row = s[y]
    if (row && x + i >= 0 && x + i < row.length) row[x + i] = { ch, ink }
  })
}
const fromLines = (lines: Array<[string, Ink]>, width = Math.max(...lines.map(([t]) => [...t].length))): Sprite => {
  const s = blank(width, lines.length)
  lines.forEach(([t, ink], y) => put(s, 0, y, t, ink))
  return s
}

function building(b: StreetBuilding, rows: number, rand: () => number, f: StreetFeatures): Sprite {
  if (b.kind === 'lots') {
    const houses = 3
    const s = blank(houses * 5, 3)
    for (let i = 0; i < houses; i++) {
      const ink = WALL_INKS[Math.floor(rand() * WALL_INKS.length)]!
      put(s, i * 5, 0, ' /\\ ', 'red')
      put(s, i * 5, 1, '/__\\', ink)
      put(s, i * 5, 2, `|${rand() > 0.5 ? 'o' : '#'}[|`, ink)
    }
    return s
  }
  const wallInk = WALL_INKS[Math.floor(rand() * WALL_INKS.length)]!
  const [wl, wr] = WALLS[Math.floor(rand() * WALLS.length)]!
  const [rl, rm, rr] = ROOFS[Math.floor(rand() * ROOFS.length)]!
  const win = b.kind === 'office' ? '|' : WINDOWS[Math.floor(rand() * WINDOWS.length)]!
  const inner = b.kind === 'tower' ? 5 + (2 * Math.floor(rand() * 3)) : b.kind === 'office' ? 9 : 9 + (2 * Math.floor(rand() * 2))
  const fireEscape = b.kind === 'midrise' && rand() > 0.35
  const podium = Math.min(b.podium, rows - 2)
  const podiumPad = podium > 0 ? 1 : 0
  const width = inner + 2 + (2 * podiumPad) + (fireEscape ? 1 : 0)
  const top = (b.kind === 'tower' ? 1 : 0) + (f.greenRoof ? 1 : 0)
  const s = blank(width, rows + top + 1)
  const x0 = podiumPad
  let y = 0
  if (b.kind === 'tower') {
    if (f.pool) put(s, x0 + 1 + Math.floor(inner / 2) - 1, y, '~~~', 'blue') // rooftop pool
    else put(s, x0 + 1 + Math.floor(inner / 2) - 1, y, rand() > 0.5 ? '┌┴┐' : '_|_', 'dark')
    y++
  }
  if (f.greenRoof) {
    put(s, x0 + 1, y, Array.from({ length: inner }, (_, i) => (i % 2 ? '&' : '"')).join(''), 'green')
    y++
  }
  put(s, x0, y, rl + rm.repeat(inner) + rr, wallInk)
  y++
  const towerRows = rows - podium
  for (let r = 0; r < towerRows; r++, y++) {
    put(s, x0, y, wl, wallInk)
    for (let c = 0; c < inner; c++) {
      if (b.kind === 'office') put(s, x0 + 1 + c, y, c % 3 === 1 ? '|' : '_', 'blue')
      else if (c % 2 === 0) put(s, x0 + 1 + c, y, win, rand() > 0.4 ? 'lit' : 'dark')
    }
    put(s, x0 + inner + 1, y, wr, wallInk)
    if (fireEscape) put(s, x0 + inner + 2, y, r % 2 ? '╫' : '╪', 'dark')
  }
  for (let r = 0; r < podium; r++, y++) {
    const pw = inner + 2 + (2 * podiumPad)
    if (r === 0 && b.retail) put(s, 0, y, Array.from({ length: pw }, (_, i) => (i % 2 ? '\\' : '/')).join(''), 'red')
    else {
      put(s, 0, y, '│' + ' '.repeat(pw - 2) + '│', wallInk)
      for (let c = 1; c < pw - 2; c += 3) put(s, c, y, '[_]'.slice(0, pw - 1 - c), 'lit')
    }
  }
  // door on the bottom row
  put(s, x0 + 1 + Math.floor(inner / 2), s.length - 1, '[]', 'gold')
  return s
}

const tree = (): Sprite => fromLines([[' & ', 'green'], ['&&&', 'green'], [' | ', 'brick']])
const light = (): Sprite => fromLines([['_o', 'gold'], ['|', 'road'], ['|', 'road'], ['|', 'road']], 2)
const bench = (): Sprite => fromLines([['╥─╥', 'brick']])
const bikes = (): Sprite => fromLines([['o-o', 'blue']])
const park = (rand: () => number): Sprite => {
  const s = fromLines([['  &    &  ', 'green'], [' &&&  &&& ', 'green'], ['  |    |  ', 'brick'], ['  ,,PARK,,', 'green']])
  if (rand() > 0.5) put(s, 4, 2, '╥╥', 'brick')
  return s
}
const school = (): Sprite => fromLines([['   |>    ', 'red'], ['┌──┴────┐', 'sand'], ['│SCHOOL │', 'text'], ['│# # #  │', 'lit'], ['└──[]───┘', 'sand']])
const community = (): Sprite => fromLines([['╔═══════════╗', 'teal'], ['║COMMUNITY  ║', 'text'], ['║ # #[] # # ║', 'lit'], ['╚═══════════╝', 'teal']])
const playground = (): Sprite => fromLines([[' /\\  o ', 'gold'], ['/  \\ /|\\', 'gold']])
const transit = (kind: 'subway' | 'go'): Sprite =>
  kind === 'subway'
    ? fromLines([['┌──────┐', 'red'], ['│ (TTC)│', 'white'], ['│  ╬╬  │', 'red'], ['└─┘  └─┘', 'red']])
    : fromLines([['┌───────┐', 'green'], ['│  GO   │', 'white'], ['│═══════│', 'road'], ['└┘     └┘', 'green']])

export interface Streetscape { rows: Sprite; text: string; width: number }

export function streetscape(buildings: StreetBuilding[], f: StreetFeatures, seed: string): Streetscape {
  const rand = rng(seedOf(seed))
  const maxStoreys = Math.max(1, ...buildings.map((b) => b.storeys))
  const scale = Math.min(1, MAX_ROWS / maxStoreys)
  const rowsFor = (b: StreetBuilding) => Math.max(3, Math.round(b.storeys * scale))

  const parts: Array<{ sprite: Sprite; label?: string }> = []
  const add = (sprite: Sprite, label?: string) => parts.push({ sprite, label })
  if (f.transit) add(transit(f.transit))
  add(light())
  const parkAfter = new Set(f.parks > 0 ? [Math.max(0, Math.floor(buildings.length / 2) - 1), ...(f.parks > 1 ? [buildings.length - 1] : [])] : [])
  buildings.forEach((b, i) => {
    add(building(b, rowsFor(b), rand, f), b.label)
    add(i % 2 === 0 && f.streetTrees ? tree() : light())
    if (parkAfter.has(i)) {
      add(park(rand))
      if (f.bikes) add(bikes())
      add(bench())
    }
  })
  if (f.parks > 0 && parkAfter.size === 0) add(park(rand))
  if (f.school) add(school())
  if (f.playground) add(playground())
  if (f.community) add(community())
  if (f.bikes && f.parks === 0) add(bikes())
  add(f.streetTrees ? tree() : light())

  const labelRows = parts.some((p) => p.label) ? 1 : 0
  const height = Math.max(...parts.map((p) => p.sprite.length)) + labelRows
  const width = parts.reduce((w, p) => w + (p.sprite[0]?.length ?? 0) + 1, 1)
  const grid = blank(width, height + 2)
  let x = 1
  for (const { sprite, label } of parts) {
    const w = sprite[0]?.length ?? 0
    const yTop = height - sprite.length
    sprite.forEach((row, r) => row.forEach((cell, c) => { if (cell.ch !== ' ') grid[yTop + r]![x + c] = cell }))
    if (label && yTop > 0) put(grid, x + Math.max(0, Math.floor((w - label.length) / 2)), yTop - 1, label, 'text')
    x += w + 1
  }
  put(grid, 0, height, '_'.repeat(width), 'road') // sidewalk edge
  put(grid, 0, height + 1, Array.from({ length: width }, (_, i) => (i % 6 < 3 ? '=' : ' ')).join(''), 'road') // lane markings
  const text = grid.map((row) => row.map((c) => c.ch).join('').replace(/\s+$/, '')).join('\n')
  return { rows: grid, text, width }
}

/** A boxed title + stats banner, as text lines, for the top of the picture. */
export function banner(title: string, stats: Array<[string, string]>): string[] {
  const body = [title, ...stats.map(([k, v]) => `${k.padEnd(16)}${v.padStart(10)}`)]
  const w = Math.max(...body.map((l) => l.length)) + 2
  return [`┌${'─'.repeat(w)}┐`, ...body.map((l) => `│ ${l.padEnd(w - 2)} │`), `└${'─'.repeat(w)}┘`]
}

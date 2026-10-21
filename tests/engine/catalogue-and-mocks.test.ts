import { describe, expect, it } from 'vitest'
import catalogueJson from '../../data/costs/catalogue.json'
import mockAJson from '../../data/projects/mock-a-toronto-mixed-use.json'
import { mockB, mockBMeta } from '../../data/projects/mock-b-durham-master-plan'
import { checklist, evaluate, validateCatalogue, type Catalogue } from '../../src/engine/catalogue'
import { isPortfolio, runNode, type Node } from '../../src/engine/portfolio'
import type { ProjectInput } from '../../src/engine/project'

const catalogue = catalogueJson as Catalogue
const mockA = mockAJson.input as ProjectInput

const allLines = (node: Node): Array<{ catalogueId?: string; id: string }> =>
  isPortfolio(node) ? [...node.costLines, ...node.children.flatMap((c) => allLines(c.node))] : node.costLines

describe('catalogue', () => {
  it('is internally consistent', () => expect(validateCatalogue(catalogue)).toEqual([]))

  it('covers 100+ variables and every project type', () => {
    expect(catalogue.variables.length).toBeGreaterThanOrEqual(100)
    expect(catalogue.projectTypes).toHaveLength(9)
    for (const t of catalogue.projectTypes) expect(checklist(catalogue, t.id).counts.applies + checklist(catalogue, t.id).counts.toConfirm).toBeGreaterThan(40)
  })

  it('evaluates conditions, with unset variables marked "to confirm" rather than assumed', () => {
    expect(evaluate('site.contamination=high', { 'site.contamination': 'high' })).toBe(true)
    expect(evaluate('site.existingRentalUnits>=6', { 'site.existingRentalUnits': 4 })).toBe(false)
    expect(evaluate('site.nearTtc60m', {})).toBeNull()
    const list = checklist(catalogue, 'rental-highrise', {})
    const ttc = list.stages.flatMap((s) => s.entries).find((e) => e.item.id === 'ttc-review')!
    expect(ttc.status).toBe('to-confirm')
    expect(ttc.unsetVariables).toEqual(['site.nearTtc60m'])
  })

  it('switching a variable adds or removes its costs (dirty soil, affordable units, TTC)', () => {
    const ids = (attrs: Record<string, unknown>) => checklist(catalogue, 'rental-highrise', attrs as never).stages.flatMap((s) => s.entries).filter((e) => e.status === 'applies').map((e) => e.item.id)
    const clean = ids({ 'site.contamination': 'none', 'planning.affordableShare': 0, 'site.nearTtc60m': false })
    const dirty = ids({ 'site.contamination': 'high', 'planning.affordableShare': 0.1, 'site.nearTtc60m': true })
    expect(clean).not.toContain('remediation')
    expect(dirty).toEqual(expect.arrayContaining(['remediation', 'phase-two-esa-high', 'risk-assessment', 'affordable-revenue-loss', 'dc-affordable-exemption', 'ttc-review']))
  })

  it('project types differ: condo has Tarion and presales items, rental has self-supply HST, master plan has roads', () => {
    const has = (type: string, id: string) => checklist(catalogue, type, {}).stages.some((s) => s.entries.some((e) => e.item.id === id))
    expect(has('condo-highrise', 'tarion-enrolment')).toBe(true)
    expect(has('rental-highrise', 'tarion-enrolment')).toBe(false)
    expect(has('rental-highrise', 'self-supply-hst')).toBe(true)
    expect(has('master-plan', 'roads-arterial')).toBe(true)
    expect(has('infill-multiplex', 'wind-shadow')).toBe(false)
  })
})

describe('mock projects', () => {
  it('every cost line maps to a catalogue item', () => {
    const known = new Set(catalogue.items.map((i) => i.id))
    const unmapped = [...allLines(mockA), ...allLines(mockB)].filter((l) => !l.catalogueId || !known.has(l.catalogueId)).map((l) => l.id)
    expect(unmapped).toEqual([])
  })

  it('nothing applicable is unaccounted for: every item is a line, covered elsewhere, excluded, or a named gap', () => {
    const known = new Set(catalogue.items.map((i) => i.id))
    for (const [type, attributes, node, coverage] of [
      [mockAJson.projectType, mockAJson.attributes, mockA, mockAJson.coverage],
      [mockBMeta.projectType, mockBMeta.attributes, mockB, mockBMeta.coverage],
    ] as Array<[string, Record<string, unknown>, Node, Record<string, string>]>) {
      const lines = new Set(allLines(node).map((l) => l.catalogueId))
      const list = checklist(catalogue, type, attributes as never)
      const entries = list.stages.flatMap((s) => s.entries)
      expect(entries.filter((e) => e.status === 'to-confirm').map((e) => e.item.id)).toEqual([])
      const unaccounted = entries.map((e) => e.item.id).filter((id) => !lines.has(id) && !coverage[id])
      expect(unaccounted).toEqual([])
      expect(Object.keys(coverage).filter((id) => !known.has(id))).toEqual([])
      expect(Object.values(coverage).every((v) => /^(benchmark|allowance|line|component|engine|excluded|gap):/.test(v))).toBe(true)
    }
  })

  it('Mock A runs complete and reconciles', () => {
    const r = runNode(mockA)
    expect(r.complete).toBe(true)
    expect(r.project!.checks).toEqual({ sourcesEqualUses: true, ledgerCloses: true })
    expect(r.metrics.totalUnits!.value).toBe(420)
    expect(r.metrics.permanentLoan!.value).toBeGreaterThan(0)
  })

  it('Mock B rolls up phases and blocks and reconciles every project', () => {
    const r = runNode(mockB)
    expect(r.complete).toBe(true)
    const projects: Array<{ name: string; checks: unknown }> = []
    const walk = (n: typeof r) => {
      if (n.project) projects.push({ name: n.name, checks: n.project.checks })
      n.children.forEach((c) => walk(c.result))
    }
    walk(r)
    expect(projects).toHaveLength(8)
    for (const p of projects) expect(p.checks).toEqual({ sourcesEqualUses: true, ledgerCloses: true })
    expect(r.metrics.totalUnits!.value).toBeGreaterThan(3_000)
    expect(mockBMeta.projectType).toBe('master-plan')
  })
})

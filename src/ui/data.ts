import catalogueJson from '../../data/costs/catalogue.json'
import mockAJson from '../../data/projects/mock-a-toronto-mixed-use.json'
import demoRentalJson from '../../data/projects/demo-rental.json'
import findingsJson from '../../handoff/data/audit/findings.json'
import { mockB, mockBMeta } from '../../data/projects/mock-b-durham-master-plan'
import type { Attributes, Catalogue, CatalogueItem } from '../engine/catalogue'
import type { Node } from '../engine/portfolio'
import type { ProjectInput } from '../engine/project'
import { toProject, type RentalInput } from '../engine/rental'

export const catalogue = catalogueJson as unknown as Catalogue
export const catalogueItem = new Map<string, CatalogueItem>(catalogue.items.map((i) => [i.id, i]))
export const stageLabel = new Map(catalogue.stages.map((s) => [s.id, s.label]))
export const variableInfo = new Map(catalogue.variables.map((v) => [v.id, v]))

export interface DemoProject {
  id: string
  name: string
  projectType: string
  reference: string
  notes: string[]
  attributes: Attributes
  coverage: Record<string, string>
  input: Node
}

const demoRentalInput: ProjectInput = { ...toProject(demoRentalJson.input as RentalInput), id: 'demo-rental', name: demoRentalJson.name }
// Levies are unknown in the handoff demo: the UI shows what "incomplete" looks like.

export const demoProjects: DemoProject[] = [
  { id: mockAJson.id, name: mockAJson.name, projectType: mockAJson.projectType, reference: mockAJson.reference, notes: mockAJson.notes, attributes: mockAJson.attributes as Attributes, coverage: mockAJson.coverage, input: mockAJson.input as ProjectInput },
  { id: mockBMeta.id, name: mockBMeta.name, projectType: mockBMeta.projectType, reference: mockBMeta.reference, notes: mockBMeta.notes, attributes: mockBMeta.attributes as Attributes, coverage: mockBMeta.coverage, input: mockB },
  { id: 'demo-rental', name: demoRentalJson.name, projectType: 'rental-midrise', reference: 'Handoff synthetic project (Oshawa). Levies are unknown, so cost-dependent results are withheld.', notes: demoRentalJson.notes, attributes: { 'site.municipality': 'oshawa' }, coverage: {}, input: demoRentalInput },
]

export interface Finding {
  id: string
  workbook: string
  sheet: string
  cells: string
  classification: string
  priority: string
  finding: string
  proposed_remediation: string
  regression_test: string
}
export const findings = (Array.isArray(findingsJson) ? findingsJson : (findingsJson as { findings: unknown[] }).findings) as Finding[]

/** Audit findings with an engine regression test in tests/engine. */
export const findingsCovered: Record<string, string> = {
  'PF-001': 'DSCR divides NOI (primitives.test.ts)',
  'PF-002': 'Vacancy per unit type (rental.test.ts)',
  'PF-004': 'Monthly interest on opening balance, no half-draw (rental.test.ts)',
  'PF-005': 'FSI from by-law GFA, never GCA (rental.test.ts)',
  'PF-008': 'LTV constraint applies (primitives.test.ts)',
  'PF-009': 'Equity multiple on equity, not loan (rental.test.ts)',
  'PF-013': 'Tax shown as "not yet modelled", not a blanket rate (ADR-001 C17)',
  'PF-015': 'AHF treated as closed (catalogue / source registry)',
  'PF-017': 'Soft/contingency % shown as class-C proxies with bands',
  'PF-018': 'Rates carry dated BoC source (catalogue)',
  'PF-019': 'DCs carry municipality, schedule and status (catalogue)',
}

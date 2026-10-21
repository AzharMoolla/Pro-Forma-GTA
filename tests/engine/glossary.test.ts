import { describe, expect, it } from 'vitest'
import glossary from '../../data/glossary.json'
import { runNode } from '../../src/engine/portfolio'
import { tinyProject } from './fixtures'

describe('glossary', () => {
  const metricIds = new Set(Object.keys(runNode(tinyProject()).metrics))
  it('every metric a term points to exists in the engine', () => {
    const linked = glossary.terms.flatMap((t) => t.metrics ?? [])
    expect(linked.filter((m) => !metricIds.has(m))).toEqual([])
  })
  it('every headline metric has a definition', () => {
    const linked = new Set(glossary.terms.flatMap((t) => t.metrics ?? []))
    const headline = ['totalDevelopmentCost', 'profit', 'profitOnCost', 'yieldOnCost', 'unleveredIrr', 'leveredIrr', 'unleveredNpv']
    expect(headline.filter((m) => !linked.has(m))).toEqual([])
  })
  it('ids are unique and formulas use explicit brackets around mixed operations', () => {
    expect(new Set(glossary.terms.map((t) => t.id)).size).toBe(glossary.terms.length)
    // a formula mixing + or − with × or ÷ outside brackets would be ambiguous to a reader
    const ambiguous = glossary.terms.filter((t) => t.formula && /\w\s*[+−-]\s*\w+\s*[×÷]/.test(t.formula.replace(/\([^()]*\)/g, 'X')))
    expect(ambiguous.map((t) => t.id)).toEqual([])
  })
})

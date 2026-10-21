import { Fragment, useId, useState, type ReactNode } from 'react'
import glossaryJson from '../../data/glossary.json'

export interface GlossaryTerm { id: string; acronym?: string; term: string; definition: string; formula?: string; note?: string; source?: string; url?: string; metrics?: string[] }

export const glossary = glossaryJson.terms as GlossaryTerm[]
const byMetric = new Map(glossary.flatMap((t) => (t.metrics ?? []).map((m) => [m, t] as const)))
export const termForMetric = (metricId: string) => byMetric.get(metricId)

/** Hover or focus to see the definition and formula. Keyboard: Tab to it, Escape to close. */
export function Term({ term, children }: { term: GlossaryTerm; children: ReactNode }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className="inline-flex min-h-6 cursor-help items-center underline decoration-ink-mute decoration-dotted underline-offset-2"
      >
        {children}
      </button>
      {open && (
        <span id={id} role="tooltip" className="absolute top-full left-0 z-20 mt-1 block w-80 max-w-[80vw] rounded-md border border-line-strong bg-surface p-3 text-left text-xs font-normal text-ink shadow-lg">
          <span className="block text-sm font-semibold">{term.acronym ? `${term.acronym}: ` : ''}{term.term}</span>
          <span className="mt-1 block text-ink-soft">{term.definition}</span>
          {term.formula && <span className="num mt-2 block rounded bg-sunken px-2 py-1 text-[11px] text-ink">{term.formula}</span>}
          {term.note && <span className="mt-2 block text-ink-soft">{term.note}</span>}
          {term.source && <span className="mt-2 block text-ink-mute">Source: {term.source}</span>}
        </span>
      )}
    </span>
  )
}

/** A metric label with its glossary entry attached when one exists. */
export function MetricLabel({ id, label }: { id: string; label: string }) {
  const term = termForMetric(id)
  return term ? <Term term={term}>{label}</Term> : <>{label}</>
}

const acronyms = glossary
  .flatMap((t) => (t.acronym ?? '').split(/\s*\/\s*/).filter(Boolean).map((a) => [a, t] as const))
  .sort((a, b) => b[0].length - a[0].length)
const pattern = new RegExp(`\\b(${acronyms.map(([a]) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g')
const byAcronym = new Map(acronyms)

/** Wraps known acronyms inside a title or label with their definitions. */
export function GlossaryText({ text }: { text: string }) {
  const parts = text.split(pattern)
  return (
    <>
      {parts.map((p, i) => {
        const t = byAcronym.get(p)
        return t ? <Term key={i} term={t}>{p}</Term> : <Fragment key={i}>{p}</Fragment>
      })}
    </>
  )
}

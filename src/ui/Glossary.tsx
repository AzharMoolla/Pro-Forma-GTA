import { Fragment, useId, useState, type ReactNode } from 'react'
import glossaryJson from '../../data/glossary.json'

export interface GlossaryTerm { id: string; acronym?: string; term: string; definition: string; formula?: string; note?: string; source?: string; url?: string; metrics?: string[]; aliases?: string[] }

export const glossary = glossaryJson.terms as GlossaryTerm[]
const byMetric = new Map(glossary.flatMap((t) => (t.metrics ?? []).map((m) => [m, t] as const)))
export const termForMetric = (metricId: string) => byMetric.get(metricId)

/** Hover or focus to see the definition and formula. Keyboard: Tab to it, Escape to close. */
export function Term({ term, children }: { term: GlossaryTerm; children: ReactNode }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [flip, setFlip] = useState(false) // open leftwards when there's no room on the right
  const show = (el: Element) => { setFlip(el.getBoundingClientRect().left > window.innerWidth - 340); setOpen(true) }
  return (
    <span className="relative inline" onMouseEnter={(e) => show(e.currentTarget)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        onFocus={(e) => show(e.currentTarget)}
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
        <span id={id} role="tooltip" className={`absolute top-full z-30 mt-1 block w-80 ${flip ? 'right-0' : 'left-0'} max-w-[80vw] rounded-md border border-line-strong bg-surface p-3 text-left text-xs font-normal text-ink shadow-lg`}>
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

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const acronyms = glossary
  .flatMap((t) => (t.acronym ?? '').split(/\s*\/\s*/).filter(Boolean).map((a) => [a, t] as const))
  .sort((a, b) => b[0].length - a[0].length)
const pattern = new RegExp(`\\b(${acronyms.map(([a]) => escapeRe(a)).join('|')})\\b`, 'g')
const byAcronym = new Map(acronyms)
// Plain-English names ("cap rate", "lease-up"), matched regardless of case
const aliases = glossary
  .flatMap((t) => (t.aliases ?? []).map((a) => [a.toLowerCase(), t] as const))
  .sort((a, b) => b[0].length - a[0].length)
const aliasPattern = new RegExp(`\\b(${aliases.map(([a]) => escapeRe(a)).join('|')})\\b`, 'gi')
const byAlias = new Map(aliases)

/** Wraps known acronyms and terms inside a title or label with their definitions; each term is explained once per text. */
export function GlossaryText({ text }: { text: string }) {
  const seen = new Set<string>()
  const out: ReactNode[] = []
  const push = (s: string, t: GlossaryTerm | undefined) => {
    if (t && !seen.has(t.id)) {
      seen.add(t.id)
      out.push(<Term key={out.length} term={t}>{s}</Term>)
    } else if (s) out.push(<Fragment key={out.length}>{s}</Fragment>)
  }
  for (const part of text.split(pattern)) {
    const t = byAcronym.get(part)
    if (t) push(part, t)
    else for (const sub of part.split(aliasPattern)) push(sub, byAlias.get(sub.toLowerCase()))
  }
  return <>{out}</>
}

/** ⓘ beside a project variable: where its value comes from and how to enter it. */
export function VarHint({ v }: { v: { id: string; label: string; type: string; source?: string; options?: string[]; unit?: string } }) {
  const how = v.type === 'boolean' ? 'Choose yes, no, or leave as unknown. Unknown never counts as no.'
    : v.type === 'number' ? `Enter a number${v.unit ? ` in ${v.unit}` : ''}; shares as decimals (0.35 for 35%). Blank means unknown, never zero.`
      : v.type === 'enum' ? `Choose one of: ${(v.options ?? []).join(', ')}. Leave blank if unknown.`
        : 'Free text, shown in the report. Leave blank if unknown.'
  const term: GlossaryTerm = { id: `var:${v.id}`, term: v.label, definition: how, note: v.source ? `Where to find it: ${v.source}.` : undefined }
  return <Term term={term}><span aria-hidden className="text-ink-mute no-underline">ⓘ</span><span className="sr-only">About {v.label}</span></Term>
}

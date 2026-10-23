import { CITATION_NOTICE, cite, type Citation } from './citations'

/** The sections a finding rests on: each with what it says, the exact words on demand, and a link to the official text. */
export function Cited({ citations, compact = false }: { citations: Citation[]; compact?: boolean }) {
  if (!citations.length) return null
  if (compact) return <span className="text-xs text-ink-mute"> Law: {citations.map(cite).join('; ')}.</span>
  return (
    <ul className="mt-1 flex flex-col gap-1 text-xs" aria-label="Legislation and policy">
      {citations.map((c) => (
        <li key={c.id}>
          <details>
            <summary className="cursor-pointer text-ink-soft">
              <span aria-hidden>§ </span><a className="text-accent underline" href={c.url} target="_blank" rel="noreferrer">{cite(c)}</a>: {c.topic}{c.kind === 'guideline' ? ' (guidance, not law)' : c.kind === 'policy' ? ' (provincial policy)' : ''}
            </summary>
            <blockquote className="mt-1 border-l-2 border-line pl-2 text-ink-soft">“{c.quote}”</blockquote>
            <p className="mt-0.5 text-ink-mute">{c.currency}; checked {c.verified}.{c.secondary ? ` ${c.secondary}` : ''}</p>
          </details>
        </li>
      ))}
    </ul>
  )
}

/** Every citation used in a report, with the quote and the reproduction notice the King's Printer requires. */
export function CitedList({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null
  return (
    <>
      <ul className="flex flex-col gap-2 text-sm">
        {citations.map((c) => (
          <li key={c.id} className="break-inside-avoid">
            <strong>{cite(c)}</strong> ({c.topic}{c.kind === 'guideline' ? '; guidance, not law' : c.kind === 'policy' ? '; provincial policy' : ''}). <span className="text-ink-soft">“{c.quote}”</span> <span className="text-xs text-ink-mute">{c.url} · {c.currency} · checked {c.verified}.{c.secondary ? ` ${c.secondary}` : ''}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-mute">{CITATION_NOTICE}</p>
    </>
  )
}

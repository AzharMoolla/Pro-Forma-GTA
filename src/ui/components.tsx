import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { GlossaryText } from './Glossary'

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')

type Variant = 'primary' | 'secondary' | 'ghost'
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:opacity-90',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-sunken',
  ghost: 'text-accent hover:bg-accent-soft',
}

export function Button({ variant = 'secondary', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={cx('inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50', variants[variant], className)}
      {...props}
    />
  )
}

type Tone = 'neutral' | 'accent' | 'good' | 'warn' | 'bad'
const tones: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-soft',
  accent: 'bg-accent-soft text-accent',
  good: 'bg-good-soft text-good',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
}

export function Chip({ tone = 'neutral', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return <span title={title} className={cx('inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap', tones[tone])}>{children}</span>
}

const SOURCE: Record<string, { label: string; tone: Tone; title: string }> = {
  V: { label: 'verified', tone: 'good', title: 'Verified against the linked source on the catalogue date' },
  S: { label: 'source', tone: 'accent', title: 'Authoritative source identified; value still to ingest and verify' },
  Q: { label: 'quote', tone: 'neutral', title: 'No public schedule: needs a consultant or contractor quote' },
  P: { label: 'proposed', tone: 'warn', title: 'Announced or proposed, not yet law' },
}
export const SourceChip = ({ tag }: { tag: string }) => {
  const s = SOURCE[tag] ?? { label: tag, tone: 'neutral' as Tone, title: '' }
  return <Chip tone={s.tone} title={s.title}>{s.label}</Chip>
}

export function Card({ title, actions, children, className }: { title: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cx('rounded-lg border border-line bg-surface', className)}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 id={id} className="text-base font-semibold"><GlossaryText text={title} /></h2>
        {actions}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

/** Numeric input that commits on blur or Enter, so partial typing never recalculates with a half-number. */
export function NumberField({ label, value, onCommit, suffix, scale = 1, step, readOnly, compact }: {
  label: string
  value: number
  onCommit: (v: number) => void
  suffix?: string
  scale?: number // display = value × scale (e.g. 100 for percentages)
  step?: number
  readOnly?: boolean
  compact?: boolean
}) {
  const id = useId()
  const shown = Number((value * scale).toPrecision(10))
  const [text, setText] = useState(String(shown))
  const [synced, setSynced] = useState(shown)
  const [error, setError] = useState<string | null>(null)
  if (synced !== shown) {
    // value changed outside this field (recalculation, branch, reset): show it
    setSynced(shown)
    setText(String(shown))
  }
  const commit = () => {
    const v = Number(text.replace(/[, $]/g, ''))
    if (!Number.isFinite(v)) {
      setError('Enter a number')
      return
    }
    setError(null)
    if (v !== shown) onCommit(v / scale)
  }
  return (
    <div className={cx('flex flex-col gap-1', compact && 'min-w-0')}>
      <label htmlFor={id} className={cx('text-xs text-ink-soft', compact && 'sr-only')}>{compact ? label : <GlossaryText text={label} />}</label>
      <div className="flex items-center gap-1">
        <input
          id={id}
          inputMode="decimal"
          className="num w-full min-w-0 rounded border border-line-strong bg-surface px-2 py-1.5 text-right text-sm read-only:border-line read-only:bg-sunken"
          value={text}
          readOnly={readOnly}
          step={step}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
        {suffix && <span className="shrink-0 text-xs whitespace-nowrap text-ink-mute">{suffix}</span>}
      </div>
      {error && <span id={`${id}-err`} role="alert" className="text-xs text-bad">{error}</span>}
    </div>
  )
}

export function TableWrap({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto" role="region" aria-label={caption} tabIndex={0}>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  )
}

export const th = 'border-b border-line px-2 py-2 text-left text-xs font-medium text-ink-soft'
export const td = 'border-b border-line px-2 py-1.5 align-top'
export const tdNum = 'num border-b border-line px-2 py-1.5 text-right align-top whitespace-nowrap'

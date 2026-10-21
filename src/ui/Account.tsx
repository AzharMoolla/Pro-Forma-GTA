import { useState } from 'react'
import { cloud } from '../cloud/cloud'
import { Button, Chip } from './components'
import type { CloudState } from './useCloud'

const STATUS: Record<CloudState['status'], { label: string; tone: 'good' | 'neutral' | 'warn' | 'bad' }> = {
  off: { label: 'Saved in this browser only', tone: 'neutral' },
  'signed-out': { label: 'Not signed in: saved in this browser only', tone: 'neutral' },
  loading: { label: 'Loading from your account…', tone: 'neutral' },
  saving: { label: 'Saving…', tone: 'neutral' },
  saved: { label: 'Saved to your account', tone: 'good' },
  error: { label: 'Not saved', tone: 'bad' },
}

export function Account({ state }: { state: CloudState }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<{ text: string; tone: 'good' | 'bad' } | null>(null)
  const [busy, setBusy] = useState(false)
  const s = STATUS[state.status]

  if (!state.configured) return <Chip tone={s.tone}>{s.label}</Chip>

  const run = async (action: 'in' | 'up') => {
    if (!cloud) return
    setBusy(true)
    setMessage(null)
    const result = action === 'in'
      ? await cloud.auth.signInWithPassword({ email, password })
      : await cloud.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
    setBusy(false)
    if (result.error) return setMessage({ text: result.error.message, tone: 'bad' })
    if (action === 'up' && !result.data.session) return setMessage({ text: 'Check your email to confirm your account, then sign in.', tone: 'good' })
    setPassword('')
    setOpen(false)
  }

  if (state.user) {
    return (
      <div className="flex flex-wrap items-center gap-2" aria-live="polite">
        <Chip tone={s.tone} title={state.error ?? undefined}>{s.label}</Chip>
        <span className="text-xs text-ink-soft">{state.user.email}</span>
        <Button variant="ghost" onClick={() => void cloud?.auth.signOut()}>Sign out</Button>
        {state.error && <span role="alert" className="text-xs text-bad">{state.error}</span>}
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Chip tone={s.tone}>{s.label}</Chip>
        <Button variant="primary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>Sign in to save</Button>
      </div>
      {open && (
        <form
          className="absolute right-0 z-30 mt-2 flex w-80 max-w-[90vw] flex-col gap-3 rounded-lg border border-line-strong bg-surface p-4 shadow-lg"
          onSubmit={(e) => { e.preventDefault(); void run('in') }}
        >
          <p className="text-sm text-ink-soft">Save projects, locked scenarios, tracker progress and receipts to your account.</p>
          <label className="flex flex-col gap-1 text-sm">Email
            <input type="email" required autoComplete="email" className="min-h-10 rounded border border-line-strong bg-surface px-2" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">Password
            <input type="password" required minLength={8} autoComplete="current-password" className="min-h-10 rounded border border-line-strong bg-surface px-2" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={busy}>Sign in</Button>
            <Button onClick={() => void run('up')} disabled={busy || !email || password.length < 8}>Create account</Button>
          </div>
          {message && <p role="alert" className={message.tone === 'bad' ? 'text-sm text-bad' : 'text-sm text-good'}>{message.text}</p>}
          <p className="text-xs text-ink-mute">Your data is stored in Supabase (Canada Central) and visible only to you.</p>
        </form>
      )}
    </div>
  )
}

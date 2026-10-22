import { useState } from 'react'
import { changeEmail, cloud, deleteAccount, exportAccount, requestPasswordReset, setPassword as savePassword } from '../cloud/cloud'
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

const field = 'min-h-10 rounded border border-line-strong bg-surface px-2'
const panel = 'absolute right-0 z-30 mt-2 flex w-80 max-w-[90vw] flex-col gap-3 rounded-lg border border-line-strong bg-surface p-4 shadow-lg'
type Message = { text: string; tone: 'good' | 'bad' } | null

const download = (name: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  Object.assign(document.createElement('a'), { href: url, download: name }).click()
  URL.revokeObjectURL(url)
}

/** Shown after following a password-reset email. */
function SetNewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<Message>(null)
  return (
    <form className={panel} aria-label="Set a new password" onSubmit={(e) => {
      e.preventDefault()
      savePassword(password).then(() => { setMessage({ text: 'Password changed.', tone: 'good' }); setTimeout(onDone, 1200) }).catch((err: Error) => setMessage({ text: err.message, tone: 'bad' }))
    }}>
      <p className="text-sm font-medium">Set a new password</p>
      <label className="flex flex-col gap-1 text-sm">New password
        <input type="password" required minLength={8} autoComplete="new-password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <Button type="submit" variant="primary" disabled={password.length < 8}>Save password</Button>
      {message && <p role="alert" className={message.tone === 'bad' ? 'text-sm text-bad' : 'text-sm text-good'}>{message.text}</p>}
    </form>
  )
}

/** Signed in: email, password, a copy of everything, and deleting the account. */
function AccountSettings({ email, onClose }: { email: string; onClose: () => void }) {
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<Message>(null)
  const act = (work: () => Promise<string>) => {
    setBusy(true)
    setMessage(null)
    work().then((text) => setMessage({ text, tone: 'good' })).catch((e: Error) => setMessage({ text: e.message, tone: 'bad' })).finally(() => setBusy(false))
  }
  return (
    <div className={panel} role="dialog" aria-label="Account settings">
      <div className="flex items-center justify-between"><p className="text-sm font-medium">Account</p><Button variant="ghost" onClick={onClose}>Close</Button></div>
      <p className="text-xs text-ink-soft">Signed in as {email}</p>
      <form className="flex flex-col gap-1 text-sm" onSubmit={(e) => { e.preventDefault(); act(async () => { await changeEmail(newEmail); return 'Check both inboxes to confirm the change.' }) }}>
        <label className="flex flex-col gap-1">New email<input type="email" required autoComplete="email" className={field} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /></label>
        <Button type="submit" disabled={busy || !newEmail}>Change email</Button>
      </form>
      <form className="flex flex-col gap-1 text-sm" onSubmit={(e) => { e.preventDefault(); act(async () => { await savePassword(password); setPassword(''); return 'Password changed.' }) }}>
        <label className="flex flex-col gap-1">New password<input type="password" required minLength={8} autoComplete="new-password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <Button type="submit" disabled={busy || password.length < 8}>Change password</Button>
      </form>
      <Button disabled={busy} onClick={() => act(async () => { download(`plangta-account-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await exportAccount(), null, 2)); return 'Downloaded: every project, scenario, tracker entry and receipt record in your account.' })}>Download all my data</Button>
      <details className="rounded border border-bad p-2 text-sm">
        <summary className="cursor-pointer font-medium text-bad">Delete my account</summary>
        <p className="mt-1 text-xs text-ink-soft">Permanently deletes your account, every project, locked scenario, tracker entry and receipt file. This can't be undone; download your data first if you want a copy.</p>
        <label className="mt-2 flex flex-col gap-1">Type DELETE to confirm<input className={field} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
        <Button className="mt-2 border border-bad text-bad" disabled={busy || confirm !== 'DELETE'} onClick={() => act(async () => { await deleteAccount(); await cloud?.auth.signOut(); return 'Your account has been deleted.' })}>Delete my account permanently</Button>
      </details>
      {message && <p role="alert" className={message.tone === 'bad' ? 'text-sm text-bad' : 'text-sm text-good'}>{message.text}</p>}
    </div>
  )
}

export function Account({ state }: { state: CloudState }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<Message>(null)
  const [busy, setBusy] = useState(false)
  const s = STATUS[state.status]

  if (!state.configured) return <Chip tone={s.tone}>{s.label}</Chip>

  const run = async (action: 'in' | 'up' | 'reset') => {
    if (!cloud) return
    setBusy(true)
    setMessage(null)
    try {
      if (action === 'reset') {
        await requestPasswordReset(email)
        setMessage({ text: 'If that email has an account, a reset link is on its way.', tone: 'good' })
        return
      }
      const result = action === 'in'
        ? await cloud.auth.signInWithPassword({ email, password })
        : await cloud.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      if (result.error) return setMessage({ text: result.error.message, tone: 'bad' })
      if (action === 'up' && !result.data.session) return setMessage({ text: 'Check your email to confirm your account, then sign in.', tone: 'good' })
      setPassword('')
      setOpen(false)
    } catch (e) {
      setMessage({ text: (e as Error).message, tone: 'bad' })
    } finally {
      setBusy(false)
    }
  }

  if (state.user) {
    return (
      <div className="relative flex flex-wrap items-center gap-2" aria-live="polite">
        <Chip tone={s.tone} title={state.error ?? undefined}>{s.label}</Chip>
        <Button variant="ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{state.user.email}</Button>
        <Button variant="ghost" onClick={() => void cloud?.auth.signOut()}>Sign out</Button>
        {state.error && <span role="alert" className="text-xs text-bad">{state.error}</span>}
        {state.recovering && <SetNewPassword onDone={state.doneRecovering} />}
        {open && !state.recovering && <AccountSettings email={state.user.email} onClose={() => setOpen(false)} />}
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
        <form className={panel} onSubmit={(e) => { e.preventDefault(); void run('in') }}>
          <p className="text-sm text-ink-soft">Save projects, locked scenarios, tracker progress and receipts to your account.</p>
          <label className="flex flex-col gap-1 text-sm">Email
            <input type="email" required autoComplete="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">Password
            <input type="password" required minLength={8} autoComplete="current-password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={busy}>Sign in</Button>
            <Button onClick={() => void run('up')} disabled={busy || !email || password.length < 8}>Create account</Button>
            <Button variant="ghost" onClick={() => void run('reset')} disabled={busy || !email}>Forgot password?</Button>
          </div>
          {message && <p role="alert" className={message.tone === 'bad' ? 'text-sm text-bad' : 'text-sm text-good'}>{message.text}</p>}
          <p className="text-xs text-ink-mute">Stored in Supabase (Canada Central), visible only to you. See the <a className="text-accent underline" href="#privacy">privacy policy</a> and <a className="text-accent underline" href="#terms">terms</a>.</p>
        </form>
      )}
    </div>
  )
}

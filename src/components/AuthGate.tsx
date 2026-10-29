import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { configError, supabase } from '../supabase'

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.title = session ? 'Flow Board' : 'Sign in – Flow Board'
  }, [session])

  useEffect(() => {
    if (configError) return
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  if (configError) {
    return (
      <p className="error" role="alert">
        {configError}
      </p>
    )
  }
  if (!ready) return <p className="status">Loading…</p>
  if (session) return <>{children}</>

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const creds = { email: email.trim(), password }
    const { data, error } = mode === 'sign-in' ? await supabase.auth.signInWithPassword(creds) : await supabase.auth.signUp({ ...creds, options: { emailRedirectTo: window.location.origin } })
    setBusy(false)
    if (error) {
      // Keep it generic: don't reveal whether an account exists.
      setMessage(mode === 'sign-in' ? 'Incorrect email or password.' : 'Could not create the account. Try a different email or a stronger password.')
    } else if (mode === 'sign-up' && !data.session) {
      setMessage('Check your email to confirm your account, then sign in.')
      setMode('sign-in')
    }
  }

  return (
    <main className="overlay auth">
      <form className="modal" onSubmit={submit} aria-label={mode === 'sign-in' ? 'Sign in' : 'Create account'}>
        <h1>Flow Board</h1>
        <h2>{mode === 'sign-in' ? 'Sign in' : 'Create account'}</h2>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus aria-invalid={!!message} aria-describedby={message ? 'auth-error' : undefined} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            aria-invalid={!!message}
            aria-describedby={message ? 'auth-hint auth-error' : 'auth-hint'}
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          />
        </label>
        <p id="auth-hint" className="hint">
          At least 8 characters.
        </p>
        {message && (
          <p id="auth-error" className="error modal-error" role="alert">
            {message}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="link-btn" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setMessage(null) }}>
            {mode === 'sign-in' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
          </button>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Sign up'}
          </button>
        </div>
      </form>
    </main>
  )
}

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth, configState, resetSupabaseMock } from '../test/supabaseMock'
import { AuthGate } from './AuthGate'

vi.mock('../supabase', async () => (await import('../test/supabaseMock')).supabaseModule)

const renderGate = () => {
  const user = userEvent.setup()
  render(
    <AuthGate>
      <p>secret board</p>
    </AuthGate>,
  )
  return user
}

const fill = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(await screen.findByLabelText('Email'), ' a@b.co ')
  await user.type(screen.getByLabelText('Password'), 'password1')
}

beforeEach(() => resetSupabaseMock())

describe('AuthGate', () => {
  it('shows the config error instead of the app when env vars are missing', () => {
    configState.error = 'Missing VITE_SUPABASE_URL'
    renderGate()
    expect(screen.getByRole('alert')).toHaveTextContent('Missing VITE_SUPABASE_URL')
    expect(auth.getSession).not.toHaveBeenCalled()
  })

  it('renders children when a session exists, and never shows them without one', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: {} } } })
    renderGate()
    expect(await screen.findByText('secret board')).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Flow Board'))
  })

  it('shows the sign-in form (not the board) when signed out', async () => {
    renderGate()
    expect(await screen.findByRole('form', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByText('secret board')).not.toBeInTheDocument()
    expect(document.title).toBe('Sign in – Flow Board')
  })

  it('signs in with the trimmed email', async () => {
    const user = renderGate()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.co', password: 'password1' })
  })

  it('REGRESSION: failed sign-in shows a generic message that does not reveal whether the account exists', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { message: 'User not found' } })
    const user = renderGate()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.')
    expect(document.body).not.toHaveTextContent('User not found')
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('REGRESSION: failed sign-up is generic too', async () => {
    auth.signUp.mockResolvedValue({ data: {}, error: { message: 'User already registered' } })
    const user = renderGate()
    await user.click(await screen.findByRole('button', { name: 'Need an account? Sign up' }))
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not create the account')
    expect(document.body).not.toHaveTextContent('already registered')
  })

  it('after sign-up without a session, asks to confirm email and returns to sign-in', async () => {
    const user = renderGate()
    await user.click(await screen.findByRole('button', { name: 'Need an account? Sign up' }))
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Check your email')
    expect(screen.getByRole('form', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('reacts to auth state changes and unsubscribes on unmount', async () => {
    const { unmount } = render(
      <AuthGate>
        <p>secret board</p>
      </AuthGate>,
    )
    await screen.findByLabelText('Email')
    const listener = auth.onAuthStateChange.mock.calls[0][0]
    listener('SIGNED_IN', { user: {} })
    await waitFor(() => expect(screen.getByText('secret board')).toBeInTheDocument())
    unmount()
    expect(auth.onAuthStateChange.mock.results[0].value.data.subscription.unsubscribe).toHaveBeenCalled()
  })
})

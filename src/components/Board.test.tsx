import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth, opsOf, resetSupabaseMock, respondWith, row, serve } from '../test/supabaseMock'
import { Board } from './Board'

vi.mock('../supabase', async () => (await import('../test/supabaseMock')).supabaseModule)

const column = (name: string) => within(screen.getByRole('region', { name }))

async function renderBoard(rows = [row({ id: 'a', title: 'Alpha', assignee: 'Ada' }), row({ id: 'b', title: 'Beta', assignee: 'Bo', column: 'done', tags: ['bug'] })]) {
  serve(rows)
  const user = userEvent.setup()
  render(<Board />)
  await screen.findByText(rows[0]?.title ?? 'Your board is empty.')
  return user
}

beforeEach(() => {
  resetSupabaseMock()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('board', () => {
  it('renders cards in their columns with counts', async () => {
    await renderBoard()
    expect(column('Backlog').getByText('Alpha')).toBeInTheDocument()
    expect(column('Done').getByText('Beta')).toBeInTheDocument()
    expect(column('In Progress').getByText('Drop cards here')).toBeInTheDocument()
  })

  it('shows the empty state with a way to add the first card', async () => {
    serve([])
    render(<Board />)
    expect(await screen.findByText(/Your board is empty/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add your first card' })).toBeInTheDocument()
  })

  it('signs out through Supabase auth', async () => {
    const user = await renderBoard()
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(auth.signOut).toHaveBeenCalledOnce()
  })
})

describe('creating a card', () => {
  it('fills the form, inserts the row and shows the new card', async () => {
    const user = await renderBoard()
    serve([row({ id: 'a', title: 'Alpha' })], row({ id: 'n', title: 'Ship it', assignee: 'Grace', priority: 'High', due_date: '2099-03-03', tags: ['design'], column: 'in-progress' }))

    await user.click(screen.getByRole('button', { name: '+ Add card' }))
    const dialog = screen.getByRole('dialog', { name: 'New card' })
    await user.type(within(dialog).getByLabelText('Title'), '  Ship it  ')
    await user.type(within(dialog).getByLabelText('Assignee'), 'Grace')
    await user.selectOptions(within(dialog).getByLabelText('Priority'), 'High')
    await user.type(within(dialog).getByLabelText('Due date'), '2099-03-03')
    await user.selectOptions(within(dialog).getByLabelText('Status'), 'in-progress')
    await user.type(within(dialog).getByLabelText('Tags'), 'Design{Enter}')
    await user.click(within(dialog).getByRole('button', { name: 'Add card' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(opsOf('insert')[0].payload).toEqual({ title: 'Ship it', assignee: 'Grace', priority: 'High', due_date: '2099-03-03', tags: ['design'], column: 'in-progress' })
    expect(column('In Progress').getByText('Ship it')).toBeInTheDocument()
  })

  it('a column "+" button pre-selects that column', async () => {
    const user = await renderBoard()
    await user.click(screen.getByRole('button', { name: 'Add card to In Review' }))
    expect(screen.getByLabelText('Status')).toHaveValue('in-review')
  })

  it('REGRESSION: keeps the modal and the typed input open when the save fails', async () => {
    const user = await renderBoard()
    respondWith((op) => (op.action === 'insert' ? { error: { message: 'duplicate key value violates unique constraint "cards_pkey"' } } : { data: [], error: null }))

    await user.click(screen.getByRole('button', { name: '+ Add card' }))
    await user.type(screen.getByLabelText('Title'), 'Keep me')
    await user.type(screen.getByLabelText('Assignee'), 'Ada')
    await user.type(screen.getByLabelText('Due date'), '2099-01-01')
    await user.click(screen.getByRole('button', { name: 'Add card' }))

    expect(await screen.findByText(/Couldn’t save/)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Keep me')
    expect(screen.getByRole('button', { name: 'Add card' })).toBeEnabled()
  })

  it('REGRESSION: the page shows a generic error, never raw database details', async () => {
    const user = await renderBoard()
    respondWith((op) => (op.action === 'insert' ? { error: { message: 'duplicate key value violates unique constraint "cards_pkey"' } } : { data: [], error: null }))
    await user.click(screen.getByRole('button', { name: '+ Add card' }))
    await user.type(screen.getByLabelText('Title'), 'x')
    await user.type(screen.getByLabelText('Assignee'), 'x')
    await user.type(screen.getByLabelText('Due date'), '2099-01-01')
    await user.click(screen.getByRole('button', { name: 'Add card' }))
    await screen.findByText(/Couldn’t save/)
    expect(document.body).not.toHaveTextContent(/cards_pkey|duplicate key/)
  })
})

describe('editing a card', () => {
  it('opens prefilled, saves changes with an update, and updates the card in place', async () => {
    const user = await renderBoard()
    await user.click(screen.getByRole('button', { name: 'Edit "Alpha"' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit card' })
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Alpha')

    await user.clear(within(dialog).getByLabelText('Title'))
    await user.type(within(dialog).getByLabelText('Title'), 'Alpha v2')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(opsOf('update')).toHaveLength(1)
    expect(opsOf('update')[0]).toMatchObject({ filters: { id: 'a' }, payload: { title: 'Alpha v2' } })
    expect(screen.getByText('Alpha v2')).toBeInTheDocument()
  })

  it('changing the status in the editor also moves the card', async () => {
    const user = await renderBoard()
    await user.click(screen.getByRole('button', { name: 'Edit "Alpha"' }))
    await user.selectOptions(screen.getByLabelText('Status'), 'in-review')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(column('In Review').getByText('Alpha')).toBeInTheDocument())
    expect(opsOf('update').some((o) => (o.payload as { column?: string }).column === 'in-review')).toBe(true)
  })
})

describe('moving a card', () => {
  it('uses the keyboard-accessible "Move" select and persists the new column', async () => {
    const user = await renderBoard()
    await user.selectOptions(screen.getByLabelText('Move "Alpha" to column'), 'in-progress')
    expect(opsOf('update')[0]).toMatchObject({ filters: { id: 'a' }, payload: { column: 'in-progress' } })
    expect(column('In Progress').getByText('Alpha')).toBeInTheDocument()
    expect(column('Backlog').queryByText('Alpha')).not.toBeInTheDocument()
  })

  it('REGRESSION: a failed move rolls the card back and shows the error banner', async () => {
    const user = await renderBoard()
    respondWith((op) => (op.action === 'update' ? { error: { message: 'rls' } } : { data: [row({ id: 'a', title: 'Alpha' })], error: null }))
    await user.selectOptions(screen.getByLabelText('Move "Alpha" to column'), 'done')
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    expect(column('Backlog').getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Move failed')).toBeInTheDocument()
  })

  it('moves by drag and drop', async () => {
    await renderBoard()
    const dt = { data: {} as Record<string, string>, setData(k: string, v: string) { this.data[k] = v }, getData(k: string) { return this.data[k] ?? '' }, dropEffect: '', effectAllowed: '' }
    const card = screen.getByText('Alpha').closest('article')!
    fireEvent.dragStart(card, { dataTransfer: dt })
    fireEvent.drop(column('In Review').getByText('Drop cards here'), { dataTransfer: dt })
    await waitFor(() => expect(opsOf('update')[0]).toMatchObject({ filters: { id: 'a' }, payload: { column: 'in-review' } }))
  })
})

describe('deleting a card', () => {
  it('removes it, offers undo, and restores it without deleting server-side', async () => {
    const user = await renderBoard()
    await user.click(screen.getByRole('button', { name: 'Delete "Alpha"' }))
    expect(screen.queryByText('Alpha', { selector: '.card *' })).not.toBeInTheDocument()
    const toast = screen.getByRole('group', { name: 'Undo delete' })
    expect(toast).toHaveTextContent('Deleted “Alpha”')
    expect(opsOf('delete')).toHaveLength(0)

    await user.click(within(toast).getByRole('button', { name: 'Undo' }))
    expect(await column('Backlog').findByText('Alpha')).toBeInTheDocument()
    expect(opsOf('delete')).toHaveLength(0)
  })

  it('Dismiss commits the delete immediately', async () => {
    const user = await renderBoard()
    await user.click(screen.getByRole('button', { name: 'Delete "Alpha"' }))
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    await waitFor(() => expect(opsOf('delete')).toHaveLength(1))
    expect(opsOf('delete')[0].filters).toEqual({ id: 'a' })
    expect(screen.queryByRole('group', { name: 'Undo delete' })).not.toBeInTheDocument()
  })

  it('REGRESSION: Escape inside the undo toast dismisses it (commits the delete)', async () => {
    const user = await renderBoard()
    await user.click(screen.getByRole('button', { name: 'Delete "Alpha"' }))
    within(screen.getByRole('group', { name: 'Undo delete' })).getByRole('button', { name: 'Undo' }).focus()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(opsOf('delete')).toHaveLength(1))
  })

  it('REGRESSION: focus moves to the next card (or the column add button) after a delete', async () => {
    const rows = [row({ id: 'a', title: 'Alpha', position: 1 }), row({ id: 'b', title: 'Bravo', position: 2 })]
    const user = await renderBoard(rows)
    await user.click(screen.getByRole('button', { name: 'Delete "Alpha"' }))
    expect(screen.getByRole('button', { name: 'Edit "Bravo"' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Delete "Bravo"' }))
    expect(screen.getByRole('button', { name: 'Add card to Backlog' })).toHaveFocus()
  })
})

describe('search and filter', () => {
  it('filters by title or assignee and announces the result count', async () => {
    const user = await renderBoard()
    await user.type(screen.getByRole('searchbox'), 'bo')
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('1 of 2 cards shown')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByText('Alpha')).toBeInTheDocument()
  })

  it('filters by tag using pressed-state toggle buttons', async () => {
    const user = await renderBoard()
    const chip = screen.getByRole('button', { name: 'bug' })
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    await user.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })
})

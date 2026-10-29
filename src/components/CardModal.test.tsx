import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MAX_TAGS, type Card, type CardInput, type ColumnId } from '../types'
import { CardModal } from './CardModal'

const card: Card = { id: 'c1', title: 'Existing', assignee: 'Ada', priority: 'Low', dueDate: '2099-01-01', column: 'in-review', position: 1, tags: ['bug'] }

function setup(over: Partial<React.ComponentProps<typeof CardModal>> = {}) {
  const onSave = vi.fn<(input: CardInput, column: ColumnId) => void>()
  const onClose = vi.fn<() => void>()
  const props = { card: null, knownTags: [], initialColumn: 'backlog' as const, saving: false, failed: false, onSave, onClose, ...over }
  const user = userEvent.setup()
  render(<CardModal {...props} />)
  return { user, onSave, onClose }
}

const fillRequired = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText('Title'), '  Hello  ')
  await user.type(screen.getByLabelText('Assignee'), '  Ada ')
  await user.type(screen.getByLabelText('Due date'), '2099-01-01')
}

describe('CardModal', () => {
  it('trims text fields and submits with the chosen column', async () => {
    const { user, onSave } = setup({ initialColumn: 'in-progress' })
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Add card' }))
    expect(onSave).toHaveBeenCalledWith({ title: 'Hello', assignee: 'Ada', priority: 'Medium', dueDate: '2099-01-01', tags: [] }, 'in-progress')
  })

  it('prefills when editing', () => {
    setup({ card })
    expect(screen.getByRole('dialog', { name: 'Edit card' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Existing')
    expect(screen.getByLabelText('Priority')).toHaveValue('Low')
    expect(screen.getByLabelText('Status')).toHaveValue('in-review')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('does not submit while required fields are empty', async () => {
    const { user, onSave } = setup()
    await user.click(screen.getByRole('button', { name: 'Add card' }))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('disables submit and says so while saving', () => {
    setup({ saving: true })
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  })

  it('tells the user their input is preserved after a failure', () => {
    setup({ failed: true })
    expect(screen.getByRole('alert')).toHaveTextContent('Your changes are still here')
  })

  describe('tags', () => {
    it('normalises tags, de-duplicates, and supports comma entry', async () => {
      const { user, onSave } = setup()
      await fillRequired(user)
      await user.type(screen.getByLabelText('Tags'), 'Needs Review,')
      await user.type(screen.getByLabelText('Tags'), 'needs review{Enter}')
      await user.click(screen.getByRole('button', { name: 'Add card' }))
      expect(onSave.mock.calls[0][0].tags).toEqual(['needs-review'])
    })

    it('REGRESSION: a tag still being typed is included on submit rather than lost', async () => {
      const { user, onSave } = setup()
      await fillRequired(user)
      await user.type(screen.getByLabelText('Tags'), 'half-typed')
      await user.click(screen.getByRole('button', { name: 'Add card' }))
      expect(onSave.mock.calls[0][0].tags).toEqual(['half-typed'])
    })

    it('REGRESSION: caps tags at MAX_TAGS and disables the input', async () => {
      const { user, onSave } = setup()
      await fillRequired(user)
      const many = Array.from({ length: MAX_TAGS + 3 }, (_, i) => `t${i}`).join(',')
      await user.click(screen.getByLabelText('Tags'))
      await user.paste(many + ',')
      expect(screen.getByLabelText('Tags')).toBeDisabled()
      await user.click(screen.getByRole('button', { name: 'Add card' }))
      expect(onSave.mock.calls[0][0].tags).toHaveLength(MAX_TAGS)
    })

    it('removes a tag with its button and with Backspace on an empty input', async () => {
      const { user } = setup({ card: { ...card, tags: ['one', 'two'] } })
      await user.click(screen.getByRole('button', { name: 'Remove tag one' }))
      expect(screen.queryByText('one')).not.toBeInTheDocument()
      await user.click(screen.getByLabelText('Tags'))
      await user.keyboard('{Backspace}')
      expect(screen.queryByRole('button', { name: /Remove tag/ })).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('REGRESSION: Escape and clicking the backdrop close the dialog', async () => {
      const { user, onClose } = setup()
      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledTimes(1)
      await user.click(screen.getByRole('dialog').parentElement!)
      expect(onClose).toHaveBeenCalledTimes(2)
    })

    it('REGRESSION: Tab wraps from the last control to the first, and Shift+Tab back (focus trap)', async () => {
      const { user } = setup()
      const cancel = screen.getByRole('button', { name: 'Cancel' })
      const submit = screen.getByRole('button', { name: 'Add card' })
      submit.focus()
      await user.tab()
      expect(screen.getByLabelText('Title')).toHaveFocus()
      await user.tab({ shift: true })
      expect(submit).toHaveFocus()
      expect(cancel).toBeInTheDocument()
    })

    it('REGRESSION: focuses the title on open and returns focus to the opener on close', async () => {
      const opener = document.createElement('button')
      document.body.append(opener)
      opener.focus()
      const { unmount } = render(<CardModal card={null} knownTags={[]} initialColumn="backlog" saving={false} failed={false} onSave={vi.fn()} onClose={vi.fn()} />)
      expect(screen.getByLabelText('Title')).toHaveFocus()
      unmount()
      await waitFor(() => expect(opener).toHaveFocus())
      opener.remove()
    })

    it('labels the dialog and marks it modal', () => {
      setup()
      expect(screen.getByRole('dialog', { name: 'New card' })).toHaveAttribute('aria-modal', 'true')
    })
  })
})

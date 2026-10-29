import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Card as CardType } from '../types'
import { Card } from './Card'

const base: CardType = { id: 'c1', title: 'Write docs', assignee: 'Ada', priority: 'High', dueDate: '2099-01-01', column: 'backlog', position: 1, tags: ['design'] }

const setup = (card: Partial<CardType> = {}, status?: 'saving') => {
  const handlers = { onMove: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() }
  render(<Card card={{ ...base, ...card }} status={status} {...handlers} />)
  return { user: userEvent.setup(), ...handlers }
}

afterEach(() => vi.useRealTimers())

describe('Card', () => {
  it('shows title, priority, assignee, tags and a formatted due date', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Edit "Write docs"' })).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Tags' })).toHaveTextContent('design')
    expect(screen.getByText(/2099/)).toBeInTheDocument()
  })

  it('falls back to "Unassigned" and "No due date"', () => {
    setup({ assignee: '', dueDate: '', tags: [] })
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
    expect(screen.getByText('No due date')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Tags' })).not.toBeInTheDocument()
  })

  it('opens the editor from a click on the card or its title', async () => {
    const { user, onEdit } = setup()
    await user.click(screen.getByRole('button', { name: 'Edit "Write docs"' }))
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }))
  })

  it('delete does not also open the editor', async () => {
    const { user, onDelete, onEdit } = setup()
    await user.click(screen.getByRole('button', { name: 'Delete "Write docs"' }))
    expect(onDelete).toHaveBeenCalledWith('c1')
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('changing the move select calls onMove and does not open the editor', async () => {
    const { user, onMove, onEdit } = setup()
    await user.selectOptions(screen.getByLabelText('Move "Write docs" to column'), 'done')
    expect(onMove).toHaveBeenCalledWith('c1', 'done')
    expect(onEdit).not.toHaveBeenCalled()
  })

  describe('overdue', () => {
    it('flags past due dates that are not done', () => {
      setup({ dueDate: '2000-01-01' })
      expect(screen.getByText(/Overdue/)).toBeInTheDocument()
    })

    it('REGRESSION: does not flag done cards, undated cards, or today as overdue', () => {
      vi.useFakeTimers({ now: new Date(2030, 5, 15, 23, 59) }) // local late evening: must not roll over via UTC
      setup({ column: 'done', dueDate: '2000-01-01' })
      setup({ dueDate: '' })
      setup({ dueDate: '2030-06-15' })
      expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument()
    })
  })

  it('marks a saving card busy and shows the spinner', () => {
    setup({}, 'saving')
    expect(screen.getByTestId('card')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByTestId('card').querySelector('.spinner')).not.toBeNull()
  })

  it('announces priority and assignee to screen readers', () => {
    setup()
    expect(screen.getByText('Priority:')).toHaveClass('sr-only')
    expect(screen.getByText('Assignee:')).toHaveClass('sr-only')
  })
})

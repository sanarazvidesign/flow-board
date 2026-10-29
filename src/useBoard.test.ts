import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { opsOf, resetSupabaseMock, respondWith, row, serve } from './test/supabaseMock'
import type { CardInput } from './types'
import { useBoard } from './useBoard'

vi.mock('./supabase', async () => (await import('./test/supabaseMock')).supabaseModule)

const input: CardInput = { title: 'New card', assignee: 'Grace', priority: 'High', dueDate: '2099-02-02', tags: ['bug'] }

const A = row({ id: 'a', title: 'A', position: 1000 })
const B = row({ id: 'b', title: 'B', position: 3000 })
const C = row({ id: 'c', title: 'C', position: 500, column: 'done' })

async function loaded(rows = [A, B, C]) {
  serve(rows)
  const hook = renderHook(() => useBoard())
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

// waitFor polls with real timers, so with fake timers flush the initial load by hand.
async function loadedFake() {
  serve([A, B, C])
  const hook = renderHook(() => useBoard())
  await act(async () => void (await vi.advanceTimersByTimeAsync(0)))
  expect(hook.result.current.loading).toBe(false)
  return hook
}

beforeEach(() => {
  resetSupabaseMock()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
})

describe('loading', () => {
  it('maps snake_case rows to cards, ordered by position', async () => {
    const { result } = await loaded([row({ id: 'x', due_date: '2099-05-05', tags: ['design'] })])
    expect(result.current.cards).toEqual([
      { id: 'x', title: 'Write docs', assignee: 'Ada', priority: 'Medium', dueDate: '2099-05-05', column: 'backlog', position: 1000, tags: ['design'] },
    ])
    expect(opsOf('select')[0]).toMatchObject({ table: 'cards', order: { column: 'position', ascending: true } })
  })

  it('REGRESSION: surfaces a generic error and never the raw database message', async () => {
    respondWith(() => ({ error: { message: 'relation "public.cards" violates constraint cards_pkey' } }))
    const { result } = renderHook(() => useBoard())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('request failed')
    expect(result.current.error).not.toMatch(/cards_pkey|public\.cards/)
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('cards_pkey'))
  })
})

describe('creating cards', () => {
  it('inserts into the backlog by default and appends the returned card', async () => {
    const { result } = await loaded([])
    serve([], row({ id: 'new', title: 'New card', column: 'backlog', position: 9 }))
    let ok = false
    await act(async () => {
      ok = await result.current.addCard(input)
    })
    expect(ok).toBe(true)
    expect(opsOf('insert')[0].payload).toEqual({ title: 'New card', assignee: 'Grace', priority: 'High', due_date: '2099-02-02', tags: ['bug'], column: 'backlog' })
    expect(result.current.cards.map((c) => c.id)).toEqual(['new'])
  })

  it('inserts into the requested column', async () => {
    const { result } = await loaded([])
    serve([], row({ id: 'n', column: 'in-review' }))
    await act(async () => void (await result.current.addCard(input, 'in-review')))
    expect(opsOf('insert')[0].payload).toMatchObject({ column: 'in-review' })
  })

  it('returns false, adds nothing and sets an error when the insert fails', async () => {
    const { result } = await loaded([])
    respondWith((op) => (op.action === 'insert' ? { error: { message: 'boom' } } : { data: [], error: null }))
    let ok = true
    await act(async () => {
      ok = await result.current.addCard(input)
    })
    expect(ok).toBe(false)
    expect(result.current.cards).toEqual([])
    expect(result.current.error).toBe('request failed')
  })
})

describe('editing cards', () => {
  it('updates optimistically and sends only the editable fields', async () => {
    const { result } = await loaded()
    await act(async () => void (await result.current.updateCard('a', input)))
    expect(result.current.cards.find((c) => c.id === 'a')).toMatchObject({ title: 'New card', assignee: 'Grace', priority: 'High', dueDate: '2099-02-02', tags: ['bug'], column: 'backlog', position: 1000 })
    expect(opsOf('update')[0]).toMatchObject({
      filters: { id: 'a' },
      payload: { title: 'New card', assignee: 'Grace', priority: 'High', due_date: '2099-02-02', tags: ['bug'] },
    })
    expect(opsOf('update')[0].payload).not.toHaveProperty('column')
  })

  it('reloads from the server and reports failure when the update is rejected', async () => {
    const { result } = await loaded()
    respondWith((op) => (op.action === 'update' ? { error: { message: 'nope' } } : { data: [A, B, C], error: null }))
    let ok = true
    await act(async () => {
      ok = await result.current.updateCard('a', input)
    })
    expect(ok).toBe(false)
    expect(result.current.error).toBe('request failed')
    expect(result.current.cards.find((c) => c.id === 'a')?.title).toBe('A') // rolled back
  })
})

describe('moving cards', () => {
  it('moves to another column, placing the card after the last sibling', async () => {
    const { result } = await loaded()
    await act(async () => void (await result.current.moveCard('a', 'done')))
    const { payload } = opsOf('update')[0]
    expect(opsOf('update')[0].filters).toEqual({ id: 'a' })
    expect(payload).toMatchObject({ column: 'done' })
    expect((payload as { position: number }).position).toBeGreaterThan(500)
    expect(result.current.cards.find((c) => c.id === 'a')?.column).toBe('done')
  })

  it('places the card between its neighbours when dropped before another card', async () => {
    const { result } = await loaded()
    await act(async () => void (await result.current.moveCard('c', 'backlog', 'b')))
    expect(opsOf('update')[0].payload).toEqual({ column: 'backlog', position: 2000 }) // midpoint of 1000 and 3000
    expect(result.current.cards.filter((c) => c.column === 'backlog').map((c) => c.id)).toEqual(['a', 'c', 'b'])
  })

  it('places the card ahead of the first sibling when dropped before it', async () => {
    const { result } = await loaded()
    await act(async () => void (await result.current.moveCard('c', 'backlog', 'a')))
    const { position } = opsOf('update')[0].payload as { position: number }
    expect(position).toBeLessThan(1000)
  })

  it('REGRESSION: positions are integers (the column is a bigint)', async () => {
    const odd = [row({ id: 'p', position: 1001 }), row({ id: 'q', position: 2004 }), row({ id: 'm', column: 'done', position: 1 })]
    const { result } = await loaded(odd)
    await act(async () => void (await result.current.moveCard('m', 'backlog', 'q')))
    const { position } = opsOf('update')[0].payload as { position: number }
    expect(Number.isInteger(position)).toBe(true)
  })

  it('ignores no-op moves: same column without a target, or dropping onto itself', async () => {
    const { result } = await loaded()
    await act(async () => {
      await result.current.moveCard('a', 'backlog')
      await result.current.moveCard('a', 'backlog', 'a')
      await result.current.moveCard('missing', 'done')
    })
    expect(opsOf('update')).toHaveLength(0)
  })

  it('shows a saving status, then clears it and announces success', async () => {
    vi.useFakeTimers()
    const { result } = await loadedFake()
    let pending!: Promise<void>
    act(() => {
      pending = result.current.moveCard('a', 'done')
    })
    await act(async () => void (await vi.advanceTimersByTimeAsync(0)))
    expect(result.current.saveStatus).toEqual({ a: 'saving' })
    expect(result.current.announcement).toBe('Saving move…')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
      await pending
    })
    expect(result.current.saveStatus).toEqual({})
    expect(result.current.announcement).toBe('Move saved')
  })

  it('REGRESSION: on failure it rolls back, clears the spinner and announces the failure', async () => {
    const { result } = await loaded()
    respondWith((op) => (op.action === 'update' ? { error: { message: 'rls denied' } } : { data: [A, B, C], error: null }))
    await act(async () => void (await result.current.moveCard('a', 'done')))
    expect(result.current.saveStatus).toEqual({})
    expect(result.current.announcement).toBe('Move failed')
    expect(result.current.error).toBe('request failed')
    expect(result.current.cards.find((c) => c.id === 'a')?.column).toBe('backlog')
  })
})

describe('deleting cards', () => {
  beforeEach(() => vi.useFakeTimers())

  const del = async (id = 'a') => {
    const hook = await loadedFake()
    await act(async () => void (await hook.result.current.deleteCard(id)))
    return hook
  }

  it('removes the card immediately but does not touch the server until the undo window ends', async () => {
    const { result } = await del()
    expect(result.current.cards.map((c) => c.id).sort()).toEqual(['b', 'c'])
    expect(result.current.pendingDelete?.id).toBe('a')
    expect(result.current.announcement).toBe('Deleted "A". Undo available.')
    expect(opsOf('delete')).toHaveLength(0)

    await act(async () => void (await vi.advanceTimersByTimeAsync(9999)))
    expect(opsOf('delete')).toHaveLength(0)
    await act(async () => void (await vi.advanceTimersByTimeAsync(1)))
    expect(opsOf('delete')).toHaveLength(1)
    expect(opsOf('delete')[0].filters).toEqual({ id: 'a' })
    expect(result.current.pendingDelete).toBeNull()
  })

  it('undo restores the card and never deletes it server-side', async () => {
    const { result } = await del()
    act(() => result.current.undoDelete())
    await act(async () => void (await vi.advanceTimersByTimeAsync(20000)))
    expect(result.current.cards.map((c) => c.id)).toContain('a')
    expect(result.current.announcement).toBe('Card restored')
    expect(opsOf('delete')).toHaveLength(0)
  })

  it('REGRESSION: deleting a second card commits the first instead of dropping its undo', async () => {
    const { result } = await del('a')
    await act(async () => void (await result.current.deleteCard('b')))
    expect(opsOf('delete').map((o) => o.filters.id)).toEqual(['a'])
    expect(result.current.pendingDelete?.id).toBe('b')
  })

  it('REGRESSION: pausing the undo timer (hover/focus) holds the delete; resuming restarts the full window', async () => {
    const { result } = await del()
    act(() => result.current.pauseUndo())
    await act(async () => void (await vi.advanceTimersByTimeAsync(60000)))
    expect(opsOf('delete')).toHaveLength(0)
    expect(result.current.pendingDelete?.id).toBe('a')

    act(() => result.current.resumeUndo())
    await act(async () => void (await vi.advanceTimersByTimeAsync(9999)))
    expect(opsOf('delete')).toHaveLength(0)
    await act(async () => void (await vi.advanceTimersByTimeAsync(1)))
    expect(opsOf('delete')).toHaveLength(1)
  })

  it('dismissing the toast commits the delete right away', async () => {
    const { result } = await del()
    await act(async () => void (await result.current.dismissUndo()))
    expect(opsOf('delete')).toHaveLength(1)
    expect(result.current.pendingDelete).toBeNull()
  })

  it('ignores deletes of unknown ids', async () => {
    const { result } = await del('nope')
    expect(result.current.pendingDelete).toBeNull()
  })

  it('reloads and reports an error when the server rejects the delete', async () => {
    const { result } = await del()
    respondWith((op) => (op.action === 'delete' ? { error: { message: 'fk violation' } } : { data: [A, B, C], error: null }))
    await act(async () => void (await result.current.dismissUndo()))
    expect(result.current.error).toBe('request failed')
    expect(result.current.cards.map((c) => c.id)).toContain('a')
  })
})

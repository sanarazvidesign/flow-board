import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import type { Card, CardInput, ColumnId, Priority } from './types'

interface CardRow {
  id: string
  title: string
  assignee: string
  priority: Priority
  due_date: string
  column: ColumnId
  position: number
  tags: string[]
}

const CARD_COLUMNS = 'id, title, assignee, priority, due_date, column, position, tags'

const toCard = (r: CardRow): Card => ({
  id: r.id,
  title: r.title,
  assignee: r.assignee,
  priority: r.priority,
  dueDate: r.due_date,
  column: r.column,
  position: r.position,
  tags: r.tags,
})

const toRow = (input: CardInput) => ({
  title: input.title,
  assignee: input.assignee,
  priority: input.priority,
  due_date: input.dueDate,
  tags: input.tags,
})

const omit = (r: Record<string, SaveStatus>, id: string) => {
  const copy = { ...r }
  delete copy[id]
  return copy
}

// Keep server error details (table/constraint names) out of the UI; log them for developers.
const fail = (message: string) => {
  console.error(message)
  return 'request failed'
}

// Long enough to react, and paused while the user hovers or focuses the toast (WCAG 2.2.1).
const UNDO_MS = 10000

export type SaveStatus = 'saving'

export function useBoard() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({})
  const [pendingDelete, setPendingDelete] = useState<Card | null>(null)
  const pendingRef = useRef<{ card: Card; timer: ReturnType<typeof setTimeout> } | null>(null)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('cards')
      .select(CARD_COLUMNS)
      .order('position', { ascending: true })
    if (error) {
      setError(fail(error.message))
    } else {
      setCards((data as CardRow[]).map(toCard))
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  // Optimistic updates: apply locally, then reconcile with the server on failure.
  const run = async (request: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await request
    if (error) {
      const message = fail(error.message)
      await refresh() // a successful reload clears the error, so report it afterwards
      setError(message)
    }
    return !error
  }

  const setStatus = (id: string, status: SaveStatus | null) =>
    setSaveStatus((prev) => (status ? { ...omit(prev, id), [id]: status } : omit(prev, id)))

  const addCard = async (input: CardInput, column: ColumnId = 'backlog') => {
    const { data, error } = await supabase
      .from('cards')
      .insert({ ...toRow(input), column })
      .select(CARD_COLUMNS)
      .single()
    if (error) {
      setError(fail(error.message))
      return false
    }
    setCards((prev) => [...prev, toCard(data as CardRow)])
    setError(null)
    return true
  }

  const updateCard = (id: string, input: CardInput) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...input } : c)))
    return run(supabase.from('cards').update(toRow(input)).eq('id', id))
  }

  // Deletes are deferred so the user can undo; the row is only removed server-side after the timeout.
  const commitDelete = async () => {
    const pending = pendingRef.current
    if (!pending) return
    clearTimeout(pending.timer)
    pendingRef.current = null
    setPendingDelete(null)
    await run(supabase.from('cards').delete().eq('id', pending.card.id))
  }

  const deleteCard = async (id: string) => {
    const card = cards.find((c) => c.id === id)
    if (!card) return
    await commitDelete()
    setCards((prev) => prev.filter((c) => c.id !== id))
    pendingRef.current = { card, timer: setTimeout(() => void commitDelete(), UNDO_MS) }
    setPendingDelete(card)
    setAnnouncement(`Deleted "${card.title}". Undo available.`)
  }

  const undoDelete = () => {
    const pending = pendingRef.current
    if (!pending) return
    clearTimeout(pending.timer)
    pendingRef.current = null
    setPendingDelete(null)
    setCards((prev) => [...prev, pending.card])
    setAnnouncement('Card restored')
    void refresh()
  }

  const pauseUndo = () => {
    if (pendingRef.current) clearTimeout(pendingRef.current.timer)
  }

  const resumeUndo = () => {
    const pending = pendingRef.current
    if (!pending) return
    clearTimeout(pending.timer)
    pending.timer = setTimeout(() => void commitDelete(), UNDO_MS)
  }

  const dismissError = () => setError(null)

  const moveCard = async (id: string, column: ColumnId, beforeId?: string | null) => {
    const card = cards.find((c) => c.id === id)
    if (!card || beforeId === id) return
    if (card.column === column && !beforeId) return
    // Position is a bigint: place the card between its new neighbours using an integer midpoint.
    const siblings = cards.filter((c) => c.column === column && c.id !== id).sort((a, b) => a.position - b.position)
    const idx = beforeId ? siblings.findIndex((c) => c.id === beforeId) : -1
    let position: number
    if (idx === -1) {
      position = Math.max(Date.now(), (siblings.at(-1)?.position ?? 0) + 1)
    } else {
      const next = siblings[idx].position
      const prev = siblings[idx - 1]?.position ?? next - 2000
      position = Math.round((prev + next) / 2)
    }
    setCards((prev) => [...prev.filter((c) => c.id !== id), { ...card, column, position }].sort((a, b) => a.position - b.position))
    const startedAt = Date.now()
    setStatus(id, 'saving')
    setAnnouncement('Saving move…')
    const ok = await run(supabase.from('cards').update({ column, position }).eq('id', id))
    if (!ok) {
      setAnnouncement('Move failed')
      return setStatus(id, null)
    }
    // Keep the spinner up briefly so fast saves don't flash by unnoticed.
    await new Promise((resolve) => setTimeout(resolve, 500 - Math.min(500, Date.now() - startedAt)))
    setStatus(id, null)
    setAnnouncement('Move saved')
  }

  return { cards, loading, error, saveStatus, announcement, pendingDelete, addCard, updateCard, deleteCard, undoDelete, pauseUndo, resumeUndo, dismissUndo: commitDelete, dismissError, moveCard }
}

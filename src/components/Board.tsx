import { useState } from 'react'
import { COLUMNS, SUGGESTED_TAGS, type Card, type CardInput, type ColumnId } from '../types'
import { supabase } from '../supabase'
import { useBoard } from '../useBoard'
import { Column } from './Column'
import { CardModal } from './CardModal'
import { DesignSystem } from './DesignSystem'

type ModalState = { mode: 'closed' } | { mode: 'new'; column: ColumnId } | { mode: 'edit'; card: Card }

export function Board() {
  const { cards, loading, error, saveStatus, announcement, pendingDelete, addCard, updateCard, deleteCard, undoDelete, pauseUndo, resumeUndo, dismissUndo, dismissError, moveCard } = useBoard()
  const [saveFailed, setSaveFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDesignSystem, setShowDesignSystem] = useState(false)
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })

  const knownTags = [...new Set(cards.flatMap((c) => c.tags))].sort()
  const filterTags = [...new Set([...SUGGESTED_TAGS, ...knownTags])]
  const q = query.trim().toLowerCase()
  const visible = cards.filter(
    (c) =>
      (!activeTags.length || c.tags.some((t) => activeTags.includes(t))) &&
      (!q || c.title.toLowerCase().includes(q) || c.assignee.toLowerCase().includes(q)),
  )
  const toggleTag = (t: string) => setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  // Keep keyboard focus on the board after a card disappears or comes back (WCAG 2.4.3).
  const handleDelete = (id: string) => {
    const el = document.querySelector<HTMLElement>(`[data-card-id="${id}"]`)
    const next = el?.nextElementSibling?.querySelector<HTMLElement>('.card-title-btn') ?? el?.closest('.column')?.querySelector<HTMLElement>('.column-add')
    void deleteCard(id)
    next?.focus()
  }

  const handleUndo = () => {
    const id = pendingDelete?.id
    undoDelete()
    setTimeout(() => document.querySelector<HTMLElement>(`[data-card-id="${id}"] .card-title-btn`)?.focus(), 0)
  }

  const filterNote = activeTags.length || q ? `${visible.length} of ${cards.length} cards shown` : ''

  const close = () => {
    setModal({ mode: 'closed' })
    setSaveFailed(false)
  }

  // Keep the modal open on failure so the user's input isn't lost.
  const save = async (input: CardInput, column: ColumnId) => {
    setSaving(true)
    setSaveFailed(false)
    let ok: boolean
    if (modal.mode === 'edit') {
      ok = await updateCard(modal.card.id, input)
      if (ok && column !== modal.card.column) void moveCard(modal.card.id, column)
    } else {
      ok = await addCard(input, column)
    }
    setSaving(false)
    if (ok) close()
    else setSaveFailed(true)
  }

  if (showDesignSystem) return <DesignSystem onBack={() => setShowDesignSystem(false)} />

  return (
    <>
    <div className="board-wrap" inert={modal.mode !== 'closed'}>
      <header className="topbar">
        <h1>Flow Board</h1>
        <div className="topbar-actions">
          <button type="button" onClick={() => setShowDesignSystem(true)}>
            Design system
          </button>
          <button type="button" onClick={() => void supabase.auth.signOut()}>
            Sign out
          </button>
          <button type="button" className="primary" onClick={() => setModal({ mode: 'new', column: 'backlog' })}>
            + Add card
          </button>
        </div>
      </header>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {filterNote}
      </p>
      <main>
      {error && (
        <p className="error" role="alert">
          <span>Something went wrong. Please try again.</span>
          <button type="button" className="link-btn" onClick={dismissError}>
            Dismiss
          </button>
        </p>
      )}
      {!loading && !error && cards.length === 0 && (
        <p className="status first-run">
          Your board is empty.{' '}
          <button type="button" className="link-btn" onClick={() => setModal({ mode: 'new', column: 'backlog' })}>
            Add your first card
          </button>
        </p>
      )}
      <div className="filter-bar" role="group" aria-label="Filter by tag">
        <label className="search-label">
          <span className="sr-only">Search cards by title or assignee</span>
          <input type="search" className="search" placeholder="Search title or assignee" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <span>Filter:</span>
        {filterTags.map((t) => (
          <button key={t} type="button" className={`tag-chip${activeTags.includes(t) ? ' active' : ''}`} aria-pressed={activeTags.includes(t)} onClick={() => toggleTag(t)}>
            {t}
          </button>
        ))}
        {(activeTags.length > 0 || q) && (
          <button type="button" className="link-btn" onClick={() => {
              setActiveTags([])
              setQuery('')
            }}>
            Clear
          </button>
        )}
      </div>
      <div className="board" aria-busy={loading}>
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            label={col.label}
            cards={visible.filter((c) => c.column === col.id)}
            loading={loading}
            saveStatus={saveStatus}
            onMove={moveCard}
            onAdd={(column) => setModal({ mode: 'new', column })}
            onEdit={(card) => setModal({ mode: 'edit', card })}
            onDelete={handleDelete}
          />
        ))}
      </div>
      </main>
    </div>
      {modal.mode !== 'closed' && (
        <CardModal knownTags={knownTags} card={modal.mode === 'edit' ? modal.card : null} initialColumn={modal.mode === 'new' ? modal.column : 'backlog'} saving={saving} failed={saveFailed} onSave={save} onClose={close} />
      )}
      {pendingDelete && (
        // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions -- Escape dismisses the undo toast; Dismiss button is the primary control
        <div
          className="toast"
          role="group"
          aria-label="Undo delete"
          onMouseEnter={pauseUndo}
          onMouseLeave={resumeUndo}
          onFocus={pauseUndo}
          onBlur={resumeUndo}
          onKeyDown={(e) => e.key === 'Escape' && dismissUndo()}
        >
          <span>Deleted “{pendingDelete.title}”</span>
          <button type="button" className="link-btn" onClick={handleUndo}>
            Undo
          </button>
          <button type="button" className="link-btn" onClick={() => void dismissUndo()}>
            Dismiss
          </button>
        </div>
      )}
    </>
  )
}

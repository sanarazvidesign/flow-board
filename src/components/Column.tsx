import { useState } from 'react'
import type { Card as CardType, ColumnId } from '../types'
import type { SaveStatus } from '../useBoard'
import { Card } from './Card'

interface Props {
  id: ColumnId
  label: string
  cards: CardType[]
  loading: boolean
  saveStatus: Record<string, SaveStatus>
  onMove: (cardId: string, column: ColumnId, beforeId?: string | null) => void
  onAdd: (column: ColumnId) => void
  onEdit: (card: CardType) => void
  onDelete: (id: string) => void
}

export function Column({ id, label, cards, loading, saveStatus, onMove, onAdd, onEdit, onDelete }: Props) {
  const [over, setOver] = useState(false)
  const [overCardId, setOverCardId] = useState<string | null>(null)

  const cardIdAt = (target: EventTarget) => (target as HTMLElement).closest<HTMLElement>('[data-card-id]')?.dataset.cardId ?? null

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions -- drag-and-drop is a mouse enhancement; each card has a keyboard 'Move to' select (WCAG 2.5.7)
    <section
      className={`column${over ? ' drag-over' : ''}`}
      aria-labelledby={`col-${id}-title`}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setOver(true)
        setOverCardId(cardIdAt(e.target))
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOver(false)
          setOverCardId(null)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        setOverCardId(null)
        const cardId = e.dataTransfer.getData('text/plain')
        if (cardId) onMove(cardId, id, cardIdAt(e.target))
      }}
    >
      <header className="column-header">
        <h2 id={`col-${id}-title`}>{label}</h2>
        <span className="count">{cards.length}</span>
        <button type="button" className="icon-btn sm column-add" aria-label={`Add card to ${label}`} title="Add card" onClick={() => onAdd(id)}>
          +
        </button>
      </header>
      <div className="column-body">
        {loading && (
          <>
            <div className="skeleton" aria-hidden="true" />
            <div className="skeleton" aria-hidden="true" />
          </>
        )}
        {!loading && cards.length === 0 && <p className="column-empty">Drop cards here</p>}
        {cards.map((c) => (
          <Card key={c.id} card={c} status={saveStatus[c.id]} dropBefore={over && overCardId === c.id} onMove={onMove} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </section>
  )
}

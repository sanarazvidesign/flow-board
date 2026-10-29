import { useState } from 'react'
import { COLUMNS, type Card as CardType, type ColumnId } from '../types'
import type { SaveStatus } from '../useBoard'

interface Props {
  card: CardType
  status?: SaveStatus
  dropBefore?: boolean
  onMove: (id: string, column: ColumnId) => void
  onEdit: (card: CardType) => void
  onDelete: (id: string) => void
}

function formatDate(iso: string): string {
  if (!iso) return 'No due date'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function isOverdue(card: CardType): boolean {
  if (!card.dueDate || card.column === 'done') return false
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return card.dueDate < today
}

const iconProps = { viewBox: '0 0 24 24', width: 14, height: 14, 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function Card({ card, status, dropBefore, onMove, onEdit, onDelete }: Props) {
  const overdue = isOverdue(card)
  const [dragging, setDragging] = useState(false)
  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions -- mouse convenience; keyboard users use the title button / select
    <article
      className={`card${overdue ? ' card-overdue' : ''}${status === 'saving' ? ' card-saving' : ''}${dragging ? ' card-dragging' : ''}${dropBefore ? ' drop-before' : ''}`}
      data-card-id={card.id}
      draggable
      aria-busy={status === 'saving'}
      data-testid="card"
      // Mouse convenience only; keyboard and assistive tech use the title button below.
      onClick={() => onEdit(card)}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', card.id)
        e.dataTransfer.effectAllowed = 'move'
        setDragging(true)
      }}
      onDragEnd={() => setDragging(false)}
    >
      <div className="card-head">
        <h3>
          <button type="button" className="card-title-btn" aria-label={`Edit "${card.title}"`}>
            {card.title}
          </button>
        </h3>
        <span className={`badge badge-${card.priority.toLowerCase()}`}>
          <span className="sr-only">Priority: </span>
          {card.priority}
        </span>
        <button
          type="button"
          className="icon-btn sm danger"
          aria-label={`Delete "${card.title}"`}
          title="Delete"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(card.id)
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>
      {card.tags.length > 0 && (
        <ul className="tag-list" aria-label="Tags">
          {card.tags.map((t) => (
            <li key={t} className="tag">
              {t}
            </li>
          ))}
        </ul>
      )}
      <p className="card-meta">
        <svg {...iconProps}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
        <span className="sr-only">Assignee: </span>
        {card.assignee || 'Unassigned'}
      </p>
      <div className="card-actions">
        <p className={`card-meta${overdue ? ' overdue-text' : ''}`}>
          <svg {...iconProps}>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          <span className="sr-only">Due: </span>
          {formatDate(card.dueDate)}
          {overdue && ' · Overdue'}
        </p>
        {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions -- mouse convenience; keyboard users use the title button / select */}
        <label className="move-select" onClick={(e) => e.stopPropagation()}>
          <span className="sr-only">Move "{card.title}" to column</span>
          <select value={card.column} onChange={(e) => onMove(card.id, e.target.value as ColumnId)} onKeyDown={(e) => e.stopPropagation()}>
            {COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        {status === 'saving' && (
          <span className="spinner" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} style={{ '--i': i } as React.CSSProperties} />
            ))}
          </span>
        )}
      </div>
    </article>
  )
}

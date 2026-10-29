import { useEffect, useRef, useState, type FormEvent } from 'react'
import { COLUMNS, MAX_TAGS, PRIORITIES, SUGGESTED_TAGS, normalizeTag, type Card, type CardInput, type ColumnId, type Priority } from '../types'

interface Props {
  card: Card | null
  knownTags: string[]
  initialColumn: ColumnId
  saving: boolean
  failed: boolean
  onSave: (input: CardInput, column: ColumnId) => void
  onClose: () => void
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'

export function CardModal({ card, knownTags, initialColumn, saving, failed, onSave, onClose }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [column, setColumn] = useState<ColumnId>(card?.column ?? initialColumn)

  // Return focus to whatever opened the dialog once it closes. Captured during render, before
  // autoFocus moves focus into the form; the microtask skips StrictMode's simulated unmount.
  const openerRef = useRef(document.activeElement as HTMLElement | null)
  useEffect(() => {
    const opener = openerRef.current
    const form = formRef.current
    return () => queueMicrotask(() => !form?.isConnected && opener?.focus())
  }, [])

  const [title, setTitle] = useState(card?.title ?? '')
  const [assignee, setAssignee] = useState(card?.assignee ?? '')
  const [priority, setPriority] = useState<Priority>(card?.priority ?? 'Medium')
  const [dueDate, setDueDate] = useState(card?.dueDate ?? '')

  const [tags, setTags] = useState<string[]>(card?.tags ?? [])
  const [tagDraft, setTagDraft] = useState('')

  const addTags = (raw: string) => {
    const next = raw.split(',').map(normalizeTag).filter(Boolean)
    setTags((prev) => [...new Set([...prev, ...next])].slice(0, MAX_TAGS))
    setTagDraft('')
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const pending = normalizeTag(tagDraft)
    const finalTags = pending ? [...new Set([...tags, pending])].slice(0, MAX_TAGS) : tags
    onSave({ title: title.trim(), assignee: assignee.trim(), priority, dueDate, tags: finalTags }, column)
  }

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-static-element-interactions -- Escape/Tab handling for the modal's focus trap
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
        if (e.key === 'Tab' && formRef.current) {
          const items = [...formRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
          const first = items[0]
          const last = items[items.length - 1]
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            last.focus()
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }}
    >
      <form ref={formRef} className="modal" role="dialog" aria-modal="true" aria-label={card ? 'Edit card' : 'New card'} onSubmit={submit}>
        <h2>{card ? 'Edit card' : 'New card'}</h2>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </label>
        <label>
          Assignee
          <input value={assignee} onChange={(e) => setAssignee(e.target.value)} required />
        </label>
        <label>
          Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          Due date
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </label>
        <label>
          Status
          <select value={column} onChange={(e) => setColumn(e.target.value as ColumnId)}>
            {COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <label htmlFor="tag-input">Tags</label>
          {tags.length > 0 && (
            <ul className="tag-list">
              {tags.map((t) => (
                <li key={t} className="tag">
                  {t}
                  <button type="button" className="tag-remove" aria-label={`Remove tag ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            id="tag-input"
            list="tag-options"
            value={tagDraft}
            placeholder="Type a tag, press Enter"
            disabled={tags.length >= MAX_TAGS}
            onChange={(e) => {
              const v = e.target.value
              if (v.includes(',')) addTags(v)
              else setTagDraft(v)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTags(tagDraft)
              } else if (e.key === 'Backspace' && !tagDraft) {
                setTags(tags.slice(0, -1))
              }
            }}
            onBlur={() => tagDraft && addTags(tagDraft)}
          />
          <datalist id="tag-options">
            {[...new Set([...SUGGESTED_TAGS, ...knownTags])].filter((t) => !tags.includes(t)).map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        {failed && (
          <p className="error modal-error" role="alert">
            Couldn’t save. Your changes are still here — try again.
          </p>
        )}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? 'Saving…' : card ? 'Save changes' : 'Add card'}
          </button>
        </div>
      </form>
    </div>
  )
}

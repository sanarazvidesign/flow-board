export type ColumnId = 'backlog' | 'in-progress' | 'in-review' | 'done'
export type Priority = 'High' | 'Medium' | 'Low'

export interface Card {
  id: string
  title: string
  assignee: string
  priority: Priority
  dueDate: string
  column: ColumnId
  position: number
  tags: string[]
}

export type CardInput = Omit<Card, 'id' | 'column' | 'position'>

export const COLUMNS: { id: ColumnId; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'in-review', label: 'In Review' },
  { id: 'done', label: 'Done' },
]

export const SUGGESTED_TAGS = ['design', 'bug', 'research']
export const MAX_TAGS = 10

export const normalizeTag = (t: string) => t.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 30)

export const PRIORITIES: Priority[] = ['High', 'Medium', 'Low']

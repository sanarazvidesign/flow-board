import { vi } from 'vitest'

// In-memory stand-in for the Supabase client so tests never open a network connection.
// Every query is recorded as an Op and answered by the current handler.

export type Action = 'select' | 'insert' | 'update' | 'delete'
export interface Op {
  table: string
  action: Action
  payload?: unknown
  filters: Record<string, unknown>
  order?: { column: string; ascending: boolean }
}
export interface Result {
  data?: unknown
  error: { message: string } | null
}
type Handler = (op: Op) => Result | Promise<Result>

const ok: Handler = () => ({ data: [], error: null })

export const ops: Op[] = []
let handler: Handler = ok

export const configState: { error: string | null } = { error: null }

/** Answer every query with `fn` until the next reset. */
export const respondWith = (fn: Handler) => {
  handler = fn
}

export const opsOf = (action: Action) => ops.filter((o) => o.action === action)

class Query implements PromiseLike<Result> {
  private op: Op
  constructor(table: string) {
    this.op = { table, action: 'select', filters: {} }
  }
  select() {
    // `.insert(...).select()` keeps the insert action; a bare `.select()` is a read.
    return this
  }
  insert(payload: unknown) {
    this.op.action = 'insert'
    this.op.payload = payload
    return this
  }
  update(payload: unknown) {
    this.op.action = 'update'
    this.op.payload = payload
    return this
  }
  delete() {
    this.op.action = 'delete'
    return this
  }
  eq(column: string, value: unknown) {
    this.op.filters[column] = value
    return this
  }
  order(column: string, opts: { ascending: boolean }) {
    this.op.order = { column, ...opts }
    return this
  }
  single() {
    return this
  }
  then<T1 = Result, T2 = never>(onfulfilled?: ((v: Result) => T1 | PromiseLike<T1>) | null, onrejected?: ((e: unknown) => T2 | PromiseLike<T2>) | null) {
    ops.push(this.op)
    return Promise.resolve(handler(this.op)).then(onfulfilled, onrejected)
  }
}

export const auth = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}

export const supabase = { from: (table: string) => new Query(table), auth }

const unsubscribe = vi.fn()

export function resetSupabaseMock() {
  ops.length = 0
  handler = ok
  configState.error = null
  unsubscribe.mockReset()
  auth.getSession.mockReset().mockResolvedValue({ data: { session: null } })
  auth.onAuthStateChange.mockReset().mockReturnValue({ data: { subscription: { unsubscribe } } })
  auth.signInWithPassword.mockReset().mockResolvedValue({ data: { session: {} }, error: null })
  auth.signUp.mockReset().mockResolvedValue({ data: { session: null }, error: null })
  auth.signOut.mockReset().mockResolvedValue({ error: null })
}
resetSupabaseMock()

/** Shape of the `../supabase` module, for use in `vi.mock`. */
export const supabaseModule = {
  supabase,
  get configError() {
    return configState.error
  },
}

// ---- fixtures ----------------------------------------------------------

export interface Row {
  id: string
  title: string
  assignee: string
  priority: 'High' | 'Medium' | 'Low'
  due_date: string
  column: 'backlog' | 'in-progress' | 'in-review' | 'done'
  position: number
  tags: string[]
}

export const row = (over: Partial<Row> = {}): Row => ({
  id: 'c1',
  title: 'Write docs',
  assignee: 'Ada',
  priority: 'Medium',
  due_date: '2099-01-01',
  column: 'backlog',
  position: 1000,
  tags: [],
  ...over,
})

/** Serve `rows` for selects; other actions succeed with the optional `insertResult`. */
export const serve = (rows: Row[], insertResult?: Row) =>
  respondWith((op) => {
    if (op.action === 'select') return { data: rows, error: null }
    if (op.action === 'insert') return { data: insertResult ?? null, error: null }
    return { error: null }
  })

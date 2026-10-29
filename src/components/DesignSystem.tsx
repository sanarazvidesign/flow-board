import './DesignSystem.css'

interface Props {
  onBack: () => void
}

const COLORS = [
  { token: '--bg', value: '#f4f5f7', use: 'Page background' },
  { token: '--surface', value: '#ebecf0', use: 'Column background, hover fill' },
  { token: '--card', value: '#ffffff', use: 'Cards, modal, buttons' },
  { token: '--border', value: '#dfe1e6', use: 'Borders, count pill' },
  { token: '--text', value: '#172b4d', use: 'Primary text (14.1:1 on card)' },
  { token: '--muted', value: '#505f79', use: 'Secondary text (6.4:1 on card, 5.5:1 on column)' },
  { token: '--control-border', value: '#6b778c', use: 'Input, select and button borders (4.5:1 on card, 3.8:1 on column)' },
  { token: '--primary', value: '#0c66e4', use: 'Primary action, focus ring, drop highlight (white text 5.2:1)' },
  { token: '--danger', value: '#c9372c', use: 'Destructive action (5.2:1 on card)' },
]

const PRIORITY = [
  { name: 'High', bg: '#ffd5d2', fg: '#8b1a10', ratio: '7.0:1' },
  { name: 'Medium', bg: '#fff1c2', fg: '#7a5200', ratio: '6.1:1' },
  { name: 'Low', bg: '#d3f1dc', fg: '#1c6b36', ratio: '5.4:1' },
]

const TYPE = [
  { sample: 'Flow Board', spec: 'Page title · h1 · 1.4rem', style: { fontSize: '1.4rem', fontWeight: 700 } },
  { sample: 'New card', spec: 'Modal title · h2 · 1.5rem (browser default)', style: { fontSize: '1.5rem', fontWeight: 700 } },
  { sample: 'Fix login bug', spec: 'Card title · h3 · .95rem', style: { fontSize: '.95rem', fontWeight: 700 } },
  { sample: 'IN PROGRESS', spec: 'Column heading · .85rem · uppercase · .05em tracking', style: { fontSize: '.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' } },
  { sample: 'Due Nov 1, 2026', spec: 'Card meta · .8rem · muted', style: { fontSize: '.8rem', color: 'var(--muted)' } },
  { sample: 'High', spec: 'Badge · .7rem · 600', style: { fontSize: '.7rem', fontWeight: 600 } },
] as const

const SPACING = [
  { px: 2, use: 'Card meta line gap' },
  { px: 4, use: 'Label to input gap' },
  { px: 8, use: 'Card gap, button group gap' },
  { px: 12, use: 'Column padding, card horizontal padding' },
  { px: 16, use: 'Column gap, overlay padding' },
  { px: 24, use: 'Page gutter, modal padding' },
]

const RADII = [
  { px: 6, use: 'Buttons, inputs, banners' },
  { px: 8, use: 'Cards' },
  { px: 10, use: 'Columns, modal' },
  { px: 999, use: 'Badges, count pill' },
]

export function DesignSystem({ onBack }: Props) {
  return (
    <div className="ds">
      <header className="topbar">
        <h1>Design system</h1>
        <button type="button" className="primary" onClick={onBack}>
          ← Back to board
        </button>
      </header>

      <nav className="ds-nav" aria-label="Design system sections">
        {['principles', 'color', 'typography', 'spacing', 'components', 'patterns', 'accessibility'].map((s) => (
          <a key={s} href={`#ds-${s}`}>
            {s[0].toUpperCase() + s.slice(1)}
          </a>
        ))}
      </nav>

      <main className="ds-main">
        <section id="ds-principles">
          <h2>Principles</h2>
          <ul>
            <li><strong>Quiet surfaces, clear status.</strong> Neutral greys carry the layout; color is reserved for priority, the primary action and drop targets.</li>
            <li><strong>Direct manipulation.</strong> Drag a card to change its status; click it to edit it.</li>
            <li><strong>Accessible by default.</strong> Text meets WCAG AA contrast, interactive targets are at least 24×24px, and everything works from the keyboard.</li>
          </ul>
        </section>

        <section id="ds-color">
          <h2>Color</h2>
          <p>Defined as CSS custom properties on <code>:root</code> in <code>src/index.css</code>.</p>
          <div className="ds-grid">
            {COLORS.map((c) => (
              <div key={c.token} className="ds-swatch">
                <div className="ds-chip" style={{ background: c.value }} />
                <code>{c.token}</code>
                <span>{c.value}</span>
                <small>{c.use}</small>
              </div>
            ))}
          </div>
          <h3>Priority</h3>
          <p>Priority is shown as a badge. The label is always text, so color is never the only signal.</p>
          <div className="ds-row">
            {PRIORITY.map((p) => (
              <div key={p.name} className="ds-swatch">
                <span className={`badge badge-${p.name.toLowerCase()}`}>{p.name}</span>
                <span>{p.bg} / {p.fg}</span>
                <small>Contrast {p.ratio}</small>
              </div>
            ))}
          </div>
        </section>

        <section id="ds-typography">
          <h2>Typography</h2>
          <p>System font stack: <code>system-ui, -apple-system, 'Segoe UI', sans-serif</code>.</p>
          <table className="ds-table">
            <tbody>
              {TYPE.map((t) => (
                <tr key={t.spec}>
                  <td style={t.style}>{t.sample}</td>
                  <td>{t.spec}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section id="ds-spacing">
          <h2>Spacing, radius and elevation</h2>
          <h3>Spacing</h3>
          <table className="ds-table">
            <tbody>
              {SPACING.map((s) => (
                <tr key={s.px}>
                  <td><span className="ds-bar" aria-hidden="true" style={{ width: s.px }} /></td>
                  <td>{s.px}px</td>
                  <td>{s.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>Radius</h3>
          <div className="ds-row">
            {RADII.map((r) => (
              <div key={r.px} className="ds-swatch">
                <div className="ds-radius" style={{ borderRadius: r.px }} />
                <span>{r.px === 999 ? 'Pill' : `${r.px}px`}</span>
                <small>{r.use}</small>
              </div>
            ))}
          </div>
          <h3>Elevation</h3>
          <div className="ds-row">
            <div className="ds-swatch">
              <div className="ds-radius" style={{ boxShadow: '0 1px 2px rgba(9,30,66,.25)' }} />
              <code>0 1px 2px rgba(9,30,66,.25)</code>
              <small>Cards. Columns are flat; the modal sits on a rgba(9,30,66,.54) overlay.</small>
            </div>
          </div>
        </section>

        <section id="ds-components">
          <h2>Components</h2>

          <h3>Button</h3>
          <div className="ds-demo ds-row">
            <button type="button">Default</button>
            <button type="button" className="primary">Primary</button>
            <button type="button" disabled>Disabled</button>
          </div>
          <p>Use one primary button per view. Default buttons are secondary actions such as Cancel.</p>

          <h3>Icon button</h3>
          <div className="ds-demo ds-row">
            <button type="button" className="icon-btn danger" aria-label="Delete example" title="Delete">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
          <p>28×28px (24px minimum), icon is 16px stroke, always has an <code>aria-label</code> and a tooltip. Destructive actions are reversible with an Undo toast.</p>

          <h3>Badge</h3>
          <div className="ds-demo ds-row">
            {PRIORITY.map((p) => (
              <span key={p.name} className={`badge badge-${p.name.toLowerCase()}`}>{p.name}</span>
            ))}
          </div>

          <h3>Card</h3>
          <div className="ds-demo ds-card-demo">
            <article className="card" aria-label="Example card">
              <div className="card-head">
                <h3>Fix login bug</h3>
                <span className="badge badge-high">High</span>
              </div>
              <p className="card-meta">👤 Sam</p>
              <p className="card-meta">📅 Nov 1, 2026</p>
            </article>
          </div>
          <p>Shows title, priority, assignee and due date. Click anywhere to edit, drag to move, use the trash icon to delete. Focusable with a 2px primary outline.</p>

          <h3>Column</h3>
          <div className="ds-demo ds-card-demo">
            <section className="column" aria-label="Example column">
              <header className="column-header">
                <h2>In Progress</h2>
                <span className="count">2</span>
              </header>
            </section>
            <section className="column drag-over" aria-label="Example column, drag over">
              <header className="column-header">
                <h2>Drag over</h2>
                <span className="count">0</span>
              </header>
            </section>
          </div>
          <p>Four fixed columns: Backlog, In Progress, In Review, Done. While a card is dragged over a column it gets a primary border and a light blue fill.</p>

          <h3>Form fields</h3>
          <div className="ds-demo">
            <form className="modal ds-modal" onSubmit={(e) => e.preventDefault()}>
              <label>
                Title
                <input defaultValue="Fix login bug" />
              </label>
              <label>
                Priority
                <select defaultValue="Medium">
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>
              <label>
                Due date
                <input type="date" defaultValue="2026-11-01" />
              </label>
              <div className="modal-actions">
                <button type="button">Cancel</button>
                <button type="submit" className="primary">Save changes</button>
              </div>
            </form>
          </div>
          <p>Labels sit above inputs, are 600 weight and always visible. Title, assignee and due date are required. The modal is max 400px wide, closes on Escape or an outside click, and focuses the first field.</p>
        </section>

        <section id="ds-patterns">
          <h2>Patterns</h2>
          <ul>
            <li><strong>Add:</strong> “+ Add card” opens the modal; new cards land in Backlog.</li>
            <li><strong>Edit:</strong> click a card to open the same modal pre-filled.</li>
            <li><strong>Move:</strong> drag a card onto a column; it goes to the end of that column.</li>
            <li><strong>Delete:</strong> trash icon, then a 10-second Undo toast (paused while hovered or focused).</li>
            <li><strong>Feedback:</strong> updates appear instantly; if saving fails an error banner shows (<code>role="alert"</code>) and the board reloads from the server.</li>
            <li><strong>Loading:</strong> a “Loading board…” line while cards are fetched.</li>
          </ul>
        </section>

        <section id="ds-accessibility">
          <h2>Accessibility</h2>
          <ul>
            <li>Text and badge contrast is at least 4.5:1 (WCAG AA); values are listed in Color.</li>
            <li>Touch and click targets are at least 24×24px (WCAG 2.2 AA 2.5.8); control borders are at least 3:1 (1.4.11).</li>
            <li>Cards are keyboard focusable; Enter or Space opens the editor, Tab reaches the delete button.</li>
            <li>Icon-only buttons carry an <code>aria-label</code> that includes the card title.</li>
            <li>The modal uses <code>role="dialog"</code> and <code>aria-modal</code>, and Escape closes it.</li>
            <li>Known gap: drag and drop is mouse and touch-pointer only. There is no keyboard way to move a card between columns yet.</li>
          </ul>
        </section>
      </main>
    </div>
  )
}

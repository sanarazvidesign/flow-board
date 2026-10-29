# FlowBoard Design System

Source: the Figma file "FlowBoard Designs (Copy)", page "Base Designs". This document describes what the designs show, in plain language. The Figma file defines no shared variables or styles, so every value below was read off the individual screens: Log-in Form, Homepage (My Boards), Create Project Board, Create Card Modal, and Card Created Homepage.

---

## 1. Colors

### Brand and action
- **FlowBoard blue (#0369A1)** is the main brand color. It is used for the logo tile, the primary action buttons inside forms and modals (Sign in, Save), and text links such as "Forgot password?".
- **Violet (#8A38F5)** is used on one button only: "New Board" on the Homepage. It is the one place where the design breaks from the blue. See "Open questions" at the end.
- **Indigo (#6366F1)** fills the round user avatar in the top bar.

### Surfaces
- **White (#FFFFFF)** is the surface for cards, modals, the login panel, the top bar, and text inputs.
- **Page gray, light (#F9FAFB)** is the background of the Homepage and the board screens.
- **Page gray, medium (#F3F4F6)** is the background of the login screen and of each board column. It is also the track behind the Password / Magic link / Sign up toggle.
- **Overlay (black at 50% opacity)** dims the page behind any open modal.

### Text
- **Near-black (#0A0A0A)** is the main text color: headings, labels, card titles, button text on light backgrounds.
- **Muted gray-violet (#717182)** is for secondary text: placeholders, dates, column counts, small field labels, the breadcrumb on the board screen, and inactive toggle tabs.
- **White** is used for text on blue, violet and indigo fills.

### Feedback and states
- **Danger red (#D4183D)** is used for destructive text actions. In the designs that is only "Delete card".
- **Soft indigo tint (#E0E7FF)** fills a text input while it is focused. The focused input also loses its visible border.
- **Hairline border (black at 10% opacity)** outlines inputs, cards, board tiles, column cards, and dividers. This is the only border treatment in the system.

---

## 2. Typography

One typeface is used everywhere: **Inter**. Three weights appear: regular, medium, and semibold (semibold only for the "FlowBoard" title on the login screen).

| Role | Size | Weight | Line height | Where it is used |
|---|---|---|---|---|
| Page title | 24 | Medium (Semibold on login) | 32 (36 on the board toolbar) | "My Boards", "FlowBoard" on login, the board name in the toolbar |
| Section / modal title | 18 | Medium | 27 to 28 | Modal headings ("Create board", "Card"), board tile titles |
| Body and buttons | 16 | Regular for body, Medium for buttons | 24 | Button labels, input text and placeholders, top bar links |
| Label and secondary | 14 | Medium for labels, Regular for supporting text | 20 | Field labels, column titles, task card text, dates, "Add card", toggle tabs |
| Small caps label | 12 | Medium | 16 | Uppercase field labels in the card modal (DESCRIPTION, PRIORITY, DUE DATE), with wider letter spacing |
| Small | 12 | Regular or Medium | 16 | Column count badge, avatar initial |

Notes
- Larger text is tightened very slightly and smaller text is spaced very slightly. The uppercase 12-pixel labels have noticeably wider letter spacing than everything else.
- Placeholder text always uses the muted gray-violet.

---

## 3. Spacing, shape, and depth

### Spacing scale
The designs use a small set of steps, all multiples of 4: **4, 8, 12, 16, 24, 32**.
- 4: padding inside the toggle track.
- 8: gap between a label and its field, between an icon and its text, and between small items.
- 12: horizontal padding inside inputs, and the gap between buttons.
- 16: the gap between form fields, between columns, between board tiles, and the padding inside a column.
- 24: padding around modal content and inside the top bar, and the gap between the toggle and the form.
- 32: padding around the login panel, around the board area, and between the page title row and the tiles beneath it.

### Corner radius
- **10** is the standard: inputs, buttons, board tiles, columns, task cards, the toggle track.
- **16** is for large floating panels: modals and the login panel.
- **14** for the large logo tile on the login screen.
- **8** for the individual segments of the toggle.
- **Fully round** for the avatar and the column count badge.

### Shadows
- **Modals** carry a large, soft, low-opacity shadow so they clearly float above the dimmed page.
- **The login panel** carries a medium shadow of the same style.
- **The selected toggle tab** carries a very small shadow so it looks raised.
- Cards, columns, and board tiles have **no shadow**; they are defined by the hairline border only.

### Layout
- **Top bar:** 65 pixels tall, white, with a hairline line underneath. Logo and "FlowBoard" and "Boards" on the left, avatar and "Sign out" on the right.
- **Board toolbar:** a second bar, 69 pixels tall, directly under the top bar. It shows a breadcrumb ("Boards / board name") and a quiet column count ("3 columns").
- **Homepage:** content sits in a centered block about 1,280 pixels wide, with a title row (title on the left, button on the right) above a row of board tiles.
- **Board screen:** columns start 32 pixels from the left edge, sit side by side with a 16-pixel gap, and are roughly 320 pixels wide each.
- **Modals:** centered on the dimmed page. The card modal is 512 wide; the create-board and login panels are 448 wide.

---

## 4. Components

### Column
- A soft gray (#F3F4F6) rounded container, 16 pixels of padding inside, 16 pixels between its parts.
- **Header row:** the column title on the left (14 pixels, medium weight) and a small white pill on the right holding the number of cards.
- **Card area:** the column's task cards stacked from the top.
- **Footer:** a quiet "+ Add card" action in the muted text color, with a small plus icon, pinned at the bottom.
- The designs show three columns on the board, with "To Do" as the example.

### Card (task card)
- White, rounded, with the hairline border and no shadow.
- Shows **only the card name**, at 14 pixels in regular near-black text, with 13 pixels of padding all round. The card is about 46 pixels tall in the design.
- Cards fill the full width of the column.
- The design does not show a priority marker, assignee, due date, or tags on the card. Those appear only as fields in the card editor.

### Board tile (on the Homepage)
- White, rounded, hairline border, about 308 wide and 105 tall.
- A board title at 18 pixels in near-black over a creation date at 14 pixels in muted gray.
- Tiles sit in a row with a 16-pixel gap.

### Card editor modal
- Title "Card" at the top left with a small close (X) icon at the top right.
- Fields in order: **Name** (a standard-size label in near-black), **Description** (a multi-line box), then **Priority** and **Due date** side by side, each half the width.
- A hairline divider, then **Delete card** in red on the left, and **Cancel** (plain text) and **Save** (blue filled) on the right.

### Create board modal
- Title "Create board", one **Board name** field with the placeholder "e.g. Product Roadmap", then **Cancel** and **Create** aligned to the right.

### Buttons
- **Primary:** filled, 44 pixels tall, 10-pixel radius, white 16-pixel medium text, 16 pixels of side padding. Blue in forms and modals. The Homepage's "New Board" is violet and has a small plus icon before its label.
- **Secondary:** no fill, near-black medium text ("Cancel").
- **Destructive:** no fill, red text ("Delete card").
- **Link:** blue regular 14-pixel text, no underline shown ("Forgot password?").

### Text inputs
- White, 10-pixel radius, hairline border, 12 pixels of side padding and 10 vertical, about 46 pixels tall for single-line fields.
- A label sits above, 8 pixels away, in 14-pixel medium near-black (or the small uppercase style in the card editor).
- **Focused:** the fill becomes soft indigo (#E0E7FF) and the border disappears.

### Toggle (segmented tabs)
- A gray track, 44 pixels tall, 10-pixel radius, 4 pixels of padding, holding three tabs: **Password**, **Magic link**, **Sign up**.
- The active tab is a raised white segment with near-black text; inactive tabs are muted text on the gray.

### Top bar items
- A 32-pixel rounded blue logo tile with a white board icon, then "FlowBoard" in regular 16-pixel text, then "Boards" as navigation.
- A 24-pixel round indigo avatar with a white initial, then "Sign out" in medium 16-pixel text.

---

## 5. Open questions and differences from the current app

These came up while reading the designs. They need a decision rather than a guess.

1. **Two button colors.** "New Board" is violet while every other primary button is blue. This may be intentional emphasis or an oversight in the design.
2. **Cards in the design are much simpler than the cards in the app.** The designs show a name only. The live app shows priority, assignee, due date, tags and an overdue marker. The design has no visual treatment for priority levels, tags, or overdue.
3. **The design has no columns named Backlog, In Progress, In Review, or Done.** It shows "To Do" and "3 columns" only.
4. **The designs include things the app does not have yet:** multiple boards ("My Boards", "Create board"), a Magic link sign-in option, "Forgot password?", a description field on cards, and a breadcrumb toolbar.
5. **Priority in the design is a dropdown** with its options not visible in the design. The app uses High, Medium and Low.
6. **No hover, pressed, disabled, error, or loading states** are shown, other than the focused input. Those would need to be designed or inferred.
7. **No dark mode** is shown.

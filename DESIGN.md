---
name: DaanaRX
description: Clinical-instrument UI for unit-level sample-medication inventory — calm neutrals, one teal, status you can read at a glance.
colors:
  teal: 'hsl(185 84% 44%)'
  teal-ink: 'hsl(185 84% 30%)'
  teal-wash: 'hsl(185 60% 94%)'
  ink: 'hsl(210 22% 14%)'
  ink-2: 'hsl(210 14% 34%)'
  ink-3: 'hsl(210 10% 46%)'
  canvas: 'hsl(210 24% 97%)'
  surface: 'hsl(0 0% 100%)'
  panel: 'hsl(208 26% 95%)'
  line: 'hsl(210 20% 88%)'
  line-strong: 'hsl(210 16% 78%)'
  ok: 'hsl(152 60% 36%)'
  ok-wash: 'hsl(152 55% 93%)'
  info: 'hsl(215 78% 46%)'
  info-wash: 'hsl(215 80% 94%)'
  warn: 'hsl(34 92% 38%)'
  warn-wash: 'hsl(38 95% 92%)'
  danger: 'hsl(4 70% 46%)'
  danger-wash: 'hsl(4 80% 95%)'
  quiet: 'hsl(210 10% 46%)'
  quiet-wash: 'hsl(210 16% 93%)'
typography:
  display:
    fontFamily: 'IBM Plex Sans, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.75rem'
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: '-0.015em'
  headline:
    fontFamily: 'IBM Plex Sans, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.375rem'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '-0.01em'
  title:
    fontFamily: 'IBM Plex Sans, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: '0'
  body:
    fontFamily: 'IBM Plex Sans, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: '0'
  label:
    fontFamily: 'IBM Plex Sans, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: '0.02em'
  code:
    fontFamily: 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace'
    fontSize: '0.8125rem'
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: '0'
rounded:
  xs: '4px'
  sm: '6px'
  md: '8px'
  lg: '12px'
  pill: '999px'
spacing:
  '1': '4px'
  '2': '8px'
  '3': '12px'
  '4': '16px'
  '5': '20px'
  '6': '24px'
  '8': '32px'
  '10': '40px'
components:
  button-primary:
    backgroundColor: '{colors.teal}'
    textColor: '{colors.surface}'
    rounded: '{rounded.sm}'
    padding: '0 14px'
    height: '36px'
  button-primary-hover:
    backgroundColor: '{colors.teal-ink}'
  button-outline:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.sm}'
    padding: '0 14px'
    height: '36px'
  button-danger:
    backgroundColor: '{colors.danger}'
    textColor: '{colors.surface}'
    rounded: '{rounded.sm}'
    height: '36px'
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.sm}'
    padding: '0 12px'
    height: '40px'
  card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.md}'
    padding: '20px'
  chip-status:
    typography: '{typography.label}'
    rounded: '{rounded.pill}'
    padding: '2px 8px'
    height: '22px'
  nav-item-active:
    backgroundColor: '{colors.teal-wash}'
    textColor: '{colors.teal-ink}'
    rounded: '{rounded.sm}'
    padding: '0 10px'
    height: '36px'
---

# Design System: DaanaRX

## Overview

**Creative North Star: "The Shelf Card"**

DaanaRX is an instrument, not a brochure. The reference object is the index card clipped to a
pharmacy shelf: white, ruled, dense with the few facts that matter (name, dose, count,
expiry, code), legible at arm's length, and never decorated. The interface borrows that
posture: content sits on a paper-white surface over a cool grey canvas, structure comes from
hairline rules rather than shadows, and colour is spent only where it carries meaning —
one teal for "this is the action", and a fixed set of status tones for "this is the state
of a unit."

The 2026 refinement keeps the Daana teal and the shadcn/Radix foundation but removes the
consumer-app costume the first build wore: glass blur, hover lift, 10 px pill corners,
hero-sized headings and decorative gradients are gone. Density goes up (14 px UI text,
40 px controls, 44 px on touch), corners tighten to 6 px, numerals become tabular so
quantities and dates align in columns, and DRX codes move to a real monospace because they
are data a volunteer reads aloud at a shelf. Dark mode is a first-class inversion of the
same rules, not a tint.

**Key Characteristics:**

- One accent (Daana teal) on ≤10 % of any screen: primary buttons, active nav, focus rings, links.
- Status is a closed vocabulary with fixed tones; nothing else may use those tones.
- Flat by default; depth only for overlays (menus, drawers, dialogs).
- Tabular numerals everywhere numbers stack; MM/DD/YYYY everywhere a date appears.
- Mobile is a first-class layout: tables collapse to rows, sheets replace dialogs, 44 px targets.

## Colors

A cool-grey neutral ramp with a single teal accent and five semantic status tones.

### Primary

- **Daana Teal** (`hsl(185 84% 44%)`): primary buttons, active nav pill background at 12 %
  wash, focus rings, the brand mark. Never used as text on white (contrast 2.6:1).
- **Teal Ink** (`hsl(185 84% 30%)`): teal where it must be read — links, active nav label,
  primary button hover, selected-tab text. 4.6:1 on white.
- **Teal Wash** (`hsl(185 60% 94%)`): active nav background, selected row highlight.

### Neutral

- **Ink** (`hsl(210 22% 14%)`): headings, body, values in tables.
- **Ink 2** (`hsl(210 14% 34%)`): secondary body copy, table cell text in dense tables.
- **Ink 3** (`hsl(210 10% 46%)`): labels, captions, placeholders (4.6:1 on white — the floor).
- **Canvas** (`hsl(210 24% 97%)`): the page background behind cards and tables.
- **Surface** (`#fff`): cards, tables, inputs, sheets.
- **Panel** (`hsl(208 26% 95%)`): the sidebar and sticky toolbars — a second, slightly cooler
  neutral so navigation reads as chrome, not content.
- **Line** (`hsl(210 20% 88%)`) / **Line Strong** (`hsl(210 16% 78%)`): borders and dividers;
  strong is for input borders and table header rules.

### Status tones (closed set)

Each tone has a text/dot colour and a wash. Text colours clear 4.5:1 on their wash and on white.

- **OK** green `hsl(152 60% 36%)` / wash `hsl(152 55% 93%)` — Active, Fulfilled, success toasts.
- **Info** blue `hsl(215 78% 46%)` / wash `hsl(215 80% 94%)` — In Cart.
- **Warn** amber `hsl(34 92% 38%)` / wash `hsl(38 95% 92%)` — Pending (approval / request), expiring ≤ 30 days.
- **Danger** red `hsl(4 70% 46%)` / wash `hsl(4 80% 95%)` — Expired, Denied, destructive actions, errors.
- **Quiet** slate `hsl(210 10% 46%)` / wash `hsl(210 16% 93%)` — Checked Out, Removed, Cancelled, request Expired.

### Named Rules

**The One Voice Rule.** Teal is the only decorative colour. If something is teal it is either
the primary action, the current location, or focus.
**The Status Monopoly Rule.** The five status tones are reserved for the status vocabulary in
`src/lib/status.ts` and for expiry urgency. Never colour a heading, icon, or card border with them.
**The Expiry Rule.** An expiry date is neutral until 30 days out (Warn) and Danger once past.
Colour is always paired with the literal date; never a colour alone.

## Typography

**UI Font:** IBM Plex Sans (with `ui-sans-serif, system-ui, sans-serif`)
**Code Font:** IBM Plex Mono (with `ui-monospace, SFMono-Regular, Menlo, monospace`) — DRX codes, lot numbers, sheet numbers.

**Character:** A single humanist-grotesk family with true tabular figures and a matching mono.
Plex is legible at 12–13 px on a phone, has a distinct 0/O and 1/l/I (a real concern when a
volunteer reads a code aloud), and looks like an instrument rather than a startup.
`font-feature-settings: "tnum" 1, "cv11" 1` is on globally; `lining-nums tabular-nums` on
every numeric column.

### Hierarchy

- **Display** (600, 1.75rem / 28px, 1.15): one per page — the page title in `PageHeader`.
- **Headline** (600, 1.375rem / 22px, 1.2): section titles inside a page, dialog titles.
- **Title** (600, 1rem / 16px, 1.35): card titles, medication name on a card, table row primary.
- **Body** (400, 0.875rem / 14px, 1.5): default UI text. Prose max 70ch.
- **Body-lg** (400, 1rem, 1.5): provider phone surfaces and form inputs on touch.
- **Label** (500, 0.75rem / 12px, 1.3, +0.02em): table headers, field labels, chip text. Sentence case — never all caps.
- **Code** (500, 0.8125rem, mono): DRX codes and identifiers, always with `tabular-nums`.

### Named Rules

**The Sentence-Case Rule.** No uppercase tracking labels anywhere. Labels are sentence case, 12 px, Ink 3.
**The Number Rule.** Anything that could be compared down a column (quantity, count, expiry, code) renders in tabular figures.

## Layout

App shell: a 240 px Panel-coloured sidebar on ≥ 768 px, a 56 px sticky top bar, and a
content column of max 1280 px with 16 / 24 / 32 px page padding at sm / md / lg. Below 768 px
the sidebar becomes a left sheet and the clinic switcher moves into the top bar.

Vertical rhythm is a 4 px base: 8 px inside groups, 16 px between related blocks, 24 px
between sections, 32 px under the page header. Tables run edge-to-edge inside their card
with 12 px cell padding (10 px in dense mode). Filter bars are one 40 px row that wraps on
mobile. Sheets on mobile take 92vh with a 12 px top radius.

Responsive behaviour is structural, not fluid: `DataTable` swaps to stacked rows under
`lg`; type sizes are fixed rems.

## Elevation & Depth

Flat by default. Surfaces are separated by the Canvas/Surface/Panel neutral layering and
1 px Line borders. Shadows exist only for things that float over content.

### Shadow Vocabulary

- **Overlay** (`0 8px 24px -8px hsl(210 22% 14% / 0.18), 0 2px 6px hsl(210 22% 14% / 0.08)`): dropdown menus, popovers, dialogs, drawers, toasts.
- **Sticky** (`0 1px 0 hsl(210 20% 88%)`): the bottom rule under sticky headers and toolbars — a rule, not a shadow.

### Named Rules

**The Flat-By-Default Rule.** Cards, tables, inputs and buttons cast no shadow at rest or on hover. Hover is a background change, not a lift.

## Shapes

Radii: 4 px (chips' inner elements, checkboxes), 6 px (buttons, inputs, nav items, small
cards), 8 px (cards, tables, dialogs), 12 px (mobile sheets, provider medication cards),
pill (status chips, badges, avatar). Borders are 1 px Line; inputs use Line Strong. No
coloured left/right borders. No glass, no gradients, no backdrop blur.

## Components

### Buttons

- **Shape:** 6 px radius; 36 px default height on desktop, 44 px `size="touch"` on phone primaries; 14 px text, 500 weight.
- **Primary:** Teal background, white text. Hover → Teal Ink. Active → scale 0.99, no shadow.
- **Outline:** Surface background, Line Strong border, Ink text. Hover → Panel background.
- **Ghost:** transparent, Ink 2 text; hover → Panel.
- **Danger:** Danger background, white text; reserved for Remove / Deny / Log out confirmations.
- **Focus:** 2 px teal ring with 2 px offset, on every variant.
- **Disabled:** 50 % opacity, no pointer. **Loading:** spinner replaces the leading icon, label stays.

### Chips (status)

- **Style:** pill, 22 px tall, 12 px 500 text, tone wash background, tone text, 6 px dot in tone colour (Expired uses an alert icon instead of a dot). `data-status` attribute always set.
- **Vocabulary:** item statuses (Active, In Cart, Pending Approval, Checked Out, Removed, Expired) and request statuses (Pending, Fulfilled, Denied, Expired, Cancelled) from `src/lib/status.ts`. No ad-hoc chips.

### Cards / Containers

- **Corner Style:** 8 px. **Background:** Surface. **Border:** 1 px Line. **Shadow:** none.
- **Internal Padding:** 20 px (16 px on phones). Card title is Title, 16 px. Cards never nest.
- **MedicationCard** (provider-safe): Title name, Body dose · form, tabular "N available", earliest expiry with the Expiry Rule tone, 12 px radius on phones. Never shows a location or code.

### Inputs / Fields

- **Style:** 40 px tall (44 px on touch), 6 px radius, Surface background, Line Strong border, 14 px text (16 px on touch to stop iOS zoom).
- **Focus:** border → Teal, 2 px teal ring at 30 % opacity, no offset.
- **Error:** border Danger, message in Danger 12 px under the field. **Disabled:** Panel background, Ink 3 text.
- **Labels:** 12 px 500 Ink 2 above the field, 6 px gap; helper text 12 px Ink 3 below.

### Tables (DataTable)

- Header row: Label type, Ink 3, Panel background, bottom rule Line Strong, sticky within its scroll container.
- Rows: 44 px, hairline Line separators, hover → Canvas. Numeric and date columns right-aligned with tabular figures; code columns in Code type.
- Under `lg` the table renders each row as a stacked card (primary line, then a 2-column key/value grid). Empty, loading (skeleton rows) and error states are built in.

### Navigation

- Sidebar: Panel background, 36 px items, 6 px radius, Ink 2 text with 18 px Lucide icons at 1.75 stroke. Active: Teal Wash background, Teal Ink text and icon. Hover: Surface. A `NavBadge` (pill, Warn tone for pending counts) sits at the trailing edge.
- Top bar: 56 px, Surface, bottom rule; brand wordmark on mobile, clinic switcher on desktop, cart / account on the right.
- Role-aware: providers see Home · Inventory · My Requests; superadmins additionally see Requests with a badge.

### Signature Component — the Expiry cell

A date in tabular figures, MM/DD/YYYY, with an inline 6 px dot in the Expiry Rule tone and
an optional "in 12 d" / "expired" suffix in Ink 3. It is the most-read cell in the product
and every surface renders it through `DateText`.

## Do's and Don'ts

### Do:

- **Do** render every date through `formatDate` / `DateText` — MM/DD/YYYY with a four-digit year.
- **Do** use `tabular-nums` on any column of numbers, dates, or codes.
- **Do** build empty states that name the next action ("No units in CARDIO yet — Check in the first one").
- **Do** keep primary actions at the bottom-right of a dialog and the bottom of a mobile sheet, full-width, 44 px.
- **Do** put the page title in `PageHeader` and nothing larger than 28 px anywhere in the app.

### Don't:

- **Don't** use backdrop blur, gradients, glass, hover-lift, or coloured side borders.
- **Don't** colour anything with a status tone unless it is a status chip or an expiry cell.
- **Don't** use uppercase tracked labels, kickers, or eyebrows.
- **Don't** show a location, bin, or DRX code on any provider-facing surface.
- **Don't** introduce a new chip, badge, or status colour outside `src/lib/status.ts`.

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Clinic volunteers on the superadmin role** (MASS Free Clinic is the pilot). They receive
  sample medication, check it in with a printed DRX label, put it in a coded bin
  (`CARDIO1`, `PSYCH2`), find it again for a patient, check it out, and keep the shelf
  accurate. Desktop at the front desk, phone at the shelf. Volunteers rotate; many are
  new, some are interns, most use the app for minutes at a time between other duties.
- **Employees (restricted users)** build a checkout cart that a superadmin approves. They
  cannot complete a checkout themselves.
- **Providers** (new, 2026): licensed clinicians such as "Karol Patel, NP". On a phone, mid
  clinic, in their own specialty. They search what is dispensable right now and submit a
  dispense request in under 30 seconds. They never touch stock, never see bins or codes,
  and never edit inventory. Providers were burned by an earlier alpha-quality rollout at
  MASS and are trust-averse; first impressions are the product.
- Secondary: clinic leadership (Kihyun) reviewing usage, and Daana staff supporting the
  clinic.

## Product Purpose

DaanaRx is a unit-level sample-medication inventory for free clinics. Every physical unit
has one record and one unique DRX code (`DRX-MASS-CARDIO-00012`), one status
(Active · In Cart · Pending Approval · Checked Out · Removed · Expired), and an
append-only transaction log. It replaces a paper log and a verbal approval loop.

Success is a shelf that matches the system: nothing expired or empty is shown as
available, every dispense has a human-attributed chain (requested by → fulfilled by),
and the fastest way to get a medication to a patient is to use the app rather than walk
to the front desk.

## Positioning

Unit-level truth with FEFO by default. Competing clinic tools count boxes; DaanaRx tracks
the specific unit the volunteer will pull (earliest expiry → earliest received → lowest
code), reserves it atomically when it is requested, and logs who authorized and who
fulfilled. The audit log is the product being sold, not instrumentation.

## Operating Context

- Free-clinic shelf with labelled bins by specialty class (CARDIO, PSYCH, GASTRO, ENDOCRINE,
  INFECT, PAINFLAM, UROL, NEURO, VITSUP…). Fridge and room-temperature locations.
- Printed 4in × 2in DRX labels with a QR code are applied at check-in.
- Clinic sessions are short and interrupt-driven. Clinic-grade Wi-Fi; a free-tier backend
  with cold starts of 10–30 s that the UI must survive gracefully.
- MASS retains dispensing records for 10 years; exports must be complete.
- Dates are a patient-safety surface: the clinic is US, and 03/07 vs 07/03 ambiguity is
  unacceptable. One format everywhere: MM/DD/YYYY.
- Roles: superadmin (full), admin, employee (cart + approval), provider (read-only +
  request). One account = one role.

## Capabilities and Constraints

- Check-in (attribute form → specialty-derived location suggestion → DRX code → label),
  inventory table with filters and item details (QR, history, quick checkout), checkout
  via cart with FEFO search, cart approval queue, reports (expiring, capacity, high-use,
  removals, edits, full transaction log), settings (locations, users, classification
  guide, capacity, account).
- Provider v1 (spec dated 2026-08-12): specialty-first home, medication-level read-only
  inventory, request modal (quantity, optional 5-digit internal patient reference — never
  PHI), My Requests, superadmin request queue with fulfill / deny (reason required) /
  return to shelf, end-of-clinic-day TTL, per-clinic feature flags all OFF by default.
  Attestation is deferred.
- Stock rules are non-negotiable: never hard-delete; every action logs; superadmin-gated
  checkout; FEFO ordering; reserved units are invisible to everyone else.
- Frontend: Next.js 16 / React 18 / TypeScript strict / Tailwind + shadcn primitives /
  Redux Toolkit for auth + cart. Talks only to the REST gateway (`NEXT_PUBLIC_API_URL`).
  Inventory types come from the vendored `@daana-health/inventory-core` and
  `@daana-health/domain-mass` packages, not re-declared.
- Terminology: "unit", "DRX code", "bin"/"location", "check in", "check out", "request",
  "fulfill", "deny", "return to shelf", "FEFO", "specialty class".
- Undecided: whether providers get a native mobile app (v1 is mobile web only).

## Brand Commitments

- Name: **DaanaRX** (product) by **Daana Health**. Wordmark uses "Daana" in ink and
  "Health" in teal; logo mark is two cupped hands under a heart.
- Brand accent: Daana teal `hsl(185 84% 44%)` (`#12B5C4`). Binding as the accent; the
  surrounding neutral system, type, and density are open to refinement.
- Voice: plain, operational, calm. Controls name their action ("Check Out", "Return to
  Shelf"), errors name the problem and the recovery. No marketing tone inside the app.

## Evidence on Hand

- Live MASS inventory (~600 items across ~30 bins) in the core `items` schema.
- MASS MVP spec (distilled in `.claude/skills/daana-engineer/references/mvp-guidelines.md`)
  and the Provider Role v1 technical spec (2026-08-12, Ansh Parikh).
- No testimonials, benchmarks, or pricing exist; do not invent them.

## Product Principles

1. **If it cannot be dispensed right now, it is not "available."** Expired, zero-quantity,
   reserved, and checked-out units never appear as stock to anyone deciding on a patient.
2. **The specific unit, not the count.** Every view that leads to an action resolves to a
   DRX code for the person pulling stock — and hides it from the person who is not.
3. **Human attribution or nothing.** "System" is only ever a labelled automated job.
4. **Faster than walking to the front desk.** Provider request and volunteer checkout are
   measured in seconds on a phone; density and scanability beat expression.
5. **Trust is cumulative.** One wrong date or phantom unit undoes a month of goodwill;
   polish and consistency are part of correctness.

## Accessibility & Inclusion

- Touch targets ≥ 44 px on phones; the app is used one-handed at a shelf.
- All text ≥ 4.5:1 contrast in light and dark. Status is never conveyed by color alone
  (label + dot/icon).
- Dates rendered with explicit four-digit years; numerals tabular so columns align for
  quick comparison.
- Keyboard-operable throughout for desktop front-desk use.

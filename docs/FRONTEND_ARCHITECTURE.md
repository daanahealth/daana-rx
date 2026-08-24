# DaanaRX frontend architecture

_Status: adopted 2026-08 with the design-foundation PR. This is the contract the page-rebuild
lanes follow. Visual rules live in `DESIGN.md`; product truth in `PRODUCT.md`._

## 1. Where we are (honest review)

**Stack.** Next.js 16 App Router, React 18, TypeScript strict, Tailwind 3 + shadcn/Radix
primitives, Redux Toolkit (auth + cart slices persisted to `localStorage` by hand), Zod +
react-hook-form for forms, jest (ts-jest, node env) for units, Playwright for e2e. Types and
FEFO/status logic come from the vendored `@daana-health/inventory-core` and
`@daana-health/domain-mass`.

**What works.**

- One REST client (`src/lib/apiClient.ts`: `apiGet/apiPost/...` + `authHeaders()`), one
  gateway URL. No direct Supabase table access from the browser (the Supabase client is only
  used for password reset).
- A real primitive layer (`src/components/ui`, 36 shadcn components) and a couple of
  well-factored features (`components/home/*`, `components/reports/*Panel`).
- Role helpers (`src/lib/roles.ts`) mirror the backend's enforcement.

**What does not.**

- **Monolithic pages.** `app/inventory/page.tsx` (787 lines), `app/checkin/page.tsx` (644),
  `components/cart/CartSidebar.tsx` (478) each mix fetching, mapping API rows, filter state,
  modals and markup. Nothing in them is reusable and every change is a merge risk.
- **Two data-fetching styles.** Some code calls `src/lib/api.ts` (typed-ish, mostly `any`);
  the newer pages hand-roll `fetch(`${API_BASE}…`, { headers: authHeaders() })` and parse
  `unknown`. There is no caching, no request de-duplication, no shared loading/error shape.
- **Formatting was scattered.** Nine local `formatDate` helpers using `toLocaleDateString()`
  — locale-dependent and the direct cause of the DD/MM vs MM/DD bug (Provider spec B3).
  Fixed in this PR: everything routes through `src/lib/format.ts`.
- **Status colours were literal Tailwind classes** in `status-chip.tsx` and copied into
  cards. Fixed: `src/lib/status.ts` is the single vocabulary.
- **Typography/tokens drifted**: `text-3xl sm:text-4xl` page titles, hover-lift cards, glass
  blur, three shadow scales. Fixed in tokens; pages inherit the new scale automatically.
- **Tests** cover one util. The composed layer now ships with smoke tests; feature hooks
  should follow.
- `src/lib/api.ts` still exposes legacy `units`/`drugs`/`lots` calls the app no longer
  reads (the app reads the core `items` schema). Leave them until the mobile app is
  migrated, but do not add to them.

## 2. Target structure

```
src/
  app/                     # routes only: thin pages that compose a feature
    inventory/page.tsx     # <AppShell><InventoryScreen /></AppShell>
  features/                # one folder per domain; the only place with business logic
    inventory/
      api.ts               # typed calls: listItems(params) → Promise<Item[]>
      hooks.ts             # useInventoryList(filters) → { rows, loading, error, refetch }
      mappers.ts           # wire → view model (readAttr, isExpired…)
      components/          # InventoryTable, InventoryFilters, ItemDetailsDrawer
      InventoryScreen.tsx  # the page body
    checkin/  checkout/  requests/  reports/  settings/  auth/
  components/
    ui/                    # shadcn primitives (generated; edit only for tokens)
    composed/              # reusable patterns built from ui/* (this PR)
    layout/                # AppShell, page chrome
  lib/                     # cross-cutting, framework-free where possible
    apiClient.ts  format.ts  status.ts  navigation.ts  roles.ts  utils.ts
  store/                   # redux: auth + cart only. No feature state here.
  hooks/                   # generic hooks (media query, toast)
  types/                   # legacy DTOs; prefer @daana-health/* types
```

Rules:

1. **Pages are ≤ 60 lines.** A page imports `AppShell` and one `*Screen`. Nothing else.
2. **Feature folders own their data.** `api.ts` is the only file that knows a URL. Hooks
   return `{ data, loading, error, refetch }` and never leak `Response`.
3. **`components/composed` is the vocabulary.** If a pattern appears on two screens
   (header, table, filter row, empty state, drawer, key/value, chip, stepper, date), it is a
   composed component, not a copy. Add new ones there with a usage comment and a smoke test.
4. **Primitives are not edited for features.** `components/ui/*` changes are token/variant
   changes reviewed against `DESIGN.md`.
5. **No `any` in new code.** API rows are typed as `Item` from `inventory-core` or a local
   `Row` type produced by a mapper.

## 3. Data-fetching convention

We standardise on **feature hooks over `apiClient`**, not on a query library — for now.

Why not react-query today: the app has ~10 list endpoints, no optimistic updates, and a
free-tier backend where the biggest win is _fewer_ requests, which our hand-rolled hooks
already control with `AbortController`. Adding a cache layer before the pages are
factored would spread two patterns instead of one. Revisit after the page lanes land
if we see duplicated polling (the request queue badge is the likely trigger).

The hook shape every feature follows:

```ts
// features/inventory/hooks.ts
export function useInventoryList(params: InventoryParams) {
  const [state, setState] = useState<Async<InventoryRow[]>>({ status: 'loading' });
  const load = useCallback(async (signal?: AbortSignal) => { … }, [params]);
  useEffect(() => { const c = new AbortController(); load(c.signal); return () => c.abort(); }, [load]);
  return { ...state, refetch: () => load() };
}
```

- `Async<T>` = `{ status: 'loading' } | { status: 'error'; message } | { status: 'success'; data: T }`.
- Errors are strings the UI can show verbatim; `DataTable` and `EmptyState` accept them.
- Mutations live next to reads (`api.ts`) and the screen calls `refetch()` after.
- Auth headers come from `authHeaders()`; never build headers by hand.

## 4. Formatting & status (single sources)

| Concern        | Source                                                                                            | Use                                                                |
| -------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Dates          | `src/lib/format.ts` → `formatDate` (MM/DD/YYYY), `formatDateTime`, `formatMonthYear`, `toISODate` | `<DateText value expiry />` in UI; the functions in exports/labels |
| Expiry urgency | `expiryTone`, `expiryHint`                                                                        | applied by `DateText` only                                         |
| Ages/counts    | `formatAge`, `formatCount`, `pluralize`                                                           | queue cards, headers                                               |
| Statuses       | `src/lib/status.ts` → `ITEM_STATUS`, `REQUEST_STATUS`, `CART_STATUS`, `TONE_CLASSES`              | `<StatusChip>`; filters list `ITEM_STATUSES`                       |
| Navigation     | `src/lib/navigation.ts` → `navItemsForRole`                                                       | `AppShell`                                                         |
| Roles          | `src/lib/roles.ts`                                                                                | gates in screens                                                   |

`toLocaleDateString` / `toLocaleString` are banned in `src/` (the only remaining call is
inside the shadcn calendar's day attribute). The date-rendering audit (spec T10) is:
`grep -rn "toLocale" src` returns nothing outside `ui/calendar.tsx`.

## 5. Composed components (import from `@/components/composed`)

| Component                                                  | Purpose                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| `PageHeader`                                               | The one page title + description + meta + actions                         |
| `DataTable<T>`                                             | Sortable, responsive (table ≥ lg, stacked rows < lg), loading/empty/error |
| `FilterBar`                                                | Search + filter controls + Clear, one row                                 |
| `StatusChip`                                               | Item / request / cart status from the vocabulary                          |
| `DateText`                                                 | MM/DD/YYYY `<time>`, optional expiry tone                                 |
| `MedicationCard`                                           | Medication-level card, provider-safe (no location/code)                   |
| `QuantityStepper`                                          | Bounded integer input with 44px targets                                   |
| `EntityDrawer`                                             | Right sheet / dialog on desktop, bottom sheet on phone, pinned footer     |
| `EmptyState`                                               | Teaching empty state with an action                                       |
| `KeyValueList`                                             | Definition list for details (2-col, 1-col, inline)                        |
| `NavBadge`                                                 | Count pill (hidden at 0, caps 99+)                                        |
| `TextField` / `SelectField` / `TextareaField` / `FieldRow` | react-hook-form field wrappers                                            |

## 6. Page migration checklist (one PR per page)

For each of `inventory`, `checkin`, `checkout`+`cart`, `reports`, `settings`, `home`, and
the new `requests`:

1. Create `src/features/<domain>/` with `api.ts` (typed calls), `mappers.ts`, `hooks.ts`.
   Move every `fetch` out of the page/components into `api.ts`.
2. Move the screen body into `<Domain>Screen.tsx`; leave `app/<route>/page.tsx` as the
   ≤ 60-line composition. Keep the route, the query params and the redux usage identical.
3. Replace ad-hoc markup with composed components in this order: `PageHeader` → `FilterBar`
   → `DataTable` → `EntityDrawer`/`KeyValueList` → `EmptyState`. Delete the page's local
   table/card/mobile-card implementations.
4. Every date through `DateText`/`formatDate`; every status through `StatusChip`; no
   literal colours; no `text-3xl`+; no `shadow-*`, `backdrop-blur`, or gradients.
5. Forms: Zod schema + `TextField`/`SelectField`. Errors name the problem and the recovery.
6. Role gating via `roles.ts` helpers; provider surfaces never render location or code.
7. Tests: a jest test for `mappers.ts` and for any non-trivial hook logic; keep the e2e
   walkthrough green; run `npm run lint`, typecheck, `npm test`, `next build`.
8. Run the pre-commit gate skill, then `daana-e2e-pr` for desktop + mobile screenshots
   in the PR body.
9. In the PR body: lines removed from the page, components reused, anything left behind.

Acceptance for the redesign as a whole: no page file over 120 lines, zero `toLocale*` in
`src/`, zero literal status colours, one `<h1>` per page from `PageHeader`.

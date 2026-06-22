---
name: daana-precommit-frontend
description: >
  Pre-commit quality gate for the DaanarRX Next.js/React frontend. Run BEFORE
  committing or pushing frontend code. Enforces: ESLint clean, TypeScript
  typecheck clean, Jest unit tests green, a react-doctor score of >=90, and a
  staged-diff best-practices review. Use when the user says "commit", "ready to
  push", "run pre-commit", "check my frontend changes", or after finishing a
  frontend feature/bugfix. Assumes the Supabase MCP is connected; will guide
  setup if it is not.
---

> 🧭 Routing / where-to-start / cross-repo work: see the **daana-engineer** skill — it decomposes the ask and delegates to the right skill.

# DaanarRX Frontend Pre-Commit Gate

This skill is the authoritative quality gate for the **DaanarRX** repo
(`/Users/rithik/Code/DaanarRX`) — a Next.js 16 / React 18 / TypeScript app that
loads the vendored `@daana-health/*` inventory packages (`domain-mass`,
`inventory-core`, `inventory-react`).

**A commit must NOT proceed unless every gate below passes.** If any gate fails,
stop, report exactly which gate failed with the raw output, and do not commit.

## 0. Preflight

1. Confirm you are in the frontend repo. The cwd or a parent must contain
   `package.json` with `"name": "daanarx"`. If not, tell the user this skill
   only applies to DaanarRX and stop.
2. Confirm dependencies are installed (`node_modules` exists). If not, run
   `npm ci`.
3. Identify staged files: `git diff --cached --name-only`. If nothing is staged,
   ask the user whether to gate the whole working tree instead, or to `git add`
   first. The gate runs against staged code by default.
4. **MCP connectivity check (Supabase).** This repo talks to Supabase
   (`cnjajswnqmzzhzoyadqa`). If staged changes touch `supabase/`, `*.sql`,
   `src/server/**`, `src/lib/**supabase**`, or anything reading/writing the DB,
   verify the Supabase MCP is reachable by calling `mcp__supabase__list_tables`.
   - If the call fails or the tool is unavailable, **pause and tell the user**:

     > The Supabase MCP isn't connected, so I can't validate schema/RLS
     > assumptions in your changes. To connect it, ensure
     > `/Users/rithik/Code/.mcp.json` contains the `supabase` server
     > (project_ref `cnjajswnqmzzhzoyadqa`) and run `/mcp` to authenticate,
     > then re-run this gate. Want me to proceed with code-only gates and skip
     > the DB validation?

   - If the staged diff does not touch DB/schema code, skip the MCP check
     silently.

## 1. Deterministic gates (must all pass)

Run the bundled runner from the repo root:

```bash
bash .claude/skills/daana-precommit-frontend/scripts/run-checks.sh
```

It executes, in order, and fails fast:

| Gate       | Command                                   | Pass criteria     |
| ---------- | ----------------------------------------- | ----------------- |
| Lint       | `npm run lint` (next lint)                | exit 0, no errors |
| Typecheck  | `tsc --noEmit -p tsconfig.typecheck.json` | exit 0            |
| Unit tests | `npm test` (jest)                         | all tests pass    |

If the runner exits non-zero, surface the failing section's output verbatim and
stop. Do not attempt to auto-`--fix` lint or edit tests just to make them pass
unless the user asks — report first.

> Note: the typecheck uses `tsconfig.typecheck.json` (app code only). `next build`
> and this config both ignore `*.test.*` / `e2e/**` — tests are type-checked by
> ts-jest, e2e by Playwright — so a blanket `tsc --noEmit` would wrongly fail on
> jest globals. If the diff touches
> `next.config.js`, route segment configs, or server components, also run
> `npm run build` to catch build-time-only errors.

## 2. react-doctor gate (>= 90 required)

This is mandatory for any change touching `.tsx`/`.jsx`, hooks, components, or
`src/app/**`. Invoke the **react-doctor** skill on the changed React surface.

1. Run the `react-doctor` skill (it is available in this environment).
2. Read its score. **The gate passes only if the score is >= 90.**
3. If < 90:
   - List every issue react-doctor flagged, grouped by severity.
   - Offer to fix them. After fixes, re-run react-doctor until the score is
     > = 90. Re-run the deterministic gates (Section 1) after any code change.
   - Do **not** commit while the score is < 90.
4. If the staged diff contains no React/JSX/hook changes (e.g. only `*.md`,
   config, or `src/utils/*.ts` pure logic), note that react-doctor is N/A for
   this diff and record the unit-test + lint + typecheck gates as the coverage.

## 3. Best-practices review of the staged diff

Review `git diff --cached` against these DaanarRX conventions. Flag violations;
block on anything in **bold**:

- **No secrets**: no Supabase service-role keys, JWTs, or `.env` values
  committed. Client code may only use `NEXT_PUBLIC_*` vars. Service-role keys
  must never appear in `src/` shipped to the browser.
- **REST client discipline**: network calls go through the REST `apiClient.ts`
  pattern using `NEXT_PUBLIC_API_URL` (gateway, port 4000). Reject new
  hard-coded service URLs or leftover GraphQL/`NEXT_PUBLIC_GRAPHQL_URL`
  references (dead since the REST migration).
- **Schema source of truth**: types/validation for inventory data should come
  from the vendored `@daana-health/domain-mass` / `inventory-core` packages,
  not re-declared inline. Flag duplicated drug/lot/unit/transaction shapes.
- **Zod validation** on all form/input boundaries (react-hook-form +
  `@hookform/resolvers`). Flag unvalidated user input reaching the API.
- No `console.log` left in committed components; no `// @ts-ignore` /
  `eslint-disable` without an explaining comment.
- Accessibility & RN-parity: interactive elements keyboard-accessible; mobile
  responsiveness preserved (this app has a strong mobile-responsiveness bar).
- Tests: new logic in `src/utils`, `src/lib`, `src/server` should have or update
  a `*.test.ts`. Flag new untested business logic.
- If DB-touching code changed and the Supabase MCP is connected, call
  `mcp__supabase__get_advisors` (security + performance) and surface any new
  warnings introduced by the change.

## 4. Verdict

Produce a short report:

```
DaanarRX pre-commit gate
  lint .............. PASS/FAIL
  typecheck ......... PASS/FAIL
  unit tests ........ PASS/FAIL (N passed)
  react-doctor ...... NN/100  (>=90 required)  | N/A
  best practices .... PASS / N findings
  supabase advisors . clean / N new warnings   | MCP not connected
```

- **All green** → tell the user the gate passed and they may commit. If they
  asked you to commit, do so now (branch first if on `main`; end the commit
  message with the Co-Authored-By trailer required by this environment).
- **Any red** → state "Commit blocked" with the failing gate(s) and the
  shortest path to green. Do not commit.

## CI & branch protection (daanahealth org)

This repo lives at `github.com/daanahealth/daana-rx` (org **daanahealth**, not the
deprecated hyphenated `daana-health`). `main` is branch-protected: direct pushes
are blocked and every change merges via pull request, which must pass the
**`build-and-test`** GitHub Actions check (lint + tsc + Jest — the deterministic subset of this gate) and be up to date with
`main`. Run this skill's full gate (incl. react-doctor >=90 +
best-practices) locally before opening the PR; CI runs react-doctor only when
the `ANTHROPIC_API_KEY` repo secret is configured.

## Installing the automatic git hook (optional, recommended)

To enforce the deterministic gates (Section 1) automatically on every
`git commit`, install the hook once:

```bash
bash .claude/skills/daana-precommit-frontend/scripts/install-hook.sh
```

The git hook runs lint + typecheck + tests and blocks the commit on failure. The
react-doctor (>=90) and best-practices gates require Claude — run this skill for
the full gate before pushing. The hook prints that reminder on success.

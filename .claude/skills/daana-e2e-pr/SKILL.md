---
name: daana-e2e-pr
description: >
  End-to-end browser test for a DaanarRX pull request: signs in with a test
  account, walks the key pages through a real browser (Playwright/Chromium) to
  verify behavior, captures labeled screenshots, and embeds them in the PR
  description. Use when the user says "e2e test the PR", "browser test this",
  "add screenshots to the PR", "verify the PR in the browser", or "screenshot
  the app for the PR". Frontend repo only (daanahealth/daana-rx). Assumes the gh
  CLI is authenticated and (optionally) the Supabase MCP for verifying/cleaning
  up test data.
---

> 🧭 Routing / where-to-start / cross-repo work: see the **daana-engineer** skill — it decomposes the ask and delegates to the right skill.

# DaanarRX E2E PR Walkthrough + Screenshots

Runs a real-browser end-to-end walkthrough of a DaanarRX PR and publishes the
screenshots into the PR body. Built on the repo's existing Playwright setup
(`e2e/playwright.config.ts`, self-provisioning throwaway clinics like the
`all-flows` spec). Frontend only — for backend changes there's no browser flow.

## 0. Preflight

1. **Repo check.** cwd/parent must be the frontend repo (`package.json` name
   `daanarx`). Otherwise stop — this skill is daana-rx only.
2. **gh auth.** `gh auth status` must be logged in (needed to read the PR and
   edit its body). If not, tell the user to run `gh auth login`.
3. **On a PR branch with an open PR.** Run `gh pr view --json number,url`. If
   there's no PR for the current branch, ask the user to open one first
   (`gh pr create`) — screenshots are published into an existing PR's body.
4. **Deps.** `node_modules` present (else `npm ci`); Chromium will be installed
   by the runner (`npx playwright install`).
5. **Pick the target** (ask if unclear):
   - **Local PR build (recommended for real PR validation)** — actually tests the
     PR's code. Build & run the app from the PR branch, then point the test at it:
     ```bash
     npm ci && npm run build && npm start &   # serves on :3000
     export E2E_FRONTEND_URL=http://localhost:3000
     ```
     The frontend still talks to the **live gateway** (`NEXT_PUBLIC_API_URL`), so
     `.env.local` needs `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
     `NEXT_PUBLIC_SUPABASE_ANON_KEY` set (anon key only).
   - **Live deployment (quick smoke)** — tests `daanahealth-rx.onrender.com`
     (which serves `main`, not the PR). Leave `E2E_FRONTEND_URL` unset.
6. **Pick the account** (ask if unclear):
   - **Self-provisioned throwaway (default, no secrets)** — the spec creates a
     fresh `e2e_walk_*@daana-test.local` clinic via `/auth/signup`. Empty clinic
     → pages show empty states (fine for layout/behavior).
   - **Existing account** — to walk a clinic with real data, export
     `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` (get them from the user; never commit).

## 1. Run the walkthrough

```bash
bash .claude/skills/daana-e2e-pr/scripts/run-walkthrough.sh
```

This installs Chromium, clears `e2e/screenshots/pr/`, and runs
`e2e/pr-walkthrough.spec.ts`, which:
- signs in (provisioned or provided account),
- asserts it actually authenticated (not bounced to `/auth/signin`),
- visits **home, inventory, check-in, checkout, reports, settings**, and for
  each asserts the page didn't render a 5xx / error boundary, then saves a
  full-page screenshot (`01-signin` … `08-settings`).

If a page hard-errors, the test fails and lists which pages — treat that as a PR
behavior regression: report it, show the failing screenshot, and do **not** claim
the PR is good. (A copy/text mismatch is logged, not failed — it won't block.)

Note the live free-tier Render cold start: the first request can take 20-60s; the
config already sets generous timeouts + one retry.

## 2. Publish screenshots into the PR description

```bash
bash .claude/skills/daana-e2e-pr/scripts/publish-pr-screenshots.sh \
  e2e/screenshots/pr "E2E Browser Walkthrough"
```

This pushes the PNGs to a dedicated `pr-screenshots/<PR#>` branch (kept out of the
PR diff) and rewrites a marker-delimited `## 🧪 E2E Browser Walkthrough` section in
the PR body with collapsible `<details>` per page. Re-running replaces that
section (idempotent), so you can run it after every push.

> Screenshots are embedded via `raw.githubusercontent.com`, which renders inline
> for **public** repos. daana-rx is public, so this works. If the repo is ever
> made private, switch to uploading the images as PR-comment attachments.

## 3. Report

Summarize:
```
E2E PR walkthrough — PR #<n>
  target ........... local :3000 (PR build) | live daanahealth-rx
  account .......... throwaway clinic | <provided email>
  pages walked ..... 6/6 rendered OK   (or: FAILED on /reports, /settings)
  screenshots ...... 8 published to PR body
```
- All pages OK → say the walkthrough passed and screenshots are in the PR.
- Any page errored → "E2E found a regression", name the page(s), point at the
  screenshot, and stop short of approving the change.

## Cleanup (throwaway test data)

Self-provisioned runs create a `E2E%` clinic + any data the walkthrough adds on
the **live** Supabase. These accumulate. Purge periodically via the same RPC the
`e2e-live` workflow uses (needs the service-role key / Supabase MCP):
`select cleanup_e2e_test_data();` — or, with the Supabase MCP connected, run that
through `mcp__supabase__execute_sql` and confirm the `E2E%` clinics are gone.

## CI

The repo's `e2e-live.yml` (manual `workflow_dispatch`) runs the broader e2e suite
against live and uploads screenshots as artifacts. This skill is the
PR-scoped, screenshots-in-the-description complement to it; it does not change
that workflow.

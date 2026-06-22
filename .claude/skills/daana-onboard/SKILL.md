---
name: daana-onboard
description: >
  Seamless onboarding for a new developer joining the DaanaRx platform. Walks a
  new dev from zero to a fully running local stack across all repos: the DaanarRX
  Next.js frontend, the DaanaRx-Backend Express/TypeScript microservices, the
  DaanaRx-Mobile Expo app, and the daana-inventory engine (the pnpm monorepo
  that publishes the @daana-health/* schema packages). Use when someone says
  "onboard me", "set up DaanaRx", "I'm new", "get me running", or "set up my dev
  environment". Connects the Supabase + Render MCPs (guiding setup if missing),
  installs dependencies, configures env files, verifies each app boots, and
  installs the pre-commit quality gates.
---

# DaanaRx New-Developer Onboarding

Goal: take a brand-new developer from a fresh machine to a **running, verified**
DaanaRx stack with the quality gates installed — with as little friction as
possible. Work through the phases in order. After each phase, confirm success
before moving on, and tell the dev what just happened in plain language.

All repos are hosted in the **`daanahealth`** GitHub org (no hyphen — the old
`daana-health` hyphenated org is deprecated). Clone them under one parent dir
(these instructions assume `/Users/rithik/Code`; adjust if the dev cloned
elsewhere — ask once and reuse the answer):

| Repo             | GitHub (clone)                              | Local path                   | What it is |
| ---------------- | ------------------------------------------- | ---------------------------- | ---------- |
| Frontend         | `github.com/daanahealth/daana-rx`           | `DaanarRX` (note double `a`)  | Next.js 16 / React 18 / TS web app |
| Backend          | `github.com/daanahealth/DaanaRx-Backend`    | `DaanaRx-Backend`            | Consolidated Express/TS monolith (one service) |
| Mobile           | `github.com/daanahealth/DaanaRx-Mobile`     | `DaanaRx-Mobile`             | React Native / Expo app |
| Inventory engine | `github.com/daanahealth/daana-inventory`    | `daana-inventory`            | pnpm monorepo → `@daana-health/*` packages |

```bash
# First-time clone (run in your chosen parent directory):
git clone https://github.com/daanahealth/daana-rx.git DaanarRX
git clone https://github.com/daanahealth/DaanaRx-Backend.git
git clone https://github.com/daanahealth/daana-inventory.git
git clone https://github.com/daanahealth/DaanaRx-Mobile.git      # only if doing mobile
```

> If a clone 404s, the dev needs to be added to the `daanahealth` org (ask an
> owner). If an existing clone still points at `daana-health` (hyphen), repoint
> it: `git remote set-url origin https://github.com/daanahealth/<repo>.git`.

## Phase 0a — Discover the platform's skills (recurse the repos)

Don't assume a fixed list of skills — **discover them** so this onboarding stays
correct as skills are added/removed (e.g. data-ingestion, mass-import, new
pre-commit gates). Recursively find every skill across the workspace and each
repo's `.claude/skills/` directory:

```bash
# All DaanaRx skills, repo-local and workspace-level (skip deps/build output).
find /Users/rithik/Code \
  -type f -name SKILL.md \
  -path '*/.claude/skills/*' \
  -not -path '*/node_modules/*' \
  -not -path '*/.next/*' -not -path '*/dist/*' -not -path '*/dist-consolidated/*' \
  2>/dev/null | sort
```

Also check user-level skills (shared across all projects):

```bash
find ~/.claude/skills -type f -name SKILL.md 2>/dev/null | sort
```

For each `SKILL.md` found, read its YAML frontmatter and record `name` +
`description` (the frontmatter is the block between the leading `---` fences).
A quick way to list them:

```bash
for f in $(find /Users/rithik/Code ~/.claude/skills -type f -name SKILL.md \
            -path '*/.claude/skills/*' -not -path '*/node_modules/*' \
            -not -path '*/.next/*' -not -path '*/dist*/*' 2>/dev/null | sort); do
  name=$(awk '/^name:/{print $2; exit}' "$f")
  echo "• ${name:-?}  —  $f"
done
```

Build a catalog and present it to the dev: skill name, one-line purpose (from
`description`), the repo it lives in, and how to invoke it (`/<name>`). Use this
catalog to drive later phases instead of hardcoded paths:

- Any skill whose directory name matches `*precommit*` (or whose description
  mentions "pre-commit") is a **quality gate** → install its hook in Phase 7 by
  running the `scripts/install-hook.sh` that sits next to its `SKILL.md`.
- Skills about data import/ingestion (e.g. `daanarx-mass-import`, the ingestion
  skill) → mention them as the path for loading clinic data; don't run them
  during onboarding.
- If you discover a skill not described in this document, surface it anyway —
  the catalog is the source of truth, this prose is just the expected baseline.

## Phase 0 — Orientation (explain the architecture first)

Before touching anything, give the dev this mental model:

- **The inventory engine is the heart.** `daana-inventory` is a generic
  inventory platform (pnpm monorepo) with three published packages:
  - `@daana-health/inventory-core` — domain-agnostic engine + data schema/logic.
  - `@daana-health/domain-mass` — the **MASS Clinic** domain pack (the first
    domain that specializes the generic engine: drugs, lots, units,
    transactions, clinic rules).
  - `@daana-health/inventory-react` — React bindings/components for the engine.
- **Frontend (`DaanarRX`)** vendors all three (`vendor/domain-mass`,
  `vendor/inventory-core`, `vendor/inventory-react`, referenced via `file:` deps)
  and renders the whole app. It talks to the backend over **REST** through
  `apiClient.ts` using `NEXT_PUBLIC_API_URL` (the gateway, port 4000).
- **Backend (`DaanaRx-Backend`)** is a **consolidated Express monolith**: a
  single app (`consolidated/index.ts`) that mounts every router DIRECTLY — no
  proxying — under the same public prefixes `/auth/*`, `/inventory/*`,
  `/transactions/*`, `/notifications`, on **port 4000**. It vendors
  `@daana-health/inventory-core` so the schema is shared with the frontend. Data
  lives in **Supabase** (`cnjajswnqmzzhzoyadqa`). Live URL:
  `https://daanahealth-gateway.onrender.com` (health `/health`, warm `/warmup`).
  - *History:* the code under `services/{auth,inventory,transaction,notification}`
    and `gateway/` is the old 5-service layout (ports 3001-3004 + a proxying
    gateway). The consolidated monolith reuses those routers but runs them in one
    process — collapsing 5 free-tier cold starts into one. Run those services
    standalone only when isolating a single service; the monolith is the default.
- **Mobile (`DaanaRx-Mobile`)** mirrors the frontend's REST client pattern; URL
  from `EXPO_PUBLIC_API_URL` (point it at the consolidated gateway). State via
  redux-persist + AsyncStorage. Note: the old `daanarx-api-gateway.onrender.com`
  URL is DEAD — use `daanahealth-gateway.onrender.com`.
- The platform **migrated from GraphQL → REST microservices → a consolidated
  REST monolith** — any GraphQL reference you see is dead. Hosting is on
  **Render** (free tier; expect a cold start; `/warmup` wakes it).

Offer to draw the architecture diagram with the `excalidraw` skill if the dev
wants a visual.

## Phase 1 — Prerequisites

Check tools are present; install/guide if missing:

```bash
node --version    # need Node 20+ (CI uses 20; backend README says 18+)
npm --version
pnpm --version    # required for daana-inventory (packageManager: pnpm@9)
git --version
```

- If `pnpm` is missing: `npm install -g pnpm@9` (or `corepack enable && corepack prepare pnpm@9.0.0 --activate`).
- Mobile also needs the Expo tooling (`npx expo`) and, for devices, the Expo Go
  app — only set this up if the dev will work on mobile.

## Phase 2 — Connect the MCP servers

The DaanaRx workflow assumes two MCP servers. Connect them now so later phases
(schema validation, deploy checks) work.

### Supabase MCP (required)

1. Check `/Users/rithik/Code/.mcp.json` contains:
   ```json
   { "mcpServers": { "supabase": {
       "type": "http",
       "url": "https://mcp.supabase.com/mcp?project_ref=cnjajswnqmzzhzoyadqa" } } }
   ```
   If missing, add it (this file already exists in the workspace root).
2. Verify connectivity by calling `mcp__supabase__list_tables`. Expect tables:
   `drugs`, `lots`, `units`, `transactions` (plus auth/clinic tables).
3. **If the call fails**, tell the dev:
   > Run `/mcp` in Claude Code and authenticate the `supabase` server in the
   > browser, then tell me to continue.
   Wait for them, then re-verify.

### Render MCP (recommended, for deploy/ops visibility)

The Render MCP lets you inspect the deployed services (gateway + 4 services +
frontend). If the dev needs deploy/ops access:

1. Check whether render tools are available (e.g. `mcp__render__list_services`).
2. If not present, guide them:
   > Add the Render MCP server to your Claude Code config and run `/mcp` to
   > authenticate with a Render API key (Render dashboard → Account Settings →
   > API Keys). Then I can show you the live services.
3. Once connected, `mcp__render__list_services` should show the gateway, auth,
   inventory, transaction, notification, and frontend services.

If the dev is frontend-only and won't touch ops, the Render MCP is optional —
say so and continue.

## Phase 3 — Build the inventory engine (do this FIRST)

Everything depends on the `@daana-health/*` packages. The frontend/backend use
**vendored** copies under `vendor/`, but a dev modifying the engine works in
`daana-inventory`:

```bash
cd /Users/rithik/Code/daana-inventory
pnpm install
pnpm build        # builds all packages
pnpm typecheck    # strict TS across the monorepo
pnpm test         # engine tests
```

Explain: when the engine changes, the built output is vendored into
`DaanarRX/vendor/*` and `DaanaRx-Backend/vendor/inventory-core`. If the dev only
consumes the engine (doesn't change it), the vendored copies already in the
frontend/backend repos are enough — they can skip building the engine.

## Phase 4 — Backend up

```bash
cd /Users/rithik/Code/DaanaRx-Backend
npm install --include=dev          # matches CI
cp .env.example .env               # then fill in values (see below)
npm run build:consolidated         # typecheck + build the consolidated monolith (CI gate)
npm run test:engine                # inventory-core unit tests
```

Env vars the dev must fill in `.env` (get secrets from the team — never commit):
- `SUPABASE_URL` = `https://cnjajswnqmzzhzoyadqa.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (from Supabase dashboard / team)
- `JWT_SECRET` (team-shared, or `openssl rand -base64 32` for local-only)
- `PORT` (gateway default 4000), `ALLOWED_ORIGINS` (e.g. `http://localhost:3000`)

Run the backend — the **consolidated monolith is the default**:
```bash
npm run build:consolidated       # tsc → dist-consolidated/
npm run start:consolidated       # single Express app on PORT (4000)
```
All routes are served by this one process under `/auth/*`, `/inventory/*`,
`/transactions/*`, `/notifications`. Only drop into a single service when
isolating it:
```bash
cd services/auth && npm install && npm run dev    # standalone, port 3001 (rarely needed)
```

**Verify:** `curl http://localhost:4000/health` returns OK, and `/warmup` wakes
a sleeping instance. Note the free-tier cold-start gotcha if pointing at the
deployed gateway (`https://daanahealth-gateway.onrender.com`).

## Phase 5 — Frontend up

```bash
cd /Users/rithik/Code/DaanarRX
npm ci
cp env-example.txt .env.local      # then edit
node scripts/verify-setup.js       # built-in setup checker
npm run dev                        # http://localhost:3000
```

Critical env values in `.env.local`:
- `NEXT_PUBLIC_API_URL=http://localhost:4000`  ← the **gateway**, not 3000.
  (A known footgun: it sometimes reads `localhost:3000` or still has a dead
  `NEXT_PUBLIC_GRAPHQL_URL` — fix both.)
- `NEXT_PUBLIC_SUPABASE_URL=https://cnjajswnqmzzhzoyadqa.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...` (anon key only — never the service role).

**Verify:** open `http://localhost:3000`, confirm it loads and can reach the
backend (log in / list inventory). Source map of the app: `src/app` (routes),
`src/components`, `src/hooks`, `src/lib`, `src/server`, `src/store` (redux),
`src/types`, `src/utils`.

## Phase 6 — Mobile up (only if the dev works on mobile)

```bash
cd /Users/rithik/Code/DaanaRx-Mobile
npm install
# set EXPO_PUBLIC_API_URL=http://<your-LAN-ip>:4000 in the Expo env
npx expo start
```
Scan the QR with Expo Go, or run an emulator. Same REST client pattern as web.

## Phase 7 — Install the quality gates (pre-commit)

Wire up the pre-commit skills so the dev's first commit is already protected.
Use the catalog from **Phase 0a** — install the hook for every discovered
pre-commit skill rather than a hardcoded list:

```bash
# Install the git hook for each discovered pre-commit gate.
find /Users/rithik/Code -type f -name install-hook.sh \
  -path '*/.claude/skills/*precommit*/scripts/*' \
  -not -path '*/node_modules/*' 2>/dev/null | while read -r installer; do
    echo "→ installing hook from $installer"
    bash "$installer"
done
```

At the time of writing this resolves to (verify against your Phase 0a catalog):
- `DaanarRX/.claude/skills/daana-precommit-frontend` — ESLint + typecheck +
  Jest + react-doctor (>=90) + best-practices.
- `DaanaRx-Backend/.claude/skills/daana-precommit-backend` — consolidated
  typecheck + engine tests + lint + best-practices.

If Phase 0a surfaced a pre-commit skill not listed here, install it too.

Explain the two-layer model:
- The **git hook** auto-runs the fast deterministic checks on every
  `git commit` and blocks on failure.
- Before pushing, run the full **Claude skill** for the repo
  (`daana-precommit-frontend` / `daana-precommit-backend`) — that adds the
  react-doctor >=90 gate (frontend) and the best-practices + Supabase-advisor
  review that a plain shell hook can't do.

Also explain the **server-side** enforcement (this is what actually guarantees
the workflow, since local hooks can be bypassed with `--no-verify`):
- `main` is **branch-protected** on both `daanahealth/daana-rx` and
  `daanahealth/DaanaRx-Backend`: direct pushes are blocked — all changes land via
  pull request. The pre-push hook (Phase 7) gives the same feedback locally.
- Each PR must pass the **`build-and-test`** GitHub Actions check (lint +
  typecheck + tests, mirroring the local gate) and be up to date with `main`
  before it can merge.
- Workflow: branch → commit (pre-commit gate runs) → run the repo's
  pre-commit skill → push branch → open PR → CI green → merge.

## Phase 8 — First-commit dry run & wrap-up

1. Have the dev make a trivial change and run the relevant pre-commit skill to
   see the gate in action (and confirm it passes before they ever push).
2. Summarize what's running, the ports (4000 consolidated backend / 3000 web;
   3001-3004 only if running services standalone), where the schema lives
   (`@daana-health/*`), and where to ask for secrets.
3. Point them at the repo READMEs and `/Users/rithik/Code/.claude/session-progress.md`
   for current project state and known issues.

## Onboarding checklist (track and report at the end)

- [ ] Architecture explained
- [ ] Prereqs present (Node 20+, pnpm 9, git; Expo if mobile)
- [ ] Supabase MCP connected & verified
- [ ] Render MCP connected (or consciously skipped)
- [ ] Inventory engine builds + tests green (or consuming vendored copies)
- [ ] Backend installs, typechecks, engine tests pass, `.env` filled
- [ ] Frontend installs, `.env.local` correct (gateway URL!), `npm run dev` loads
- [ ] Mobile running (or skipped)
- [ ] Pre-commit hooks installed (frontend + backend)
- [ ] First-commit dry run passed

Report the checklist with each item marked done/skipped/blocked, and list any
secret the dev still needs from the team.

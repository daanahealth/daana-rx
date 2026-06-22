#!/usr/bin/env bash
# Deterministic pre-commit gate for the DaanarRX frontend.
# Runs: ESLint -> TypeScript typecheck -> Jest unit tests. Fails fast.
# react-doctor (>=90) and the best-practices review are Claude-driven; run the
# `daana-precommit-frontend` skill for the full gate.
set -uo pipefail

# Resolve repo root (the dir containing package.json with name "daanarx").
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
cd "$ROOT" || { echo "❌ Cannot cd to repo root ($ROOT)"; exit 1; }

if ! grep -q '"name": "daanarx"' package.json 2>/dev/null; then
  echo "❌ This does not look like the DaanarRX repo (package.json name != daanarx)."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "📦 node_modules missing — running npm ci..."
  npm ci || { echo "❌ npm ci failed"; exit 1; }
fi

fail=0
section() { printf "\n\033[1m=== %s ===\033[0m\n" "$1"; }

section "1/3 ESLint (next lint)"
if npm run lint; then echo "✅ lint clean"; else echo "❌ lint failed"; fail=1; fi

section "2/3 TypeScript typecheck (tsc --noEmit)"
if npx --no-install tsc --noEmit; then echo "✅ typecheck clean"; else echo "❌ typecheck failed"; fail=1; fi

section "3/3 Jest unit tests"
if npm test --silent; then echo "✅ unit tests passed"; else echo "❌ unit tests failed"; fail=1; fi

echo
if [ "$fail" -ne 0 ]; then
  echo "❌ DaanarRX deterministic gate FAILED — commit should be blocked."
  exit 1
fi
echo "✅ DaanarRX deterministic gate passed (lint + typecheck + tests)."
echo "ℹ️  Run the 'daana-precommit-frontend' skill for the react-doctor (>=90) + best-practices gate before pushing."
exit 0

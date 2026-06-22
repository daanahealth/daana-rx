#!/usr/bin/env bash
# Installs a git pre-commit hook for DaanarRX that runs the deterministic gate
# (lint + typecheck + unit tests) on every commit. Idempotent.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
HOOK_DIR="$ROOT/.git/hooks"

if [ ! -d "$ROOT/.git" ]; then
  echo "❌ $ROOT is not a git repository — cannot install hook."
  exit 1
fi

mkdir -p "$HOOK_DIR"
HOOK="$HOOK_DIR/pre-commit"

if [ -f "$HOOK" ] && ! grep -q "daana-precommit-frontend" "$HOOK"; then
  cp "$HOOK" "$HOOK.backup.$(date +%s 2>/dev/null || echo bak)" 2>/dev/null || true
  echo "ℹ️  Backed up existing pre-commit hook."
fi

cat > "$HOOK" <<'HOOK_EOF'
#!/usr/bin/env bash
# DaanarRX pre-commit hook (managed by daana-precommit-frontend skill).
# Runs the deterministic gate. To skip in an emergency: git commit --no-verify
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel)"
RUNNER="$ROOT/.claude/skills/daana-precommit-frontend/scripts/run-checks.sh"
if [ ! -f "$RUNNER" ]; then
  echo "⚠️  daana-precommit-frontend runner missing; skipping gate."
  exit 0
fi
bash "$RUNNER"
status=$?
if [ "$status" -ne 0 ]; then
  echo
  echo "❌ Commit blocked by DaanarRX pre-commit gate."
  echo "   Fix the issues above, or run 'git commit --no-verify' to bypass (not recommended)."
fi
exit "$status"
HOOK_EOF

chmod +x "$HOOK"
echo "✅ Installed DaanarRX pre-commit hook at $HOOK"
echo "ℹ️  It runs lint + typecheck + tests. Run the 'daana-precommit-frontend' skill"
echo "   for the full gate (react-doctor >=90 + best-practices review) before pushing."

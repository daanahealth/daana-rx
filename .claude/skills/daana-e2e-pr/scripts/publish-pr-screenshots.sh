#!/usr/bin/env bash
# Publish e2e screenshots into the current PR's description.
#
# How it works (PR bodies can't host binary uploads via the API, so):
#   1. Pushes the PNGs to a dedicated images branch  pr-screenshots/<PR#>
#      (kept out of the PR diff — it's a separate, orphan-style branch).
#   2. Embeds them in the PR body via raw.githubusercontent URLs, inside
#      <!-- daana-e2e-screenshots --> markers so re-runs replace, not duplicate.
#
# Usage: publish-pr-screenshots.sh [screenshots_dir] [section_title]
#   defaults: e2e/screenshots/pr   "E2E Browser Walkthrough"
set -euo pipefail

SHOTS_DIR="${1:-e2e/screenshots/pr}"
TITLE="${2:-E2E Browser Walkthrough}"

command -v gh >/dev/null || { echo "❌ gh CLI required"; exit 1; }
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
PR="$(gh pr view --json number -q .number 2>/dev/null || true)"
if [ -z "${PR:-}" ]; then
  echo "❌ No open PR for branch '$BRANCH'. Open one (gh pr create) then re-run."; exit 1
fi

shopt -s nullglob
PNGS=("$SHOTS_DIR"/*.png)
[ ${#PNGS[@]} -gt 0 ] || { echo "❌ No screenshots in $SHOTS_DIR"; exit 1; }

IMG_BRANCH="pr-screenshots/${PR}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="screenshots/pr-${PR}/${STAMP}"
REMOTE_URL="$(git remote get-url origin)"

WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
if git ls-remote --exit-code --heads "$REMOTE_URL" "$IMG_BRANCH" >/dev/null 2>&1; then
  git clone --quiet --depth 1 --branch "$IMG_BRANCH" --single-branch "$REMOTE_URL" "$WORK"
else
  git clone --quiet --depth 1 "$REMOTE_URL" "$WORK"
  git -C "$WORK" checkout --quiet --orphan "$IMG_BRANCH"
  git -C "$WORK" rm -rqf . >/dev/null 2>&1 || true
fi

mkdir -p "$WORK/$DEST"
cp "${PNGS[@]}" "$WORK/$DEST/"
git -C "$WORK" add "$DEST"
git -C "$WORK" -c user.name="daana-e2e-bot" -c user.email="e2e@daanahealth.com" \
  commit -q -m "e2e screenshots for PR #$PR ($STAMP)"
git -C "$WORK" push -q origin "$IMG_BRANCH"
echo "✅ Pushed ${#PNGS[@]} screenshot(s) to $IMG_BRANCH/$DEST"

BASE="https://raw.githubusercontent.com/${REPO}/refs/heads/${IMG_BRANCH}/${DEST}"
SECTION="$WORK/section.md"
{
  echo "<!-- daana-e2e-screenshots:start -->"
  echo ""
  echo "## 🧪 ${TITLE}"
  echo ""
  echo "_Automated browser walkthrough captured ${STAMP} by the \`daana-e2e-pr\` skill._"
  echo ""
  for f in "${PNGS[@]}"; do
    name="$(basename "$f")"
    label="$(basename "$f" .png | sed -E 's/^[0-9]+-//; s/[-_]/ /g')"
    echo "<details><summary>📸 ${label}</summary>"
    echo ""
    echo "<img src=\"${BASE}/${name}\" width=\"900\" alt=\"${label}\" />"
    echo ""
    echo "</details>"
    echo ""
  done
  echo "<!-- daana-e2e-screenshots:end -->"
} > "$SECTION"

python3 - "$PR" "$SECTION" <<'PY'
import subprocess, sys, re
pr, section_file = sys.argv[1], sys.argv[2]
section = open(section_file).read().strip()
body = subprocess.check_output(["gh","pr","view",pr,"--json","body","-q",".body"]).decode()
body = re.sub(r"<!-- daana-e2e-screenshots:start -->.*?<!-- daana-e2e-screenshots:end -->",
              "", body, flags=re.S).rstrip()
new = (body.rstrip() + "\n\n" + section + "\n").lstrip("\n")
subprocess.run(["gh","pr","edit",pr,"--body",new], check=True)
print(f"✅ Updated PR #{pr} body ({section.count('<img ')} image(s) embedded)")
PY

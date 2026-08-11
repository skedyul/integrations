#!/usr/bin/env bash
# Cloud Agent install script for the Skedyul Integrations repo.
#
# Each integration under integrations/<name>/ is an independent pnpm project
# that pins the `skedyul` SDK to an exact npm version in its package.json.
# The committed pnpm-lock.yaml files are stale monorepo-era lockfiles (they
# reference `skedyul: workspace:*`), and a couple of integrations ship no
# lockfile at all, so a plain (non-frozen) `pnpm install` is used to resolve
# each integration against the npm registry.
#
# The script installs every integration independently and keeps going if one
# fails. Failures in KNOWN_BROKEN integrations are tolerated (they have
# pre-existing dependency problems unrelated to the environment); any other
# failure makes the whole install fail so real regressions are not hidden.

set -uo pipefail

# Integrations with pre-existing dependency issues that cannot install:
#   - meta: package.json pins skedyul@1.5.14, which is not published to npm.
KNOWN_BROKEN=("meta")

is_known_broken() {
  local name="$1"
  local broken
  for broken in "${KNOWN_BROKEN[@]}"; do
    [ "$name" = "$broken" ] && return 0
  done
  return 1
}

# Ensure pnpm is available (the repo's integrations are pnpm projects).
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found; enabling via corepack..."
  corepack enable >/dev/null 2>&1 || true
  corepack prepare pnpm@10.33.3 --activate >/dev/null 2>&1 \
    || npm install -g pnpm@10.33.3
fi

echo "Using pnpm $(pnpm --version) and node $(node --version)"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INTEGRATIONS_DIR="$ROOT_DIR/integrations"
cd "$INTEGRATIONS_DIR"

installed=()
skipped_broken=()
fatal_failures=()

for dir in */; do
  name="${dir%/}"
  [ -f "$name/package.json" ] || continue

  echo ""
  echo "=== Installing dependencies for '$name' ==="
  if (cd "$name" && pnpm install); then
    installed+=("$name")
    continue
  fi

  if is_known_broken "$name"; then
    echo "WARNING: '$name' failed to install (known pre-existing issue) — skipping."
    skipped_broken+=("$name")
  else
    echo "ERROR: dependency install failed for '$name'."
    fatal_failures+=("$name")
  fi
done

echo ""
echo "==================== Install summary ===================="
echo "Installed:      ${installed[*]:-none}"
echo "Skipped/broken: ${skipped_broken[*]:-none}"
if [ ${#fatal_failures[@]} -gt 0 ]; then
  echo "Failed:         ${fatal_failures[*]}"
  echo "========================================================="
  echo "Install failed for one or more integrations."
  exit 1
fi
echo "========================================================="
echo "Install complete."

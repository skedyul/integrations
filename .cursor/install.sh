#!/usr/bin/env bash
# Cloud Agent install script for the Skedyul Integrations repository.
#
# Each integration under integrations/<name> is an independent pnpm package that
# depends on the published `skedyul` SDK from npm. The committed lockfiles were
# generated inside a larger monorepo where `skedyul` resolves to a local
# `workspace:*` package, so a standalone frozen install cannot reproduce them.
# We therefore run a plain `pnpm install` per package, which resolves `skedyul`
# (and everything else) from the npm registry.
#
# The script is idempotent and never aborts the whole environment because a
# single package fails to install; any failures are collected and reported at
# the end so the remaining integrations stay usable.

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INTEGRATIONS_DIR="$ROOT_DIR/integrations"

# Ensure pnpm is available (falls back to Corepack if it is not already on PATH).
if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable >/dev/null 2>&1 || true
    corepack prepare pnpm@10 --activate >/dev/null 2>&1 || true
  fi
fi

echo "Using node $(node --version) and pnpm $(pnpm --version)"

failed=()
succeeded=()

for pkg_json in "$INTEGRATIONS_DIR"/*/package.json; do
  [ -e "$pkg_json" ] || continue
  dir="$(dirname "$pkg_json")"
  name="$(basename "$dir")"
  echo ""
  echo "==================== installing: $name ===================="
  if (cd "$dir" && pnpm install --no-frozen-lockfile); then
    succeeded+=("$name")
  else
    echo "!! dependency install failed for '$name' (see output above)"
    failed+=("$name")
  fi
done

echo ""
echo "==================== install summary ===================="
echo "installed: ${succeeded[*]:-none}"
if [ "${#failed[@]}" -gt 0 ]; then
  echo "FAILED:    ${failed[*]}"
  echo ""
  echo "Note: some integrations pin dependency versions that are no longer"
  echo "resolvable standalone (for example an unpublished 'skedyul' release)."
  echo "These are pre-existing repository issues; the remaining integrations are"
  echo "fully set up and usable."
fi

# Exit 0 so a single broken package does not block the whole environment.
exit 0

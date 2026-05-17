#!/usr/bin/env bash
set -euo pipefail
root="${1:-$(pwd)}"
cd "$root"

mkdir -p oal_legacy

touch .gitignore
if ! grep -qxF "oal_legacy/" .gitignore; then
  printf '
# Olympus temporary legacy reference snapshot
oal_legacy/
' >> .gitignore
fi

rsync -a ./ oal_legacy/   --exclude '.git/'   --exclude 'node_modules/'   --exclude 'dist/'   --exclude 'build/'   --exclude 'coverage/'   --exclude '.turbo/'   --exclude '.next/'   --exclude 'oal_legacy/'   --exclude 'plans/olympus/local-discovery/'

printf 'Created gitignored OAL legacy snapshot at %s/oal_legacy
' "$root"

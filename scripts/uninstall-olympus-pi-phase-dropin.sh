#!/usr/bin/env bash
set -euo pipefail
root="${1:-$(pwd)}"

rm -rf "$root/.pi/prompts/olympus-phase.md" "$root/.pi/skills/olympus-implementation"
rm -f "$root/PI-START.txt" "$root/OLYMPUS-BOOTSTRAP-README.md"

cat <<EOF
Removed temporary Pi phase prompt/skill files from $root.

Not removed:
- olympus-impl/   (authoritative implementation state)
- oal_legacy/     (gitignored legacy reference snapshot)
- .gitignore entry for oal_legacy/
EOF

#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dropin_root="$(cd "$script_dir/.." && pwd)"
target="${1:-$(pwd)}"

if [ ! -d "$target" ]; then
  echo "target directory does not exist: $target" >&2
  exit 1
fi

# If run from the extracted ZIP without a target, refuse so it does not install into Downloads.
if [ "$target" = "$dropin_root" ] && [ ! -d "$target/.git" ]; then
  cat >&2 <<EOF
Refusing to install into the extracted drop-in folder:
$target

Pass the OAL repository root explicitly, for example:
$0 /Users/krystian/CodeProjects/xsyetopz/OpenAgentLayer
EOF
  exit 1
fi

required=(
  ".pi/settings.json"
  ".pi/prompts/olympus-phase.md"
  ".pi/skills/olympus-implementation/SKILL.md"
  "olympus-impl/00_AUTHORITY.md"
  "olympus-impl/session-prompts/phase-00.txt"
  "olympus-impl/session-prompts/phase-01.txt"
)

for f in "${required[@]}"; do
  if [ ! -f "$dropin_root/$f" ]; then
    echo "missing required drop-in file: $f" >&2
    exit 1
  fi
done

mkdir -p "$target/.pi" "$target/olympus-impl" "$target/scripts"
rsync -a "$dropin_root/.pi/" "$target/.pi/"
rsync -a "$dropin_root/olympus-impl/" "$target/olympus-impl/"
rsync -a "$dropin_root/scripts/" "$target/scripts/"
cp "$dropin_root/PI-START.txt" "$target/PI-START.txt"
cp "$dropin_root/README.md" "$target/OLYMPUS-BOOTSTRAP-README.md"
[ -f "$dropin_root/ATTRIBUTIONS.md" ] && cp "$dropin_root/ATTRIBUTIONS.md" "$target/ATTRIBUTIONS.md" || true

mkdir -p "$target/olympus-impl/logs" "$target/olympus-impl/state" "$target/olympus-impl/studies" "$target/olympus-impl/design" "$target/olympus-impl/classification" "${target}/plans/olympus"

# Ensure the legacy snapshot directory is ignored before it is created.
touch "$target/.gitignore"
if ! grep -qxF "oal_legacy/" "$target/.gitignore"; then
  printf '
# Olympus temporary legacy reference snapshot
oal_legacy/
' >> "$target/.gitignore"
fi

printf 'Olympus Pi phase drop-in installed at %s
' "$target"
printf 'Open Pi from that repo and run: /olympus-phase 00
'
printf 'Implementation starts only after phases 00 and 01 complete.
'

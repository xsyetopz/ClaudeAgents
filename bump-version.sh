#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: ./bump-version.sh <version> [--dry-run]

Updates root and workspace package metadata.
USAGE
}

if [[ $# -lt 1 ]]; then
  usage
  exit 2
fi

next="$1"
dry_run="false"
if [[ "${2:-}" == "--dry-run" ]]; then
  dry_run="true"
elif [[ $# -gt 1 ]]; then
  usage
  exit 2
fi

if [[ ! "$next" =~ ^[0-9]+\.[0-9]+\.[0-9]+([-+][0-9A-Za-z.-]+)?$ ]]; then
  echo "Invalid semver: $next" >&2
  exit 2
fi

node --input-type=module <<'NODE' "$next" "$dry_run"
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [next, dryRun] = process.argv.slice(2);
const paths = [
  "package.json",
  ...readdirSync("packages")
    .map((name) => join("packages", name, "package.json"))
    .sort(),
];

for (const path of paths) {
  const data = JSON.parse(readFileSync(path, "utf8"));
  data.version = next;
  const rendered = `${JSON.stringify(data, null, "\t")}\n`;
  if (dryRun === "true") {
    console.log(`[dry-run] ${path} -> ${next}`);
  } else {
    writeFileSync(path, rendered);
    console.log(`${path} -> ${next}`);
  }
}
NODE

#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp_root="$(mktemp -d "${TMPDIR:-/tmp}/olympi-ci-smoke.XXXXXX")"
cleanup() {
  rm -rf "$tmp_root"
}
trap cleanup EXIT

mkdir -p \
  "$tmp_root/home" \
  "$tmp_root/xdg-config" \
  "$tmp_root/xdg-cache" \
  "$tmp_root/xdg-data" \
  "$tmp_root/xdg-state" \
  "$tmp_root/bun-source-install" \
  "$tmp_root/bun-link-install" \
  "$tmp_root/bun-global-install" \
  "$tmp_root/link-project" \
  "$tmp_root/global-project"

export HOME="$tmp_root/home"
export XDG_CONFIG_HOME="$tmp_root/xdg-config"
export XDG_CACHE_HOME="$tmp_root/xdg-cache"
export XDG_DATA_HOME="$tmp_root/xdg-data"
export XDG_STATE_HOME="$tmp_root/xdg-state"
base_path="$PATH"
export BUN_INSTALL="$tmp_root/bun-source-install"
export PATH="$BUN_INSTALL/bin:$base_path"

REPO_ROOT="$repo_root" bun --eval '
import path from "node:path";

const repoRoot = process.env.REPO_ROOT;
if (!repoRoot) throw new Error("REPO_ROOT is required");

const lifecycleScripts = new Set([
  "preinstall",
  "install",
  "postinstall",
  "prepublish",
  "preprepare",
  "prepare",
  "postprepare",
  "prepack",
  "postpack",
  "prepublishOnly",
]);
const generatedOutputSegments = new Set([
  "dist",
  "build",
  "out",
  "generated",
  ".generated",
]);

const manifestPaths = ["package.json"];
for (const entry of await Array.fromAsync(new Bun.Glob("packages/*/package.json").scan({ cwd: repoRoot }))) {
  manifestPaths.push(entry);
}

const violations = [];
for (const manifestPath of manifestPaths.toSorted()) {
  const absoluteManifestPath = path.join(repoRoot, manifestPath);
  const manifest = await Bun.file(absoluteManifestPath).json();
  for (const scriptName of Object.keys(manifest.scripts ?? {})) {
    if (lifecycleScripts.has(scriptName)) {
      violations.push(`${manifestPath}: lifecycle script "${scriptName}" is incompatible with the --ignore-scripts smoke contract`);
    }
  }

  const bins = typeof manifest.bin === "string"
    ? { [manifest.name ?? manifestPath]: manifest.bin }
    : (manifest.bin ?? {});
  for (const [binName, binTarget] of Object.entries(bins)) {
    const normalizedTarget = String(binTarget).replaceAll("\\\\", "/");
    const targetSegments = normalizedTarget.split("/").filter(Boolean);
    if (targetSegments.some((segment) => generatedOutputSegments.has(segment))) {
      violations.push(`${manifestPath}: bin "${binName}" targets generated output (${binTarget}); update the smoke command/docs before requiring build artifacts`);
    }
    const absoluteBinPath = path.resolve(path.dirname(absoluteManifestPath), String(binTarget));
    if (!(await Bun.file(absoluteBinPath).exists())) {
      violations.push(`${manifestPath}: bin "${binName}" target does not exist before install (${binTarget})`);
    }
  }
}

if (violations.length > 0) {
  console.error("CI smoke install contract failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}
'

bun "$repo_root/packages/cli/src/cli.ts" --help >"$tmp_root/source-help.txt"
bun run --cwd "$repo_root" olympi -- help all >"$tmp_root/documented-help.txt"

export BUN_INSTALL="$tmp_root/bun-link-install"
export PATH="$BUN_INSTALL/bin:$base_path"
(
  cd "$repo_root"
  bun link >"$tmp_root/link.log" 2>&1
)
(
  cd "$tmp_root/link-project"
  olympi --help >"$tmp_root/link-help.txt"
)

export BUN_INSTALL="$tmp_root/bun-global-install"
export PATH="$BUN_INSTALL/bin:$base_path"
(
  cd "$repo_root"
  bun install -g "$PWD" --production --ignore-scripts >"$tmp_root/global-install.log" 2>&1
)
(
  cd "$tmp_root/global-project"
  olympi --help >"$tmp_root/global-help.txt"
  olympi help all >"$tmp_root/global-help-all.txt"
)

test ! -e "$tmp_root/home/.pi"
test ! -e "$tmp_root/link-project/.pi"
test ! -e "$tmp_root/global-project/.pi"
grep -q "package" "$tmp_root/source-help.txt"
grep -q "olympi verify \[--json\]" "$tmp_root/documented-help.txt"
grep -q "interactive" "$tmp_root/link-help.txt"
grep -q "verify" "$tmp_root/global-help.txt"

# Phase 00 Classification — Configs and Verification Surfaces

Classification values are from `olympus-impl/00_AUTHORITY.md`.

## Root config files

| Path | Classification | Rationale |
| --- | --- | --- |
| `.editorconfig` | KEEP_AS_IS | General editor newline/charset/indent discipline; useful for Olympus |
| `.gitignore` | ADAPT_FOR_OLYMPUS | Already includes `oal_legacy/`; keep build/cache ignores and add Olympus outputs when designed |
| `.gitmodules` | ADAPT_FOR_OLYMPUS | Declares third-party reference submodules; preserve until third-party policy is replaced |
| `.pi/settings.json` | ADAPT_FOR_OLYMPUS | Temporary Pi controller settings; may inform Olympus Pi-first behavior |
| `biome.jsonc` | KEEP_AS_IS | Existing lint/format rules and exclusions should remain through early Olympus work |
| `bun.lock` | KEEP_AS_IS | Dependency lockfile; only update as package graph changes require |
| `bunfig.toml` | KEEP_AS_IS | Bun isolated linker config, not OAL-specific product logic |
| `package.json` | ADAPT_FOR_OLYMPUS | Workspace and scripts are active package config; adapt scripts/packages in implementation phases |
| `source/product.json` | REAUTHOR_FOR_OLYMPUS | OAL product identity/version/prompt contracts; keep as reference until Olympus source exists |
| `tsconfig.base.json` | KEEP_AS_IS | Strict TS configuration is useful and should not be stripped |
| `tsconfig.json` | KEEP_AS_IS | Workspace include config is useful; adapt includes only if package layout changes |
| `upstream-sources.lock.json` | UNKNOWN_PROTECT | Upstream/source lock evidence; keep until upstream import policy is designed |

## Package config files

| Pattern/path | Classification | Rationale |
| --- | --- | --- |
| `packages/*/package.json` | ADAPT_FOR_OLYMPUS | Package metadata and exports should change only with a documented package plan |
| `packages/cli/package.json` | REAUTHOR_FOR_OLYMPUS | Binary is currently `oal`; Olympus CLI contract must choose names/entrypoints |
| `packages/runtime/package.json` | ADAPT_FOR_OLYMPUS | Runtime package may remain useful if Olympus has hooks/runtime helpers |
| `packages/olympus/` | UNKNOWN_PROTECT | Empty placeholder, no package config yet; phase-01 must define whether to use it |

## CI and release configs

| Path | Classification | Rationale |
| --- | --- | --- |
| `.github/workflows/ci.yml` | ADAPT_FOR_OLYMPUS | Quality/dry-run/release gates are valuable, but commands and cask submission are OAL-specific |
| `homebrew/Casks/openagentlayer.rb` | REAUTHOR_FOR_OLYMPUS | Packaging pattern useful; product name/version/archive path must change for Olympus |
| `.claude-plugin/marketplace.json` | MOVE_TO_LEGACY_ONLY | OAL Claude plugin marketplace metadata; keep until Olympus plugin metadata exists |
| `plugins/claude/openagentlayer/.claude-plugin/plugin.json` | REAUTHOR_FOR_OLYMPUS | Provider plugin metadata tied to OAL identity |
| `plugins/codex/openagentlayer/.codex-plugin/plugin.json` | REAUTHOR_FOR_OLYMPUS | Provider plugin metadata tied to OAL identity |
| `plugins/opencode/openagentlayer/package.json` | REAUTHOR_FOR_OLYMPUS | Provider plugin metadata tied to OAL identity |

## Build/test/lint scripts and generated policy

| Path | Classification | Rationale |
| --- | --- | --- |
| `bump-version.sh` | ADAPT_FOR_OLYMPUS | Strong release consistency guard; reauthor path list/product names |
| `scripts/sync-gitleaks-rules.mjs` | ADAPT_FOR_OLYMPUS | Security-rule sync is useful if Olympus keeps secret guard behavior |
| `patches/gitleaks-toml.patch` | UNKNOWN_PROTECT | Input to generated runtime Gitleaks rules; keep until secret policy replacement exists |
| `packages/runtime/hooks/_gitleaks-rules.mjs` | ADAPT_FOR_OLYMPUS | Generated from third-party Gitleaks plus patch; protect until replacement generated-source policy exists |

## Test and acceptance config surfaces

| Path | Classification | Rationale |
| --- | --- | --- |
| `packages/*/__tests__/*.test.ts` | ADAPT_FOR_OLYMPUS | Test patterns should be preserved and re-targeted to Olympus behavior |
| `tests/e2e.test.ts` | ADAPT_FOR_OLYMPUS | CLI/e2e fixture patterns are valuable for Olympus acceptance |
| `packages/accept/src/**` | ADAPT_FOR_OLYMPUS | Product acceptance simulation should be re-authored for Olympus |
| `specs/06-acceptance.md` | REAUTHOR_FOR_OLYMPUS | OAL acceptance contract should become an Olympus acceptance contract after design |

## Generated/build output policy

Observed `.gitignore` protects:

- `dist/`
- `generated/`
- `target/`
- `.openagentlayer-install`
- `node_modules/`
- `*.tsbuildinfo`
- `.env*` except `.env.example`
- `.mcp.json`
- IDE/OS/log files
- `oal_legacy/`

Classification: **KEEP_AS_IS** for the existing ignore behavior, with **ADAPT_FOR_OLYMPUS** additions after phase-01/02 define Olympus output directories.

## Current phase-00 decision

No config deletion is allowed. Existing lint, formatter, TypeScript, package manager, test, CI, build, release, install, and generated-source configs are protected until Olympus replacements or adaptations exist and are documented in a later phase.

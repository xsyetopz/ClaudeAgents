# Phase 00 Classification — Root Paths

Classification values are from `olympus-impl/00_AUTHORITY.md`.

| Path | Classification | Phase-00 rationale |
| --- | --- | --- |
| `.DS_Store` | DELETE_AFTER_REPLACEMENT | OS junk; safe to ignore/delete after legacy snapshot and cleanup gates |
| `.agents/` | UNKNOWN_PROTECT | Provider/plugin state surface; inspect before deletion after Olympus plugin policy exists |
| `.claude-plugin/` | MOVE_TO_LEGACY_ONLY | OAL Claude plugin marketplace metadata; preserve until Olympus plugin packaging replaces it |
| `.editorconfig` | KEEP_AS_IS | General editor formatting config, useful independent of OAL |
| `.git/` | KEEP_AS_IS | Repository metadata, not product architecture |
| `.github/` | ADAPT_FOR_OLYMPUS | CI gates are valuable; OAL-specific jobs need re-authoring after Olympus validation design |
| `.gitignore` | ADAPT_FOR_OLYMPUS | Keep existing generated/build ignores and `oal_legacy/`; adapt for Olympus outputs later |
| `.gitmodules` | ADAPT_FOR_OLYMPUS | Protect third-party source declarations until third-party policy is reauthored |
| `.pi/` | ADAPT_FOR_OLYMPUS | Temporary Pi phase controller; may become input for Olympus Pi-first config, but currently bootstrap-only |
| `ATTRIBUTIONS.md` | ADAPT_FOR_OLYMPUS | Olympus drop-in attribution; keep until final docs define attribution policy |
| `CHANGELOG.md` | ADAPT_FOR_OLYMPUS | Release discipline useful; OAL entries move to legacy/historical section after replacement |
| `CODE_OF_CONDUCT.md` | KEEP_AS_IS | Community policy, not OAL-specific implementation |
| `CONTRIBUTING.md` | ADAPT_FOR_OLYMPUS | Contribution guidance likely OAL-specific; preserve and adapt later |
| `INSTALLATION.md` | REAUTHOR_FOR_OLYMPUS | OAL install docs; study for install flows, then replace with Olympus install docs |
| `LICENSE` | KEEP_AS_IS | Legal file; do not change without human decision |
| `OLYMPUS-BOOTSTRAP-README.md` | ADAPT_FOR_OLYMPUS | Temporary Olympus phase bootstrap document |
| `PI-START.txt` | ADAPT_FOR_OLYMPUS | Temporary Pi startup guidance for phases |
| `README.md` | REAUTHOR_FOR_OLYMPUS | Active product README must eventually present Olympus, not OAL |
| `SECURITY.md` | ADAPT_FOR_OLYMPUS | Security process valuable; update product names/contact if needed |
| `biome.jsonc` | KEEP_AS_IS | Existing lint/format config should be preserved unless phase-03+ proves changes needed |
| `bump-version.sh` | ADAPT_FOR_OLYMPUS | Good release metadata discipline; paths/names must be reauthored |
| `bun.lock` | KEEP_AS_IS | Package manager lockfile; preserve until package graph changes require update |
| `bunfig.toml` | KEEP_AS_IS | Bun config with isolated linker; preserve |
| `docs/` | ADAPT_FOR_OLYMPUS | OAL docs and research; keep as evidence, reauthor active docs later |
| `homebrew/` | ADAPT_FOR_OLYMPUS | Release packaging pattern useful; metadata must be reauthored for Olympus |
| `install-online.sh` | REAUTHOR_FOR_OLYMPUS | Good staged install pattern but OAL-specific paths/names |
| `install.sh` | REAUTHOR_FOR_OLYMPUS | Good source install wrapper pattern but OAL-specific behavior |
| `olympus-impl/` | KEEP_AS_IS | Temporary authoritative Olympus controller until bootstrap removal readiness |
| `package.json` | ADAPT_FOR_OLYMPUS | Workspace/package scripts need staged adaptation, not deletion |
| `packages/` | ADAPT_FOR_OLYMPUS | Core implementation packages; preserve until Olympus replacements are planned and implemented |
| `patches/` | UNKNOWN_PROTECT | Gitleaks patch tied to runtime secret guard; keep until security-hook replacement decision |
| `plans/` | UNKNOWN_PROTECT | Empty at inspection; protect until phase-01 decides planning/state locations |
| `plugins/` | REAUTHOR_FOR_OLYMPUS | Provider plugin metadata is OAL-specific but packaging pattern is useful |
| `prompts/` | UNKNOWN_PROTECT | Codex base-instruction prompt; keep as reference until Pi prompt policy exists |
| `schemas/` | UNKNOWN_PROTECT | Directory present but not studied as active source in phase-00; protect until classification can be refined |
| `scripts/` | ADAPT_FOR_OLYMPUS | Utility scripts include Gitleaks sync and Olympus helpers; preserve and adapt selectively |
| `source/` | REAUTHOR_FOR_OLYMPUS | OAL source catalog is valuable reference; Olympus should reauthor a Pi-owned source model |
| `specs/` | REAUTHOR_FOR_OLYMPUS | Strong OAL specs; reauthor into Olympus contracts after phase-01 |
| `tests/` | ADAPT_FOR_OLYMPUS | E2E/CLI test patterns valuable; update as Olympus commands replace OAL commands |
| `third_party/` | UNKNOWN_PROTECT | Submodule references must remain until third-party policy/replacements are documented |
| `tsconfig.base.json` | KEEP_AS_IS | TypeScript strict config useful independent of OAL |
| `tsconfig.json` | KEEP_AS_IS | Workspace TS config useful independent of OAL |
| `upstream-sources.lock.json` | UNKNOWN_PROTECT | Upstream reference lock; preserve until source/import policy is decided |

## Package directory classification

| Path | Classification | Rationale |
| --- | --- | --- |
| `packages/accept` | ADAPT_FOR_OLYMPUS | Acceptance architecture is essential; checks must be reauthored for Olympus |
| `packages/adapter` | REAUTHOR_FOR_OLYMPUS | OAL provider renderers are not Pi-first; retain ideas only |
| `packages/artifact` | ADAPT_FOR_OLYMPUS | Artifact/hash/provenance model is useful with renamed product contracts |
| `packages/cli` | REAUTHOR_FOR_OLYMPUS | CLI is OAL-specific and too broad; phase-01 must define Olympus CLI boundaries |
| `packages/deploy` | ADAPT_FOR_OLYMPUS | Plan/apply/uninstall ownership model is valuable |
| `packages/inspect` | ADAPT_FOR_OLYMPUS | Shared read-only inspection should exist for Olympus package evaluation |
| `packages/manifest` | ADAPT_FOR_OLYMPUS | Manifest-backed ownership should be preserved with Olympus names/schema |
| `packages/olympus` | UNKNOWN_PROTECT | Empty placeholder; do not implement until phase-01/02 define owner boundary |
| `packages/plugins` | REAUTHOR_FOR_OLYMPUS | OAL provider plugin sync is useful evidence; Pi package sync needs a new contract |
| `packages/policy` | ADAPT_FOR_OLYMPUS | Policy validation is useful; content must be Olympus/Pi-specific |
| `packages/runtime` | REAUTHOR_FOR_OLYMPUS | Hook runtime is OAL/provider-specific; keep safety concepts only |
| `packages/setup` | ADAPT_FOR_OLYMPUS | Setup phase planning is useful; adapt to Pi-first flows |
| `packages/source` | REAUTHOR_FOR_OLYMPUS | OAL source graph should inspire but not dictate Olympus source records |
| `packages/toolchain` | ADAPT_FOR_OLYMPUS | Toolchain planning may remain useful after package/optional-feature policy is defined |

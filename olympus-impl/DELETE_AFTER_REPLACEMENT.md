# Delete After Replacement Plan

Phase 02 output. This plan documents when active OAL surfaces may be removed, moved, or re-authored. No destructive cleanup is performed in Phase 02.

## Universal cleanup gate

A path may be deleted, moved to legacy-only, or replaced only after all of the following are true:

1. Phase 00 study exists.
2. Phase 01 design exists.
3. `oal_legacy/` exists and is gitignored.
4. The path has an explicit classification.
5. The replacement or deletion reason is documented in this file or a later phase log.
6. Narrow relevant Olympus verification passes.
7. The change does not remove protected lint/build/test/package/CI configs unless an Olympus adaptation is ready.

## Protected until final acceptance

These remain protected through early implementation:

- `.editorconfig`
- `biome.jsonc`
- `bun.lock`
- `bunfig.toml`
- `tsconfig.base.json`
- `tsconfig.json`
- `.gitmodules`
- `.github/workflows/ci.yml`
- existing package/test/acceptance infrastructure
- `third_party/` and related patches/scripts
- `oal_legacy/`
- `olympus-impl/` until bootstrap removal readiness

## Path-by-path replacement plan

| Active path | Classification | Delete/move condition | Replacement or reason |
| --- | --- | --- | --- |
| `README.md` | REAUTHOR_FOR_OLYMPUS | After Olympus CLI inspect/install/verify behavior exists and docs match tests | Olympus README with no OAL compatibility framing |
| `INSTALLATION.md` | REAUTHOR_FOR_OLYMPUS | After low-level CLI install/uninstall/verify behavior exists | Olympus install docs; project-local first, no global default |
| `CONTRIBUTING.md` | ADAPT_FOR_OLYMPUS | After Olympus package/test workflow exists | Update commands, package names, verification gates |
| `SECURITY.md` | ADAPT_FOR_OLYMPUS | After Olympus trust/sandbox policy is implemented enough to document | Olympus security reporting and safety model |
| `CHANGELOG.md` | ADAPT_FOR_OLYMPUS | At Olympus release prep | Keep historical OAL entries only as history if desired; active entries become Olympus |
| `ATTRIBUTIONS.md` | ADAPT_FOR_OLYMPUS | At docs/release cleanup | Keep required attributions; remove bootstrap-only framing |
| `OLYMPUS-BOOTSTRAP-README.md` | ADAPT_FOR_OLYMPUS | After active Olympus docs supersede it | Merge useful bootstrap notes into active docs or remove as temporary |
| `PI-START.txt` | ADAPT_FOR_OLYMPUS | After Olympus bootstrapping is no longer needed | Remove or replace with Olympus developer startup doc |
| `source/` | REAUTHOR_FOR_OLYMPUS | After Olympus-owned source/resource model exists and tests pass | Re-author only useful catalog ideas under Olympus contracts |
| `specs/` | REAUTHOR_FOR_OLYMPUS | After Olympus contracts/specs exist and pass verification | Replace OAL specs with Olympus product/internal/acceptance specs |
| `docs/` | ADAPT_FOR_OLYMPUS | After active docs are rewritten and references preserved in `oal_legacy/` | Keep evidence docs only if still relevant; active docs become Olympus |
| `prompts/` | UNKNOWN_PROTECT | After Pi prompt policy and Olympus prompt resources exist | Move OAL/Codex-specific prompts to legacy-only or re-author Olympus prompts |
| `.claude-plugin/` | MOVE_TO_LEGACY_ONLY | After Olympus no longer ships OAL Claude plugin metadata | Remove from active tree; reference remains in `oal_legacy/` |
| `plugins/` | REAUTHOR_FOR_OLYMPUS | After Olympus Pi package/extension packaging exists | Replace OAL provider plugin metadata with Olympus Pi package metadata if needed |
| `packages/cli` | REAUTHOR_FOR_OLYMPUS | After `packages/olympus` CLI covers required active command surface | Remove OAL CLI or move to legacy-only; no `oal` compatibility alias by default |
| `packages/adapter` | REAUTHOR_FOR_OLYMPUS | After Olympus confirms no active provider renderer need | Remove active OAL provider renderers; retain ideas in legacy only |
| `packages/source` | REAUTHOR_FOR_OLYMPUS | After Olympus package/resource inventory source model exists | Replace with Olympus inventory/source modules if still needed |
| `packages/runtime` | REAUTHOR_FOR_OLYMPUS | After Olympus Pi extension/sandbox/broker runtime exists | Re-author only safety concepts that map to Pi |
| `packages/plugins` | REAUTHOR_FOR_OLYMPUS | After Olympus package install/evaluation system exists | Remove OAL provider plugin sync |
| `packages/accept` | ADAPT_FOR_OLYMPUS | After Olympus acceptance simulation exists | Re-target acceptance to Olympus fixtures and commands |
| `packages/artifact` | ADAPT_FOR_OLYMPUS | After Olympus hash/provenance/manifest modules exist | Keep/adapt useful hashing/provenance or merge into `packages/olympus` |
| `packages/deploy` | ADAPT_FOR_OLYMPUS | After Olympus project-local plan/apply exists | Re-author deploy only for Pi mirrors/settings/manifests |
| `packages/manifest` | ADAPT_FOR_OLYMPUS | After Olympus manifest schema exists | Keep/adapt ownership ideas under Olympus names |
| `packages/inspect` | ADAPT_FOR_OLYMPUS | After Olympus shared inspection exists | Merge/adapt into Olympus inspect library |
| `packages/policy` | ADAPT_FOR_OLYMPUS | After Olympus package/resource policy exists | Re-target to Pi package/resource policy |
| `packages/setup` | ADAPT_FOR_OLYMPUS | After Olympus setup/install flow exists | Re-author setup around project-local Pi flow |
| `packages/toolchain` | ADAPT_FOR_OLYMPUS | After Olympus sandbox/toolchain requirements are known | Keep/adapt only needed probes/install guidance |
| `packages/olympus` | ADAPT_FOR_OLYMPUS | Active implementation owner | Implement Olympus here; do not delete |
| `tests/` | ADAPT_FOR_OLYMPUS | After Olympus tests/acceptance cover active behavior | Re-target OAL e2e patterns to Olympus |
| `.github/` | ADAPT_FOR_OLYMPUS | After Olympus commands/tests exist | Replace OAL CI commands with Olympus checks |
| `homebrew/` | ADAPT_FOR_OLYMPUS | After Olympus release packaging decision | Re-author or remove OAL cask metadata |
| `install.sh` | REAUTHOR_FOR_OLYMPUS | After Olympus install flow exists | Replace with Olympus source install wrapper if still needed |
| `install-online.sh` | REAUTHOR_FOR_OLYMPUS | After Olympus online install strategy exists | Replace with Olympus installer if still needed |
| `bump-version.sh` | ADAPT_FOR_OLYMPUS | After Olympus release metadata paths are known | Adapt version consistency checks |
| `scripts/sync-gitleaks-rules.mjs` | ADAPT_FOR_OLYMPUS | After Olympus secret/scanner policy is decided | Keep/adapt if secret guard remains |
| `patches/` | UNKNOWN_PROTECT | After secret policy replacement decision | Delete only if no Olympus secret-rule sync remains |
| `third_party/` | UNKNOWN_PROTECT | After third-party reference/package policy is decided and documented | Keep, initialize, replace, or remove according to explicit policy |
| `.agents/` | UNKNOWN_PROTECT | After Pi/Olympus package/plugin state policy exists | Preserve until inspected and replacement/removal reason is written |
| `schemas/` | UNKNOWN_PROTECT | After schema usage is audited | Preserve until classified in a later phase |
| `plans/` | UNKNOWN_PROTECT | After planning/state location policy is final | Remove only if empty/unneeded and documented |
| `.DS_Store` | DELETE_AFTER_REPLACEMENT | Any cleanup phase after snapshot gate | OS junk; delete only in cleanup phase, not Phase 02 |

## Config preservation rules

- Keep `biome.jsonc`, `tsconfig*.json`, `bun.lock`, `bunfig.toml`, `.editorconfig`, and existing test/CI configs until Olympus replacements are working.
- Do not remove scripts merely because their names contain OAL; first adapt or replace their release/verification purpose.
- Do not delete `third_party/` or `.gitmodules` until package evaluation and upstream-source policy are implemented.

## Documentation cleanup rules

Active docs may mention OAL only as historical context after Olympus docs exist. They must not frame Olympus as OAL compatibility, migration, or OAL vNext.

## Snapshot rule

`oal_legacy/` is the preserved reference. It is gitignored and must not be used as a source of live imports. It may be read for architecture/reference while re-authoring Olympus.

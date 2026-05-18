# Parity Integration Acceptance Report

Date: 2026-05-18
Phase: `parity-integration-acceptance`
Status: complete

## Result

Parity integration acceptance passed for implemented Track A, Track B, and Track C surfaces.

This phase added no new product scope beyond a minimal integration fix: Track C status/handoff reports now expose Track A hook-policy status, fail-closed safety status, and Hestia policy decision event counts from `.pi/olympus/policy/decisions.jsonl`.

## Created reports

- `olympus-impl/reports/parity-integration-inventory.md`
- `olympus-impl/reports/parity-acceptance-matrix.md`
- `olympus-impl/reports/parity-safety-grep-report.md`
- `olympus-impl/reports/parity-integration-acceptance-report.md`

## Cross-track consistency findings

| Check | Result | Evidence |
| --- | --- | --- |
| Track A safety decisions are visible in Track C reports | Pass | `reports/status.ts` includes `safety.hooks`, `safety.failClosed`, and `safety.policyDecisionEvents`; `report status/handoff` smoke passed. |
| Track A audit/state records are consumable by Track C status/handoff reports | Pass | `reports/status.ts` counts `.pi/olympus/policy/decisions.jsonl`; missing file is reported as 0 events. |
| Track B workflow artifacts use Track A policy gates where needed | Pass | Module Themis shell calls Themis policy; Hephaestus remains blocked on digest/gate prerequisites; plan review blocks unapproved writes. |
| Track B output-heavy workflows prefer Track C RTK-backed guidance | Pass | First-party RTK guidance resources exist; fake RTK is detected; RTK recommendation appears in status/compaction. |
| Track B Olympus modules use sober descriptions and Greek/Olympus names only as codenames | Pass | `modules/contracts.ts` descriptions are capability/boundary descriptions, not personas. |
| Track C reports do not hide Track A safety failures | Pass | Safety status and policy decision event count appear in status/handoff reports; compactors preserve blocked-policy and policy warning lines. |
| Track C compactors preserve Track B plan/diff/prompt-contract decision-critical context | Pass | Review tests preserve digests/deletions; compaction smoke preserved failed test, error, deleted file, blocked-policy, policy warning, and approval-decision lines. |
| No track introduces global `~/.pi` writes by default | Pass | Tests cover no-home writes; safety grep found no blocker. |
| No track executes third-party package code during inspect/evaluate/reporting | Pass | Inspect/evaluate/extension inspect remain metadata/static source reads only; safety grep found no dynamic execution blockers. |

## CLI smoke suite

Smoke output was recorded from a temp-root/fake-HOME run. Exit code `1` for `sandbox-check` is expected because executable load remains blocked/degraded.

| Command category | Smoke commands | Result |
| --- | --- | --- |
| Help | `olympus help` | Pass |
| Inspect/evaluate | `inspect`, `package evaluate` | Pass |
| Install/uninstall | `install --dry-run`, `install --apply`, `uninstall --dry-run`, `uninstall --apply` with fake HOME/temp project | Pass |
| Status/catalog/verify | `status`, `catalog`, `spec`, `verify` | Pass |
| Extension | `extension create --apply --output <temp>`, `extension inspect <temp>` | Pass |
| Track A | `safety check`, `hooks policy`, `sandbox check`, `broker validate`, `trust status` | Pass; sandbox reports blocked executable load |
| Track B | `resources validate`, `prompt contract`, `review plan`, `review diff`, `handoff current`, `module status`, `module run athena --dry-run` | Pass |
| Track C | `report status`, `report handoff`, `report acceptance`, `compact`, `rtk status`, `quota status` | Pass |
| Interactive | Piped `q` into `olympus interactive` | Pass |

## RTK integration verification

- Fake RTK on PATH was detected as `available`.
- `report status --json` included RTK status when fake RTK was on PATH.
- Supported output-heavy workflows reported RTK-backed recommendations.
- Missing RTK produced an explicit degraded/fallback reason.
- Fallback compactors did not claim RTK execution; available RTK reports recorded RTK preference while offline CLI fallback summary remained explicit.
- Compaction preserved exit status where supplied by tests, failing test names, error messages, changed/deleted files, redaction notices, blocked-policy reasons, policy warnings, and approval decisions.

## Verification commands

| Command | Result |
| --- | --- |
| `bun install --frozen-lockfile` | Pass; no changes. |
| `bun run olympus:test` | Pass; 65 tests. |
| `bunx tsc --noEmit` | Pass. |
| `bunx biome check packages/olympus --max-diagnostics 200` | Pass. |
| Relevant CLI smoke checks | Pass. |
| `git diff --check` | Pass. |
| `git status --short` | Ran and recorded working-tree changes. |
| `git check-ignore -v oal_legacy` | Pass: `.gitignore:35:oal_legacy/`. |

## Docs/spec sync

Docs/specs already described implemented Track A/B/C behavior after the implementation phases. This acceptance phase updates `PLAN.md` to record parity integration acceptance. No docs now claim:

- third-party executable support is safe,
- global `~/.pi` install is implemented by default,
- brokers use real credentials,
- RTK is optional/avoidable for output-heavy workflows,
- OAL compatibility mode exists,
- Codex/Claude/OpenCode provider rendering exists.

## Known gaps preserved as non-goals

- Live Pi runtime Aegis integration remains future work.
- Executable package loading remains blocked until trust + lock + sandbox gates pass.
- Hephaestus write/apply remains blocked until approved plan digest, path allowlist, manifest ownership, and Themis approval are implemented and tested.
- Broker validation remains schema-only/read-only with no live credential use.
- Report/handoff artifact writes remain future explicit write commands or helper APIs; default CLI paths are read-only.

## Stop condition

Integration acceptance is complete. No cleanup, global Pi writes, third-party package execution, live runtime hooks, executable trust path, uncontrolled swarm behavior, or next phase was started.

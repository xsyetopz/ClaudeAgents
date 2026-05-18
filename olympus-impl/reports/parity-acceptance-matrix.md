# Parity Acceptance Matrix

Date: 2026-05-18
Phase: `parity-integration-acceptance`

## Safety/runtime

| Acceptance row | Status | Evidence |
| --- | --- | --- |
| Unsafe `tool_call` blocked | Pass | `track-a-safety-runtime.test.ts`; `olympus safety check --json` |
| Protected path operation blocked | Pass | `track-a-safety-runtime.test.ts`; sandbox fake-home probes |
| Generated artifact write blocked without manifest | Pass | `track-a-safety-runtime.test.ts` |
| Secret output redacted | Pass | `track-a-safety-runtime.test.ts`; `track-c-reporting-efficiency.test.ts` |
| Provider-payload warning/audit works | Pass | `track-a-safety-runtime.test.ts`; Hestia audit helper |
| Unsigned package warning | Pass | `track-a-safety-runtime.test.ts` |
| Lock mismatch blocks executable load | Pass | `track-a-safety-runtime.test.ts` |
| Sandbox fake-secret denial checks pass or are marked unavailable/degraded honestly | Pass | `olympus sandbox check --json` exits with safety finding and executable loads blocked |
| Broker denies arbitrary shell | Pass | `track-a-safety-runtime.test.ts` |
| Broker permits approved read-only request schema | Pass | `track-a-safety-runtime.test.ts`; CLI smoke `broker validate` |

## Authoring/workflow

| Acceptance row | Status | Evidence |
| --- | --- | --- |
| Skill/prompt metadata validates | Pass | `track-b-authoring-workflow.test.ts`; `olympus resources validate --json` |
| Command collision detected | Pass | `track-b-authoring-workflow.test.ts` |
| Support files copied/hashed | Pass | `track-b-authoring-workflow.test.ts` |
| Prompt contract preserves user paths/constraints | Pass | `track-b-authoring-workflow.test.ts`; `olympus prompt contract` |
| Unapproved write plan blocked | Pass | `track-b-authoring-workflow.test.ts`; `review plan` |
| Approval digest mismatch blocks continuation | Pass | `track-b-authoring-workflow.test.ts` |
| Athena cannot write | Pass | `track-b-authoring-workflow.test.ts`; module shell |
| Themis blocks unsafe action | Pass | `track-b-authoring-workflow.test.ts`; Track A policy |
| Apollo rejects commands outside allowlist | Pass | `track-b-authoring-workflow.test.ts` |
| Hephaestus rejects missing/changed plan digest | Pass | `track-b-authoring-workflow.test.ts` |
| Hermes produces compact handoff without reading secrets | Pass | `track-b-authoring-workflow.test.ts`; `handoff current` |
| Hestia refuses writes outside `.pi/olympus` | Pass | `track-b-authoring-workflow.test.ts` |
| Moirai produces dependency graph only | Pass | `track-b-authoring-workflow.test.ts` |

## Reporting/efficiency

| Acceptance row | Status | Evidence |
| --- | --- | --- |
| RTK detected when fake RTK exists on PATH | Pass | `track-c-reporting-efficiency.test.ts`; `/tmp/rtk-present.json` smoke |
| RTK-backed path is preferred for supported output-heavy workflows | Pass | RTK recommendation text in `rtk status` and compaction reports |
| Fallback/degraded reason recorded when RTK unavailable | Pass | `track-c-reporting-efficiency.test.ts`; `/tmp/rtk-compact-missing.json` |
| Failing tests remain visible after compaction | Pass | `track-c-reporting-efficiency.test.ts` |
| Deleted files remain visible after compaction | Pass | `track-c-reporting-efficiency.test.ts`; RTK smoke compact fixture |
| Blocked-policy reasons remain visible after compaction | Pass | RTK smoke compact fixture preserves `blocked-policy` critical context |
| Secret-looking output redacted before summary | Pass | `track-c-reporting-efficiency.test.ts` |
| Raw output fallback exists | Pass | `track-c-reporting-efficiency.test.ts`; `compact --raw` smoke |
| Package risk report deterministic | Pass | `track-c-reporting-efficiency.test.ts` |
| Status report deterministic | Pass | `track-c-reporting-efficiency.test.ts` |
| Handoff compact and actionable | Pass | `track-c-reporting-efficiency.test.ts`; `handoff current` smoke |
| Quota unknown is labeled unknown | Pass | `track-c-reporting-efficiency.test.ts`; `quota status` |
| Expensive workflow warning appears | Pass | `track-c-reporting-efficiency.test.ts`; `quota status` |
| Catalog/spec has no stale active-OAL product claims | Pass | `catalog-status.test.ts`; `track-c-reporting-efficiency.test.ts` |

## Verification summary

- `bun install --frozen-lockfile` — pass.
- `bun run olympus:test` — pass, 65 tests.
- `bunx tsc --noEmit` — pass.
- `bunx biome check packages/olympus --max-diagnostics 200` — pass.
- CLI smoke suite — pass; `sandbox check` returns expected nonzero safety finding while reporting blocked executable load.
- `git diff --check` — pass.
- `git check-ignore -v oal_legacy` — pass, `.gitignore:35:oal_legacy/`.

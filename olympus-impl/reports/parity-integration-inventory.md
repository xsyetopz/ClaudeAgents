# Parity Integration Inventory

Date: 2026-05-18
Phase: `parity-integration-acceptance`

## Input note

The selected prompt referenced `olympus-impl/reports/final-audit.md` and `olympus-impl/reports/post-audit-cleanup-report.md`; those files are not present in this working tree. `PLAN.md` contains the relevant final-audit/post-audit cleanup summaries and was used as the available authority record.

## Track A — Safety + Runtime Policy

| Surface | Source files | Command | Pi extension surface | Artifact paths | Safety boundary | Tests | Plan item |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Themis policy model | `packages/olympus/src/policy/types.ts`, `policy/themis.ts`, `policy/dangerous-command.ts`, `policy/protected-paths.ts`, `policy/secrets.ts` | `olympus safety check --json` | Event-shaped pure inputs: `tool_call`, `tool_result`, `before_provider_request`, `input`, session/resource/model/thinking events | Decision JSON, optional `.pi/olympus/policy/decisions.jsonl` via Hestia | Pure, side-effect-free, fail-closed for safety blocks | `packages/olympus/test/track-a-safety-runtime.test.ts` | A1, A3 |
| Aegis skeleton | `packages/olympus/src/extensions/aegis/index.ts`, `commands/hooks.ts` | `olympus hooks policy --json` | Non-executing first-party hook-policy skeleton | Hook-policy JSON | No runtime hook execution; no third-party code execution | `track-a-safety-runtime.test.ts` | A2 |
| Hestia audit/state | `packages/olympus/src/hestia/state.ts` | Indirect via policy helpers | None | `.pi/olympus/policy/decisions.jsonl` when explicitly called | Project-local only; redacts secret-looking text | `track-a-safety-runtime.test.ts` | A4 |
| Sandbox probe | `packages/olympus/src/sandbox/probe.ts`, `commands/sandbox.ts` | `olympus sandbox check --json` | None | Probe JSON only | Harmless PATH/OS status and fake-home policy probes; executable loads remain blocked | `track-a-safety-runtime.test.ts` | A5 |
| Trust signage | `packages/olympus/src/trust/status.ts`, `commands/trust.ts` | `olympus trust status --json` | None | Trust status JSON | Read-only manifest/lock/signage; no trust mutation | `track-a-safety-runtime.test.ts` | A6 |
| Read-only brokers | `packages/olympus/src/broker/read-only.ts`, `commands/broker.ts` | `olympus broker validate <fixture> --json` | None | Broker validation JSON | Schema-only, no credentials, denies arbitrary shell strings | `track-a-safety-runtime.test.ts` | A7 |

## Track B — Authoring + Workflow UX

| Surface | Source files | Command | Pi extension surface | Artifact paths | Safety boundary | Tests | Plan item |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Resource schemas/validation | `packages/olympus/src/resources/schema.ts`, `resources/validate.ts` | `olympus resources validate [path] --json` | Future resource discovery only; no live registration in this phase | Resource validation JSON; optional generated local package files | Read-only validation; no global install | `packages/olympus/test/track-b-authoring-workflow.test.ts` | B1 |
| First-party resource package | `packages/olympus/src/resources/first-party.ts` | Service API only | Future first-party resources | Caller-provided output directory only if applied by API | Explicit output only; manifest-ready; no `~/.pi` writes | `track-b-authoring-workflow.test.ts` | B2 |
| Prompt contract | `packages/olympus/src/workflow/prompt-contract.ts`, `commands/prompt.ts` | `olympus prompt contract <input-or-file> --json` | Future `/olympus-prompt-contract` command | Prompt-contract JSON | Read-only; preserves paths/constraints; redacts secrets | `track-b-authoring-workflow.test.ts` | B3 |
| Plan/diff review | `packages/olympus/src/workflow/review.ts`, `commands/review.ts` | `olympus review plan <file> --json`, `olympus review diff <file> --json` | Future `/olympus-plan-review` command | `plan.json`, `diff.json`, annotations, decision, feedback, audit-shaped JSON | Read-only; no external server; blocks unapproved/digest-mismatch continuation | `track-b-authoring-workflow.test.ts` | B4 |
| Hermes handoff | `packages/olympus/src/handoff/current.ts`, `commands/handoff.ts` | `olympus handoff current --json` | Future `/olympus-status-handoff` command | Handoff JSON/markdown | Summary-only; no decision alteration; no source mutation; redacts secrets | `track-b-authoring-workflow.test.ts` | B5 |
| Module shells | `packages/olympus/src/modules/contracts.ts`, `commands/module.ts` | `olympus module status --json`, `olympus module run <module> --dry-run --json` | None | Module run/status JSON | Bounded codenames only; Hephaestus blocked; no write authority by prompt | `track-b-authoring-workflow.test.ts` | B6, B7 |

## Track C — Reporting + Efficiency

| Surface | Source files | Command | Pi extension surface | Artifact paths | Safety boundary | Tests | Plan item |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Report schemas/redaction | `packages/olympus/src/reports/schema.ts` | Used by report commands | None | Stable JSON report output | Deterministic ordering; secret-looking text redacted | `track-c-reporting-efficiency.test.ts` | C1 |
| Status/handoff reports | `reports/status.ts`, `commands/status.ts`, `commands/report.ts` | `olympus status --json`, `olympus report status --json`, `olympus report handoff --json` | Future status handoff command | `.pi/olympus/reports/status.json`, `.pi/olympus/handoff/current.md` documented paths | Read-only; now includes safety hook policy and policy decision event count | `catalog-status.test.ts`, `track-c-reporting-efficiency.test.ts` | C2 |
| Acceptance/package risk | `reports/acceptance.ts`, `reports/package-risk.ts`, `commands/report.ts` | `olympus report acceptance --json` | Future risk report command | Acceptance/package risk JSON | Read-only; no package code execution | `track-c-reporting-efficiency.test.ts` | C8 |
| RTK detection/policy | `compaction/rtk.ts`, `commands/rtk.ts` | `olympus rtk status --json` | Future output-heavy workflow guidance | RTK status JSON | Detects executable on PATH without executing RTK; records unavailable reason | `track-c-reporting-efficiency.test.ts`, `track-b-authoring-workflow.test.ts` | C4 |
| Compaction core/fallbacks | `compaction/types.ts`, `compaction/fallback.ts`, `compaction/index.ts`, `commands/compact.ts` | `olympus compact <file> --json` | Future tool-result/session compaction | Compaction JSON | RTK-first recommendation; fallback reason recorded; preserves decision-critical context | `track-c-reporting-efficiency.test.ts` | C3, C5, C6 |
| Quota status | `quota/profile.ts`, `commands/quota.ts` | `olympus quota status --json` | Future model/thinking hints | `.pi/olympus/quota/profile.json` read-only | Unknown remains unknown; no fabricated provider limits | `track-c-reporting-efficiency.test.ts`, `track-a-safety-runtime.test.ts` | C7 |

## Shared baseline surfaces

| Surface | Source files | Command | Safety boundary | Tests |
| --- | --- | --- | --- | --- |
| Inspect/evaluate | `inspection.ts`, `evaluation.ts`, `commands/inspect.ts`, `commands/package-evaluate.ts` | `inspect`, `package evaluate`, `package-evaluate` | Never executes package code | `inspect.test.ts` |
| Install/uninstall | `install-flow.ts`, `commands/install.ts`, `commands/uninstall.ts`, `manifest.ts`, `lock.ts`, `settings.ts` | `install`, `uninstall` | Dry-run first; project-local manifest-owned writes/removals only | `install.test.ts` |
| Extension authoring | `extension-authoring.ts`, `commands/extension.ts` | `extension create`, `extension inspect` | Create writes only explicit output; inspect never imports code | `extension.test.ts` |
| Catalog/spec/verify/interactive | `catalog.ts`, `commands/catalog.ts`, `commands/verify.ts`, `interactive.ts` | `catalog`, `spec`, `verify`, `interactive` | Read-only or temp-root/fake-home bounded | `catalog-status.test.ts`, `interactive.test.ts` |

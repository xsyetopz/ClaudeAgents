# Parity Track C — Reporting + Efficiency

## 1. Bottom line

Track C makes reporting, handoff, acceptance evidence, package catalogs, quota display, and output compaction deterministic and RTK-first. RTK is treated as a first-class integration target for supported output-heavy workflows; in-house compactors are explicit fallbacks with recorded degraded reasons.

Facts:
- Olympus 0.1.0 already emits status, catalog/spec, package evaluation, and verification reports.
- Pi has built-in compaction and extension hooks for `session_before_compact`, `tool_result`, and provider/model lifecycle information.
- OAL included RTK command/report ideas that are useful as inspiration but not active Olympus behavior.

Decisions:
- Do not silently skip RTK when it is available.
- Preserve decision-critical context even when compacting.
- Unknown quota is labeled unknown, not fabricated.
- Reports reflect implemented commands only.

Unknowns:
- Exact RTK command availability must be detected locally.
- Official provider quota values are unstable and should not be hardcoded as truth.

## 2. OAL inspiration / retained lessons

Retain these lessons:
- Output efficiency needs enforceable command guidance, not vague reminders.
- RTK reports can help distinguish filtered, proxy, and fallback command paths.
- Status/handoff files should be LLM-readable, compact, and actionable.
- Acceptance reports should aggregate fixture evidence and make drift visible.

Reject these patterns:
- Provider-specific command policy tied to non-Pi renderers.
- Hardcoded vendor limits as durable truth.
- Summary output that hides failing tests, deleted files, policy blocks, or secret redactions.
- Catalog/spec claims for unimplemented behavior.

## 3. PiCodingAgent-native design

Olympus exposes RTK-aware CLI/reporting paths and Pi extension guidance:
- Detect RTK with bounded help/probe commands.
- Classify commands as RTK-supported, RTK-proxy, fallback, raw-reference, or blocked-by-policy.
- Route supported shell/read/grep/find/test/log workflows through RTK-backed command paths where possible.
- Use Pi `tool_result` and compaction hooks to summarize only after preserving exit status, failures, changed files, warnings, and decisions.
- Store compaction reports under `.pi/olympus/reports/compaction/**`.
- Show RTK status and degraded reasons in `olympus status`, handoff, risk, and acceptance reports.

Pi extension guidance is explicit: output-heavy workflows trigger RTK-backed command recommendations when RTK is available. The model must not silently avoid RTK.

## 4. Current Olympus baseline

Implemented baseline:
- `status` reads manifest, lock, audit, settings state, and warnings.
- `catalog`/`spec` print source-of-truth command/resource contracts.
- `package evaluate` reports risk labels, conflicts, and recommendation.
- `verify` aggregates deterministic fixture checks.
- `report.ts` provides human and JSON formatting helpers.

Not implemented yet:
- RTK detection.
- RTK-backed command policy.
- Compaction report model.
- Handoff/status report hardening beyond package state.
- Acceptance aggregation beyond existing verify report.
- Quota profile/status display.
- Risk report command.

## 5. Required modules/files

Planned active-source modules:
- `packages/olympus/src/reports/schema.ts` — deterministic report schemas.
- `packages/olympus/src/reports/status.ts` — richer status/handoff builder.
- `packages/olympus/src/reports/acceptance.ts` — acceptance aggregation.
- `packages/olympus/src/reports/package-risk.ts` — deterministic package risk reports.
- `packages/olympus/src/compaction/types.ts` — compaction interface and result contract.
- `packages/olympus/src/compaction/rtk.ts` — RTK detection and RTK-backed command policy.
- `packages/olympus/src/compaction/git.ts` — git diff/status/log compactors.
- `packages/olympus/src/compaction/test-output.ts` — test output compaction.
- `packages/olympus/src/compaction/search.ts` — grep/rg/find compaction.
- `packages/olympus/src/compaction/package-manager.ts` — package-manager output compaction.
- `packages/olympus/src/quota/profile.ts` — quota profile/status model.
- `packages/olympus/src/extensions/reporting/index.ts` — Pi status/risk/compaction extension integration.

Planned fixtures:
- `packages/olympus/test/fixtures/rtk-present/**`
- `packages/olympus/test/fixtures/rtk-missing/**`
- `packages/olympus/test/fixtures/outputs/{git,test,grep,package-manager,stack-trace}/**`
- `packages/olympus/test/fixtures/quota/**`

## 6. CLI commands and Pi extension surfaces

Planned CLI commands:
- `olympus status [--json]` extended with RTK/degraded state and manifest drift.
- `olympus handoff write [--json]` for `.pi/olympus/handoff/current.md`.
- `olympus risk report <package-path> [--json]`.
- `olympus acceptance report [--json]`.
- `olympus compaction detect-rtk [--json]`.
- `olympus compaction plan --kind <git|test|grep|package|stack> [--json]`.
- `olympus compaction summarize --from-file <path> --kind <kind> [--compact|--verbose|--json]`.
- `olympus quota status [--json]`.

Pi extension surfaces:
- `tool_call`: recommend or route RTK-backed forms for output-heavy commands when available.
- `tool_result`: compact output, redact secrets before summary, and preserve critical failures.
- `session_before_compact`: provide Olympus-aware compaction summaries with decision-critical context.
- `before_provider_request`: warn/audit payload bloat and secrets.
- `model_select` / `thinking_level_select`: display quota profile/status when known.
- `pi.registerCommand` for `/olympus-status`, `/olympus-risk-report`, `/olympus-handoff`, and `/olympus-rtk-status`.

## 7. Data/artifact model

Artifacts:
- `.pi/olympus/reports/package-risk/*.json`
- `.pi/olympus/reports/status.json`
- `.pi/olympus/reports/acceptance.json`
- `.pi/olympus/reports/compaction/*.json`
- `.pi/olympus/handoff/current.md`
- `.pi/olympus/quota/profile.json`
- `.pi/olympus/quota/usage-estimates.jsonl`
- `.pi/olympus/audit.jsonl`

Compaction report fields:
- `schemaVersion`
- `kind`
- `rtkStatus`: `available`, `unavailable`, `unsupported`, `bypassed`
- `rtkCommand?`
- `fallbackReason?`
- `rawOutputReference?`
- `exitStatus`
- `criticalContext[]`
- `redactions[]`
- `warnings[]`
- `savedBytesEstimate`
- `tokenEstimateBefore`
- `tokenEstimateAfter`
- `deterministicDigest`

Quota profile fields:
- `schemaVersion`
- `provider?`
- `model?`
- `source`: `user-config`, `official-doc-citation`, `runtime-observed`, `unknown`
- `limits`: known values or `unknown`
- `warnings[]`
- `lastUpdated`

## 8. Safety policy

Rules:
- Do not silently skip RTK when it is available.
- RTK-backed compaction is preferred over in-house fallback for supported cases.
- Compaction must not hide safety-critical failures.
- Preserve exit status, failing test names, error messages, changed files, deleted files, redaction notices, blocked-policy reasons, policy warnings, and approval decisions.
- Token compaction fails open only after recording fallback/degraded reason.
- Safety policy fails closed.
- If RTK is unavailable, report degraded compaction status.
- If RTK output drops decision-critical context, request raw or verbose fallback.
- Do not hardcode opaque provider limits as truth.
- Official quota values may be cited but treated as unstable.
- Unknown quota is labeled unknown, not fabricated.
- Reports must be deterministic.
- Reports must not include secrets.
- Catalog/spec reflects implemented commands only.

## 9. Tests and acceptance fixtures

Required acceptance fixtures:
- RTK detected when present.
- RTK-backed command path is recommended or used for supported output-heavy workflows.
- Fallback/degraded reason is recorded when RTK is unavailable.
- Failing tests remain visible after compaction.
- Secret-looking output redacted before summary.
- Raw output fallback exists.
- Compacted diff preserves filenames and deletion markers.
- Status detects manifest drift.
- Handoff is compact and actionable.
- Package risk report deterministic.
- Catalog/spec has no stale OAL active-product claims.
- Quota profile loads.
- Expensive workflow warning appears.
- Unknown quota labeled unknown.

Additional checks:
- Stack traces preserve exception type, top project frames, and message.
- Package-manager compaction preserves failed package/script names.
- Grep compaction preserves file path, line numbers, and match counts.
- Saved-byte/token estimates are labeled estimates.

## 10. Implementation slices

C1. Report schema hardening.
- Define schemas for status, handoff, risk, acceptance, compaction, and quota artifacts.
- Keep deterministic sort order and stable JSON formatting.

C2. Deterministic status/handoff reports.
- Extend status with manifest drift and report paths.
- Create compact handoff writer.

C3. Compaction core interfaces.
- Define common input/output model and critical-context preservation rules.

C4. RTK detection and RTK-backed command policy.
- Detect RTK availability and supported command forms.
- Record unavailable/unsupported/bypassed reasons.

C5. Git/test/grep compactors with RTK-first behavior.
- Prefer RTK-backed paths for supported output shapes.
- Preserve failing tests, changed files, deletions, and error messages.

C6. Fallback compactors for unsupported/missing RTK cases.
- Implement in-house compactors only as explicit degraded fallback.
- Link raw output reference when possible.

C7. Quota profile + status display.
- Load user-configured profile and runtime observations.
- Label unknown values explicitly.

C8. Acceptance report aggregation.
- Aggregate verify, policy, compaction, and resource fixtures into deterministic report.

C9. Pi status/risk/compaction extension integration.
- Register reporting commands and output-heavy workflow guidance.
- Integrate with Track A Aegis/Themis decisions.

## 11. Non-goals

- No feature implementation in this planning phase.
- No RTK shell-out side effects beyond future explicit detection/probe commands.
- No hardcoded provider quota truth.
- No secret-preserving raw logs in reports.
- No stale claims about unimplemented commands in catalog/spec.
- No provider renderer or plugin sync revival.
- No global `~/.pi` writes by default.
- No non-Pi harness planning.

## 12. Open questions

- Which RTK command forms should be considered supported for first implementation: `grep`, `read`, `find`, `git`, `proxy`, or a smaller subset?
- Should Olympus wrap commands as custom tools, extension guidance, CLI suggestions, or all three?
- Where should raw output references be stored so they are useful but do not leak secrets?
- What token-estimation library or heuristic is acceptable for deterministic saved-token estimates?
- Should quota status be user-config only until a provider exposes reliable usage metadata?
- How should compaction failures surface in print/JSON/RPC modes?

## 13. Source list

Local sources:
- `PLAN.md`
- `docs/architecture.md`
- `docs/roadmap.md`
- `docs/oal-lessons.md`
- `specs/cli.md`
- `specs/verification.md`
- `specs/roadmap-parity.md`
- `packages/olympus/src/report.ts`
- `packages/olympus/src/project-status.ts`
- `packages/olympus/src/catalog.ts`
- `packages/olympus/src/commands/verify.ts`
- `oal_legacy/README.md` RTK sections as reference-only inspiration.
- `oal_legacy/specs/04-runtime-hooks.md`
- `oal_legacy/packages/toolchain/src/index.ts`
- `oal_legacy/packages/cli/src/commands/rtk-report.ts`
- `oal_legacy/packages/accept/src/rtk.ts`

Pi docs:
- `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md`
- `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/compaction.md`
- `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/models.md`

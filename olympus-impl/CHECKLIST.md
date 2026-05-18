# Olympus Implementation Checklist

## Phase sequence

- [x] phase-00 study completed before this session, per `PLAN.md`.
- [x] phase-01 design completed before this session, per `PLAN.md`.
- [x] phase-02+ implementation baseline completed before this session, per `PLAN.md`.
- [x] `phase-parity-track-plans` executed as planning only.
- [x] `phase-track-c-reporting-efficiency-impl` executed as implementation only.
- [x] `phase-track-a-safety-runtime-impl` executed as implementation only.
- [x] `phase-track-b-authoring-workflow-impl` executed as implementation only.
- [x] `parity-integration-acceptance` executed as integration/verification/doc-sync only.
- [x] No next phase started in this session.

## Track C reporting + efficiency implementation

- [x] Implemented deterministic report helpers and stable JSON output.
- [x] Implemented status report extensions with RTK/quota/report-path/drift summaries.
- [x] Implemented compact handoff report builder.
- [x] Implemented acceptance report aggregation.
- [x] Implemented deterministic package risk report builder.
- [x] Implemented RTK PATH detection without executing RTK.
- [x] Implemented RTK-backed recommendations for shell output, read, grep/find/rg, git diff/status/log, test output, and package-manager logs.
- [x] Implemented compaction interfaces for compact, verbose, and raw modes.
- [x] Implemented fallback compactors for git-shaped, test-shaped, search-shaped, package-manager-shaped, stack-trace, and generic output.
- [x] Preserved failing tests, error messages, changed files, deleted files, redaction notices, policy warnings/blocks, and approval decisions where present.
- [x] Redacted secret-looking output before summaries and raw fallback output.
- [x] Implemented quota status labels `plus`, `pro-5x`, `pro-20x`, and `unknown`.
- [x] Left unknown/opaque provider limits as `unknown`.
- [x] Added implemented CLI commands for report/status/handoff/acceptance, compact, RTK status, and quota status.
- [x] Updated catalog/spec contracts with no stale active-OAL product claims.
- [x] Added targeted Track C tests.
- [x] Verified no default `~/.pi` writes from reporting/quota commands.

## Track A safety + runtime policy implementation

- [x] Implemented hook policy model for tool, provider, input, session, resource, model, and thinking-level event shapes.
- [x] Implemented pure Themis allow/warn/block/redact policy decisions.
- [x] Implemented dangerous-command and protected-path policy helpers.
- [x] Blocked generated artifact writes without manifest ownership.
- [x] Blocked package executable install/load attempts until trust, lock, and sandbox gates pass.
- [x] Implemented secret-looking output and provider-payload redaction helpers.
- [x] Implemented Hestia project-local audit/state helpers under `.pi/olympus/**` only.
- [x] Implemented non-executing Olympus-owned Aegis extension skeleton and hook-policy status.
- [x] Implemented sandbox probe/status checks with fake-home secret denial and executable-load blocking.
- [x] Implemented trust/signage status fields for unsigned, locked, hash mismatch, trusted passive, executable blocked, sandbox, home denied, and network denied.
- [x] Implemented typed read-only broker schema validation for git, gh, and registry requests.
- [x] Denied arbitrary shell/credential broker arguments.
- [x] Added CLI commands for safety check, hooks policy, sandbox check, broker validate, and trust status.
- [x] Updated catalog/spec contracts for implemented Track A behavior.
- [x] Added targeted Track A tests.
- [x] Verified no default `~/.pi` writes from safety/runtime commands.

## Track B authoring + workflow implementation

- [x] Implemented first-party resource authoring schemas for Olympus-owned skills, prompts, command metadata, provenance markers, support-file metadata, and command collisions.
- [x] Implemented first-party resource package generation/inspection support for required Track B skills/prompts.
- [x] Implemented prompt-contract artifact model with goal, context, constraints, inspected surfaces, allowed/forbidden mutations, acceptance criteria, verification commands, risk flags, stop conditions, and compact output.
- [x] Implemented plan/diff review artifact model with digests, annotations, decisions, feedback markdown, and audit lines.
- [x] Implemented Hermes current handoff command using compact deterministic summaries.
- [x] Implemented bounded module shells for Athena, Themis, Apollo, Hermes, Hestia, Aegis, Moirai, and blocked Hephaestus.
- [x] Hephaestus rejects missing/changed plan digest and remains write-blocked.
- [x] Added CLI commands for resources validate, prompt contract, review plan, review diff, handoff current, module status, and module run dry-run.
- [x] Updated catalog/spec contracts for implemented Track B behavior.
- [x] Added targeted Track B tests.
- [x] Verified no default `~/.pi` writes from authoring/workflow commands.

## Parity integration acceptance

- [x] Created `olympus-impl/reports/parity-integration-inventory.md`.
- [x] Created `olympus-impl/reports/parity-acceptance-matrix.md`.
- [x] Created `olympus-impl/reports/parity-safety-grep-report.md`.
- [x] Created `olympus-impl/reports/parity-integration-acceptance-report.md`.
- [x] Verified Track A safety decisions are visible in Track C status/handoff reports.
- [x] Verified Track A Hestia policy audit counts are consumable by Track C reports.
- [x] Verified Track B review/module artifacts are bounded by Track A policy gates where needed.
- [x] Verified Track B output-heavy guidance uses Track C RTK-first recommendations.
- [x] Verified Track C compaction preserves Track A/B decision-critical context.
- [x] Ran CLI smoke suite across baseline, Track A, Track B, Track C, install/uninstall apply with fake HOME/temp roots, and interactive quit.
- [x] Ran RTK integration verification with fake RTK and missing RTK.
- [x] Ran safety audit greps and classified matches with no blockers.
- [x] Updated `PLAN.md` for parity integration acceptance.
- [x] Updated docs/specs only where needed for implemented/gated behavior.

## Verification

- [x] `bun run olympus:test`
- [x] Olympus-only TypeScript check: `bunx tsc --noEmit`
- [x] `bunx biome check packages/olympus --max-diagnostics 200`
- [x] CLI smoke: `report status --json`
- [x] CLI smoke: `report handoff --json`
- [x] CLI smoke: `report acceptance --json`
- [x] CLI smoke: `compact <fixture-or-file> --json`
- [x] CLI smoke: `rtk status --json`
- [x] CLI smoke: `quota status --json`
- [x] `git diff --check`
- [x] CLI smoke: `safety check --json`
- [x] CLI smoke: `hooks policy --json`
- [x] CLI smoke: `sandbox check --json`
- [x] CLI smoke: `broker validate <fixture> --json`
- [x] CLI smoke: `trust status --json`
- [x] CLI smoke: `resources validate --json`
- [x] CLI smoke: `prompt contract <input-or-file> --json`
- [x] CLI smoke: `review plan <plan-file> --json`
- [x] CLI smoke: `review diff <diff-file> --json`
- [x] CLI smoke: `handoff current --json`
- [x] CLI smoke: `module status --json`
- [x] CLI smoke: `module run <module> --dry-run --json`
- [x] `bun install --frozen-lockfile`
- [x] Full parity CLI smoke suite
- [x] RTK fake-present/missing integration verification
- [x] Safety grep audit
- [x] `git status --short`
- [x] `git check-ignore -v oal_legacy`

## Follow-up gates

- [ ] Begin any next phase only in a later bounded session.
- [ ] Do not enable live runtime hook execution beyond non-executing Aegis skeleton without a later bounded phase.
- [ ] Do not enable executable package load until trust + lock + sandbox gates pass.
- [ ] Do not enable runtime hook execution until Track A policy fixtures and safety gates pass.
- [ ] Do not enable Hephaestus writes until plan digest, path allowlist, manifest ownership, and Themis approval are proven.
- [ ] Do not treat Olympus module codenames as roleplay personas or grant write authority by prompt instruction.
- [ ] Treat RTK as first-class for output-heavy workflows; record fallback/degraded reasons when unavailable or unsupported.
- [ ] Keep quota limits unknown unless provider-observed data is available.

# Parity Track A — Safety + Runtime Policy

## 1. Bottom line

Track A defines the safety/runtime-policy spine for Olympus: first model and fixture the policy decisions, then wire them into a first-party Pi extension only after fail-closed semantics, audit records, trust/lock checks, and sandbox probes are proven. This is a plan, not an implementation claim.

Facts:
- Olympus 0.1.0 already inspects/evaluates packages without executing package code, blocks executable resources from passive install, writes only project-local Olympus-owned paths, and verifies fake-home/no-global-write behavior.
- Pi extensions can subscribe to lifecycle, model, provider, input, and tool events; `tool_call` can block, `tool_result` can modify output, and `before_provider_request` can inspect or replace provider payloads.

Decisions:
- Aegis owns runtime safety hooks.
- Themis owns policy/approval decisions.
- Hestia owns project-local audit, manifest continuity, and durable state.
- Safety hooks fail closed. Token-efficiency hooks may fail open only after recording the degraded reason.

Unknowns:
- Final executable sandbox backend and host broker shape are not yet proven.
- RTK availability and supported commands must be detected at runtime, not assumed.

## 2. OAL inspiration / retained lessons

Retain these lessons from OAL as Olympus-owned designs:
- Runtime hooks should be executable decisions with deterministic fixtures, not advisory prompt prose.
- Command safety, secret-file/secret-output guards, generated-artifact protection, repeated-failure detection, route/plan contract checks, and large-diff warnings are useful policy categories.
- RTK command enforcement is valuable when it pushes work toward bounded output instead of raw dumps.
- Manifest ownership and uninstall safety matter more than filename conventions.

Reject these OAL patterns:
- Provider-specific renderer/plugin compatibility as the product center.
- Direct copying of OAL hook scripts or third-party code.
- Home-directory global mutation as a normal setup path.
- Unsafe host execution as a standard workflow.

## 3. PiCodingAgent-native design

Aegis is a first-party Pi extension package that subscribes to these events:
- `tool_call`: classify bash/read/write/edit/grep/find/ls/custom-tool requests before execution.
- `tool_result`: redact secret-looking output, attach policy warnings, detect repeated failures, and preserve failure details.
- `before_provider_request`: audit provider payload size, secret-looking values, and prompt/tool bloat without logging raw credentials.
- `input`: detect plan-approval bypass attempts and output-heavy workflows needing RTK guidance.
- `session_start` / `session_shutdown`: load/store Hestia continuity state and write session audit summaries.
- `resources_discover`: expose only Olympus-owned skills/prompts after provenance validation.
- `model_select` / `thinking_level_select`: update quota-pressure/status hints without inventing limits.

Themis is a pure policy module with deterministic input/output JSON decisions. It does not call Pi APIs or mutate files. Aegis calls Themis and enforces the result.

Hestia is a state module writing only `.pi/olympus/**`; it records decisions, degraded compaction/RTK state, plan digests, manifests, and audit events.

## 4. Current Olympus baseline

Implemented baseline:
- Local package inspection/evaluation is read-only and does not execute package code.
- Skills/prompts/themes are passive classes; extensions, hooks, providers, tools, scripts, and lifecycle scripts are executable classes.
- Passive install is dry-run-first and project-local under `.pi/olympus/**` plus `.pi/settings.json` package entries.
- Uninstall is manifest-backed and preserves hash mismatches.
- Extension authoring creates Olympus-owned skeletons only under explicit output directories when applying.
- Verification uses temporary project roots and fake homes.

Not implemented yet:
- Runtime Pi hook extension.
- Executable package trust path.
- OS sandbox/host broker.
- Plan approval gate.
- Provider-payload audit.
- Quota pressure gate.

## 5. Required modules/files

Planned active-source modules:
- `packages/olympus/src/policy/themis.ts` — pure policy decision engine.
- `packages/olympus/src/policy/types.ts` — JSON-safe policy input/output schemas.
- `packages/olympus/src/policy/dangerous-command.ts` — argv-aware dangerous command classifier; no arbitrary shell-string execution.
- `packages/olympus/src/policy/protected-paths.ts` — protected path and generated artifact policy.
- `packages/olympus/src/policy/secrets.ts` — secret-looking value redaction helpers.
- `packages/olympus/src/policy/failure-loop.ts` — repeated failure classifier.
- `packages/olympus/src/hestia/state.ts` — `.pi/olympus` state, audit, manifest, and plan-digest helpers.
- `packages/olympus/src/sandbox/probe.ts` — fake-secret sandbox probe contract.
- `packages/olympus/src/broker/read-only.ts` — read-only gh/git/registry broker schemas.
- `packages/olympus/src/extensions/aegis/index.ts` — Pi extension shell after non-executing tests pass.

Planned fixtures:
- `packages/olympus/test/policy/*.test.ts`
- `packages/olympus/test/sandbox/*.test.ts`
- `packages/olympus/test/broker/*.test.ts`
- `packages/olympus/test/fixtures/fake-home/**`
- `packages/olympus/test/fixtures/generated-artifacts/**`

## 6. CLI commands and Pi extension surfaces

Planned Olympus CLI commands:
- `olympus policy check --event <file> [--json]`: read-only Themis decision check.
- `olympus policy fixtures [--json]`: run policy fixture suite without loading Pi runtime.
- `olympus sandbox probe [--json]`: run fake-secret sandbox probe only in temp roots.
- `olympus broker schema [--json]`: print read-only broker schema/spec.
- `olympus status --json`: later extended with Hestia audit, RTK degraded state, and policy warnings.

Pi extension surfaces:
- `pi.on("tool_call", ...)`
- `pi.on("tool_result", ...)`
- `pi.on("before_provider_request", ...)`
- `pi.on("input", ...)`
- `pi.on("session_start", ...)`
- `pi.on("session_shutdown", ...)`
- `pi.on("resources_discover", ...)`
- `pi.on("model_select", ...)`
- `pi.on("thinking_level_select", ...)`
- `ctx.ui.notify` and `ctx.ui.setStatus` for warnings when UI exists.
- `ctx.sessionManager` for read-only session context; no raw secret reads.
- `pi.appendEntry` only for extension-local non-context state if needed; canonical project state remains `.pi/olympus/**`.

## 7. Data/artifact model

Planned project-local artifacts:
- `.pi/olympus/audit.jsonl`
- `.pi/olympus/policy/decisions.jsonl`
- `.pi/olympus/policy/plan-approvals.json`
- `.pi/olympus/policy/protected-paths.json`
- `.pi/olympus/runtime/aegis-state.json`
- `.pi/olympus/sandbox/probe-report.json`
- `.pi/olympus/broker/allowlist.json`
- `.pi/olympus/rtk/degraded.jsonl`

Policy decision shape:
- `schemaVersion`
- `module`: `aegis` or `themis`
- `eventType`
- `subject`: command/tool/path/provider-payload summary
- `decision`: `allow`, `warn`, `block`, `redact`, `degraded-allow`
- `reasons[]`
- `redactions[]`
- `requiredNextAction?`
- `auditId`
- `timestamp`

No artifact stores raw credentials. Raw payloads are never persisted by default.

## 8. Safety policy

Rules:
- Safety hooks fail closed.
- Token-efficiency hooks fail open only after recording the fallback/degraded reason.
- Hooks must not execute third-party package code.
- Hooks must not be the only OS containment boundary.
- Executable resources remain blocked until trust + lock + sandbox pass.
- No raw credential exposure.
- No arbitrary shell strings in broker APIs.
- No dangerous skip-permissions outside sandbox.
- No `~/.pi` writes by default.

Policy categories:
- Dangerous command/path policy.
- Generated artifact protection.
- Secret output redaction.
- Provider-payload size/secrets audit.
- Third-party executable package blocking.
- Failure-loop detection.
- Large diff/test output warning.
- Plan approval enforcement.
- Quota pressure warning.
- Trust/lock/signage hardening.
- Sandbox probe and executable gate.
- Read-only gh/git/registry broker plan.

## 9. Tests and acceptance fixtures

Required acceptance fixtures:
- Unsafe `tool_call` blocked.
- Protected path operation blocked.
- Generated artifact write blocked without manifest.
- Secret output redacted.
- `before_provider_request` warning/audit works.
- Unsigned package warning.
- Lock mismatch blocks executable load.
- Sandbox cannot read fake `~/.ssh`.
- Sandbox cannot read fake `~/.config/gh`.
- Sandbox cannot read fake `~/.pi/agent/auth.json`.
- Broker denies arbitrary shell.
- Broker permits approved read-only request.
- Quota pressure emits warning but does not invent limits.

Additional checks:
- Policy output is deterministic.
- Redaction happens before compaction/report summaries.
- Aegis refuses to start runtime integration when Themis schemas are invalid.
- Runtime extension tests use mocked Pi events before real Pi loading.

## 10. Implementation slices

A1. Hook policy model and fixtures, no Pi runtime execution yet.
- Define event input fixtures for `tool_call`, `tool_result`, and `before_provider_request`.
- Produce deterministic allow/warn/block/redact decisions.

A2. Aegis first-party extension skeleton and non-executing tests.
- Create Olympus-owned extension shape with declared Pi events.
- Inspect/validate without loading into Pi.

A3. Themis policy decision module.
- Centralize policy tables and explainable decisions.
- Keep I/O JSON-safe and side-effect-free.

A4. Hestia audit/state integration.
- Record policy decisions and degraded reasons under `.pi/olympus/**` only.
- Reuse manifest/lock concepts where possible.

A5. Sandbox probe and fake-secret fixtures.
- Prove future executable support cannot read fake sensitive paths.
- Keep sandbox failure as a hard executable-load block.

A6. Trust/signage hardening.
- Add explicit unsigned, lock mismatch, revoked, and trust-state reports.

A7. Read-only broker schemas and tests.
- Replace arbitrary shell with typed read-only operations for git, gh, and registry reads.
- Deny mutations and raw shell strings.

A8. Runtime integration.
- Wire Aegis to real Pi events only after A1-A7 pass.
- Runtime integration remains first-party only.

## 11. Non-goals

- No OAL compatibility mode.
- No Codex/Claude/OpenCode provider renderer revival.
- No provider plugin sync.
- No execution of third-party package code.
- No uncontrolled swarms.
- No global mutation by default.
- No unsafe-host workflow as normal operation.
- No future non-Pi harness planning.
- No feature implementation in this planning phase.

## 12. Open questions

- Which OS sandbox backend should Olympus standardize on for macOS, Linux, and CI fixtures?
- Should Aegis register custom wrapped tools or only use event hooks around built-ins?
- How should policy warnings display in print/JSON/RPC modes where UI prompts are unavailable?
- What exact trust/signage format should be signed or locked before executable package load?
- Which gh/git/registry read-only broker operations are required first?
- Should quota pressure be status-only or able to pause expensive workflows after user confirmation?

## 13. Source list

Local sources:
- `PLAN.md`
- `docs/security.md`
- `docs/package-model.md`
- `docs/oal-lessons.md`
- `specs/security.md`
- `specs/package-inspection.md`
- `specs/verification.md`
- `specs/roadmap-parity.md`
- `packages/olympus/src/catalog.ts`
- `packages/olympus/src/evaluation.ts`
- `packages/olympus/src/extension-authoring.ts`
- `packages/olympus/src/install-flow.ts`
- `packages/olympus/src/project-status.ts`
- `oal_legacy/specs/04-runtime-hooks.md`
- `oal_legacy/source/hooks/*.json`
- `oal_legacy/packages/runtime/hooks/*` as reference-only inspiration.

Pi docs:
- `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md`
- `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/packages.md`
- `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/session-format.md`

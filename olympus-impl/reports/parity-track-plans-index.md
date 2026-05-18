# Olympus Parity Track Plans Index

## Summary

This planning phase consolidates Olympus OAL-parity work into three large tracks:

- Track A — Safety + Runtime Policy: Aegis runtime hooks, Themis policy/approval decisions, Hestia state/audit continuity, sandbox/trust/broker prerequisites, and fail-closed runtime safety.
- Track B — Authoring + Workflow UX: first-party skills/prompts/commands, plan/diff review, prompt contracts, bounded Olympus modules, and terminal-first workflow feedback.
- Track C — Reporting + Efficiency: deterministic reports, handoffs, acceptance aggregation, RTK-first output compaction, package risk reports, and quota/status display.

These are implementation plans only. No feature code was implemented.

## Dependency graph

```text
C1 report schemas
  ├─> C2 status/handoff
  ├─> C8 acceptance aggregation
  └─> B5 Hermes handoff

A1 policy model
  ├─> A2 Aegis skeleton
  ├─> A3 Themis decisions
  ├─> B6 module shells
  └─> B7 Hephaestus apply gate design

B1 resource schemas
  ├─> B2 first-party skills/prompts
  ├─> B8 workflow extension commands
  └─> C9 reporting extension integration

C3 compaction interfaces
  ├─> C4 RTK detection/policy
  ├─> C5 RTK-first compactors
  ├─> C6 fallback compactors
  └─> Aegis token-efficiency degraded-reason audit

A4 Hestia state
  ├─> A6 trust/signage
  ├─> C2 status/handoff
  ├─> C7 quota status
  └─> B3/B4 workflow artifacts

A5 sandbox probe + A6 trust/signage
  ├─> A7 read-only broker schemas
  ├─> A8 runtime integration
  └─> Hephaestus future apply eligibility
```

## Recommended implementation order

1. Track C C1-C2: report/status/handoff hardening.
2. Track A A1-A3: hook policy and Themis/Aegis models without runtime execution.
3. Track B B1-B2: resource authoring schemas and first-party skills/prompts package.
4. Track C C3-C6: compaction core, RTK detection, RTK-backed command policy, and fallback compactors.
5. Track B B3-B5: prompt contracts, plan review artifacts, Hermes handoff.
6. Track A A4-A6: Hestia audit/state, sandbox probe, trust/signage.
7. Track C C7-C9: quota display, acceptance aggregation, status/risk/compaction extension.
8. Track B B6-B8: Athena/Themis/Apollo shells and workflow extension commands.
9. Track A A7-A8: broker schemas and runtime hook integration.
10. Track B Hephaestus apply flow only after plan digest + safety gates are proven.

## Cross-track safety gates

- Safety policy fails closed.
- Token-efficiency fallback fails open only with recorded degraded reason.
- No executable package load until trust + lock + sandbox pass.
- No third-party package code execution in hooks, inspection, validation, or planning.
- No raw credential exposure in reports, handoffs, provider-payload audits, or compaction summaries.
- No arbitrary shell strings in broker APIs.
- No `~/.pi` writes by default.
- Hephaestus cannot write without approved plan digest, path allowlist, manifest ownership, and Themis approval.

## Shared modules required

- Themis: policy/approval gate.
- Aegis: runtime safety hook extension.
- Hestia: project-local state, audit, manifest, continuity.
- Hermes: compact handoff and routing summaries.
- RTK detection/compaction core.
- Report schema and deterministic JSON/text formatters.
- Resource metadata/provenance validator.

## Top 15 acceptance fixtures to implement first

1. Status/handoff report is deterministic and compact.
2. Unsafe `tool_call` blocked.
3. Protected path operation blocked.
4. Secret output redacted.
5. Before-provider-request warning/audit works without raw credential persistence.
6. Skill/prompt metadata validates.
7. Command collision detected.
8. Support files copied/hashed.
9. RTK detected when present.
10. Fallback/degraded reason recorded when RTK is unavailable.
11. Failing tests remain visible after compaction.
12. Compacted diff preserves filenames and deletion markers.
13. Prompt contract preserves user paths/constraints.
14. Unapproved write plan blocked.
15. Hephaestus rejects missing/changed plan digest.

## Slices that can proceed without sandbox support

- C1 report schema hardening.
- C2 deterministic status/handoff reports.
- C3 compaction core interfaces.
- C4 RTK detection and command policy, if probes are read-only.
- C5/C6 compactors and fallback compactors.
- C7 quota profile/status display.
- C8 acceptance report aggregation.
- B1 resource schemas/validators.
- B2 first-party passive skills/prompts package.
- B3 prompt contract model.
- B4 plan/diff review artifact model.
- B5 Hermes handoff command.
- A1 hook policy model and fixtures.
- A2 non-executing Aegis skeleton.
- A3 Themis policy decision module.

## Slices requiring sandbox/trust/broker prerequisites

- A5 sandbox probe and fake-secret fixtures.
- A6 trust/signage hardening.
- A7 read-only broker schemas and tests.
- A8 runtime integration where unsafe execution would otherwise be possible.
- B7 Hephaestus apply gate beyond blocked design.
- Any executable package load or third-party extension execution.

## Slices touching Pi extensions

- A2 Aegis first-party extension skeleton.
- A8 Aegis runtime integration.
- B8 workflow UX commands.
- C9 status/risk/compaction extension integration.
- B6 module shells if exposed as extension commands.

## Slices touching only CLI/reporting

- C1 report schema hardening.
- C2 deterministic status/handoff reports.
- C3 compaction core interfaces.
- C5/C6 offline compactors.
- C7 quota profile/status display.
- C8 acceptance aggregation.
- B1 resource validators.
- B3 prompt contract artifact writer.
- B4 plan/diff review artifact writer.
- A1 policy fixtures.
- A3 Themis decision CLI.

## RTK-first compaction policy summary

- RTK is the primary compaction backend when available and supported for the output shape.
- Olympus must detect RTK and expose RTK status in reports.
- Supported output-heavy workflows should recommend or use RTK-backed command paths.
- In-house compactors are fallback only for unavailable, unsupported, or insufficient RTK cases.
- Every bypass/fallback records a degraded reason.
- Compaction must preserve exit status, failing tests, error messages, changed/deleted files, redaction notices, policy warnings, blocked reasons, and approval decisions.
- If RTK output drops decision-critical context, Olympus requests raw or verbose fallback.

## Source list

Local sources used:
- `olympus-impl/session-prompts/phase-parity-track-plans.txt`
- `PLAN.md`
- `docs/architecture.md`
- `docs/extensions.md`
- `docs/oal-lessons.md`
- `docs/package-model.md`
- `docs/roadmap.md`
- `docs/security.md`
- `specs/*.md`
- `packages/olympus/src/*.ts`
- `packages/olympus/src/commands/*.ts`
- `oal_legacy/source/hooks/*.json`
- `oal_legacy/source/prompts/*.md`
- `oal_legacy/source/agents/*.json`
- `oal_legacy/specs/*.md`
- `oal_legacy/packages/runtime/hooks/*`
- `oal_legacy/packages/toolchain/src/index.ts`

Pi docs used:
- `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md`
- `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/skills.md`
- `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/prompt-templates.md`
- `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/packages.md`
- `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/compaction.md`
- `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/session-format.md`
- `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/models.md`

Olympus parity track plans complete; no feature implementation performed.

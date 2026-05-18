# Parity Track B — Authoring + Workflow UX

## 1. Bottom line

Track B designs Olympus authoring and workflow UX: first-party skills, prompts, commands, plan/diff review artifacts, prompt contracts, and bounded Olympus agent modules. This track turns useful OAL route/agent ideas into PiCodingAgent-native resources without provider renderers, compatibility mode, or uncontrolled delegation.

Facts:
- Pi supports skills, prompt templates, extension commands, event hooks, custom tools, session state, and project-local package resources.
- Olympus 0.1.0 already inspects Pi resources, validates extension skeleton metadata, mirrors passive resources project-locally, and emits catalog/status output.

Decisions:
- Greek/Olympus names are codenames for bounded modules, not personas.
- Hephaestus is the only write/implementation module and requires approved plan digest, path allowlist, manifest ownership, and Themis approval.
- All other modules are read-only, decision-only, summary-only, ordering-only, or state-only according to their contracts.

Unknowns:
- Exact UI components for plan/diff review may depend on future Pi TUI integration choices.
- File-level lock/manifest queues are needed before safe parallel writes.

## 2. OAL inspiration / retained lessons

Retain these lessons:
- Route contracts, prompt contracts, skills, and named agents helped express reusable workflows.
- Plan/diff review and completion evidence reduced accidental implementation drift.
- Handoff records made long-running work resumable.
- Agent/module names are useful only when paired with concrete duties, tools, and non-goals.

Reject these patterns:
- Provider-specific agent rendering.
- Decorative roleplay personas.
- Broad autonomous swarms.
- Prompt instruction as a way to gain write authority.
- Generated artifacts as the active source of truth.

## 3. PiCodingAgent-native design

First-party resources are authored as Pi packages/resources:
- Skills are `SKILL.md` directories with strict provenance metadata.
- Prompt templates are Markdown files with frontmatter and argument hints where useful.
- Commands are Pi extension commands registered by an Olympus-owned workflow extension.
- Artifacts are project-local `.pi/olympus/**` records.

Workflow loop:
1. Athena creates or reviews a plan digest and architecture notes.
2. Themis approves, denies, or requests edits based on safety policy.
3. Moirai orders tasks and exposes dependencies only.
4. Hephaestus may apply only after approved digest/path allowlist/manifest ownership/Themis approval.
5. Apollo verifies through allowlisted commands and reports evidence.
6. Hermes writes compact handoff/status summaries.
7. Hestia persists Olympus-owned state.
8. Aegis guards runtime actions.

Feedback returns to the Pi session through extension command output, optional `ctx.ui` notifications, and project-local feedback artifacts.

## 4. Current Olympus baseline

Implemented baseline:
- `extension create` and `extension inspect` for first-party extension skeletons and metadata.
- `inspect`, `package evaluate`, `install`, `uninstall`, `status`, `catalog`, `spec`, and `verify` surfaces.
- Passive resource mirrors under `.pi/olympus/packages/<package-id>/package/**` with manifest ownership.
- Catalog/spec source-of-truth output.

Not implemented yet:
- First-party Olympus skill/prompt package.
- Prompt contract artifacts.
- Plan/diff review artifacts.
- Module invocation contracts.
- Hermes handoff command.
- Athena/Themis/Apollo/Hephaestus/Hermes/Hestia/Aegis/Moirai command surfaces.

## 5. Required modules/files

Planned active-source modules:
- `packages/olympus/src/resources/schema.ts` — skill/prompt/command metadata schemas.
- `packages/olympus/src/resources/validate.ts` — provenance and collision validation.
- `packages/olympus/src/resources/package-first-party.ts` — first-party resource package planner.
- `packages/olympus/src/workflow/prompt-contract.ts` — prompt rewrite and execution contract model.
- `packages/olympus/src/workflow/plan-review.ts` — `plan.json`, annotations, and decision artifacts.
- `packages/olympus/src/workflow/diff-review.ts` — diff digest and review annotations.
- `packages/olympus/src/modules/*.ts` — module contracts and fixtures.
- `packages/olympus/src/extensions/workflow/index.ts` — Pi commands for UX.
- `packages/olympus/src/hestia/state.ts` — shared with Track A.

First-party resources to create in implementation slices:
- `safety review` skill.
- `package risk review` skill.
- `extension authoring` skill.
- `sandbox troubleshooting` skill.
- `cleanup audit` skill.
- `verification handoff` skill.
- `plan review` prompt.
- `prompt contract` prompt.
- `quota-aware workflow` prompt.
- `RTK-aware command guidance` prompt/skill.
- `risk report` command.
- `status handoff` command.

## 6. CLI commands and Pi extension surfaces

Planned CLI commands:
- `olympus resources validate <path> [--json]`
- `olympus resources package --first-party [--dry-run|--apply] [--json]`
- `olympus workflow plan review <plan.json> [--json]`
- `olympus workflow diff review [--json]`
- `olympus workflow prompt contract <prompt.md> [--json]`
- `olympus handoff write [--json]`
- `olympus risk report <package-path> [--json]`

Planned Pi extension commands:
- `/olympus-plan-review`
- `/olympus-prompt-contract`
- `/olympus-risk-report`
- `/olympus-status-handoff`
- `/olympus-quota-aware-workflow`
- `/olympus-rtk-guidance`

Pi APIs/surfaces:
- `pi.registerCommand` for workflow commands.
- `pi.getCommands` to detect command collisions and provenance.
- `resources_discover` to contribute validated resources only.
- `input` to intercept workflow commands or prompt-contract checks.
- `before_agent_start` to add bounded guidance only after preserving user paths/constraints.
- `ctx.ui.editor`, `ctx.ui.confirm`, and `ctx.ui.custom` for terminal-first review where UI exists.
- `ctx.sessionManager` for read-only session/handoff context.

## 7. Data/artifact model

Artifacts:
- `.pi/olympus/workflow/plan.json`
- `.pi/olympus/workflow/diff.json`
- `.pi/olympus/workflow/annotations.json`
- `.pi/olympus/workflow/decision.json`
- `.pi/olympus/workflow/feedback.md`
- `.pi/olympus/workflow/prompt-contract.json`
- `.pi/olympus/workflow/role-invocation.json`
- `.pi/olympus/handoff/current.md`
- `.pi/olympus/audit.jsonl`

Core artifact fields:
- `schemaVersion`
- `createdAt`
- `sourcePaths[]`
- `digest`
- `module`
- `allowedPaths[]`
- `decision`: `approve`, `deny`, `needs-edit`, `blocked`
- `reasons[]`
- `feedbackPath?`
- `themisDecisionId?`

Resource metadata fields:
- `name`, `description`, `resourceKind`, `olympusOwned`, `provenance`, `supportFiles[]`, `hashes[]`, `commands[]`, `nonGoals[]`, `verification`.

## 8. Safety policy

Rules:
- No uncontrolled swarm behavior.
- No module gains write authority by prompt instruction.
- Hephaestus is the only implementation/write module.
- Hephaestus requires approved plan digest, path allowlist, manifest ownership, and Themis approval.
- Athena plans but cannot apply.
- Themis gates but does not implement.
- Apollo verifies but cannot mutate project source.
- Hermes summarizes but cannot alter decisions.
- Hestia writes only Olympus-owned state.
- Aegis blocks unsafe runtime actions but does not execute package code.
- Moirai orders tasks but does not execute them.
- Parallel work is read-only only unless future file-level lock/manifest queues exist.
- No external server by default.
- No repo reads unless explicitly requested.
- Preview before editor replacement.
- Output-heavy workflows should prefer RTK-backed commands where available.

## 9. Tests and acceptance fixtures

Required acceptance fixtures:
- Skill/prompt metadata validates.
- Command collision detected.
- Support files copied/hashed.
- Prompt contract preserves user paths/constraints.
- Unapproved write plan blocked.
- Approval digest mismatch blocks continuation.
- Athena cannot write.
- Themis blocks unsafe action.
- Apollo rejects commands outside allowlist.
- Hephaestus rejects missing/changed plan digest.
- Hermes produces compact handoff without reading secrets.
- Hestia refuses writes outside `.pi/olympus`.
- Moirai produces dependency graph only.
- No module writes to `~/.pi` by default.
- RTK-aware guidance appears for output-heavy commands when RTK is available.

Additional checks:
- Prompt rewrite never drops user-stated paths, constraints, or non-goals.
- Plan review emits `approve`, `deny`, or `needs-edit` with reason codes.
- Diff digest preserves changed files, deletions, and safety warnings.
- Command output is deterministic in JSON mode.

## 10. Implementation slices

B1. Resource authoring schemas and validators.
- Define first-party resource metadata.
- Validate command collisions and support-file hashes.

B2. First-party skills/prompts package.
- Add the six skills and four prompts as Olympus-owned passive resources.
- Keep them installable only through manifest-owned project-local package flow.

B3. Prompt contract artifact model.
- Preserve user paths, constraints, requested validation, and non-goals.
- Emit prompt-contract JSON before execution.

B4. Plan/diff review artifact model.
- Define `plan.json`, `diff.json`, annotations, decisions, and feedback.
- Add terminal-first review output.

B5. Hermes handoff command.
- Write compact `.pi/olympus/handoff/current.md` without secrets.
- Include objective, done, next, blockers, changed files, and validation state.

B6. Athena/Themis/Apollo module shells with read-only fixtures.
- Implement module contracts without write authority.
- Verify denied mutations.

B7. Hephaestus apply gate design, blocked until safety gates pass.
- Model apply prerequisites but keep apply blocked until Track A gates prove safety.

B8. Pi extension commands for workflow UX.
- Register workflow slash commands and UI previews.
- Keep non-interactive modes JSON/text safe.

## 11. Non-goals

- No feature code in this planning phase.
- No provider-specific renderer revival.
- No OAL compatibility mode.
- No direct OAL/third-party code copying.
- No global `~/.pi` writes by default.
- No uncontrolled subagent/swarm execution.
- No external server by default.
- No write authority by prompt-only instruction.
- No non-Pi harness planning.

## 12. Open questions

- What frontmatter should Olympus add beyond Pi skill/prompt requirements without reducing compatibility?
- Should the first-party skills/prompts be bundled as a local package fixture or generated by CLI?
- How much plan-review UI belongs in terminal TUI versus deterministic CLI output?
- How should Hephaestus integrate with Pi's per-file mutation queue if it eventually exposes a mutating custom tool?
- What approval digest should include to prevent confused-deputy continuation?
- Should Hermes use Pi branch summaries, Olympus handoff files, or both?

## 13. Source list

Local sources:
- `PLAN.md`
- `docs/extensions.md`
- `docs/package-model.md`
- `docs/oal-lessons.md`
- `docs/roadmap.md`
- `specs/cli.md`
- `specs/extension-authoring.md`
- `specs/roadmap-parity.md`
- `packages/olympus/src/catalog.ts`
- `packages/olympus/src/extension-authoring.ts`
- `packages/olympus/src/install-flow.ts`
- `packages/olympus/src/project-status.ts`
- `oal_legacy/source/prompts/*.md`
- `oal_legacy/source/agents/athena.json`
- `oal_legacy/source/agents/apollo.json`
- `oal_legacy/source/agents/hephaestus.json`
- `oal_legacy/source/agents/hermes.json`
- `oal_legacy/source/agents/hestia.json`
- `oal_legacy/source/agents/themis.json`

Pi docs:
- `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md`
- `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/skills.md`
- `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/prompt-templates.md`
- `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/packages.md`

# 09 — Migration Roadmap and Delivery Plan

No calendar estimates are included. The plan is dependency-ordered by phase and acceptance gates.

## Migration principle

Do not rewrite everything at once. A previous v4 attempt was reverted. V4 should be built as a compiler core first, then adapters, then install/runtime, then migration.

## Phase 0 — Freeze v3 as evidence

### Work

1. Tag current v3 branch state.
2. Move old generated/provider folders into explicit generated-output classification.
3. Mark `v3_legacy/` or equivalent as evidence only, not source.
4. Create a source map of current agents, skills, commands, hooks, and model plans.
5. Record all known broken agents and contract mismatches.

### Acceptance gate

- All current v3 capabilities are listed.
- Every v3 source/output path is classified: source, generated, evidence, or obsolete.
- No v4 code reads from generated v3 directories as source.

## Phase 1 — Source graph and schemas

### Work

1. Define schemas for agents, skills, routes, policies, model plans, surface configs, and integrations.
2. Write typed loader package.
3. Convert current source records to v4 shape without changing generated output yet.
4. Add graph reference validation.
5. Add contract/tool/model plan validation.

### Acceptance gate

- `oal check` loads the full source graph.
- Contract mismatch diagnostics catch known Calliope/Odysseus-style problems.
- Missing model assignment is an error.
- Unsupported provider hook mapping is an error or explicit unsupported diagnostic.

## Phase 2 — Model routing package

### Work

1. Encode Codex Plus, Pro 5x, Pro 20x plans.
2. Encode Claude Max 5x and Max 20x plans.
3. Encode OpenCode provider/model ID strategy.
4. Add budget pressure states and xhigh/max guards.
5. Add `oal explain route` to show model/effort reasoning.

### Acceptance gate

- Every route resolves model, effort, verbosity, provider, and permission posture.
- No default plan emits xhigh or max.
- Pro 20x differs from Pro 5x by concurrency/escalation allowance, not blanket effort.
- Claude `[1m]` variants require large-context justification.

## Phase 3 — Codex adapter first

### Work

1. Render `.codex/config.toml` from source graph.
2. Render `.codex/agents/*.toml` with resolved model plan assignments.
3. Render Codex skills with provenance.
4. Render Codex route commands.
5. Render only supported Codex hooks/policies.
6. Validate against schema-derived allowlist.

### Acceptance gate

- `oal render --surface codex` emits deterministic artifacts.
- Existing sample config contradictions are gone.
- Feature flags come from source presets.
- Every agent TOML has model/effort from model plan.
- No fake `SubagentStart` mapping is emitted.

## Phase 4 — Claude Code adapter

### Work

1. Render `.claude/settings.json` with structured ownership.
2. Render agents and skills.
3. Render hooks from typed policy records.
4. Add `effortLevel` policy with conservative defaults.
5. Add statusline and memory/handoff only as opt-in or project-managed blocks.

### Acceptance gate

- Settings validate against SchemaStore.
- Hook events are valid.
- Effort policy respects model support.
- Project install does not overwrite user/managed preferences.

## Phase 5 — OpenCode adapter

### Work

1. Render `opencode.json` or JSONC.
2. Render `.opencode/agents`, `.opencode/commands`, `.opencode/skills`, and plugin config.
3. Use `permission` field, not deprecated `tools`, except compatibility output.
4. Require exactly one primary `default_agent`.
5. Map OAL subagents to OpenCode primary/subagent modes.

### Acceptance gate

- Config validates against OpenCode schema.
- Default agent is primary.
- Commands reference valid agents.
- Permissions align with contracts.
- Snapshot/compaction/watchers are deliberate, not accidental.

## Phase 6 — Runtime policies and tests

### Work

1. Port policy scripts into self-contained runtime package.
2. Add function-level tests.
3. Add rendered-script tests.
4. Add provider mapping tests.
5. Add route completion gate tests.
6. Add RTK/Caveman/Taste safe-scope tests.

### Acceptance gate

- Every policy has fixture coverage.
- Unsupported provider mappings are explicit.
- Runtime scripts do not import source-tree files after install.
- Safe-scope tests prove code/commands/JSON are not rewritten.

## Phase 7 — Installer and migration

### Work

1. Implement install manifest writer.
2. Implement structured TOML/JSON merge.
3. Implement marked text blocks.
4. Implement rollback/uninstall.
5. Implement v3 migration detection for old `openagentsbtw` blocks and profile IDs.
6. Add dry-run diff output.

### Acceptance gate

- Dry-run describes every create/update/delete/conflict.
- Install writes manifest entries for every artifact.
- Uninstall removes only manifest-owned content.
- User edits are preserved or conflict-reported.
- v3 aliases migrate cleanly to v4 names.

## Phase 8 — Eval harness and release hardening

### Work

1. Build fixture repos.
2. Add route smoke tasks.
3. Add budget-efficiency checks.
4. Add headless provider checks when CLIs are available.
5. Add CI matrix for schema/render/runtime tests.
6. Add release notes and docs.

### Acceptance gate

- `oal eval --suite smoke --surface all` passes.
- Route fixtures catch broken contract/tool mappings.
- Budget suite catches xhigh/max misuse.
- Generated output diff is deterministic.

## Migration commands

```bash
oal migrate audit-v3
oal migrate plan --from openagentsbtw --to openagentlayer
oal migrate render --dry-run
oal migrate apply --surface codex --scope project
oal migrate verify --surface all
oal migrate rollback --surface codex
```

## V3 compatibility mapping

| v3 name                                        | v4 name                                            | Action                                      |
| ---------------------------------------------- | -------------------------------------------------- | ------------------------------------------- |
| `openagentsbtw`                                | `openagentlayer` / `oal`                           | Rename in new artifacts; detect old blocks. |
| `oabtw-*` commands                             | `oal-*` commands                                   | Provide migration alias, then deprecate.    |
| `source/commands/codex/*.json`                 | `source/routes/*.toml` + provider command overlays | Normalize route ownership.                  |
| old generated `claude/`, `codex/`, `opencode/` | `generated/<surface>/`                             | Do not treat as source.                     |
| ad hoc subscription JS                         | `source/model-plans/*.toml`                        | Move to typed records.                      |
| monolithic generator                           | adapter packages                                   | Delete after parity.                        |

## Risk controls

1. Keep a `v3-capability-recovery.md` matrix and update it only from tests.
2. Port one route at a time: explore, plan, implement, review, test, document.
3. Port one provider first: Codex.
4. Avoid adding extended agents until core agents pass contract tests.
5. Keep third-party skills pinned; no live remote fetch during render.
6. Never install without dry-run in migration mode.

## Definition of done for v4 alpha

- Source graph typed and validated.
- Codex adapter renders clean project artifacts.
- Core seven/eight agents have contract-correct permissions.
- Model plans support Plus, Pro 5x, Pro 20x without default xhigh.
- Runtime policies run in direct and rendered-script tests.
- Installer dry-run and manifest exist.

## Definition of done for v4 beta

- Claude and OpenCode adapters render and validate.
- Installer can apply and uninstall project scope for all three surfaces.
- Migration from v3 blocks works.
- Core route eval suite passes.
- Caveman, Taste Skill, and RTK are scoped and measured.

## Definition of done for v4 stable

- Headless provider checks pass where CLIs are installed.
- Extended agents are optional and validated.
- Usage ledger and deficit guards work.
- Docs explain what OAL is and is not.
- No v3 source path remains active.

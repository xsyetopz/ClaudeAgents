# 09 - Roadmap and Delivery Plan

No calendar estimates are included. `PLAN.md` is the canonical implementation
plan; this document expands its dependency-ordered phases and acceptance gates.

## Delivery principle

Do not rewrite everything at once. A previous v4 attempt was reverted. V4 should
be built as a compiler core first, then one provider renderer, then deploy
safety, then the remaining renderers, then runtime policies and evals.

`v3_legacy/` is reference-only evidence. V4 code must not read it for any
implementation path.

## Phase 1 - Graph, Routes, Models, CLI Check

### Work

1. Create `packages/graph`, `packages/routes`, `packages/models`, and
   `packages/cli`.
2. Define schemas for agents, skills, routes, commands, policies, model plans,
   surfaces, integrations, and prompt layers.
3. Add typed source graph loading from authored `source/` records.
4. Add graph reference validation with provenance.
5. Add route contract, permission compatibility, model-plan completeness, and
   budget guard validation.
6. Implement `oal check`.
7. Add only explicit WIP CLI stubs for agreed future commands.

### Acceptance gate

- `oal check` loads the full source graph without reading `v3_legacy/`.
- Missing references, contract/permission mismatches, missing model
  assignments, unsupported provider mappings, and default `xhigh`/Claude `max`
  usage are diagnostics.
- WIP commands exit nonzero and clearly say they are not implemented.

## Phase 2 - Codex Render

### Work

1. Create `packages/render` with provider modules under `src/`.
2. Add common artifact set types.
3. Render Codex config, agents, route commands, skills, supported policy
   references, and managed `AGENTS.md` blocks.
4. Validate Codex artifacts against a pinned schema or explicit allowlist.
5. Implement `oal render --surface codex`.

### Acceptance gate

- `oal render --surface codex` emits deterministic artifacts.
- Every Codex agent artifact resolves model and effort from the selected model
  plan.
- Feature flags come from source presets.
- Unsupported Codex hooks produce diagnostics and do not render fake behavior.

## Phase 3 - Deploy Lifecycle

### Work

1. Create `packages/deploy`.
2. Implement rendered artifact deploy planning.
3. Implement dry-run output with create, update, unchanged, delete, and conflict
   actions.
4. Implement project-scope manifest format.
5. Implement full-file ownership writes, marked text blocks, and structured
   JSON/TOML merges.
6. Implement conflict detection before writes, apply, rollback, and undeploy.
7. Implement:
   - `oal deploy --surface codex --scope project --dry-run`
   - `oal deploy --surface codex --scope project`
   - `oal undeploy --surface codex --scope project`

### Acceptance gate

- Dry-run mutates nothing and describes every planned action.
- Apply writes only manifest-owned artifacts.
- Conflicts abort before partial writes.
- Rollback and undeploy remove only manifest-owned content and preserve
  user-owned content.

## Phase 4 - Claude Code Render

### Work

1. Implement Claude Code rendering in `packages/render/src/claude.ts`.
2. Render `.claude/settings.json`, agents, skills, supported hooks, and managed
   `CLAUDE.md` blocks.
3. Validate settings keys, hook events, permissions, and generated artifacts.
4. Enable Claude render and deploy only when render validation is complete.

### Acceptance gate

- Claude settings validate against SchemaStore or a pinned allowlist.
- Hook events are valid.
- Effort policy respects model support.
- Project deploy does not overwrite user or managed preferences.

## Phase 5 - OpenCode Render

### Work

1. Implement OpenCode rendering in `packages/render/src/opencode.ts`.
2. Render `opencode.json` or `opencode.jsonc`, agents, commands, skills,
   permissions, plugins, and a valid `default_agent`.
3. Use the current `permission` field except where an explicit compatibility
   output is source-owned.
4. Enable OpenCode render and deploy only when render validation is complete.

### Acceptance gate

- Config validates against OpenCode schema.
- Exactly one default primary agent is rendered.
- Commands reference valid agents.
- Permissions align with route contracts.

## Phase 6 - Runtime Policies and Eval

### Work

1. Add runtime policy execution only after provider render/deploy paths are
   stable.
2. Add policy fixture tests for direct function behavior.
3. Add rendered-policy tests for provider-specific wrappers.
4. Add smoke evals for route behavior and provider integration safety.
5. Add `oal eval` only when it runs real behavioral checks.
6. Add `oal doctor` only when it checks real local prerequisites.

### Acceptance gate

- Every policy has fixture coverage.
- Unsupported provider mappings are explicit.
- Runtime scripts do not import source-tree files after deploy.
- Evals check behavior and provider safety, not prompt prose snapshots.

## Risk Controls

1. Keep `v3_legacy/` as evidence only.
2. Port one provider first: Codex.
3. Port one route at a time: explore, plan, implement, review, test, document.
4. Avoid adding extended agents until core agents pass contract tests.
5. Keep third-party skills pinned; no live remote fetch during render.
6. Never deploy without a dry-run path and manifest preview.

## Definition of Done for v4 Alpha

- Source graph typed and validated.
- Codex adapter renders clean project artifacts.
- Codex project deploy dry-run and manifest exist.
- Core seven/eight agents have contract-correct permissions.
- Model plans support Plus, Pro 5x, Pro 20x without default xhigh.

## Definition of Done for v4 Beta

- Claude and OpenCode adapters render and validate.
- Deploy can apply and undeploy project scope for all three surfaces.
- Core route smoke suite passes.
- Caveman, Taste Skill, and RTK are scoped and measured.

## Definition of Done for v4 Stable

- Headless provider checks pass where CLIs are installed.
- Extended agents are optional and validated.
- Usage ledger and deficit guards work.
- Runtime policies run in direct and rendered-script tests.
- Docs explain what OAL is and is not.
- No v3 source path, compatibility path, detection path, migration path, or
  alias path exists.

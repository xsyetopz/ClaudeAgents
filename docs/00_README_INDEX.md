# OpenAgentLayer v4 Documentation Pack

Retrieval date: 2026-05-01.

This pack proposes a full v4 redesign for `xsyetopz/OpenAgentLayer`, formerly `openagentsbtw`. It treats v4 as a provider-native agent surface compiler: a typed source graph becomes Codex, Claude Code, and OpenCode artifacts with explicit ownership, validation, runtime policy coverage, and model-budget discipline.

The central recommendation is not to keep patching v3. V3 contains useful ideas, but its operational shape is wrong: generated artifacts, provider-specific behavior, route contracts, model routing, hooks, and installer side effects are too entangled. V4 should be smaller at the source layer and stricter at the generated layer.

## Ordered documents

1. `01_CURRENT_STATE_V3_AUDIT.md` — what exists, what is wrong, and why the problem is structural.
2. `02_V4_PRODUCT_DEFINITION.md` — what v4 is and is not.
3. `03_SOURCE_GRAPH_AND_SCHEMA_SPEC.md` — typed source records, invariants, and validation rules.
4. `04_PROVIDER_ADAPTERS_SPEC.md` — Codex, Claude Code, and OpenCode rendering contracts.
5. `05_MODEL_ROUTING_USAGE_EFFICIENCY_SPEC.md` — model, effort, subscription, and weekly-usage policy.
6. `06_AGENT_AND_SUBAGENT_REGISTRY_SPEC.md` — existing and proposed Greek-god role registry.
7. `07_PROMPT_SKILL_HOOK_POLICY_SPEC.md` — prompt contracts, skills, RTK, Caveman, Taste, and hooks.
8. `08_INSTALLER_RUNTIME_VALIDATION_SPEC.md` — install modes, manifests, E2E checks, and observability.
9. `09_MIGRATION_ROADMAP_AND_DELIVERY_PLAN.md` — dependency-ordered migration phases and acceptance gates.
10. `10_MACOS_LINUX_CLI_SUPERCHARGE.md` — terminal tooling and command replacements for developer velocity.
11. `11_RESEARCH_NOTES_AND_SOURCE_MAP.md` — source map and research notes.

## v4 one-sentence definition

OpenAgentLayer v4 is a typed source-of-truth compiler for agent roles, skills, route contracts, runtime policies, provider config, and model-budget profiles across Codex, Claude Code, and OpenCode.

## v4 non-goals

V4 should not pretend to be a general agent framework. It should not own the model runtime, invent its own orchestration engine, or fake parity where providers expose different primitives. It should not make all tools behave like Claude Code hooks. It should not treat RTK, Caveman, Taste, or any other prompt layer as a universal answer to weak task execution.

## Immediate priorities

The first v4 work should be a source graph and validation compiler, not another full rewrite of rendered outputs. Build the source model, generate one provider at a time, and only then port the full runtime policy set. A reverted v4 attempt already showed that a large all-at-once package split is too fragile.

## Recommended package shape

```text
packages/source          typed loaders, schemas, normalization, provenance
packages/model-routing   plan matrix, budget rules, per-role model resolution
packages/contracts       route contracts, tool permissions, completion criteria
packages/render-codex    Codex TOML, agents, skills, hooks, config validation
packages/render-claude   Claude settings, agents, skills, hooks, statusline
packages/render-opencode OpenCode config, agents, commands, skills, plugins
packages/runtime         provider-neutral policies plus provider adapters
packages/install         manifest-aware writer, merger, rollback, uninstall
packages/eval            golden tests, headless CLI tests, task benchmark runner
packages/cli             oal render/check/install/diff/eval/migrate
```

## Suggested success definition

V4 succeeds when a user can run:

```bash
oal check
oal render --surface codex --plan pro-5 --out generated/codex
oal render --surface claude --plan max-5 --out generated/claude
oal render --surface opencode --plan max --out generated/opencode
oal install --surface codex --scope project --dry-run
oal eval --suite smoke --surface all
```

and get deterministic artifacts, no schema drift, no unmanaged rewrites, no broken agents, no fake provider hooks, and a clear reason for every emitted model, effort, permission, skill, and hook.

# OpenAgentLayer v4 Documentation Pack

Retrieval date: 2026-05-01.

This pack supports the canonical implementation plan in `PLAN.md`. It proposes a full v4 redesign for `xsyetopz/OpenAgentLayer`: a typed source graph becomes Codex, Claude Code, and OpenCode artifacts with explicit ownership, validation, runtime policy coverage, and model-budget discipline.

The central recommendation is not to keep patching v3. V3 contains useful ideas, but its operational shape is wrong: generated artifacts, provider-specific behavior, route contracts, model routing, hooks, and deploy side effects are too entangled. V4 should be smaller at the source layer and stricter at the generated layer.

## Ordered documents

1. `01_CURRENT_STATE_V3_AUDIT.md` — what exists, what is wrong, and why the problem is structural.
2. `02_V4_PRODUCT_DEFINITION.md` — what v4 is and is not.
3. `03_SOURCE_GRAPH_AND_SCHEMA_SPEC.md` — typed source records, invariants, and validation rules.
4. `04_PROVIDER_ADAPTERS_SPEC.md` — Codex, Claude Code, and OpenCode rendering contracts.
5. `05_MODEL_ROUTING_USAGE_EFFICIENCY_SPEC.md` — model, effort, subscription, and weekly-usage policy.
6. `06_AGENT_AND_SUBAGENT_REGISTRY_SPEC.md` — existing and proposed Greek-god role registry.
7. `07_PROMPT_SKILL_HOOK_POLICY_SPEC.md` — prompt contracts, skills, RTK, Caveman, Taste, and hooks.
8. `08_DEPLOY_RUNTIME_VALIDATION_SPEC.md` — deploy modes, manifests, E2E checks, and observability.
9. `09_ROADMAP_AND_DELIVERY_PLAN.md` — dependency-ordered build phases and acceptance gates.
10. `10_MACOS_LINUX_CLI_SUPERCHARGE.md` — terminal tooling and command replacements for developer velocity.
11. `11_RESEARCH_NOTES_AND_SOURCE_MAP.md` — source map and research notes.
12. `12_ACTION_SKILL_CATALOG.md` — verb-first Agent Skill catalog, folder contract, and activation rules.
13. `13_SKILL_FRONTMATTER_RENDERING.md` — provider-specific Agent Skill frontmatter rules and render targets.
14. `14_SOURCE_GRAPH_INVENTORY.md` — seeded v4 source graph record inventory and validation boundaries.

## v4 one-sentence definition

OpenAgentLayer v4 is a typed source-of-truth compiler for agent roles, skills, route contracts, runtime policies, provider config, and model-budget profiles across Codex, Claude Code, and OpenCode.

## v4 non-goals

V4 should not pretend to be a general agent framework. It should not own the model runtime, invent its own orchestration engine, or fake parity where providers expose different primitives. It should not make all tools behave like Claude Code hooks. It should not treat RTK, Caveman, Taste, or any other prompt layer as a universal answer to weak task execution.

## Immediate priorities

The first v4 work should be a source graph and validation compiler, not another full rewrite of rendered outputs. Build the source graph, render one provider at a time, add deploy safety, and only then port the full runtime policy set. A reverted v4 attempt already showed that a large all-at-once package split is too fragile.

## Recommended package shape

```text
packages/graph   typed loaders, schemas, normalization, provenance
packages/routes  route contracts, tool permissions, completion criteria
packages/models  plan matrix, budget rules, per-role model resolution
packages/render  provider-native artifact renderers for Codex, Claude, OpenCode
packages/deploy  manifest-aware deploy, merge, rollback, and undeploy
packages/cli     oal check/render/deploy/undeploy command dispatch
```

## Suggested success definition

V4 succeeds when a user can run:

```bash
oal check
oal render --surface codex --plan pro-5 --out generated/codex
oal render --surface claude --plan max-5 --out generated/claude
oal render --surface opencode --plan max --out generated/opencode
oal deploy --surface codex --scope project --dry-run
oal undeploy --surface codex --scope project
oal eval --suite smoke --surface all
```

and get deterministic artifacts, no schema drift, no unmanaged rewrites, no broken agents, no fake provider hooks, and a clear reason for every emitted model, effort, permission, skill, and hook.

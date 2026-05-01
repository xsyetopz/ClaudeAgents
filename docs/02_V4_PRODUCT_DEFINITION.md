# 02 — V4 Product Definition

## Product thesis

OpenAgentLayer v4 is a provider-native agent surface compiler. It lets a maintainer author roles, skills, commands, route contracts, runtime policies, and model plans once, then compile them into provider-specific artifacts for Codex, Claude Code, and OpenCode.

V4 is not a new agent runtime. It delegates actual reasoning, tool execution, subagent spawning, permissions, and UI behavior to the provider. OAL owns the source graph, rendering, validation, installation, migration, and policy tests.

## Primary users

1. Individual power users who want tuned Codex, Claude Code, and OpenCode setups without hand-maintaining three config systems.
2. Teams that need consistent agent routes, safety policy, skills, and model-budget behavior across multiple developer machines.
3. Agent-tooling maintainers who want to add roles and skills without editing a monolithic generator.

## Product surfaces

### CLI

```bash
oal init
oal check
oal render --surface codex --plan pro-5 --out generated/codex
oal render --surface claude --plan max-5 --out generated/claude
oal render --surface opencode --plan max --out generated/opencode
oal diff --surface all
oal install --surface codex --scope project --dry-run
oal uninstall --surface codex --scope project
oal eval --suite smoke --surface all
oal explain route implement --surface codex --plan pro-5
```

### Source graph

The source graph is the one authoritative input. It is not generated from old output folders. Rendered folders are disposable.

```text
source/
  agents/
  skills/
  commands/
  policies/
  routes/
  model-plans/
  surfaces/
  integrations/
  prompt-layers/
  schemas/
```

### Generated artifacts

Generated outputs should be grouped by surface and scope.

```text
generated/
  codex/project/.codex/config.toml
  codex/project/.codex/agents/*.toml
  codex/project/.codex/openagentlayer/skills/*/SKILL.md
  codex/project/.codex/openagentlayer/runtime/*.mjs
  claude/project/.claude/settings.json
  claude/project/.claude/agents/*.md
  claude/project/.claude/skills/*/SKILL.md
  opencode/project/opencode.json
  opencode/project/.opencode/agents/*.md
  opencode/project/.opencode/commands/*.md
```

## Name and positioning

Use “OpenAgentLayer” publicly. Use “OAL” internally. Stop using `openagentsbtw` in new artifacts except for compatibility uninstall/migration detection.

Suggested tagline:

> Provider-native agent roles, skills, policies, and model budgets compiled from one source graph.

## Capability model

OAL v4 should organize around capabilities, not providers.

| Capability | Human-facing route | Typical owner      | Output                       |
| ---------- | ------------------ | ------------------ | ---------------------------- |
| Explore    | `/oal explore`     | Hermes / Artemis   | Source map with citations    |
| Plan       | `/oal plan`        | Athena             | Decision and task plan       |
| Implement  | `/oal implement`   | Hephaestus         | Code diff and verification   |
| Review     | `/oal review`      | Nemesis / Themis   | Findings with severity       |
| Test       | `/oal test`        | Atalanta           | Test evidence and root cause |
| Document   | `/oal document`    | Calliope           | Docs/changelog/ADR           |
| Design     | `/oal design`      | Apollo / Aphrodite | UI/design guidance or diff   |
| Debug      | `/oal debug`       | Ares / Hermes      | Reproduction and fix path    |
| Migrate    | `/oal migrate`     | Demeter / Hestia   | Migration plan and checks    |
| Release    | `/oal release`     | Hestia / Nemesis   | release checklist/evidence   |

## Boundary decisions

### OAL owns

- source schema and validation;
- route contracts and provider mapping;
- model/effort/budget policy;
- generated prompt and skill packages;
- hook/policy scripts;
- install manifest and rollback;
- headless smoke/eval harness;
- migration from v3 output names.

### OAL does not own

- model APIs;
- provider authentication;
- provider UI behavior;
- true task scheduling across providers;
- long-term memory beyond provider-native memory/config hooks;
- automatic agent-marketplace syncing beyond pinned imports.

## V4 architecture

```text
Author source records
      ↓
Load typed source graph
      ↓
Normalize aliases and deprecations
      ↓
Validate graph invariants
      ↓
Resolve selected surface + model plan
      ↓
Render provider-native artifacts
      ↓
Validate against upstream schemas
      ↓
Generate install manifest
      ↓
Dry-run diff / install / rollback
      ↓
Run provider headless smoke tests
```

## Required package responsibilities

### `packages/source`

Loads JSON, TOML, YAML, and Markdown records. Normalizes old names. Validates source graph invariants. Tracks provenance. No provider-specific rendering.

### `packages/model-routing`

Resolves role, route, provider, plan, model, effort, verbosity, context-window, and budget. No filesystem writes. No prompt rendering.

### `packages/contracts`

Defines route completion semantics. Example contracts: `readonly`, `edit-required`, `execution-required`, `review-required`, `handoff-required`, `interactive-confirmation-required`.

### `packages/render-*`

Each provider gets its own renderer. Renderers consume the normalized graph and selected plan; they do not invent defaults.

### `packages/runtime`

Holds policy scripts and a small runtime decision protocol. Every policy must be testable both as direct function and rendered script.

### `packages/install`

Writes files using declared install modes. Handles structured merges, marked text blocks, full-file ownership, hash validation, rollback, and uninstall.

### `packages/eval`

Runs golden render tests, provider schema validation, headless CLI smoke tests, and task outcome benchmarks.

## Quality bars

1. No artifact is emitted without a source record and provenance.
2. No source record can reference a missing role, skill, route, policy, model, or provider surface.
3. No role may have a write tool under a readonly contract.
4. No route may use `xhigh` or Claude `max` effort without an explicit budget exception.
5. No provider renderer may emit unsupported keys unless marked pass-through and source-owned.
6. No provider adapter may claim support for a hook event that the provider does not expose.
7. No installed file may be overwritten without a manifest entry or explicit conflict policy.
8. No integration may be copied from upstream without version/pin/provenance metadata.

## Product risk

The main v4 risk is repeating the failed pattern: trying to convert source, packages, providers, installer, hooks, prompts, and model plans in one sweep. V4 should first compile a minimal source graph to one provider, then expand. The migration plan in `09_MIGRATION_ROADMAP_AND_DELIVERY_PLAN.md` is ordered accordingly.

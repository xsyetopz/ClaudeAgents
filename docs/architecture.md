# Architecture

openagentsbtw now treats the canonical source as a set of small authored catalogs plus per-skill bodies.

## Source Layout

- `source/agents/<agent>/`
  Agent metadata and prompt. One directory per agent.
- `source/skills/<skill>/`
  Skill metadata, body, references, helper scripts, and optional overlays.
- `source/commands/codex/*.json`
- `source/commands/copilot/*.json`
- `source/commands/opencode/*.json`
  One file per generated command surface.
- `source/catalog/loaders.mjs`
  Shared catalog loader used by the generator.

## Generator Rule

`scripts/generate.mjs` should stay a thin orchestrator.

Heavy logic belongs in focused renderers or loaders. If a file starts to become a grab-bag, split it.

## Naming Rule

- public command names should read like actions
- skills should describe one job
- routes should not bundle policy and task into one opaque word

Examples:

- `document` instead of `docs`
- `deslop` instead of the old longer name
- `design-polish` instead of a meme or vendor-specific name
- modifiers like `--speed fast` or `--runtime long` instead of dedicated one-off routes

## Workflow

Research -> Plan -> Execute -> Review

`orchestrate` coordinates this flow when needed. It is not a catch-all delivery bucket.

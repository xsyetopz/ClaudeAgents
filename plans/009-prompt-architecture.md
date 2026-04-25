# Prompt Architecture

v4 prompt architecture is small-core plus lazy capability loading.

## Always-On Core

Contains only:

- identity
- task completion contract
- evidence contract
- safety/approval rules
- output format rules
- harness command guidance
- `UNKNOWN` / `BLOCKED` protocol

Does not contain:

- long methodology
- platform tutorials
- examples corpus
- skill bodies
- repeated role descriptions
- marketing prose

## Lazy Assets

Loaded only when needed:

- skills
- workflows
- role prompts
- platform adapters
- reference files
- screenshots/assets
- MCP setup docs

## Obedience Strategy

Precision comes from:

- fewer always-on instructions
- native permissions/hooks
- explicit acceptance gates
- deterministic command runner
- small focused subagent packets
- validators that fail false completion

Not from:

- longer prompts
- more warnings
- generic tone rules
- repeating policy in every artifact

## Prompt Surfaces

Each adapter renders only native equivalents:

- Claude: `CLAUDE.md`, agents, skills, commands, hooks.
- Codex: `AGENTS.md`, config, agents, plugin skills, hooks.
- OpenCode: agents, skills, commands, permissions/plugins.
- Gemini: `GEMINI.md`, commands, extensions, hooks where supported.
- IDE tools: rules/guidelines/workflows only when deterministic surfaces are absent.

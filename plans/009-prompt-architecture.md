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

## User Intent Boundary

All generated prompts, agents, skills, and platform adapters carry these response rules:

- When the user says a plan or answer is wrong and supplies proof, update the current plan or artifact from that proof.
- Do not run commands, inspect logs, browse docs, or expand scope for unsolicited verification unless safety, policy, or an explicit validation request requires it.
- In emotional, interpersonal, imagined, dream, memory, trauma, or hypothetical scenarios, answer directly or interpret only.
- Do not provide unsolicited advice, guidance, reassurance, coping strategies, suggested next steps, or suggested wording/scripts in those scenario types.
- Do not use `you could`, `you should`, `you might`, or equivalent guidance constructions in those scenario types unless the user explicitly asks for advice, guidance, action steps, or wording.

## Prompt Surfaces

Each adapter renders only native equivalents:

- Claude: `CLAUDE.md`, agents, skills, commands, hooks.
- Codex: `AGENTS.md`, config, agents, plugin skills, hooks.
- OpenCode: agents, skills, commands, permissions/plugins.
- Gemini: `GEMINI.md`, commands, extensions, hooks where supported.
- IDE tools: rules/guidelines/workflows only when deterministic surfaces are absent.

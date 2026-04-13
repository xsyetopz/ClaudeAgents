# OpenCode

OpenCode stays native-first.

openagentsbtw adds role prompts, shared skills, generated commands, and plugin guardrails, but does not try to replace OpenCode's own continuation or built-in agent surfaces.

## Principles

- keep project instructions explicit
- keep plugins narrow and event-driven
- use role prompts as additive guidance
- prefer native continuation: `opencode --continue`, `/sessions`, `/compact`, `task_id`

## Generated Surfaces

- agents under `opencode/templates/agents/`
- skills under `opencode/templates/skills/`
- commands under `opencode/src/commands.ts`
- plugin guardrails under `opencode/templates/plugins/openagentsbtw.ts`

## Public Command Set

Current generated command names:

- `openagents-review`
- `openagents-test`
- `openagents-implement`
- `openagents-document`
- `openagents-explore`
- `openagents-trace`
- `openagents-debug`
- `openagents-plan-feature`
- `openagents-plan-refactor`
- `openagents-audit`
- `openagents-orchestrate`

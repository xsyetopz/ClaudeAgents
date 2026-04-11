# OpenCode Research

Design decisions for the OpenCode integration. Researched against the OpenCode docs on 2026-03-27.

## Contents

| Doc                    | Covers                                             |
| ---------------------- | -------------------------------------------------- |
| `rules-and-plugins.md` | Project guidance, runtime guardrails, repo hygiene |

## Canonical Sources

- [Rules](https://opencode.ai/docs/rules) / [Agents](https://opencode.ai/docs/agents) / [Permissions](https://opencode.ai/docs/permissions) / [Plugins](https://opencode.ai/docs/plugins) / [Config](https://opencode.ai/docs/config)

## Design Decisions

- Project guidance installed as a managed instruction file, wired through `opencode.json` `instructions`.
- Runtime guardrails in generated plugins using documented plugin events.
- Continuity is native-first: `opencode --continue`, `/sessions`, `/compact`, `task_id` reuse.
- Native `plan`, `explore`, and `general` agents stay enabled; openagentsbtw agents are additive.
- Agent prompts are plain markdown, no XML-style tags.
- Context7 is CLI-only (`ctx7`); no managed MCP block.

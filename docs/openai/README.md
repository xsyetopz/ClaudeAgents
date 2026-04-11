# Codex Research

Research and design decisions for the Codex-native port of openagentsbtw. Last verified against OpenAI's official Codex docs on 2026-03-28.

## Contents

| Doc | Covers |
|-----|--------|
| `config.md` | Config layers, profiles, plan presets, Fast mode, memory, DeepWiki/ctx7 |
| `model-strategy.md` | Plan-to-model mapping, agent routing, wrapper routing |
| `hooks.md` | Hook events, what ports from Claude, what doesn't and why |
| `plugins-skills-subagents.md` | Native Codex surfaces: plugins, skills, custom agents, AGENTS.md |
| `prompting-and-guardrails.md` | GPT/Codex prompting approach and guardrail layers |
| `porting-plan.md` | Source-to-target mapping from the Claude-first system |

## Canonical Sources

- [Config basics](https://developers.openai.com/codex/config-basic) / [advanced](https://developers.openai.com/codex/config-advanced) / [reference](https://developers.openai.com/codex/config-reference) / [sample](https://developers.openai.com/codex/config-sample)
- [Speed and Fast mode](https://developers.openai.com/codex/speed)
- [Rules](https://developers.openai.com/codex/rules)
- [Hooks](https://developers.openai.com/codex/hooks)
- [AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md)
- [Plugins](https://developers.openai.com/codex/plugins) / [Skills](https://developers.openai.com/codex/skills) / [Subagents](https://developers.openai.com/codex/subagents) / [SDK](https://developers.openai.com/codex/sdk)
- [Best practices](https://developers.openai.com/codex/learn/best-practices) / [Prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide)
- Cookbook topics: [optimization](https://developers.openai.com/cookbook/topic/optimization) / [guardrails](https://developers.openai.com/cookbook/topic/guardrails) / [text](https://developers.openai.com/cookbook/topic/text) / [agents](https://developers.openai.com/cookbook/topic/agents)

## Design Decisions

- Codex is a first-class target, not a placeholder skill.
- Native Codex surfaces are used for what they actually do: plugin packaging, skill discovery, custom agent model pinning, hooks, config, wrapper routing, and real `AGENTS.md` files.
- Fast mode is off in managed profiles.
- Plan-aware routing: `go` and `plus` use `gpt-5.4-mini` for utility; `pro-5` and `pro-20` unlock `gpt-5.3-codex-spark`.
- No `CLAUDE.md` symlinks. Project guidance lives in `AGENTS.md`.
- Native `/plan` is reasoning mode, not a custom-agent selector.
- DeepWiki is optional, explicit, opt-in MCP infrastructure.
- Context7 is CLI-only (`ctx7`) for external docs lookups.

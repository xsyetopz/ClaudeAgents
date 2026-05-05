# Provider Surfaces

OAL is shared at the intent layer and provider-native at the output layer.
Different providers get different files.

## Codex

Codex surfaces:

- `.codex/config.toml`
- `.codex/agents/*.toml`
- `.codex/openagentlayer/skills/*/SKILL.md`
- `.codex/openagentlayer/hooks/*.mjs`
- `.codex/openagentlayer/runtime/*.mjs`
- `AGENTS.md`
- Codex plugin marketplace payloads

Codex effort values are `none`, `low`, `medium`, `high`, and `xhigh`.
Plan-mode effort and edit-mode model effort are separate controls.

## Claude Code

Claude Code surfaces:

- `.claude/settings.json`
- `.claude/agents/*.md`
- `.claude/skills/*/SKILL.md`
- `.claude/commands/*.md`
- `.claude/hooks/scripts/*.mjs`
- `CLAUDE.md`
- plugin metadata where OAL syncs provider payloads

Claude supports richer lifecycle hooks than Codex. OAL may use those surfaces
when source records and acceptance fixtures prove the behavior.

## OpenCode

OpenCode surfaces:

- `opencode.jsonc`
- `.opencode/agents/*.md`
- `.opencode/commands/*.md`
- `.opencode/tools/*.ts`
- `.opencode/plugins/openagentlayer.ts`
- `.opencode/instructions/openagentlayer.md`
- `.opencode/openagentlayer/hooks/*.mjs`
- OpenCode MCP config entries

OpenCode custom tools should call shared OAL package logic when possible. The
inspect tools call `oal inspect` so CLI, MCP, and provider tools stay aligned.

## Unsupported Surfaces

If a provider lacks a capability, the renderer must omit it or report it as
unsupported with a reason. OAL must not emit fake placeholder support.

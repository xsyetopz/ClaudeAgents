# Claude-to-Codex Porting Plan

Mapping used for the openagentsbtw Codex split. Shared source content lives under `source/` and renders Codex-facing files from that canonical layer.

## Source-to-Target Mapping

| Claude               | Codex                                                  |
| -------------------- | ------------------------------------------------------ |
| Plugin manifest      | `codex/plugin/openagentsbtw/.codex-plugin/plugin.json` |
| Skills               | `codex/plugin/openagentsbtw/skills/`                   |
| Agent markdown files | Custom agent TOMLs in `codex/agents/`                  |
| `CLAUDE.md`          | Real `AGENTS.md` files and templates                   |
| Hooks                | Subset of verified Codex hook events                   |

## Behavior Changes

- Codex has a full system package, not a placeholder skill pack.
- Real local marketplace entry for Codex plugins.
- First-class install target with plugin, agent, hook, config, and `AGENTS.md` installation.
- RTK follows shared policy contract across all four platforms.
- Model presets driven by local Codex CLI model list, not the broader API catalog.
- Fast mode disabled in managed profiles.

## Intentional Non-Ports

- No `CLAUDE.md` symlink strategy.
- No undocumented plugin-install commands.
- No direct port of Claude-only hook events or file-edit-specific hook logic.

## Follow-On Work

- Automated validation for Codex hook scripts and agent file parsing.
- Expand plugin skill metadata if OpenAI stabilizes more plugin-facing fields.
- Revisit installer defaults if Codex exposes an official plugin install CLI.

# Plugins, Skills, and Subagents

Codex has separate native surfaces for plugins, skills, custom agents, `AGENTS.md`, hooks, and config. openagentsbtw uses each for what it can actually enforce. Sources: [plugins](https://developers.openai.com/codex/plugins), [skills](https://developers.openai.com/codex/skills), [subagents](https://developers.openai.com/codex/subagents), [AGENTS.md](https://developers.openai.com/codex/guides/agents-md), [config](https://developers.openai.com/codex/config-reference)

## Plugins

The Codex plugin manifest lives at `.codex-plugin/plugin.json`. Marketplaces at `.agents/plugins/marketplace.json` (repo) and `~/.agents/plugins/marketplace.json` (user).

openagentsbtw ships:
- Repo-local marketplace at `.agents/plugins/marketplace.json`
- Plugin payload at `codex/plugin/openagentsbtw/`
- Installer step that registers the plugin as a local entry

The plugin layer packages and distributes assets. It does not guarantee role routing, force a custom agent for `/plan`, or enable hooks by itself.

Note: the local Codex CLI does not expose `codex plugins` or `codex skills` subcommands. The installer uses file-based marketplace and agent installation.

## Skills

Repo scope: `.agents/skills`. User scope: `~/.agents/skills`.

openagentsbtw bundles skills under `codex/plugin/openagentsbtw/skills/`, including optional `openai.yaml` metadata for discoverability. Skills are reusable workflows, not the whole system.

## Custom Agents

Project scope: `.codex/agents`. User scope: `~/.codex/agents`.

openagentsbtw installs seven agent TOML files: athena, hephaestus, nemesis, atalanta, calliope, hermes, odysseus. These replace the Claude agent markdown manifests.

## AGENTS.md

Codex applies the closest `AGENTS.md`, then parents up to repo root, then `~/.codex/AGENTS.md`. openagentsbtw installs to `~/.codex/AGENTS.md` and ships a project template at `codex/templates/AGENTS.md`. No `CLAUDE.md` symlinks.

This is the main style and behavior layer for the CCA-like response contract.

## Wrapper Routing

`openagentsbtw-codex <mode> ...` selects the managed profile, adds per-mode overrides, and supplies a role-shaped prompt. Does not rebind native `/plan` to a custom agent.

The `UserPromptSubmit` hook injects git context + project-memory hints. Prefix with `!raw` to skip for one turn. Hooks don't "run" skills; routing is driven by `AGENTS.md` guidance and wrapper commands.

Wrappers don't prepend `$openagentsbtw`. The plugin is enabled via config; hooks inject context automatically.

Additional wrapper features:
- `memory show` / `memory forget-project` / `memory prune` -- inspect or clear memory without touching SQLite
- `swarm "<task>"` -- "always delegate" route for multi-workstream requests
- `deepwiki` -- explicit GitHub repo exploration (opt-in, requires DeepWiki MCP config)
- `oabtw-codex` -- short alias (human-facing only; IDs and profile names remain `openagentsbtw`)

`ctx7` is the default external-docs path when available. CLI-only; no managed MCP block.

## Peer Threads

`oabtw-codex-peer batch|tmux` runs a separate peer-thread layer:

- **batch**: orchestrator -> QA -> worker -> review as separate Codex executions with shared handoff at `.openagentsbtw/codex-peer/<run-id>/`
- **tmux**: four-pane live session for the same role split (requires `tmux`)

Exists because native subagents are explicit-only and can be the wrong tool for long-running, evidence-heavy, or tightly supervised multi-worker flows.

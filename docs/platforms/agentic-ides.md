# Agentic IDE Integrations

openagentsbtw ships rules, native metadata, and opt-in full-depth configuration adapters for agentic IDEs and CLIs that read repository or user-level guidance files. The default install stays rules-first. `--agentic-ide-depth native` adds verified declarative files. `--agentic-ide-depth full` also installs the deeper non-auth surfaces openagentsbtw can manage safely: MCP settings without credentials, managed hook adapters, workflows, checks, and review prompts.

## Install

```bash
./install.sh --agentic-ides --agentic-ide-scope project
./install.sh --agentic-ides --agentic-ide-scope global
./install.sh --agentic-ides --agentic-ide-scope both
./install.sh --agentic-ides --agentic-ide-scope both --agentic-ide-depth native
./install.sh --agentic-ides --agentic-ide-scope both --agentic-ide-depth full --deepwiki-mcp --ctx7-cli
```

Granular toggles are also supported:

```bash
./install.sh --cursor --junie --gemini-cli --kiro --agentic-ide-scope project
./install.sh --roo --cline --augment --agentic-ide-scope both --agentic-ide-depth full
```

Project installs target the current working directory. Global installs target documented user-level paths where the tool supports them. Unsupported or unverified global surfaces are skipped with warnings instead of invented paths. `rules` is the default depth; `native` and `full` are opt-in.

## Installed Surfaces

| Tool               | Project install                                                  | Global install                                                   | Full-depth additions                                                                                                                     |
| ------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Cursor             | `.cursor/rules/openagentsbtw.mdc`                                | unsupported                                                      | `.cursor/mcp.json` project MCP settings when MCP flags are enabled. Custom modes and headless `cursor-agent` remain manual.              |
| JetBrains Junie    | `.junie/AGENTS.md`                                               | unsupported                                                      | No full filesystem surface beyond project files; MCP settings, allowlists, IDE modes, and CLI parameters remain IDE-managed.             |
| JetBrains Air      | managed block in `AGENTS.md`                                     | unsupported                                                      | Managed block in project `review-prompt.md`. Provider/task orchestration and MCP attachment remain IDE-managed.                          |
| Gemini CLI         | managed block in `GEMINI.md`                                     | `~/.gemini/GEMINI.md`                                            | `.gemini/settings.json` MCP settings plus native agents/commands. Hooks/extensions remain manual.                                        |
| Kiro               | `.kiro/steering/openagentsbtw.md`                                | `~/.kiro/steering/openagentsbtw.md`                              | `.kiro/settings/mcp.json`, `.kiro/hooks/openagentsbtw.json`, and native agents. Specs/powers remain manual.                              |
| Kilo Code          | managed block in `AGENTS.md`; `.kilocode/rules/openagentsbtw.md` | `~/.config/kilo/AGENTS.md`; `~/.kilocode/rules/openagentsbtw.md` | Native skills and merge guidance for modes. Settings/MCP remain manual.                                                                  |
| Roo Code           | `.roo/rules/openagentsbtw.md`                                    | `~/.roo/rules/openagentsbtw.md`                                  | Mode-specific `.roo/rules-code`, `.roo/rules-architect`, and `.roo/rules-debug` files. `.roomodes`, MCP, and cloud agents remain manual. |
| Cline              | `.clinerules/openagentsbtw.md`                                   | `~/Documents/Cline/Rules/openagentsbtw.md`                       | Skills plus full-depth workflows and hook guidance under `.clinerules/` or `~/Documents/Cline/`. CLI auth/automation remain manual.      |
| Amp                | managed block in `AGENTS.md`                                     | `~/.config/amp/AGENTS.md`                                        | Skills, checks, and MCP settings. Permissions/toolboxes and `amp review` automation remain manual.                                       |
| Augment/Auggie     | `.augment/rules/openagentsbtw.md`                                | `~/.augment/rules/openagentsbtw.md`                              | Agents, commands, skills, MCP settings, and managed hook config. Workspace indexing remains manual.                                      |
| Google Antigravity | unsupported                                                      | unsupported                                                      | Warning-only. No files are installed until official docs or verified app behavior confirms exact rule-loading paths.                     |

## Depth Model

| Depth    | Adds                                                                                                                      | Intent                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `rules`  | Stable instruction/rule files and managed markdown blocks.                                                                | Safe default for minor releases.                                                 |
| `native` | Declarative agents, commands, skills, mode rules, and ignore blocks where verified.                                       | Use tool-native metadata without settings or executable adapters.                |
| `full`   | Native depth plus MCP settings, non-secret hook config, Cline workflows, Amp checks/skills, and Air review prompt blocks. | Maximize integration while avoiding auth, credentials, and unverified app paths. |

Full depth writes only declarative configuration. It never logs in, installs third-party CLIs, stores MCP credentials, or claims unverified global paths.

## Full Depth Details

- MCP settings merge `deepwiki` when `--deepwiki-mcp` is set and `ctx7` when `--ctx7-cli` is set. Existing unrelated settings are preserved.
- Managed hook configs point at `openagentsbtw-agentic-guard.mjs`, a small stdin guard that blocks obvious destructive or secret-dumping commands. It is not a replacement for each IDE's permission system.
- Cline workflows are generated from the openagentsbtw command catalog.
- Amp skills are generated from the shared skill catalog; Amp checks use the openagentsbtw completion contract.
- Air review prompt content is merged as a managed block in `review-prompt.md`, not written as an unmarked overwrite.
- Uninstall removes copied full-depth files and deletes only managed MCP keys (`openagentsbtw`, `deepwiki`, `ctx7`) from JSON settings.

## Still Manual / Warning-only

- CLI install/auth automation for Cursor, Gemini, Kiro, Cline, Amp, Augment, Junie, Air, or Antigravity.
- MCP credentials and secrets.
- Cursor custom modes and headless `cursor-agent` automation.
- Gemini executable hooks/extensions.
- Kilo mode/settings overwrite and MCP.
- Roo `.roomodes`, MCP, and cloud agents.
- Cline CLI auth/automation and unverified executable hook formats.
- Amp permissions/toolboxes and `amp review` automation.
- Augment workspace indexing config.
- Junie global settings, allowlist, IDE modes, and CLI parameters.
- JetBrains Air provider/task orchestration and selected-agent routing.
- Antigravity files until official documentation or app behavior confirms exact paths.

## Design Boundaries

- `agentic-ides/templates/**` is generated output. Do not hand-edit duplicate-looking platform files; change `source/guidance/agentic-ides.md`, source skills/commands, or the agentic IDE surface catalog/renderers and regenerate.
- Generated content comes from `source/guidance/agentic-ides.md` through `scripts/generate.mjs`.
- Installer writes are idempotent. Merged files use managed openagentsbtw markers; dedicated rule files are overwritten by reinstall.
- Unsupported global targets are warnings, not guessed filesystem paths.
- Native/full depth uses managed manifests for copied directories and managed comment blocks for ignore/review files.
- Antigravity remains experimental until official documentation or app behavior confirms exact instruction-loading paths.

## Research Sources

- Cursor rules and modes: <https://docs.cursor.com/context/rules>, <https://docs.cursor.com/chat/custom-modes>
- Gemini CLI docs: <https://github.com/google-gemini/gemini-cli/tree/main/docs>
- Junie guidelines: <https://www.jetbrains.com/help/junie/customize-guidelines.html>
- JetBrains Air instructions: <https://www.jetbrains.com/help/air/project-instructions.html>
- Kiro steering and custom agents: <https://kiro.dev/docs/cli/steering/>, <https://kiro.dev/docs/cli/custom-agents/configuration-reference/>
- Kilo customization: <https://kilo.ai/docs/customize/custom-instructions>, <https://kilo.ai/docs/agent-behavior/custom-rules>, <https://kilo.ai/docs/customize/custom-modes>
- Roo custom instructions: <https://github.com/RooCodeInc/Roo-Code-Docs/blob/main/docs/features/custom-instructions.md>
- Cline customization: <https://docs.cline.bot/customization/overview>
- Amp manual: <https://ampcode.com/manual>
- Augment/Auggie rules and automation: <https://docs.augmentcode.com/cli/rules>, <https://docs.augmentcode.com/cli/hooks>

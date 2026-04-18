# openagentsbtw

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Cross-platform agent scaffolding for Claude Code, Codex CLI, OpenCode, GitHub Copilot, and rules-first agentic IDE integrations.

One canonical source tree. Generated platform artifacts. Tight prompts, strict routing, and fewer chances for models to drift into garbage architecture or generic AI UI.

## What Changed In 2.0

- canonical source split into smaller catalogs instead of one giant registry blob
- SRP command and skill names
- Codex wrapper surface moved toward verb + modifier routing
- deterministic Codex defaults now bias toward `gpt-5.3-codex`
- new cross-platform `design-polish` skill for frontend/UI refinement
- old scattered docs replaced by a smaller consolidated doc set

## Architecture

Canonical authored source lives under `source/`:

- `source/agents/<agent>/` -- agent metadata and prompt
- `source/skills/<skill>/` -- skill metadata and body
- `source/skills/<skill>/` -- skill bodies, references, scripts
- `source/commands/{codex,copilot,opencode}/` -- command catalogs per surface
- `source/guidance/agentic-ides.md` -- rules-first IDE instruction source
- `source/catalog/loaders.mjs` -- canonical catalog loader
- `scripts/generate.mjs` -- thin generation entrypoint

Generated targets:

- `claude/`
- `codex/`
- `opencode/`
- `copilot/`
- `agentic-ides/`

More detail: [docs/architecture.md](docs/architecture.md)

## Install

```bash
git clone https://github.com/xsyetopz/openagentsbtw.git
cd openagentsbtw
./install.sh --all
```

Common presets:

```bash
./install.sh --codex --codex-plan pro-5
./install.sh --claude --claude-plan max-5
./install.sh --copilot --copilot-plan pro
./install.sh --all --caveman-mode full
./install.sh --agentic-ides --agentic-ide-scope project
./install.sh --cursor --gemini-cli --kiro --agentic-ide-scope both
./install.sh --agentic-ides --agentic-ide-scope both --agentic-ide-depth native
./install.sh --agentic-ides --agentic-ide-scope both --agentic-ide-depth full --deepwiki-mcp --ctx7-cli
```

## Codex Surface

Main verbs:

```bash
oabtw-codex explore "<target>"
oabtw-codex plan "<goal>"
oabtw-codex implement "<task>"
oabtw-codex review "<scope>"
oabtw-codex validate "<scope>"
oabtw-codex document "<task>"
oabtw-codex deslop "<target>"
oabtw-codex design-polish "<ui task>"
oabtw-codex orchestrate "<task>"
oabtw-codex resume --last
oabtw-codex queue add "follow up after the current task"
```

Modifiers:

```bash
oabtw-codex explore --source deepwiki "<github repo task>"
oabtw-codex implement --approval auto "<task>"
oabtw-codex review --speed fast "<scope>"
oabtw-codex validate --runtime long "<suite>"
```

More detail: [docs/platforms/codex.md](docs/platforms/codex.md)

## Agentic IDEs

Rules-first adapters are available for Cursor, Junie, JetBrains Air, Gemini CLI, Kiro, Kilo Code, Roo Code, Cline, Amp, and Augment/Auggie. `--agentic-ide-depth native` adds verified declarative agents, commands, skills, mode rules, and ignore blocks for supported tools; `--agentic-ide-depth full` also adds managed MCP settings, workflows, checks, hook configs, and Air review prompt blocks where supported. Google Antigravity is documented as experimental warning-only until official rule paths are confirmed.

More detail: [docs/platforms/agentic-ides.md](docs/platforms/agentic-ides.md)

## Development

```bash
bun install --frozen-lockfile
bun run generate
bun test tests claude/tests codex/tests
cd opencode && bun install --frozen-lockfile && bun test && bun run typecheck
```

## Attribution

- Caveman mode draws from [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman).
- `design-polish` incorporates ideas from [cyxzdev/Uncodixfy](https://github.com/cyxzdev/Uncodixfy), [anthropics/skills frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md), and [pbakaus/impeccable](https://github.com/pbakaus/impeccable).

## License

[MIT](LICENSE)

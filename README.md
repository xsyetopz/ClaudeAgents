# Claude Code Agent Team

Lightweight agent definitions, skills, and hooks for Claude Code projects. Designed for efficient Sonnet 4.6 usage on Max 5x/20x plans.

## What This Adds Over Vanilla Claude Code

- **3 focused agents** with clear roles and model assignments
- **Coding standards skill** — auto-activates on implementation/review tasks, enforces SRP/DRY/KISS
- **2 working hooks** — LSP diagnostics check + auto-format after edits
- **Language-scoped rules** — Rust, TypeScript, and test-specific rules
- **Module templates** — feature-oriented templates for 5 languages

## Quick Start

```bash
./scripts/install.sh /path/to/your/project
```

This copies agents, skills, hooks, and rules to your project's `.claude/` directory. Use `--symlink` for development, `--global` for `~/.claude/`.

## Agents

| Agent | Model | Role |
|-------|-------|------|
| **Architect** | Opus | Analyzes codebase, designs module boundaries, outputs implementation plans |
| **Implementer** | Sonnet | Writes production code following plans or direct instructions |
| **Verifier** | Sonnet | Runs targeted tests, analyzes failures, reports results |

## Skills

| Skill | Auto-Activates On |
|-------|--------------------|
| `coding-standards` | Implementation tasks, code reviews |
| `refactor` | Refactoring requests |

## Hooks

| Hook | Event | What It Does |
|------|-------|--------------|
| LSP diagnostics | PostToolUse (Write/Edit) | Prompts to check and fix type errors |
| Auto-format | PostToolUse (Write/Edit) | Runs language-appropriate formatter via stdin JSON |

## Rules

Path-scoped rules in `templates/rules/` auto-load based on file type:

- `rust.md` — Rust-specific conventions
- `typescript.md` — TypeScript-specific conventions
- `tests.md` — Test file conventions

## Module Templates

Feature-oriented templates for: **Rust**, **TypeScript**, **Go**, **Swift**, **C++**

Each follows the pattern: types → core logic → traits → tests → helpers.

## Teams vs Subagents

Use **subagents** for narrow, well-defined tasks (single module, sequential work). Use **agent teams** for genuinely parallel work (multiple disjoint modules, competing debug hypotheses, cross-layer coordination).

## Directory Structure

```
├── agents/              # 3 agent definitions
├── skills/              # 2 auto-activating skills
│   ├── coding-standards/
│   └── refactor/
├── hooks/               # hooks.json + auto-format script
├── templates/rules/     # Language-scoped rules
├── module-templates/    # Feature module templates (5 languages)
└── scripts/             # install.sh
```

## License

MIT

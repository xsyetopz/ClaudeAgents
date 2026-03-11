# Claude Code Agent Team

Agent definitions, skills, and hooks for Claude Code projects. Agents use constraint tables and behavioral rules to prevent AI slop, enforce scope discipline, and produce observable output.

## What This Adds Over Vanilla Claude Code

- **3 agents** with constraint tables, behavioral rules, and status headers
- **7 skills** — coding-standards, refactor, desloppify, git-workflow, security-checklist, code-review, performance-guide
- **3 hooks** — LSP diagnostics, auto-format, agent delegation observer
- **Language-scoped rules** — Rust, TypeScript, and test-specific rules
- **Module templates** — feature-oriented templates for 5 languages
- **Behavioral constraints** in CLAUDE.md — no slop, no placeholders, no filler

## Quick Start

```bash
./install.sh /path/to/your/project
```

This copies agents, skills, hooks, and rules to your project's `.claude/` directory. Use `--symlink` for development, `--global` for `~/.claude/`, `--premium` to set architect model to opus.

## Agents

| Agent           | Model  | Role                                                                                                       |
| --------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| **Architect**   | Opus   | Analyzes codebase, designs plans with constraint table. READ-ONLY. Ends with `## Next: @implement` handoff |
| **Implementer** | Sonnet | Writes production code. Follows plans precisely. Anti-drift and anti-slop rules. No narration              |
| **Verifier**    | Sonnet | Tests and reviews code. Every finding cites file:line with severity (BLOCKING/WARNING/SUGGESTION)          |

All agents output a status header: `[agent-name] Action: {scope}`

## Skills

| Skill                | Auto-Activates On                             |
| -------------------- | --------------------------------------------- |
| `coding-standards`   | Implementation tasks, code reviews            |
| `refactor`           | Refactoring requests                          |
| `desloppify`         | AI slop detection, "clean up", comment audits |
| `git-workflow`       | Commits, branches, PRs                        |
| `security-checklist` | Security audits, vulnerability checks         |
| `code-review`        | Code reviews, PR reviews                      |
| `performance-guide`  | Performance optimization, profiling           |

## Hooks

| Hook            | Event                    | What It Does                                          |
| --------------- | ------------------------ | ----------------------------------------------------- |
| LSP diagnostics | PostToolUse (Write/Edit) | Prompts to check and fix type errors                  |
| Auto-format     | PostToolUse (Write/Edit) | Runs language-appropriate formatter                   |
| Agent observer  | PostToolUse (Agent)      | Reports what agent ran, what changed, success/failure |

## Rules

Path-scoped rules in `templates/rules/` auto-load based on file type:

- `rust.md` — Rust-specific conventions
- `typescript.md` — TypeScript-specific conventions
- `tests.md` — Test file conventions

## Module Templates

Feature-oriented templates for: **Rust**, **TypeScript**, **Go**, **Swift**, **C++**

Each follows the pattern: types -> core logic -> traits -> tests -> helpers.

## Delegation Matrix

| User Intent                             | Route To           |
| --------------------------------------- | ------------------ |
| design, architect, plan, "how should I" | @architect         |
| implement, code, write, build, fix, add | @implement         |
| test, verify, check, review, run tests  | @verify            |
| ambiguous                               | Ask — do not guess |

## Directory Structure

```text
├── agents/              # 3 agent definitions (constraint tables + behavioral rules)
├── skills/              # 7 auto-activating skills
│   ├── coding-standards/
│   ├── refactor/
│   ├── desloppify/
│   ├── git-workflow/
│   ├── security-checklist/
│   ├── code-review/
│   └── performance-guide/
├── hooks/               # hooks.json + auto-format script
├── templates/rules/     # Language-scoped rules
├── module-templates/    # Feature module templates (5 languages)
└── scripts/             # install.sh
```

## License

MIT

# Claude Code Agent System

3 agents, 3 skills, split-level hooks. Targets CC v2.1.71+.

## Agents

| Agent    | Placeholder          | Pro    | Max    | Purpose                                |
| -------- | -------------------- | ------ | ------ | -------------------------------------- |
| planner  | `__MODEL_PLANNER__`  | sonnet | opus   | Architecture, planning, task breakdown |
| coder    | `__MODEL_CODER__`    | sonnet | sonnet | Implementation, bug fixes, features    |
| reviewer | `__MODEL_REVIEWER__` | sonnet | sonnet | Code review, testing, security audit   |

## Skills

- `coding-standards` — code quality rules, naming, anti-patterns
- `desloppify` — AI slop detection and removal
- `git-workflow` — commit format, branch naming, PR templates

## Hooks

**User-level** (`~/.claude/hooks/`):

- `redact-pre.py` — PreToolUse secret scrubbing
- `redact-post.py` — PostToolUse output redaction

**Project-level** (`.claude/hooks.json`):

- LSP diagnostics prompt on Write/Edit
- auto-format.sh on Write/Edit

## Install

```bash
./install.sh /path/to/project --pro   # sonnet
./install.sh /path/to/project --max   # opus/sonnet
./install.sh --global --pro           # ~/.claude/
```

## File Structure

```
agents/          planner.md, coder.md, reviewer.md
skills/          coding-standards/, desloppify/, git-workflow/
hooks/           hooks.json, redact-pre.py, redact-post.py, scripts/auto-format.sh
templates/       CLAUDE.md (installed to target projects)
install.sh       Version check, tier flags, jq merge, model substitution
```

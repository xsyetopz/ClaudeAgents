# Project Instructions

## Model & Effort Selection

| Task                          | Agent       | Model (pro/max) |
| ----------------------------- | ----------- | --------------- |
| Design, architecture, ADRs    | @athena     | sonnet / opus   |
| Code changes, bug fixes       | @hephaestus | sonnet / sonnet |
| Security/perf review          | @nemesis    | sonnet / sonnet |
| Run tests, parse failures     | @atalanta   | haiku / haiku   |
| Write/edit docs               | @calliope   | haiku / haiku   |
| Explore codebase, trace flows | @hermes     | sonnet / sonnet |
| Coordinate multi-step work    | @odysseus   | sonnet / opus   |

Avoid running @hephaestus for tasks @atalanta or @calliope can handle.

**Built-in subagents disabled**: `Explore`, `Plan`, and `general-purpose` are denied via `permissions.deny`. Use `@hermes` (explore), `@athena` (plan), `@odysseus` (general-purpose) instead.

## Token Hygiene

- This file: keep under 150 lines. Remove sections that don't affect agent behavior
- Run `/clear` between unrelated tasks to reset context
- Avoid `cat` on large files - use `grep`, `head -n 200`, or `git diff --stat`
- `git diff` without `--stat` can dump 50k tokens - always use `--stat` first
- Prefer targeted test runs over full suite re-runs
- Context zones: green (0-300k tokens, reliable), yellow (300-600k, soft degradation), red (600k+, compaction risk)
- Start a fresh session at 40-50% context utilization if reasoning quality matters
- Place critical project instructions at file top - middle content is recalled least reliably (lost-in-the-middle effect)

## Enterprise HTTP Hooks

Set these env vars to forward all hook events to a central DLP server:

- `CCA_HTTP_HOOK_URL` - POST endpoint for hook events (unset = disabled)
- `CCA_HTTP_HOOK_TOKEN` - Bearer token for auth (optional)
- `CCA_HTTP_HOOK_FAIL_CLOSED` - set to `1` to block actions when server is unreachable (default: fail-open)

## Session Continuity

At session start, check if `.claude/session-handoff.md` exists. If it does:

1. Read it
2. Briefly tell the user what the previous session accomplished and what's next
3. Ask if they want to continue from there or start fresh

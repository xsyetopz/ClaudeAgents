# Codex Hooks

Codex supports project and user hook config at `.codex/hooks.json` and `~/.codex/hooks.json`. Documented events: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`. Source: [hooks](https://developers.openai.com/codex/hooks)

## Installed Hooks

| Hook                             | Event            | What it does                                                                                 |
| -------------------------------- | ---------------- | -------------------------------------------------------------------------------------------- |
| `session/start-budget.mjs`       | SessionStart     | Checks AGENTS.md size, warns if Fast mode or persistence is disabled, injects project memory |
| `session/prompt-git-context.mjs` | UserPromptSubmit | Injects git context. Prefix with `!raw` to skip for one turn                                 |
| `pre/bash-guard.mjs`             | PreToolUse       | Blocks broad `rm -rf`, blanket `git add`, noisy shell, unsafe DNS patterns                   |
| `pre/rtk-enforce.mjs`            | PreToolUse       | Enforces RTK-prefixed Bash when `rtk` is installed and `RTK.md` policy is present            |
| `post/bash-redact.mjs`           | PostToolUse      | Warns when Bash output contains secrets or PII                                               |
| `post/stop-scan.mjs`             | Stop             | Scans for placeholder code before completion, persists session summary to memory             |

Hook status text is intentionally suppressed. Only warn/error/block conditions surface from openagentsbtw hooks.

For wrapper-managed sessions, a lightweight stream filter strips known transient hook lifecycle lines and multiline hook-context dumps (managed workaround, not upstream suppression).

## Memory Layer

Project-specific recall stored in `~/.codex/openagentsbtw/state/memory.sqlite`, using documented Codex fields (`session_id`, `transcript_path`, `cwd`, `prompt`, `last_assistant_message`). Stays inside the supported hook contract.

## Hooks Not Ported

| Claude hook                | Why it doesn't port                                                              |
| -------------------------- | -------------------------------------------------------------------------------- |
| `pre/validate-input.mjs`   | Codex hooks focus on `Bash` tool matching; no equivalent multi-tool input shapes |
| `post/write-quality.mjs`   | No file-edit event contract in Codex hooks                                       |
| `post/failure-circuit.mjs` | Depends on a failure event path not in Codex hook flow                           |
| `post/subagent-scan.mjs`   | No equivalent `SubagentStop` hook contract in Codex                              |

## Limitations

- `PreToolUse` and `PostToolUse` only intercept `Bash`. No general-purpose hook matrix for built-in edit/read/write surfaces.
- Hook-based enforcement is a shell guardrail on top of sandboxing and approvals, not a complete Claude-style permission layer.
- RTK can only enforce Bash forms that flow through hooks.
- `statusMessage` is optional, `suppressOutput` is parsed but not implemented upstream. Generic Codex lifecycle lines may still appear. Track: [openai/codex#15497](https://github.com/openai/codex/issues/15497)

## Install/Uninstall

The installer copies hook scripts to `~/.codex/openagentsbtw/hooks/` and merges entries into `~/.codex/hooks.json`. Uninstall removes only entries pointing at the openagentsbtw hook path.

Generated artifacts for transparency:
- `codex/hooks/HOOKS.md` -- lists every shared policy as supported/unsupported for Codex
- `codex/hooks/policy-map.json` -- machine-readable version with unsupported reasons

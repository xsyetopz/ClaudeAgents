# Codex Hooks Port

Codex supports project and user hook config files at `.codex/hooks.json` and `~/.codex/hooks.json`. The documented hook events relevant to this port are `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, and `Stop`. Source: <https://developers.openai.com/codex/hooks>

## openagentsbtw Hook Set

The Codex port keeps only the Claude hook behavior that maps onto documented Codex events:

- `session/start-budget.mjs`
  Checks `AGENTS.md` size, warns if Fast mode or native persistence appears disabled, and injects project memory on startup or resume.
- `session/prompt-git-context.mjs`
  Injects lightweight git context and a compact project-memory hint at prompt submit time. Prefix a prompt with `!raw` to opt out for that one turn.
- `pre/bash-guard.mjs`
  Blocks broad `rm -rf`, blanket `git add`, noisy shell commands, and unsafe DNS-style checks.
- `pre/rtk-enforce.mjs`
  When `rtk` is installed and an `RTK.md` policy is present (repo ancestry or `~/.config/openagentsbtw/RTK.md`), enforce RTK-prefixed Bash for commands that `rtk rewrite` can rewrite.
- `post/bash-redact.mjs`
  Warns when Bash output appears to contain secrets or PII.
- `post/stop-scan.mjs`
  Scans modified files for placeholder code before final completion and persists a bounded session summary into the openagentsbtw SQLite memory store.

Routine Codex hook status text is intentionally omitted from the generated `hooks.json`. openagentsbtw only asks Codex to surface warning, error, or block conditions from these hooks, not normal success chatter.

For wrapper-managed Codex sessions, openagentsbtw also ships a lightweight stream filter that strips only the known transient hook lifecycle lines. This is a managed wrapper workaround, not a replacement for upstream hook suppression.

## Memory Layer

Codex already ships native SQLite-backed persistence. openagentsbtw uses that as the base layer, then stores project-specific recall in `~/.codex/openagentsbtw/state/memory.sqlite`. The hook flow uses documented Codex fields such as `session_id`, `transcript_path`, `cwd`, `prompt`, and `last_assistant_message`, so the memory feature stays inside the supported hook contract instead of scraping undocumented runtime state.

## Important Limitation

Codex hooks are useful guardrails, not a complete Claude-style permission layer. In the current Codex docs, `PreToolUse` and `PostToolUse` only intercept `Bash`. They do not provide a general-purpose hook matrix for built-in edit/read/write surfaces, so hook-based enforcement in Codex should be treated as a shell guardrail layered on top of sandboxing and approvals, not a full replacement for Claude’s richer permission patterns.

For RTK specifically, this means Codex can enforce only Bash forms that flow through hooks. It does not force non-Bash tools through RTK.

As of the current Codex hooks docs, `statusMessage` is optional and `suppressOutput` is parsed but not implemented. That means openagentsbtw can remove its own routine status text, but generic Codex lifecycle lines such as `PreToolUse hook (completed)` may still appear until upstream suppression support exists. Track upstream status at <https://github.com/openai/codex/issues/15497>.

## Hooks We Did Not Port

The Claude package has more hook coverage, but several pieces are Claude-specific or rely on tools/events that Codex does not document in the same way:

- `pre/validate-input.mjs`
  Claude had richer multi-tool input shapes. Codex docs focus on `Bash` tool matching in hooks, so this does not carry over cleanly.
- `post/write-quality.mjs`
  Claude’s file-edit hook path could auto-format and inspect write payloads directly. Codex’s documented hook surface does not provide an equivalent file-edit event contract.
- `post/failure-circuit.mjs`
  The Claude implementation depends on a failure event path that is not part of the core Codex hook flow we verified.
- `post/subagent-scan.mjs`
  Codex has custom agents and multi-agent support, but not the same Claude `SubagentStop` hook contract in the docs we used.

## Merge Strategy

The installer copies openagentsbtw hook scripts into `~/.codex/openagentsbtw/hooks/` and merges the hook groups into `~/.codex/hooks.json`. On uninstall, it removes only entries that point at the openagentsbtw hook path.

The shared policy source now drives Claude, Codex, and OpenCode generation, but the Codex renderer still emits only the documented Codex subset above. That keeps Codex policy parity without pretending unsupported Claude-only hooks exist in Codex.

To make that difference explicit in generated artifacts, Codex now also gets:

- `codex/hooks/HOOKS.md`
- `codex/hooks/policy-map.json`

Those files list every shared policy entry as supported or unsupported for Codex, with unsupported reasons attached for the Claude-only policies that do not port cleanly.

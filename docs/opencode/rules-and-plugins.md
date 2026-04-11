# Rules and Plugins

OpenCode has two customization layers that matter for openagentsbtw:

1. **Project guidance** -- `AGENTS.md` and files from the `instructions` array in `opencode.json`.
2. **Runtime interception** -- plugins subscribing to `chat.message`, `command.execute.before`, `tool.execute.before`, `tool.execute.after`, `experimental.session.compacting`, `experimental.text.complete`.

## How openagentsbtw Maps to These

| What               | Where                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Framework rules    | `.opencode/instructions/openagentsbtw.md` (project) or `instructions/openagentsbtw.md` (global) |
| Instruction wiring | Merged into `opencode.json` `instructions` array                                                |
| Runtime guardrails | `opencode/templates/plugins/openagentsbtw.ts`                                                   |
| Repo hygiene       | Generated git hooks under `opencode/templates/hooks/`                                           |
| Native agents      | Stay enabled; openagentsbtw adds role-specific agents on top                                    |

## Runtime Rules

- Route classification for `openagents-*` commands, Greek-role agents, native `task` subagents, and built-in agents
- Dangerous bash command blocking before execution
- RTK enforcement when `rtk` is installed and `RTK.md` is present
- Secret-like path blocking for read, edit, and write
- Compaction context that preserves route, blockers, edits, tests, and `task_id` continuity
- Final-response gating: invalid implementation/test completions become strict `BLOCKED:` results

## Git Hook Rules

- Block placeholder markers (`TODO`, `FIXME`, `XXX`) in staged files
- Block likely secrets and staged `.env` paths
- Run tests on commit and push when a test script is declared
- Confirm pushes to `main` or `master`

## Generated Mapping Artifacts

- `opencode/templates/hooks/HOOKS.md` -- every shared policy listed as supported/unsupported
- `opencode/templates/hooks/policy-map.json` -- machine-readable version

## Notes

- Plugins are not a one-to-one replacement for Claude or Codex hooks. Only the documented subset is used.
- Each target receives only the policies that match its interface.
- OpenCode continuity is native-first: prefer `opencode --continue`, `/sessions`, `/compact`, `task_id` over handoff exports.

# Permission Model

v4 permissions combine platform-native policies with harness-level command gates.

## Permission Sources

- platform sandbox/approval settings
- hook allow/deny/ask rules
- MCP tool approval rules
- project rules
- user rules
- harness command DSL policy
- destructive-operation approval path

## Required Actions

- `read`: safe but budgeted.
- `search`: safe but bounded.
- `write`: requires task context and target ownership.
- `delete`: requires manifest ownership or explicit approval.
- `shell`: must route through harness runner where possible.
- `network`: disabled unless platform/user permits.
- `mcp`: per-server and per-tool approval.

## Edge Cases

- Platform hooks may run after shell segmentation; harness must evaluate exact segment.
- MCP tools can bypass shell gates; adapter must render MCP approval rules where supported.
- Plugin systems can add tools dynamically; permission checks must run after merge/dedup.
- Project rules can conflict with user/global managed rules; adapter must record precedence.
- Hook scripts must be self-contained in installed target.

## Unsolicited Action Guard

Agents must stay within the requested action boundary.

- User-provided correction proof is enough to update the plan or artifact.
- Do not run commands, inspect logs, browse docs, or search for extra proof unless explicitly requested or required by safety/policy.
- Do not convert an instruction to update a plan into a side investigation.
- Tool use must match the user-requested task, not agent curiosity.

## v4 Contract

Prompts describe policy. Hooks and runner enforce policy.

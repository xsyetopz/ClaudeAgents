# Hook specification

## Rule

Hook prefix is based on hook category.

Format:

```text
<category>-<subject>-<action>
```

Examples:

- `tool-pre-shell-rtk`
- `tool-pre-destructive-command`
- `tool-post-write-quality`
- `tool-fail-circuit`
- `prompt-submit-contract`
- `session-start-env`
- `agent-start-route-context`

## Categories

| Category         | Purpose                               |
| ---------------- | ------------------------------------- |
| `session-start`  | prepare session context               |
| `session-end`    | final session checks                  |
| `prompt-submit`  | inspect user prompt before model turn |
| `tool-pre`       | inspect tool call before execution    |
| `tool-post`      | inspect successful tool result        |
| `tool-fail`      | inspect failed tool result            |
| `tool-batch`     | inspect grouped tool calls            |
| `permission`     | mediate permission request            |
| `agent-start`    | prepare subagent context              |
| `agent-stop`     | inspect subagent result               |
| `task-created`   | inspect created task/job              |
| `task-completed` | inspect completed task/job            |
| `compact-pre`    | prepare compaction                    |
| `compact-post`   | verify compaction output              |
| `workspace`      | inspect workspace boundary            |
| `notification`   | emit external notification            |

## Hook record

Each hook source record contains:

- `id`
- `category`
- `purpose`
- `platform_events`
- `input_adapter`
- `output_adapter`
- `decision`
- `failure_mode`
- `unsupported`

`platform_events` maps canonical category to documented native events. Empty mapping means unsupported.

## Decisions

Allowed decisions:

- `continue`
- `deny`
- `warn`
- `context`
- `rewrite`
- `skip`

Rules:

- destructive shell commands require `deny` or explicit permission path
- RTK shell handling uses `rewrite` when safe and proxy when rewrite cannot classify safely
- context-only hooks cannot block execution
- warning hooks cannot mutate tool input

## Platform mapping

### Codex

Render only documented Codex hook events. Unsupported Claude-style events remain unsupported.

Doctor:

- `oal doctor hooks codex`

### Claude Code

Render through Claude Code hook settings and documented event names.

Doctor:

- `oal doctor hooks claude`

### OpenCode

Render only native hook/plugin/permission surfaces supported by current OpenCode config.

Doctor:

- `oal doctor hooks opencode`

### Kilo

Render only documented workflow/rule/MCP behavior unless current Kilo hook support is verified.

### Windsurf

Render only documented Cascade hook behavior. Memories are not hook output.

### Cline

Render only Cline hook reference events.

### Gemini CLI

Render only documented Gemini CLI hook behavior.

### Cursor

Cursor rules are not hooks. OAL does not create hook files for Cursor unless Cursor exposes native hook surface.

## Required hook policies

Initial OAL hook policies:

- `tool-pre-shell-rtk`
- `tool-pre-destructive-command`
- `tool-post-write-quality`
- `tool-fail-circuit`
- `prompt-submit-contract`
- `session-start-env`
- `agent-start-route-context`
- `compact-pre-budget`

## Validation

Hook validation checks:

- id prefix matches category
- platform event exists
- input adapter exists
- output adapter exists
- unsupported platforms have reason
- deny hooks explain blocked subject
- RTK hook uses external `rtk`


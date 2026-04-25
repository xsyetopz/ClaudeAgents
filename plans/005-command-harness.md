# Command Harness

v4 command harness replaces raw-shell memory with typed intent.

## Command DSL

Initial verbs:

| Verb     | Purpose                 | Default behavior                  |
| -------- | ----------------------- | --------------------------------- |
| `status` | repo and worktree state | compact changed files and branch  |
| `diff`   | changed content         | stat first, targeted hunks second |
| `search` | code/text search        | grouped compact results           |
| `read`   | file read               | ranged and capped by default      |
| `list`   | file listing            | max-depth and filtered            |
| `tree`   | structure map           | depth-limited                     |
| `test`   | tests                   | failures first                    |
| `build`  | build/check             | errors first                      |
| `lint`   | lint/typecheck          | grouped diagnostics               |
| `logs`   | runtime logs            | tail/summarize                    |

## Rust Runner Contract

Binary target: `oabtw-runner`.

Responsibilities:

- parse command intent
- map intent to native command
- enforce output budget
- classify failures
- preserve exact errors
- emit structured JSON summary
- optionally emit raw log artifact path

## TypeScript Integration

TypeScript calls runner through a stable API:

```ts
type HarnessCommand =
  | { kind: "search"; pattern: string; paths?: string[] }
  | { kind: "read"; path: string; range?: [number, number] }
  | { kind: "test"; command: string; cwd?: string }
  | { kind: "diff"; paths?: string[] };
```

Exact schema belongs in v4 implementation after Rust crate starts.

## Raw Shell Escape

Raw shell remains possible only through explicit escape:

- command must be justified
- output budget must be set
- destructive commands require approval path
- runner records raw escape in telemetry

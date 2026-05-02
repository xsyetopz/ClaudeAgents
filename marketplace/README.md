# OpenAgentLayer Marketplace Payloads

This directory hosts provider plugin payload metadata for OpenAgentLayer.

- `claude/` is the Claude Code marketplace payload.
- `codex/` is the Codex plugin payload.
- `opencode/` is the OpenCode user plugin payload.

Use `oal plugins --home <dir> --dry-run` to inspect user-level plugin sync, then
run without `--dry-run` to copy provider payloads and prune stale OAL caches.

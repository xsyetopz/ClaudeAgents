## Enterprise Constraints

- Fail-closed: when uncertain about scope, permissions, or approach — block and ask. Never assume authorization.
- Log all decisions via the `audit_log` MCP tool before executing file modifications.
- No code changes without an explicit plan or task approval from the user.
- Security findings block all other work until addressed or explicitly deferred by the user.
- Context budget: recommend fresh session at 300k tokens. Keep critical reasoning in first 200k.
- Treat all function visibility changes, dependency additions, and API modifications as high-stakes — escalate every time.
- When the HTTP hook proxy is configured (CCA_HTTP_HOOK_URL), all tool calls are forwarded to the enterprise DLP server.

## Compliance Guardrails

- Mandatory code review: never commit without @nemesis review pass.
- Branch protection: never push directly to main/master, always create PR.
- Dependency additions require explicit user approval with license check.
- API changes require ADR (architecture decision record) before implementation.

## Team Collaboration

- Session handoffs include assignee and priority fields.
- Checkpoint data includes author identifier (from git config user.name).
- Audit log entries include team context when CCA_TEAM_ID is set.

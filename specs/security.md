# Security Contract

Olympi is a Pi extension/harness wrapper. The CLI is install/admin/bootstrap;
normal workflows are Pi slash commands, skills, hooks, and tool shims.

## Enforced invariants

- Inspect/evaluate never execute package code, lifecycle scripts, package
  scripts, extension code, hooks, tools, or providers.
- Extension inspection reads metadata/source shape without importing code.
- Passive install excludes executable resources; executable package material is
  intake-classified and hashed before trust decisions.
- Applied project install writes only documented project-local owned paths,
  settings entries, and `.pi/extensions/olympi-aegis.ts`.
- Applied uninstall removes only manifest-owned files with matching hashes.
- Global Pi registration requires explicit `--global --apply --confirm-global
  --provenance explicit-user-approval`.
- Governed command execution routes through RTK; bypass/fallback/emulation
  attempts are hook-vetoed.
- Workspace mutation of ambiguous paths requires ownership proof or explicit
  user approval.
- Active blockers pause affected goal planning, resume write-through, and
  execution until the blocker is resolved.
- Verification uses temp projects and fake homes for write-boundary checks.

## Excluded product surfaces

Provider runtime launch and live executable-resource host brokering are not
Olympi product surfaces. Provider-event fixtures and executable-resource gate
helpers may remain only as internal policy/conformance tests; public docs/help
must not advertise them as user capabilities.

## Runtime policy

Themis policy decisions cover Pi event-shaped inputs including `tool_call`,
`tool_result`, `before_provider_request`, input/session/resource/model events,
and thinking-level selection. Policy decisions fail closed for dangerous
commands, protected paths, unapproved generated artifact writes, executable
package load attempts, missing plan approval, unsafe global writes, and unsafe
`~/.pi` writes.

The first-party Aegis extension delegates to shared policy modules and does not
execute third-party package code.

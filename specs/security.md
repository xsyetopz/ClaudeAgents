# Security Contract

Release-blocking invariants:

- Inspect/evaluate never execute package code, lifecycle scripts, package
  scripts, extension code, hooks, tools, or providers.
- Extension inspect never imports or runs extension code.
- Executable resources are blocked from default passive install.
- Applied install writes only project-local owned paths and settings entries.
- Applied uninstall removes only manifest-owned files with matching hashes.
- No command writes to `~/.pi` by default.
- Verification includes fake-home no-global-write checks.

Any future executable support requires explicit trust, sandbox, and host-broker
specs plus tests.

## Runtime policy

Themis policy decisions cover Pi event-shaped inputs including `tool_call`,
`tool_result`, `before_provider_request`, input/session/resource/model events,
and thinking-level selection. Policy decisions fail closed for dangerous
commands, protected paths, unapproved generated artifact writes, executable
package load attempts, missing plan approval, unsafe global writes, and unsafe
`~/.pi` writes.

The first-party Aegis extension delegates to shared policy modules. It does not
execute third-party package code.

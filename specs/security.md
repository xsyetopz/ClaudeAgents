# Security Contract

Olympus 0.1.0 release-blocking invariants:

- Inspect/evaluate never execute package code, lifecycle scripts, package scripts, extension code, hooks, tools, or providers.
- Extension inspect never imports or runs extension code.
- Executable resources are blocked from default passive install.
- Applied install writes only project-local Olympus-owned paths and settings entries.
- Applied uninstall removes only manifest-owned files with matching hashes.
- No command writes to `~/.pi` by default.
- Verification must include fake-home no-global-write checks.

Any future executable support requires explicit trust, sandbox, and host-broker specs plus tests before product claims are allowed.

## Track A safety/runtime policy

Olympus implements pure Themis policy decisions for Pi event shapes including `tool_call`, `tool_result`, `before_provider_request`, input/session/resource/model events, and thinking-level selection. Safety decisions fail closed for dangerous commands, protected paths, unapproved generated artifact writes, executable package load attempts, missing plan approval, unsafe global writes, and unsafe `~/.pi` writes.

The first-party Aegis extension surface is a non-executing skeleton in this phase. It reports intended hook subscriptions and delegates to shared policy modules; it does not execute third-party package code. Sandbox checks are probe/status only and keep executable loads blocked until trust, lock, and sandbox gates pass. Broker validation is schema-only and read-only for git, gh, and registry metadata/tarball requests; arbitrary shell strings are denied.

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

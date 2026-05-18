# Security Model

Olympus 0.1.0 chooses conservative inspection over execution.

## Invariants

- Inspect/evaluate do not execute third-party package code.
- Extension inspection does not import or run extension code.
- Executable resources are blocked unless future trust and sandbox gates exist.
- Mutating install/uninstall commands are project-local, dry-run first, and manifest-owned.
- No command writes to `~/.pi` by default.
- Hash mismatches prevent deletion of changed files.
- Verification uses temp projects and fake homes.

## Planned hardening

Future work may add explicit trust policy, sandbox execution, host capability brokers, stronger provenance, and richer policy checks. Those protections are not implemented in 0.1.0 and must not be claimed until verified.

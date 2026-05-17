# Olympus CLI Contract

The low-level CLI is the source of truth. Interactive UX and future Pi commands must call the same CLI/library rules and must not duplicate business logic.

## Binary

- Primary binary: `olympus`
- No `oal` compatibility alias.

## Required command surface

Read-only first:

- `olympus inspect <local-package-path>`
- `olympus package evaluate <source>`
- `olympus extension inspect <path>`
- `olympus plan <operation>`
- `olympus verify`
- `olympus audit`
- `olympus sandbox check`

Mutating later, dry-run first:

- `olympus lock <source>`
- `olympus trust <package-id>`
- `olympus untrust <package-id>`
- `olympus install <source> --project`
- `olympus uninstall <package-id> --project`
- `olympus extension create <name>`

## Invariants

- Inspect/evaluate execute no package code and no lifecycle scripts.
- Mutating commands preview before apply and write only documented Olympus-owned paths.
- Project-local is default; global writes require explicit future high-risk design.
- Machine-readable `--json` output is required for implemented commands.
- Stable exit codes distinguish success, validation findings, usage errors, safety blocks, unavailable platform/backend, and internal errors.

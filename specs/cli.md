# CLI Contract

The active low-level binary is `olympus`. The source-checkout invocation is `bun run olympus -- <command>`.

## Read-only commands

- `inspect <local-package-path> [--json]`
- `package evaluate <source> [--json]`
- `package-evaluate <source> [--json]`
- `catalog [--json]`
- `spec [--json]`
- `status [--json]`
- `plan <operation> [source] [--json]`
- `verify [--json]`
- `extension inspect <path> [--json]`

## Mutating commands

- `extension create <name> --apply --output <directory> [--json]` writes only to the explicit output directory.
- `install <source> --project --apply [--json]` writes only Olympus-owned project-local mirror, lock, manifest, audit, and settings package entries.
- `uninstall <package-id> --project --apply [--json]` removes only manifest-owned resources with matching hashes.

Mutating commands support dry-run forms where applicable. Malformed usage returns exit code 2; safety blocks return exit code 3.

## Interactive wrapper

`olympus interactive` presents guided status, package evaluation, extension creation, and help workflows. It must route behavior through the same service modules as the low-level CLI.

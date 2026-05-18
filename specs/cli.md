# CLI Contract

The active low-level binary is `olympus`. The source-checkout invocation is `bun run olympus -- <command>`.

## Read-only commands

- `inspect <local-package-path> [--json]`
- `package evaluate <source> [--json]`
- `package-evaluate <source> [--json]`
- `catalog [--json]`
- `spec [--json]`
- `status [--json]`
- `report status [--json]`
- `report handoff [--json]`
- `report acceptance [--json]`
- `compact <fixture-or-file> [--kind <kind>] [--raw|--verbose] [--json]`
- `rtk status [--json]`
- `quota status [--json]`
- `safety check [--json]`
- `hooks policy [--json]`
- `sandbox check [--json]`
- `broker validate <fixture> [--json]`
- `trust status [--json]`
- `resources validate [path] [--json]`
- `prompt contract <input-or-file> [--json]`
- `review plan <plan-file> [--json]`
- `review diff <diff-file> [--json]`
- `handoff current [--json]`
- `module status [--json]`
- `module run <module> --dry-run [--json]`
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

## Reporting and efficiency commands

Track C reporting commands are read-only by default. They emit deterministic JSON with schemaVersion 1 and redact secret-looking compacted output before summaries. `rtk status` detects an RTK executable on PATH without executing it and marks RTK-backed paths as preferred for shell output, read, grep/find/rg, git diff/status/log, test output, and package-manager logs. If RTK is unavailable, reports include an explicit degraded/fallback reason.

`quota status` reads only project-local `.pi/olympus/quota/profile.json` when present. Supported user labels are `plus`, `pro-5x`, `pro-20x`, and `unknown`; provider limits remain `unknown` unless observed by a provider source.

## Safety/runtime commands

Track A safety commands are read-only by default. `safety check` runs deterministic Themis policy fixtures; `hooks policy` reports the non-executing Olympus-owned Aegis skeleton; `sandbox check` reports sandbox readiness and fake-home secret denial without executing untrusted package code; `broker validate` accepts only typed read-only git, gh, and registry request schemas and denies arbitrary shell strings; `trust status` reports unsigned, locked, hash-mismatch, trusted-passive, executable-blocked, sandbox, home-denied, and network-denied signage.

## Authoring/workflow commands

Track B authoring commands are read-only by default. `resources validate` validates Olympus-owned skill/prompt/command metadata, provenance, support files, and command collisions. `prompt contract` emits deterministic prompt-contract JSON preserving user paths and constraints. `review plan` and `review diff` emit digest-backed review artifacts without external servers. `handoff current` emits compact Hermes handoff summaries without altering decisions. `module status` and `module run <module> --dry-run` expose bounded Olympus module shells; Hephaestus remains blocked until approved plan digest, path allowlist, manifest ownership, and Themis approval are proven.

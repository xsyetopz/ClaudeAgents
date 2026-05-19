# Installation

0.1.0 runs from this repository. There are no release archives, registry
packages, Homebrew formulae, or global installers for this version.

## Requirements

- Bun 1.3.14
- Node.js 24.14.1 or newer for Node-compatible tooling
- Unix-like shell for the verified workflow

## Setup

Use the source checkout for local development and verification:

```sh
git clone <repository-url> olympi
cd olympi
bun install --frozen-lockfile
bun run olympi -- --help
bun run olympi:verify -- --json
```

The root package is private. CLI commands run `packages/cli/src/cli.ts` through
Bun. This source/dev workflow is the recommended developer path; developers do
not need to globally install the checkout for normal work.

## Local checks

```sh
bun run typecheck
bun run olympi:test
bun run biome:check
bun run olympi:verify -- --json
bun run olympi:catalog -- --json
```

CI runs those gates plus `bun run olympi:smoke`, which uses temporary home,
`XDG_*`, `BUN_INSTALL`, and project directories to check source invocation,
help output, local `bun link`, and the source-global install command.

## CI packaging smoke contract

The CI smoke path intentionally runs this command from the repository root:

```sh
bun install -g "$PWD" --production --ignore-scripts
```

This is not the recommended developer workflow. It is a packaging smoke test:
it proves the root package `bin` metadata can install an `olympi` command into
an isolated Bun home and that the installed command runs from outside the
checkout.

For Olympi, `--production` means the installed CLI must work with runtime
dependencies only. Root development tools such as TypeScript, Biome, Bun types,
and tests are intentionally excluded; the CLI workspace packages must be listed
as runtime dependencies when they are needed by the binary.

`--ignore-scripts` is currently safe because package manifests do not define
install lifecycle hooks required by the CLI, and the `olympi` binary points to
checked-in source rather than build-only generated output. The smoke script has
a metadata guard for that contract: adding install lifecycle scripts or moving a
CLI binary target under common generated-output directories fails the smoke run.

Change this command and this rationale if the CLI later requires compiled or
generated runtime artifacts, lifecycle setup, a different published package
shape, or production dependency semantics that differ from the source checkout.

## Project-local install workflow

Preview the package mirror plan:

```sh
bun run olympi -- install /path/to/pi-package --project --dry-run
```

Apply after reviewing the planned writes:

```sh
bun run olympi -- install /path/to/pi-package --project --apply
```

Applied install writes only:

```text
.pi/settings.json
.pi/olympi/olympi.lock
.pi/olympi/olympi-manifest.json
.pi/olympi/audit.jsonl
.pi/olympi/packages/<package-id>/package/**
```

The mirror is project-local. It is not a global Pi install.

## Uninstall workflow

```sh
bun run olympi -- uninstall <package-id> --project --dry-run
bun run olympi -- uninstall <package-id> --project --apply
```

Uninstall reads `.pi/olympi/olympi-manifest.json`. Files with hash mismatches
are preserved.

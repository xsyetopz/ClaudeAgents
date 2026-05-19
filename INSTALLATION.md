# Installation

0.1.0 runs from this repository. There are no release archives, registry
packages, Homebrew formulae, or global installers for this version.

## Requirements

- Bun 1.3.14
- Node.js 24.14.1 or newer for Node-compatible tooling
- Unix-like shell for the verified workflow

## Setup

```sh
git clone <repository-url> olympi
cd olympi
bun install --frozen-lockfile
bun run olympi -- --help
bun run olympi:verify -- --json
```

The root package is private. CLI commands run `packages/cli/src/cli.ts` through
Bun.

## Local checks

```sh
bun run olympi:test
bun run typecheck
bun run biome:check
bun run olympi:catalog -- --json
bun run olympi:verify -- --json
git diff --check
```

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

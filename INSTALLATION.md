# Installing Olympus 0.1.0

Olympus 0.1.0 is a source-checkout product. There are no release archives, package-registry artifacts, or platform package-manager formulae for this 0.1.0 boundary.

## Requirements

- Bun 1.3.14
- Node.js 24.14.1 or newer for Node-compatible tooling
- macOS or another Unix-like development shell for the verified workflow

## Source checkout setup

```sh
git clone <repository-url> olympus
cd olympus
bun install --frozen-lockfile
bun run olympus -- --help
bun run olympus:verify -- --json
```

The root package is private and runs Olympus directly from `packages/olympus/src/cli.ts`.

## Common checks

```sh
bun run olympus:test
bun run typecheck
bunx biome check packages/olympus --max-diagnostics 200
bun run olympus:catalog -- --json
bun run olympus:verify -- --json
```

## Project-local package install workflow

Olympus installs only approved passive Pi resources into the current project when explicitly applied.

Preview first:

```sh
bun run olympus -- install /path/to/pi-package --project --dry-run
```

Apply only after reviewing the plan:

```sh
bun run olympus -- install /path/to/pi-package --project --apply
```

Applied install writes only these project-local paths:

```text
.pi/settings.json
.pi/olympus/olympus.lock
.pi/olympus/olympus-manifest.json
.pi/olympus/audit.jsonl
.pi/olympus/packages/<package-id>/package/**
```

The installed package is a sanitized project-local mirror owned by Olympus metadata. It is not a global Pi installation.

## Uninstall workflow

Preview manifest-owned removal:

```sh
bun run olympus -- uninstall <package-id> --project --dry-run
```

Apply removal:

```sh
bun run olympus -- uninstall <package-id> --project --apply
```

Uninstall authority comes from `.pi/olympus/olympus-manifest.json`. Hash mismatches preserve changed files for manual review.

## No global writes by default

Olympus 0.1.0 does not write to `~/.pi` by default. Verification uses fake homes to guard that boundary.

## Unsupported at 0.1.0

- Global installation.
- Executing third-party package code.
- Sandboxed extension execution.
- Release archives, registry publishing, or platform package-manager distribution.

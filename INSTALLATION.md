# Installation

0.1.0 is a private source/package-manager-bin release. There are no release
archives, registry packages, or Homebrew formulae for this version.

## Runtime model

Olympi is installed for use by Pi as a Pi extension/harness layer. Pi is the
runtime host. The `olympi` binary exists for development/admin automation,
smoke tests, status, verification, and explicit project-local state commands;
it is not the primary runtime identity and does not replace Pi. Its default
state boundary is the project, not the user's Pi home:

- owned state: `.pi/olympi/**`;
- controlled Pi/Olympi entries: project `.pi/settings.json` package entries and
  `.pi/extensions/olympi-aegis.ts` only when explicitly installed;
- global state: written only by explicit `--global` install with confirmation
  and provenance gates;
- writes: only explicit `--save`, `--apply`, or `--write` commands;
- primary runtime: Pi extension/harness loaded by Pi from `.pi/extensions/**`
  or an explicit `pi -e` path.

Runtime behavior remains executable, manifest-owned, and project-local by
default. Pi's own documentation supports global and project extension locations;
Olympi maps those to safe project-local default install and explicit global
registration.

## Install and invocation decision

- **Installed per project?** Yes by default. `olympi install --apply` writes the
  project-local Pi extension entrypoint and project-local Pi/Olympi state.
- **Installed globally into Pi?** Yes only when explicitly requested.
  `olympi install --global --apply --confirm-global --provenance
  explicit-user-approval` writes global Pi extension registration under
  `~/.pi/agent/extensions`. No global Pi state is touched without `--global`.
- **Invoked by Pi?** Yes. The intended runtime path is `pi` loading the Olympi
  extension entrypoint from the project, or `pi -e <runtime path>` for a one-off
  test.
- **CLI role?** Bootstrap/admin entrypoint: install, uninstall, doctor, status,
  reports, scoped developer verification, trust gates, and smoke tests.
- **Global binary?** Optional `bun link` or `bun install -g "$PWD"` exposes an
  `olympi` command in the package-manager global bin. That is not a global Pi
  extension install.

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
bun run olympi -- install --dry-run
bun run olympi:doctor -- --json
bun run olympi:verify -- --json
```

The root package is private. CLI commands run `packages/cli/src/cli.ts` through
Bun. This source/dev workflow is the recommended developer path; developers do
not need to globally install the checkout for normal work.

## Install into a Pi project

From the target project, use the Olympi CLI from a checked-out or explicitly
linked/installable Olympi copy:

```sh
cd /path/to/project
olympi install --dry-run
olympi install --apply
pi
```

Pi auto-discovers `.pi/extensions/olympi-aegis.ts`; use `/reload` in an existing
Pi session. For a one-off runtime test without writing project extension state:

```sh
pi -e /path/to/OpenAgentLayer/packages/extensions/src/aegis/pi-runtime.ts
```

## Explicit global Pi registration

Global registration is never the default. Review the target first:

```sh
olympi install --global --dry-run
```

Apply only with explicit confirmation and provenance:

```sh
olympi install --global --apply --confirm-global --provenance explicit-user-approval
```

This writes `~/.pi/agent/extensions/olympi-aegis.ts`. It is separate from
`bun link` or `bun install -g "$PWD"`, which only expose the CLI binary.

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
help output, local `bun link`, and the source-global CLI install command.

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

## Project-local package/resource workflow

Preview the package mirror plan:

```sh
bun run olympi -- dev install /path/to/pi-package --project --dry-run
```

Apply after reviewing the planned writes:

```sh
bun run olympi -- dev install /path/to/pi-package --project --apply
```

Applied install writes only:

```text
.pi/settings.json
.pi/olympi/olympi.lock
.pi/olympi/olympi-manifest.json
.pi/olympi/audit.jsonl
.pi/olympi/packages/<package-id>/package/**
```

The mirror is project-local Pi/Olympi state. It is not a global Pi install and
does not install Olympi itself.

## Uninstall workflow

```sh
bun run olympi -- dev uninstall <package-id> --project --dry-run
bun run olympi -- dev uninstall <package-id> --project --apply
```

Uninstall reads `.pi/olympi/olympi-manifest.json`. Files with hash mismatches
are preserved.

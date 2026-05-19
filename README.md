# Olympus 0.1.0

Olympus is a PiCodingAgent-first framework for safe local agent augmentation from a source checkout. It inspects local Pi packages, evaluates resource risk before trust, generates Olympus-owned Pi extension skeletons, and installs approved passive resources into project-local, manifest-owned mirrors.

0.1.0 is the first committed Olympus source-checkout product boundary in the 0-series line. It is not an API freeze, not a v1-style compatibility guarantee, and not a claim that all planned parity work is complete.

## Implemented now

- Read-only package inspection and evaluation for local Pi packages.
- Passive/executable resource classification for skills, prompts, themes, extensions, tools, providers, hooks, scripts, and support files.
- Content hashing for package resources and skill support files.
- Human-readable and JSON reports.
- First-party extension skeleton generation with `olympus-extension.json` metadata.
- Extension inspection without executing extension code.
- Project-local passive install and manifest-backed uninstall.
- Project status, catalog/spec output, verification fixtures, and a high-level interactive wrapper.

## Requirements

- Bun 1.3.14
- Node.js 24.14.1 or newer for Node-compatible tooling
- macOS or another Unix-like development shell for the verified source-checkout workflow

## Install from source

```sh
bun install --frozen-lockfile
bun run olympus -- --help
```

Olympus does not publish release archives, npm packages, or platform package-manager formulae from this repository at 0.1.0.

## Basic commands

```sh
bun run olympus -- inspect <local-package-path> --json
bun run olympus -- package evaluate <local-package-path> --json
bun run olympus -- extension create my-extension --dry-run
bun run olympus -- extension create my-extension --apply --output ./tmp
bun run olympus -- install <local-package-path> --project --dry-run
bun run olympus -- install <local-package-path> --project --apply
bun run olympus -- status --json
bun run olympus -- uninstall <package-id> --project --dry-run
bun run olympus -- verify --json
bun run olympus -- catalog --json
bun run olympus -- spec --json
bun run olympus -- interactive
```

## Safety boundaries

- Inspect, evaluate, status, catalog, spec, verification, and extension inspection do not execute third-party package code.
- Executable resources are identified and blocked from default passive install.
- Applied install writes only project-local Olympus-owned paths under `.pi/olympus/**` plus managed `.pi/settings.json` package entries.
- Applied uninstall removes only manifest-owned files and settings entries with matching hashes.
- No command writes to user-global `~/.pi` by default.
- Verification uses temporary projects and fake homes to test no-global-write behavior.

## Not implemented at 0.1.0

- Global Pi installation.
- Execution of untrusted third-party extensions, tools, hooks, lifecycle scripts, or package scripts.
- Operating-system sandboxing, trust brokers, or host capability brokers.
- Release archives, package registry publishing, or platform package-manager distribution.
- Completed roadmap parity for hooks, token-efficiency, plan review, prompt contracts, quota awareness, or teams/subagents.

## Documentation and specs

- [`docs/`](docs/README.md) — compact product documentation.
- [`specs/`](specs/README.md) — 0.1.0 contracts and future-roadmap boundaries.
- [`INSTALLATION.md`](INSTALLATION.md) — source-checkout setup and project-local install behavior.
- [`SECURITY.md`](SECURITY.md) — threat model and reporting guidance.
- [`CHANGELOG.md`](CHANGELOG.md) — 0.1.0 changes.

## Repository layout

| Path          | Purpose                                                                |
| ------------- | ---------------------------------------------------------------------- |
| `packages/*`  | Active single-word domain packages plus CLI tests and entrypoints.     |
| `docs`        | Active Olympus documentation.                                          |
| `specs`       | Active Olympus 0.1.0 contracts.                                        |
| `oal_legacy`  | Gitignored historical reference snapshot; not imported by active code. |
| `third_party` | Protected reference material pending a separate policy.                |

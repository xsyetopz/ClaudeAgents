# Security

Olympi is a first-party Pi extension/harness wrapper. Pi is the host runtime;
the `olympi` CLI is install/admin/bootstrap automation. Normal workflows run
through Pi slash commands, skills, hooks, and tool shims.

## Threat model

Local Pi packages, package metadata, resource files, lifecycle scripts,
extension code, hooks, tools, provider adapters, generated artifacts, command
text, and workspace paths are untrusted input until Olympi policy and provenance
checks accept them. An attacker may try to execute package code during intake,
write outside project-local state, overwrite user-owned files, bypass RTK, hide
workspace ownership, leak credentials through command execution, or remove files
that Olympi does not own.

## Trust boundaries

- Pi owns user-global `~/.pi/agent/**` settings, sessions, credentials, global
  extensions, and package caches.
- Olympi owns only manifest/provenance-backed project-local `.pi/olympi/**`,
  its manifest-owned `.pi/settings.json` package entries, and the project-local
  `.pi/extensions/olympi-aegis.ts` entrypoint after explicit install.
- Package source directories and unpacked package resources are untrusted intake
  material. Intake reads, classifies, and hashes them without running code.
- Governed commands cross into execution only through RTK routing, Themis
  policy, hook vetoes, mutation confirmation, and workspace provenance checks.

## Install/uninstall guarantees

- Package inspection and evaluation never execute package code, lifecycle
  scripts, package-manager scripts, extension code, hooks, tools, or providers.
- Default package install is passive-resource install only. Executable resources
  are classified and hashed during intake and are not installed as trusted code
  by passive install.
- `olympi install --apply` without `--global` writes only project-local Pi
  extension/state paths documented by the install plan.
- Global Pi extension registration requires `--global --apply
  --confirm-global --provenance explicit-user-approval`.
- Uninstall authority comes from the Olympi manifest and matching file hashes;
  hash mismatches preserve files for manual review.

## Project-local/global write rules

- Project-local writes require explicit mutating flags such as `--apply`,
  `--save`, or `--write`.
- User-global `~/.pi/agent/**` writes are denied by default and allowed only by
  the explicit global registration gate above.
- Revert-like, delete, move, broad formatter, staging, and commit operations on
  ambiguous workspace paths are denied until manifest hash proof, provenance
  record, same-run agent creation, or explicit user approval is present.

## RTK command-routing guarantees

- Governed command execution routes through RTK automatically.
- Supported commands route to native RTK forms; other command shapes route
  through RTK proxy/pass-through.
- Direct shell fallback, RTK workaround rewrites, manual RTK emulation, and
  disabled RTK routing are hook-vetoed.

## Hook enforcement guarantees

- Built-in hooks evaluate typed phases including `pre-action`, `validation`,
  `architecture-boundary`, `blocked-state`, `stop`, and commit-adjacent phases.
- Hook vetoes stop the affected operation and return a required next action.
- Active blocked goal state prevents unrelated planning, resume write-through,
  and execution bypass.

## Shared-workspace/provenance guarantees

- Path shape is never ownership proof.
- `.pi/**`, generated-looking paths, and tool output paths still require
  manifest/provenance/same-run/explicit-user-approval proof before destructive
  or mutating operations.
- Generated artifact writes require an approved generation manifest.
- Verification uses temporary project roots and fake homes for write-boundary
  checks.

## Verification/evidence

The security contract is backed by these checks:

- `bun run olympi:test` covers package intake no-exec behavior, install/uninstall
  manifest authority, workspace ownership policy, RTK routing, hook vetoes,
  goal blocked-state behavior, and docs/catalog surface checks.
- `bun run olympi:doctor -- --json` checks install/runtime/RTK/Pi/hook/catalog
  health without repairing state.
- `bun run olympi:catalog -- --json` validates command contracts and safety
  invariants used by reports/help.
- `bun run olympi:verify -- --json` exercises temp-project/fake-home acceptance
  fixtures for install, uninstall, goal resume, completion, and no-global-write
  behavior.

## Non-goals

- Olympi is not a standalone replacement for Pi.
- Olympi does not execute untrusted third-party extensions, hooks, tools,
  providers, package scripts, lifecycle scripts, or provider-native swarms.
- Provider runtime launch is not a product surface. Internal provider-event
  schema fixtures may exist only as policy parser/conformance tests.
- Live host-broker execution of executable package resources is not a product
  surface. Executable package handling is intake classification, hashing, trust
  signage, and policy gating only.
- Completion is not accepted without objective-specific verification evidence
  and an explicit completion audit.

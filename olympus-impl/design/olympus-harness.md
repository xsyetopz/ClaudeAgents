# Phase 01 Design — Olympus Harness

## Status

Phase 01 design output. This file is design only: no product implementation, deletion, move, rename, legacy snapshot, or active OAL cleanup was performed.

## Product identity

Olympus is a PiCodingAgent-first harness product for safe local agent augmentation. It is not OAL vNext, an OAL compatibility bridge, or a Codex/Claude/OpenCode provider renderer.

Olympus owns three product promises:

1. **Author safely:** generate Olympus-owned project-local Pi extensions, skills, prompts, and themes with clear contracts.
2. **Evaluate before trust:** inspect Pi packages/resources before installation or execution.
3. **Own every mutation:** plan, manifest, verify, and uninstall every Olympus-written file.

## Pi-first harness boundary

The release-critical boundary is a standalone low-level CLI named `olympus`. A Pi package/extension layer provides in-Pi UX later, but must not be the only safety boundary because third-party Pi extensions run with host user permissions unless externally constrained.

```text
local Pi package/resource
  -> Olympus inspect/evaluate
  -> resource inventory + hashes + passive/executable classification
  -> lock/trust/manifest decision
  -> project-local Pi package mirror or generated Olympus extension
  -> verify/acceptance
```

## Architecture components

| Component | Owner role | Phase-01 decision |
| --- | --- | --- |
| Package inspector | Reads local/npm/git Pi package metadata and files without code execution | Implement local path first; network sources later |
| Resource classifier | Classifies skills/prompts/themes as passive and extensions/tools/providers/hooks/scripts as executable | Required before install/trust |
| Hash/provenance model | Hashes package content and individual resources | Required for lock and drift detection |
| Lock/trust store | Records reviewed package source, digest, inventory, capabilities, trust decision, and sandbox profile | Project-local first |
| Manifest owner | Records Olympus-owned generated/mirrored files and settings entries | Required before uninstall |
| Pi mirror writer | Installs approved passive resources into `.pi/olympus/packages/<id>/package` and references that mirror from `.pi/settings.json` | Project-local only by default |
| Extension generator | Creates Olympus-owned extension skeletons with documented events, tools, side effects, and tests | First-party generation only; no third-party execution by default |
| Sandbox probe | Detects OS containment availability | Linux/WSL2 strong target; macOS degraded/blocked for untrusted execution |
| Broker seam | Provides typed host capabilities without exposing raw credentials | Design seam; read-only brokers later |
| Acceptance | Uses temp roots/fake homes to prove safety | Release gate |

## Retained OAL strengths, re-authored

| OAL strength | Olympus re-authoring |
| --- | --- |
| Compiler mental model | Package/resource intent -> inventory -> policy -> planned writes -> manifest -> verify/uninstall |
| Provider-native output | Pi-native resources and `.pi/settings.json` only; no three-provider renderer default |
| Manifest-backed uninstall | Olympus manifest owns only files/settings entries it wrote |
| Dry-run plan/apply split | All mutating commands preview changes before apply |
| Acceptance simulation | Temp-project tests prove inspect/install/uninstall/trust/sandbox behavior |
| Artifact hashing/provenance | Package/resource digests and per-file manifest hashes |
| Shared inspection | CLI and future Pi extension use same inspection library |
| Durable state/handoff | Lock, manifest, audit log, and phase state files are physical state |

## Rejected legacy surfaces

The following remain protected as reference until Phase 02 creates `oal_legacy/` and later replacement gates are met, but they are not Olympus product goals:

- OAL compatibility/migration behavior.
- Codex/Claude/OpenCode provider rendering as default product scope.
- OAL plugin payload sync.
- OAL command aliases or `oal` binary compatibility.
- OAL route/agent catalog copied wholesale.
- Global installs by default.
- Third-party package execution before inspect/lock/trust/sandbox gates.

## Safety invariants

- Inspect never executes package code.
- Lifecycle scripts are executable resources and are blocked by default.
- Project-local install is the default; global writes are high-risk explicit work and out of early scope.
- Skills/prompts/themes are passive-but-untrusted and receive prompt-injection signage.
- Extensions, tools, providers, hooks, shell scripts, lifecycle scripts, and package scripts are executable resources.
- `skip-permissions` may suppress confirmations only inside already-approved sandbox/trust/broker policy; it never disables OS containment.
- `unsafe-host` is outside Olympus safety guarantees.
- Signed/provenance-verified packages are not automatically safe.

## Durable state and handoff policy

Olympus state must be machine-readable and reviewable:

- `.pi/olympus/olympus.lock` for project package/resource decisions.
- `.pi/olympus/olympus-manifest.json` for ownership and uninstall.
- `.pi/olympus/audit.jsonl` for inspect/install/trust/broker/sandbox decisions.
- `olympus-impl/state/*.md` remains temporary bootstrap state until final acceptance removes the phase controller.

No state file may silently grant executable trust without binding to content digest, resource inventory, capability approval, sandbox profile, and install scope.

## Phase 02+ implementation order summary

1. Create the protected legacy snapshot and implementation plan.
2. Implement local read-only package inspection in `packages/olympus`.
3. Add passive/executable classification, hashes, reports, and fixtures.
4. Add lock/manifest/audit schemas.
5. Add project-local passive mirror install/uninstall with dry-run/apply.
6. Add first-party Olympus extension generator.
7. Add sandbox probes and later broker seams.
8. Only after replacements and manifests exist, perform destructive cleanup of OAL surfaces.

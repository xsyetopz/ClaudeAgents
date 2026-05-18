# Olympus Architecture

Olympus is a PiCodingAgent-first framework implemented in `packages/olympus`. It runs from a source checkout and exposes a standalone low-level CLI plus a high-level interactive wrapper.

## Components

- **CLI dispatch** — `packages/olympus/src/cli.ts` routes commands to service modules.
- **Inspection** — reads local package metadata and conventional Pi resource paths without executing package code.
- **Evaluation** — classifies risks, executable resources, conflicts, and installability before trust.
- **Extension authoring** — creates and inspects Olympus-owned extension skeletons with explicit metadata.
- **Install/uninstall** — mirrors approved passive resources into project-local `.pi/olympus/**` paths and removes only manifest-owned files with matching hashes.
- **Status** — reads project-local lock, manifest, audit, and settings state for handoff.
- **Catalog/spec** — emits LLM-readable contracts generated from Olympus-owned source.
- **Verification** — runs deterministic temp-project and fake-home checks.
- **Interactive wrapper** — presents guided workflows while delegating behavior to the low-level modules.

## Product boundary

Olympus 0.1.0 is a source-checkout product. It does not publish release artifacts or claim API stability. Active behavior is whatever is implemented and verified under `packages/olympus` and documented in `specs/`.

## PiCodingAgent-first direction

Olympus targets Pi packages and Pi extension authoring directly. It keeps package inspection, resource classification, status output, and generated contracts readable by both humans and coding-agent sessions.

## Historical parity roadmap

Historical architecture lessons inform the roadmap, but Olympus re-authors them as Pi-native features. Planned areas include hooks, skills, prompts, commands, token efficiency, plan review, prompt contracts, teams/subagents, quota awareness, and stronger sandbox/trust gates. These are roadmap items unless listed as implemented in the specs.

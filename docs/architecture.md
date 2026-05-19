# Olympus Architecture

Olympus is a PiCodingAgent-first framework implemented as single-word domain packages under `packages/`. It runs from a source checkout and exposes a standalone low-level CLI plus a high-level interactive wrapper.

## Components

- **CLI dispatch** — `packages/cli/src/cli.ts` routes commands to public domain package APIs.
- **Inspection** — reads local package metadata and conventional Pi resource paths without executing package code.
- **Evaluation** — classifies risks, executable resources, conflicts, and installability before trust.
- **Extension authoring** — creates and inspects Olympus-owned extension skeletons with explicit metadata.
- **Install/uninstall** — mirrors approved passive resources into project-local `.pi/olympus/**` paths and removes only manifest-owned files with matching hashes.
- **Status** — reads project-local lock, manifest, audit, and settings state for handoff.
- **Catalog/spec** — emits LLM-readable contracts generated from Olympus-owned source.
- **Verification** — runs deterministic temp-project and fake-home checks.
- **Interactive wrapper** — presents guided workflows while delegating behavior to the low-level modules.
- **Goal-loop foundation** — `lifecycle` owns durable objectives, bounded step attempts, progress ledger entries, blocker detection, completion verification gates, and compaction/continuation recovery prompts.
- **Hook interfaces** — `safety` owns typed hook phases and veto decisions for pre-action, validation, architecture-boundary, blocked-state, stop, and commit-adjacent guardrails.
- **Skill discovery** — `authoring` owns topical skill metadata, lazy loading, model-tier hints, and generalized skill-refinement proposals.

## Product boundary

Olympus 0.1.0 is a source-checkout product. It does not publish release artifacts or claim API stability. Active behavior is whatever is implemented and verified under `packages/` and documented in `specs/`.

## PiCodingAgent-first direction

Olympus targets Pi packages and Pi extension authoring directly. It keeps package inspection, resource classification, status output, and generated contracts readable by both humans and coding-agent sessions.

## Historical parity roadmap

Historical architecture lessons inform the roadmap, but Olympus re-authors them as Pi-native features. Planned areas include hooks, skills, prompts, commands, token efficiency, plan review, prompt contracts, teams/subagents, quota awareness, and stronger sandbox/trust gates. These are roadmap items unless listed as implemented in the specs.

## OAL/Codex delta applied in this slice

- Retained OAL's route discipline, completion evidence, blocker reporting, bounded subagent guidance, and topical skill idea.
- Rejected legacy provider-renderer resurrection and uncontrolled fan-out.
- Avoided the Codex `/goal` failure mode where a blocked loop keeps doing unrelated hardening: concrete blockers now produce an explicit paused/blocked state with the needed action.
- Completion requires objective-specific verification evidence and a completion audit, not a self-judged “looks good”.
- Continuation recovery re-injects the durable objective and completion audit requirements after compaction.

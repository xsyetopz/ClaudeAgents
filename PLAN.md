# Olympus Implementation Plan

This repository is being re-authored from OpenAgentLayer (OAL) into Olympus under the temporary authority of `olympus-impl/`.

## Governing sequence

1. Phase 00 — formal study of original OAL architecture and entire pipeline
2. Phase 01 — design the PiCodingAgent-first Olympus harness extension
3. Phase 02 — create gitignored `oal_legacy/` reference snapshot and implementation plan
4. Phase 03+ — implement Olympus and clean up only after replacements exist

No destructive active OAL cleanup is allowed until phases 00, 01, and 02 are complete, `oal_legacy/` exists, paths are classified, and replacements or deletion reasons are documented.

## Current status

Phase 00, Phase 01, and Phase 02 are complete.

Phase 00 study outputs:

- `olympus-impl/studies/oal-architecture.md`
- `olympus-impl/studies/oal-pipeline.md`
- `olympus-impl/studies/oal-strengths.md`
- `olympus-impl/studies/oal-gaps.md`
- `olympus-impl/classification/root-paths.md`
- `olympus-impl/classification/configs.md`
- `olympus-impl/classification/third-party.md`

Phase 01 design outputs:

- `olympus-impl/design/olympus-harness.md`
- `olympus-impl/design/extension-system.md`
- `olympus-impl/design/cli-system.md`
- `olympus-impl/design/verification-system.md`
- `olympus-impl/contracts/product.md`
- `olympus-impl/contracts/cli.md`
- `olympus-impl/contracts/extension.md`
- `olympus-impl/contracts/package-evaluation.md`

Phase 02 preparation outputs:

- `oal_legacy/` gitignored reference snapshot
- `olympus-impl/IMPLEMENTATION_PLAN.md`
- `olympus-impl/DELETE_AFTER_REPLACEMENT.md`
- `olympus-impl/logs/phase-02.md`

## Olympus product decision

Olympus is PiCodingAgent-first. It is not OAL vNext, an OAL compatibility bridge, or a three-provider renderer.

The strongest OAL ideas are retained only as re-authored Olympus patterns:

- source intent separated from generated output;
- deterministic inspection/evaluation;
- Pi-native package/resource awareness;
- plan/apply setup behavior;
- manifest-backed ownership and uninstall;
- executable verification fixtures;
- acceptance as an end-to-end product simulation;
- durable state/handoff files;
- explicit third-party package evaluation before installation or execution.

The main risks to avoid remain:

- copying OAL provider architecture into Olympus;
- keeping OAL compatibility/migration framing in active Olympus docs;
- treating generated artifacts as source truth;
- installing third-party Pi packages without conflict evaluation;
- executing third-party Pi code without trust, lock, capability, and OS sandbox gates;
- deleting active OAL material before documented replacements and verification exist.

## Next phase only

Run phase 03 next in a new Pi session unless a narrower authorized Phase 02 subphase is explicitly selected.

Phase 03 must implement real Olympus low-level CLI package boundaries in `packages/olympus` while preserving active OAL files. Do not perform destructive cleanup in Phase 03.

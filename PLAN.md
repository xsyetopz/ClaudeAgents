# Olympus Implementation Plan

This repository is being re-authored from OpenAgentLayer (OAL) into Olympus under the temporary authority of `olympus-impl/`.

## Governing sequence

1. Phase 00 — formal study of original OAL architecture and entire pipeline
2. Phase 01 — design the PiCodingAgent-first Olympus harness extension
3. Phase 02 — create gitignored `oal_legacy/` reference snapshot and implementation plan
4. Phase 03+ — implement Olympus and clean up only after replacements exist

No destructive implementation or active OAL cleanup is allowed before phases 00, 01, and 02 are complete.

## Current status

Phase 00 is complete. The study outputs are:

- `olympus-impl/studies/oal-architecture.md`
- `olympus-impl/studies/oal-pipeline.md`
- `olympus-impl/studies/oal-strengths.md`
- `olympus-impl/studies/oal-gaps.md`
- `olympus-impl/classification/root-paths.md`
- `olympus-impl/classification/configs.md`
- `olympus-impl/classification/third-party.md`

## Phase-00 conclusions

OAL is a compiler-style agent-environment product:

```text
source records -> source graph -> policy validation -> provider renderers -> artifacts -> deploy plan -> manifest ownership -> inspect/acceptance -> uninstall
```

The strongest ideas to re-author for Olympus are:

- source intent separated from generated output
- deterministic rendering/evaluation
- provider/native-surface awareness, narrowed to Pi first
- plan/apply setup behavior
- manifest-backed ownership and uninstall
- executable verification fixtures
- acceptance as an end-to-end product simulation
- durable state/handoff files
- explicit third-party/package evaluation before installation

The main risks to avoid are:

- copying OAL's three-provider architecture before defining a Pi-first product contract
- keeping OAL compatibility/migration framing in active product docs
- deleting OAL material before `oal_legacy/` exists and replacements are documented
- treating generated artifacts as source truth
- installing third-party Pi packages without conflict evaluation

## Next phase only

Run phase 01 next. Phase 01 is design only and must define the PiCodingAgent-first Olympus harness extension before implementation begins.

Phase 01 should use the phase-00 study as input and produce the required design files under `olympus-impl/design/` without implementing product code.

# Olympus Master Checklist

## Global Gates

- [x] PLAN.md exists and is continuously updated.
- [x] `olympus-impl/` is the authoritative temporary controller.
- [x] Phase 00 study is complete before design.
- [x] Phase 01 design is complete before implementation.
- [x] `oal_legacy/` exists before destructive cleanup.
- [x] `oal_legacy/` is listed in `.gitignore`.
- [x] Existing lint/build/test/package configs are classified before any deletion.
- [x] third_party material is classified before any deletion.
- [ ] No OAL compatibility/migration framing survives in active product docs.
- [x] Olympus is PiCodingAgent-first.

## Phase 00 — Formal OAL Study

- [x] Inspect repository top-level tree.
- [x] Inspect workspace/package layout.
- [x] Inspect source catalog model.
- [x] Inspect provider rendering pipeline.
- [x] Inspect CLI command surface.
- [x] Inspect install/deploy/uninstall behavior.
- [x] Inspect generated artifact policy.
- [x] Inspect prompts/skills/agents/hooks/tools.
- [x] Inspect third_party contents.
- [x] Inspect lint/format/typecheck/test/build configs.
- [x] Inspect acceptance/verification system.
- [x] Write `olympus-impl/studies/oal-architecture.md`.
- [x] Write `olympus-impl/studies/oal-pipeline.md`.
- [x] Write `olympus-impl/studies/oal-strengths.md`.
- [x] Write `olympus-impl/studies/oal-gaps.md`.
- [x] Write `olympus-impl/classification/root-paths.md`.
- [x] Write `olympus-impl/classification/configs.md`.
- [x] Write `olympus-impl/classification/third-party.md`.

## Phase 01 — Olympus Harness Design

- [x] Define Olympus product contract.
- [x] Define PiCodingAgent-first harness extension architecture.
- [x] Define Olympus-owned extension authoring model.
- [x] Define package evaluation and package conflict policy.
- [x] Define CLI boundaries.
- [x] Define interactive wrapper boundaries.
- [x] Define durable state/handoff policy.
- [x] Define verification gates.
- [x] Write `olympus-impl/design/olympus-harness.md`.
- [x] Write `olympus-impl/design/extension-system.md`.
- [x] Write `olympus-impl/design/cli-system.md`.
- [x] Write `olympus-impl/design/verification-system.md`.

## Phase 02 — Legacy Snapshot and Implementation Plan

- [x] Create gitignored `oal_legacy/` snapshot.
- [x] Verify `oal_legacy/` excludes `.git`, `node_modules`, build output, and generated caches.
- [x] Verify original architecture study remains available.
- [x] Create implementation package plan.
- [x] Create deletion-after-replacement plan.
- [x] Create `olympus-impl/IMPLEMENTATION_PLAN.md`.

## Phase 03 — Low-level CLI Package Boundaries

- [x] Establish `packages/olympus` package/module boundaries.
- [x] Implement low-level `olympus` CLI entrypoint.
- [x] Implement `olympus inspect <local-package-path>` as read-only local package inspection.
- [x] Discover declared and conventional Pi resources.
- [x] Classify passive and executable resources conservatively.
- [x] Hash package files, resource files, and skill support files.
- [x] Emit human-readable and JSON reports.
- [x] Implement package evaluation boundary.
- [x] Implement plan, verify, extension, install, and uninstall command boundaries.
- [x] Block install/uninstall apply paths until manifest-backed implementation exists.
- [x] Add targeted fixtures/tests under `packages/olympus`.
- [x] Run narrow Olympus verification.

## Phase 03+ — Implementation Gates

- [x] Implement real code, not planning-only files.
- [x] Preserve or adapt useful lint/build/test configs.
- [x] Keep third_party reference material until classified and replaced.
- [x] Verify after every meaningful edit group.
- [x] Update state files after each phase.
- [x] Remove old active OAL surfaces only after replacements exist.

## Final Acceptance

- [ ] Olympus installs cleanly.
- [ ] Olympus uninstalls cleanly.
- [ ] Low-level CLI works.
- [ ] Interactive wrapper works or has verified executable entrypoint.
- [ ] Olympus can inspect/evaluate third-party Pi packages.
- [ ] Olympus can generate Olympus-owned Pi extension scaffolds.
- [ ] Verification command works.
- [ ] Active README/docs present Olympus, not OAL.
- [ ] OAL material remains only as gitignored legacy reference or historical note.

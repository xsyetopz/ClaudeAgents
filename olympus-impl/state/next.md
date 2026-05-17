# Next

Run `/olympus-phase 03` in a new Pi session.

Phase 03 must implement Olympus low-level CLI package boundaries in `packages/olympus` according to:

- `olympus-impl/IMPLEMENTATION_PLAN.md`
- `olympus-impl/design/cli-system.md`
- `olympus-impl/design/extension-system.md`
- `olympus-impl/design/verification-system.md`
- `olympus-impl/DELETE_AFTER_REPLACEMENT.md`

Expected Phase 03 starting scope:

- create the `packages/olympus` package skeleton if still missing;
- implement low-level `olympus` CLI boundaries;
- begin with read-only local package inspection if using the first safe vertical slice;
- add targeted fixtures/tests under `packages/olympus`;
- preserve active OAL packages, source, specs, tests, docs, configs, and scripts.

Do not perform destructive cleanup during Phase 03. Do not remove active OAL surfaces merely because `oal_legacy/` now exists; deletion still requires documented replacement/reason and verification.

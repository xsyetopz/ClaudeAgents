# Next

Run `/olympus-phase 04` in a new Pi session.

Phase 04 must implement the Olympus Pi extension authoring/evaluation system according to:

- `olympus-impl/IMPLEMENTATION_PLAN.md`
- `olympus-impl/design/olympus-harness.md`
- `olympus-impl/design/extension-system.md`
- `olympus-impl/design/cli-system.md`
- `olympus-impl/design/verification-system.md`
- `olympus-impl/DELETE_AFTER_REPLACEMENT.md`

Expected Phase 04 starting scope:

- build on `packages/olympus` shared inspection/evaluation modules;
- implement real Olympus-owned extension authoring beyond the Phase 03 dry-run boundary;
- implement extension metadata/contracts for purpose, Pi events, commands/tools, side effects, capabilities, verification, and uninstall/disable behavior;
- improve `olympus extension inspect` for first-party and third-party extension entrypoint metadata without executing extension code;
- extend package evaluation for extension-specific risks and conflicts where discoverable;
- add targeted fixtures/tests for generated extension skeletons and extension inspection;
- preserve active OAL packages, source, specs, tests, docs, configs, scripts, and third-party references.

Do not perform destructive cleanup during Phase 04 unless every deletion-policy condition is explicitly satisfied and verified. Do not start high-level interactive wrapper work; that remains Phase 05 scope.

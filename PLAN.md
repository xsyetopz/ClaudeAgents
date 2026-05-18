# Olympus Plan

Olympus is the active product in this repository.

## Completed implementation sequence

- Phase 00 studied the historical architecture and pipeline.
- Phase 01 designed the PiCodingAgent-first Olympus harness.
- Phase 02 created the gitignored legacy reference snapshot and cleanup plan.
- Phases 03 through 07 implemented the active Olympus CLI, package evaluator, extension authoring, project-local install/uninstall, verification, status, catalog, and spec surfaces.
- Phase 08 completed destructive cleanup after replacement and rewrote active docs, specs, metadata, package scripts, and CI for Olympus.
- Phase 09 completed final acceptance and confirmed bootstrap-removal readiness.
- Phase cleanup completed a post-final root cleanup inventory, removed remaining classified legacy-branded root surfaces, and preserved `oal_legacy/`.
- Phase post-audit-cleanup completed a narrow owner-authorized review and found no additional active legacy product surfaces eligible for deletion.
- Phase final-plan created the final implementation roadmap for future owner review.
- Phase docs-010 prepared Olympus 0.1.0 docs/specs readiness for a source-checkout commit boundary.

## Active product boundary

- `packages/olympus` owns active source, tests, and CLI behavior.
- Root docs, `docs/`, and `specs/` describe Olympus 0.1.0 behavior and planned work precisely.
- Root package metadata and `packages/olympus/package.json` identify Olympus version 0.1.0.
- `third_party/` is protected reference material until a final third-party policy exists.
- The gitignored legacy snapshot is reference-only and must not be imported by active code.

## Verified commands

Current Olympus gates:

```sh
bun install --frozen-lockfile
bun run olympus:test
bun run typecheck
bunx biome check packages/olympus --max-diagnostics 200
bun run olympus:verify -- --json
bun run olympus:catalog -- --json
git diff --check
```

Phase docs-010 additionally smoke-checked help, inspect, package evaluate, extension create/inspect, install dry-run, status, catalog, spec, and verify JSON output.

## 0.1.0 docs/specs readiness

Phase docs-010 created `olympus-impl/reports/docs-specs-010-inventory.md` and rewrote the active root docs, docs set, and specs set for Olympus 0.1.0:

- `README.md`
- `INSTALLATION.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `docs/README.md`
- `docs/architecture.md`
- `docs/package-model.md`
- `docs/security.md`
- `docs/extensions.md`
- `docs/roadmap.md`
- `docs/oal-lessons.md`
- `specs/README.md`
- `specs/product.md`
- `specs/versioning.md`
- `specs/cli.md`
- `specs/package-inspection.md`
- `specs/install-uninstall.md`
- `specs/extension-authoring.md`
- `specs/security.md`
- `specs/verification.md`
- `specs/roadmap-parity.md`

0.1.0 is the first committed Olympus source-checkout product boundary in the 0-series line. It is not a v1-style compatibility guarantee and does not claim completed future roadmap work.

## Bootstrap readiness

The active product no longer depends on the temporary phase controller. `olympus-impl/` remains in this working tree only to satisfy phase handoff/log requirements and may be archived or removed after owner review. Do not remove `third_party/` without a separate explicit policy and verification.

## Cleanup phase

The cleanup phase created `olympus-impl/reports/cleanup-inventory.md` and `olympus-impl/reports/cleanup-report.md`, then removed only classified active root surfaces that were replaced, obsolete, or retained in `oal_legacy/`:

- `.agents/`
- `prompts/`
- temporary phase/legacy snapshot scripts under `scripts/`

`packages/olympus/`, `olympus-impl/`, `oal_legacy/`, `third_party/`, `.gitmodules`, active docs, CI, root package-manager config, TypeScript config, Biome config, and legal/security/community docs remain preserved.

## Post-audit cleanup phase

The post-audit cleanup phase created `olympus-impl/reports/post-audit-cleanup-plan.md` and `olympus-impl/reports/post-audit-cleanup-report.md`. It reviewed the remaining active root after final audit, cleanup, and parity roadmap audit. No additional deletion was applied because remaining legacy-term references are retained phase-controller or historical cleanup provenance, not active product identity.

`packages/olympus/`, `oal_legacy/`, `third_party/`, `.gitmodules`, `olympus-impl/`, final audit reports, roadmap reports, and active Olympus docs/configs remain preserved.

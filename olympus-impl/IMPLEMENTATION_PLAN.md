# Olympus Implementation Plan

Phase 02 output. This is the authoritative implementation order after Phase 00 study, Phase 01 design, and creation of the protected `oal_legacy/` reference snapshot.

## Hard gates

Implementation must obey these gates:

1. Do not delete active OAL files until replacements or deletion reasons are documented in `olympus-impl/DELETE_AFTER_REPLACEMENT.md`.
2. Keep `oal_legacy/` gitignored and read-only as reference material.
3. Preserve lint, format, TypeScript, package-manager, test, CI, build, release, and acceptance configs unless an Olympus replacement/adaptation is explicitly implemented.
4. Do not execute third-party Pi package code during inspect/evaluate.
5. Do not write to `~/.pi` by default.
6. Project-local writes must be dry-run/plan first and manifest-owned before uninstall is implemented.
7. Do not restore OAL compatibility framing in active Olympus code or docs.

## Package boundary

Initial implementation owner: `packages/olympus`.

Expected package shape:

```text
packages/olympus/
  package.json
  src/
    cli.ts
    commands/
    inspect/
    inventory/
    package-source/
    pi-resources/
    hashing/
    report/
    lockfile/
    manifest/
    trust/
    sandbox/
    audit/
    extension-authoring/
    verification/
  test/
    fixtures/
    *.test.ts
```

Existing OAL packages remain protected while Olympus is built. Useful OAL patterns may be re-authored, but Olympus must not import OAL architecture by inertia.

## Exact implementation order

### 1. Low-level package skeleton

- Add `packages/olympus/package.json` with package name and CLI entrypoint for `olympus`.
- Add `packages/olympus/src/cli.ts` with command dispatch and stable exit-code handling.
- Add root workspace dependency/script wiring only as needed for targeted Olympus tests and CLI smoke.
- Preserve existing root lint/type/test configs; adapt only when required for the new package.

### 2. Read-only local package inspection

- Implement `olympus inspect <local-package-path>`.
- Read `package.json` without executing lifecycle scripts.
- Discover Pi resources from `package.json.pi` and conventional `extensions/`, `skills/`, `prompts/`, and `themes/` directories.
- Classify passive resources:
  - skills;
  - prompts;
  - themes;
  - static skill support files.
- Classify executable resources:
  - extensions;
  - tools/providers/hooks inferred from extension code or package metadata;
  - lifecycle scripts;
  - package scripts;
  - executable support scripts.
- Hash package files, resource files, and skill support files.
- Emit human and JSON inspection reports.
- Add fixtures/tests for passive, mixed, lifecycle-script, malformed, collision, and skill-support-file packages.
- Safety: no code execution, no package-manager invocation, no writes outside test temp dirs.

### 3. Shared inventory/report library

- Factor inspect logic into reusable modules used by CLI, future interactive wrapper, and future Pi extension UX.
- Define stable report schema versioning.
- Add risk/signage labels: `PASSIVE`, `EXECUTABLE`, `UNSIGNED`, `LOCKED`, `HASH MISMATCH`, `GLOBAL WRITE`, `TRUSTED PASSIVE`, `TRUSTED EXECUTABLE`, `REVOKED`, `SANDBOXED`, `HOME DENIED`, `NETWORK DENIED`.

### 4. Lock, trust, manifest, and audit schemas

- Implement schema definitions and read/write helpers for:
  - `.pi/olympus/olympus.lock`;
  - `.pi/olympus/olympus-manifest.json`;
  - `.pi/olympus/audit.jsonl`;
  - trust decision records.
- Bind trust to package identity, source, resolved ref/version, content digest, resource inventory, executable entrypoints, approved capabilities, sandbox profile, and install scope.
- Implement hash mismatch behavior before install or execution exists.

### 5. Project-local passive install plan/apply

- Implement dry-run plan for passive resource install.
- Build sanitized local Pi package mirror under `.pi/olympus/packages/<package-id>/package/`.
- Mirror only approved passive resources.
- Write sanitized mirror `package.json` with `pi.extensions: []`.
- Surgically merge `.pi/settings.json` `packages` entries only.
- Never write `.pi/extensions`, `.pi/skills`, or `.pi/prompts` directly in this slice.
- Never write `~/.pi`.

### 6. Manifest-backed uninstall

- Implement dry-run uninstall from `olympus-manifest.json` only.
- Remove only manifest-owned settings entries and files with hash match.
- Preserve user-modified files and report partial uninstall/manual cleanup paths.
- Do not infer ownership from path names alone.

### 7. Package evaluate command

- Expand inspection into `olympus package evaluate <source>` decision reports.
- Local path remains first supported source.
- npm/git support is added only if metadata/tarball/clone inspection can occur without lifecycle scripts and without global install.
- Add conflict detection for skill names, prompt command filenames, theme names, extension commands, tool overrides, and provider registrations where discoverable.

### 8. First-party extension authoring

- Implement `olympus extension create <name>` for Olympus-owned project-local extension skeletons.
- Generated extensions must declare purpose, Pi events, commands/tools, side effects, capabilities, verification, and uninstall/disable behavior.
- Add `olympus extension inspect <path>` as read-only extension entrypoint inspection.
- Do not execute generated or third-party extensions during inspection.

### 9. Verification command and acceptance simulation

- Implement `olympus verify` with temp projects/fake homes.
- Prove inspect, classification, lock mismatch, passive mirror install, manifest uninstall, and no-global-write behavior.
- Preserve and adapt existing Biome/TypeScript/test configs.
- Add CI jobs only after commands exist and targeted tests are stable.

### 10. Sandbox probe and executable execution gates

- Implement `olympus sandbox check` using temp roots and fake secrets only.
- Linux/WSL2: detect and probe `bubblewrap` or selected backend.
- macOS: report degraded/blocked for untrusted executable execution until a credible containment backend is selected.
- Do not run third-party package code in this step.
- Only after strong sandbox and trust gates exist may a later phase consider executable resource evaluation.

### 11. Broker seam

- Define structured broker request/response types for future host capabilities.
- First broker candidate is read-only `gh`, but only after sandbox and audit groundwork exists.
- No arbitrary shell strings and no raw host credentials exposed to sandboxed code.

### 12. Interactive wrapper

- Implement high-level guided CLI only after low-level commands work.
- The wrapper must call shared low-level command/library code and contain no separate business logic.

### 13. Re-author retained OAL ideas

- Re-author OAL strengths under Olympus names/contracts only after Olympus low-level package boundaries exist:
  - acceptance simulation;
  - manifest ownership;
  - dry-run plan/apply;
  - artifact hashing/provenance;
  - inspection surfaces;
  - state/profile concepts if still needed.

### 14. Active docs and packaging

- Re-author README, installation, security, contribution, changelog, specs, and release metadata to describe Olympus only after corresponding commands work.
- Do not claim global install, executable sandboxing, or broker support before tests prove those behaviors.

### 15. Destructive cleanup

- Perform only after the cleanup gate in `DELETE_AFTER_REPLACEMENT.md` is satisfied.
- Remove/move OAL surfaces according to classification and documented replacement status.
- Keep `oal_legacy/` as reference until final bootstrap removal readiness.

## Verification after each implementation group

Every meaningful edit group must run the narrowest relevant verification first:

- targeted `bun test packages/olympus/test/*.test.ts` once tests exist;
- TypeScript check for touched package boundaries;
- Biome check for touched files;
- `olympus verify` once implemented;
- no-global-write assertions for install/uninstall work.

## Current Phase 02 snapshot evidence

The `oal_legacy/` snapshot was created in Phase 02 and verified to include source, docs, prompts, packages/runtime hooks, third_party references, configs, scripts, specs, tests, and plugins while excluding `.git`, `node_modules`, build output, generated output, caches, and transient files.

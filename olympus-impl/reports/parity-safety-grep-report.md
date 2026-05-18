# Parity Safety Grep Report

Date: 2026-05-18
Phase: `parity-integration-acceptance`

## Command

```sh
rg -n "child_process|Bun\.spawn|\beval\b|Function\(|import\(|~/.pi|homedir|auth\.json|\.ssh|\.config/gh|\brm\(|\bunlink\b|\brmdir\b|writeFile" packages/olympus docs specs PLAN.md olympus-impl
```

## Summary

No blocker matches were found.

| Pattern area | Classification | Notes |
| --- | --- | --- |
| `child_process`, `eval`, `Function(`, dynamic `import(` | No active product matches | No runtime dynamic execution surface found by grep. |
| `Bun.spawn` | Expected test fixture | Used in `packages/olympus/test/*.test.ts` CLI smoke tests only. |
| `~/.pi` | Documentation/policy/test fixture | Used to state denied global-write policy, protected-path checks, and no-global-write tests. |
| `homedir` | Safe read | Used in `policy/protected-paths.ts` to normalize protected home paths for denial decisions. |
| `auth.json`, `.ssh`, `.config/gh` | Expected fake-secret fixtures / safe policy probes | Used in sandbox/verification fake-home denial checks and tests; no real secret reads are performed. |
| `rm(` | Temp-root-only / manifest-owned cleanup | Uses `fs.rm` in tests, verification temp roots, and manifest-owned mirror cleanup. |
| `unlink` | Manifest-owned uninstall only | Used in `install-flow.ts` after manifest/hash checks. |
| `rmdir` | No direct active product matches | Search pattern included; no direct `rmdir` usage found. |
| `writeFile` | Bounded writes | Explicit output-dir extension/resource generation, project-local manifest/settings/lock/audit writes, Hestia `.pi/olympus/**` writes, temp-root verification/test fixtures. |

## Active source classifications

| File | Matches | Classification |
| --- | --- | --- |
| `packages/olympus/src/extension-authoring.ts` | `writeFile` | Explicit output-dir-only for first-party extension skeleton creation; apply requires caller-provided `--output`. |
| `packages/olympus/src/install-flow.ts` | `unlink`, `writeFile`, `rm` | Project-local install/uninstall; manifest-owned and hash-checked, with dry-run support. |
| `packages/olympus/src/settings.ts` | `writeFile` | Project-local `.pi/settings.json` writes only through install/uninstall flows. |
| `packages/olympus/src/lock.ts` | `writeFile` | Project-local `.pi/olympus/olympus.lock`. |
| `packages/olympus/src/manifest.ts` | `writeFile` | Project-local `.pi/olympus/olympus-manifest.json` and audit JSONL. |
| `packages/olympus/src/hestia/state.ts` | `writeFile` | Project-local `.pi/olympus/policy/decisions.jsonl` only when explicitly called. |
| `packages/olympus/src/resources/first-party.ts` | `writeFile` | Explicit output directory only for generated first-party resource package. |
| `packages/olympus/src/commands/verify.ts` | `writeFile`, `rm`, `.ssh`, `auth.json` | Temp-root-only acceptance fixtures and fake-home secret immutability checks. |
| `packages/olympus/src/policy/protected-paths.ts` | `homedir`, `.ssh`, `.config/gh`, `~/.pi` | Safe read/normalization for deny-list policy decisions. |
| `packages/olympus/src/sandbox/probe.ts` | `.ssh`, `.config/gh`, `auth.json` | Harmless policy probes; does not read real secrets. |
| `packages/olympus/src/commands/safety.ts`, `packages/olympus/src/modules/contracts.ts` | `rm -rf ~/.pi` strings | Test/policy fixture strings only; not executed. |
| `packages/olympus/src/interactive.ts` | `~/.pi` text | User-facing no-global-write message. |

## Test classifications

- `Bun.spawn` appears in tests to run CLI smoke checks.
- `writeFile` and `rm` in tests are temp-root-only fixture setup/teardown.
- Fake `~/.ssh`, `~/.config/gh`, and `~/.pi/agent/auth.json` paths are fixture/probe strings used to prove denial or no-global-write behavior.

## Documentation and phase-controller classifications

- Docs/specs/`olympus-impl/**` matches are policy statements, prompt requirements, plan records, or phase logs.
- `oal_legacy` remains gitignored reference material and was not deleted.

## Result

Safety grep passed. No blocker match requires code changes in this phase.

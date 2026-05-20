# Verification Pipeline

Verification is part of the product contract. Local checks must prove both
behavior and boundaries.

Default user surfaces and developer/power surfaces are verified separately:
default help and startup stay short and goal-oriented, while `help all`, `dev`,
`safety`, and `report` keep advanced inspection discoverable.

## Required gates

```sh
bun install --frozen-lockfile
bun run typecheck
bun run olympi:test
bun run biome:check
bun run olympi:verify -- --json
bun run olympi:catalog -- --json
```

CI adds `bun run olympi:smoke` for source, help, local link, and source-global
CLI install checks in temporary directories. The source-global smoke installs a
package-manager binary only; it does not imply Pi global registration.

## What tests must prove

- package inspection is deterministic;
- executable resources are classified before install decisions;
- inspect/evaluate do not execute package code;
- passive install writes only project-local manifest-owned paths;
- uninstall removes only owned files with matching hashes;
- hash mismatches preserve changed files;
- fake-home checks protect user-global Pi state by default, prove package-manager
  global CLI smoke does not imply Pi registration, and prove explicit --global
  dry-runs do not write;
- hook veto decisions stop unsafe actions;
- ambiguous workspace paths cannot be restored, deleted, moved, broadly formatted, staged, or committed without ownership proof;
- command classification reports class preconditions, provenance requirements,
  blocker behavior, and audit fields through Themis decisions;
- goal completion requires verification evidence;
- goal completion rejects missing intended files, unintended diff files, and
  unresolved blockers;
- continuation recovery preserves objective and audit requirements;
- saved goal resume writes only project-local goal state and preserves active blockers;
- governed goal execution invokes policy decisions, hook vetoes, topical skill
  loading, project-local provenance audit, and blocker transitions;
- goal completion is impossible until required verification records and
  completion audit evidence pass;
- skill selection is topical and lazy.

Operational failure reports must include `Failure`, `Impact`, `Change`,
`Verification`, and `Remaining blocker`. Documentation checks should evaluate
scope, evidence, and verification criteria rather than rely on phrase bans.

## Fixture policy

Prefer temp projects and fake homes. Do not rely on the developer home directory
for mutable test state.

A fixture should assert externally visible behavior: written paths, manifest
records, hashes, exit codes, decision objects, or JSON reports. Avoid tests that
only duplicate implementation details.

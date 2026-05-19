# Verification Pipeline

Verification is part of the product contract. Local checks must prove both
behavior and boundaries.

## Required gates

```sh
bun install --frozen-lockfile
bun run olympi:test
bun run typecheck
bun run biome:check
bun run olympi:verify -- --json
bun run olympi:catalog -- --json
git diff --check
```

## What tests must prove

- package inspection is deterministic;
- executable resources are classified before install decisions;
- inspect/evaluate do not execute package code;
- passive install writes only project-local manifest-owned paths;
- uninstall removes only owned files with matching hashes;
- hash mismatches preserve changed files;
- fake-home checks protect user-global Pi state;
- hook veto decisions stop unsafe actions;
- ambiguous workspace paths cannot be restored, deleted, moved, broadly formatted, staged, or committed without ownership proof;
- goal completion requires verification evidence;
- continuation recovery preserves objective and audit requirements;
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

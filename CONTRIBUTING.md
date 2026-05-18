# Contributing to Olympus

Olympus changes must preserve the PiCodingAgent-first safety model and the 0.1.0 source-checkout product boundary.

## Local checks

Run the narrow Olympus checks before submitting changes:

```sh
bun run olympus:test
bun run typecheck
bunx biome check packages/olympus --max-diagnostics 200
bun run olympus:verify -- --json
git diff --check
```

Use broader Biome checks when touching repository-wide JavaScript or TypeScript:

```sh
bun run biome:check
```

## Product rules

- Do not execute third-party Pi package code during inspect, evaluate, install planning, status, catalog, spec, or verify flows.
- Do not write to `~/.pi` by default.
- Keep mutating project-local operations dry-run first and manifest-owned.
- Bind trust and uninstall decisions to content hashes and explicit resource inventories.
- Keep implemented behavior separate from planned roadmap work.
- Do not claim sandbox, broker, global install, executable package support, release archives, or registry publishing until tests prove it.
- Keep active product docs aligned with implemented behavior and 0-series versioning.

## Protected material

- `third_party/` remains protected reference material until an explicit policy replaces it.
- `oal_legacy/` is a gitignored historical reference snapshot and must not be imported by active code.

## Pull request checklist

- [ ] Added or updated targeted tests for changed behavior.
- [ ] Updated docs/specs when command behavior changed.
- [ ] Ran the local checks above.
- [ ] Confirmed no new default writes to user-global Pi state.

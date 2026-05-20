# Contributing

Changes must preserve the 0.1.0 local-package safety boundary.

## Local checks

```sh
bun run olympi:test
bun run typecheck
bun run biome:check
bun run olympi:verify -- --json
git diff --check
```

## Development rules

- Do not execute third-party Pi package code during inspect, evaluate, install
  planning, status, catalog, spec, or verification flows.
- Do not write to `~/.pi` by default.
- Keep project-local mutations dry-run first and manifest-owned.
- Treat unexplained workspace changes as user-owned. Do not restore, delete,
  move, broadly format, stage, or commit ambiguous paths without manifest/hash,
  provenance, same-run creation, or explicit user approval.
- Bind trust and uninstall decisions to content hashes and explicit inventories.
- Keep implemented behavior separate from planned work.
- Do not claim sandbox, broker, global install, executable package support,
  release archives, or registry publishing until tests prove it.
- Update docs and specs when command behavior, write paths, or safety boundaries
  change.

## Protected material

- `third_party/` is reference material until a separate policy replaces it.
- Archived reference material must not be imported by active code.

## Pull request checklist

- [ ] Added or updated targeted tests for changed behavior.
- [ ] Updated docs/specs when behavior changed.
- [ ] Ran local checks.
- [ ] Confirmed no new default writes to user-global Pi state.

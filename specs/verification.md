# Verification Contract

Required local gates for product changes:

```sh
bun install --frozen-lockfile
bun run typecheck
bun run olympi:test
bun run biome:check
bun run olympi:verify -- --json
bun run olympi:catalog -- --json
```

CI also runs `bun run olympi:smoke` in temporary home/install directories to
cover CLI source, help, local link, and source-global CLI install invocation.
The source-global smoke installs a package-manager binary only; it does not
imply Pi global registration.

Verification must prove:

- deterministic package/resource inspection;
- conservative passive/executable classification;
- no lifecycle-script or extension-code execution during inspect/evaluate;
- project-local passive install planning and apply behavior;
- manifest-backed uninstall behavior;
- hash-mismatch preservation;
- no default writes to user-global Pi state, explicit --global dry-run without
  writes, and package-manager global CLI smoke not implying Pi registration;
- saved goal resume preserves durable objective state, validates goal ids, and
  does not bypass active blockers;
- governed goal execution invokes policy, hooks, skill loading, provenance
  audit, and blocker transitions;
- completion remains gated by saved verification records and explicit audit
  evidence;
- catalog/spec contracts remain valid.

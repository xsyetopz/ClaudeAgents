# Verification Contract

Required local gates for 0.1.0:

```sh
bun install --frozen-lockfile
bun run typecheck
bun run olympi:test
bun run biome:check
bun run olympi:verify -- --json
bun run olympi:catalog -- --json
```

CI also runs `bun run olympi:smoke` in temporary home/install directories to
cover CLI source, help, local link, and source-global install invocation.

Verification must prove:

- deterministic package/resource inspection;
- conservative passive/executable classification;
- no lifecycle-script or extension-code execution during inspect/evaluate;
- project-local passive install planning and apply behavior;
- manifest-backed uninstall behavior;
- hash-mismatch preservation;
- no writes to user-global Pi state;
- catalog/spec contracts remain valid.

# Verification Contract

Required local gates for 0.1.0:

```sh
bun install --frozen-lockfile
bun run olympus:test
bun run typecheck
bunx biome check packages/olympus --max-diagnostics 200
bun run olympus:verify -- --json
bun run olympus:catalog -- --json
git diff --check
```

Verification must prove:

- deterministic package/resource inspection;
- conservative passive/executable classification;
- no lifecycle-script or extension-code execution during inspect/evaluate;
- project-local passive install planning and apply behavior;
- manifest-backed uninstall behavior;
- hash-mismatch preservation;
- no writes to user-global Pi state;
- catalog/spec contracts remain valid.

# Plan

The active project is Olympi. The current branch implements the 0.1.0 local
source-tree boundary.

## Current contract

- Domain packages live under `packages/`.
- The CLI script is `bun run olympi -- <command>`.
- Project-local state uses `.pi/olympi/**`.
- Normal workflows are Pi slash/resource handlers, hooks, skills, and tool shims.
- The CLI is install/admin/bootstrap/diagnostics only.

## Current gates

```sh
bun install --frozen-lockfile
bun run olympi:smoke
bun run typecheck
bun run olympi:test
bun run biome:check
bun run olympi:doctor -- --json
bun run olympi:verify -- --json
bun run olympi:catalog -- --json
git diff --check
```

## Enforced invariants

- Goal workflow state is exposed through Pi slash/resource handlers and reporting;
  no CLI workflow route is part of the normal workflow surface.
- Provider-shaped fixtures are internal policy/conformance inputs only; provider
  runtime launch is outside the product surface.
- First-party skills and prompts are installed as Pi resources and validated as
  package metadata; authoring helpers remain explicit debug/admin utilities.
- Bounded team orchestration is lifecycle state for independent saved goal steps;
  Olympi does not launch provider-native swarms or subagents.
- Executable resources are intake-classified, hashed, trust-checked, and
  policy-gated. Live executable-resource host brokering is outside the product
  surface.

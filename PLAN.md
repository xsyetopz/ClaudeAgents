# Plan

The active project is Olympi. The current branch implements the 0.1.0 local
source-tree boundary.

## Current state

- Domain packages live under `packages/`.
- The CLI script is `bun run olympi -- <command>`.
- Project-local state uses `.pi/olympi/**`.
- `third_party/` is retained reference material.

## Current gates

```sh
bun install --frozen-lockfile
bun run olympi:test
bun run typecheck
bun run biome:check
bun run olympi:verify -- --json
bun run olympi:catalog -- --json
git diff --check
```

## Near-term work

- Add CLI/reporting surfaces for goal-loop state.
- Add provider fixture coverage for hook phases.
- Extend first-party skill and prompt authoring flows.
- Add bounded subagent orchestration APIs.
- Design executable-resource sandbox and host-broker gates before enabling any
  third-party executable load path.

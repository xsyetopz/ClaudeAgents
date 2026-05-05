# Use the CLI

Run commands from a source checkout with `bun run <script> -- ...`, or use
`oal ...` after installing the shim.

## Safe First Commands

```bash
bun run check
bun run preview -- --provider all
bun run deploy -- --target /path/to/project --scope project --provider all --dry-run
```

Apply deploy only after the dry-run paths match the target you expect.

## Inspect OAL

Use `inspect` for read-only product evidence:

```bash
bun packages/cli/src/main.ts inspect capabilities
bun packages/cli/src/main.ts inspect manifest
bun packages/cli/src/main.ts inspect generated-diff
bun packages/cli/src/main.ts inspect release-witness
```

`oal-inspect` is also available as an OAL-owned MCP server:

```bash
bun packages/cli/src/main.ts mcp serve oal-inspect
```

## Codex delegation

Use `codex` for OAL-managed Codex role runs:

```bash
bun packages/cli/src/main.ts codex agent hermes --dry-run "map runtime hooks"
bun packages/cli/src/main.ts codex route review --dry-run "audit the current diff"
bun packages/cli/src/main.ts codex peer batch --dry-run "investigate, implement, validate, and review"
```

`agent` runs one generated Codex custom agent. `route` maps an OAL route to its owning generated agent. `peer batch` restores the v3-style coordinated run shape with orchestrator, validate, worker, and review passes, plus a `.openagentlayer/codex-peer/<run-id>/` handoff directory. Use `--dry-run` to inspect the plan before launching Codex.

## Model Plans

Use plan flags when rendering subscription-specific model routes:

```bash
bun run preview -- --provider codex --plan pro-20
bun run preview -- --provider claude --plan max-20-long
bun run preview -- --provider opencode --plan opencode-auto
```

Codex plan mode and edit mode are separate. OAL uses Codex values `none`,
`low`, `medium`, `high`, and `xhigh`; `minimal` is not a Codex effort value.

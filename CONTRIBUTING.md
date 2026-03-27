# Contributing

This repo is the source of truth for `openagentsbtw` across three targets:

- `claude/` for Claude Code
- `codex/` for Codex
- `opencode/` for OpenCode

Most of the repo is generated. The canonical layer lives under `source/`, with generation handled by `scripts/generate.mjs`.

## For Humans

### Setup

```bash
bun install --frozen-lockfile
bun run generate
```

If you touch `opencode/`, also install its local dependencies:

```bash
cd opencode
bun install --frozen-lockfile
```

### Workflow

1. Edit the canonical source first.
2. Regenerate artifacts.
3. Run the relevant checks.
4. Review the generated diff before committing.

Canonical sources:

- `source/agents.json`
- `source/agent-prompts.mjs`
- `source/skills.json`
- `source/skills/*`
- `source/commands.json`
- `source/hook-policies.json`
- `source/project-guidance.mjs`

Generated outputs:

- `claude/`
- `codex/`
- `opencode/templates/`

### Validation

Root checks:

```bash
bun run generate
bun run check:generated
bun run test
```

OpenCode checks:

```bash
cd opencode
bun run test
bun run typecheck
```

### Contribution Rules

- Do not hand-edit generated files unless you are also changing the generator or intentionally patching generated output and then backfilling the source.
- Keep platform differences honest. Shared policy should be centralized, but emitted artifacts may differ when the underlying CLIs expose different surfaces.
- When changing Codex behavior, update the implementation under `codex/` and the supporting notes under `docs/openai/`.
- When changing OpenCode behavior, update `opencode/` and the supporting notes under `docs/opencode/`.
- Keep commits scoped and use Conventional Commits.

## For AI Agents

### Operating Model

- Treat `source/` as canonical unless the task is explicitly platform-local.
- Preserve the split architecture. Claude, Codex, and OpenCode assets stay isolated by directory.
- Prefer generated fixes over manual drift. If you change generated outputs directly, bring the generator or source back into sync in the same task.
- Do not copy Claude-specific assumptions into Codex or OpenCode without checking the actual supported surface.

### Practical Rules

- Read local context before changing code.
- Prefer `rg` for search.
- Keep comments limited to non-obvious why.
- Do not leave placeholders, deferred core work, or fake compatibility notes unless the user explicitly narrows scope.
- If you change hook behavior, check the shared policy source and the generated hook mapping artifacts together.
- If you change contributor-facing workflow, keep `.github/`, this file, and `AGENTS.md` aligned.

### Minimum Close-Out

Before finishing a substantial change:

1. Regenerate artifacts if source changed.
2. Run the smallest relevant verification set.
3. Report what changed, what was verified, and what remains unverified.

## Related Docs

- `README.md`
- `AGENTS.md`
- `.github/CONTRIBUTING.md`

Repository: <https://github.com/xsyetopz/openagentsbtw>

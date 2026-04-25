# Claude Code 2.1.88 Sourcemap Source Dive

Repository: https://github.com/xsyetopz/claude-code-sourcemap
Status: unofficial reconstructed sourcemap research. This is not an official Anthropic source repository. Use path-level evidence only and do not copy proprietary source.

## Source Paths

- `restored-src/src/skills/loadSkillsDir.ts` — skill loading, frontmatter parsing, token estimates, conditional paths.
- `restored-src/src/skills/mcpSkillBuilders.ts` — MCP-backed skill builders.
- `restored-src/src/hooks/useMergedTools.ts` — built-in and MCP tool merge.
- `restored-src/src/hooks/useMergedCommands.ts` — built-in and MCP command merge.
- `restored-src/src/tools/*` — tool families: Bash, FileRead, FileEdit, MCP, Skill, Task, Todo, Web.
- `restored-src/src/services/mcp/*` — MCP services.
- `restored-src/src/services/tokenEstimation.ts` — token estimation.
- `restored-src/src/services/toolUseSummary/*` — tool-use summary behavior.
- `restored-src/src/coordinator/coordinatorMode.ts` — coordination mode.

## Relevant Behaviors

- Skill frontmatter can include description, `when_to_use`, allowed tools, hooks, paths, model, effort, agent, shell, arguments, and user-invocable flags.
- Skill token estimate uses frontmatter metadata; full skill content loads on invocation.
- Skills can be conditional on file path patterns.
- Realpath-based dedupe avoids loading the same skill through multiple paths.
- Dynamic nested skills can be discovered after startup.
- MCP tools and commands merge into built-in pools; name collisions matter.
- Task/subagent-like tool families exist in the runtime source tree.

## v4 Implications

- Keep frontmatter descriptions concise because they are routing context.
- Put heavy references outside `SKILL.md`.
- Generate path-conditional skills for file-family-specific behavior.
- Deduplicate generated skill paths through canonical real paths during install.
- Namespace v4 skills/tools to avoid MCP/built-in collisions.
- Treat sourcemap-only facts as implementation hints, not public API guarantees.

## Edge Cases

- Invalid hooks in skill frontmatter may silently degrade or log only.
- Symlinks and overlapping parent dirs can duplicate skills unless canonicalized.
- Dynamic nested skills can change available behavior mid-session.
- MCP commands/tools can shadow generated names.


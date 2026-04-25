# Source-Backed Edge Cases

This file records subtle cases v4 must account for.

## Codex

- `AGENTS.md` scope is hierarchical; nested files can override parent guidance.
- Config precedence can make managed values lose to runtime/CLI overrides.
- `project_doc_max_bytes` can truncate instructions; generated core must be short.
- `tool_output_token_limit` means harness output must be useful when clipped.
- MCP approval can differ from shell approval.

## OpenCode

- Config can come from remote, global, custom env, project, `.opencode`, inline, account, and managed sources.
- Skills can be discovered from `.opencode`, `.claude`, and `.agents` paths.
- Plugins may be local files or packages; adapter must avoid unexpected network installs.
- Permissions include tool classes; generated permissions must not accidentally deny harness itself.
- Compaction/tail settings affect how much prior harness guidance survives.

## Claude Code Sourcemap

- Skill loader estimates tokens from frontmatter while full content loads on invocation.
- Skill paths can conditionally activate based on file patterns.
- Symlink/realpath dedupe prevents duplicate skill loading.
- MCP tools and commands merge into built-in pools, so name collisions matter.
- Dynamic nested skills can appear during a session.
- This evidence is unofficial sourcemap research, not public contract.

## Kilo Code v5 Legacy

- Tool protocol is locked at task creation; adapter must not switch protocol mid-task.
- Rules/workflows have project and global locations.
- Mode-specific rules use separate directories.
- MCP has both project and extension/global settings.
- VS Code extension storage and CLI storage differ.

## Windsurf Editor

- Product target is editor/plugin, not standalone CLI.
- Cascade hooks can read transcripts; transcript access is sensitive.
- Workflows and memories are native planning surfaces.
- Extension/plugin install paths need separate evidence before implementation.


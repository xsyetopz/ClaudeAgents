# Context Lifecycle

v4 must model how context enters, expands, compresses, and exits each tool.

## Context Sources

- always-on instructions
- project rules files
- user rules files
- platform config
- skill frontmatter
- selected skill body
- references/assets/scripts
- MCP tool/resource metadata
- tool output
- transcripts
- summaries/compaction
- subagent handoff packets

## Lifecycle Flow

1. Harness renders tiny always-on core.
2. Platform loads project/user/global rules by native precedence.
3. Skill metadata enters routing context.
4. Full skill body loads only when invoked.
5. Tool output enters transcript through budgeted runner.
6. Long sessions compact or fork into handoff packet.
7. Final response cites validation evidence and avoids replaying raw logs.

## Source-Backed Patterns

- Claude Code sourcemap shows skill token estimates based on frontmatter and lazy full-content loading in `restored-src/src/skills/loadSkillsDir.ts`.
- Codex exposes `project_doc_max_bytes` and `tool_output_token_limit` in config source/docs.
- OpenCode exposes compaction and tool-output truncation settings through config source/docs.
- Kilo Code keeps task protocol state and conversation history under extension/CLI storage.

## v4 Requirements

- Always-on prompt must stay small.
- Generated platform docs must avoid loading whole source references into startup context.
- Tool output must default to summaries.
- Handoff packets must be explicit artifacts, not hidden prompt bloat.
- Subagents must receive narrow packets only.


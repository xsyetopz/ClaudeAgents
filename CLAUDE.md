# ClaudeAgents

7 agents, 10 skills, split-level hooks. Targets CC v2.1.75+.

## Agents

| Agent       | File          | pro    | max    | enterprise | Purpose                                  |
| ----------- | ------------- | ------ | ------ | ---------- | ---------------------------------------- |
| @athena     | athena.md     | sonnet | opus   | opus       | Design, plan, architect                  |
| @hephaestus | hephaestus.md | sonnet | sonnet | sonnet     | Write code, fix bugs, build features     |
| @nemesis    | nemesis.md    | sonnet | opus   | opus       | Review code, security audit              |
| @atalanta   | atalanta.md   | haiku  | haiku  | haiku      | Run tests, parse failures, root causes   |
| @calliope   | calliope.md   | haiku  | haiku  | haiku      | Write/edit documentation (markdown only) |
| @hermes     | hermes.md     | sonnet | sonnet | sonnet     | Research, explore codebase, cite sources |
| @odysseus   | odysseus.md   | sonnet | opus   | opus       | Multi-step delegation, progress tracking |

**Built-in subagents disabled**: `Explore`, `Plan`, and `general-purpose` are denied via `permissions.deny`. Use `@hermes` (explore), `@athena` (plan), `@odysseus` (general-purpose) instead.

## Skills

Plugin install (`claude plugin install cca`) gives the `cca:` prefix. Manual install (`install.sh`) uses the `cca-` prefix.

| Skill            | Plugin                | Manual                | Status |
| ---------------- | --------------------- | --------------------- | ------ |
| `review-code`    | `/cca:review-code`    | `/cca-review-code`    | Active |
| `desloppify`     | `/cca:desloppify`     | `/cca-desloppify`     | Active |
| `ship`           | `/cca:ship`           | `/cca-ship`           | Active |
| `decide`         | `/cca:decide`         | `/cca-decide`         | Active |
| `audit-security` | `/cca:audit-security` | `/cca-audit-security` | Active |
| `test-patterns`  | `/cca:test-patterns`  | `/cca-test-patterns`  | Active |
| `document`       | `/cca:document`       | `/cca-document`       | Active |
| `optimize`       | `/cca:optimize`       | `/cca-optimize`       | Active |
| `handle-errors`  | `/cca:handle-errors`  | `/cca-handle-errors`  | Active |
| `session-export` | `/cca:session-export` | `/cca-session-export` | Active |

## Hooks

**User-level** (`~/.claude/hooks/`):

- `pre-secrets.py` - PreToolUse: blocks .env reads/writes, auth-header echoes, force-push to main, broad rm -rf

**Project-level** (`.claude/settings.json` -> `hooks.json`):

- SessionStart -> `session-budget.py` - warns when CLAUDE.md/MEMORY.md exceeds line budget
- PreToolUse[Bash] -> `pre-bash.py` - blocks large-output commands + commit quality checks
- PostToolUse[Write|Edit] -> LSP prompt + `post-write.py` (auto-format + placeholder + comment-slop)
- SubagentStop[agents] -> scope-reduction prompt + `subagent-scan.py` + collaboration-protocol prompt
- Stop -> `stop-scan.py` + session-export reminder prompt

## Install

```bash
# Plugin (marketplace)
claude plugin install cca

# Manual (to a project)
./install.sh /path/to/project --pro        # sonnet (haiku for atalanta/calliope)
./install.sh /path/to/project --max        # opus for athena/nemesis/odysseus
./install.sh /path/to/project --enterprise # max + audit logs, DLP, compliance
./install.sh /path/to/project --max --zen-mode  # composable zen constraints
./install.sh --global --pro                # ~/.claude/
```

## File Structure

```text
.claude-plugin/  plugin.json (marketplace manifest)
agents/          athena.md, hephaestus.md, nemesis.md, atalanta.md,
                 calliope.md, hermes.md, odysseus.md
skills/          review-code/, desloppify/, ship/,
                 decide/, audit-security/, test-patterns/,
                 document/, optimize/, handle-errors/,
                 session-export/
hooks/           configs/ (base.json, pro.json, max.json, enterprise.json)
                 user/ (pre-secrets.py, rtk-rewrite.sh)
                 scripts/ (_lib.py, session-budget.py, pre-schema.py,
                 pre-bash.py, post-write.py, post-bash.py,
                 pre-post-proxy.py, subagent-scan.py, stop-scan.py)
constraints/     shared.md, pro.md, max.md, enterprise.md, zen.md
templates/       CLAUDE.md, settings-global.json
mcp/             MCP server (cca-harness)
install.sh       Package flags, model substitution, validation
build-plugin.sh  Builds marketplace-ready dist from source
```

@RTK.md

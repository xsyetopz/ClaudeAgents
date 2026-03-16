# ClaudeAgents

**7 AI agents that specialise so you don't have to.** One plans, one codes, one reviews, one tests - you just talk.

---

## Install

### Plugin (recommended)

```bash
claude plugin install cca
```

After install, skills get the `cca:` prefix (e.g., `/cca:review-code`).

### Manual

```bash
git clone https://github.com/xsyetopz/ClaudeAgents.git
cd ClaudeAgents
./install.sh --global --max
```

Copies agents, skills, and hooks into your `.claude/` directory. Skills use bare names (e.g., `/review-code`).

**`--pro`** uses Sonnet for all agents (Haiku for tests/docs). **`--max`** upgrades @athena and @odysseus to Opus.

```bash
./install.sh /path/to/project --pro   # per-project
./install.sh --global --pro            # global
```

Requires: Claude Code >= 2.1.75, Python 3, jq.

---

## Meet Your Agents

- **@athena** - designs architecture, breaks down tasks, plans before code gets written
- **@hephaestus** - writes code, fixes bugs, builds features (follows plans when given one)
- **@nemesis** - reviews code, audits security, checks performance (reports problems, never fixes them)
- **@atalanta** - runs tests, parses failures, finds root causes (read-only, diagnosis only)
- **@calliope** - writes and edits documentation (markdown only, no source code)
- **@hermes** - explores codebases, traces data flows, cites file:line for every claim
- **@odysseus** - coordinates multi-step tasks by delegating to the right agent

---

## Skills

**Type any of these as slash commands.** Plugin installs use the `cca:` prefix; manual installs use bare names.

| Skill | Plugin | Manual |
| --- | --- | --- |
| Structured code review | `/cca:review-code` | `/review-code` |
| Find and fix AI slop | `/cca:desloppify` | `/desloppify` |
| Commits, branches, PRs | `/cca:ship` | `/ship` |
| Present options with tradeoffs | `/cca:decide` | `/decide` |
| OWASP-style security audit | `/cca:audit-security` | `/audit-security` |
| Test strategy and coverage | `/cca:test-patterns` | `/test-patterns` |
| READMEs, changelogs, ADRs | `/cca:document` | `/document` |
| Performance optimization | `/cca:optimize` | `/optimize` |
| Error handling patterns | `/cca:handle-errors` | `/handle-errors` |
| Session handoff file | `/cca:session-export` | `/session-export` |
| Quick commits with checks | `/cca:commit` | `/commit` |

---

## Safety Rails

**These run automatically. You don't need to do anything.**

- **Secrets stay secret** - blocks reading .env files, echoing auth headers, force-pushing to main
- **No giant outputs** - stops commands that would dump thousands of lines into context
- **Code gets formatted** - auto-formats files after every write/edit
- **Placeholders get caught** - scans for TODO, FIXME, stub code, and "simplified version" patterns
- **Scope stays honest** - detects when an agent silently drops part of what you asked for
- **Types get checked** - prompts to fix LSP errors after every file change

---

## Model Tiers

| Agent | Pro | Max |
| --- | --- | --- |
| @athena | sonnet | opus |
| @hephaestus | sonnet | sonnet |
| @nemesis | sonnet | sonnet |
| @atalanta | haiku | haiku |
| @calliope | haiku | haiku |
| @hermes | sonnet | sonnet |
| @odysseus | sonnet | opus |

---

## Build Plugin from Source

```bash
./build-plugin.sh pro
```

Outputs to `dist/claude-agents-plugin/`. Test with `claude --plugin-dir ./dist/claude-agents-plugin`.

---

## Uninstall

```bash
# Plugin
claude plugin uninstall cca

# Manual
./uninstall.sh --global          # or: ./uninstall.sh /path/to/project
```

---

## License

MIT

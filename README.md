# ClaudeAgents

**7 agents, 13 skills, 12 hooks.** One plans, one codes, one reviews, one tests — you talk.

---

## Quick Start

```bash
# Plugin (recommended)
claude plugin install cca

# Manual
git clone https://github.com/xsyetopz/ClaudeAgents.git
cd ClaudeAgents
./install.sh --global --max
```

**Plugin** → skills get the `cca:` prefix (`/cca:review-code`).
**Manual** → bare names (`/review-code`).

---

## Agents

| Who             | What                             | Pro    | Max    |
| --------------- | -------------------------------- | ------ | ------ |
| **@athena**     | Plans, designs, architects       | sonnet | opus   |
| **@hephaestus** | Writes code, fixes bugs          | sonnet | sonnet |
| **@nemesis**    | Reviews code, audits security    | sonnet | sonnet |
| **@atalanta**   | Runs tests, finds root causes    | haiku  | haiku  |
| **@calliope**   | Writes docs (markdown only)      | haiku  | haiku  |
| **@hermes**     | Explores codebases, traces flows | sonnet | sonnet |
| **@odysseus**   | Coordinates multi-step tasks     | sonnet | opus   |

**`--pro`** = Sonnet everywhere (Haiku for tests/docs). **`--max`** = Opus for @athena and @odysseus.

---

## Skills

**Slash commands.** Type them directly.

| What it does                    | Plugin                | Manual            |
| ------------------------------- | --------------------- | ----------------- |
| Code review                     | `/cca:review-code`    | `/review-code`    |
| Remove AI slop                  | `/cca:desloppify`     | `/desloppify`     |
| Commits, branches, PRs          | `/cca:ship`           | `/ship`           |
| Quick commit                    | `/cca:commit`         | `/commit`         |
| Present options + tradeoffs     | `/cca:decide`         | `/decide`         |
| Security audit (OWASP)          | `/cca:audit-security` | `/audit-security` |
| Test strategy + coverage        | `/cca:test-patterns`  | `/test-patterns`  |
| Docs: READMEs, ADRs, changelogs | `/cca:document`       | `/document`       |
| Performance optimization        | `/cca:optimize`       | `/optimize`       |
| Error handling patterns         | `/cca:handle-errors`  | `/handle-errors`  |
| Session handoff                 | `/cca:session-export` | `/session-export` |

**Internal skills** (agents use these automatically, you don't invoke them):

- **escalate** — stops agents from making decisions they should ask you about
- **scope-guard** — stops agents from touching files outside their task

---

## Safety Rails

**All automatic. You configure nothing.**

| Hook                    | When                     | What it does                                              |
| ----------------------- | ------------------------ | --------------------------------------------------------- |
| `guard-secrets`         | Before any tool          | Blocks .env reads, auth header leaks, force-push to main  |
| `guard-commands`        | Before shell             | Blocks commands that dump thousands of lines into context |
| `validate-tool-input`   | Before any tool          | Validates file paths and content before writes            |
| `validate-write`        | After write/edit         | Auto-formats, catches placeholders and comment slop       |
| `redact-output`         | After shell              | Scrubs secrets and PII from command output                |
| `scan-completion`       | Agent stop + session end | Catches incomplete work, stubs, silent scope reduction    |
| `check-scope-reduction` | Agent stop               | Blocks agents that quietly drop requirements              |
| `check-collaboration`   | Agent stop               | Catches sycophancy and single-option decisions            |
| `detect-workaround`     | Before tool              | Flags workaround patterns (--no-verify, force flags)      |
| `check-budget`          | Session start            | Warns when config files exceed line budgets               |
| `http-hook-proxy`       | Before + after tools     | Forwards events to enterprise DLP server (opt-in)         |

Plus: LSP error check prompt after every file change, scope reduction prompt and collaboration protocol prompt on every agent stop.

---

## Personas

Three constraint profiles. Set at install or build time.

| Persona        | Flag    | Vibe                                                                        |
| -------------- | ------- | --------------------------------------------------------------------------- |
| **consumer**   | `--pro` | Balanced. Acts on low stakes, asks on medium+. KISS over SOLID.             |
| **enterprise** | `--max` | Fail-closed. No changes without approval. Security findings block all work. |
| **zen**        | `zen`   | Plan-first. Smallest change that works. Ask over assume.                    |

```bash
./install.sh --global --pro         # consumer persona
./install.sh --global --max         # enterprise persona
./build-plugin.sh zen               # zen persona (build only)
```

---

## Enterprise HTTP Hooks

Forward all hook events to a central DLP/audit server.

```bash
export CCA_HTTP_HOOK_URL="https://dlp.internal/hooks"   # POST endpoint (unset = disabled)
export CCA_HTTP_HOOK_TOKEN="Bearer ..."                  # auth token (optional)
export CCA_HTTP_HOOK_FAIL_CLOSED=1                       # block on server unreachable (default: fail-open)
```

---

## Build from Source

```bash
./build-plugin.sh consumer    # or: enterprise, zen
```

Outputs to `dist/claude-agents-plugin/`. Test with:

```bash
claude --plugin-dir ./dist/claude-agents-plugin
```

---

## Uninstall

```bash
# Plugin
claude plugin uninstall cca

# Manual
./uninstall.sh --global          # or: ./uninstall.sh /path/to/project
```

---

## Requirements

Claude Code >= 2.1.75, Python 3, jq.

---

## License

MIT

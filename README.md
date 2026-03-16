# ClaudeAgents

**7 AI agents that specialise so you don't have to.** One plans, one codes, one reviews, one tests — you just talk.

```bash
claude plugin install ca
```

---

## Get It

### Plugin (recommended)

```bash
claude plugin install ca
```

**What just happened?** Claude Code downloaded 7 agents, 11 slash commands, and 6 safety hooks. They're ready to use immediately.

### One more thing

Plugins can't set permissions for you. **Paste this into your project's** `.claude/settings.json`:

```json
{
  "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" },
  "permissions": { "deny": ["Agent(Explore)", "Agent(Plan)", "Agent(general-purpose)"] }
}
```

**Why?** The first line enables agent teams. The deny list routes work to the specialised agents instead of generic built-ins.

The SessionStart hook will warn you if these are missing.

---

## Meet Your Agents

- **@athena** — designs architecture, breaks down tasks, plans before code gets written
- **@hephaestus** — writes code, fixes bugs, builds features (follows plans when given one)
- **@nemesis** — reviews code, audits security, checks performance (reports problems, never fixes them)
- **@atalanta** — runs tests, parses failures, finds root causes (read-only, diagnosis only)
- **@calliope** — writes and edits documentation (markdown only, no source code)
- **@hermes** — explores codebases, traces data flows, cites file:line for every claim
- **@odysseus** — coordinates multi-step tasks by delegating to the right agent

---

## Skills

**Type any of these as slash commands:**

- **/ca:review-code** — structured code review with severity ratings
- **/ca:desloppify** — find and fix AI-generated slop (filler words, obvious comments, placeholder code)
- **/ca:ship** — commits, branches, PRs with Conventional Commits
- **/ca:decide** — present 2-3 options with tradeoffs for any decision
- **/ca:audit-security** — OWASP-style security audit with file:line citations
- **/ca:test-patterns** — test strategy, coverage analysis, test writing guidance
- **/ca:document** — READMEs, changelogs, ADRs, API docs
- **/ca:optimize** — performance profiling and optimization recommendations
- **/ca:handle-errors** — error handling patterns (Result types, exceptions, retries)
- **/ca:session-export** — save a handoff file so your next session picks up where you left off
- **/ca:commit** — quick commits with quality checks

---

## Safety Rails

**These run automatically. You don't need to do anything.**

- **Secrets stay secret** — blocks reading .env files, echoing auth headers, force-pushing to main
- **No giant outputs** — stops commands that would dump thousands of lines into context
- **Code gets formatted** — auto-formats files after every write/edit
- **Placeholders get caught** — scans for TODO, FIXME, stub code, and "simplified version" patterns
- **Scope stays honest** — detects when an agent silently drops part of what you asked for
- **Types get checked** — prompts to fix LSP errors after every file change

---

### Manual install

```bash
./install.sh /path/to/project --pro
```

**`--pro`** uses Sonnet for all agents (Haiku for tests/docs). **`--max`** upgrades @athena and @odysseus to Opus.

```bash
./install.sh /path/to/project --max
./install.sh --global --pro
```

Requires: Claude Code >= 2.1.75, Python 3, jq.

### Build plugin from source

```bash
./build-plugin.sh pro
```

Outputs to `dist/claude-agents-plugin/`. Test with `claude --plugin-dir ./dist/claude-agents-plugin`.

### Model tiers

| Agent         | Pro    | Max    |
| ------------- | ------ | ------ |
| @athena       | sonnet | opus   |
| @hephaestus   | sonnet | sonnet |
| @nemesis      | sonnet | sonnet |
| @atalanta     | haiku  | haiku  |
| @calliope     | haiku  | haiku  |
| @hermes       | sonnet | sonnet |
| @odysseus     | sonnet | opus   |

### Uninstall

```bash
claude plugin uninstall ca
```

For manual installs, delete the `.claude/agents/`, `.claude/skills/ca/`, and `.claude/hooks/` directories.

</details>

---

## License

MIT

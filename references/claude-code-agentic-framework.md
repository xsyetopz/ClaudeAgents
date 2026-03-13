# Claude Code Agentic Framework – Configuration & Extensibility

> Research summary on creating a deterministic agentic framework in Claude Code, covering Skills, subagents, slash commands, hooks, settings.json, environment variables, MCP, and Agent Teams. (Research through 13 March 2026.)

---

## 1. Big picture: how Claude Code becomes an "agentic framework"

Claude Code can be turned into a fairly deterministic multi‑agent framework by combining four layers:

1. **Filesystem‑based definitions**
   - Skills (`SKILL.md`), subagents (`agents/*.md`), slash commands (`.claude/commands/*.md`), plugins, and MCP servers.
2. **Configuration & policy**
   - `settings.json` at multiple scopes (managed, user, project, local) plus hook definitions and permissions.
3. **Environment & sandbox**
   - Process env vars and `env` in `settings.json` to pin models, thinking depth, timeouts, and tool behavior.
4. **Multi‑agent orchestration**
   - Subagents and the experimental **Agent Teams** mode, layered on top of the above.

These levers together let you fix:

- Which models and tools can be used
- How agents are prompted (roles, responsibilities, verification)
- How/when tools run (hooks, sandbox, permissions)
- How teams of agents coordinate on task lists

The rest of this doc is a structured reference of the main knobs.

---

## 2. Skills and slash commands (frontmatter and behavior)

Skills are reusable, filesystem‑discovered workflows. In modern Claude Code, **legacy slash commands** (`.claude/commands/*.md`) and **Skills** (`.../skills/<name>/SKILL.md`) share essentially the same frontmatter model.

### 2.1 Skill locations

- **Project‑scoped Skills**
  - `.claude/skills/<skill-name>/SKILL.md`
- **User‑scoped Skills**
  - `~/.claude/skills/<skill-name>/SKILL.md`
- **Plugin‑scoped Skills**
  - `<plugin-root>/skills/<skill-name>/SKILL.md` (discovered when plugin is enabled)

Legacy commands:

- **Project commands**: `.claude/commands/*.md`
- **User commands**: `~/.claude/commands/*.md`
- **Plugin commands**: `<plugin-root>/commands/*.md`

In practice, you can treat commands as Skills whose `name` is the filename.

### 2.2 Skill frontmatter options (SKILL.md)

A `SKILL.md` is a markdown file with YAML frontmatter and a free‑form body. Representative fields, based on Anthropic docs and community usage:

```yaml
---
name: review
description: Comprehensive code review for recent changes
argument-hint: "[optional: path or commit range]"
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(npm test)
model: sonnet
context: fork
agent: Explore
hooks:
  PreToolUse: []
  PostToolUse: []
---
``

**Field reference (behaviorally relevant):**

- `name`
  - Slash name used in UI.
  - If omitted, directory name is used.
  - Best practice: lowercase, hyphens, ≤64 chars.

- `description`
  - Used for auto‑invocation and discoverability.
  - For deterministic behavior, describe:
    - When to use the skill
    - What it *must* and *must not* do

- `argument-hint`
  - Text hint in the command palette (helps standardize arguments in teams).

- `disable-model-invocation`
  - `true` = Claude will **never** auto‑invoke this skill.
  - Only the user can call it from the `/` menu.
  - Good for side‑effectful tasks (`/deploy`, `/commit`).

- `user-invocable`
  - Defaults to `true`.
  - Set `false` for background/reference skills that only agents should use.

- `allowed-tools`
  - Whitelist of tools Claude may use while this skill is active.
  - Example patterns:
    - `Read, Grep, Glob`
    - `Bash(npm run test:unit)`, `Bash(git diff:*)`
  - Strong lever for deterministic behavior: limit scope and side effects.

- `model`
  - Model to use **inside** the skill (`sonnet`, `opus`, `haiku` or full id).
  - Overrides global defaults / per‑session selections.

- `context`
  - Typical value: `fork`.
  - `fork` means: run as a separate subagent context (separate memory and history), which improves reproducibility and isolation.

- `agent`
  - Which agent config to use when `context: fork`.
  - Can be a built‑in (e.g. `Explore`, `Plan`) or a custom subagent defined in `.claude/agents` or a plugin.

- `hooks`
  - Optional hooks scoped to this skill.
  - Shape mirrors `hooks` in `settings.json` (see hooks section below).

Other frontmatter keys sometimes seen in community skills tend to be cosmetic or plugin‑specific; the above are the main behavioral ones.

### 2.3 Slash commands (legacy commands) frontmatter

Commands in `.claude/commands/*.md` or `~/.claude/commands/*.md` use essentially the same fields:

```yaml
---
allowed-tools: Read, Grep, Glob, Bash(git diff:*)
description: Run a detailed review of changed files
argument-hint: "[optional: base commit]"
model: sonnet
---
```

In the body you can use the same features as skills: argument substitution, env substitution, and shell injection, described next.

### 2.4 Body syntax: arguments, env, shell, files

Inside a Skill/command, the prompt body supports several deterministic constructs:

1. **Arguments**
   - `$ARGUMENTS` – full string of user‑provided arguments.
   - `$ARGUMENTS[0]`, `$ARGUMENTS[1]` – tokens split on whitespace.
   - `$0`, `$1`, `$2` – positional aliases often used in examples.
   - If no argument variable is referenced, Claude appends:

     ```text
     ARGUMENTS: <user-args>
     ```

2. **Environment substitution**
   - `${CLAUDE_SESSION_ID}` – stable per‑session id.
   - `${CLAUDE_SKILL_DIR}` – directory containing the SKILL.
   - Also standard shell env like `${HOME}` if present.

3. **Shell injection**
   - `` !`command` `` is executed **before** the prompt is sent.
   - The stdout replaces the backticked command in the markdown.
   - Example:

     ```markdown
     ## Changed Files
     !`git diff --name-only HEAD~1`

     ## Diff
     !`git diff HEAD~1`
     ```

   - This makes Skills feel like macros that pre‑gather context deterministically.

4. **File references**
   - `@path/to/file` can be used (especially in slash commands) to inline file contents.

Used consistently, these constructs are the backbone of reproducible, file‑driven workflows.

---

## 3. Subagents: deterministic personas in `.claude/agents`

Subagents are customized Claude personas with their own tools, models, and policies, defined as markdown files in `.claude/agents/` (project or user scope) or in plugin `agents/` directories.

### 3.1 Subagent file structure

Example `agents/feature-dev.md`:

```yaml
---
name: feature-dev
description: "Implements small, reviewable slices of backend features."
model: sonnet
permissionMode: acceptEdits
maxTurns: 40
tools: Read, Grep, Glob, Bash(npm *), Bash(pnpm *)
disallowedTools: Bash(rm *), Bash(rm -rf *), Bash(curl *)
skills:
  - review
  - write-tests
memory: project
hooks:
  PreToolUse: []
  PostToolUse: []
---

You are the Feature Developer agent for this project.

Responsibilities:
- Implement features in small, reviewable PR-sized chunks.
- Keep changes localized when possible.
- Always update or create tests.
- Prefer to ask clarifying questions instead of guessing when requirements are ambiguous.

Process:
1. Inspect the codebase (entrypoints, domain models, tests).
2. Propose a concrete implementation plan and confirm.
3. Implement in small steps, running relevant tests after changes.
4. Summarize changes and their rationale.
```

### 3.2 Subagent frontmatter reference

Key fields for deterministic behavior:

- `name`
  - Required; id used when delegating or in `agent:` references.

- `description`
  - When Claude should invoke this subagent.

- `model`
  - Model for this subagent.
  - `inherit` = use main session model.

- `tools`
  - Comma‑separated allowlist of tools for this subagent.
  - If omitted, it inherits the main agent’s tool set.

- `disallowedTools`
  - Tools removed from the inherited tool set (least‑privilege tuning).

- `permissionMode`
  - Per‑subagent permission behavior, common values:
    - `default` – use session default.
    - `acceptEdits` – auto‑accept file edits from this subagent.
    - `plan` – planning‑oriented mode.
    - `bypassPermissions` – subagent bypasses confirmations (use with extreme care).

- `maxTurns`
  - Hard cap on the number of thought/action cycles.
  - Important to prevent infinite loops.

- `skills`
  - Skills pre‑loaded into this subagent.

- `hooks`
  - Hook config scoped to this subagent.

- `memory`
  - Memory scope: `user`, `project`, `local`, or omitted.
  - Controls whether this persona carries context across sessions.

- `background`
  - If present/true, subagent runs as background worker; useful for long tasks.

For a deterministic framework, explicitly set `model`, `tools`, `permissionMode`, and `maxTurns` on all important subagents.

---

## 4. Hooks: event‑driven guardrails and automation

Hooks are JSON‑configured handlers that run on specific lifecycle events. They can be defined in global or project `settings.json`, plugin `hooks/hooks.json`, or in the `hooks` field of skills/agents.

### 4.1 Hook structure

Conceptually:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash(*)",
        "hooks": [
          {
            "type": "command",
            "command": "./.claude/hooks/check-bash.sh",
            "timeout": 180
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write(*)",
        "hooks": [
          {
            "type": "command",
            "command": "npm test",
            "timeout": 600
          }
        ]
      }
    ]
  }
}
```

**Important elements:**

- **Events** (top‑level keys):
  - Common ones include:
    - `UserPromptSubmit`
    - `PreToolUse`
    - `PostToolUse`
    - `SessionStart`
    - `Stop`
    - `SubagentStop`
    - `WorktreeCreate`, `WorktreeRemove`
    - `PreCompact` (before context compaction)

- **Matchers**
  - Decide when this hook applies.
  - Examples:
    - `"Bash(*)"` – any Bash tool.
    - `"Bash(npm * test)"` – pattern‑matched commands.
    - `"Write(*)"` – any write.
    - `"ToolName"` – specific tool.

- **Hook types**
  - `command` – run an external program.
  - `prompt` – run a lightweight LLM prompt.
  - `agent` – spin up a subagent to make an allow/deny decision.

Exit codes or JSON output from hooks decide whether to allow, block, or modify the tool call.

### 4.2 Hook scopes and precedence

Hooks can be located at multiple layers:

- Managed settings → always applied first, cannot be overridden.
- User settings (`~/.claude/settings.json`).
- Project settings (`.claude/settings.json`).
- Local project settings (`.claude/settings.local.json`).
- Plugin `hooks/hooks.json`.
- Skill/agent `hooks` frontmatter.

In a deterministic framework, you typically:

- Use managed or user `settings.json` for non‑negotiable security policies.
- Use project `.claude/settings.json` for project‑specific automation (tests, formatters).
- Use skill/agent hooks to add local behavior for that component only.

---

## 5. `settings.json`: settings, permissions, sandbox, MCP, plugins

`settings.json` is the primary configuration file. It can exist in:

- `~/.claude/settings.json` (user)
- `.claude/settings.json` (project)
- `.claude/settings.local.json` (per‑user override for that project)
- A separate managed config controlled by your organization

Arrays (like permissions) are typically **merged** across scopes, while scalar values follow priority: managed > CLI overrides > local project > project > user.

### 5.1 Core keys

Some of the most impactful keys (names may vary slightly by version):

- `model`
  - Default model for Claude Code (per scope).

- `availableModels`
  - Restrict visible models (e.g. `["sonnet", "haiku"]`).

- `language`
  - Preferred output language.

- `alwaysThinkingEnabled`
  - Default extended thinking mode.

- `outputStyle`
  - High‑level stylistic preference.

- `cleanupPeriodDays`
  - How long inactive sessions persist.

- `env`
  - Map of environment variables to inject into Claude Code’s process (see section 6).

### 5.2 Permissions

Permissions define what Claude is allowed to do without asking, when to ask, and what to block.

Example:

```json
{
  "permissions": {
    "allow": [
      "Read(./src/**)",
      "Read(./tests/**)",
      "Bash(npm run lint)",
      "Bash(npm test)"
    ],
    "ask": [
      "Write(./src/**)",
      "Bash(git commit)",
      "Bash(git push)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./secrets/**)",
      "Bash(rm -rf *)",
      "Bash(curl *)"
    ],
    "additionalDirectories": [
      "../shared-lib"
    ],
    "defaultMode": "default",
    "disableBypassPermissionsMode": "disable"
  }
}
```

Key fields:

- `allow`
  - Always allowed patterns.

- `ask`
  - Always needs user confirmation.

- `deny`
  - Hard block.

- `additionalDirectories`
  - Extra dirs Claude may access beyond the project root.

- `defaultMode`
  - `default`, `plan`, `acceptEdits`, or `bypassPermissions` (mode names may evolve by version). Controls global permission mode.

- `disableBypassPermissionsMode`
  - Recommended to set to a disabling value in serious environments.

### 5.3 Sandbox

Sandboxing isolates Claude’s Bash commands.

Representative structure:

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": false,
    "filesystem": {
      "allowWrite": ["./src", "./tests"],
      "denyWrite": ["./secrets", "./.git"],
      "denyRead": ["./.env", "./secrets/**"]
    },
    "network": {
      "allowedDomains": ["api.mycompany.com"],
      "allowUnixSockets": false,
      "allowLocalBinding": false,
      "httpProxyPort": 0,
      "socksProxyPort": 0
    }
  }
}
```

For a deterministic framework, enable sandboxing and narrow allowed file/network access as much as possible.

### 5.4 Hooks, MCP, plugins

Inside `settings.json` you can also configure:

- `hooks`: The hook tree described in section 4.

- MCP:
  - `enableAllProjectMcpServers`
  - `enabledMcpjsonServers`
  - `disabledMcpjsonServers`
  - In managed settings: `allowedMcpServers`, `deniedMcpServers`, `allowManagedMcpServersOnly`

- Plugins:
  - `enabledPlugins`: Map of plugin names to booleans.
  - `extraKnownMarketplaces`: Extra plugin marketplaces.
  - `strictKnownMarketplaces`: If set (managed), only these marketplaces are allowed.

- Agent Teams & UI (varies slightly by version):
  - `teammateMode`: `auto`, `in-process`, or `tmux`.
  - `plansDirectory`, UI toggles, etc.

---

## 6. Environment variables and the `env` block

Claude Code respects a rich set of environment variables. Most of them can also be set via the `env` map inside `settings.json`, which is preferable for reproducibility.

### 6.1 Model & thinking related env vars

Examples (exact naming may change across minor versions, but patterns are stable):

- `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_CUSTOM_HEADERS`
  - API auth and headers.

- `ANTHROPIC_MODEL`
  - Named default model.

- `ANTHROPIC_DEFAULT_HAIKU_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`
  - Per‑family defaults.

- `CLAUDE_CODE_MAX_OUTPUT_TOKENS`
  - Caps output tokens for Claude Code sessions.

- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`
  - Percentage of context usage at which auto‑compaction should kick in.

- `MAX_THINKING_TOKENS`
  - Cap extended thinking tokens or disable thinking when set to `0` on supported models.

- `CLAUDE_CODE_EFFORT_LEVEL`
  - `low`, `medium`, or `high` reasoning effort (Sonnet/Opus families).

- `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING`
  - Disables adaptive thinking for certain model versions.

### 6.2 Safety, telemetry, and tool behavior

Common variables for a strict environment:

- `CLAUDE_CODE_SIMPLE=1`
  - Disables many advanced features (MCP, hooks, CLAUDE.md) for a minimal tool set.

- `CLAUDE_CODE_DISABLE_FAST_MODE`
- `CLAUDE_CODE_DISABLE_AUTO_MEMORY`
- `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`
- `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS`

Telemetry and updater:

- `CLAUDE_TELEMETRY_OPTOUT`, `DISABLE_TELEMETRY`, `DISABLE_ERROR_REPORTING`, `DISABLE_AUTOUPDATER`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`

Bash behavior:

- `BASH_DEFAULT_TIMEOUT_MS`, `BASH_MAX_TIMEOUT_MS`, `BASH_MAX_OUTPUT_LENGTH`
- `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` – reset working dir after each command.
- `CLAUDE_ENV_FILE` – script sourced before each Bash command.

### 6.3 MCP & Agent Teams env vars

- MCP:
  - `ENABLE_CLAUDEAI_MCP_SERVERS`
  - `MCP_TIMEOUT`, `MCP_TOOL_TIMEOUT`, `MAX_MCP_OUTPUT_TOKENS`

- Agent Teams:
  - `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` – gate for Agent Teams.
  - `CLAUDE_CODE_TASK_LIST_ID` – shared task list id for cross‑session coordination.

These should be set via `env` in your project `.claude/settings.json` for consistency, rather than relying on each developer’s shell.

---

## 7. Agent Teams: multi‑agent orchestration

Agent Teams are an experimental feature that let you run multiple collaborating Claude sessions against the same repo and context.

### 7.1 Enabling and controlling teams

- Enable via env: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.
- Configure display via `teammateMode` in `settings.json`:
  - `in-process` – multiple panes inside a single terminal window.
  - `tmux` – each teammate in a tmux pane.
  - `auto` – Claude decides.

For a deterministic environment, pick one mode in your project settings.

### 7.2 Prompt patterns for teams

Good practice for teams:

- Define **roles** and **responsibilities** explicitly (e.g. Architect, Backend, Frontend, QA, Technical Writer).
- Use a **contract‑first** task (schema/API spec) created by one agent and consumed by others.
- Encourage **competing hypotheses** for debugging: each teammate proposes and tests a theory.
- Tell the lead agent to **clean up** at the end: shut down teammates, remove temp files, summarize results.

Teams don’t require extra config files themselves; they’re a runtime orchestration mode that relies on:

- Your subagent definitions
- Your Skills and allowed tools
- Your hooks and permissions

That’s why getting the lower layers deterministic first (skills, agents, settings, env) is essential.

---

## 8. Putting this into a deterministic framework

A concrete pattern you can adopt for a Claude Code–based framework:

1. **Global / managed settings**
   - Lock down telemetry, sandboxing, and high‑risk tools.
   - Restrict MCP servers and plugin marketplaces.

2. **Project `.claude/settings.json`**
   - Pin `model` and `availableModels`.
   - Define `permissions` (allow/ask/deny) and `sandbox` paths.
   - Use `env` to fix output tokens, thinking limits, effort level, and Agent Teams flag.
   - Add `hooks` for pre/post tool use and stopping conditions.

3. **Subagents in `.claude/agents`**
   - One per stable persona (feature dev, reviewer, migration specialist, QA, etc.).
   - Each with explicit `model`, `tools`, `permissionMode`, `maxTurns`, and `skills`.

4. **Skills & commands**
   - Define core workflows as Skills:
     - `/review`, `/refactor`, `/implement`, `/migrate-schema`, `/deploy-dry-run`, etc.
   - Use frontmatter (`allowed-tools`, `model`, `context`, `agent`, `disable-model-invocation`) to constrain behavior.

5. **Hooks as enforcement**
   - `PreToolUse` to block dangerous commands and enforce policies.
   - `PostToolUse` and `Stop`/`SubagentStop` to ensure tests/formatters run.

6. **Agent Teams on top**
   - Once the above is solid, define common team prompts and rely on your framework configs to keep behavior consistent.

Combined, these pieces give you a highly configurable and reproducible agentic environment built around Claude Code, where behavior emerges from configuration and markdown—not ad‑hoc prompting.

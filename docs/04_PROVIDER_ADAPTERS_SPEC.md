# 04 — Provider Adapter Specification

## Adapter principle

Each provider adapter renders native artifacts. Adapters must not simulate unsupported semantics unless a runtime policy explicitly implements the missing behavior and documents its limits.

Provider parity means “same OAL capability is available,” not “same file format, hook name, or command shape.”

## Codex adapter

### Inputs

- Source graph
- Selected Codex model plan: `plus`, `pro-5`, or `pro-20`
- Target scope: project or user
- Feature preset: stable, experimental, or local override

### Outputs

```text
.codex/config.toml
.codex/agents/*.toml
.codex/openagentlayer/skills/*/SKILL.md
.codex/openagentlayer/skills/*/openai.yaml
.codex/openagentlayer/runtime/*.mjs
AGENTS.md managed block
.oal/manifest/codex-project.json
```

Codex is the only v4 target that emits TOML, and only for Codex-native
`config.toml` plus `.codex/agents/*.toml`. Runtime policy files and manifests
remain JSON or JavaScript.

### Codex config areas v4 should own

Codex’s config schema exposes keys relevant to OAL: model, model provider, model reasoning effort, reasoning summary, verbosity, plan-mode reasoning effort, sandbox mode, service tier, tools, web search, hooks, history, SQLite state, profiles, and many feature flags. V4 should use schema-derived allowlists rather than hand-maintained stale keys.

Required source-owned categories:

```toml
model = "..."
model_reasoning_effort = "medium"
model_verbosity = "low"
model_reasoning_summary = "none"
plan_mode_reasoning_effort = "high"
sandbox_mode = "workspace-write"
model_instructions_file = ".codex/openagentlayer/AGENTS.md"

[history]
persistence = "save-all"

[profiles.oal-main]
...

[features]
codex_hooks = true
multi_agent = true
sqlite = true
responses_websockets_v2 = true
view_image = true
steer = true
```

### Codex feature preset policy

V4 should generate feature flags from presets.

#### `codex-stable`

```toml
codex_hooks = true
sqlite = true
multi_agent = true
view_image = true
steer = true
responses_websockets = true
responses_websockets_v2 = true
tui_app_server = true
plugins = true
memories = false
apps = false
unified_exec = false
collaboration_modes = false
codex_git_commit = false
js_repl = false
undo = false
```

#### `codex-runtime-long`

Same as stable, plus:

```toml
unified_exec = true
prevent_idle_sleep = true
```

#### `codex-experimental`

Only for local opt-in:

```toml
apps = true
memories = true
plugins = true
multi_agent_v2 = true
```

Every experimental flag requires a source comment, schema support, and a rollback path.

### Codex agent TOML

Each agent TOML should be generated from an agent record and selected model plan. Do not hardcode model or effort in agent records if model plans exist.

```toml
name = "hephaestus"
description = "Implementation agent for scoped production code changes."
model = "gpt-5.3-codex"
model_reasoning_effort = "medium"
model_verbosity = "low"
sandbox_mode = "workspace-write"
developer_instructions = """
...
"""
```

### Codex route commands

Codex commands should be thin entrypoints that set route context and model profile. They should not embed giant prompts that drift from agent prompts.

Example source-to-render mapping:

| Route           | Profile              | Owner          | Contract           |
| --------------- | -------------------- | -------------- | ------------------ |
| `oal-explore`   | `oal-utility`        | Hermes/Artemis | readonly           |
| `oal-plan`      | `oal-main`           | Athena         | readonly           |
| `oal-implement` | `oal-implementation` | Hephaestus     | edit-required      |
| `oal-review`    | `oal-review`         | Nemesis        | readonly           |
| `oal-test`      | `oal-validation`     | Atalanta       | execution-required |

### Codex adapter validation

1. TOML parses.
2. Config keys validate against schema-derived allowlist.
3. Every profile resolves a model and effort.
4. Feature flag contradictions fail. Example: emitting plugin config while `plugins = false` fails unless Codex docs prove plugin table works independently.
5. Route contracts match sandbox modes.
6. Hook policies unsupported by Codex produce warnings/errors and do not render fake hooks.
7. Headless smoke can start with each profile and run a no-op route.

## Claude Code adapter

### Inputs

- Source graph
- Claude plan: `max-5` or `max-20`
- Effort policy: `low`, `medium`, `high`, `xhigh`, `max`, or `auto`
- Scope: project, user, or managed

### Outputs

```text
.claude/settings.json
.claude/agents/*.md
.claude/skills/*/SKILL.md
.claude/hooks/runtime/*.mjs
CLAUDE.md managed block
.oal/manifest/claude-project.json
```

Claude agents render as Markdown with YAML frontmatter. Claude Code output does
not use TOML.

### Claude settings v4 should own

Claude Code settings include permissions, model selection, available models, model overrides, `effortLevel`, `fastMode`, hooks, status line, plugins, file suggestions, MCP allow/deny controls, memory settings, and environment variables.

V4 must be conservative with managed settings. Project scope should avoid overriding personal UI/auth preferences. Managed scope may enforce enterprise controls.

### Claude effort policy

Claude Code settings now expose `effortLevel` with `low`, `medium`, `high`, `xhigh`, and `max`. Opus 4.7 supports `xhigh`; Opus 4.6 and Sonnet 4.6 support low/medium/high/max, with xhigh falling back to high. V4 should not set `max` by default. Treat `max` as a one-run explicit override for hard tasks.

Recommended default:

- Max 5x: Sonnet 4.6 or Haiku 4.5 for routine tasks, Opus 4.7 for architecture/review/orchestration, effort `high` only for hard tasks, no `[1m]` unless needed.
- Max 20x: same model discipline, more concurrency and escalation allowance, not always Opus `[1m]`.

### Claude hook support

Claude has a rich hook surface: `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `UserPromptSubmit`, `Stop`, `StopFailure`, `SubagentStart`, `SubagentStop`, `PreCompact`, `PostCompact`, and more. V4 should use this richness, but only through typed policy mappings.

### Claude agent Markdown

Generated agents should include frontmatter fields only when supported and selected by source. Example:

```yaml
---
name: Hephaestus
model: sonnet
description: Implementation agent for scoped production code changes.
tools:
  - Read
  - Edit
  - MultiEdit
  - Write
  - Grep
  - Glob
  - Bash
permissionMode: acceptEdits
effort: high
---
```

If Claude Code native frontmatter changes, adapter tests must catch it.

### Claude validation

1. JSON settings validate against SchemaStore.
2. Project settings do not write managed-only keys.
3. Agent permission mode matches OAL contract.
4. Hook events exist in schema.
5. Effort is not emitted for unsupported model classes without fallback policy.
6. Status line integration does not overwrite existing user status line unless managed.

## OpenCode adapter

### Inputs

- Source graph
- Model plan
- Scope: project or user

### Outputs

```text
opencode.json or opencode.jsonc
.opencode/agents/*.md
.opencode/commands/*.md
.opencode/skills/*/SKILL.md
.opencode/plugins/openagentlayer.*
.oal/manifest/opencode-project.json
```

OpenCode agents and commands render as Markdown with YAML frontmatter. OpenCode
output does not use TOML.

### OpenCode config v4 should own

OpenCode supports JSON/JSONC config and merges multiple locations. Project config can override global config. Managed settings exist for organizations. The config includes `provider`, `model`, `small_model`, `agent`, `default_agent`, `command`, `skills`, `permission`, `compaction`, `watcher`, `mcp`, `plugin`, and related options.

OpenCode’s `small_model` is useful for lightweight tasks like title generation. V4 should map OAL utility roles to agent-specific models rather than globally downgrading the default model.

### OpenCode agents

OpenCode distinguishes primary agents and subagents. V4 must render exactly one `default_agent` and it must be a primary agent. A broken default agent should be a render error, not a runtime warning.

Suggested mapping:

| OAL role         | OpenCode mode                                 | Notes                                 |
| ---------------- | --------------------------------------------- | ------------------------------------- |
| Build/Hephaestus | primary or subagent depending deploy profile | Main writer                           |
| Athena           | primary plan variant or subagent              | Read-only plan                        |
| Hermes/Artemis   | subagent                                      | read-only exploration                 |
| Nemesis/Themis   | subagent                                      | review/security                       |
| Atalanta         | subagent                                      | test execution                        |
| Calliope         | subagent                                      | docs                                  |
| Odysseus         | primary                                       | orchestrator when team mode requested |

### OpenCode permissions

OpenCode permission rules resolve to `allow`, `ask`, or `deny`. V4 should prefer `permission` over deprecated `tools` booleans.

Examples:

```jsonc
{
  "permission": {
    "*": "ask",
    "bash": {
      "git status": "allow",
      "rm *": "deny"
    },
    "edit": "ask"
  },
  "agent": {
    "nemesis": {
      "permission": {
        "edit": "deny",
        "bash": "ask"
      }
    }
  }
}
```

### OpenCode validation

1. Config validates against `https://opencode.ai/config.json`.
2. Exactly one default primary agent is rendered.
3. Agent modes match OAL contracts.
4. Permission entries use current `permission` field, not deprecated `tools`, except compatibility output.
5. `snapshot` is not disabled by default unless explicit large-repo preset selected.
6. Project config does not override global provider credentials.

## Cross-adapter policy

Each adapter must expose:

```ts
type SurfaceAdapter = {
  surface: Surface;
  loadSchema(): Promise<SchemaStudy>;
  render(graph: SourceGraph, context: RenderContext): RenderBundle;
  validate(bundle: RenderBundle): Diagnostic[];
  explain(recordId: string): AdapterExplanation;
};
```

## Provider-native ownership modes

| Mode                | Use case                                             |
| ------------------- | ---------------------------------------------------- |
| `full-file`         | OAL runtime scripts and generated agent files.       |
| `marked-text-block` | `AGENTS.md`, `CLAUDE.md`, shared instructions.       |
| `structured-object` | JSON/TOML config merge where OAL owns selected keys. |
| `reference-copy`    | third-party skill references and scripts.            |
| `user-owned`        | values OAL reads but never writes.                   |

No deploy should proceed without a deploy manifest preview.

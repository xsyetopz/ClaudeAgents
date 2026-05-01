# 11 — Research Notes and Source Map

Retrieval date: 2026-05-01.

## OpenAgentLayer repo

Repository studied:

- `https://github.com/xsyetopz/OpenAgentLayer`

Important current-source paths:

- `docs/architecture.md`
- `AGENTS.md`
- `package.json`
- `scripts/generate.mjs`
- `source/catalog/items.mjs`
- `source/catalog/loaders.mjs`
- `source/agents/*/agent.json`
- `source/agents/*/agent.json`
- `source/hooks/policies/subagent-route-context.json`
- `source/subscriptions.mjs`
- `codex/templates/config.toml`

Important git evidence:

- Current restored v3 commit observed in repository history: `0a05c6363990f131bf8ad54213eebc76770d85ad`, message: `restore v3 because rest were broken apparently`.
- Recent v4 attempt commit observed: `1ac882d078551c5477053d1c7f54cb75b0800f57`, message: `feat(oal): harden provider parity and runtime gates`.

Interpretation: v4 should not repeat a full all-at-once rewrite. Build the source graph, one adapter, deploy lifecycle, then runtime policies and evals.

## Upstream schemas and docs

### Codex

- Schema: `https://github.com/openai/codex/blob/main/codex-rs/core/config.schema.json`
- Docs: `https://github.com/openai/codex/blob/main/docs/config.md`
- Config reference referenced by upstream docs: `https://developers.openai.com/codex/config-reference`

Key observations:

- Codex config uses `~/.codex/config.toml`.
- The generated JSON schema lives at `codex-rs/core/config.schema.json`.
- The schema exposes model, provider, reasoning effort, reasoning summary, verbosity, plan-mode effort, sandbox, service tier, tools, web search, hooks, history, profiles, feature flags, and SQLite state-related configuration.
- `plan_mode_reasoning_effort` can explicitly override Plan-mode effort; `none` is an explicit no-reasoning value rather than “inherit global default.”
- Codex has many feature flags. V4 should schema-check and preset-expand them rather than copy-paste feature lists across profiles.

### Claude Code

- SchemaStore schema: `https://www.schemastore.org/claude-code-settings.json`
- Docs referenced by schema: `https://code.claude.com/docs/en/settings`, `https://code.claude.com/docs/en/hooks`, `https://code.claude.com/docs/en/model-config`, `https://code.claude.com/docs/en/permissions`

Key observations:

- Claude Code settings include permissions, model, available models, model overrides, `effortLevel`, `fastMode`, environment variables, hooks, status line, plugins, MCP restrictions, and managed-settings controls.
- `effortLevel` supports low/medium/high/xhigh/max at the settings layer.
- Opus 4.7 supports xhigh; Opus 4.6 and Sonnet 4.6 support low/medium/high/max with xhigh falling back to high.
- Claude hooks include rich events such as `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`, `PreCompact`, `PostCompact`, and more.

### OpenCode

- Schema: `https://opencode.ai/config.json`
- Docs: `https://opencode.ai/docs/config/`
- Permissions docs: `https://opencode.ai/docs/permissions`
- Agents docs: `https://opencode.ai/docs/agents/`

Key observations:

- OpenCode supports JSON and JSONC config.
- Config locations are merged; project config can override global config, while managed settings have highest priority.
- It supports `provider`, `model`, `small_model`, `agent`, `default_agent`, `command`, `skills`, `permission`, `compaction`, `watcher`, `mcp`, `plugin`, and other keys.
- OpenCode distinguishes primary agents and subagents. `default_agent` must be a primary agent.
- OpenCode permissions resolve to `allow`, `ask`, or `deny`; current docs prefer `permission` over deprecated `tools` booleans.

## Third-party integrations

### Caveman

Repository:

- `https://github.com/juliusbrussee/caveman`

Key observations:

- Caveman is a Claude Code skill/plugin and Codex plugin intended to reduce output tokens with terse “caveman” style.
- The README claims large output-token savings and provides modes such as lite/full/ultra and related skills/commands.
- It supports multiple agent ecosystems, with auto-activation varying by provider.

OAL v4 recommendation:

- Integrate Caveman as an optional output-token policy layer.
- Do not use it as a universal reasoning or prompt layer.
- Never apply it to code, commands, JSON/TOML/YAML, exact errors, or security findings.

### Taste Skill

Repository:

- `https://github.com/leonxlnx/taste-skill`

Key observations:

- Taste Skill is a portable Agent Skills collection for frontend taste, layout, typography, motion, spacing, image-to-code, redesign, and brand/image generation workflows.
- Skills include `taste-skill`, `gpt-taste`, `image-to-code-skill`, `redesign-skill`, `soft-skill`, `output-skill`, `minimalist-skill`, `brutalist-skill`, `stitch-skill`, image-generation skills, and `brandkit`.

OAL v4 recommendation:

- Integrate Taste Skill under Apollo/Aphrodite UI/design routes.
- Do not make it global.
- Disable it for backend, security, test, and structured-output routes unless user explicitly invokes it.

## Key v3 source observations

### Agent prompts

- Athena is a strong architecture/planning prompt with evidence gate and direct assessment.
- Hephaestus is a strong implementation prompt with no TODO/stub rules, no git commit, blocker contract, and minimal-edit discipline.
- Hermes is a strong source-citation prompt.
- Odysseus is a coordinator prompt that forbids direct file modification.

The prompt weakness is less about individual prose and more about source graph inconsistency: prompts can contradict contracts, tools, or provider renderers.

### Current model routing

- Current subscription code has Codex plans for `go`, `plus`, `pro-5`, and `pro-20`.
- Current Plus plan uses `xhigh` in several places; this is too expensive for deficit-prone users.
- Current Pro 5x and Pro 20x are very similar in default models and efforts; Pro 20x should primarily increase concurrency/escalation budget, not blanket default effort.
- Current Claude plan code references older Opus 4.6 variants and should be updated for Opus 4.7 while avoiding `[1m]` unless needed.

### Current Codex config

- Uses `model_reasoning_summary = "none"`, `model_verbosity = "low"`, `compact_prompt`, `history`, `memories`, and multiple profiles.
- Repeats feature flags in every profile.
- Has likely contradictions between `plugins=false` and plugin entries, and between `[memories]` settings and `memories=false` feature flags.

### Current provider hook mapping

- `subagent-route-context` supports Claude `SubagentStart`, Copilot fallback events, and OpenCode `tool.execute.before` for task, but declares Codex unsupported because Codex lacks a Claude-style SubagentStart hook event.

This is exactly the kind of provider-native difference v4 must represent explicitly.

## Final research conclusion

V4 should be implemented as a small compiler core with strict validation and provider adapters. It should not be a broader prompt pack, not a harness, and not a new runtime framework. The highest leverage changes are:

1. typed source graph;
2. contract/tool/model validation;
3. provider-native adapters;
4. schema-derived config validation;
5. manifest-aware deploy lifecycle;
6. runtime policy parity tests;
7. budget-aware model routing;
8. scoped third-party skill integrations.

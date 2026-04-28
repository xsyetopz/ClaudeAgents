# OpenAgentLayer architecture

## Thesis

OpenAgentLayer is a native agent-layer compiler and installer.

OAL does not replace Codex, Claude Code, OpenCode, Kilo, Windsurf, Cline, Gemini CLI, or Cursor. OAL renders each tool's native surfaces from one canonical source model:

- instructions
- agents and subagents
- skills
- commands and workflows
- rules and memories
- hooks
- MCP configuration
- model routes
- provider sync records
- tool probes and install plans

OAL sits above existing tools. It does not reinvent their agent runners, hook engines, memory systems, or package managers. If a platform supports a feature natively, OAL renders into that feature. If a platform does not support a feature, OAL records that gap explicitly.

OAL also validates generated platform configuration against upstream schemas when available. Codex, Claude Code, and OpenCode configs are schema-backed targets, not freeform text output.

## Runtime shape

OAL runtime is Bun + TypeScript + JSON.

- Bun executes OAL scripts and CLIs.
- TypeScript owns adapters, renderers, probes, installer logic, and checks.
- JSON is canonical source.
- JSON Schema validates source files.
- TOML, Markdown, YAML, shell, or JSONC appear only as generated platform output when target tools require them.

Rust and Go are not OAL runtime foundations. Rust can appear only as an upstream provider dependency installed by that provider's own upstream path. Node appears only as fallback when an upstream CLI requires Node.

## Source model

Canonical source lives under `source/`:

- `source/oal.json` declares project identity, enabled platforms, provider policy, and route defaults.
- `source/agents/*.json` declares Greek-gods agents and subagents.
- `source/skills/*.json` declares local skill wrappers and upstream skill bindings.
- `source/commands/*.json` declares command intent and route kind.
- `source/workflows/*.json` declares workflow intent for platforms with native workflows.
- `source/hooks/*.json` declares category-first hook policies.
- `source/platforms/*.json` declares native surface capabilities by platform.
- `source/platforms/<platform>/config.json` declares schema-backed config policy for configurable tools.
- `source/providers/*.json` declares upstream sync mode, probe, overlay, and provenance.
- `source/tools/*.json` declares host tool probes and install plans.
- `source/routes/*.json` declares model route choices.
- `source/schema/*.schema.json` validates all source files.
- `source/schemas/upstream.json` records upstream config schemas, cache paths, and SHA-256 pins.

Generated trees are disposable. Source files are the authority.

## Greek-gods agent model

Greek-gods names are canonical:

| Agent        | OAL role                                                |
| ------------ | ------------------------------------------------------- |
| `athena`     | architecture, planning, decision-complete specs         |
| `hermes`     | research, tracing, evidence packets                     |
| `hephaestus` | implementation, refactors, production changes           |
| `nemesis`    | review, risk audit, regression detection                |
| `atalanta`   | tests, validation, failure reproduction                 |
| `calliope`   | documentation, changelogs, handoffs                     |
| `odysseus`   | orchestration, multi-step sequencing, handoff synthesis |

Each platform adapter keeps these names. The adapter changes only representation:

- Codex gets subagent definitions where supported.
- Claude Code gets `.claude/agents/*.md`.
- OpenCode gets native agent config.
- Kilo gets mode/agent surfaces where supported.
- Other tools get their closest native agent or instruction surface.

No platform receives renamed aliases. If platform constraints require a display label, display label may be title-cased, but internal route id remains Greek-gods lowercase.

## Platform adapter contract

Each platform adapter implements six operations:

1. `detect`: determine whether tool exists and whether project/global roots are writable.
2. `capabilities`: report native support for instructions, agents, skills, commands, workflows, hooks, MCP, memory, rules, and model config.
3. `render`: emit native files from source JSON.
4. `install`: place rendered files in platform locations without overwriting unmanaged user files.
5. `doctor`: check generated files, probes, hook wiring, model routes, provider availability, and upstream schema validation.
6. `explain`: show why each generated file exists and which source record produced it.

Adapters do not invent parity. Unsupported features stay explicit.

## Provider model

Providers use upstream-first policy:

| Provider         | Required | Sync mode           | Default         |
| ---------------- | -------- | ------------------- | --------------- |
| `caveman`        | yes      | git-exact           | sync-only       |
| `rtk`            | yes      | external-binary     | external-binary |
| `bmad-method`    | yes      | git-extract         | sync-extract    |
| `taste-skill`    | yes      | git-exact           | sync-only       |
| `context7`       | no       | optional-cli        | cli-only        |
| `playwright-cli` | no       | optional-cli        | cli-only        |
| `deepwiki`       | no       | optional-cli        | cli-only        |

Required upstream content lives in `providers/<name>/upstream` as a git-controlled checkout. OAL additions live in `providers/<name>/overlay`. OAL does not hand-recreate upstream packages.

Provider sync is git-based:

1. clone when upstream checkout is missing
2. reject dirty upstream checkout
3. fetch configured remote
4. check out configured branch/ref
5. record current commit SHA
6. extract files only for `git-extract` providers
7. leave overlay untouched

RTK is external binary:

- macOS install: `brew install rtk-ai/tap/rtk`
- probes: `rtk --version`, `rtk gain`, `rtk rewrite <command>`
- policy: use RTK where capability exists; use proxy path when rewrite cannot safely classify command.

## Hook system

Hooks are category-first, then platform-mapped.

OAL canonical hook categories:

- `session-start`
- `session-end`
- `prompt-submit`
- `tool-pre`
- `tool-post`
- `tool-fail`
- `tool-batch`
- `permission`
- `agent-start`
- `agent-stop`
- `task-created`
- `task-completed`
- `compact-pre`
- `compact-post`
- `workspace`
- `notification`

Hook names use category prefix:

- `tool-pre-shell-rtk`
- `tool-pre-destructive-command`
- `tool-post-write-quality`
- `prompt-submit-contract`
- `agent-start-route-context`
- `session-start-env`

Each hook source record includes:

- canonical category
- supported platform events
- input adapter
- output adapter
- deny/continue/context behavior
- failure mode
- unsupported-platform reason

OAL keeps the v3 idea that hook behavior is policy data plus tests. OAL removes stale hook names, undocumented pseudo-hooks, and cross-platform pretend parity.

## Commands and workflows

Commands are short, practical, route-backed actions:

- `check`
- `plan`
- `research`
- `implement`
- `debug`
- `review`
- `ship`
- `sync`
- `doctor`

No aliases. Verbose variants are not generated.

Commands and workflows share intent records but render differently:

- Claude Code custom commands render command Markdown.
- OpenCode commands render native command entries.
- Kilo and Cline workflows render workflow files where supported.
- Cursor and Windsurf render rules/workflows only where their native surfaces support it.

## CLI

OAL CLI names are direct:

- `oal install`
- `oal sync`
- `oal render`
- `oal check`
- `oal doctor`
- `oal doctor tools`
- `oal doctor hooks codex`
- `oal doctor hooks claude`
- `oal doctor hooks opencode`
- `oal provider sync <provider>`
- `oal route <route>`

Tool binary names stay literal:

- `codex`
- `claude`
- `opencode`

## Model routing

OAL model routes are platform-scoped. No model aliasing.

Subscription profiles are platform-scoped too.

Codex consumer profiles:

- `plus` default
- `pro-5`
- `pro-20`

Claude Code consumer profiles:

- `max-5` default
- `max-20`

Claude `plus` is rejected for Claude Code consumer profile selection.

Codex allowed runtime set:

- `gpt-5.5`
- `gpt-5.3-codex`
- `gpt-5.4-mini`

Claude Code allowed runtime set:

- `claude-sonnet-4-6`
- `claude-haiku-4-5`
- `claude-opus-4-7`

OpenCode free fallback set:

- `opencode/nemotron-3-super-free`
- `opencode/minimax-m2.5-free`
- `opencode/ling-2.6-flash-free`
- `opencode/hy3-preview-free`
- `opencode/big-pickle`

## Install strategy

Installer probes host first. It does not assume package managers.

- macOS: check Homebrew, install Homebrew only when missing, then install packages through Homebrew when applicable.
- Linux: detect apt, dnf, pacman, apk, or zypper before selecting install command.
- Bun: required primary runtime.
- Node: fallback for upstream CLIs that require Node.
- Rust: only when an upstream provider path requires it.
- RTK: required external binary.

Installers do not write opaque magic. Every managed file must be explainable by `oal doctor`.

## Config validation

OAL validates configurable platforms in two layers:

1. upstream schema validation
2. OAL policy validation

Upstream schema validation checks generated config syntax and legal keys:

- Codex: `https://developers.openai.com/codex/config-schema.json`
- Claude Code: `https://www.schemastore.org/claude-code-settings.json`
- OpenCode: `https://opencode.ai/config.json`

OAL policy validation enforces defaults that schemas allow but OAL rejects:

- Codex Fast mode stays disabled.
- Codex unified exec stays disabled through both current and legacy keys.
- Codex uses `multi_agent_v2`, not legacy `multi_agent`.
- Codex subscription profile is `plus`, `pro-5`, or `pro-20`.
- Claude Code subscription profile is `max-5` or `max-20`.
- OpenCode agent and model routes stay inside OAL route records.

## What OAL keeps from v3

OAL keeps:

- single source catalog
- generation from source
- install validation
- route contracts
- pinned upstream provider model
- explicit unsupported platform records
- hook policy tests
- agent/subagent role separation

OAL removes:

- giant branch-heavy generator shape
- stale surfaces
- compatibility ghosts
- bundled RTK
- fake hook parity
- verbose command names
- hand-maintained generated output

# Platform adapters

## Contract

Each adapter implements:

- `detect`
- `capabilities`
- `render`
- `install`
- `doctor`
- `explain`

Adapters are TypeScript modules. They consume validated JSON source. They never read generated output as source.

## `detect`

`detect` checks:

- binary exists
- version command works where available
- project root exists
- global config root exists when needed
- managed output directories are writable

`detect` does not install packages. Install belongs to installer/tool layer.

## `capabilities`

`capabilities` returns platform native support:

- instructions
- agents
- subagents
- skills
- commands
- workflows
- hooks
- rules
- memories
- MCP
- model routes
- permissions

Each capability is:

- `supported`
- `unsupported`
- `manual`
- `unknown`

`unknown` blocks rendering for that surface.

## `render`

`render` emits native platform files:

- Markdown for instruction surfaces
- JSON/JSONC/TOML for platform config
- command/workflow files for native command systems
- hook config/scripts for supported hook events
- skill directories for supported skill systems

Generated files include an OAL managed marker when target format allows comments. Commentless formats use sidecar manifest.

Renderer core always writes:

- `.oal/render-manifest.json`
- `.oal/managed-files.json`
- `.oal/explain-map.json`

`render-manifest.json` fields:

- `generated_at`
- `generator`
- `files[]`

Each file entry contains:

- `path`
- `sha256`
- `sources[]`

`managed-files.json` fields:

- `managed_by`
- `files[]`

`files[]` includes rendered payload files and `.oal/*` sidecars so install and uninstall can manage the whole generated tree. `render-manifest.json` records payload files only, because self-hashing the manifest would make the manifest unstable.

`explain-map.json` maps each generated output path to:

- `sha256`
- `sources[]`

Generated file paths in these manifests are relative to render output root. Source paths are relative to repo root. These manifests are sidecars, not source input.

## `install`

`install` copies rendered files to platform roots.

Rules:

- do not overwrite unmanaged user files
- keep managed manifest
- preserve user-owned config keys
- fail with exact path and reason when merge cannot be safe

## `doctor`

`doctor` checks:

- binary probe
- config parse
- upstream schema validation for generated config
- OAL config policy validation
- managed file presence
- generated manifest consistency
- hook event mapping
- model id validity
- provider availability
- tool probes required by platform

Doctor commands:

- `oal doctor hooks codex`
- `oal doctor hooks claude`
- `oal doctor hooks opencode`
- `oal doctor tools`

## `explain`

`explain` maps generated file back to source:

- source file
- source id
- renderer
- platform capability
- provider provenance when applicable

## Adapter list

| Adapter     | Binary           | Main surfaces                                                    |
| ----------- | ---------------- | ---------------------------------------------------------------- |
| Codex       | `codex`          | `AGENTS.md`, skills, subagents, hooks, config                    |
| Claude Code | `claude`         | `CLAUDE.md`, `.claude/agents`, skills, commands, hooks, settings |
| OpenCode    | `opencode`       | config, agents, skills, commands, permissions                    |
| Kilo        | platform binary  | rules, workflows, modes/agents, skills, MCP                      |
| Windsurf    | editor/app       | rules, workflows, memories, MCP, hooks                           |
| Cline       | editor extension | rules, workflows, hooks, ignore, MCP                             |
| Gemini CLI  | `gemini`         | `GEMINI.md`, settings, extensions, hooks                         |
| Cursor      | editor/app       | `.cursor/rules/*.mdc`, MCP, context rules                        |

## Unsupported feature handling

If source requests unsupported native surface:

1. render does not create fake file
2. doctor reports unsupported surface
3. explain names missing platform capability
4. route falls back only if source explicitly provides fallback target

No silent degradation.

## Config schema handling

Adapters with upstream schemas validate generated config before install:

- Codex validates generated `config.toml` against `https://developers.openai.com/codex/config-schema.json`.
- Claude Code validates generated `settings.json` against `https://www.schemastore.org/claude-code-settings.json`.
- OpenCode validates generated `opencode.json` against `https://opencode.ai/config.json`.

Adapters also enforce OAL policies:

- Codex Fast mode disabled.
- Codex unified exec disabled.
- Codex legacy unified exec disabled.
- Codex profile is `plus`, `pro-5`, or `pro-20`.
- Claude Code profile is `max-5` or `max-20`.
- OpenCode route models match OAL source.

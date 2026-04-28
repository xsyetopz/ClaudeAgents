# Source schema

## Canonical format

OAL source is JSON. JSON Schema validates all authored source files.

TOML is not canonical. TOML is generated only when a target platform requires TOML.

## Root layout

```text
source/
  oal.json
  schema/
  agents/
  skills/
  commands/
  workflows/
  hooks/
  platforms/
  providers/
  tools/
  routes/
  schemas/
```

## `source/oal.json`

Required fields:

- `name`
- `version`
- `platforms`
- `providers`
- `routes`
- `tools`

Rules:

- `name` must be `OpenAgentLayer`.
- CLI id must be `oal`.
- enabled platform ids must match directories under `source/platforms/`.
- no generated file path may be used as source input.

## Agent records

Path: `source/agents/<agent>.json`

Required fields:

- `id`
- `display_name`
- `role`
- `model_route`
- `platforms`

Allowed ids:

- `athena`
- `hermes`
- `hephaestus`
- `nemesis`
- `atalanta`
- `calliope`
- `odysseus`

Rules:

- no aliases
- no renamed role ids
- display names may be title-cased only
- platform adapters keep canonical id

## Skill records

Path: `source/skills/<skill>.json`

Required fields:

- `id`
- `description`
- `source`
- `provider` when `source` is `provider`

Allowed `source`:

- `local`
- `provider`

Rules:

- upstream skills include provider id and upstream path
- wrapper skills may add OAL routing metadata
- upstream body is not manually rewritten

## Command records

Path: `source/commands/<command>.json`

Required fields:

- `id`
- `description`
- `route`

Allowed command ids:

- `check`
- `plan`
- `research`
- `implement`
- `debug`
- `review`
- `ship`
- `sync`
- `doctor`

Allowed `kind`:

- `readonly`
- `edit-required`
- `execution-required`

Rules:

- no aliases
- command name must be short
- platform renderer may add native slash-command prefix if platform requires it

## Workflow records

Path: `source/workflows/<workflow>.json`

Required fields:

- `id`
- `description`
- `steps`

Rules:

- workflows render only on platforms with native workflow support
- workflow records do not become fake hooks
- workflow records do not become fake agents

## Hook records

Path: `source/hooks/<hook>.json`

Required fields:

- `id`
- `category`
- `description`
- `supported_platforms`
- `unsupported_platforms`

Allowed categories:

- `session-start`
- `prompt-submit`
- `tool-pre`
- `tool-post`
- `tool-fail`
- `agent-start`
- `compact-pre`

Rules:

- `id` must start with category prefix
- unsupported platform list is required
- unsupported reason is required
- hook cannot claim platform support without documented event mapping

## Platform records

Path: `source/platforms/<platform>/platform.json` for native capability records.

Path: `source/platforms/<platform>/config.json` for schema-backed config policy records.

Required fields:

- `id`
- `native_surfaces`
- `roots`
- `renderers`

Rules:

- binary names are literal: `codex`, `claude`, `opencode`
- platform id must match directory name
- native surfaces must be explicit booleans or documented objects
- unsupported surfaces must not render files
- generated configs must validate against declared upstream schemas where listed
- OAL policy checks may reject schema-valid config

## Upstream schema records

Path: `source/schemas/upstream.json`

Required fields:

- `fetched_at`
- `schemas`

Each schema entry requires:

- `url`
- `local_cache`
- `sha256`
- `validates`

Rules:

- upstream schemas are fetched and hash-checked before generated config validation
- generated config cannot skip schema validation when platform schema exists
- stale cache hash is a check failure

## Provider records

Path: `source/providers/<provider>.json`

Required fields:

- `id`
- `required`
- `sync_mode`
- `default`
- `probe`
- `provenance`
- `git`

Rules:

- required providers must have deterministic sync path
- upstream path is a git-controlled checkout
- overlay path is OAL-owned and never modified by provider sync
- optional CLI providers are not base install blockers

Git fields:

- `repo_url`
- `remote`
- `branch`
- `locked_ref`
- `sync_strategy`

Allowed sync modes:

- `git-exact`
- `git-extract`
- `external-binary`
- `optional-cli`

Rules:

- `git-exact`, `git-extract`, and `external-binary` providers use `clone-fetch-checkout`
- `optional-cli` providers may use `probe-only`
- sync records current commit SHA
- dirty upstream checkout blocks sync
- extraction records repo URL, branch/ref, commit SHA, upstream path, and transform description

## Tool records

Path: `source/tools/<tool>.json`

Required fields:

- `id`
- `purpose`
- `required`
- `probe`
- `use_policy`
- `install`

Rules:

- Linux install records must support package-manager detection
- macOS records check Homebrew first where applicable
- Bun is primary runtime
- Node is fallback only
- Rust is upstream-dependency only

## Route records

Path: `source/routes/<platform>.json`

Required fields:

- `platform`
- `models`
- `routes`

Rules:

- Codex model ids must stay inside allowed set
- OpenCode route order must match source record exactly
- Claude Code model ids must stay inside allowed set

## Subscription records

Path: `source/routes/subscriptions.json`

Required fields per platform:

- `default`
- `allowed`
- `blocked`
- `source_urls`

Rules:

- Codex default is `plus`
- Codex allowed consumer profiles are `plus`, `pro-5`, `pro-20`
- Claude Code default is `max-5`
- Claude Code allowed consumer profiles are `max-5`, `max-20`
- Claude Code blocks `plus`

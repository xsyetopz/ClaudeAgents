# Source, Render, Deploy Contract

OAL separates authored source, rendered artifacts, installed state, and manifest
ownership.

## Source Graph

`source/` records describe OAL intent:

- agents
- skills
- routes
- tools
- hooks
- product prompt contracts
- model plans

Source records must name supported providers. A renderer may emit only provider
surfaces that exist and are validated.

## Rendering

Renderers convert OAL intent into provider-native files:

- Codex TOML, `AGENTS.md`, skills, hooks, runtime files
- Claude settings JSON, agents, commands, skills, hooks, `CLAUDE.md`
- OpenCode JSONC, agents, commands, tools, plugin files, instructions, hooks

Generated output must include provenance that connects artifacts back to source
records.

## Deploy

Deploy must plan writes before applying, preserve user-owned content, merge
structured config where possible, write manifest ownership records, and support
dry-run output for review.

## Uninstall

Uninstall must act only on manifest-owned material:

- files owned by OAL
- marked blocks owned by OAL
- structured config keys owned by OAL

User-owned files and config keys stay in place.

## Inspect

`oal inspect` is the shared introspection surface for capabilities, manifests,
generated inputs, RTK guidance, command policy guidance, and release witness
data.

Provider-native tools and MCP servers should call this shared surface instead of
duplicating inspection logic.

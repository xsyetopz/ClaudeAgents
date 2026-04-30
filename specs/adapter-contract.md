# Adapter contract

Purpose: define how source graph becomes native surface artifacts.

Authority: normative.

## Adapter interface

Each adapter must implement:

- `id`
- `surface`
- `capabilities`
- `supports(record)`
- `render(record, context)`
- `renderBundle(graph, context)`
- `validateBundle(bundle)`
- `installPlan(bundle, options)`

Current package API names:

- `SurfaceAdapter`
- `AdapterContext`
- `AdapterBundle`
- `AdapterArtifact`
- `AdapterCapability`
- `AdapterRenderResult`
- `InstallPlan`
- `InstallScope`
- `UnsupportedCapabilityDiagnostic`

## Adapter rules

- Adapter output must be deterministic.
- Adapter output must be native to the target surface.
- Adapter may omit unsupported capabilities only when validation reports the omission.
- Adapter must expose unsupported policy mappings in generated diagnostics.
- Adapter must not mutate source graph.
- Adapter must not read global user config during render.
- Adapter-generated config must pass the surface-specific allowlist from [surface config contract](surface-config-contract.md).

## Required adapters

- Codex adapter
- Claude adapter
- OpenCode adapter

## Deferred adapters

- Additional adapters require a surface-config study and allowlist contract before they can become required.
- No adapter may be listed as required until `surface-config-contract.md` covers its generated keys and default profile.

## Surface bundle contents

Each surface bundle may contain:

- agents;
- skills;
- commands;
- instructions;
- hooks;
- config fragments;
- plugin files;
- installer metadata;
- validation metadata.

Every artifact must include:

- target `surface`;
- artifact `kind`;
- stable relative `path`;
- UTF-8 `content`;
- owning `sourceRecordIds`.

Current native artifact targets:

- Codex: `.codex/openagentlayer/config.toml`, generated plugin manifest, skill-backed command routes, skill files, agent files, guidance files, policy metadata.
- Claude Code: `.claude/settings.json`, `.claude/agents/*.md`, `.claude/skills/*/SKILL.md`, skill-backed command routes, guidance files, policy metadata.
- OpenCode: `opencode.json`, `.opencode/plugins/openagentlayer.ts`, `.opencode/commands/*.md`, `.opencode/skills/*/SKILL.md`, agent files, guidance files, policy metadata.

Policy runtime artifacts:

- Codex config emits hook entries pointing at `.codex/openagentlayer/runtime/*.mjs`.
- Claude settings emits hook entries pointing at `.claude/openagentlayer/runtime/*.mjs`.
- OpenCode plugin emits event handlers that call `.opencode/openagentlayer/runtime/*.mjs`.

## Links

- [OpenAgentLayer v4](openagentlayer-v4.md)

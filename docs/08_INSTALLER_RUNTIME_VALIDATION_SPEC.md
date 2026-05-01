# 08 — Installer, Runtime, Validation, and Observability Specification

## Installer principle

Installation is a manifest-aware write operation, not a copy script. V4 must be able to preview, apply, verify, rollback, and uninstall every artifact it owns.

## Install scopes

| Scope          | Meaning                         | Example                                                                  |
| -------------- | ------------------------------- | ------------------------------------------------------------------------ |
| project        | Writes inside current repo      | `.codex/config.toml`, `.claude/settings.json`, `opencode.json`           |
| user           | Writes to user config           | `~/.codex`, `~/.claude`, `~/.config/opencode`                            |
| managed        | Admin-managed enterprise config | `/etc/opencode`, `/Library/Application Support`, managed Claude settings |
| generated-only | Writes generated folder only    | `generated/codex`                                                        |

V4 should default to project scope for safety.

## Install modes

### `full-file`

OAL owns the entire file. Used for generated agents, generated skills, runtime scripts, and manifest files.

Manifest entry:

```json
{
  "path": ".codex/openagentlayer/runtime/completion-gate.mjs",
  "installMode": "full-file",
  "sha256": "...",
  "sourceId": "policy:completion-gate"
}
```

### `marked-text-block`

OAL owns a fenced block inside a human-editable text file.

```markdown
<!-- OAL:BEGIN codex-project-instructions sha256=... -->
...
<!-- OAL:END codex-project-instructions -->
```

Used for `AGENTS.md`, `CLAUDE.md`, and shared instruction files.

### `structured-object`

OAL owns selected JSON/TOML object paths.

```json
{
  "path": ".claude/settings.json",
  "installMode": "structured-object",
  "managedValues": {
    "hooks.Stop": "sha256:...",
    "permissions.deny": "sha256:..."
  }
}
```

Used for `.claude/settings.json`, `.codex/config.toml`, and `opencode.json`.

### `reference-copy`

Used for pinned third-party integration files. Requires repository, ref, license, and source path.

### `user-owned`

OAL may read the value for diagnostics but must not overwrite it.

## Manifest format

```json
{
  "version": 1,
  "surface": "codex",
  "scope": "project",
  "createdAt": "2026-05-01T00:00:00Z",
  "oalVersion": "4.0.0",
  "modelPlan": "codex-pro-5-efficiency",
  "entries": [
    {
      "path": ".codex/config.toml",
      "installMode": "structured-object",
      "sha256": "...",
      "sourceIds": ["surface:codex", "model-plan:codex-pro-5-efficiency"]
    }
  ]
}
```

Manifests live under:

```text
.oal/manifest/codex-project.json
.oal/manifest/claude-project.json
.oal/manifest/opencode-project.json
```

## Dry-run output

```text
OAL install preview: codex project

CREATE .codex/agents/hephaestus.toml
UPDATE .codex/config.toml
  + profiles.oal-main.model = "gpt-5.5"
  + profiles.oal-main.model_reasoning_effort = "medium"
  ! existing profiles.openagentsbtw detected; will preserve unless --migrate-v3
CONFLICT AGENTS.md
  OAL block exists but hash differs and was edited by user.
  Action: skip unless --force-block-refresh
```

## Conflict policy

1. Never overwrite user-owned keys.
2. Never overwrite a modified OAL block without explicit `--force` or migration mode.
3. Structured merges must preserve unknown keys.
4. Removal only affects manifest-owned entries.
5. Uninstall must leave a report of preserved user edits and orphaned unknown files.

## Runtime policy scripts

Runtime scripts should be generated or copied as self-contained files. They must not import from source tree paths that will not exist after install.

Every runtime policy has:

```text
source/policies/<id>/policy.toml
source/policies/<id>/runtime.mjs
source/policies/<id>/fixtures/*.json
packages/runtime/__tests__/<id>.test.ts
```

## Headless E2E tests

### Codex

Required smoke tests:

1. Parse generated `.codex/config.toml`.
2. Validate schema allowlist.
3. Start headless Codex if available in CI/local environment.
4. Run route no-op prompts for explore, plan, implement dry-run, review, test.
5. Verify policy scripts receive fixture input and return expected protocol.
6. Verify profile selection produces expected model/effort.

### Claude Code

Required smoke tests:

1. Parse generated `.claude/settings.json`.
2. Validate against SchemaStore.
3. Verify hooks events exist and commands resolve.
4. Verify agent Markdown frontmatter.
5. Verify permission mode and OAL contracts align.
6. If Claude CLI is available, run a non-mutating headless start/check.

### OpenCode

Required smoke tests:

1. Parse `opencode.json` or JSONC.
2. Validate against `https://opencode.ai/config.json`.
3. Verify exactly one primary `default_agent`.
4. Verify commands reference valid agents.
5. Verify permissions use current `permission` field.
6. If OpenCode CLI is available, run `opencode debug config` or equivalent configuration check.

## Eval harness

V4 needs a lightweight task benchmark. It does not need to evaluate model intelligence perfectly; it needs to catch broken routing and policy regressions.

Suggested suites:

### `smoke`

- render all surfaces;
- parse all artifacts;
- run all policy scripts with fixtures;
- verify install manifests;
- no model-plan gaps.

### `routes`

- explore a small fixture repo;
- plan a multi-file change;
- implement a one-file bug fix;
- review a seeded vulnerability;
- run tests and detect failure;
- write a changelog entry.

### `efficiency`

- compare output length with and without Caveman-lite;
- measure RTK compression only on safe prose;
- detect xhigh/max usage outside break-glass;
- track tool-output reinjection volume.

### `migration`

- migrate v3 config artifacts into v4 source graph;
- preserve user edits;
- remove old `openagentsbtw` managed blocks;
- rollback after simulated failed install.

## Observability

Local telemetry should be opt-in and file-based. No remote collection is required.

Files:

```text
.oal/logs/render.jsonl
.oal/logs/install.jsonl
.oal/logs/runtime-policy.jsonl
.oal/usage/ledger.jsonl
```

Example policy log:

```json
{
  "timestamp": "2026-05-01T00:00:00Z",
  "surface": "claude",
  "policy": "destructive-command-guard",
  "event": "PreToolUse",
  "action": "deny",
  "route": "implement"
}
```

## Security rules

1. Never read `.env`, private keys, token stores, or secret paths unless explicit policy allows and user confirms.
2. Never log secret-like values.
3. Secret scanners must redact matched content.
4. Installer must not execute third-party scripts during render.
5. Third-party skills are copied only from pinned refs or explicit local sync commands.
6. Managed configs should be opt-in and clearly separated from user/project installs.

## Release gate

Before v4 release:

```bash
oal check --strict
oal render --surface all --plan all --out generated
oal diff --expect-clean
oal install --surface all --scope project --dry-run
oal eval --suite smoke --surface all
oal eval --suite routes --surface codex
oal eval --suite migration
```

Release fails if:

- any renderer invents defaults;
- any contract/tool mismatch remains;
- any unsupported provider hook is rendered as supported;
- any generated config fails schema validation;
- any runtime script imports from the source tree after install;
- any third-party integration lacks provenance;
- uninstall cannot remove manifest-owned files cleanly.

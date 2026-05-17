# Phase 01 Design — Olympus Extension System

## Status

Design only. This defines the PiCodingAgent-first extension/package model for later implementation.

## Pi resources Olympus understands

| Resource | Pi source | Olympus classification | Initial policy |
| --- | --- | --- | --- |
| Skill | `skills/**/SKILL.md`, package `pi.skills`, settings `skills` | Passive-but-untrusted | Inspect, hash, signage; project-local mirror install allowed later |
| Prompt template | `prompts/*.md`, package `pi.prompts`, settings `prompts` | Passive-but-untrusted | Inspect, hash, signage; project-local mirror install allowed later |
| Theme | `themes/*.json`, package `pi.themes`, settings `themes` | Passive static | Inspect, hash, schema warnings; project-local mirror install allowed later |
| Extension | `extensions/*.ts`, `extensions/*/index.ts`, package `pi.extensions`, settings `extensions` | Executable | Inspect/hash only until explicit trust + sandbox exists |
| Tool/provider/hook behavior | Extension code using Pi APIs | Executable capability | Must be declared by Olympus-owned extensions; third-party inferred conservatively |
| Lifecycle/package script | `preinstall`, `install`, `postinstall`, package scripts likely to execute | Executable | No execution during inspect/evaluate |

## Discovery rules

Olympus must inspect both declared and conventional Pi package shapes:

1. Read `package.json` without running scripts.
2. Read `package.json.pi.extensions`, `pi.skills`, `pi.prompts`, and `pi.themes` when present.
3. Discover conventional directories when manifest entries are absent or incomplete:
   - `extensions/` `.ts`/`.js` files and `*/index.ts`/`*/index.js`;
   - `skills/` directories containing `SKILL.md` and top-level skill Markdown where Pi allows it;
   - `prompts/` top-level Markdown files;
   - `themes/` JSON files.
4. Hash every discovered resource and support file included under a skill directory.
5. Report duplicate names, resource path collisions, malformed frontmatter/JSON, missing `package.json`, and unreadable files.

## Olympus-owned extension authoring model

Olympus-generated extensions are first-party project-local Pi extensions/packages. A generated extension must include:

- declared purpose and non-goals;
- Pi events subscribed to (`tool_call`, `input`, `resources_discover`, session events, etc.);
- commands/tools/flags/shortcuts registered;
- filesystem, network, process, and credential side effects;
- expected sandbox/broker capabilities;
- verification command or fixture;
- uninstall/disable instructions;
- source comments that identify generated Olympus ownership.

Recommended generated skeleton:

```text
.pi/olympus/extensions/<name>/
  package.json
  src/index.ts
  README.md
  olympus-extension.json
  test/fixtures/
```

During early implementation, generation may target `packages/olympus` fixtures first; project writes must wait for manifest-backed install logic.

## Extension event policy

Pi extension events are powerful policy points, not containment. Olympus may generate first-party extensions for:

- inspecting loaded commands/tools via Pi provenance (`sourceInfo`);
- showing Olympus trust/lock status in Pi UI;
- blocking known dangerous tool calls in trusted first-party mode;
- exposing `/olympus` commands that call the low-level CLI or shared library;
- adding context/handoff messages from Olympus state.

Olympus must not claim that a Pi extension alone safely contains untrusted third-party extension code. OS sandboxing remains the execution boundary.

## Third-party package evaluator

A package evaluation report must include:

- package name, version, source type, source path/ref, and resolved identity;
- `pi` manifest status and conventional resource discovery status;
- passive resource inventory with hashes;
- executable resource inventory with hashes;
- lifecycle/package scripts and dependency warnings;
- resource conflicts with existing project/global Pi resources when discoverable;
- signage: `PASSIVE`, `EXECUTABLE`, `UNSIGNED`, `LOCKED`, `HASH MISMATCH`, `GLOBAL WRITE`, etc.;
- decision field: `reject`, `inspect-more`, `trust-passive`, `trust-executable-deferred`, `install-passive`, `vendor`, or `fork`.

Blind install is forbidden. The evaluator may recommend installation only after it can explain why the package solves a concrete gap and how conflicts/uninstall are handled.

## Conflict policy

Conflicts are based on resource identity and Pi command surfaces, not package names alone.

- Skill name collisions: warn and prefer existing resource unless user explicitly disables/replaces through Olympus manifest-backed change.
- Prompt command collisions: warn because filename becomes slash command.
- Extension command collisions: high risk; Pi suffixes command names, but Olympus must report ambiguity.
- Tool override collisions: high risk; overriding built-ins or existing tools requires explicit executable trust.
- Theme name collisions: warn and avoid overwriting user/project theme files.
- Package source deduplication: follow Pi identity rules where known, but record Olympus content digest separately.

## Package filtering and passive mirrors

For later project-local passive installs, Olympus uses a sanitized mirror package and `.pi/settings.json` object filters:

```json
{
  "source": "./olympus/packages/<package-id>/package",
  "extensions": [],
  "skills": ["+skills/foo/SKILL.md"],
  "prompts": ["+prompts/review.md"],
  "themes": ["+themes/dark.json"]
}
```

The mirror package must contain only approved passive resources and a sanitized `package.json` with `pi.extensions: []`.

## Non-goals for the initial extension system

- No third-party executable extension execution in Phase 02.
- No lifecycle script execution during inspect.
- No writes to `~/.pi` by default.
- No direct writes to `.pi/extensions`, `.pi/skills`, or `.pi/prompts` until manifest ownership exists.
- No OAL provider plugin sync or OAL route/agent compatibility.

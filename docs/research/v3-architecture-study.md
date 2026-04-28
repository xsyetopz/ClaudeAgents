# v3 architecture study

## What v3 was

v3 was not only a prompt pack. It was a generated control plane for agent tools.

The useful shape:

1. authored source catalog
2. generator
3. generated platform outputs
4. installer
5. tests that lock generated behavior

The important reference tree is `v3_to_be_removed/`. It is read-only evidence. OAL uses concepts from it, not code dependency.

## Working pieces

### Source catalog

v3 used `source/` as authored input. Agents, skills, commands, hooks, guidance, subscriptions, and provider maps lived as structured source. Generated outputs were not source of truth.

OAL keeps this. OAL changes source to strict JSON + JSON Schema.

### Greek-gods agents

v3 had stable role names:

- `athena`
- `hermes`
- `hephaestus`
- `nemesis`
- `atalanta`
- `calliope`
- `odysseus`

This made routing readable. It also made subagent dispatch understandable across tools. OAL keeps these names exactly.

### Route contracts

v3 separated route intent from text:

- read-only research
- planning
- implementation
- debugging
- review
- validation
- documentation

That worked because the route contract could be tested independently from generated prose. OAL keeps route records and short command names.

### Hook policy catalog

v3 hook behavior worked best when expressed as policy data:

- shell guard
- write quality
- route context
- session budget
- stop scanning
- RTK rewrite/proxy handling

The strong part was explicit mapping: if a platform lacked an equivalent event, the policy recorded unsupported state instead of pretending.

OAL keeps category-first hook policy records.

### Provider upstream model

v3 had useful upstream sync ideas, especially for external skills. OAL keeps upstream-first provider sync, but makes provenance directories explicit:

- `providers/<name>/upstream`
- `providers/<name>/overlay`

### Installer validation

v3 installer did more than copy files. It checked versions, merged managed configs, installed platform payloads, and validated outcomes.

OAL keeps post-install validation through `oal doctor`.

## Broken pieces

### Branch-heavy generator

v3 generator carried too many platform-specific branches in one path. That made maintenance expensive.

OAL splits renderer code by adapter:

- source loader
- schema validator
- platform adapter
- provider adapter
- install adapter
- doctor adapter

### Installer overreach

v3 installer tried to solve too many platform cases in one script. OAL keeps install capability, but makes every package-manager decision host-probed and explainable.

### Stale compatibility

v3 carried removed surfaces too long before cleanup. OAL does not keep compatibility ghosts.

Removed concept classes:

- retired IDE surfaces
- stale command names
- bundled provider code when upstream binary/package exists
- old prompt scaffolding
- unsupported model aliases

### Hook name drift

v3 hooks worked when behavior was clear, but names and placement could drift. OAL fixes naming by category prefix:

- `tool-pre-*`
- `tool-post-*`
- `prompt-submit-*`
- `session-start-*`
- `agent-start-*`

Prefix comes from hook category, not style preference.

### Generated prose duplication

v3 sometimes repeated similar text across platform outputs. OAL keeps source-first generation but separates concepts:

- instruction fragments
- platform native wrappers
- command intent
- workflow intent
- skill body
- hook behavior

## OAL carry-forward decisions

Keep:

- source catalog
- Greek-gods agents
- generated native outputs
- installer validation
- provider sync
- explicit unsupported records
- policy-backed hooks
- route-backed commands

Redesign:

- generator module boundaries
- install package-manager detection
- hook category naming
- provider provenance
- docs/specs as control plane

Remove:

- bundled RTK
- stale platform compatibility
- command aliases
- verbose command variants
- fake cross-platform parity
- Rust runtime path
- Go runtime path

## Evidence map

Use these v3 paths during implementation checks:

- `v3_to_be_removed/source/agents/`
- `v3_to_be_removed/source/skills/`
- `v3_to_be_removed/source/commands/`
- `v3_to_be_removed/source/hooks/policies/`
- `v3_to_be_removed/source/taste-skill-map.json`
- `v3_to_be_removed/scripts/generate.mjs`
- `v3_to_be_removed/scripts/install/`
- `v3_to_be_removed/tests/generated-artifacts.test.mjs`
- `v3_to_be_removed/tests/subscriptions.test.mjs`
- `v3_to_be_removed/tests/hook-policy-catalog.test.mjs`


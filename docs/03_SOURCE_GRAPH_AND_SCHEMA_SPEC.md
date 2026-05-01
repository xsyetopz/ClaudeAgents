# 03 — Source Graph and Schema Specification

## Goal

Create one typed source graph that every provider renderer consumes. No renderer should read ad hoc folders or infer behavior from old generated output. Every role, skill, route, hook, model assignment, and deploy artifact must exist as data before rendering starts.

## File format recommendation

Use JSON for machine records and Markdown for prompt/skill bodies.

Recommended default:

- `record.json` for source records that should parse without extra runtime
  dependencies in Node/Bun;
- `body.md` for prompt/skill content;
- `schema/*.json` for JSON Schema validation;
- generated `.d.ts` TypeScript types from schemas.

Provider renderers may emit TOML when the target tool requires it, such as
Codex config and agent files. OAL source records should not require a TOML
parser. Avoid JavaScript source records; they make static validation and schema
diffing weaker.

## Source layout

```text
source/
  agents/
    athena/
      agent.json
    hephaestus/
      agent.json
  skills/
    review/
      skill.json
      body.md
      reference/
      scripts/
  routes/
    implement.json
    review.json
    explore.json
  commands/
    implement.json
    review.json
  policies/
    protected-branch-confirm/
      policy.json
  model-plans/
    codex-plus.json
    codex-pro-5.json
    codex-pro-20.json
    claude-max-5.json
    claude-max-20.json
    opencode-default.json
  model-roles/
    implementation.json
    review.json
    utility.json
  model-aliases/
    codex.json
    claude.json
    opencode.json
  surfaces/
    codex.json
    claude.json
    opencode.json
  integrations/
    caveman.json
    taste-skill.json
  prompt-layers/
    global.md
    provider-codex.md
    provider-claude.md
    provider-opencode.md
```

## Core graph types

### Agent record

```json
{
  "id": "hephaestus",
  "kind": "agent",
  "modelRole": "implementation",
  "contract": "edit-required",
  "routes": ["implement", "refactor"],
  "skills": ["drive-tdd"],
  "render": {
    "targets": ["codex", "claude", "opencode"]
  },
  "permissions": {
    "read": true,
    "write": true,
    "shell": "ask",
    "network": "deny"
  }
}
```

Agent records are structural role metadata. They do not contain prompt prose or
provider-native file formatting. Codex agents render to `.toml`; Claude Code and
OpenCode agents render to Markdown with YAML frontmatter.

### Skill record

```json
{
  "id": "review",
  "kind": "skill",
  "body": "body.md",
  "activation": {
    "mode": "route-scoped",
    "routes": {
      "include": ["implement", "review"],
      "exclude": ["security"]
    }
  },
  "render": {
    "targets": ["codex", "claude", "opencode"]
  }
}
```

`skill.json` is machine-only source graph metadata. It should not carry prose
that belongs in `body.md`; provider-specific Codex, Claude Code, and OpenCode
`SKILL.md` artifacts are generated from the normalized graph and deployed
through the render/deploy pipeline.

### Route record

```json
{
  "id": "implement",
  "kind": "route",
  "owningAgent": "hephaestus",
  "contract": "edit-required"
}
```

Route records are structural dispatch contracts. Completion requirements,
commands, and provider command names can be layered later without embedding
prompt prose in route source.

### Command record

```json
{
  "id": "implement",
  "kind": "command",
  "route": "implement",
  "names": {
    "codex": "oal-implement",
    "claude": "oal:implement",
    "opencode": "oal-implement"
  }
}
```

Command records own provider invocation names. Command bodies remain thin
provider-rendered route entrypoints, not prompt-prose forks.

### Policy record

```json
{
  "id": "staged-secret-guard",
  "kind": "policy",
  "category": "safety",
  "render": {
    "enabled": false
  }
}
```

Policy records can exist before runtime implementations, but disabled policies
must not render provider hooks, scripts, or fake behavior.

### Model plan record

```json
{
  "id": "codex-pro-5-efficiency",
  "kind": "model-plan",
  "surface": "codex",
  "assignments": [
    {
      "modelRole": "orchestration",
      "modelAlias": "frontier",
      "effort": "medium"
    },
    {
      "modelRole": "implementation",
      "modelAlias": "implementation",
      "effort": "medium"
    },
    {
      "modelRole": "utility",
      "modelAlias": "utility",
      "effort": "low"
    }
  ]
}
```

Model plans use aliases at the source layer. Provider renderers resolve aliases
to concrete model IDs through plan-specific policy so source roles do not bake in
provider model names.

### Model alias record

```json
{
  "id": "codex",
  "kind": "model-aliases",
  "surface": "codex",
  "aliases": {
    "frontier": { "model": "gpt-5.5" },
    "implementation": { "model": "gpt-5.3-codex" },
    "utility": { "model": "gpt-5.4" }
  }
}
```

Aliases are surface-scoped. Model plans reference aliases; renderers use the
matching surface alias record to emit provider-native model IDs.

### Surface record

```json
{
  "id": "codex",
  "kind": "surface",
  "agentFormat": "toml",
  "skillFormat": "markdown-yaml-frontmatter",
  "configFormat": "toml"
}
```

Surface records capture provider file formats. They are not capability claims.
Codex is the only seeded surface with TOML agent and config output; Claude Code
and OpenCode agents use Markdown with YAML frontmatter.

## Validation invariants

The initial structural validator is `scripts/validate-source.ts`. It checks
source graph references and provider file-format facts without asserting prompt
or skill prose.

Prompt-layer records point at Markdown bodies. The validator checks existence
and provider coverage only; it must not snapshot Markdown wording.

### Identity and references

1. All IDs are kebab-case or lowercase Greek role IDs.
2. Every referenced agent, skill, route, model role, policy, and integration exists.
3. Every provider-specific record must name a supported provider surface.
4. Old aliases are not valid source records and are not detected, normalized, or migrated.

### Contracts and permissions

1. A `readonly` contract cannot enable write tools, edit permissions, shell mutation, or workspace-write sandbox.
2. An `edit-required` route must have at least one eligible writer agent.
3. An `execution-required` route must have shell or provider-native test execution access.
4. A coordinator prompt that says “never modifies files” cannot own an `edit-required` contract unless it delegates to an allowed writer agent and the route contract says `delegated-edit-required`.
5. Any role with `git_commit` or `git_push` permissions must attach branch and attribution policies.

### Model plans

1. Every `model_role` used by any route must have an assignment in every supported model plan.
2. `xhigh` or Claude `max` must require an explicit `budget_exception` block.
3. A route may request escalation, but renderer may not silently escalate.
4. A Pro 20x plan may increase parallelism or escalation allowance; it should not simply default everything to higher effort.

### Provider support

1. Every provider adapter owns an allowlist derived from upstream schema/docs.
2. Unsupported provider features must render diagnostics, not fake behavior.
3. Feature flags must be generated from source presets and checked against upstream schema.
4. Generated provider config must validate against upstream schema when possible.

### Third-party skill sync

1. First-party skills are the default and do not carry ownership or upstream
   repository metadata.
2. Third-party skills are exact vendored syncs with explicit repository, ref,
   license, sync command, and copied path.
3. Upstream-managed third-party files are not modified in place.
4. OAL changes to third-party behavior require separate overlay records.
5. Sync tests must fail when upstream-managed files drift without a sync-record
   update.

## Diagnostics format

All validation should return structured diagnostics:

```ts
type Diagnostic = {
  level: "error" | "warning" | "info";
  code: string;
  message: string;
  path?: string;
  sourceId?: string;
  surface?: "codex" | "claude" | "opencode";
  suggestion?: string;
};
```

Examples:

```text
error contract-write-mismatch: agent calliope has contract readonly but enables Edit/MultiEdit/Write on claude.
error unsupported-provider-hook: policy subagent-route-context maps SubagentStart to codex, but codex has no matching event.
warning expensive-effort-default: codex-plus assigns xhigh to athena without budget_exception.
warning stale-provider-key: generated Codex feature plugins=false conflicts with emitted plugin table.
```

## Source graph API

```ts
export type SourceGraph = {
  agents: AgentRecord[];
  skills: SkillRecord[];
  routes: RouteRecord[];
  commands: CommandRecord[];
  policies: PolicyRecord[];
  modelPlans: ModelPlanRecord[];
  surfaces: SurfaceRecord[];
  integrations: IntegrationRecord[];
  promptLayers: PromptLayerRecord[];
  provenance: ProvenanceRecord[];
};
```

## Rendering rule

Rendering is a pure function:

```ts
renderSurface(graph, { surface: "codex", plan: "codex-pro-5-efficiency", scope: "project" })
```

The function returns:

```ts
type RenderBundle = {
  surface: Surface;
  planId: string;
  artifacts: RenderArtifact[];
  diagnostics: Diagnostic[];
  manifestPreview: InstallManifest;
};
```

No renderer may read arbitrary source files outside the normalized graph. No renderer may write to disk directly.

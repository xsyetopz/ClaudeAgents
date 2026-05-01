# 03 — Source Graph and Schema Specification

## Goal

Create one typed source graph that every provider renderer consumes. No renderer should read ad hoc folders or infer behavior from old generated output. Every role, skill, route, hook, model assignment, and install artifact must exist as data before rendering starts.

## File format recommendation

Use JSON or TOML for machine records and Markdown for prompt/skill bodies.

Recommended default:

- `record.toml` for compact authored records;
- `body.md` for prompt/skill content;
- `schema/*.json` for JSON Schema validation;
- generated `.d.ts` TypeScript types from schemas.

TOML fits the existing Codex ecosystem and keeps comments useful. JSON remains acceptable for strict machine records. Avoid JavaScript source records; they make static validation and schema diffing weaker.

## Source layout

```text
source/
  agents/
    athena/
      agent.toml
      prompt.md
    hephaestus/
      agent.toml
      prompt.md
  skills/
    review/
      skill.toml
      SKILL.md
      reference/
      scripts/
  routes/
    implement.toml
    review.toml
    explore.toml
  commands/
    implement.toml
    oal-review.toml
  policies/
    protected-branch-confirm/
      policy.toml
      runtime.mjs
      tests.json
  model-plans/
    codex-plus.toml
    codex-pro-5.toml
    codex-pro-20.toml
    claude-max-5.toml
    claude-max-20.toml
    opencode-default.toml
  surfaces/
    codex.toml
    claude.toml
    opencode.toml
  integrations/
    caveman.toml
    taste-skill.toml
  prompt-layers/
    global.md
    provider-codex.md
    provider-claude.md
    provider-opencode.md
```

## Core graph types

### Agent record

```toml
id = "hephaestus"
display_name = "Hephaestus"
kind = "agent"
mode = "implementation"
primary = false
surfaces = ["codex", "claude", "opencode"]
description = "Implementation agent for scoped production code changes."
contract = "edit-required"
model_role = "implementation"
skills = ["review", "test", "style"]
forbidden_skills = []

[permissions]
read = true
write = true
shell = "ask"
network = false
secrets = "deny"
git_commit = "deny"
git_push = "deny"

[limits]
max_turns = 80
max_parallel_children = 0

[provider.codex]
sandbox_mode = "workspace-write"
agent_file = true

[provider.claude]
permission_mode = "acceptEdits"
tools = ["Read", "Edit", "MultiEdit", "Write", "Grep", "Glob", "Bash"]

[provider.opencode]
mode = "subagent"
permission.edit = "allow"
permission.write = "allow"
permission.bash = "ask"
```

### Skill record

```toml
id = "review"
display_name = "Review"
kind = "skill"
surfaces = ["codex", "claude", "opencode"]
source_package = "oal-first-party"
version = "4.0.0"
user_invocable = true
implicit_invocation = "route-scoped"
description = "Review code for correctness, regressions, security, and missing tests."

[inputs]
requires_files = true
requires_diff = false

[outputs]
format = "findings"

[permissions]
scripts = false
network = false
```

### Route record

```toml
id = "implement"
display_name = "Implement"
owning_agent = "hephaestus"
allowed_agents = ["hephaestus", "atalanta", "nemesis", "calliope"]
contract = "edit-required"
default_model_role = "implementation"
required_evidence = ["files_changed", "verification_attempted"]
forbidden_outputs = ["todo_placeholder", "demo_instead_of_real_impl"]

[completion]
requires_diff = true
requires_verification = true
allow_docs_only = false

[commands.codex]
name = "oal-implement"

[commands.claude]
name = "oal:implement"

[commands.opencode]
name = "oal-implement"
```

### Policy record

```toml
id = "staged-secret-guard"
kind = "mutation_guard"
decision_protocol = "oal-policy-v1"
runtime = "runtime.mjs"
surfaces = ["codex", "claude", "opencode"]
category = "security"

[provider.claude]
event = "PreToolUse"
matcher = "Bash(git commit *)|Bash(git add *)"
timeout = 5

[provider.codex]
event = "PreToolUse"
matcher = "shell"
timeout = 5

[provider.opencode]
permission_rule = "bash.git"
plugin_event = "tool.execute.before"
```

### Model plan record

```toml
id = "codex-pro-5-efficiency"
surface = "codex"
subscription = "pro-5"
default_model = "gpt-5.4"
default_effort = "medium"
default_verbosity = "low"
weekly_budget_class = "limited"

[[assignments]]
model_role = "orchestration"
model = "gpt-5.5"
effort = "medium"
escalate_to = "high"

[[assignments]]
model_role = "implementation"
model = "gpt-5.3-codex"
effort = "medium"
escalate_to = "high"

[[assignments]]
model_role = "utility"
model = "gpt-5.4"
effort = "low"
escalate_to = "medium"
```

## Validation invariants

### Identity and references

1. All IDs are kebab-case or lowercase Greek role IDs. No mixed old/new names.
2. Every referenced agent, skill, route, model role, policy, and integration exists.
3. Every provider-specific record must name a supported provider surface.
4. Old aliases are accepted only in migration input and normalized before render.

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

### Skill provenance

1. First-party skills use `source_package = "oal-first-party"`.
2. Third-party skills use explicit repository, ref, license, sync command, and copied path.
3. Any local modifications to third-party skills require an overlay record.
4. Sync tests must fail when upstream-managed files drift without provenance update.

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

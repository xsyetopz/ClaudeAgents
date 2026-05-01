# 06 — Agent and Subagent Registry Specification

## Agent design rule

Add a Greek-god-named agent only when it changes hard behavior: tools, permissions, model role, output contract, route ownership, or invocation trigger. Do not add agents for vibes.

Greek-god names are stable role IDs. They must not turn prompts, docs, or
generated configs into mythology-themed prose. Enterprise consumers should be
able to audit each role by contract, permission set, model role, route
ownership, and validation evidence.

## Existing core roles

| Agent      |         Keep? | Role                                  | Contract                | Notes                                                        |
| ---------- | ------------: | ------------------------------------- | ----------------------- | ------------------------------------------------------------ |
| Athena     |           Yes | Architecture, planning, tradeoffs     | readonly                | Strong prompt; should own plans and ADR-grade decisions.     |
| Hephaestus |           Yes | Implementation and refactor execution | edit-required           | Primary writer. Keep narrow.                                 |
| Nemesis    |           Yes | Review, audit, regressions, security  | readonly                | Findings-first. Can split security to Themis later.          |
| Hermes     |           Yes | Search, source retrieval, repo map    | readonly                | Keep source-citation discipline.                             |
| Atalanta   |           Yes | Test execution and validation         | execution-required      | Shell/test access; no implementation by default.             |
| Calliope   |           Yes | Docs, ADRs, changelogs, handoffs      | docs-write              | Fix readonly/write mismatch.                                 |
| Odysseus   | Yes, narrowed | Coordination and delegation           | delegated-edit-required | Must not be direct writer; contract must express delegation. |

## Required contract corrections

### Calliope

If Calliope writes docs, its contract cannot be `readonly`. Use:

```text
contract = "docs-write"
permissions.write = true
write_scope = ["docs/**", "README.md", "CHANGELOG.md", "*.md"]
```

For read-only documentation review, use route `document-review` or agent mode `calliope-readonly`.

### Odysseus

Odysseus prompt says it never modifies files. Its route contract should be:

```text
contract = "delegated-edit-required"
direct_write = false
allowed_delegate_writers = ["hephaestus", "calliope"]
```

Do not mark Odysseus as a direct `edit-required` agent.

### Atalanta

Atalanta can run tests and may write snapshots or coverage files indirectly. Its write policy should be explicit:

```text
contract = "execution-required"
permissions.shell = "allow-test-commands"
permissions.write = "generated-test-artifacts-only"
```

## Proposed v4 expanded registry

Keep the default deploy smaller. Add extended agents behind an `extended-agents` preset.

### Apollo — frontend, design-system, accessibility

```text
id = "apollo"
display_name = "Apollo"
model_role = "taste-design"
contract = "design-review-or-edit"
primary_routes = ["design", "ui-review", "frontend-polish"]
skills = ["taste-skill", "accessibility", "style", "review"]
permissions.write = "frontend-scope"
```

Use Apollo when UI quality matters: layout, typography, motion, accessibility, design tokens, component systems, and anti-slop frontend polish.

### Artemis — impact tracing and regression scope

```text
id = "artemis"
model_role = "utility"
contract = "readonly"
primary_routes = ["trace", "impact", "dependency-map"]
skills = ["trace", "explore", "perf"]
permissions.write = false
```

Hermes finds facts. Artemis follows call chains and scopes blast radius. This split is useful if Hermes is too broad.

### Demeter — data, schemas, migrations

```text
id = "demeter"
model_role = "implementation"
contract = "schema-change-required"
primary_routes = ["schema", "data-fix"]
skills = ["test", "review", "errors"]
permissions.write = true
permissions.shell = "ask"
```

Owns database schema changes, migration scripts, seed data, serialization formats, and backwards compatibility.

### Hestia — devex, repo hygiene, release prep

```text
id = "hestia"
model_role = "utility"
contract = "tooling-write"
primary_routes = ["devex", "repo-hygiene", "release"]
skills = ["git-workflow", "document", "test"]
permissions.write = "tooling-scope"
```

Owns package scripts, CI, lint/format, editor config, release notes, and repository maintenance.

### Themis — policy, security controls, compliance

```text
id = "themis"
model_role = "review"
contract = "readonly"
primary_routes = ["security", "policy", "compliance"]
skills = ["security", "review", "errors"]
permissions.write = false
```

Nemesis reviews correctness broadly. Themis specializes in policy, permissions, secrets, supply chain, auth, compliance, and enterprise controls.

### Asclepius — reliability, observability, incident analysis

```text
id = "asclepius"
model_role = "debug"
contract = "debug-evidence-required"
primary_routes = ["incident", "observability", "reliability"]
skills = ["debug", "trace", "perf"]
permissions.shell = "ask"
permissions.write = "observability-scope"
```

Owns logs, metrics, traces, health checks, failure modes, and incident root-cause artifacts.

### Chronos — performance and latency

```text
id = "chronos"
model_role = "review"
contract = "evidence-required"
primary_routes = ["perf", "benchmark", "latency"]
skills = ["perf", "trace", "test"]
permissions.shell = "benchmark-ask"
```

Use for profiling, benchmark interpretation, algorithmic complexity, and slow CI/test diagnostics.

### Hecate — integrations and boundary systems

```text
id = "hecate"
model_role = "architecture"
contract = "integration-plan-or-edit"
primary_routes = ["integration", "api-boundary", "auth-boundary"]
skills = ["security", "errors", "trace"]
permissions.network = "ask"
```

Owns external APIs, auth boundary work, SDK integration, MCP/provider integration, and cross-system failure modes.

### Mnemosyne — memory, handoff, continuity

```text
id = "mnemosyne"
model_role = "documentation"
contract = "handoff-required"
primary_routes = ["handoff", "resume", "compact"]
skills = ["handoff", "document", "plain-language"]
permissions.write = "oal-state-and-docs"
```

Owns continuation summaries, compaction prompts, memory hygiene, session state, and work resumption.

### Aphrodite or Dionysus — taste and product feel

Prefer **Aphrodite** for product taste and user-facing polish. Avoid making this role too vague.

```text
id = "aphrodite"
model_role = "taste-design"
contract = "taste-review"
primary_routes = ["taste", "copy-polish", "product-feel"]
skills = ["taste-skill", "plain-language", "deslop"]
permissions.write = "ui-copy-and-style-scope"
```

Use for product language, aesthetic cohesion, empty states, onboarding copy, visual hierarchy, and “does this feel premium?” checks.

## Minimal default deploy

Default v4 should include 8 roles:

1. Athena
2. Hephaestus
3. Hermes
4. Nemesis
5. Atalanta
6. Calliope
7. Odysseus
8. Apollo

Extended preset adds:

- Artemis
- Demeter
- Hestia
- Themis
- Asclepius
- Chronos
- Hecate
- Mnemosyne
- Aphrodite

## Invocation policy

### Direct invocation

User can directly call any primary route:

```text
/oal plan
/oal implement
/oal review
/oal test
/oal design
```

### Automatic routing

OAL may suggest or set route context, but provider-native behavior owns actual invocation.

Examples:

| Prompt pattern              | Route        | Agent                |
| --------------------------- | ------------ | -------------------- |
| “map this repo”             | explore      | Hermes               |
| “why did tests fail”        | test/debug   | Atalanta → Asclepius |
| “review this PR”            | review       | Nemesis              |
| “make this UI less generic” | design/taste | Apollo/Aphrodite     |
| “change schema”             | schema       | Demeter              |
| “release prep”              | release      | Hestia + Nemesis     |

## Delegation rules

1. Coordinators do not write files directly.
2. Implementers do not spawn broad research unless the route permits it.
3. Reviewers do not edit unless a fix route is invoked.
4. Test agents may run commands but do not change implementation code.
5. Documentation agents may write docs but not production code.
6. Every delegated task includes objective, scope, allowed files, model budget, and completion evidence.

## Agent prompt structure

Every agent prompt must have these sections:

```markdown
## Identity
## Job Boundary
## Tool and Permission Rules
## Evidence Rules
## Completion Contract
## Anti-Patterns
## Protocol
## Output Format
```

Avoid generic “Capabilities” lists unless they change behavior. Prompts should read like contracts, not personality cards.

## Registry validation

1. Every agent has one primary job.
2. Every agent has a contract.
3. Every agent contract matches tools and provider permissions.
4. Every agent has a model role, not hardcoded provider model defaults.
5. Every agent has at least one route or is hidden/internal.
6. Every extended agent has a measurable reason to exist.
7. No two agents have the same route ownership unless one is explicitly specialist fallback.

## Source records

The registry is seeded under `source/agents/<id>/agent.json`. These records are
structural JSON only: ID, model role, contract, routes, skills, render targets,
and permissions. Prompt prose and provider-native agent file formats are
generated later by the render adapters.

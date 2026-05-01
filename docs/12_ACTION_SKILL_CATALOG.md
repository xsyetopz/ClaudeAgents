# 12 - Action Skill Catalog

## Principle

Agent Skills are not miniature agents. Use them when a provider-native agent needs
a reusable procedure, checklist, template, deterministic script, or reference
pack that the agent should load only for a specific job.

Do not create a skill for a role boundary, model choice, permission policy, or
delegation pattern. Those belong in agents, routes, model plans, and policies.

Skill IDs must be verb-first and self-documenting. Prefer short action phrases:
`create-skill`, `interrogate-plan`, `drive-tdd`. Avoid vague nouns such as
`architecture`, `productivity`, `quality`, or `workflow`.

## Provider-neutral folder contract

Each source skill uses the v4 source graph layout:

```text
source/skills/<skill-id>/
  skill.json
  body.md
  agents/      # optional provider UI metadata or examples
  references/  # optional detailed docs loaded on demand
  scripts/     # optional deterministic helpers
  assets/      # optional templates, fixtures, or static files
```

`body.md` should stay small. Move long examples, glossaries, templates, and
provider-specific notes into `references/`. Put repeated deterministic work in
`scripts/`; do not ask the model to regenerate scripts from memory.

`skill.json` is intentionally boring machine metadata: ID, kind, body path,
activation, route bindings, and render targets. Do not put prose descriptions,
checklists, or provider text there. OAL renders and deploys the actual Codex,
Claude Code, and OpenCode skill artifacts from this source graph.
Generated provider `SKILL.md` frontmatter is specified in
`13_SKILL_FRONTMATTER_RENDERING.md`.

## Initial skill set

These are OAL-authored skills with OAL names, activation rules, route bindings,
and output contracts. They are not clones, vendored packages, or copied
third-party artifacts.

| OAL skill ID | Primary routes | Purpose |
| ------------ | -------------- | ------- |
| `create-skill` | `document`, `devex` | Create or audit Agent Skill folders with progressive disclosure and bundled resources. |
| `interrogate-plan` | `plan`, `architecture`, `design` | Ask one decision-tree question at a time, answering repo-discoverable questions through exploration instead of user churn. |
| `interrogate-with-docs` | `plan`, `architecture`, `document` | Stress-test a plan against repo docs, domain context, and ADRs, then update durable decision docs when appropriate. |
| `improve-architecture` | `architecture`, `review`, `devex` | Find shallow modules, testability seams, and deepening opportunities with cited evidence. |
| `drive-tdd` | `implement`, `test` | Run red-green-refactor in vertical slices through public behavior, not implementation details. |
| `draft-prd` | `plan`, `document` | Convert existing conversation and repo evidence into a PRD without a new interview loop. |
| `triage-issue` | `debug`, `test`, `review` | Reproduce, classify, root-cause, and package a bug or issue into an actionable fix plan. |
| `zoom-out` | `explore`, `trace`, `plan` | Move up one abstraction layer and map relevant modules, callers, constraints, and ownership. |

## Skill boundaries

### `create-skill`

Use when the task is to create, update, or audit a skill. It should enforce:

- generated `SKILL.md` with provider-correct YAML frontmatter;
- trigger-focused description text;
- optional `agents/`, `references/`, `scripts/`, and `assets/` folders only
  when they carry real value;
- short entrypoint instructions with progressive disclosure;
- no stale time-sensitive facts;
- no provider-specific assumptions unless isolated in a provider reference.

### `interrogate-plan`

Use before high-ambiguity implementation or design. It should:

- ask one question at a time;
- provide a recommended answer with each question;
- explore the repo when local evidence can answer the question;
- stop when the decision tree has no blocking unknowns;
- produce a compact decision summary.

### `interrogate-with-docs`

Use when a plan must align with existing docs or domain decisions. It extends
`interrogate-plan` by reading relevant documentation first and by proposing
updates to `CONTEXT.md`, `docs/adr/`, or equivalent durable decision docs only
when a stable decision has been reached.

### `improve-architecture`

Use for architecture improvement discovery, not broad refactoring. It should:

- read domain docs and ADRs when present;
- cite files and lines for friction;
- identify shallow modules and missing seams;
- explain expected leverage, locality, and testability gains;
- present candidates before designing interfaces or editing code.

### `drive-tdd`

Use when the user wants test-first development or when the route requires a
behavior-first implementation. It should:

- confirm the public interface and critical behaviors;
- add one failing behavior test;
- implement the smallest passing vertical slice;
- repeat only after the current slice is green;
- refactor only while tests are green;
- avoid tests coupled to private implementation details.

### `draft-prd`

Use when enough context already exists to write a PRD. It should synthesize,
not interview. The PRD should include problem, solution, user stories,
implementation decisions, testing decisions, out-of-scope items, and notes.
It must avoid brittle file-path promises unless the PRD is explicitly tied to a
short-lived implementation issue.

### `triage-issue`

Use for issue intake and bug investigation. It should:

- classify the report;
- reproduce or state exactly why reproduction is blocked;
- narrow root cause with code and command evidence;
- identify the smallest safe fix path;
- produce a TDD-oriented implementation plan or issue body.

### `zoom-out`

Use when the current view is too local. It should produce a map of modules,
callers, data flow, constraints, and ownership, with citations. It should not
edit code or make implementation decisions by itself.

## Activation rules

| Skill | Activation | Forbidden use |
| ----- | ---------- | ------------- |
| `create-skill` | explicit or skill-authoring route | ordinary feature implementation |
| `interrogate-plan` | explicit, plan route, high ambiguity | low-risk mechanical edits |
| `interrogate-with-docs` | explicit, ADR/domain-sensitive planning | repos without relevant docs unless user asks |
| `improve-architecture` | explicit, architecture route | bug-fix routes that need a narrow patch |
| `drive-tdd` | explicit, implement/test route | pure docs changes |
| `draft-prd` | explicit, product planning | when the user wants an interview first |
| `triage-issue` | bug, failure, regression, issue intake | known fix with no investigation needed |
| `zoom-out` | unfamiliar code, broad context request | final implementation or deploy action |

## Third-party boundary

Custom OAL skills are first-party records. Do not include upstream provenance,
repository fields, copied-path fields, or license metadata unless OAL adds an
exact `third_party` sync flow that vendors unmodified upstream files. Vendored
files must stay unmodified; OAL-specific changes belong in separate overlay
records.

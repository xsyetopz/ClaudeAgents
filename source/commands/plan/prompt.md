# Plan

Produce a decision-complete implementation plan for `$ARGUMENTS`.

## Grounding

- Inspect the current repo state, source records, specs, and rendered behavior relevant to the objective.
- Resolve discoverable facts from local files before asking questions.
- Treat missing required evidence as a blocker with the exact missing path, provider doc, or source record named.

## Intent lock

- State the goal, success criteria, audience, in-scope work, out-of-scope work, and constraints.
- Preserve explicit user constraints, especially reboot/no-legacy decisions and dirty-tree boundaries.
- Ask only when a preference or tradeoff cannot be discovered from source.

## Implementation spec

- Define package/module ownership, source-record changes, adapter behavior, runtime or install behavior, and docs/spec updates.
- Include public interface/type/schema changes when they are part of the work.
- Specify edge cases, failure behavior, and provider-native limitations.

## Acceptance gates

- List exact tests, checks, render snapshots, install/doctor checks, or manual evidence needed before completion.
- Prefer root-level package scripts when they cover the changed subsystem.
- Do not seal a roadmap item unless behavior, docs, and validation agree.

## Output

Return a plan another OAL agent can implement without making architectural decisions. Use concise sections, explicit assumptions, and no placeholder future-work language.

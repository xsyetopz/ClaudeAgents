# Package Boundaries

Package boundaries are part of the product design. They keep state, policy, and
I/O decisions separate enough to test.

## Rules

- Domain packages must not import from `cli`.
- Cross-package imports must use public package exports.
- Do not import another package's internal file path.
- Do not add `core`, `common`, `shared`, `utils`, or `helpers` packages.
- Add new behavior to the package that owns the state or decision.
- Keep mutating operations dry-run first unless the command is explicitly an
  apply/write command.

## Ownership guide

| Change type                                               | Package      |
| --------------------------------------------------------- | ------------ |
| Pi package inventory, resource hashing, install plans     | `lifecycle`  |
| Project manifest, lock, audit, status                     | `lifecycle`  |
| Goal objective, ledger, retry, blocker, completion state  | `lifecycle`  |
| Dangerous command/path/secret/generated-artifact policy   | `safety`     |
| Hook phase, veto, validation guardrail                    | `safety`     |
| Sandbox probe, quota label, read-only broker schema       | `safety`     |
| Executable package trust proof                            | `trust`      |
| Reports, catalog, handoff, compaction, RTK planning       | `reporting`  |
| First-party resources, prompt contracts, plan/diff review | `authoring`  |
| Skill metadata, topical loading, refinement proposals     | `authoring`  |
| First-party extension skeletons and Aegis runtime         | `extensions` |
| CLI flags, usage text, exit codes, stdout/stderr          | `cli`        |

## Dependency discipline

A package may depend on another package only when it needs that package's public
contract. If a dependency would exist only to share a convenience function, keep
the function local or move the owning behavior instead.

## Test expectations

Boundary changes require tests that prove the intended owner still controls the
behavior. Examples:

- Safety changes should exercise `decidePolicy` or hook pipeline APIs.
- Lifecycle changes should exercise package inspection, install planning, or
  goal-loop state directly.
- CLI changes should assert routing and exit behavior without duplicating domain
  tests.

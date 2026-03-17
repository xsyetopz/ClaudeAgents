Refactor code with architectural guidance and validation.

## Workflow

1. **@athena** — Design the refactoring strategy: what changes, why, what patterns to follow, risk assessment
2. **@hephaestus** — Execute the refactoring: apply changes, maintain existing behavior, follow the plan
3. **@nemesis** — Review the refactoring: verify behavior is preserved, check for regressions, validate improvements

## Instructions

- Run agents sequentially — refactoring needs a plan
- @athena should identify what to change AND what to preserve (invariants)
- @hephaestus should make incremental changes, running tests between steps if possible
- @nemesis should specifically check for behavioral regressions and API breakage
- Produce a final summary with: what changed, what was preserved, review verdict

Start by asking @athena to analyze the refactoring target and design the approach.

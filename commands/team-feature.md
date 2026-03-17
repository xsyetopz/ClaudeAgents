Implement a feature end-to-end: plan, build, review, test.

## Workflow

1. **@athena** — Design the implementation plan: architecture, file changes, dependencies, acceptance criteria
2. **@hephaestus** — Implement the plan: write code, handle edge cases, follow existing patterns
3. **@nemesis** — Review the implementation: correctness, security, performance, maintainability
4. **@atalanta** — Run tests: execute test suite, report failures, verify acceptance criteria

## Instructions

- Run agents sequentially — each builds on the previous
- @athena's plan is the source of truth for @hephaestus
- If @nemesis finds BLOCKING issues, route back to @hephaestus for fixes before @atalanta
- Produce a final summary with: files modified, key decisions, review verdict, test results

Start by asking @athena to analyze the feature request and produce an implementation plan.

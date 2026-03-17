Run a full review pipeline on the current changes or specified files.

## Workflow

1. **@hermes** — Explore the changes: what files were modified, what the intent appears to be, what existing patterns are relevant
2. **@nemesis** — Review the code: correctness, security, performance, maintainability. Run the full review checklist.
3. **@atalanta** — Run tests: execute the test suite for affected areas, report failures and coverage gaps

## Instructions

- Run agents sequentially — each depends on the previous
- @hermes provides context that informs @nemesis's review
- @nemesis identifies issues that @atalanta should verify via tests
- Produce a final summary with: verdict (PASS/NEEDS_CHANGES), findings table, test results

Start by asking @hermes to explore the changes with `git diff --stat`.

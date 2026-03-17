Pre-commit quality gate: review, test, then ship.

## Workflow

1. **@nemesis** — Review all staged/unstaged changes: correctness, security, performance
2. **@atalanta** — Run the full test suite for affected areas
3. If both pass: run `/cca:ship` to commit and optionally push

## Instructions

- Run @nemesis and @atalanta in parallel (they're independent)
- If @nemesis verdict is NEEDS_CHANGES, stop and report — do not ship
- If @atalanta finds test failures, stop and report — do not ship
- Only proceed to `/cca:ship` if both pass
- Produce a final summary with: review verdict, test results, commit hash

Start by running @nemesis on `git diff` and @atalanta on the test suite simultaneously.

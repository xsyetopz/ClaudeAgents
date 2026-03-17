Investigate and fix a bug: research, fix, verify.

## Workflow

1. **@hermes** — Investigate: reproduce the issue, trace the code path, identify root cause with file:line citations
2. **@hephaestus** — Fix: implement the targeted fix based on @hermes's findings, minimal change
3. **@atalanta** — Verify: run tests to confirm the fix works and nothing else broke

## Instructions

- Run agents sequentially — the fix depends on understanding the root cause
- @hermes should provide a clear root cause with evidence before @hephaestus starts
- @hephaestus should make the smallest change that fixes the issue
- @atalanta should run both the specific failing test and a broader regression suite
- Produce a final summary with: root cause, fix description, test results

Start by asking @hermes to investigate the bug with the user's description.

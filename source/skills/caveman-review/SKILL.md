# Caveman Review

## openagentlayer Contract

- Finish the user's explicit objective on the real target path; do not reduce the task to advice or a smaller substitute.
- Treat exact parity, 1:1 behavior, source behavior, reference behavior, and image-backed matching as reference-bound work. Inspect the reference first and preserve observable behavior.
- Do not use task-shrinking language, temporary-work notes, approximation wording, substitute implementations, or trailing opt-in offers.
- Ask only when the missing decision changes correctness or safety and cannot be recovered from local evidence.
- If blocked, use `BLOCKED`, `Attempted`, `Evidence`, and `Need` with concrete details.


## Skill Procedure

Return explicit review output in terse Caveman form only when the user asks for it.

## Rules

- Findings still come first.
- Severity and file references still matter.
- Compress prose, not evidence.
- Keep exact file paths, symbols, versions, and code snippets unchanged.

## Output Shape

- If there are findings: one short finding per line with severity and path.
- If there are no findings: say so directly, then list the main residual risk in one short line if needed.

Example:

```text
High - src/auth.ts:42. Token expiry check use `<`, should use `<=`. Expired tokens slip through.
```

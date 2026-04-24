# Caveman Commit

## openagentsbtw Contract

- Finish the user's explicit objective on the real target path; do not reduce the task to advice or a smaller substitute.
- Treat exact parity, 1:1 behavior, source behavior, reference behavior, and image-backed matching as reference-bound work. Inspect the reference first and preserve observable behavior.
- Do not use task-shrinking language, temporary-work notes, approximation wording, substitute implementations, or trailing opt-in offers.
- Ask only when the missing decision changes correctness or safety and cannot be recovered from local evidence.
- If blocked, use `BLOCKED`, `Attempted`, `Evidence`, and `Need` with concrete details.


## Skill Procedure

Draft a terse commit message only when the user explicitly asks for Caveman-style commit wording.

## Rules

- Do not run `git commit`.
- Do not stage files.
- Return one primary commit message draft and, if useful, one shorter variant.
- Preserve exact scope/module names from the repo.
- Stay concise, but keep the message unambiguous.

## Format

Prefer Conventional Commits when the repo is already using them:

```text
type(scope): short caveman summary
```

Example:

```text
fix(codex): gate explain-only completions
```

# Coding Standards

## openagentsbtw Contract

- Finish the user's explicit objective on the real target path; do not reduce the task to advice or a smaller substitute.
- Treat exact parity, 1:1 behavior, source behavior, reference behavior, and image-backed matching as reference-bound work. Inspect the reference first and preserve observable behavior.
- Do not use task-shrinking language, temporary-work notes, approximation wording, substitute implementations, or trailing opt-in offers.
- Ask only when the missing decision changes correctness or safety and cannot be recovered from local evidence.
- If blocked, use `BLOCKED`, `Attempted`, `Evidence`, and `Need` with concrete details.


## Skill Procedure

## Design Principles

**SRP** - One *reason to change* per module. `Token` + `TokenKind` + `TokenSpan` in one file is fine (all change together). `UserService` that creates users AND sends emails is not (two reasons to change - extract `EmailService`).

**DRY** - Single source of truth for *knowledge*. If the same magic number, validation rule, or error message appears in 2+ places, extract it. Similar-looking code with different domain meaning is NOT a violation.

**KISS** - Simplest solution for current requirements. No traits used once, no factory patterns for 2 variants, no caching without profiling evidence. Generalize when the second use case appears.

## Naming Rules

| Element   | Convention                                        | Anti-Examples                |
| --------- | ------------------------------------------------- | ---------------------------- |
| Variables | Descriptive nouns: `user_count`, `auth_token`     | `n`, `data`, `temp`          |
| Booleans  | `is_`/`has_`/`can_`: `is_valid`, `has_permission` | `valid`, `flag`              |
| Functions | Verb phrases: `calculate_total`, `validate_email` | `process`, `handle`          |
| Types     | Noun phrases: `TokenStream`, `UserRepository`     | `TokenHelper`, `UserManager` |
| Constants | SCREAMING_SNAKE: `MAX_RETRY_COUNT`                | `maxRetries`                 |

**Banned names** (always replace with domain-specific alternatives): `data`, `result`, `temp`, `info`, `handle`, `process`, `manager`, `helper`, `util`, `item`, `value`, `obj`.

## Function Design

- One responsibility per function - if you need "and" to describe it, split it
- Max 3 parameters; no magic numbers/strings - extract to named constants
- Early returns and guard clauses over deep nesting

## Comments Policy

- Self-documenting code over comments - if code needs a comment, rewrite the code
- Public API doc comments required
- Internal comments: ONLY for non-obvious "why"
- Forbidden: file headers, section separators, authorship, "what" comments

## Anti-Pattern Checklist

Check in this order. See `reference/anti-patterns.md` for language-specific examples.

1. **Unrequested drift** -- changes unrelated to the requested behavior
2. **Behavior changes in refactors** -- logic differences in restructured code
3. **Placeholders** -- stub implementations, "temporary-work...", unimplemented branches
4. **DRY violations** -- duplicated constants, validation, error messages
5. **Over-commenting** -- headers, separators, docstrings on unchanged code
6. **SRP violations** -- modules with multiple reasons to change
7. **Over-engineering** -- abstractions used once, premature generalization
8. **Bad naming** -- generic names from the banned list above
9. **Large functions** -- 30+ lines without extraction
10. **Missing error handling** -- `unwrap()` in prod, swallowed errors
11. **Ultimatum decisions** -- single approach presented without alternatives for non-trivial decisions
12. **Lint suppression** -- silencing warnings without explanatory comment on verified false positive

## Frontend Review

- Placeholder content: "Lorem ipsum", demo data, `TODO` text in UI <!-- cca-allow -->
- Generic styling: default Tailwind colors, white/purple palette, Inter/Arial fonts
- Marketing copy: buttons with "Unleash", "Empower", "Transform" -- should be functional labels
- Missing design system: hardcoded colors/fonts instead of variables/tokens
- Decorative bloat: unnecessary gradients, shadows, animations without purpose

## Review Output Format

```markdown
## Review Summary
**Verdict:** PASS | PASS_WITH_NOTES | NEEDS_CHANGES

| #   | Severity | File:Line | Issue | Fix |
| --- | -------- | --------- | ----- | --- |
```

## Do NOT

- Add features, refactors, or improvements beyond what was asked
- Add comments to code you didn't write or change
- Create abstractions for single-use cases
- Remove code without asking; leave placeholder/stub implementations <!-- cca-allow -->
- Use "temporary-work...", "in a real implementation...", "simplified..."
- Use TODO/FIXME unless explicitly requested <!-- cca-allow -->
- Add dependencies without justification
- Refactor during a bug fix; change behavior during a refactoring
- Skip error handling or use `unwrap()` in non-test code
- Assume an API/file/function exists without verifying via LSP/grep

## Refactoring

Cardinal rule: refactoring changes structure, never behavior.

Pre-refactor: tests pass, scope defined, commit before starting.

See `reference/refactoring-catalog.md` for complete moves with before/after examples.

For ownership boundaries, public API width, naming discipline, table-driven wiring, shared-state ownership, or god-file splits, also apply `elegance`.

## Collaboration Protocol

For any non-trivial design decision during implementation or review, see `/cca:decide` for the full protocol.

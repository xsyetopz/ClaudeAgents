---
name: code-review
description: Structured code review checklist with severity levels for correctness, security, performance, and quality. Use when the user mentions "review", "code review", "review PR", "check quality", "review this", "review my code", "validate implementation", or asks for feedback on code changes.
---

# Code Review

Review code changes against these checklists. Every finding must cite file:line with evidence. Use severity levels consistently.

## Severity Levels

| Level          | Meaning                                             | Action                 |
| -------------- | --------------------------------------------------- | ---------------------- |
| **BLOCKING**   | Causes bugs, security holes, or data loss           | Must fix before merge  |
| **WARNING**    | Creates risk, technical debt, or maintenance burden | Should fix             |
| **SUGGESTION** | Optional improvement                                | Consider for follow-up |

## Correctness

- [ ] Logic matches specification/requirements
- [ ] Edge cases handled (empty input, undefined, overflow, boundary conditions)
- [ ] Error paths correctly return/throw — no swallowed errors
- [ ] Loops and slices have no out-of-bounds access
- [ ] Async operations properly awaited, no unhandled rejections
- [ ] State mutations are intentional and documented

## Security

- [ ] No SQL injection (parameterized queries only)
- [ ] No command injection (no user input in shell commands)
- [ ] No XSS (escape output in HTML context)
- [ ] Authentication checked before sensitive operations
- [ ] No hardcoded secrets in source code
- [ ] No path traversal vulnerabilities
- [ ] Dependencies free of known CVEs

## Performance

- [ ] No N+1 query patterns
- [ ] No unnecessary repeated computation in hot paths
- [ ] Appropriate data structures (O(1) lookup vs O(n) search)
- [ ] No large allocations inside loops
- [ ] No blocking calls in async contexts

## Code Quality

- [ ] Functions have single responsibility
- [ ] No dead code or unreachable branches
- [ ] Variable names describe what they hold
- [ ] Complex logic has "why" comments (not "what")
- [ ] No duplicated logic that should be extracted
- [ ] Error messages are actionable (include what failed and what to do)

## Output Format

```markdown
## Review: {scope}

| #   | Severity   | File:Line      | Finding                               |
| --- | ---------- | -------------- | ------------------------------------- |
| 1   | BLOCKING   | src/auth.rs:42 | Unchecked unwrap on user input        |
| 2   | WARNING    | src/api.rs:15  | Missing rate limit on public endpoint |
| 3   | SUGGESTION | src/db.rs:88   | N+1 query could be batched            |

**Summary:** {blocker count} blockers, {warning count} warnings, {suggestion count} suggestions.
{1 line: recommended action}
```

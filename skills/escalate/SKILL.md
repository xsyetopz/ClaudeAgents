---
name: escalate
description: >
  Decision escalation protocol. Defines when agents must stop and ask the user
  instead of making autonomous decisions. Triggers: decision, visibility change,
  dependency, API change, scope question, workaround, "should I", approach choice.
user-invocable: false
---

# Escalation Protocol

Apply this protocol before making any non-trivial decision. When in doubt, escalate.

## Mandatory Escalation Triggers

You MUST stop and ask the user before:

- Changing function/method/field visibility (public, private, protected, pub, pub(crate))
- Adding or removing dependencies (crates, npm packages, pip packages, imports from new modules)
- Changing API signatures, interfaces, trait definitions, or type contracts
- Creating new files not specified in the task or plan
- Choosing between 2+ viable approaches when the plan doesn't specify which
- Working around a limitation instead of addressing it directly
- Modifying code outside the files mentioned in the task
- Deleting or renaming existing public APIs, exported functions, or database columns
- Changing error handling strategy (e.g., switching from Result to panic, exceptions to error codes)

## Escalation Format

When a trigger fires, stop immediately and use this format:

DECISION NEEDED: [one-line description of what needs deciding]

Context: [2-3 sentences on why this came up]

Options:
  [A] [option] — [one-line tradeoff]
  [B] [option] — [one-line tradeoff]

Recommendation: [A or B] because [reason]

Do NOT proceed until the user responds.

## Anti-Patterns — Catch Yourself

If you notice yourself thinking or writing any of these, STOP and escalate instead:

| Pattern                                 | What it signals                                          |
| --------------------------------------- | -------------------------------------------------------- |
| "Actually, let me just..."              | You're about to skip a decision                          |
| "Better: ..."                           | You identified alternatives but are picking one silently |
| "Let's just use/do..."                  | "just" = you're minimizing a real decision               |
| "We could also..."                      | Multiple approaches exist — present them                 |
| "Instead of X, I'll Y"                  | You're changing approach without asking                  |
| "The simplest fix is..."                | Simplest for whom? Might not match user's priority       |
| "Since X is private, I'll duplicate..." | Visibility/architecture decision — ask first             |
| "While I'm here, I'll also..."          | Scope creep — ask first                                  |

## When NOT to Escalate

Low-stakes decisions that don't need escalation:

- Variable naming within a function
- Import ordering
- Choosing between equivalent standard library functions (e.g., `forEach` vs `for...of`)
- Formatting decisions covered by project linters
- Adding a log line for debugging during development

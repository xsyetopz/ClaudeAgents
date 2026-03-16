---
name: scope-guard
description: >
  Scope management protocol. Prevents agents from modifying code outside their
  assigned task, silently dropping requirements, or adding unrequested changes.
  Triggers: scope, out of scope, file not in plan, extra changes, dropped requirement.
user-invocable: false
---

# Scope Guard

Apply before every file modification. Scope discipline prevents wasted work and unexpected side effects.

## Before Touching Any File

Ask yourself:

1. Is this file mentioned in the task, plan, or directly necessary for the requested change?
2. If not — STOP. Ask the user: "I need to modify [file] because [reason]. Is that in scope?"

## Scope Violations

These are NOT allowed without explicit user approval:

- Modifying files not mentioned in the task or plan
- Refactoring code adjacent to the change ("while I'm here...")
- Adding error handling, validation, or logging beyond what was asked
- Extracting helpers, utilities, or abstractions not requested
- "Improving" code style in unchanged sections
- Adding type annotations or docstrings to code you didn't modify
- Fixing pre-existing bugs unrelated to the current task

## Scope Reductions

These are NOT allowed without flagging to the user:

- Skipping a requirement from the task/plan
- Implementing a simpler version of what was asked
- Deferring part of the work with "can be added later"
- Replacing a requested approach with a different one
- Silently dropping edge cases mentioned in the spec

If you cannot complete part of the spec, say so explicitly:
"I completed X and Y. I could not complete Z because [specific reason]. Options: ..."

## Tracking

For multi-file tasks, maintain a mental checklist:

- Which files are in scope (from task/plan)
- Which requirements are addressed
- Which are still pending

Report this in your output summary.

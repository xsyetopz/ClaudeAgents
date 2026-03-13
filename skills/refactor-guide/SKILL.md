---
name: refactor-guide
description: >
  Guidance for safe refactoring: extract, rename, move, simplify, and restructure code
  without changing behavior. Triggers: refactor, restructure, extract, rename, move,
  simplify, decompose, clean up code, reduce complexity, split module.
user-invocable: true
---

# Refactor Guide

Apply these patterns when restructuring code. Cardinal rule: refactoring changes structure, never behavior.

## Pre-Refactor Checklist

1. **Tests pass** — run the full relevant test suite before starting
2. **Scope defined** — know exactly what you're changing and what you're not
3. **No behavior changes** — if you need to change behavior, that's a separate task
4. **Commit before starting** — create a clean rollback point

## Refactoring Catalog

### Extract Function

**When:** A code block does one identifiable thing within a larger function.

```python
# Before
def process_order(order):
    # validate
    if not order.items:
        raise ValueError("Empty order")
    if order.total < 0:
        raise ValueError("Negative total")
    # ... 20 more lines of processing

# After
def validate_order(order):
    if not order.items:
        raise ValueError("Empty order")
    if order.total < 0:
        raise ValueError("Negative total")

def process_order(order):
    validate_order(order)
    # ... processing
```

### Extract Type/Class

**When:** A group of fields and functions operate on the same data.

### Inline Function

**When:** A function body is as clear as its name, or it's called once.

### Rename

**When:** A name doesn't communicate what it does. Use the naming rules from coding-standards.

### Move

**When:** A function/type is in the wrong module — it's used more by another module than its current home.

### Replace Conditional with Polymorphism

**When:** A switch/match on type drives different behavior in 3+ branches.

### Simplify Conditional

**When:** Nested conditions can be flattened with guard clauses or early returns.

```python
# Before
def get_rate(user):
    if user.is_premium:
        if user.years > 5:
            return 0.05
        else:
            return 0.1
    else:
        return 0.15

# After
def get_rate(user):
    if not user.is_premium:
        return 0.15
    if user.years > 5:
        return 0.05
    return 0.1
```

## Safe Refactoring Process

1. **Identify** — what specific smell are you fixing?
2. **Test** — verify tests pass before changing anything
3. **Small steps** — one transformation at a time, test between each
4. **Verify** — tests pass after each step
5. **Review** — diff should show structural changes only, no behavior changes

## When NOT to Refactor

- During a bug fix — fix the bug first, refactor separately
- Without tests — add tests first, then refactor
- For hypothetical future requirements — refactor for current needs only
- Code you don't understand — investigate first, refactor after understanding
- Near a release — stability over cleanliness

## Code Smells → Refactoring Map

| Smell                                                                | Refactoring                           |
| -------------------------------------------------------------------- | ------------------------------------- |
| Long function (30+ lines)                                            | Extract Function                      |
| Long parameter list (4+)                                             | Introduce Parameter Object            |
| Duplicate code                                                       | Extract Function or Extract Type      |
| Feature envy (function uses another object's data more than its own) | Move Function                         |
| Data clump (same fields always appear together)                      | Extract Type                          |
| Switch on type                                                       | Replace Conditional with Polymorphism |
| Deep nesting                                                         | Guard clauses, Extract Function       |
| Dead code                                                            | Delete it                             |
| Comments explaining "what"                                           | Rename, Extract Function              |

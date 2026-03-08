---
name: refactor
description: >
  Guided refactoring workflow for decomposing tangled or oversized modules.
  Triggers: refactor module, refactor this, decompose module, split module, untangle code, clean up module.
---

# Refactoring Workflow

## When to Use

- Module >500 LOC or multiple concerns mixed in one file
- High coupling between unrelated features
- User asks to "refactor", "clean up", or "split" a module

## Process

### 1. Analyze

- Read the target module and map its symbols/dependencies
- Identify logical clusters of functionality
- Note natural boundaries where concerns separate

### 2. Plan

- Design new module structure following SRP
- Map old symbols to new locations
- Order operations so each step compiles independently
- Identify backward compatibility needs

### 3. Baseline

- Run existing tests, record pass/fail counts
- Commit or stash any unrelated changes

### 4. Migrate Incrementally

For each sub-module:
1. Extract types/functions to new location
2. Update imports in dependent files
3. Run targeted tests — compare to baseline
4. Commit after each successful extraction

### 5. Clean Up

- Remove dead code from original module
- Verify all imports updated
- Remove temporary re-exports
- Run full test suite, confirm no regressions

## Safety Rules

- **No behavior changes** during refactoring — structure only
- **No feature additions** mixed with refactoring
- If you find bugs, note them for a separate task
- If tests fail, stop and diagnose before continuing

## Rollback

If something goes wrong: `git stash` or `git checkout` to revert, review what failed, try again with smaller steps.

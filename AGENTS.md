# Olympi agent instructions

These instructions define repo-local operating rules for coding agents working in this checkout.

## Success criteria

Work is complete only when the requested change is implemented, relevant tests or validation commands have run successfully, and the final report names the exact verification performed. If validation cannot run, report the blocker and the next best check.

## Workspace ownership

- Treat unexplained changes as user-owned.
- Path shape is not ownership. `.pi/**`, generated-looking files, and tool output paths still require proof.
- Ownership proof is one of: manifest entry with matching hash, provenance record, same-run agent-created path, or explicit user approval.
- Do not revert, restore, delete, move, broadly format, stage, or commit ambiguous files.
- Revert-like git operations require ownership proof before execution.

## Blockers

Stop when credentials, missing files, missing authority, unavailable commands, failing environment, impossible constraints, or ambiguous ownership prevent the task. Report the exact operation blocked and the evidence. Do not switch to unrelated edits to appear productive.

## Communication

Failure reports use these fields: Failure, Impact, Change, Verification, Remaining blocker. The content must be operational. Apologies are not a substitute for these fields, and remediation must not be deferred when a fix can be applied in-scope.

## Tool use

Prefer scoped inspection and `apply_patch` edits. Avoid broad formatter/write commands unless the touched paths are explicitly scoped and ownership is proven. Keep durable project behavior in package code, hooks, tests, and docs rather than long prompt text.

Command classes are enforced by policy: read-only inspection, formatting/write,
destructive workspace, revert-like, staging, commit, and generated-artifact.
Anything outside read-only inspection needs the matching preconditions,
provenance checks, blocker behavior, and audit output from Themis before it can
run.

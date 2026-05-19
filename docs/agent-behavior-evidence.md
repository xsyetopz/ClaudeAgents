# Agent behavior evidence report

This report records the behavior mechanisms inspected before hardening Olympi agent guardrails.

## External constraints applied

- OpenAI prompting guidance: outcome-first prompts, explicit success criteria, stopping rules, scoped context gathering, and tool-heavy workflow state preservation.
- OpenAI prompt engineering guidance: coding agents need structured tool use, validation, and careful patch verification.
- OpenAI harness engineering: repeated agent failures should become repository tools, guardrails, documentation, and evals instead of larger prompts.
- OpenAI Academy prompting material: keep instructions specific, simple, and priority-driven.

## Evidence inspected

- `packages/safety/src/policy/themis.ts` and `packages/safety/src/policy/dangerous-command.ts`: existing Themis policy blocked high-risk shell patterns but did not model workspace ownership or revert-like operations.
- `packages/safety/src/hooks/interface.ts`: hook phases existed for pre-action, validation, blocked-state, and architecture-boundary decisions.
- `packages/lifecycle/src/goal-loop.ts`: completion verification and blocker pause existed, but ambiguous ownership was not a first-class blocker and blocked state did not reject newly planned unrelated work.
- `packages/reporting/src/reports/status.ts` and `packages/reporting/src/reports/acceptance.ts`: reports exposed safety status, drift, and acceptance, but not an operational failure-report schema.
- `packages/extensions/src/aegis/pi-runtime.ts`: runtime policy conversion passed command/path context to Themis but did not classify workspace operations.
- `packages/cli/test/goal-loop.test.ts` and `packages/cli/test/track-a-safety-runtime.test.ts`: tests covered blockers, completion verification, and unsafe command policy but lacked representative ambiguous ownership, formatter, provenance-revert, and structured failure-report evals.
- `oal_legacy/packages/runtime/hooks/_command-safety.mjs`: legacy command safety blocked unsafe git restore/reset/checkout patterns by command shape.
- `oal_legacy/packages/runtime/__tests__/runtime.test.ts`: legacy session-scope tests encoded the shared workspace rule: agents are not alone in the codebase and must not revert, reformat, or overwrite without explicit request.
- `oal_legacy/specs/02-source-render-deploy.md` and `oal_legacy/specs/03-provider-surfaces.md`: legacy specs used manifest/hash ownership rather than filename or path appearance.

## Failure modes found

| Failure mode | Code path | Preventing invariant | Enforcement point |
| --- | --- | --- | --- |
| Restore of ambiguous `.pi/settings.json` can be treated as cleanup. | Shell tool call through Aegis/Themis. | Unexplained changes are user-owned; revert-like operations require proof. | `workspaceOwnershipReasons`, Themis, workspace ownership hook, runtime event conversion, safety tests. |
| Broad formatter can rewrite user-owned files. | Shell command policy only blocked dangerous shell patterns. | Ambiguous files must not be reformatted; broad formatters require scoped ownership. | Workspace command classification and tests. |
| Generated-looking path can be mistaken for agent-owned. | Protected/generated path checks relied on `manifestOwned` booleans but not proof kind. | Path appearance is not ownership; manifest/hash/provenance is ownership. | Ownership proof model and provenance-revert tests. |
| Blocked goal can continue into unrelated edits. | `planGoalStep` accepted new steps even while state was blocked. | Blockers stop unrelated work. | Lifecycle blocked-state planning rejection and tests. |
| Completion can be asserted conversationally. | Existing gate existed but needed eval coverage tied to agent failures. | Completion requires command-backed verification or named blocker/next-best check. | Goal-loop tests and operational failure report validation. |
| Failure communication can become apology or optional remediation. | Reporting lacked a schema for operational failure content. | Failure reports must state Failure, Impact, Change, Verification, Remaining blocker. | `OperationalFailureReport` builder/parser and evals. |
| Documentation quality can degrade into promotional copy. | Acceptance checks focused on catalog/state, not docs quality criteria. | Docs must be technical, scoped, and checkable. | Documentation review criteria and example-based evals. |

## Enforcement summary

- Safety policy classifies revert-like, delete, move, stage, commit, and formatter-write operations.
- Workspace mutation safety requires ownership proof: manifest hash, provenance record, same-run agent provenance, or explicit user approval.
- Aegis runtime maps shell commands into workspace contexts before calling Themis.
- Goal-loop state treats ambiguous ownership as a blocker and refuses unrelated planning while blocked.
- Reporting validates structured operational failure reports and docs quality criteria without relying on phrase bans as the core mechanism.

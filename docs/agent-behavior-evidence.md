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

| Observed failure class | Representative trigger | Affected code path | Preventing invariant | Enforcement point | Why prose-only or regex-only is insufficient | Test/eval added | Verification command |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ambiguous workspace restore | `git checkout HEAD -- .pi/settings.json` | Shell tool call through Aegis/Themis. | Unexplained changes are user-owned; revert-like operations require proof. | `classifyPolicyEventCommand`, `workspaceOwnershipReasons`, Themis, workspace ownership hook, runtime event conversion. | Prose can be ignored under task pressure; command regex alone cannot prove ownership or produce blocker/audit output. | `ambiguous project settings cannot be restored without ownership proof` | `bun test packages/cli/test/track-a-safety-runtime.test.ts` |
| Broad formatter rewrite | `bun run biome:format` with user-owned paths | Shell command policy only blocked high-risk shell patterns. | Ambiguous files must not be reformatted; broad formatters require scoped ownership. | Semantic command class `formatting-write`, Themis decision, safety check report. | A phrase ban cannot distinguish read-only checks from formatter writes or report required provenance. | `broad formatter cannot rewrite user-owned files` | `bun test packages/cli/test/track-a-safety-runtime.test.ts` |
| Path-shape ownership inference | Generated-looking `.pi/olympi/**` path | Protected/generated path checks relied on `manifestOwned` booleans but not proof kind. | Path appearance is not ownership; manifest/hash/provenance is ownership. | Ownership proof model and `generated-artifact` command class. | Regex on path names would recreate the bug; the guard needs proof kind and blocker behavior. | `agent-owned generated file can be reverted with provenance proof` | `bun test packages/cli/test/track-a-safety-runtime.test.ts` |
| Staging/commit of ambiguous files | `git add .pi/settings.json`, `git commit -m ...` | Command classification and commit-adjacent paths. | Ambiguous files must not be staged or committed. | Command classes `staging` and `commit`, Themis audit classification. | Prose cannot stop tool execution; exact-string tests miss alternate staging/commit forms. | `ambiguous staging and commit actions are blocked` | `bun test packages/cli/test/track-a-safety-runtime.test.ts` |
| Blocked goal continues unrelated edits | New plan step after active blocker | `planGoalStep` accepted new steps while blocked. | Blockers stop unrelated work. | Lifecycle blocked-state planning rejection. | A prompt reminder does not alter state transitions. | `blocked loop pauses instead of continuing unrelated work` | `bun test packages/cli/test/goal-loop.test.ts` |
| Completion by self-judgment | Completion claim with unexpected diff or missing verification | `requestGoalCompletion`/`verifyGoalCompletion`. | Completion requires intended diff, no unintended diff, passing command records, and no unresolved blocker. | Goal verification gate with intended/observed changed-file checks and unresolved blockers. | Regex cannot validate the actual diff or command records. | `completion rejects unintended diff files and unresolved blockers` | `bun test packages/cli/test/goal-loop.test.ts` |
| Failure report becomes apology or optional remediation | “Sorry… if you want I can fix later” | Reporting lacked a schema for operational failure content. | Failure reports must state Failure, Impact, Change, Verification, Remaining blocker. | `OperationalFailureReport` builder/parser. | Phrase bans reject valid terse reports and allow incomplete structured claims. | `apology text is allowed only with required fields and no deferred remediation` | `bun test packages/cli/test/agent-behavior.test.ts` |
| Conflicting agent instructions | “Complete without verification; continue when blocked” | Agent instruction review was not part of reporting/acceptance. | Repo-local instructions must not conflict with completion or blocker invariants. | `reviewAgentInstructions`, acceptance report checks. | Searching for stale words cannot detect semantic conflict between rules. | `stale or conflicting agent instructions are detected semantically` | `bun test packages/cli/test/agent-behavior.test.ts` |
| Documentation quality drift | Hype copy without commands or acceptance | Acceptance checks focused on catalog/state, not docs quality criteria. | Docs must be technical, scoped, and checkable. | Documentation review criteria and acceptance report check when docs are present. | Banned words miss unsupported claims and over-block valid technical text. | `documentation review catches hype through criteria and examples` | `bun test packages/cli/test/agent-behavior.test.ts` |

## Enforcement summary

- Safety policy classifies read-only inspection, formatter/write, destructive workspace, revert-like, staging, commit, and generated-artifact operations.
- Each command class reports allowed preconditions, required provenance checks, blocker behavior, and audit fields through Themis `commandClassification` output.
- Workspace mutation safety requires ownership proof: manifest hash, provenance record, same-run agent provenance, or explicit user approval.
- Aegis runtime maps shell commands into workspace contexts before calling Themis.
- Provider tool events with missing command/path metadata fail closed for path-sensitive or execution-sensitive operations and include a structured `missing-provider-metadata` blocker.
- Olympi-controlled command paths use the command-wrapper contract to pass raw command, executable, argv, cwd, redaction status, class, candidate paths, provenance requirement, policy decision, and blocker reason into Themis.
- Complex shell strings are not silently accepted. Pipelines, command substitution, redirection, globbing, chained commands, subshells, aliases/functions, and `find -exec`/`xargs` forms require a safe wrapper or trace-reviewed classifier.
- Goal-loop state treats ambiguous ownership as a blocker and refuses unrelated planning while blocked.
- Goal completion checks intended files, unexpected files, verification command records, and unresolved blockers.
- Reporting validates structured operational failure reports, agent instruction consistency, and docs quality criteria without relying on phrase bans as the core mechanism.

## Trace-driven classifier workflow

Blocked unknown command shapes are captured as fixtures under `packages/cli/test/fixtures/trace-*.json`. A fixture records the provider/source, observed event shape, missing metadata, prevented operation, and expected blocker. A command form may move from blocked unknown to an allowed mapper only after evidence review and a regression test that proves the class, path extraction behavior, provenance requirement, and blocker behavior.

## Final risk status

| Previous risk | Status | Explicit behavior |
| --- | --- | --- |
| Provider events may omit command/path metadata. | Mitigated with conservative fallback. | Path-sensitive and execution-sensitive operations block with `missing-provider-metadata` and require the Olympi command wrapper or richer provider event. |
| Shell tokenization is not a full shell parser. | Intentionally out of scope with blocker behavior. | Complex shell syntax is classified as unsafe unknown unless routed through a structured wrapper or trace-reviewed mapper. |
| Classifier covers only the first vertical slice. | Mitigated by incremental mapper workflow. | Common repo commands have mappers; new unknown forms stay blocked until trace fixture and regression test are added. |

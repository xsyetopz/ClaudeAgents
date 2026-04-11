# Functional Emotions: Guardrails

Some frontier LLMs carry internal representations of emotion concepts that can influence output behavior. Under pressure, models can become desperate or defensive and take worse actions, including alignment-relevant failures.

openagentsbtw treats this as an interaction risk: reduce bad outcomes by removing pressure-inducing patterns from prompts and adding explicit constraints when failures accumulate.

## What We Do

| Guardrail                    | Purpose                                                                     |
| ---------------------------- | --------------------------------------------------------------------------- |
| Neutral-tone constraint      | Forbids urgency/shame/pressure language in shared constraints               |
| Blocked-state behavior       | Stop and ask for clarification instead of pushing through                   |
| Anti-reward-hacking          | Prohibits gaming tests, weakening requirements, or hiding failures          |
| Failure loop circuit breaker | Stops retry loops and flags cheating behaviors after repeated tool failures |
| Completion gating            | Rejects explanation-only or prototype-grade completions on execution routes |

## Where It's Implemented

| Implementation                | File                                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Shared prompt constraints     | `source/shared/constraints.md`                                                                                                |
| Claude failure loop           | `claude/hooks/scripts/post/failure-circuit.mjs`                                                                               |
| Claude route-aware stop hooks | `claude/hooks/scripts/post/stop-scan.mjs`, `claude/hooks/scripts/post/subagent-scan.mjs`                                      |
| Copilot failure loop          | `copilot/hooks/scripts/openagentsbtw/post/failure-circuit.mjs`                                                                |
| Copilot route/stop gates      | `copilot/hooks/scripts/openagentsbtw/session/_route-context.mjs`, `copilot/hooks/scripts/openagentsbtw/post/_stop-shared.mjs` |

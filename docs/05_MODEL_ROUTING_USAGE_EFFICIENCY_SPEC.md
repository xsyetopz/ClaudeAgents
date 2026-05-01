# 05 — Model Routing and Usage Efficiency Specification

## Goal

Maximize useful work per weekly usage unit. Do not maximize model size or reasoning effort by default.

The model router should answer five questions for every route:

1. Which provider is active?
2. Which subscription class is active?
3. Which model role does the task require?
4. Which effort level is justified?
5. Should the task escalate, split, or downgrade?

## Global policy

1. Default to `medium` for serious coding work.
2. Use `low` for retrieval, formatting, docs polishing, command generation, and routine test execution.
3. Use `high` for architecture, security review, nontrivial implementation, and repeated failure analysis.
4. Use `xhigh` only as break-glass for Codex and Claude Opus 4.7; never default it in Plus or Pro plans.
5. Use Claude `max` only for explicit session override; never persist it in normal generated configs.
6. Use large-context `[1m]` variants only when the task requires large context. Do not use `[1m]` as a quality default.
7. Escalate by evidence, not by user frustration. A failed test, unresolved ambiguity, cross-package refactor, or security-sensitive review can justify escalation. Emotional urgency does not.

## Codex model roles

User-provided candidate models:

- `gpt-5.5`
- `gpt-5.4`
- `gpt-5.3-codex`

Recommended OAL model roles:

| Model role       |                Default model | Default effort | Escalation | Use                                              |
| ---------------- | ---------------------------: | -------------: | ---------: | ------------------------------------------------ |
| `orchestration`  |                    `gpt-5.5` |         medium |       high | Multi-agent planning and final synthesis.        |
| `architecture`   |                    `gpt-5.5` |         medium |       high | Tradeoffs, API shape, refactors.                 |
| `implementation` |              `gpt-5.3-codex` |         medium |       high | Code edits, bug fixes, migrations.               |
| `review`         | `gpt-5.5` or `gpt-5.3-codex` |         medium |       high | Correctness/security/regression review.          |
| `utility`        |                    `gpt-5.4` |            low |     medium | Search summaries, docs polish, command assembly. |
| `validation`     |                    `gpt-5.4` |            low |     medium | Test running, failure triage.                    |
| `documentation`  |                    `gpt-5.4` |            low |     medium | README/ADR/changelog updates.                    |
| `taste-design`   |                    `gpt-5.5` |         medium |       high | UI design decisions and anti-slop review.        |

If `gpt-5.5` is scarce, route `review` to `gpt-5.3-codex` for code-level findings and reserve `gpt-5.5` for synthesis and architecture.

## Codex plan matrix

### Plus

Plus users need deficit prevention. The plan should stay conservative.

| Route       | Model           |     Effort | Notes                                           |
| ----------- | --------------- | ---------: | ----------------------------------------------- |
| Explore     | `gpt-5.4`       |        low | Search first, cite files.                       |
| Plan        | `gpt-5.5`       |     medium | High only for multi-package architecture.       |
| Implement   | `gpt-5.3-codex` |     medium | High after one failed medium attempt.           |
| Review      | `gpt-5.3-codex` |     medium | High for security/regression.                   |
| Test        | `gpt-5.4`       | low/medium | Run commands; model need is modest.             |
| Docs        | `gpt-5.4`       |        low | Use Caveman/RTK only on final prose if desired. |
| Orchestrate | `gpt-5.5`       |     medium | Max two subagents by default.                   |

No `xhigh` in default Plus plans.

### Pro 5x

Pro 5x can run more high-effort work but should still avoid waste.

| Route       | Model           |      Effort | Notes                                |
| ----------- | --------------- | ----------: | ------------------------------------ |
| Explore     | `gpt-5.4`       |  low/medium | Medium for unclear architecture.     |
| Plan        | `gpt-5.5`       | medium/high | High allowed for large decisions.    |
| Implement   | `gpt-5.3-codex` | medium/high | High for cross-module changes.       |
| Review      | `gpt-5.5`       | medium/high | High for release/security gates.     |
| Test        | `gpt-5.4`       |      medium | Escalate to Codex for test-fix loop. |
| Docs        | `gpt-5.4`       |  low/medium | Medium for API docs/ADRs.            |
| Orchestrate | `gpt-5.5`       |      medium | 3–4 subagents maximum by default.    |

### Pro 20x

Pro 20x should not mean “everything high.” The advantage is parallelism, larger task batch size, and a bigger escalation budget.

| Route       | Model                        |                       Effort | Notes                             |
| ----------- | ---------------------------- | ---------------------------: | --------------------------------- |
| Explore     | `gpt-5.4`                    |                       medium | Parallel exploration allowed.     |
| Plan        | `gpt-5.5`                    |          high when justified | Medium remains default.           |
| Implement   | `gpt-5.3-codex`              | high for real implementation | Medium for small diffs.           |
| Review      | `gpt-5.5`                    |                         high | Security/release gates.           |
| Test        | `gpt-5.4` or `gpt-5.3-codex` |                       medium | High only for unresolved failure. |
| Docs        | `gpt-5.4`                    |                   low/medium | Do not burn high effort on copy.  |
| Orchestrate | `gpt-5.5`                    | high for complex multi-agent | Still budgeted.                   |

If users are 20–40% in weekly deficit even on 20x, reduce default effort before reducing task count. Most likely culprits are accidental xhigh, excessive orchestration, long final answers, repeated tool-output ingestion, and rewriting layers.

## Codex break-glass `xhigh` policy

`xhigh` is allowed only when all conditions are true:

1. The task is architecture/security/release-critical or has failed at high effort.
2. The route has produced concrete evidence of uncertainty or repeated failure.
3. The user is not in weekly usage deficit.
4. The run is single-turn or single-subtask scoped.
5. The model plan contains an explicit budget exception.

Record format:

```toml
[[exceptions]]
id = "codex-xhigh-breakglass"
models = ["gpt-5.5", "gpt-5.3-codex"]
effort = "xhigh"
allowed_routes = ["plan", "review", "debug"]
requires_reason = true
ttl_turns = 1
budget_guard = "disallow_when_weekly_deficit"
```

## Claude model plan

User-provided supported Claude Code models:

- `claude-opus-4-7[1m]`
- `claude-opus-4-7`
- `claude-opus-4-6[1m]`
- `claude-opus-4-6`
- `claude-sonnet-4-6`
- `claude-haiku-4-5`

Claude Code settings expose `effortLevel` for low/medium/high/xhigh/max. Opus 4.7 supports xhigh; Opus 4.6 and Sonnet 4.6 support low/medium/high/max with xhigh falling back to high. V4 should set effort only when the plan explicitly owns it; otherwise allow Claude Code defaults.

### Claude Max 5x

| Role            | Model                        |           Effort | Notes                                      |
| --------------- | ---------------------------- | ---------------: | ------------------------------------------ |
| Athena/Odysseus | `claude-opus-4-7`            | high when needed | Avoid `[1m]` unless context demands.       |
| Hephaestus      | `claude-sonnet-4-6`          |      medium/high | Sonnet is the workhorse.                   |
| Nemesis/Themis  | `claude-opus-4-7` or Sonnet  |             high | Use Opus for hard audit.                   |
| Hermes/Artemis  | `claude-sonnet-4-6`          |           medium | Read-only tracing.                         |
| Atalanta        | `claude-haiku-4-5` or Sonnet |       low/medium | Cheap test parsing; Sonnet for root cause. |
| Calliope        | `claude-haiku-4-5` or Sonnet |       low/medium | Docs/copy.                                 |

### Claude Max 20x

Max 20x should permit more Opus escalation and more subagent concurrency, but still avoid `[1m]` and `max` as defaults.

| Role            | Model               |                          Effort | Notes                                   |
| --------------- | ------------------- | ------------------------------: | --------------------------------------- |
| Athena/Odysseus | `claude-opus-4-7`   |                            high | `xhigh` only for huge decisions.        |
| Hephaestus      | `claude-sonnet-4-6` | high for complex implementation | Routine edits medium.                   |
| Nemesis/Themis  | `claude-opus-4-7`   |                      high/xhigh | Security/release review.                |
| Hermes/Artemis  | `claude-sonnet-4-6` |                          medium | Keep cheaper.                           |
| Atalanta        | Sonnet or Haiku     |                          medium | Avoid Opus for simple test runs.        |
| Calliope        | Sonnet or Haiku     |                      low/medium | Avoid high unless docs are contractual. |

## OpenCode model plan

OpenCode uses `provider/model` IDs in config. It supports global `model`, `small_model`, command-level model overrides, and agent-level model configuration. V4 should use agent-level model config for OAL roles and `small_model` for title/lightweight tasks.

Suggested rules:

1. Keep `model` as the main build/plan default.
2. Set `small_model` to the cheapest reliable model available on the selected provider.
3. For OAL-generated commands, set `agent` and `model` explicitly when the route should not use default.
4. For OpenCode, prefer permissions and primary/subagent mode over prompt-only discipline.

## Budget ledger

V4 should maintain an optional local ledger under `.oal/usage/ledger.jsonl`.

Each route run records:

```json
{
  "timestamp": "2026-05-01T00:00:00Z",
  "surface": "codex",
  "route": "implement",
  "agent": "hephaestus",
  "model": "gpt-5.3-codex",
  "effort": "medium",
  "turns": 8,
  "tool_calls": 17,
  "files_changed": 4,
  "verification": "passed",
  "escalated": false
}
```

The ledger does not need exact provider billing. It only needs relative budget pressure.

## Deficit guards

When a user crosses a budget pressure threshold:

| Budget state | Behavior                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------- |
| Normal       | Default plan.                                                                                  |
| Watch        | Downgrade docs/explore to low; warn before high orchestration.                                 |
| Deficit      | Block xhigh/max; cap subagents; use Caveman final responses; require explicit opt-in for high. |
| Critical     | Utility-only unless user overrides; no broad multi-agent runs.                                 |

## Output-token policy

Usage drain often comes from verbose responses, not just model reasoning. V4 should enforce:

1. `model_verbosity = "low"` on Codex by default.
2. Caveman-lite or concise final response mode for deficit users.
3. Long docs go to files, not chat bodies.
4. Tool output summaries should be compressed before reinjection.
5. Review findings should be findings-first, not essay-first.

## Model-router acceptance tests

1. Every route resolves a model, effort, verbosity, and permission profile.
2. No default plan emits xhigh/max.
3. Pro 20x differs from Pro 5x through concurrency/escalation allowance, not blanket high effort.
4. Claude `[1m]` is used only when `context_requirement = "large"`.
5. A weekly-deficit fixture downgrades non-critical tasks and blocks xhigh.
6. A failed high-risk review fixture triggers allowed escalation.

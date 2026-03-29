# Codex Model Strategy

As of March 29, 2026, there are two relevant sources for Codex model policy:

- official OpenAI model docs, which describe the broader model lineup
- local Codex CLI `/model` output, which is the source of truth for what the installed Codex client actually exposes

On this machine, the local Codex CLI exposes:

- `gpt-5.4`
- `gpt-5.4-mini`
- `gpt-5.3-codex`
- `gpt-5.3-codex-spark`
- `gpt-5.2-codex`
- `gpt-5.2`
- `gpt-5.1-codex-max`
- `gpt-5.1-codex-mini`

That local list is an observation from the Codex CLI, not an official OpenAI docs page. It is the reason openagentsbtw still uses `gpt-5.1-codex-mini` for the small Codex profile.

The broader official OpenAI model docs still support the split we need:

- `gpt-5.4`
  Flagship GPT-5 model with the largest context budget. Source: <https://developers.openai.com/api/docs/models/gpt-5.4>
- `gpt-5.2`
  General-purpose GPT-5 model used here as the stable default for planning, review, and normal Codex sessions. Source: <https://developers.openai.com/api/docs/models/gpt-5.2>
- `gpt-5.2-codex`
  Codex-specialized model used here for implementation-heavy paths. Source: <https://developers.openai.com/api/docs/models/gpt-5.2-codex>
- `gpt-5.4-mini`
  Smaller GPT-5.4 model retained for lighter secondary roles. Source: <https://developers.openai.com/api/docs/models/gpt-5.4-mini>

## Policy

openagentsbtw is now `5.2`-first for Codex. That is an openagentsbtw routing decision, not a claim that one OpenAI model is universally better for every task.

The reasons for the policy are operational:

- lower latency than the previous `5.4`-heavy path
- better instruction stability than `xhigh`-style flagship routing for routine work
- better fit for wrapper-based planning, review, and implementation splits

`gpt-5.4` remains available, but only in the explicit `pro` path where larger-context planning or orchestration is actually wanted.

## Presets

openagentsbtw uses two install presets plus one optional lightweight profile:

- `plus`
  Default preset. Uses `gpt-5.2` for the main interactive session and `gpt-5.2` / `gpt-5.2-codex` for the primary custom agents.
- `pro`
  Explicit opt-in preset. Keeps `gpt-5.4` for `athena` and `odysseus`, while implementation-heavy roles still stay on the `5.2` path.
- `codex-mini`
  Extra manual profile for narrow extraction, ranking, classification, and other bounded high-volume work.

These are openagentsbtw presets, not official OpenAI entitlement checks. The installer does not attempt to verify a user’s OpenAI plan.

## Agent Mapping

### `plus`

- `athena`: `gpt-5.2` with `high`
- `hephaestus`: `gpt-5.2-codex` with `high`
- `nemesis`: `gpt-5.2` with `high`
- `odysseus`: `gpt-5.2` with `high`
- `hermes`: `gpt-5.2-codex` with `medium`
- `atalanta`: `gpt-5.4-mini` with `medium`
- `calliope`: `gpt-5.4-mini` with `medium`

### `pro`

- `athena`: `gpt-5.4` with `high`
- `hephaestus`: `gpt-5.2-codex` with `high`
- `nemesis`: `gpt-5.2` with `high`
- `odysseus`: `gpt-5.4` with `high`
- `hermes`: `gpt-5.2-codex` with `medium`
- `atalanta`: `gpt-5.4-mini` with `medium`
- `calliope`: `gpt-5.4-mini` with `medium`

## Wrapper Routing

Wrapper routing is stricter than the base profile mapping:

- `plan` and `orchestrate` follow the selected tier through `openagentsbtw`
- `implement` and `accept` force `gpt-5.2-codex` with `high`
- `review` forces `gpt-5.2` with `high`
- `triage`, `deepwiki`, `docs`, `desloppify`, `handoff`, and `test` stay on `openagentsbtw-codex-mini`

That split is intentional. The wrapper contract is where we enforce the fast daily-driver path without taking away the explicit `pro` option.

## Reasoning Defaults

openagentsbtw treats `high` as the default ceiling for important work. We do not use `xhigh` by default.

Reasoning policy:

- planning/orchestration: `high`
- implementation/review: `high`
- exploration/docs/tests: `medium`
- lightweight manual profile: `low`

Rationale:

- `high` is the stable default for long sessions
- `xhigh` remains a manual escalation for unusually hard problems
- defaulting to `xhigh` increases latency, context churn, and overreach risk for ordinary work

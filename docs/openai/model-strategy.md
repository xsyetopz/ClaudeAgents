# Codex Model Strategy

As of April 9, 2026, openagentsbtw treats ChatGPT/Codex plans as **framework presets**, not entitlement checks. The installer does not try to verify a user’s OpenAI subscription.

## Core split

- `gpt-5.4-mini`
  Budget and bounded-utility route for `go`, and the non-Pro utility route for `plus`.
- `gpt-5.3-codex`
  Implementation-heavy and long-running coding route.
- `gpt-5.2`
  High-reasoning planning, review, and orchestration route on the Pro plans.
- `gpt-5.3-codex-spark`
  Lightweight Pro-only utility route.

## Plan presets

- `go`
  Main profile on `gpt-5.4-mini` with `high` reasoning, implementation on `gpt-5.3-codex`, conservative swarming.
- `plus`
  Main and implementation on `gpt-5.3-codex`, with `xhigh` reasoning on the main route and `medium` utility reasoning, standard swarming.
- `pro-5`
  Main planning/review/orchestration on `gpt-5.2` with `xhigh` reasoning, implementation on `gpt-5.3-codex`, utility on `gpt-5.3-codex-spark`.
- `pro-20`
  Same model family split as `pro-5`, with `xhigh` main reasoning, `medium` utility reasoning, and more aggressive swarming.

## Agent mapping

Custom agent TOMLs are installed from this repo, then rewritten for the selected plan:

- `athena`, `nemesis`, `odysseus`
  Use the selected plan’s main model.
- `hephaestus`
  Uses the implementation model.
- `hermes`, `atalanta`, `calliope`
  Use the utility model.

## Wrapper routing

- `plan`, `review`, `orchestrate`
  Use the stable `openagentsbtw` main profile for the selected plan.
- `implement`, `accept`, `longrun`
  Use the implementation model.
- `resume`
  Uses native `codex resume` with the managed `openagentsbtw` profile and openagentsbtw continuity defaults still active.
- `triage`, `explore`, `trace`, `debug`, `docs`, `desloppify`, `handoff`, `test`, `qa`
  Use `openagentsbtw-codex-mini`.

`gpt-5.3-codex-spark` is reserved for `pro-5` and `pro-20`. `go` and `plus` never materialize Spark in managed config.

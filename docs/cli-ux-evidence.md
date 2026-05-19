# Olympi CLI and product-shape evidence note

This note records the evidence used before reshaping the CLI. It is intentionally
about workflows, not a list of attractive command names.

## Current Olympi evidence

- `package.json` is private, has root `bin.olympi` pointing at
  `./packages/cli/src/cli.ts`, and source scripts run the same entrypoint with
  Bun. `packages/cli/package.json` is also private and exposes the same binary
  for the workspace package.
- Domain package responsibilities are already separated: `lifecycle` owns
  package inspection/evaluation, install/uninstall state, manifest/lock/audit,
  project status, and goal-loop state; `safety` owns policy, hooks, sandbox,
  broker, quota, and audit decisions; `trust` owns executable trust proof;
  `reporting` owns reports, handoff, acceptance, compaction, and catalogs;
  `authoring` owns first-party resources, prompt contracts, plan/diff review
  artifacts, module gates, mutation queues, and skill registry; `extensions`
  owns first-party extension skeletons and the Aegis entrypoint; `cli` should
  only route arguments and process I/O.
- The existing top level exposed implementation details as commands:
  `catalog`, `context`, `compact`, `rtk`, `quota`, `lock`, `profile`, `hooks`,
  `sandbox`, `broker`, `trust`, `resources`, `prompt`, `review`, `handoff`,
  `module`, `plan`, plus aliases such as `spec`, `state`, `check`, `accept`,
  `risk`, `eval`, and `package-evaluate`.
- Real implemented workflows are: inspect/evaluate Pi packages; install and
  uninstall project-local manifest-owned Pi resources; inspect status/setup;
  generate reports and handoff/acceptance artifacts; run policy/sandbox/trust
  diagnostics; validate first-party resources and package authoring artifacts;
  and use package APIs for goal loops, hooks, skills, provenance, verification,
  blockers, and executable trust gates.
- The current interactive wrapper is human-present and already requires dry-run
  output plus confirmation before applying install/uninstall or extension
  creation. Its problem is product positioning: it leads with package-helper
  wording instead of harness workflow wording.

## `oal_legacy` evidence

- `oal_legacy/packages/cli/src/main.ts` had a small public surface for the old
  compiler/deployer model: `setup`, `state`, `check`, `preview`, `render`,
  `deploy`, `uninstall`, `plugins`, `inspect`, `mcp`, `bin`, and a Codex helper
  for launch/agent/route/peer workflows.
- `oal_legacy/source/routes/orchestrate.json` captured the useful harness idea:
  split independent work across agents with non-overlapping paths, parent-owned
  evidence integration, and one verified outcome. It also warned against
  uncontrolled fan-out.
- `oal_legacy/source/hooks/*` includes useful guardrail patterns: require
  completion evidence, require execution/source evidence, block unsafe commands,
  block secret/env access, block generated drift, and block repeated failures.
- `oal_legacy/docs/oal-lessons.md` says to retain source-backed claims,
  manifest ownership, dry-run before apply, runtime hooks as behavior,
  completion evidence, blocked-state reports, bounded delegation, and short
  continuation records; it rejects provider-rendered artifacts as the active
  product model, default global install, untrusted executable loading, and
  uncontrolled worker fan-out.

## OpenAI Codex evidence

- Codex CLI positions itself as a local coding agent that can inspect, edit, and
  run code in the selected directory; the default command starts the interactive
  terminal experience, while automation is explicit through the `exec`
  subcommand.
- Current Codex command naming separates human-present use from automation and
  diagnostics: default interactive; `exec` for non-interactive work; `review` for
  a dedicated reviewer; `resume`/`fork` for session continuity; `doctor`,
  `sandbox`, `features`, `mcp`, and `debug` for scoped support surfaces. Internal
  commands are hidden in the repo source.
- Codex approval/security docs keep human approval as the normal route for
  approval requests and make no-prompt behavior explicit with
  `--ask-for-approval never`; no-prompt mode still combines with sandbox
  settings rather than removing gates.
- Codex configuration uses project-local config only after trust and supports
  approval policies, sandbox modes, hooks, MCP, skills, subagents, and profiles
  as configuration, not as a giant startup disclaimer.
- Codex workflow docs emphasize concrete task loops: give context, state a clear
  definition of done, reproduce/fix, run lint/tests, report commands and results,
  and rerun review after fixes.
- Codex skills use progressive disclosure: load skill metadata first and full
  instructions only when selected. This fits Olympi's `authoring` skill
  registry.

## NanoClaw evidence

- NanoClaw positions itself as a harness: a single host process routes work to
  per-agent-group containers, with each agent group having its own instructions,
  memory, skills, container, and allowed mounts.
- NanoClaw supports agent-team/swarm-like operation through multiple agent
  groups/channels and provider choice per agent group, but it is deliberately
  small and customized per user rather than a large generic framework.
- The security model is OS/container isolation, explicit mounts, credential
  injection through an external vault/proxy, and per-agent policies/rate limits;
  agents do not hold raw API keys.
- Human control is hybrid: scripted deterministic setup handles the happy path;
  when judgment is needed, a coding agent is invoked to diagnose and resume.
  NanoClaw explicitly avoids dashboards/debug UI beyond setup.
- Provider integration is skill-installed and per-fork/provider, not a permanent
  top-level command for every possible adapter.

## Concepts that fit Olympi

- Human-present operation by default, with explicit autonomous/no-prompt mode
  only when configured by the caller/provider.
- Project-local control: `.pi/olympi/**` state, manifest-owned writes,
  provenance/hash checks, and dry-run before apply.
- Bounded goal loops with blockers, verification gates, continuation state, and
  completion evidence.
- Policy-guarded execution: Themis decisions, hook vetoes, sandbox/trust probes,
  executable package gates, and read-only broker validation.
- Skills as progressive-disclosure workflow instructions and refinement based on
  repeated reviewer-confirmed failures.
- Agent teams only when the work has independent paths/evidence and a parent
  agent owns merge/review; no unbounded swarm default.
- Diagnostics behind explicit `status`, `report`, `safety`, or `debug` surfaces.

## Concepts that do not fit Olympi

- Copying Codex command names such as `exec`, `review`, or `resume` without an
  Olympi session runner behind them.
- Copying NanoClaw's messaging channels, Docker runner, or credential vault as
  top-level Olympi CLI features; Olympi currently supplies Pi harness state and
  policy, not a container host.
- Restoring legacy provider renderer/deploy commands or exposing every package
  utility as a public top-level command.
- Default autonomous operation. Autonomous mode remains explicit and still must
  satisfy policy, provenance, blocker, and verification gates.
- Startup safety-disclaimer banners. Safety detail belongs at the decision point
  or behind explicit status/diagnostic commands.

## Proposed Olympi command surface

Public command surface stays small and workflow-shaped:

- `olympi` / `olympi interactive`: human-present harness console.
- `olympi setup status`: onboarding and local harness readiness.
- `olympi status`: project-local Olympi/Pi state.
- `olympi verify`: normal harness verification gates.
- `olympi catalog`: user-facing command and policy capability discovery.
- `olympi package inspect|evaluate|risk <source>`: Pi package/resource intake.
- `olympi install <source> --project [--dry-run|--apply]`: project-local package
  install/stage workflow.
- `olympi uninstall <package-id> --project [--dry-run|--apply]`: manifest-backed
  removal workflow.
- `olympi report status|handoff|acceptance|package-risk ...`: durable reports.
- `olympi safety ...`: policy, hook, sandbox, trust, and broker decision
  surfaces.
- `olympi debug ...`: explicit development diagnostics for niche/internal
  reports, hidden from default help.

Verification is a core harness workflow because completion and autonomous/provider
operation depend on verification gates. The catalog is user-facing capability
discovery for the implemented command and policy surface. Neither belongs under
`debug`.

No hidden compatibility aliases are retained. Direct legacy forms such as
`inspect`, `evaluate`, `risk`, `spec`, `check`, `accept`, and
`package-evaluate` had no current supported caller after scripts and tests were
updated to canonical commands, so they are rejected as malformed usage. `catalog`
and `verify` are canonical public commands, not aliases. Merge
`plan install|uninstall` into `install|uninstall --dry-run`; do not keep a public
`plan` command. Move internal utilities behind `debug` or grouped
`safety`/`report` surfaces.

## Install invocation model

- Source development: `bun install --frozen-lockfile`; run with
  `bun run olympi -- --help` or `bun packages/cli/src/cli.ts --help`.
- Local development link: `bun link`, then ensure `$(bun pm bin -g)` is on
  `PATH`.
- Source-global binary: `bun install -g "$PWD" --production --ignore-scripts`
  from the checkout root, then ensure `$(bun pm bin -g)` is on `PATH`.
- The source-global command is correct for this private, unpublished source
  checkout because the root `bin.olympi` points at the checked-out Bun/TS
  entrypoint and there are no required lifecycle scripts. It is not a registry
  install and remains source-checkout-backed.
- Smoke test performed before implementation with isolated `BUN_INSTALL`:
  `bun install -g "$PWD" --production --ignore-scripts` succeeded and
  `olympi --help` ran successfully from the temporary global bin.

## Human-present and autonomous model

- Default mode is human-present: the user is available for decisions,
  confirmations, blockers, and review.
- Guided mutating flows continue to show a dry-run first and require explicit
  confirmation naming the package id and project `.pi` target.
- Autonomous/no-prompt operation is not implied by non-interactive output. It
  must be selected by configuration or a future explicit caller/provider mode,
  and it still must pass policy, provenance, blocker, and verification gates.
- Avoid awkward wording such as "human output"; use "human-present" and
  "autonomous mode" only with the meanings above.

## External sources inspected

- OpenAI Codex CLI/repo/docs: <https://github.com/openai/codex>,
  <https://developers.openai.com/codex>,
  <https://developers.openai.com/codex/cli>,
  <https://developers.openai.com/codex/cli/features>,
  <https://developers.openai.com/codex/agent-approvals-security>,
  <https://developers.openai.com/codex/config-basic>,
  <https://developers.openai.com/codex/hooks>,
  <https://developers.openai.com/codex/skills>,
  <https://developers.openai.com/codex/workflows>.
- OpenAI prompting/harness references:
  <https://developers.openai.com/api/docs/guides/prompting>,
  <https://developers.openai.com/api/docs/guides/prompt-guidance>,
  <https://openai.com/index/harness-engineering/>.
- NanoClaw: <https://github.com/nanocoai/nanoclaw>,
  <https://nanoclaw.dev/>.

## Alias removal audit

After the command surface was made canonical, the router and interactive wrapper
were audited for undocumented aliases. Package scripts, tests, docs, specs, CI
configuration, and internal tooling were searched for each legacy form. Supported
callers were moved to canonical commands before removal.

| Removed alias                                              | Former target                          | Former reason                                      | Current caller found      | Test/doc action                                                                                      |
| ---------------------------------------------------------- | -------------------------------------- | -------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `inspect`                                                  | `package inspect`                      | Previous top-level package helper                  | Tests only                | Tests updated to `package inspect`; rejection test added.                                            |
| `evaluate`                                                 | `package evaluate`                     | Previous top-level package helper                  | Tests only                | Tests updated to `package evaluate`; rejection test added.                                           |
| `eval`                                                     | `package evaluate`                     | Convenience alias                                  | None                      | Rejection test added.                                                                                |
| `risk`                                                     | `package risk` / `report package-risk` | Convenience alias                                  | None                      | Rejection test added.                                                                                |
| `catalog`                                                  | n/a                                    | Audited as core capability discovery, not an alias | Package script/tests/docs | Kept as canonical public command; no debug duplicate.                                                |
| `spec`                                                     | `debug catalog`                        | Legacy catalog/spec naming                         | None                      | Removed from router; rejection test added.                                                           |
| `state`                                                    | `status`                               | Previous status alias                              | None                      | Removed from router; rejection test added.                                                           |
| `verify`                                                   | n/a                                    | Audited as core verification gate, not an alias    | Package script/tests/docs | Kept as canonical public command; no debug duplicate.                                                |
| `check`                                                    | `debug verify`                         | Previous verify alias                              | None                      | Removed from router; rejection test added.                                                           |
| `accept`                                                   | `report acceptance`                    | Previous acceptance alias                          | Tests only                | Tests updated to `report acceptance`; rejection test added.                                          |
| `package-evaluate`                                         | `package evaluate`                     | Old command-file name exposed as command           | None                      | Removed from router; rejection test added.                                                           |
| `package eval`                                             | `package evaluate`                     | Subcommand convenience alias                       | None                      | Removed from grouped package router.                                                                 |
| `report risk`                                              | `report package-risk`                  | Subcommand convenience alias                       | None                      | Removed from report router.                                                                          |
| `setup` / `setup inspect`                                  | `setup status`                         | Default/convenience setup alias                    | None                      | `setup status` is now required.                                                                      |
| `debug spec`                                               | `catalog`                              | Old spec/catalog pairing                           | None                      | Removed from debug router; use canonical `catalog`.                                                  |
| `safety`                                                   | `safety check`                         | Default subcommand                                 | None                      | `safety check` is now required.                                                                      |
| `safety sandbox`                                           | `safety sandbox check`                 | Default nested subcommand                          | None                      | `safety sandbox check` is now required.                                                              |
| interactive `inspect`                                      | `package inspect`                      | Previous guided shortcut                           | None after tests updated  | Removed; interactive rejection test added.                                                           |
| interactive `evaluate` / `eval`                            | `package evaluate`                     | Previous guided shortcut                           | None after tests updated  | Removed; use `package evaluate`.                                                                     |
| interactive `extension`                                    | `debug extension` equivalent           | Hidden authoring shortcut                          | Tests only                | Removed from interactive; debug CLI remains documented.                                              |
| interactive `catalog`, `rtk`, `compact`, `verify`, `check` | CLI diagnostics/workflows              | Hidden diagnostic shortcuts                        | None                      | Removed from interactive; use canonical CLI forms (`catalog`, `verify`) or documented `debug` forms. |
| interactive `q` / `exit`                                   | `quit`                                 | Normal interactive controls                        | Interactive users/tests   | Restored and documented as public controls with `quit`.                                              |

The remaining accepted command paths are either public (`package`, `install`,
`uninstall`, `setup status`, `status`, `verify`, `catalog`, `report`, `safety`,
`interactive`) or explicitly documented under `debug`.

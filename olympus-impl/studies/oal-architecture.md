# Phase 00 Study — OAL Architecture

## Scope and status

This is a study-only record of the original OpenAgentLayer architecture as found in `/Users/krystian/CodeProjects/xsyetopz/OpenAgentLayer` during phase-00. No product files were moved, deleted, or rewritten.

OAL is a Bun/TypeScript monorepo that acts like a provider-native compiler for AI coding environments. Its central architectural loop is:

1. authored source records in `source/`
2. source loading and validation in `packages/source`
3. policy validation in `packages/policy`
4. provider rendering in `packages/adapter`
5. artifact metadata in `packages/artifact`
6. deploy planning/apply in `packages/deploy`
7. manifest ownership in `packages/manifest`
8. installed-state inspection in `packages/inspect`
9. plugin payload sync in `packages/plugins`
10. acceptance simulation in `packages/accept`

## Repository top-level map

| Path                                                                                                              | Observed role                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `.agents/`                                                                                                        | Provider/plugin state surface used by Codex marketplace flows                                                                              |
| `.claude-plugin/`                                                                                                 | Claude marketplace metadata for the OAL plugin                                                                                             |
| `.github/workflows/ci.yml`                                                                                        | CI quality, dry-run, and guarded Homebrew submission gates                                                                                 |
| `.pi/`                                                                                                            | Temporary Pi controller installed for Olympus phases                                                                                       |
| `ATTRIBUTIONS.md`, `PI-START.txt`, `OLYMPUS-BOOTSTRAP-README.md`                                                  | Olympus drop-in/bootstrap material                                                                                                         |
| `README.md`, `INSTALLATION.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE` | Active OAL public documentation and project policy                                                                                         |
| `package.json`, `bun.lock`, `bunfig.toml`                                                                         | Bun workspace and package-manager configuration                                                                                            |
| `biome.jsonc`, `tsconfig*.json`, `.editorconfig`                                                                  | Lint, format, and TypeScript quality configuration                                                                                         |
| `packages/`                                                                                                       | Workspace packages implementing source, adapter, deploy, CLI, acceptance, runtime hooks, policy, plugins, setup, toolchain, and inspection |
| `source/`                                                                                                         | Authored product source catalog: agents, skills, routes, hooks, tools, prompt templates, and support resources                             |
| `plugins/`                                                                                                        | Static provider plugin metadata payloads                                                                                                   |
| `prompts/`                                                                                                        | Codex base-instruction custom prompt surface                                                                                               |
| `specs/`                                                                                                          | Formal OAL product and internal architecture specifications                                                                                |
| `docs/`                                                                                                           | OAL user-facing and research documentation                                                                                                 |
| `tests/`                                                                                                          | Cross-package CLI/e2e tests                                                                                                                |
| `third_party/`                                                                                                    | Git submodules for reference/upstream skills and Gitleaks rules                                                                            |
| `patches/`                                                                                                        | Patch material applied to upstream Gitleaks config                                                                                         |
| `homebrew/`                                                                                                       | Homebrew cask release metadata                                                                                                             |
| `scripts/`                                                                                                        | Utility scripts, including Gitleaks sync and Olympus drop-in helpers                                                                       |
| `plans/`                                                                                                          | Empty planning area at inspection time                                                                                                     |
| `olympus-impl/`                                                                                                   | Temporary authoritative Olympus phase controller                                                                                           |

## Workspace/package layout

Root `package.json` defines a Bun workspace over `packages/*` and scripts such as `oal:check`, `oal:deploy`, `oal:accept`, `test`, `biome:check`, `gitleaks:check`, and `oal:toolchain`. Runtime dependencies include Commander, Clack prompts, OpenCode plugin APIs, and all internal `@openagentlayer/*` workspaces.

Package ownership observed:

| Package                     | Owner responsibility                                                               |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `@openagentlayer/source`    | Loads and validates the authored source graph from `source/`                       |
| `@openagentlayer/policy`    | Validates source graph, models, generated text, references, and product rules      |
| `@openagentlayer/adapter`   | Renders Codex, Claude Code, and OpenCode provider-native artifact sets             |
| `@openagentlayer/artifact`  | Defines artifact shape, provenance, hashing, writing, and drift comparison         |
| `@openagentlayer/deploy`    | Plans, applies, diffs, globally maps, backs up, and uninstalls artifacts           |
| `@openagentlayer/manifest`  | Defines manifest ownership entries and manifest paths                              |
| `@openagentlayer/runtime`   | Executable hook scripts, shared hook helpers, and privileged runtime helpers       |
| `@openagentlayer/cli`       | Commander CLI, interactive wrapper, command orchestration, profile/state handling  |
| `@openagentlayer/accept`    | Full product acceptance simulation and inventory checks                            |
| `@openagentlayer/plugins`   | Provider plugin payload sync and cache pruning                                     |
| `@openagentlayer/inspect`   | Shared read-only inspection report surface                                         |
| `@openagentlayer/setup`     | Setup planning across toolchain, deploy, plugins, and check phases                 |
| `@openagentlayer/toolchain` | OS/tool/optional-feature installation command planning                             |
| `packages/olympus/`         | Empty placeholder directory at phase-00 inspection; no active package metadata yet |

The dependency direction generally follows compiler flow: CLI orchestrates source, policy, adapter, deploy, setup, plugins, inspect, and acceptance; adapter consumes artifact/runtime/source; deploy consumes artifact/manifest/source; acceptance consumes almost every product package to prove integration.

## Source catalog model

`source/` is the authored intent layer. It contained:

- `source/product.json`: version `0.9.0-beta.1`, OAL product identity, Caveman mode, and global prompt contracts
- `source/prompts/*.md`: shared prompt templates for agents, skills, commands, instructions, and contracts
- `source/agents/*.json`: 23 Greek-named operational agents
- `source/routes/*.json`: 16 route/command records
- `source/skills/*.json`: 27 skills with support files and one upstream-verbatim skill (`impeccable`)
- `source/hooks/*.json`: 24 runtime hook records
- `source/tools/*.json`: 5 OpenCode custom tool records
- `source/skill-resources/**`: 60 support files and scripts bundled into generated skills

`packages/source/src/loader.ts` performs the source load:

1. read and validate `product.json`
2. load prompt templates
3. read skill shapes, hydrate upstream skills, hydrate support files, and validate hydrated skill records
4. read and validate routes, hooks, and tools
5. read agents and hydrate missing agent prompts from the shared agent template
6. return a `SourceGraph` with id sets and provenance paths

The records are intentionally simple: stable ids, provider allowlists, route/skill references, hook script/event mappings, tool bodies, and prompt/support-file payloads.

## Provider rendering architecture

`packages/adapter` owns provider-native rendering. `renderAllProviders` calls:

- `renderCodex`
- `renderClaude`
- `renderOpenCode`

Provider renderers filter source records by provider and emit `Artifact` objects with `{ provider, path, content, sourceId, executable?, mode }`. Artifact modes are `file`, `block`, and `config`.

Observed provider surfaces:

| Surface         | Codex                                                                 | Claude Code                                                    | OpenCode                                                    |
| --------------- | --------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| Config          | `.codex/config.toml`, `.codex/hooks.json`, `.codex/requirements.toml` | `.claude/settings.json`                                        | `opencode.jsonc`                                            |
| Agents          | `.codex/agents/*.toml`, including built-in overrides                  | `.claude/agents/*.md`                                          | `.opencode/agents/*.md` plus config entries                 |
| Skills          | `.codex/openagentlayer/skills/*/SKILL.md`                             | `.claude/skills/*/SKILL.md`                                    | `.opencode/skills/*/SKILL.md`                               |
| Routes/commands | route roster in `AGENTS.md`                                           | `.claude/commands/*.md`                                        | `.opencode/commands/*.md` and config entries                |
| Instructions    | `AGENTS.md` block plus Codex base-instruction file                    | `CLAUDE.md` block                                              | `.opencode/instructions/openagentlayer.md`                  |
| Hooks           | `.codex/openagentlayer/hooks/*.mjs` plus config/requirements wiring   | `.claude/hooks/scripts/*.mjs` plus settings/plugin hook wiring | `.opencode/openagentlayer/hooks/*.mjs` via plugin mediation |
| Tools           | explicit unsupported capability report                                | no direct custom tool surface                                  | `.opencode/tools/*.ts`                                      |
| Plugin payload  | Codex marketplace/cache roots                                         | Claude marketplace/cache roots                                 | OpenCode config plugin/cache roots                          |

Strong shared helpers exist for agent prompts, skill Markdown, command Markdown, instructions, hook artifact copying, privileged runtime copying, and model routing. Provider-specific renderers own file shape, config schema, model choice, event wiring, capability gaps, and plugin entrypoint expectations.

## Runtime hook architecture

Runtime hooks are executable behavior, not prompts. The source record must point to a script in `packages/runtime/hooks`. The adapter copies hook scripts and `_*.mjs` support modules into provider-native paths. Tests and acceptance execute fixture payloads.

Hook categories include RTK command enforcement, destructive command safety, secret file/output guards, generated artifact drift/edit guards, route/completion/source evidence gates, context injection, repeated failure detection, large diff warnings, demo/sentinel/caveman guards, and privileged execution support.

`packages/runtime/hooks/_runtime.mjs` is the shared runner pattern for reading provider payloads, inferring provider/event, evaluating pass/warn/block decisions, and formatting provider-shaped output. OpenCode hooks are mediated through a rendered TypeScript plugin that calls selected shared policy helpers.

## CLI and interactive architecture

`packages/cli/src/main.ts` defines a Commander CLI named `oal`. The command surface observed includes:

- `accept`
- `check`
- `setup`
- `profiles`
- `state`
- `bin`
- `codex`
- `codex-usage`
- `preview`
- `render`
- `deploy`
- `uninstall`
- `plugins`
- `toolchain`
- `features`
- `rtk-gain`
- `rtk-report`
- `roadmap-evidence`
- `inspect`
- `provider-e2e`
- `mcp`
- default `interactive`

Provider-aware commands accept `all`, `codex`, `claude`, `opencode`, or comma-separated provider sets. Shared render options include provider, scope, home, model plans, Codex orchestration settings, OpenCode model source, and Caveman mode.

The interactive path is a high-level wrapper over low-level commands; it uses Clack prompts, workflow categories, profile reuse, provider prompts, and low-level argument construction.

## Install/deploy/uninstall architecture

OAL has multiple install/setup paths:

- source checkout (`bun install --frozen-lockfile`, `bun run oal:check`)
- `install.sh` source-checkout convenience wrapper
- `install-online.sh` clone/stage/install wrapper
- Homebrew cask metadata in `homebrew/Casks/openagentlayer.rb`
- `oal setup` orchestration over toolchain/deploy/plugins/check
- `oal deploy` project/global artifact deploy
- `oal plugins` provider plugin payload sync
- `oal bin` executable shim install/remove

Deploy is intentionally two phase:

1. `planDeploy(targetRoot, artifacts)` reads current files and creates `DeployChange[]`, artifact list, and manifest
2. `applyDeploy(plan)` writes files, merges blocks/configs, creates backups, chmods executable artifacts, and writes per-provider manifests

Manifest-backed uninstall is the central safety property. `uninstall(targetRoot, provider)` reads only that provider's manifest and removes/updates only manifest-owned files, blocks, or structured config keys. Unowned lookalike files are not authority.

## Generated artifact policy

Generated provider artifacts are disposable and reproducible from `source/` plus renderer code. `packages/artifact` adds provenance comments where file formats support it, hashes exact content, writes artifact sets, and compares installed files for drift.

Generated/deploy-sensitive paths are guarded by:

- artifact provenance comments and source ids
- `.gitignore` entries for build/generated output
- runtime hooks such as generated edit/drift blockers
- acceptance drift fixtures
- manifest entry count checks
- uninstall preservation fixtures

## Acceptance and verification architecture

`bun run oal:accept` executes the full product simulation. It loads source, validates policy, checks inventories, verifies docs/spec links, checks CLI behavior, runs installed CLI smoke, renders all providers, checks generated artifacts, deploys to a temporary target root, validates configs, runs hook/tool/skill fixtures, checks drift, uninstalls providers, and verifies user-owned config/blocks remain.

Other validation layers include:

- `bun test packages/*/__tests__/*.test.ts tests/*.test.ts`
- TypeScript `tsc --noEmit`
- Biome lint/format checks
- Gitleaks rule sync check
- RTK gain policy fixtures
- Homebrew cask syntax check
- GitHub Actions quality and dry-run jobs

## Documentation/specification architecture

`specs/` is unusually strong for an agent product. It describes product contract, source/render/deploy, provider surfaces, runtime hooks, internal architecture, acceptance, and reference evidence. `docs/` and README/INSTALLATION describe user setup and behavior. The specs align with the code architecture and should be protected as reference material during Olympus design.

## Architecture takeaways for Olympus

Re-authorable strengths:

- source intent separated from rendered provider artifacts
- explicit provider-native adapters
- artifact metadata and manifest-backed ownership
- deploy planning before mutation
- acceptance as an end-to-end product simulation
- executable hooks with fixtures
- shared inspection surfaces
- durable state/profile concepts
- rich route/skill/agent catalogs with support resources

Architecture to avoid carrying forward by inertia:

- OAL's broad multi-provider ambition if Olympus is Pi-first
- legacy OAL naming and compatibility framing
- provider-specific feature complexity that does not map to PiCodingAgent harness extension needs
- shell/RTK assumptions unless they are re-justified under Pi
- empty or half-started Olympus package placeholders until phase-01 defines their owner contract

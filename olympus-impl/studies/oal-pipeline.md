# Phase 00 Study — OAL Pipeline

## Pipeline summary

OAL's pipeline is compiler-like:

```text
source catalog -> source graph -> policy validation -> provider renderers -> artifacts -> deploy plan -> apply/manifest -> inspect/acceptance -> uninstall
```

The pipeline is supported by package scripts, CI, installers, plugin sync, runtime hooks, and release metadata checks.

## 1. Source authoring

Authoritative product intent lives in `source/`:

- `product.json` defines version, product identity, Caveman mode, and global prompt contracts
- `prompts/*.md` define shared prompt templates
- `agents/*.json` define Greek agent records with providers, role, triggers, non-goals, tools, skills, routes, models, and optional prompt
- `skills/*.json` define skill records, upstream sources, and support files
- `routes/*.json` define command/route contracts with permissions and arguments
- `hooks/*.json` define hook id, runtime script, providers, and provider event maps
- `tools/*.json` define OpenCode custom tool records
- `skill-resources/**` carries support files bundled into generated skills

Current catalog counts observed in phase-00:

| Catalog area         | Count |
| -------------------- | ----: |
| Agents               |    23 |
| Routes               |    16 |
| Skills               |    27 |
| Hooks                |    24 |
| OpenCode tools       |     5 |
| Prompt templates     |     6 |
| Skill resource files |    60 |
| Runtime hook files   |    38 |

## 2. Source load and hydration

`packages/source` owns source loading. `loadSource(sourceRoot)` performs:

1. read `source/product.json`
2. validate product identity and prompt contracts
3. read prompt templates from `source/prompts`
4. read skill records, validate shape, hydrate upstream skills, hydrate support files, and validate hydrated records
5. read route records
6. read hook records
7. read tool records
8. read agent records and hydrate missing prompts from `agent-prompt.md`
9. create a `SourceGraph` with id sets and provenance entries

Important behavior:

- source ids must be unique per record directory
- provider lists must contain only `codex`, `claude`, or `opencode`
- skill ids must use lowercase hyphen format
- support files must live under `scripts`, `references`, `reference`, or `assets`
- upstream skill bodies are loaded by path from outside `source/`

## 3. Policy validation

`packages/policy` validates the source graph and generated text before release-grade behavior. The specs and tests show checks around model choices, source references, generated prompt quality, route/skill references, hook shape, and product text. Acceptance calls `assertPolicyPass(validateSourceGraph(graph))` before rendering.

## 4. Provider rendering

`packages/adapter` renders provider-native artifacts. `renderAllProviders(source, repoRoot, options)` calls provider renderers for Codex, Claude Code, and OpenCode, combines artifact sets, and carries unsupported capability records.

Common artifact type:

```ts
interface Artifact {
  provider: Provider;
  path: string;
  content: string;
  sourceId: string;
  executable?: boolean;
  mode: "file" | "block" | "config";
}
```

Rendering decisions observed:

- Codex renderer emits TOML config, hook config/requirements, base instruction file, shell shims, TOML agents, built-in agent overrides, skills, `AGENTS.md` block, hooks, and privileged runtime helpers
- Claude renderer emits JSON settings, Markdown agents, skills, Markdown commands, `CLAUDE.md` block, hooks, and privileged runtime helpers
- OpenCode renderer emits JSONC config, Markdown agents/commands, skills, TypeScript tools, plugin TypeScript, instruction Markdown, hooks, and privileged runtime helpers
- Skill renderer produces `SKILL.md` and support files for each provider skill surface
- Hook renderer copies executable runtime scripts and `_*.mjs` support modules to provider paths
- Privileged runtime renderer copies privileged helper scripts to provider paths
- Model-routing options alter provider model selection and Codex orchestration settings

## 5. Artifact metadata and drift policy

`packages/artifact` owns:

- artifact hashing by SHA-256 over exact content
- provenance comments for Markdown, JSONC, and TOML
- artifact writing
- artifact comparison/drift detection
- combining artifact sets

Artifacts are generated output. They should not become source truth. Drift checks compare installed file artifacts against freshly rendered content.

## 6. Deploy planning

`packages/deploy/src/plan.ts` creates a `DeployPlan` with:

- target root
- manifest root
- scope (`project` or `global`)
- changes (`write`, `update`, `skip`, etc.)
- rendered artifacts
- manifest generated from artifacts
- backup list

Planning reads current target files and chooses write/update/skip based on content hashes. It does not mutate targets.

## 7. Apply behavior

`applyDeploy(plan)` iterates artifacts and writes merged content:

- `file` artifacts replace whole OAL-owned files
- `block` artifacts insert/replace marked OAL blocks
- `config` artifacts deep-merge JSON/JSONC or preserve selected TOML user-owned lines
- executable artifacts receive mode `0755`
- backups are created before replacing non-empty existing targets where needed
- per-provider manifests are written under `.oal/manifest/<provider>.json` or `.openagentlayer/manifest/global/<provider>.json`

## 8. Global mapping

Global deploy maps provider-relative artifacts into provider homes. Examples from specs/README:

- Codex global home uses `.codex/*` and plugin/cache surfaces
- Claude global home uses `.claude/*`
- OpenCode global home uses `.config/opencode/*` for plugins and `opencode.jsonc`/`.opencode` style project artifacts where appropriate

The exact mapping lives in `packages/deploy/src/global.ts` and CLI scope handling.

## 9. Manifest ownership and uninstall

`packages/manifest` creates ownership entries from artifacts. Entries include provider, scope, path, mode, hash, source id, executable flag, structured keys, and block marker where applicable.

Uninstall uses only manifest entries as authority:

1. read the provider manifest
2. for block entries, remove the marked block and keep user content
3. for whole files, remove only when current hash still matches manifest hash
4. for config entries, remove known structured keys
5. skip user-modified managed files
6. remove provider manifest

This is one of OAL's strongest safety patterns and should be re-authored for Olympus if Olympus writes user/project files.

## 10. Plugin payload sync

`packages/plugins` syncs provider plugin payloads into user homes. It copies static metadata from `plugins/<provider>/openagentlayer`, renders provider artifacts, filters plugin-suitable artifacts, writes versioned cache entries, writes marketplace/activation metadata, prunes stale OAL caches, and removes stale legacy plugin traces.

Provider behavior:

- Codex: `.codex/plugins/openagentlayer`, `.codex/plugins/cache/openagentlayer-local/oal/<version>`, `.agents/plugins/marketplace.json`, best-effort native marketplace activation
- Claude: `.claude/plugins/marketplaces/openagentlayer`, `.claude/plugins/cache/openagentlayer/openagentlayer/<version>`, generated plugin hook file
- OpenCode: `.config/opencode/plugins/openagentlayer`, `.config/opencode/plugins/cache/openagentlayer/<version>`

## 11. Setup pipeline

`packages/setup` plans setup phases:

1. optional toolchain/feature commands
2. deploy provider-native artifacts
3. sync provider plugin payloads
4. validate source/installed state

`oal setup` combines provider availability, target/scope resolution, profile/config state, optional features, toolchain planning, deploy, plugins, bin install, and installed-state checks.

Provider binaries are treated as optional where possible. Missing CLIs should skip provider-native activation rather than prevent rendering/deploy paths that do not need them.

## 12. CLI pipeline

The CLI package orchestrates all major flows:

- `check`: load source, validate policy, prove renderability, optional installed state
- `preview`: render selected artifacts and optionally print content
- `render`: write generated artifacts to an output directory
- `deploy`: render, plan, optionally diff/dry-run, then apply
- `uninstall`: remove manifest-owned provider material
- `setup`: toolchain/deploy/plugin/bin/check wrapper
- `plugins`: sync plugin payloads
- `profiles`/`state`: durable setup state and deploy/removal inspection
- `inspect`: shared capability/manifest/diff/policy/release reports
- `mcp`: stdio MCP servers for docs/inspect surfaces
- `codex`, `codex-usage`, `rtk-*`, `toolchain`, `features`, `accept`, `provider-e2e`: supporting operational workflows

## 13. Acceptance pipeline

`packages/accept/src/index.ts` is the authoritative release simulation. It performs:

1. load source
2. policy validation
3. source/style/checklist/repository inventory checks
4. codebase shape and docs/spec checks
5. Homebrew, CI, Codex upstream patch, plugin marketplace, version, and RTK fixture checks
6. CLI contract checks and installed CLI smoke
7. render all providers
8. require substantial artifact count (`>100` at inspection time)
9. validate artifact contracts and generated text
10. create manifest and assert one entry per artifact
11. seed a temporary target with user-owned provider files
12. deploy all artifacts
13. validate rendered configs, provider contracts, marked blocks, backups
14. run hook fixtures
15. run OpenCode tool fixtures
16. check skill support files
17. verify fresh deploy has no drift
18. manually edit a comparable artifact and verify drift appears
19. redeploy and uninstall each provider
20. assert owned files are gone and user config/blocks remain

## 14. CI pipeline

`.github/workflows/ci.yml` runs on push/PR to `master`:

- fetch and verify third-party submodules
- set up Bun `1.3.14`
- install RTK
- `bun install --frozen-lockfile`
- `tsc --noEmit`
- `gitleaks:check`
- unit/e2e tests
- full acceptance
- RTK gain fixture
- Biome check
- roadmap evidence
- Homebrew cask syntax
- render/deploy dry-run job
- installed CLI smoke job
- guarded Homebrew submission on master with credentials

## 15. Generated artifact policy in practice

Generated artifacts are protected by several layers:

- source records are the intent source of truth
- renderers are the only active generators
- provenance comments connect artifacts to source ids
- deploy creates manifests for ownership
- runtime hooks block generated edits/drift in providers that support them
- acceptance verifies drift before and after manual edits
- `.gitignore` excludes `generated/`, `dist/`, `node_modules/`, and other build/cache outputs

## Pipeline takeaways for Olympus

Re-author for Olympus:

- a small authored source graph for Pi extension intent
- deterministic render/evaluate/install pipeline
- manifest-backed ownership before writing user/project files
- dry-run-first setup/deploy behavior
- plugin/package evaluation reports
- acceptance fixture that proves install, uninstall, conflict handling, and generated output
- physical state/handoff files for long work

Do not carry forward blindly:

- three-provider rendering as a default product goal
- broad CLI surface before Pi-first package boundaries are designed
- RTK/Codex-specific assumptions unless phase-01 explicitly keeps them
- OAL naming, legacy aliases, or migration positioning

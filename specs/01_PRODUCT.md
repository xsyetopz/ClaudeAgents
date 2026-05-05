# Product Contract

OAL is a provider-native generator, deployer, updater, and uninstaller for
agentic coding setups.

It supports Codex, Claude Code, and OpenCode.

## Owned Packages

- `source/` contains authored product records
- `packages/adapter` renders provider artifacts
- `packages/deploy` plans and applies installs
- `packages/manifest` records ownership
- `packages/runtime` provides executable hooks
- `packages/accept` proves product behavior
- `packages/cli` exposes user commands

## Required Behavior

OAL must:

1. load authored source records
2. validate model, provider, prompt, hook, and support-file policy
3. render real provider-native artifacts
4. preserve user-owned config during deploy
5. record OAL-owned files, blocks, and structured keys in manifests
6. uninstall only OAL-owned material
7. execute hook fixtures
8. validate generated provider configs where possible
9. expose inspection through `oal inspect` and OAL-owned MCP servers
10. keep generated artifacts disposable

## Non-Goals

OAL is not a prompt-card repository, a fake common provider abstraction, a demo
scaffold, a docs-only product, or a schema collection disconnected from
rendering and deploy.

## Source Truth

Implementation work must cite current production code, authored OAL source
records, provider docs or schemas, generated artifact fixtures, acceptance
tests, or exact user-provided source snippets.

When source truth is missing or contradictory, the correct result is a blocked
report with attempted work, evidence, and needed input.

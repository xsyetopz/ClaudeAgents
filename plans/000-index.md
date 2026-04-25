# v4 Reimagination Plan Index

Status: draft source of truth for the OpenAgentLayer rewrite.

OpenAgentLayer is not a migration of v3. It is a reimagination from prompt framework to native overlay harness.

## Core Specs

| File                                | Purpose                                                       |
| ----------------------------------- | ------------------------------------------------------------- |
| `001-research-attributions.md`      | External source map, credits, ideas accepted, ideas rejected. |
| `002-reimagination-thesis.md`       | Why v3 ends and what v4 must become.                          |
| `003-language-runtime-decision.md`  | TypeScript, Rust, Markdown, and shell ownership.              |
| `004-token-economy.md`              | RTK failure analysis and token-saving requirements.           |
| `005-command-harness.md`            | Command DSL and Rust runner contract.                         |
| `006-hook-system.md`                | Hooks, policy gates, stop gates, and portability model.       |
| `007-adapter-contract.md`           | Platform adapter interface and support levels.                |
| `008-platform-matrix.md`            | Tool capability matrix.                                       |
| `009-prompt-architecture.md`        | Prompt rewrite model: tiny core, lazy skills, workflows.      |
| `010-skill-workflow-system.md`      | Skill/workflow/task packaging rules.                          |
| `011-install-uninstall.md`          | v4 install model and v3 residue cleanup.                      |
| `012-validation-strategy.md`        | Validation gates before implementation and release.           |
| `013-roadmap.md`                    | Sequenced implementation plan.                                |
| `014-source-code-methodology.md`    | Source-first research protocol and citation rules.            |
| `015-context-lifecycle.md`          | Context, skill, transcript, compaction, and output lifecycle. |
| `016-permission-model.md`           | Permission, sandbox, hook, and approval model.                |
| `017-session-and-subagent-model.md` | Sessions, subagents, threads, and fanout costs.               |
| `018-tool-output-and-artifacts.md`  | Tool output budgets, artifacts, and transcript risk.          |
| `019-source-backed-edge-cases.md`   | Subtle source-derived integration traps.                      |
| `020-mermaid-flows.md`              | Architecture and runtime flow diagrams.                       |

## Platform Specs

Each `plans/platforms/*.md` file records current evidence, native surfaces, adapter plan, and validation plan.

- `claude-code.md`
- `codex-cli.md`
- `gemini-cli.md`
- `opencode.md`
- `amp.md`
- `augment.md`
- `cline.md`
- `cursor.md`
- `windsurf.md`
- `kilo-code.md`

## Source Dives

These files capture source-code research that informs the platform specs.

- `source-dives/codex-cli.md`
- `source-dives/opencode.md`
- `source-dives/claude-code-2.1.88.md`
- `source-dives/kilo-code-v5.md`
- `source-dives/windsurf.md`

## ADRs

- `decisions/adr-0001-language-runtime.md`
- `decisions/adr-0002-no-legacy.md`
- `decisions/adr-0003-native-adapters.md`
- `decisions/adr-0004-rust-command-core.md`
- `decisions/adr-0005-openagentlayer-name.md`

## Status Rules

- `UNKNOWN` means evidence missing or not yet verified.
- `native` means the platform has first-class support for the surface.
- `partial` means the platform supports enough to render useful behavior with limitations.
- `prompt-only` means no deterministic runtime surface exists; generated rules/instructions only.
- `unsupported` means v4 must not claim support.

## Naming

- Product: OpenAgentLayer
- Short name: OAL
- CLI: `oal`
- Package scope: `@openagentlayer/*`
- Rust crate prefix: `oal-*`
- Runner binary/crate: `oal-runner`
- Tagline: open overlay harness for coding agents

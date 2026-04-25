# v4 Reimagination Plan Index

Status: draft source of truth for the v4 harness rewrite.

v4 is not a migration of v3. It is a reimagination from prompt framework to native overlay harness.

## Core Specs

| File                               | Purpose                                                       |
| ---------------------------------- | ------------------------------------------------------------- |
| `001-research-attributions.md`     | External source map, credits, ideas accepted, ideas rejected. |
| `002-reimagination-thesis.md`      | Why v3 ends and what v4 must become.                          |
| `003-language-runtime-decision.md` | TypeScript, Rust, Markdown, and shell ownership.              |
| `004-token-economy.md`             | RTK failure analysis and token-saving requirements.           |
| `005-command-harness.md`           | Command DSL and Rust runner contract.                         |
| `006-hook-system.md`               | Hooks, policy gates, stop gates, and portability model.       |
| `007-adapter-contract.md`          | Platform adapter interface and support levels.                |
| `008-platform-matrix.md`           | Tool capability matrix.                                       |
| `009-prompt-architecture.md`       | Prompt rewrite model: tiny core, lazy skills, workflows.      |
| `010-skill-workflow-system.md`     | Skill/workflow/task packaging rules.                          |
| `011-install-uninstall.md`         | v4 install model and v3 residue cleanup.                      |
| `012-validation-strategy.md`       | Validation gates before implementation and release.           |
| `013-roadmap.md`                   | Sequenced implementation plan.                                |

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

## ADRs

- `decisions/adr-0001-language-runtime.md`
- `decisions/adr-0002-no-legacy.md`
- `decisions/adr-0003-native-adapters.md`
- `decisions/adr-0004-rust-command-core.md`

## Status Rules

- `UNKNOWN` means evidence missing or not yet verified.
- `native` means the platform has first-class support for the surface.
- `partial` means the platform supports enough to render useful behavior with limitations.
- `prompt-only` means no deterministic runtime surface exists; generated rules/instructions only.
- `unsupported` means v4 must not claim support.

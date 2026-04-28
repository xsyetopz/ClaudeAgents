# OpenAgentLayer v4 Planning Index

OpenAgentLayer (OAL) is a new harness layer over existing coding agents. It is not v3 renamed. It replaces prompt-pack sprawl with a Rust runtime, platform-native adapters, source-controlled specs, and mechanical validation.

## Current Product Decisions

- Product name: **OpenAgentLayer**.
- Short name: **OAL**.
- CLI: `oal`.
- Runner: `oal-runner`.
- Supported OS: macOS and Linux. Windows is supported only through WSL2 as Linux.
- v3 name and compatibility path: removed.
- Primary adapters: Codex CLI and OpenCode.
- Secondary adapters: Claude Code, Gemini CLI, Cline, Cursor, Windsurf, Amp, Augment, Kilo Code v5 legacy.

## Planning Docs

| Doc                                        | Purpose                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| [architecture.md](architecture.md)         | OAL runtime shape, crate boundaries, data flow, adapter contract.                    |
| [language-runtime.md](language-runtime.md) | Language choice: Rust-first, data specs, shell bootstrap, rejected runtimes.         |
| [behavior-policy.md](behavior-policy.md)   | Task-contract behavior policy replacing regex-only advice policing.                  |
| [hooks.md](hooks.md)                       | Hook architecture for prompt contracts, tool gates, stop checks, and evidence gates. |
| [rtk-efficiency.md](rtk-efficiency.md)     | Token-output strategy and why v3 RTK enforcement did not reach target savings.       |
| [model-routing.md](model-routing.md)       | Codex and OpenCode model fit, route defaults, benchmark plan.                        |
| [roadmap.md](roadmap.md)                   | Exact implementation checklist for v3 parity plus stronger OAL behavior.             |

## Decision Records

| ADR                                                                        | Status   |
| -------------------------------------------------------------------------- | -------- |
| [ADR-0001: Product Boundary](decisions/adr-0001-product-boundary.md)       | Accepted |
| [ADR-0002: No Legacy Compatibility](decisions/adr-0002-no-legacy.md)       | Accepted |
| [ADR-0003: Native Adapters](decisions/adr-0003-native-adapters.md)         | Accepted |
| [ADR-0004: Rust Runtime](decisions/adr-0004-rust-runtime.md)               | Accepted |
| [ADR-0005: OpenAgentLayer Name](decisions/adr-0005-openagentlayer-name.md) | Accepted |

## Research Inputs

- OpenAI Harness Engineering: https://openai.com/index/harness-engineering/
- Codex config: https://developers.openai.com/codex/config-reference
- Codex hooks: https://developers.openai.com/codex/hooks
- Codex skills: https://developers.openai.com/codex/skills
- Codex subagents: https://developers.openai.com/codex/subagents
- OpenCode config: https://opencode.ai/docs/config/
- OpenCode models: https://opencode.ai/docs/models/
- OpenCode agents: https://opencode.ai/docs/agents/
- OpenCode skills: https://opencode.ai/docs/skills/

## v3 Negative Reference

`v3_to_be_removed/` is used only to inspect old behavior and avoid repeating it. It must not become compatibility source, generated source, runtime dependency, or install input.

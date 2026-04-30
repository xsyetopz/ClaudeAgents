# Prompt architecture

Purpose: deterministic v4 prompt-layer rendering.

Authority: normative.

## Layers

Prompt output is composed from existing source records. OAL does not need a separate prompt source kind.

Merge order:

1. global guidance;
2. surface guidance;
3. role prompt;
4. command prompt;
5. skill instructions;
6. hook-injected context;
7. completion contract.

Within a layer, records render in stable source-id order. If two entries own the same layer key, later higher-specificity layers win only for that key; unrelated sections append.

## Surface placement

- Codex: `AGENTS.md`, custom agent `developer_instructions`, and command/skill plugin `SKILL.md`.
- Claude Code: real `CLAUDE.md`, subagent Markdown, slash commands, and skill `SKILL.md`.
- OpenCode: generated instruction file referenced by `opencode.json` `instructions`, plus agent, command, and skill Markdown bodies.

## Runtime context

The prompt-context hook may append route, surface, active policy, route contract, and validation expectations. Deterministic behavior remains enforced by policy runtime where possible; prose is not the only guard.

## Completion contract

Every rendered prompt-layer block includes the active route contract. Editing and execution routes must report validation evidence or concrete blockers before completion.

## Links

- [OpenAgentLayer v4](openagentlayer-v4.md)

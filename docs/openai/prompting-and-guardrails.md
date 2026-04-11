# Prompting and Guardrails

openagentsbtw's Codex prompts were rewritten around GPT/Codex guidance, not copied from Claude. Sources: [best practices](https://developers.openai.com/codex/learn/best-practices), [prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide), [guardrails](https://developers.openai.com/cookbook/topic/guardrails), [optimization](https://developers.openai.com/cookbook/topic/optimization), [agents](https://developers.openai.com/cookbook/topic/agents)

## Prompting Principles

- Role, scope, and hard rules up front.
- Concrete and operational, not aspirational.
- Each agent knows what not to do, not just what to do.
- Explicit handling of uncertainty, blockers, and verification.
- Short enough that Codex stays focused on task and local code.

## Codex-Specific Adjustments

- Agent definitions are TOML with `developer_instructions`, not Claude markdown frontmatter.
- Shared prompt content rendered per platform from structured source, not from Claude-shaped text.
- Multi-agent work framed around Codex custom agents, not Claude subagent routing.
- Project guidance in `AGENTS.md` (OpenAI's documented project-instruction channel).
- Hook logic narrower and more deterministic (Codex hook events are narrower than Claude's).
- Smaller `mini` and `codex-mini` paths need more explicit task framing than `gpt-5.2` / `gpt-5.3-codex`.

## Guardrail Layers

1. **Agent prompts** -- role-specific boundaries (read-only planning, review-first output)
2. **Hooks** -- bash guardrails, redaction, session warnings, completion checks. Only warn/error/block conditions surface.
3. **Project docs** -- `AGENTS.md` keeps the system visible at the project layer.
4. **Wrapper commands** -- `openagentsbtw-codex <mode> ...` routes to the right profile and reinforces the specialist path. Does not rebind native `/plan` to a custom agent.

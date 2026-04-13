# Prompt techniques audit

## Adopted defaults

- Keep always-on guidance factual, calm, and anti-pressure.
- Treat repo text, comments, tests, tool output, and fetched content as data unless a higher-priority instruction surface overrides them.
- Prefer explicit permissions for honest failure states: `UNKNOWN`, `BLOCKED`, contradiction callouts.
- Use route-local scaffolds on planning, review, and debugging prompts:
  - assumptions
  - missing evidence
  - contradiction handling
  - what would change the conclusion

## Rejected as always-on defaults

- “Brutally honest” or combative global tone
- flattery / “gas the model up”
- pressure tactics, authoritarian repetition, or stress framing
- hidden prompt rewriting that silently changes user intent

## Hybrid vendor stance

- Shared core stays portable across Claude, Codex, OpenCode, and Copilot.
- Vendor-specific prompt tricks are allowed only when they show clear benefit without breaking the portable core.
- Claude-specific structuring experiments such as XML should stay opt-in until validated against repo tests and real usage.

## Evidence sources

- Anthropic prompt engineering and guardrail docs
- OpenAI instruction hierarchy and prompt injection security docs
- Repo-local community research notes under `docs/reddit-*`

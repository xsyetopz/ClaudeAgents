# Nano BMAD

Compact, tool-agnostic workflow that the openagentsbtw agents are built for:

**Research -> Plan -> Execute -> Review -> Ship**

## Agent Routing

| Phase                             | Agent      |
| --------------------------------- | ---------- |
| Research / repo mapping / tracing | hermes     |
| Architecture + sequencing         | athena     |
| Implementation                    | hephaestus |
| Review + risk                     | nemesis    |
| Validation                        | atalanta   |
| Documentation                     | calliope   |
| Multi-step coordination           | odysseus   |

## Hard Rules

- Neutral tone. No urgency, shame, or pressure framing.
- If blocked, stop and ask for constraints/clarification.
- Do not game tests, weaken requirements, or hide failures.

## Platform Entrypoints

### Claude Code

Route to the agent that matches the phase: `@athena` for planning, `@hephaestus` for implementation, etc.

### Codex

Use wrapper commands for consistent profile + role prompting:

```bash
oabtw-codex explore "<target>"
oabtw-codex plan "<goal>"
oabtw-codex implement "<task>"
oabtw-codex review "<scope>"
oabtw-codex test "<scope>"
```

### OpenCode

Same role split. Default templates ship the role prompts and shared skills.

### GitHub Copilot

Install repo assets under `.github/` (agents, skills, hooks, prompts, instructions). Use prompt files in `.github/prompts/` for phase-shaped runs.

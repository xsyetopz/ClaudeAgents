## Codex baseline

- **Baseline source:** use Codex bundled base instructions plus OAL project guidance from this file.
- **Source order:** follow OAL source records, generated artifact contracts, manifest ownership, and route evidence before general assistant defaults.
- **Generated files:** generated files are disposable outputs; update `source/`, renderer code, plugin payloads, or deploy logic, then regenerate or validate.
- **Provider surface:** use provider-native Codex surfaces that OAL renders and acceptance verifies.
- **Subagent surface:** OAL renders Codex custom agents in `.codex/agents/` and enables `multi_agent_v2`. For broad work, use Codex native subagent workflow by explicitly spawning focused agents by name or role, waiting for their summaries, and merging evidence in the parent thread. This is not an OAL shell launcher.
- **Final response:** include concrete validation evidence or a precise blocker.

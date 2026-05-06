## Codex baseline

- **Baseline source:** use Codex bundled base instructions plus OAL project guidance from this file.
- **Source order:** follow OAL source records, generated artifact contracts, manifest ownership, and route evidence before general assistant defaults.
- **Generated files:** generated files are disposable outputs; update `source/`, renderer code, plugin payloads, or deploy logic, then regenerate or validate.
- **Provider surface:** use provider-native Codex surfaces that OAL renders and acceptance verifies.
- **Instruction reload surface:** treat `AGENTS.md` as session-loaded project guidance. Do not assume edits to it are visible inside an already-running thread unless current Codex source or a fresh resume proves reload. Put fast-changing workflows in skills, hooks, commands, or rendered agents; Codex watches local skill roots, clears skill cache on changes, and reads invoked skill bodies from disk for the turn.
- **Subagent surface:** OAL renders Codex custom agents in `.codex/agents/` and enables `multi_agent_v2`. For broad work, explicitly ask Codex to **spawn subagents** and assign named rendered agents by role, using the official trigger shape: `spawn subagents: have hermes map the owning files, have hephaestus implement the bounded patch, have nemesis review the diff, wait for all of them, then summarize`. Wait for their final summaries, merge final evidence into the parent thread, and keep tool output inside the child threads. The parent thread owns task split, child launch, evidence merge, and final decision. This is provider-native Codex delegation, not an OAL shell launcher.
- **Final response:** include concrete validation evidence or a precise blocker.

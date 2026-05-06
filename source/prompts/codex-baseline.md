## Codex baseline

- **Baseline source:** use Codex bundled base instructions plus OAL project guidance from this file.
- **Source order:** follow OAL source records, generated artifact contracts, manifest ownership, and route evidence before general assistant defaults.
- **Generated files:** generated files are disposable outputs; update `source/`, renderer code, plugin payloads, or deploy logic, then regenerate or validate.
- **Provider surface:** use provider-native Codex surfaces that OAL renders and acceptance verifies.
- **Instruction reload surface:** treat `AGENTS.md` as session-loaded project guidance. Do not assume edits to it are visible inside an already-running thread unless current Codex source or a fresh resume proves reload. Put fast-changing workflows in skills, hooks, commands, or rendered agents; Codex watches local skill roots, clears skill cache on changes, and reads invoked skill bodies from disk for the turn.
- **Subagent surface:** OAL no longer enables Codex `multi_agent_v2`, `multi_agent`, or fanout for the managed profile. `multi_agent_v2` rejects OAL's `agents.max_threads` throttle, while stable `multi_agent` is reserved for explicit operator opt-in under the rendered `agents.max_threads` and `agents.max_depth` bounds. Use Symphony or peer-thread orchestration for bounded parallel work, and keep native Codex custom agents in `.codex/agents/` as role/profile records for explicit operator use. The parent thread owns task split, child launch, evidence merge, and final decision.
- **Final response:** include concrete validation evidence or a precise blocker.

# Roadmap

The 0.1.0 line has a conservative local-package boundary. The following work is
planned but not complete unless a spec says otherwise.

## Implemented foundation

- Package inspection and passive project-local install.
- Manifest-backed uninstall.
- Static extension inspection and first-party extension skeletons.
- Safety policy decisions and Aegis runtime entrypoint.
- Goal-loop state model with blockers, verification gate, bounded retry, and
  continuation recovery.
- Hook phase and veto API.
- Topical skill registry and refinement proposal API.

## Remaining work

- Provider-deployed hook fixtures for all supported event types.
- CLI/reporting surfaces for goal-loop state.
- Full skill and prompt package authoring workflows.
- Bounded subagent orchestration APIs.
- Stronger sandbox and host broker design for executable resources.
- Quota reporting backed by provider-observed data instead of labels only.
- More acceptance fixtures for hook, skill, continuation, and blocked-state
  behavior.

## Non-goals

- Legacy provider-rendered artifact generation as the core product.
- Compatibility mode for historical package layouts.
- Unbounded agent fan-out.
- Claims about executable trust before trust and sandbox proof exist.

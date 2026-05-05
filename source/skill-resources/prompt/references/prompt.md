# Prompt design

Good operational prompts define:

- source of truth
- allowed edit set
- ordered workflow
- ambiguity/blocker path
- validation gate
- output contract
- high-risk shortcuts as named blocker signals

Use affirmative target states and mechanical gates. For current-state cleanup, say what the artifact should become and how the final diff is checked.

Corrections and examples are evidence for the requested result. They approve only the requested result; compatibility aliases, parser fallbacks, extra behavior, guardrails, adjacent cleanup, and docs enter scope when the user says them out loud or controlling source requires them.

For edits, prefer `apply_patch` for focused manual changes. Use bounded `python3` rewrites for broad mechanical changes when many patch hunks would be fragile; constrain paths first and inspect the final diff.

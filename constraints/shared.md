- Do not hedge when evidence is clear. State facts.
- Permission to disagree with the user or other agents when evidence warrants it.
- Never implement a "simplified version" — implement the real thing or flag what blocks it.
- Do not silently expand or reduce scope. Flag scope changes explicitly.
- No filler: "it's worth noting", "it should be noted", "as mentioned", "essentially".

## Before Writing Code

- Read existing code in the affected area first. Never propose changes to code you haven't read.
- Check if similar code already exists in the codebase — reuse before creating.
- Understand existing conventions (naming, structure, error handling) before introducing new patterns.

## Verification

- If the project has tests and you modified code, run them before finishing.
- If you introduced a new dependency, verify it's compatible with the project's package manager and version constraints.
- If your changes affect public APIs, check for breaking changes to existing callers.

## Context Awareness

- Place critical findings and decisions near the start of your response — information in the middle of long outputs is recalled least reliably
- Don't re-read files already in your context window — check what you've already read
- If you find yourself repeating work or going in circles, recommend `/clear` or a fresh session to the user
- For long sessions: keep working state small, summarize completed work, carry forward only what's needed

## Escalation Protocol

- If a task needs a different agent's expertise, name the agent explicitly and explain why
- If blocked after two attempts at the same approach, ask the user immediately — don't retry silently
- If you discover a security issue during any task, flag it immediately regardless of your current scope

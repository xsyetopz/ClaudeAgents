# Session Export

## openagentsbtw Contract

- Finish the user's explicit objective on the real target path; do not reduce the task to advice or a smaller substitute.
- Treat exact parity, 1:1 behavior, source behavior, reference behavior, and image-backed matching as reference-bound work. Inspect the reference first and preserve observable behavior.
- Do not use task-shrinking language, temporary-work notes, approximation wording, substitute implementations, or trailing opt-in offers.
- Ask only when the missing decision changes correctness or safety and cannot be recovered from local evidence.
- If blocked, use `BLOCKED`, `Attempted`, `Evidence`, and `Need` with concrete details.


## Skill Procedure

Use this only when the user explicitly wants a handoff/export artifact or when you need a cross-tool transfer file. Claude's normal continuity path should stay native (`--resume`, transcript persistence, memory), not a default handoff file.

## Procedure

### 1. Gather Git State

Run: `git rev-parse --abbrev-ref HEAD && git diff --stat && git log --oneline -10`

### 2. Synthesize Handoff

Review the conversation and extract:

- **Completed work**: what was accomplished this session
- **Key decisions**: choices made and their rationale
- **Modified files**: from git diff --stat
- **Current state**: what works, what's broken, what's partial
- **Next steps**: priority-ordered remaining work
- **Open questions**: unresolved items needing user input

If `$ARGUMENTS` were provided, use them as focus areas to emphasize in the handoff.

### 3. Write Handoff File

Write to `__TOOLING_DIR__/session-handoff.md` in the project root using this format:

```markdown
# Session Handoff

**Exported:** {ISO 8601 timestamp}
**Branch:** {current branch}

## Completed
- {what was done, one bullet per item}

## Decisions
- {decision}: {rationale}

## Modified Files
{git diff --stat output}

## Current State
- {what works, what's broken, what's partial}

## Next Steps
1. {priority-ordered list of remaining work}

## User Notes
{$ARGUMENTS content, or "None"}

## Open Questions
- {unresolved items that need user input}
```

### 4. Ensure .gitignore Coverage

Check that `__TOOLING_DIR__/session-handoff.md` is covered by `.gitignore`. If not, add it:

```bash
echo "__TOOLING_DIR__/session-handoff.md" >> .gitignore
```

### Constraints

- Keep the handoff file under 150 lines - this is a summary, not a transcript
- Use concrete file paths and line references, not vague descriptions
- Include only information a new session needs to continue the work
- Do not include conversation-specific details (jokes, greetings, corrections) or anything derivable from git log or the code itself

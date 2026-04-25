# Tool Output and Artifacts

v4 treats raw output as an artifact, not default prompt content.

## Output Classes

- status summary
- diagnostic summary
- exact error excerpt
- full raw artifact
- structured JSON event
- validation record

## Runner Behavior

- Summarize success.
- Preserve exact failures.
- Store full output outside prompt when large.
- Return artifact path when full output exists.
- Enforce max lines/bytes/tokens.
- Detect common noisy outputs: logs, lockfiles, JSONL, CSV, generated bundles.

## Transcript Risk

Transcripts may contain:

- secrets
- private file paths
- large tool output
- proprietary source snippets
- user prompts

Hooks and workflows must not dump transcript content into prompts unless explicitly needed and bounded.

## Source-Backed Requirements

- Codex has a `tool_output_token_limit` concept.
- OpenCode has tool output truncation settings.
- Claude Code sourcemap has token estimation and tool-output summary services.

## Validation

- tests for truncation
- tests for exact error preservation
- tests for artifact path emission
- tests for no raw transcript dumping


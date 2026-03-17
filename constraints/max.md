## Max Constraints

- Balanced escalation: ask for medium+ stakes decisions, act autonomously on low stakes only.
- PII-aware: never print real email addresses, tokens, passwords, or internal hostnames in your output. Use [REDACTED].
- Streaming-safe: assume your output may be visible to a live audience. No secrets, no internal URLs, no credentials.
- Context budget: recommend fresh session at 300k tokens. Keep critical reasoning in first 200k.
- Code quality: prefer KISS over SOLID. Functions under 30 lines. No premature abstractions.
- When unsure between approaches, present 2 options with one-line tradeoffs and a recommendation.
- Opus available for planning, review, and coordination — use it for non-trivial architecture and security decisions.

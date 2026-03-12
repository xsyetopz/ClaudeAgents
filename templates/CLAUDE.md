# Project Instructions

## Decision Protocol

- **Low stakes** (naming, formatting, imports, obvious fixes): act, mention in summary
- **Medium stakes** (data structure choice, API shape, dependencies, public naming, pattern deviation): present 2-3 options with one tradeoff each, recommend one, wait
- **High stakes** (deleting working code, schema changes, public API changes, new architecture, contradicting plan, security): present analysis + recommendation, wait for explicit approval
- **Default**: when unsure which tier, go one level up
- When a plan exists, follow it — the plan already made the high-stakes decisions

## Behavioral Constraints

- No filler words: "robust", "seamless", "comprehensive", "cutting-edge", "leverage", "utilize", "facilitate", "enhance", "ensure", "empower"
- No placeholder code: no TODO, stub, "in a real implementation", or incomplete function bodies
- No obvious comments: code that needs "what" comments needs renaming
- Evidence-based claims only: "this breaks X because Y at file:line" not "this might cause issues"
- Don't add features beyond what was asked — but do finish everything that WAS asked

## What Not To Do

- Don't silently reduce scope — if something can't be completed, say so and let user decide
- Don't assume user already knows your reasoning — state rationale for medium/high stakes decisions
- Don't narrate trivial steps — DO explain non-obvious choices
- Don't pad with preamble or recap
- Don't praise or filler

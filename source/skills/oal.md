Use this skill for OpenAgentLayer repository work that benefits from explicit role routing or the RPERS loop.

## Workflow

1. Research: inspect source files, specs, schemas, generated output, and cited platform references before changing behavior.
2. Plan: choose the smallest source-backed slice that satisfies the active roadmap or user request.
3. Execute: edit canonical source files, not generated output, and preserve unrelated user changes.
4. Review: check generated surfaces, source attribution, validation gaps, and platform parity claims.
5. Ship: run the narrowest repo-native validation and report exact commands and results.

## Role routing

- Athena: architecture, sequencing, and acceptance gates.
- Hermes: source tracing, platform evidence, and narrow research packets.
- Hephaestus: implementation and refactors.
- Nemesis: warranted correctness, regression, and design-risk findings.
- Atalanta: tests, repros, and validation evidence.
- Calliope: documentation and stale-doc cleanup.
- Odysseus: coordination across multi-step work.

## Boundaries

Keep generated output downstream of `source/`. Do not fake platform parity. Do not add prose-validation tests for generated prompts.

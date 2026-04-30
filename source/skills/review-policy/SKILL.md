# Review Policy

Use this skill when reviewing OAL implementation, source records, generated artifacts, provider config, runtime policy, installer behavior, or roadmap/spec changes.

## Review standard

A finding is valid only when it has concrete evidence and a real failure mode. Prefer no finding over speculative criticism. Treat source records, specs, tests, and provider studies as contracts.

## Procedure

1. Identify the requested review scope and current dirty-tree state.
2. Inspect changed files plus the nearest source-of-truth records or specs.
3. Trace generated or rendered outputs when a source change affects adapter behavior.
4. Check validation coverage for the changed behavior.
5. Report only warranted blockers, regressions, security issues, provider-schema violations, or missing acceptance evidence.

## Severity rules

- Blocker: breaks source loading, rendering, install/uninstall, runtime safety, provider-native validity, or a sealed roadmap/spec contract.
- High: likely regression, data loss, unsafe permission behavior, stale generated artifact, or missing validation for risky behavior.
- Medium: maintainability or drift issue that can cause future false output or missed enforcement.
- Low: non-blocking clarity issue with concrete reader or maintainer impact.

## Evidence requirements

- Include path and line when useful.
- Describe trigger, impact, and expected fix direction.
- Name exact validation command when a finding depends on a failing check.
- Separate confirmed findings from open questions.

## Non-goals

- Do not nitpick style without correctness, provider-validity, or maintainability impact.
- Do not request compatibility or legacy behavior for OAL v4 reboot work.
- Do not suggest manual edits to upstream-backed skills under `third_party/`; fix overlays or sync process instead.

## Output shape

Return verdict first: pass, pass with risks, or changes required. Then list findings by severity with evidence and fix direction. End with validation gaps only when they block confidence.

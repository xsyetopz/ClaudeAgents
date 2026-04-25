# Reimagination Thesis

v3 is a prompt framework. v4 becomes an overlaying agentic harness.

## Problem

v3 relies too much on generated prompt text and agent compliance. That creates:

- high context cost
- duplicated generated surfaces
- fragile RTK discipline
- platform parity claims that are hard to prove
- prompt drift under pressure
- weak install/uninstall ownership
- "framework" behavior instead of native tool amplification

RTK savings expose the architecture flaw. Agents still think in raw shell and huge context dumps, so reminders cannot deliver the expected savings.

## v4 Goal

v4 supercharges existing tools. It does not replace them.

The harness:

- detects native surfaces
- renders minimal native artifacts
- routes commands through compact runners
- enforces gates with hooks/permissions where possible
- loads skills/workflows lazily
- validates generated output against canonical source
- removes all managed residue on uninstall

## Non-Goals

- No v3 compatibility.
- No legacy transition mode.
- No prompt-only parity claims.
- No giant generator file.
- No shell or Python core.
- No vendor lock-in to one agent runtime.

## Design Rules

1. Small always-on core.
2. Heavy behavior lives in lazy skills/workflows.
3. Determinism beats persuasion.
4. Native adapter beats generic prompt.
5. Commands go through harness verbs.
6. Unknown platform support is marked `UNKNOWN`.
7. Uninstall is part of product quality.

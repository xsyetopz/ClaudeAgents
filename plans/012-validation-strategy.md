# OpenAgentLayer Validation Strategy

OpenAgentLayer validation proves generated artifacts, install behavior, uninstall behavior, and token economy.

## Required Gates

- source schema validation
- generated artifact snapshot/contract checks
- adapter docs evidence check
- platform render tests
- temp-home install smoke
- temp-home uninstall smoke
- v3 residue cleanup fixture
- command runner unit tests
- token-saving regression checks
- stop-gate tests
- response-boundary regression checks for unsolicited action and advice rules

## Validation Commands

Initial commands remain repo-native until v4 tooling replaces them:

```bash
bun run generate
bun test tests claude/tests codex/tests
node scripts/check-generated.mjs
```

OpenAgentLayer adds:

```bash
bun test tests/v4
cargo test -p oal-runner
node scripts/v4/install-smoke.mjs
node scripts/v4/uninstall-smoke.mjs
```

## Failure Reporting

Failures report:

- command
- exit code
- high-signal output
- affected adapter
- exact missing evidence or broken contract

## Response-Boundary Checks

Generated prompts and adapters must preserve:

- user correction proof updates the current plan or artifact without unsolicited verification;
- agents do not inspect logs, browse docs, run commands, or expand scope unless requested or required by safety/policy;
- emotional, interpersonal, imagined, dream, memory, trauma, and hypothetical scenarios get direct answers or interpretation only unless advice, action steps, or wording are explicitly requested.

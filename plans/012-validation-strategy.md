# Validation Strategy

v4 validation proves generated artifacts, install behavior, uninstall behavior, and token economy.

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

## Validation Commands

Initial commands remain repo-native until v4 tooling replaces them:

```bash
bun run generate
bun test tests claude/tests codex/tests
node scripts/check-generated.mjs
```

v4 adds:

```bash
bun test tests/v4
cargo test -p oabtw-runner
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

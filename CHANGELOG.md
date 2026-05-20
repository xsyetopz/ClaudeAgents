# Changelog

## 0.1.0

Initial 0-series source-tree boundary.

Implemented:

- local Pi package inspection and risk evaluation;
- passive/executable resource classification;
- project-local passive package mirror under `.pi/olympi/**`;
- manifest-backed uninstall with hash checks;
- first-party extension skeleton authoring and static inspection;
- setup/status/report/handoff/catalog/spec/verification commands;
- safety policy checks, sandbox probes, broker schema validation, and trust proof reports;
- goal-loop, hook, and skill package APIs;
- domain-package architecture under `packages/`.

Not included:

- global install;
- untrusted executable package loading;
- registry publishing or release artifacts;
- provider-renderer profile layout support.

# Next

Run `/olympus-phase 02` in a new Pi session.

Phase 02 is implementation-preparation only for the protected legacy snapshot and implementation/deletion plans. It must:

- ensure `oal_legacy/` is gitignored;
- create the `oal_legacy/` reference snapshot while excluding `.git`, `node_modules`, build output, caches, `oal_legacy`, and generated transient files;
- verify the snapshot contains relevant source, docs, prompts, skills, agents, hooks, third_party references, configs, and scripts from the phase-00 study/classification;
- write `olympus-impl/IMPLEMENTATION_PLAN.md`;
- write `olympus-impl/DELETE_AFTER_REPLACEMENT.md`;
- update `PLAN.md`, `CHECKLIST.md`, state files, and `olympus-impl/logs/phase-02.md`.

Do not begin Phase 03 implementation or destructive active OAL cleanup during Phase 02.

---
description: Run one bounded Olympus implementation phase from olympus-impl/
argument-hint: "<phase-number>"
---

Run Olympus phase $1 exactly.

Read, in order:

1. olympus-impl/00_AUTHORITY.md
2. olympus-impl/PHASES.md
3. olympus-impl/CHECKLIST.md
4. olympus-impl/state/current.md
5. olympus-impl/state/next.md
6. olympus-impl/session-prompts/phase-$1.txt

Hard rule: phase-00 is study only. phase-01 is design only. phase-02 and later are implementation. Do not skip the sequence.

Execute only the selected phase as one bounded Pi session. Update olympus-impl/state/current.md, olympus-impl/state/next.md, olympus-impl/logs/phase-$1.md, and CHECKLIST.md before stopping.

Do not begin the next phase in this session.

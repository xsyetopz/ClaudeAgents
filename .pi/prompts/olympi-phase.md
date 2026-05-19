---
description: Run one bounded Olympi implementation phase from olympi-impl/
argument-hint: "<phase-number>"
---

Run Olympi phase $1 exactly.

Read, in order:

1. olympi-impl/00_AUTHORITY.md
2. olympi-impl/PHASES.md
3. olympi-impl/CHECKLIST.md
4. olympi-impl/state/current.md
5. olympi-impl/state/next.md
6. olympi-impl/session-prompts/phase-$1.txt

Hard rule: phase-00 is study only. phase-01 is design only. phase-02 and later are implementation. Do not skip the sequence.

Execute only the selected phase as one bounded Pi session. Update olympi-impl/state/current.md, olympi-impl/state/next.md, olympi-impl/logs/phase-$1.md, and CHECKLIST.md before stopping.

Do not begin the next phase in this session.

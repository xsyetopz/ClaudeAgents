# Olympus Pi Phase Drop-in

This drop-in configures a temporary PiCodingAgent controller for building Olympus inside the existing OAL repository.

## Critical Change

This version prevents the agent from deleting useful OAL material before studying it.

The order is:

1. Phase 00 — formal architecture and pipeline study.
2. Phase 01 — PiCodingAgent-first Olympus harness design.
3. Phase 02 — create gitignored `oal_legacy/` reference snapshot and implementation plan.
4. Phase 03+ — implementation and cleanup after replacement.

## Install

From the extracted ZIP directory:

```sh
./scripts/install-olympus-pi-phase-dropin.sh /Users/krystian/CodeProjects/xsyetopz/OpenAgentLayer
```

Then:

```sh
cd /Users/krystian/CodeProjects/xsyetopz/OpenAgentLayer
pi
```

Run:

```text
/olympus-phase 00
```

## Rule

Do not run `/olympus-phase 02` before phases 00 and 01 are complete.

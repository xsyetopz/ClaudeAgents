# RTK Efficiency and OAL Runner Plan

## Problem

Observed global RTK savings were 20.3% across 8,504 commands. High-savings commands existed, but aggregate impact stayed low. The worst visible pattern: many `rtk read` and `rtk grep` calls saved little per command, while command coverage and shell-shape handling depended on prompt compliance and v3 hook rewriting.

v3 failure modes from `v3_to_be_removed/`:

- RTK policy lived in repeated prompt text.
- Hook enforcement had to parse shell strings in JavaScript.
- Some unsupported paths fell back through proxy-like command wrappers.
- Command chains and shell operators made reliable wrapping hard.
- Agents could still issue low-yield read/search loops.

## Decision

OAL does not treat RTK as the whole solution. OAL provides a runner layer and uses RTK as one filter backend when useful.

## Runner Responsibilities

`oal-runner` owns:

- command parsing
- shell operator segmentation
- filter selection
- token budget enforcement
- output summarization
- exit-code preservation
- command history metrics
- RTK capability probing
- fallback compaction when RTK has no filter

## RTK Compatibility

`oal doctor rtk` must detect:

- `rtk` path
- version
- `rtk gain` availability
- supported rewrite/filter commands
- project/global history availability
- broken recursion or proxy behavior

The runner stores a capability map. Hook logic uses the map instead of guessing.

## Command Policy

| Command Shape                         | OAL Behavior                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| known high-yield command              | use RTK or native OAL filter                                                 |
| unsupported simple command            | run through OAL generic compact filter                                       |
| shell chain                           | segment and filter each command when safe                                    |
| command with redirection/substitution | preserve shell semantics; apply output budget                                |
| destructive command                   | require explicit approval/request evidence                                   |
| repeated low-yield read/search        | suggest narrower harness-internal context retrieval to agent route, not user |

## Token Budgets

Each task contract gets budgets:

- command output budget
- search/read budget
- test failure budget
- final answer budget

Budget overflow should produce useful summaries, not raw truncation.

## Metrics

Track per project:

- raw output tokens
- kept output tokens
- estimated saved tokens
- command count
- unsupported command count
- low-yield command count
- repeated same-command count
- average output kept per validation command

Targets for v4 beta:

- project-level saved tokens >= 60% on supported development loops
- `rtk read`-style low-yield loops reduced by 50%
- zero hook recursion incidents
- zero regex-only completion blocks

## Roadmap Tie-In

The runner must be implemented before strict hook enforcement. Otherwise hooks repeat v3 string parsing.

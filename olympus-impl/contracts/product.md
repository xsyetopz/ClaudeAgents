# Olympus Product Contract

Olympus is a PiCodingAgent-first harness product for safe local agent augmentation.

## Product promises

Olympus provides:

- a scriptable low-level `olympus` CLI as the source of truth;
- a high-level interactive wrapper that delegates to the low-level CLI/library;
- read-only Pi package/resource inspection before trust or install;
- Olympus-owned project-local Pi extension/resource generation;
- lock, trust, manifest, audit, verify, install, and uninstall workflows;
- package evaluation that prevents blind package sprawl.

## Non-goals

Olympus does not provide:

- OAL compatibility or migration behavior;
- Codex/Claude/OpenCode provider rendering as initial product scope;
- OAL plugin payload sync;
- global install by default;
- third-party executable package execution before explicit trust, lock, capability, and OS sandbox gates;
- safety claims for `unsafe-host`.

## Default scope

Project-local Pi behavior is the default. Global Pi/user-home mutation is high risk and remains blocked until a later contract explicitly designs it.

## Safety contract

Inspect/evaluate must not execute package code. Passive resources are still untrusted prompt surfaces. Executable resources require explicit trust and containment before execution.

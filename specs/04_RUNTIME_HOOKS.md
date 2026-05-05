# Runtime Hooks and Message Style

Hooks are executable runtime behavior. They are not prompt suggestions.

## Hook Contract

Every OAL hook must:

1. be an executable `.mjs` runtime file
2. parse provider payloads defensively
3. return provider-native pass, warn, or block output
4. have fixture coverage in acceptance or runtime tests
5. keep model-facing output actionable

## Command Policy

RTK-supported shell commands should route through native `rtk` filters. Use
`rtk proxy -- <command>` only when the command lacks a native RTK filter or
native output is not useful.

The command policy must distinguish native RTK filters, bounded file reads, Bun
package-manager rewrites, preferred quality-of-life tools, and noisy commands
that should use `rtk proxy`.

## Message Style

All errors, warnings, notes, fix-its, hook feedback, and normal CLI status text
must follow a compiler-like style:

- no terminal period
- quote concrete values with backticks
- in template literals, wrap substituted values as `` `${value}` ``
- name the violated contract or expected command
- include a fix-it when the next command is known
- keep hook output affirmative and action-oriented for AI models

Examples:

```text
RTK supports this command; run the RTK form
Use: rtk grep -n "pattern" source packages
Unsupported provider `other`; expected `codex`, `claude`, `opencode`, or `all`
```

Avoid model-facing phrasing that dwells on failure or blame. Prefer the contract
and the next valid action.

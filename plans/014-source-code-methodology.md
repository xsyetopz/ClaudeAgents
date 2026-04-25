# Source-Code Methodology

v4 planning uses source code as evidence when official docs are incomplete, vague, or stale.

## Precedence

1. Official public docs define supported user-facing contracts.
2. Current source code defines actual implementation behavior.
3. Community lists identify leads only.
4. Unofficial sourcemaps are research evidence only and must be labeled.

If docs and source disagree, the platform spec records both. Adapter implementation follows the public contract unless the user explicitly targets internal behavior.

## Citation Rules

- Cite repository, file path, and symbol or behavior.
- Prefer links to source paths over copied code.
- Do not quote long proprietary or reconstructed source.
- For Claude Code sourcemap, cite paths and summarized behavior only.
- Mark unverified surfaces `UNKNOWN`.

## Required Source-Dive Sections

Every source dive records:

- repository and version/branch
- source caveat
- discovery paths
- native surfaces
- install/config paths
- lifecycle flows
- token/context mechanisms
- adapter implications
- edge cases

## Adapter Evidence Gate

An adapter cannot move from `UNKNOWN` or `partial` to `native` until:

- official docs or source path proves the surface
- install target is known
- uninstall target is known
- validation method exists
- unsupported behavior is explicitly named


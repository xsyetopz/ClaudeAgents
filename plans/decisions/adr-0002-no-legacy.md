# ADR-0002: No Legacy Compatibility

## Status
Accepted

## Context

v4 is a reimagination, not a migration. Compatibility layers would preserve v3 prompt-framework mistakes and confuse install/uninstall state.

## Decision

No v3 compatibility, aliases, migration mode, or old public flag preservation.

Uninstall may know v3 paths only to remove managed residue.

## Consequences

Easier:

- clean architecture
- less false state
- simpler docs
- stronger tests

Harder:

- users reinstall instead of migrate
- release notes must be blunt

# ADR-0005: OpenAgentLayer Name

## Status
Accepted

## Context

The rewrite is not a continuation of openagentsbtw. It is a layer above existing coding tools. The name needs to avoid v3 baggage and avoid implying a standalone agent runtime or operating system.

## Decision

Use **OpenAgentLayer**.

Names:

- product: `OpenAgentLayer`
- short name: `OAL`
- CLI: `oal`
- runner: `oal-runner`
- crate prefix: `oal-*`
- package scope if needed later: `@openagentlayer/*`
- tagline: `harness layer for coding agents`

## Consequences

Easier:

- clear product reset
- short CLI name
- accurate layer positioning

Harder:

- old docs and scripts cannot be kept as public aliases
- install/uninstall must remove v3 names without preserving compatibility

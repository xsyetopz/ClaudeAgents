# ADR-0005: OpenAgentLayer Name

## Status
Accepted

## Context

The v4 rewrite is not a framework continuation. It is an overlay harness that sits above existing coding agents and supercharges their native surfaces.

The name must avoid collisions with active projects like OpenHarness and Open Agent Kit while keeping the "Open*" lineage.

## Decision

Name the rewrite **OpenAgentLayer**.

Use:

- Product: OpenAgentLayer
- Short name: OAL
- CLI: `oal`
- Package scope: `@openagentlayer/*`
- Rust crate prefix: `oal-*`
- Runner: `oal-runner`
- Tagline: open overlay harness for coding agents

## Consequences

Easier:

- precise positioning as a layer over existing tools
- short CLI and package names
- avoids "framework" and "OS" overclaiming
- distinct from OpenHarness and Open Agent Kit

Harder:

- existing openagentsbtw docs must be rewritten to explain the rename
- install/uninstall cleanup must remove v3 names while installing OAL names


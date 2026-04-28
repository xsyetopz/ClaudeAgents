# ADR-0001: OAL Product Boundary

## Status
Accepted

## Context

openagentsbtw v3 grew into a multi-platform prompt framework with generated prompt trees, wrapper scripts, hook scripts, RTK advice, model routing, and Windows-native branches. It became hard to verify and easy to rot. The target is now a harness on top of existing tools, not another prompt pack.

The OpenAI harness engineering article points at the right shape: small entry docs, repository knowledge as system of record, agent-legible tools, mechanical enforcement, and feedback loops that let agents execute instead of requiring humans to paste context.

## Decision

OAL is a new product:

- product: `OpenAgentLayer`
- short name: `OAL`
- CLI: `oal`
- runner: `oal-runner`
- package scope if needed later: `@openagentlayer/*`
- crate prefix: `oal-*`

OAL owns:

- native adapter rendering
- install/uninstall manifests
- command runner and token-output strategy
- hook contracts and evidence gates
- model routing policy
- validation and doctor checks
- planning docs and roadmap

OAL does not own:

- model hosting
- editor extension marketplaces
- Windows-native support
- v3 compatibility
- generic chatbot therapy or life-advice behavior

## Consequences

Easier:

- clean implementation plan
- direct runtime ownership
- measurable validation
- no ambiguous old names

Harder:

- v3 users reinstall
- all public docs must change names
- old generated outputs are not reusable

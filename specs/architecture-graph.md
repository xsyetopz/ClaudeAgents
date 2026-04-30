# OpenAgentLayer architecture graph

Purpose: v4 Mermaid graph source.

Authority: normative topology companion to `openagentlayer-v4.md`.

## Source graph

```mermaid
flowchart TD
  A[Agent TOML + prompt MD] --> G[Source graph]
  S[Skill TOML + SKILL.md + assets] --> G
  C[Command TOML + prompt MD] --> G
  P[Policy TOML + runtime .mjs] --> G
  D[Guidance MD] --> G
  M[Model routing TOML] --> G
  SC[Surface config TOML] --> G
  G --> V[Source validator]
  V --> R[Render context]
```

## Package graph

```mermaid
flowchart LR
  T[types] --> D[diagnostics]
  T --> S[source]
  D --> S
  T --> R[render]
  S --> R
  T --> AC[adapter-contract]
  AC --> AD[adapters]
  T --> AD
  RT[runtime] --> AD
  AD --> R
  AC --> R
  T --> RT
  D --> RT
  AC --> IN[install]
  RT --> IN
  S --> CLI[cli]
  R --> CLI
  IN --> CLI
```

## Adapter graph

```mermaid
flowchart LR
  R[Render context] --> AD[adapters package]
  AD --> SH[shared adapter helpers]
  AD --> AC[providers/codex]
  AD --> AL[providers/claude]
  AD --> AO[providers/opencode]
  AC --> GC[Generated Codex files]
  AL --> GL[Generated Claude files]
  AO --> GO[Generated OpenCode files]
```

Additional adapters require their own surface-config study and allowlist contract before they enter this graph.

## Runtime graph

```mermaid
flowchart TD
  I[oal install] --> MF[Managed-file manifest]
  I --> CF[Config merge]
  I --> HF[Hook/runtime files]
  HF --> HG[Runtime guard]
  HG --> PE[Policy engine]
  PE --> RC[Route contract]
  PE --> SG[Shell guard]
  PE --> DG[Drift guard]
  PE --> CG[Completion gate]
```

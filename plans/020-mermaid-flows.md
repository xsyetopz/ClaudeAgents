# Mermaid Flows

## Adapter Render Pipeline

```mermaid
flowchart TD
  A[source/harness model] --> B[adapter registry]
  B --> C{platform verified?}
  C -- no --> D[mark UNKNOWN and block install]
  C -- yes --> E[render native artifacts]
  E --> F[write manifest entries]
  F --> G[validate fixture output]
```

## Command Harness Lifecycle

```mermaid
flowchart TD
  A[agent requests action] --> B{harness verb?}
  B -- yes --> C[oabtw-runner]
  B -- no --> D{raw shell justified?}
  D -- no --> E[block with exact reason]
  D -- yes --> C
  C --> F[execute bounded command]
  F --> G{large output?}
  G -- yes --> H[store artifact and summarize]
  G -- no --> I[return compact output]
```

## Hook Execution Flow

```mermaid
flowchart TD
  A[tool call] --> B[platform hook]
  B --> C[harness policy]
  C --> D{allow?}
  D -- no --> E[block exact command or file]
  D -- ask --> F[approval path]
  D -- yes --> G[execute]
  G --> H[post-command summary]
  H --> I[transcript]
```

## Skill Discovery and Lazy Loading

```mermaid
flowchart TD
  A[start session] --> B[load skill metadata]
  B --> C[route by name and description]
  C --> D{skill invoked?}
  D -- no --> E[body stays unloaded]
  D -- yes --> F[load SKILL.md body]
  F --> G{needs reference/script?}
  G -- yes --> H[load bounded extra asset]
  G -- no --> I[execute procedure]
```

## Session and Subagent Fanout

```mermaid
flowchart TD
  A[parent task] --> B{parallel evidence useful?}
  B -- no --> C[parent continues]
  B -- yes --> D[spawn narrow subagent]
  D --> E[source packet only]
  E --> F[subagent final evidence]
  F --> G[parent synthesis]
```

## Install and Uninstall Cleanup

```mermaid
flowchart TD
  A[install] --> B[probe adapters]
  B --> C[render artifacts]
  C --> D[write managed markers]
  D --> E[write manifest]
  E --> F[install smoke]
  G[uninstall] --> H[read manifest]
  H --> I[remove manifest files]
  I --> J[remove marker blocks]
  J --> K[remove known v3 residue]
  K --> L[uninstall smoke]
```

## Source Verification Gate

```mermaid
flowchart TD
  A[platform claim] --> B{official docs?}
  B -- yes --> C[record URL]
  B -- no --> D{source path?}
  D -- yes --> E[record repo path and caveat]
  D -- no --> F[mark UNKNOWN]
  C --> G[adapter may implement]
  E --> G
```


# OpenAgentLayer Specs

This directory is for product and implementation contracts. It tells AI coding
agents what OAL must be, what provider surfaces exist, and what acceptance must
prove. User-facing setup and workflow docs live in [docs/](../docs/).

Read in this order:

1. [Product contract](01_PRODUCT.md)
2. [Source, render, deploy contract](02_SOURCE_RENDER_DEPLOY.md)
3. [Provider surfaces](03_PROVIDER_SURFACES.md)
4. [Runtime hooks and message style](04_RUNTIME_HOOKS.md)
5. [Acceptance contract](05_ACCEPTANCE.md)
6. [Reference evidence](06_REFERENCE_EVIDENCE.md)

Specs must be current-state contracts:

- write requirements as behavior OAL owns now or must validate before release
- keep provider differences explicit
- avoid vague roadmap prose
- make every rule easy for an AI coding model to cite while editing code

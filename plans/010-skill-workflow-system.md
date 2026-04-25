# Skill and Workflow System

Skills and workflows are separate.

## Skill

A skill is a reusable capability package.

Required:

- metadata
- `SKILL.md`
- short description for routing

Optional:

- `references/`
- `scripts/`
- `assets/`
- `mcp/`
- platform overlays

Rules:

- one job per skill
- body stays procedural
- references hold bulk material
- scripts do deterministic work
- platform overlays are generated, not hand-forked

## Workflow

A workflow is an ordered phase map.

Examples:

- research -> plan -> implement -> validate -> review -> ship
- reproduce -> isolate -> patch -> regression-test
- source-verify -> adapter-render -> install-smoke -> uninstall-smoke

Rules:

- workflows name gates
- workflows do not duplicate skill bodies
- workflows may call skills
- workflows may assign subagents

## Tasks

Tasks are concrete executable checklists generated from workflows.

Each task records:

- owner role
- target files/subsystem
- acceptance criteria
- validation commands
- blockers

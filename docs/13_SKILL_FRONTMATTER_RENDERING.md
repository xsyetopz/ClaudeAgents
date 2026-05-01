# 13 - Skill Frontmatter Rendering

## Principle

`source/skills/**` is OAL source, not provider output. OAL renders each source
skill into provider-native `SKILL.md` files and deploys those generated files to
Codex, Claude Code, and OpenCode.

Source skill prose lives in `body.md`. Provider frontmatter is generated from
`skill.json`, `body.md`, route bindings, policy records, and provider adapters.

## Source shape

```text
source/skills/<skill-id>/
  skill.json  # terse graph metadata
  body.md     # provider-neutral instructions
  references/
  scripts/
  assets/
```

`skill.json` stays structural:

```json
{
  "id": "drive-tdd",
  "kind": "skill",
  "body": "body.md",
  "activation": {
    "mode": "route-scoped",
    "routes": {
      "include": ["implement", "test"],
      "exclude": ["document"]
    }
  },
  "render": {
    "targets": ["codex", "claude", "opencode"]
  }
}
```

## Generated and deployed paths

Project-scope render targets:

```text
generated/codex/project/.codex/skills/<skill-id>/SKILL.md
generated/claude/project/.claude/skills/<skill-id>/SKILL.md
generated/opencode/project/.opencode/skills/<skill-id>/SKILL.md
```

Project-scope deploy targets:

```text
.codex/skills/<skill-id>/SKILL.md
.claude/skills/<skill-id>/SKILL.md
.opencode/skills/<skill-id>/SKILL.md
```

## Frontmatter matrix

### Portable core

Use for every rendered provider unless the provider adapter rejects a field:

```yaml
---
name: drive-tdd
description: Drive test-first development with red-green-refactor vertical slices through public behavior. Use when building or fixing with TDD.
---
```

Rules:

- `name` matches the generated skill directory.
- `name` is lowercase alphanumeric with single hyphen separators.
- `description` is 1-1024 characters and includes what the skill does plus when
  to use it.

### Claude Code

Claude Code requires `name` and `description`. It also supports
`allowed-tools` in Claude Code CLI, but not through the Claude Agent SDK.

Example:

```yaml
---
name: triage-issue
description: Reproduce, classify, root-cause, and package an issue into a fix plan. Use for failures, regressions, bug reports, or issue intake.
allowed-tools: Read, Grep, Glob, Bash
---
```

Rendering rule:

- emit `allowed-tools` only for Claude Code CLI targets;
- derive allowed tools from route contracts and policy records;
- do not emit `allowed-tools` for Claude SDK targets.

### OpenCode

OpenCode recognizes only:

- `name` (required);
- `description` (required);
- `license` (optional);
- `compatibility` (optional);
- `metadata` (optional string-to-string map).

Unknown frontmatter fields are ignored, so OAL should not emit provider-ignored
fields into OpenCode output.

Example:

```yaml
---
name: zoom-out
description: Map higher-level context around unfamiliar code, modules, callers, data flow, constraints, and ownership.
compatibility: opencode
metadata:
  oal-route: explore,trace,plan
---
```

Rendering rule:

- use OpenCode `permission.skill` in `opencode.json` for access control;
- use agent frontmatter or `opencode.json` agent config to disable the skill
  tool where needed;
- do not use Claude-only `allowed-tools`.

### Codex

Codex Skills follow the Agent Skills open standard. Until a Codex-specific
frontmatter extension is pinned in OAL docs, emit only the portable core plus
fields that are validated against Codex docs or a pinned allowlist.

Example:

```yaml
---
name: create-skill
description: Create or audit Agent Skill folders with concise instructions, progressive disclosure, and bundled resources.
---
```

Rendering rule:

- keep Codex skill permissions in Codex config, agent config, or policy records;
- do not invent Codex-only frontmatter keys;
- add Codex-specific keys only after research pins the key, constraints, and
  validation behavior.

## Validation requirements

Render tests must verify:

1. generated `name` matches directory name;
2. generated `description` is non-empty and within provider limit;
3. Claude CLI emits allowed `allowed-tools` only when policy permits it;
4. Claude SDK output omits `allowed-tools`;
5. OpenCode output contains only recognized keys;
6. Codex output contains only the portable core or pinned allowlisted keys;
7. generated `SKILL.md` body comes from `body.md` and progressive-disclosure
   resources, not from provider-specific source copies.

Do not test skill prose wording, heading text, Markdown structure, or exact
body content. Treat `body.md` as authored product content. Tests should cover
render contracts, schema validity, deploy placement, and provider parser
compatibility.

## Research pointers

- Claude Code Agent Skills docs: `https://docs.claude.com/en/docs/claude-code/skills`
- Claude Agent SDK skills docs: `https://code.claude.com/docs/en/agent-sdk/skills`
- OpenCode Agent Skills docs: `https://opencode.ai/docs/skills/`
- OpenAI Skills in ChatGPT help: `https://help.openai.com/en/articles/20001066-skills-in-chatgpt`
- Agent Skills specification: `https://agentskills.io/specification`

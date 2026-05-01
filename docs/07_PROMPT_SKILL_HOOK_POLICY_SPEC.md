# 07 — Prompt, Skill, Hook, RTK, Caveman, and Taste Policy Specification

## Prompt thesis

Prompts are contracts. They should not be personality essays. Every prompt must clarify job boundary, tool boundary, evidence requirements, completion criteria, and anti-patterns.

V3 prompts contain good pieces, but the output formats and route behavior are too static. V4 should separate reusable role contracts from route-specific instructions.

## Prompt layering

Render prompts from layers:

```text
role identity
+ provider overlay
+ route contract
+ model-budget note
+ tool/permission rules
+ active skills
+ completion gate language
+ output format
```

The source prompt body should not include provider-specific tool names unless a provider overlay injects them.

## Prompt anti-patterns

1. “Be helpful and comprehensive” without hard completion rules.
2. Generic “Capabilities” sections that do not affect behavior.
3. Role prompts that contradict permissions.
4. Route prompts that ask for implementation from read-only agents.
5. Output templates that force essays when a table or diff summary is enough.
6. “Ask clarifying questions” as default behavior when repo evidence can answer.
7. Style layers that hide blockers.

## Route prompt contracts

### Implement

Must produce a concrete diff or a structured blocker.

Required final shape:

```markdown
## Changes
- `path`: change summary

## Verification
- PASS/FAIL/SKIPPED: exact command or reason

## Notes
- Only material caveats
```

Blocker format:

```markdown
BLOCKED: single concrete blocker
Attempted: steps already taken
Evidence: exact error/output/path
Need: specific missing input/permission/decision
```

### Review

Must be findings-first:

```markdown
## Findings
| Severity | File | Issue | Fix |
| -------- | ---- | ----- | --- |

## Non-blocking
...

## Verification gaps
...
```

No “looks good overall” before findings.

### Explore

Must cite paths and avoid speculation:

```markdown
## Findings
- `path:line`: fact

## Map
...

## Not found
...
```

### Test

Must include command evidence:

```markdown
## Commands
- PASS/FAIL: `command`

## Failures
- test name, error, likely cause

## Next fix target
- exact file/function when known
```

## Skill model

Skills are portable instruction bundles. In v4 they should be scoped and measured.

Skill metadata must include:

```toml
id = "taste-skill"
source_package = "third-party"
activation = "manual | route-scoped | always"
allowed_routes = ["design", "ui-review"]
forbidden_routes = ["security", "test-output", "structured-data"]
can_run_scripts = false
```

## Skill invocation policy

| Skill         | Activation             | Reason                                |
| ------------- | ---------------------- | ------------------------------------- |
| `review`      | route-scoped           | Useful in implementation/review.      |
| `test`        | route-scoped           | Validation routes.                    |
| `security`    | route-scoped           | Sensitive; do not always-on.          |
| `caveman`     | user/deficit-scoped    | Output compression, not task control. |
| `taste-skill` | design/UI-scoped       | Can distort non-UI work if always-on. |
| `rtk`         | measured prose-scoped  | Rewrite only safe prose.              |
| `handoff`     | explicit or compaction | Avoid unsolicited memory churn.       |

## Caveman integration policy

Caveman is valuable as an output-token reducer and style layer. It should not become the default reasoning policy.

Recommended modes:

| Mode     | Use                                               |
| -------- | ------------------------------------------------- |
| off      | default for code/review/test unless user opted in |
| lite     | deficit mode final responses                      |
| full     | user-requested terse mode                         |
| ultra    | only for summaries/status, not instructions       |
| commit   | commit message route only                         |
| compress | compaction/handoff input compression              |

Never Caveman-rewrite:

- code;
- commands;
- JSON/TOML/YAML;
- error output;
- security findings;
- exact citations;
- legal/compliance language;
- generated docs unless user explicitly wants terse docs.

## Taste Skill integration policy

Taste Skill should be first-class for UI/design routes, not global. It has specialized skills for premium frontend output, GPT/Codex stricter rules, image-to-code, redesign, softer/minimal/brutalist styles, Stitch-compatible output, image generation, and brand kits.

Recommended OAL mapping:

| Taste skill           | OAL route                     | Agent                    |
| --------------------- | ----------------------------- | ------------------------ |
| `taste-skill`         | design/default UI polish      | Apollo/Aphrodite         |
| `gpt-taste`           | Codex frontend implementation | Apollo/Hephaestus        |
| `image-to-code-skill` | image-to-code pipeline        | Apollo                   |
| `redesign-skill`      | existing UI audit/fix         | Apollo/Aphrodite         |
| `output-skill`        | completion failure            | Hephaestus gate fallback |
| `imagegen-*`          | design reference generation   | Aphrodite/Apollo         |
| `brandkit`            | brand board                   | Aphrodite                |

Taste Skill must be disabled for backend migrations, security audits, test output, and exact technical documentation unless explicitly requested.

## RTK policy

RTK should be an optional policy stage, not a universal proxy.

### Allowed RTK scopes

- final prose response;
- status summaries;
- handoff summaries;
- long generated explanation paragraphs;
- non-normative docs drafts;
- conversational idle text.

### Denied RTK scopes

- code;
- shell commands;
- diffs;
- structured data;
- tests;
- logs;
- exact errors;
- path/line citations;
- security findings;
- migration SQL;
- prompts that are themselves source artifacts.

### RTK measurement

Every RTK pass should record:

```json
{
  "scope": "final_response",
  "input_chars": 4200,
  "output_chars": 1900,
  "compression_ratio": 0.45,
  "blocked_sections": ["code", "commands"],
  "accepted": true
}
```

If average useful compression is less than 25% after protected blocks are excluded, disable automatic RTK for that route.

## Hook policy model

Hooks are runtime policy functions. They should follow a small protocol:

```ts
type PolicyInput = {
  event: string;
  surface: Surface;
  route?: string;
  agent?: string;
  cwd: string;
  tool?: string;
  toolInput?: unknown;
  transcriptTail?: string;
  git?: GitState;
};

type PolicyResult =
  | { action: "allow" }
  | { action: "deny"; message: string }
  | { action: "warn"; message: string }
  | { action: "context"; content: string }
  | { action: "request_confirmation"; message: string };
```

## Required v4 policies

### Safety and mutation

- `destructive-command-guard`
- `protected-branch-confirm`
- `staged-secret-guard`
- `credential-file-read-deny`
- `external-directory-guard`
- `git-attribution-guard`

### Completion quality

- `placeholder-output-deny`
- `route-contract-completion-gate`
- `implementation-without-diff-deny`
- `test-route-without-command-deny`
- `review-without-findings-warn`
- `docs-only-implementation-deny`

### Context enrichment

- `prompt-git-context`
- `session-route-context`
- `subagent-route-context`
- `compaction-state-injector`
- `memory-handoff-context`

### Efficiency

- `budget-pressure-context`
- `output-token-mode-context`
- `rtk-safe-scope-router`
- `caveman-mode-context`

## Provider hook mapping examples

| Policy                           | Claude                    | Codex                                   | OpenCode                                   |
| -------------------------------- | ------------------------- | --------------------------------------- | ------------------------------------------ |
| `destructive-command-guard`      | `PreToolUse` Bash matcher | shell pre-tool if supported             | permission/bash deny or plugin before tool |
| `route-contract-completion-gate` | `Stop` / `SubagentStop`   | completion hook if supported            | plugin/session or command wrapper          |
| `subagent-route-context`         | `SubagentStart`           | unsupported/native alternative required | `tool.execute.before` task                 |
| `prompt-git-context`             | `UserPromptSubmit`        | prompt submit/context hook if supported | plugin/session context                     |

Unsupported mappings must be explicit diagnostics.

## Runtime test requirements

For every policy:

1. Unit test direct function.
2. Test rendered script with stdin fixture.
3. Test provider mapping existence.
4. Test deny/warn/context protocol output.
5. Test no-op behavior for unsupported or irrelevant events.
6. Test security-sensitive edge cases.

## Prompt/skill/hook acceptance gate

Before v4 release:

- no role prompt contradicts permissions;
- no route has missing completion contract;
- no skill has undocumented activation scope;
- no hook renders for unsupported event;
- no RTK/Caveman/Taste layer can rewrite protected artifacts;
- all policy scripts have parity tests across direct function and rendered file.

# 01 — Current State and v3 Audit

## Finding

V3 is neither a clean harness nor a framework. It is a cross-provider generated configuration package with agent roles, skills, commands, hooks, runtime scripts, install scripts, and subscription routing layered together. That can be valuable, but the current architecture makes unrelated changes interfere with each other.

The best v4 framing is: **OpenAgentLayer is an agent surface compiler**.

A compiler can have provider adapters, validation, deploy manifests, and runtime policy tests. A harness implies test execution around a target system. A framework implies users build applications inside it. OpenAgentLayer does neither cleanly. It compiles and deploys agent-facing surfaces for existing agent CLIs.

## Evidence from current repo shape

Current public documentation says canonical source lives under `source/`, with agents in `source/agents/<agent>/`, skills in `source/skills/<skill>/`, commands under provider-specific command directories, hook policies in `source/hooks/policies/`, and guidance under `source/guidance/`. The same docs say `scripts/generate.mjs` should remain a thin orchestrator and heavy logic should live in focused renderers or loaders.

Current code contradicts that rule. `scripts/generate.mjs` contains rendering logic for skills, agents, hooks, OpenCode git hooks, Codex wrappers, platform overlays, Caveman prompt/runtime, and generated directories. The file is doing product logic, rendering, provider mapping, runtime policy generation, and filesystem writes together. That is the clearest structural smell.

The repo also has evidence of a reverted v4 attempt. A recent commit message says “restore v3 because rest were broken apparently.” That is not just a git detail; it means the next v4 should avoid a wide rewrite that changes source, renderers, deploy behavior, runtime policies, and tests in one motion.

## What is working in v3

V3 has important salvageable pieces.

1. The source-tree idea is right. Colocated agent metadata/prompt and skill metadata/body is maintainable.
2. The Greek agent taxonomy is memorable and useful.
3. Most individual prompts are stronger than the user-facing symptoms suggest. Hephaestus has useful implementation constraints; Athena has an evidence gate; Hermes insists on citations; Odysseus forbids direct editing.
4. The Codex config already uses several valuable keys: profile-specific model routing, `model_instructions_file`, `history`, `compact_prompt`, `sqlite_home`, `model_verbosity`, `model_reasoning_summary`, `agents.max_threads`, and feature flags.
5. The project already understands Caveman and Taste Skill as portable skill integrations rather than one-off copied prompts.
6. The hook-policy concept is right: runtime checks should be authored once, then adapted to native provider event surfaces.

## What is structurally wrong

### 1. Fake provider parity

Provider behavior is not symmetrical. Claude Code exposes rich hooks such as `SubagentStart` and `SubagentStop`; Codex currently does not expose a Claude-style `SubagentStart` event in the policy file under `source/hooks/policies/subagent-route-context.json`; OpenCode has primary agents, subagents, plugins, config directories, and a permission system. V3 tries to maintain one mental model across all surfaces, but each provider’s native mechanism is different.

V4 must compile the same capability to different native shapes, not force every provider to look like Claude.

### 2. Model routing is duplicated

There are at least three model-routing centers:

- per-agent metadata under `source/agents/*/agent.json`;
- subscription routing under `source/subscriptions.mjs`;
- rendered sample profiles under `codex/templates/config.toml`.

This makes it easy for one route to believe a role is `gpt-5.3-codex/high` while another renders `gpt-5.5/medium` or a profile-default fallback. V4 needs one model plan graph and all surfaces must resolve through it.

### 3. Contract mismatches create broken agents

Some records disagree with their own prompt and tool posture. Example pattern:

- A documentation role may have a readonly contract while tools and Codex sandbox allow writes.
- A coordinator may be declared `edit-required` while its prompt says it never modifies files and its Codex sandbox is read-only.

These mismatches are serious. Completion gates and stop hooks will make the wrong decision when the route contract and actual tool permissions disagree.

### 4. Hooks do too much and explain too little

Hooks should be small, deterministic policies. They should either enrich context, deny unsafe work, request confirmation, or evaluate completion. V3 mixes runtime policy, route semantics, generated scripts, and provider compatibility mappings. V4 should give every hook a typed policy record:

```yaml
id: protected-branch-confirm
kind: mutation_guard
inputs: [git_branch, command]
decision: deny | allow | context | warn
surfaces:
  claude: PreToolUse(Bash(git push *))
  codex: PreToolUse(shell git push *)
  opencode: permission/bash or plugin hook
runtime_test: protected_branch_unconfirmed_push_denied
```

### 5. RTK is positioned as a rewrite layer instead of a budgeted prose policy

The user reports 50%-or-less `rtk-ai/rtk` efficiency. The likely design issue is not RTK alone; it is using a rewrite/proxy layer as an always-on global treatment. That invites false savings, extra latency, and lower task quality. V4 should use RTK only as a measured compression/prose stage with allow/deny scopes.

Recommended rule: RTK may rewrite status messages, handoffs, docs summaries, and optionally final narrative. It must not rewrite code, commands, diffs, error messages, test output, security findings, exact citations, or structured JSON/TOML/YAML artifacts.

### 6. Codex config is not normalized

The sample Codex config repeats feature flags per profile. It also contains probable contradictions: a `[memories]` section enables memory behavior while profile features set `memories = false`; the plugin entry is present while profile features set `plugins = false`. Repetition makes subtle drift likely.

V4 needs named feature presets such as:

```toml
[profiles.oal-main]
features_preset = "oal-stable"

[feature_presets.oal-stable]
codex_hooks = true
sqlite = true
multi_agent = true
responses_websockets_v2 = true
plugins = true
memories = false
```

If Codex does not support named presets natively, OAL should own the preset in source and expand it during render while validating expansion.

### 7. “More agents” is not automatically better

V3 already has role overlap. Hermes explores, Athena analyzes, Nemesis reviews, Atalanta debugs tests, Odysseus orchestrates. Adding more Greek names helps only if each new role differs in at least one hard dimension: tool permissions, model/effort tier, completion contract, invocation trigger, or output artifact.

V4 should add agents where they eliminate ambiguity, not because names are available.

## Severity ranking

| Severity | Issue                               | Why it matters                                                |
| -------- | ----------------------------------- | ------------------------------------------------------------- |
| Blocker  | Contract/tool/model mismatches      | Agents are routed under false assumptions.                    |
| Blocker  | Provider parity illusion            | Hooks/skills silently fail or degrade on non-Claude surfaces. |
| High     | Generator as god script             | Every change risks unrelated generated drift.                 |
| High     | Duplicated model plans              | Usage budget cannot be controlled.                            |
| High     | Unmeasured RTK/Caveman/Taste layers | Output style layers may hide task failures.                   |
| Medium   | Too many repeated config flags      | Schema drift and stale keys.                                  |
| Medium   | Weak golden tests                   | Generated files can look valid but be behaviorally wrong.     |

## What v4 should delete or demote

1. Delete provider-specific legacy directories as active source. Keep them as generated output only.
2. Delete implicit defaults hidden in renderers. Defaults must live in source graph records.
3. Delete all cross-provider “same hook event” assumptions.
4. Delete model defaults from agent records if model plans exist.
5. Delete global always-on prose rewriting.
6. Demote Copilot from first v4 target unless there is a hard requirement; Codex, Claude Code, and OpenCode are enough for a stable v4 core.

## Audit conclusion

V3’s problem is not that the prompts are all weak. The deeper problem is that prompts, contracts, tools, providers, model plans, and runtime policies are not compiled from a single validated semantic graph. V4 should build that graph first, then render provider-native artifacts from it.

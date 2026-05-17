# Phase 00.6 Study — Host Capability Brokers

## 1. Bottom line

**Decision:** Sandboxed code must not receive raw host credentials or broad home-directory access. If a sandboxed Pi package/extension needs authenticated host action, it should request a narrow Olympus host broker capability.

**Reference case:** `gh` inside the sandbox lacks auth because `~/.config/gh`/credential stores are not mounted. Running unrestricted `gh` outside the sandbox has auth but can mutate host/project state. Olympus should broker specific GitHub operations instead of exposing credentials or arbitrary shell.

**Decision:** Broker calls are structured requests, not shell strings. Each call validates command, subcommand, args, cwd, target repo, output handling, and confirmation requirements.

**Decision:** `skip-permissions` may suppress confirmations only for pre-approved operations inside an OS sandbox. It must never expose host home/auth files and must never bypass broker validation.

## 2. Facts from sources

### Pi hook/tool facts

- **Fact:** Pi extensions can intercept `tool_call`, `tool_result`, `before_provider_request`, and user input events. Source: `https://pi.dev/docs/latest/extensions`; local mirror `dist/core/extensions/types.d.ts`.
- **Fact:** Pi tools can be registered/overridden by extensions; command collisions and hook ordering are material safety risks. Source: `https://pi.dev/docs/latest/extensions`; local mirror `dist/core/extensions/runner.js`.
- **Fact:** Pi packages/extensions run with full system access unless externally constrained. Source: `https://pi.dev/docs/latest/packages`, `https://pi.dev/docs/latest/extensions`.

### GitHub CLI facts

- **Fact:** `gh auth login` authenticates GitHub CLI and stores a token securely in the system credential store, falling back to a plain text file if a credential store is unavailable. Source: `https://cli.github.com/manual/gh_auth_login`.
- **Fact:** GitHub CLI environment variables `GH_TOKEN`/`GITHUB_TOKEN` can provide a token for github.com and subdomains of ghe.com; `GH_ENTERPRISE_TOKEN`/`GITHUB_ENTERPRISE_TOKEN` handle Enterprise hosts. Source: `https://cli.github.com/manual/gh_help_environment`.
- **Fact:** `GH_HOST` and `GH_REPO` influence command target host/repository. Source: `https://cli.github.com/manual/gh_help_environment`.
- **Fact:** `gh api` can make authenticated GitHub API requests. Source: `https://cli.github.com/manual/gh_api`.
- **Fact:** GitHub CLI supports many read and mutating subcommands, including issue/pr/comment/list/view/status/checks/review/merge/edit/delete workflows. Source: `https://cli.github.com/manual/`.

### Package/registry auth facts

- **Fact:** npm supports access tokens and private package workflows; npm package integrity/provenance do not remove the need to protect credentials. Source: `https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json`, `https://docs.npmjs.com/generating-provenance-statements`, npm access-token docs.
- **Fact:** Package managers and CLIs commonly read credentials from home/config files or environment variables. Source: GitHub CLI environment/auth docs above; npm/private-package docs.

## 3. Olympus design inferences

### Broker architecture

**Inference:** Olympus should expose a broker RPC surface to sandboxed processes:

```text
sandboxed package/extension
  -> structured broker request over stdin/stdout, pipe, or socket
  -> Olympus host broker validates policy/lock/capability/args/cwd
  -> broker runs narrow host command or API call
  -> broker redacts output
  -> broker returns structured result
```

**Decision:** The sandbox never receives:

- `~/.config/gh`;
- `~/.ssh`;
- `~/.gitconfig` if it contains credentials/helpers beyond what is explicitly needed;
- `~/.npmrc`/registry tokens;
- `~/.pi/agent/auth.json`;
- raw `GH_TOKEN`, npm tokens, cloud tokens, or provider API keys.

### Broker request shape

Study-level shape:

```json
{
  "broker": "gh",
  "operation": "pr.view",
  "mode": "read",
  "repo": "owner/name",
  "cwd": "/sandbox/project-ro",
  "args": {
    "number": 123,
    "json": ["number", "title", "state", "headRefName"]
  },
  "requestedBy": {
    "packageId": "npm:@scope/pkg@1.2.3",
    "lockDigest": "sha256:...",
    "sandboxProfile": "brokered-host-tools"
  }
}
```

**Decision:** Brokers must reject freeform shell strings such as `gh api "$USER_INPUT"`, `git "$@"`, or `npm $COMMAND` unless they are decomposed into typed operations with allowlisted arguments.

### GitHub broker

**Read-only candidates**

- `gh auth status` equivalent, but redacted and only as boolean/scope summary.
- `gh repo view` for selected repo.
- `gh pr view`, `gh pr list`, `gh pr diff`, `gh pr checks`, `gh pr status`.
- `gh issue view`, `gh issue list`.
- `gh run view --log` only with redaction and size limits.
- `gh api GET /repos/{owner}/{repo}/...` for allowlisted endpoints.

**Mutating candidates requiring confirmation**

- `gh pr comment`, `gh pr review`, `gh pr edit`, `gh pr merge`, `gh pr close`, `gh pr update-branch`.
- `gh issue comment`, `gh issue edit`, `gh issue close/reopen`.
- `gh release create/edit/delete`.
- `gh workflow run/enable/disable`.
- `gh api` with POST/PATCH/PUT/DELETE.

**Always denied by default**

- `gh auth token` or any operation returning raw tokens.
- `gh auth login/logout/refresh/setup-git` from sandbox request.
- `gh extension install/exec/remove` unless explicit trusted-dev/unsafe.
- `gh alias set` or config mutation.
- arbitrary `gh api` endpoints outside allowlist.

**Validation rules**

- repo must match allowed repo from lock/policy or explicit user selection;
- host must be allowlisted;
- no shell metacharacter parsing because there is no shell;
- args are typed and normalized;
- output fields are allowlisted where possible via `--json`;
- max output size and timeout enforced;
- cwd must be under sandbox/project read-only or declared project root if host command requires it;
- mutating operations require exact preview and confirmation.

### Git broker

**Read-only candidates**

- `git status --porcelain=v1` or `--short` in an allowed repo.
- `git diff --`, `git diff --stat`, `git log`, `git show`.
- `git rev-parse --show-toplevel`, `git branch --show-current`.
- `git ls-files`.

**Mutating candidates requiring confirmation**

- `git add` limited to declared output files.
- `git commit` only in trusted-dev or explicit workflow.
- `git checkout`/`switch` with restrictions.
- `git stash`.
- `git fetch` if network is allowed.
- `git push` requiring explicit confirmation.

**Always denied by default**

- `git clean`.
- `git reset --hard`.
- `git checkout .` / destructive restore.
- `git config --global`.
- commands invoking custom external diff/merge hooks unless disabled.
- arbitrary aliases.

**Inference:** Brokered git should run with `GIT_CONFIG_GLOBAL` redirected to an empty file or with config protections where possible to avoid arbitrary user-global config effects.

### Registry auth broker

**Read-only candidates**

- fetch registry metadata for a package/version;
- fetch tarball into a quarantine/temp cache;
- verify integrity/signature/provenance;
- report whether private package access is available without exposing token.

**Mutating candidates requiring confirmation**

- package publish/deprecate/dist-tag changes: likely out of Olympus scope initially;
- package install into project/global: must go through Olympus install policy.

**Always denied by default**

- exposing raw npm tokens;
- writing `~/.npmrc`;
- global package manager config mutation;
- executing lifecycle scripts during inspect/eval.

### Future cloud CLI brokers

**Inference:** Cloud brokers should be allowlist-first and API-specific:

- read inventory/status operations may be permitted with redaction;
- mutations require confirmation and explicit capability;
- no raw `aws`, `gcloud`, `az`, `kubectl` shell strings from sandbox;
- no mounting of cloud credential dirs into sandbox;
- outputs redact account IDs, secrets, bearer tokens, kubeconfigs, connection strings where appropriate.

### Output redaction

**Decision:** Every broker response is scanned before returning to the sandbox/model:

- auth headers;
- tokens and API keys;
- private keys;
- GitHub tokens;
- npm tokens;
- cloud keys;
- connection strings;
- emails/account identifiers if policy requires;
- oversized logs truncated with evidence.

### Audit log

**Decision:** Every broker call records:

- timestamp;
- package/resource identity;
- lock digest;
- sandbox profile;
- requested operation;
- normalized args;
- cwd;
- decision: allow/deny/confirm;
- user confirmation id if any;
- redaction count/rules;
- exit status;
- output size/truncation;
- no raw secret values.

## 4. Risks/limitations

- **Risk:** A broker can become a confused deputy if it exposes broad operations like `gh api` without endpoint/method allowlists.
- **Risk:** Even read-only outputs may include secrets in logs, CI output, diffs, issue text, or PR comments.
- **Risk:** Git commands can trigger hooks, pagers, external diff/merge tools, or config behavior unless environment/config is sanitized.
- **Risk:** `gh`/git/npm behavior can change across versions; broker tests must pin or detect CLI capabilities.
- **Risk:** Host broker operations may mutate remote state even if local filesystem is contained.
- **Risk:** Broker calls can leak metadata through network even when the sandbox itself has network denied.
- **Unknown:** Whether Phase 02 should implement brokers by shelling to host CLIs or by calling APIs directly.
- **Unknown:** Whether broker authorization should be stored in `olympus.lock`, a session policy, or both.

## 5. Phase 01 / Phase 02 questions

1. Which broker should be implemented first: `gh`, `git`, or registry metadata?
2. Should `gh api` be supported at all, or only high-level typed operations?
3. How should Olympus validate that host `gh` is authenticated without exposing token details?
4. Should brokered mutation be disabled entirely until read-only brokers are proven?
5. Should brokers be available to third-party packages or only first-party Olympus extensions in Phase 02?
6. How should broker capabilities be represented in `olympus.lock`?
7. What redaction engine/pattern set is release-blocking for broker outputs?
8. Should broker calls require a visible session transcript entry for every remote mutation?

## 6. Source list

- Pi extensions/events/tools: `https://pi.dev/docs/latest/extensions`; local mirror `/Users/krystian/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md`
- Pi packages: `https://pi.dev/docs/latest/packages`
- Pi repository: `https://github.com/earendil-works/pi`
- GitHub CLI manual: `https://cli.github.com/manual/`
- `gh auth login`: `https://cli.github.com/manual/gh_auth_login`
- `gh api`: `https://cli.github.com/manual/gh_api`
- GitHub CLI environment variables: `https://cli.github.com/manual/gh_help_environment`
- Git documentation: `https://git-scm.com/docs`
- npm lockfile/integrity: `https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json`
- npm provenance: `https://docs.npmjs.com/generating-provenance-statements`
- npm registry signatures: `https://docs.npmjs.com/about-registry-signatures`

## Skip-permissions semantics

**Decision:** `skip-permissions` means: skip repeated user confirmations for operations already allowed by the active sandbox profile, lockfile trust decision, and broker capability policy.

**Decision:** `skip-permissions` must not:

- disable OS sandboxing;
- mount host home;
- expose raw credentials;
- allow arbitrary shell strings;
- bypass path allowlists;
- bypass broker validation;
- permit network when profile denies network;
- mutate global Pi state unless explicit profile/capability allows it;
- turn `brokered-host-tools` into `unsafe-host`.

**Decision:** Operations that remain blocked regardless of `skip-permissions`:

- reading `~/.ssh`, `~/.config/gh`, `~/.pi/agent/auth.json`, cloud credentials, or raw token files;
- deleting outside sandbox/output roots;
- changing global config;
- unreviewed executable package code;
- hash-mismatched locked package execution;
- package lifecycle scripts in inspect-only/dry-run;
- direct network from offline profiles.

**Decision:** Operations requiring a broker:

- authenticated GitHub/GitLab/registry/cloud reads;
- git operations using host repo state;
- package registry private metadata fetches;
- remote mutations such as commenting, merging, publishing, pushing.

**Decision:** Operations requiring explicit `unsafe-host` or trusted-dev mode:

- unrestricted shell on host;
- raw credential file access;
- arbitrary `gh api` or cloud CLI command strings;
- global package manager changes;
- global Pi state mutation outside Olympus-managed keys;
- running third-party code without OS containment.

# Phase 00.6 Study — OS Sandbox Options

## 1. Bottom line

**Decision:** Olympus runtime safety must be OS-centric. Pi hooks are useful policy points, but untrusted Pi extension/package code must not run with unrestricted host access.

**Decision:** Phase 02 should treat containment as platform-gated:

- **Linux:** rootless `bubblewrap` is the most realistic first OS sandbox target where user namespaces are available.
- **macOS:** `sandbox-exec`/Seatbelt may be useful for research but is deprecated; robust Phase 02 support likely needs a temporary-home + restrictive process wrapper at minimum, or an external container/VM strategy for strong claims.
- **Windows:** Job Objects alone are not enough for filesystem/credential containment; AppContainer/Windows Sandbox/containers require more platform work. Mark untrusted executable package execution unsupported until containment is proven.

**Decision:** `unsafe-host` is outside Olympus safety guarantees. `skip-permissions` may suppress model/tool confirmations only inside an already-contained sandbox; it must never disable OS containment.

## 2. Facts from sources

### Pi/Pi package execution facts

- **Fact:** Pi packages can include extensions, skills, prompts, and themes, and packages/extensions run with full user permissions unless externally constrained. Source: `https://pi.dev/docs/latest/packages`, `https://pi.dev/docs/latest/extensions`.
- **Fact:** Pi extensions can register/override tools and commands and intercept tool calls/provider requests. Source: `https://pi.dev/docs/latest/extensions`; local mirror `dist/core/extensions/types.d.ts`.
- **Fact:** Pi's package model supports local path, npm, and git package sources, so Olympus must handle executable code from mutable/local and remote origins. Source: `https://pi.dev/docs/latest/packages`.

### macOS

- **Fact:** `sandbox-exec` runs a command within a sandbox profile but the command is documented as deprecated; the man page says developers should adopt App Sandbox instead. Source: `https://keith.github.io/xcode-man-pages/sandbox-exec.1.html`.
- **Fact:** Apple App Sandbox is the supported Apple application sandboxing model, but it is app/entitlement-oriented rather than a simple portable CLI wrapper. Source: `https://developer.apple.com/documentation/security/app_sandbox`.
- **Fact:** macOS can still use process environment isolation techniques independent of Seatbelt: temp home directories, restricted environment variables, sanitized `PATH`, and explicit working/output dirs. Source: general OS process model; design inference rather than a Pi fact.

### Linux

- **Fact:** Bubblewrap is a low-level unprivileged sandboxing tool used by Flatpak and similar projects. Its README describes using Linux user namespaces so unprivileged users can use container features. Source: `https://github.com/containers/bubblewrap`.
- **Fact:** `bwrap` creates an empty filesystem namespace on tmpfs, supports bind mounts, read-only bind mounts (`--ro-bind`), tmpfs mounts, user/ipc/pid/network/uts namespaces, `--unshare-net`, and seccomp filters. Source: `https://manpages.debian.org/bookworm/bubblewrap/bwrap.1.en.html`.
- **Fact:** Bubblewrap's own documentation warns that sandbox protection depends on the arguments passed to it. Source: `https://github.com/containers/bubblewrap`.
- **Fact:** Firejail is a Linux sandbox using namespaces and seccomp-bpf; it also references Landlock support for restricting filesystem access where available. Source: `https://github.com/netblue30/firejail`, `https://firejail.wordpress.com/documentation-2/basic-usage/`.
- **Fact:** nsjail is a Linux process isolation tool using namespaces, cgroups, rlimits, and seccomp-bpf, with read-only mounts and network isolation support. Source: `https://github.com/google/nsjail`.
- **Fact:** Containers can isolate processes but commonly need daemon/runtime setup, images, and may require elevated configuration depending on platform. Source: Docker/Podman/container ecosystem; Windows container source below.

### Windows

- **Fact:** AppContainer provides least-privilege isolation and blocks many resources by default; it can broker selected resources. Source: `https://learn.microsoft.com/en-us/windows/win32/secauthz/appcontainer-isolation`.
- **Fact:** Windows Job Objects manage groups of processes/resources, but by themselves are not a complete filesystem/home/credential sandbox. Source: `https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects`.
- **Fact:** Windows Sandbox provides a clean isolated Windows environment; networking is enabled by default but can be disabled in the configuration file. It is not supported on Windows Home edition. Source: `https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-overview`.
- **Fact:** Windows Sandbox mapped folders support read-only host folder sharing. Source: `https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-configure-using-wsb-file`.
- **Fact:** Windows containers package apps with runtime/dependencies and isolate them, but require container infrastructure. Source: `https://learn.microsoft.com/en-us/virtualization/windowscontainers/about/`.

## 3. Olympus design inferences

### Viability table

| Platform/mechanism | CLI viability | Root/admin needed? | Deny home? | Deny network? | Project RO/output RW? | Run Node/Bun/TS? | Phase 02 realism |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Linux bubblewrap | high on supported distros | no if user namespaces enabled | yes via mount namespace | yes via `--unshare-net` | yes via `--ro-bind` + writable tmp/output bind | yes if runtime is mounted/copied | best first target |
| Linux firejail | medium | installed SUID/package; distro-dependent | yes with profiles/private home | yes with `--net=none`/namespaces | yes with profiles/bind rules | yes | useful optional backend |
| Linux nsjail | medium | may need setup/cgroups; distro-dependent | yes | yes | yes | yes | stronger but heavier |
| Linux containers | medium | runtime-dependent | yes | yes | yes | yes | optional, not minimal |
| macOS sandbox-exec | medium-low | no, but deprecated | possible profile-based | limited/uncertain | possible profile-based | yes | research only, do not promise long-term |
| macOS App Sandbox | low for plain CLI | signing/entitlements/app packaging | yes | via entitlements/policy | possible but app-oriented | yes with packaging | not Phase 02 minimal |
| macOS temp home/env wrapper | high but weak | no | partially by convention only | no OS network deny | can copy/project RO by convention only | yes | fallback, not strong sandbox |
| macOS container/VM | medium | runtime-dependent | yes | yes | yes | yes | optional heavy backend |
| Windows AppContainer | medium-low | tooling complexity | yes | capabilities model | possible with ACL/capabilities | possible | needs prototype before support |
| Windows Job Objects | high for process limits | no | no | no | no | yes | insufficient alone |
| Windows Sandbox | low-medium | OS edition/virtualization required | yes | config can disable network | read-only mapped folders | yes | heavy but viable for eval |
| Windows containers | medium-low | runtime/setup required | yes | yes | yes | yes | optional heavy backend |

### Phase 02 platform support posture

**Decision:** For untrusted executable Pi packages:

- supported first: Linux with verified `bubblewrap` backend;
- experimental: macOS `sandbox-exec` research backend if present, clearly labeled deprecated/limited;
- unsupported/degraded: macOS without OS-level filesystem/network containment;
- unsupported/degraded: Windows until AppContainer/Windows Sandbox/container backend is proven;
- always supported: inspect-only and passive-resource-install modes that execute no third-party code.

### Mount/copy strategy

**Inference:** Sandboxed package evaluation should use a staged root:

```text
temp-eval-root/
  package/            # copied extracted package under evaluation
  project-ro/         # read-only view/copy/bind of selected project files
  output/             # only writable generated output root
  home/               # synthetic empty HOME
  cache/              # sandbox-local cache if needed
```

**Decision:** The sandbox should not mount real `$HOME`, `~/.pi`, `~/.ssh`, `~/.config/gh`, cloud credentials, package-manager auth, or VCS credentials.

### Running Node/Bun/TypeScript extension code

**Inference:** To run Pi extension code safely, the sandbox needs access to:

- Node or Bun runtime binary;
- Pi package/runtime code if executing through Pi/SDK;
- package files under evaluation;
- a temp `.pi`/settings/session area;
- no host auth files;
- optional read-only project snapshot;
- writable output dir only.

**Decision:** Olympus should prefer copying a minimal runtime or read-only binding runtime paths rather than exposing broad system directories.

## 4. Risks/limitations

- **Risk:** macOS `sandbox-exec` is deprecated; relying on it for a long-lived product is risky.
- **Risk:** Linux user namespaces may be disabled by distro policy, enterprise hardening, or kernel configuration.
- **Risk:** Bubblewrap is argument-sensitive; a misconfigured bind mount can expose host data.
- **Risk:** Firejail profiles can vary by distro/version and may require installed SUID helper behavior.
- **Risk:** Containers can accidentally mount credentials or Docker socket; container presence does not equal safe profile.
- **Risk:** Windows containment is complex; Job Objects can limit resources but do not provide full filesystem secrecy.
- **Risk:** Network denial may be incomplete if the runtime exposes host IPC, proxies, or mounted sockets.
- **Risk:** TypeScript execution often invokes transpilers/package managers; lifecycle/build scripts must remain blocked unless explicitly trusted.
- **Unknown:** Whether Olympus should vendor/require a sandbox binary, detect system installations, or delegate to container runtimes.
- **Unknown:** Exact Pi SDK/package evaluation path needed to execute extension registration inside a sandbox without launching the full TUI.

## 5. Phase 01 / Phase 02 questions

1. Is Linux+bubblewrap the only Phase 02 supported dynamic-extension evaluation target?
2. Should macOS untrusted executable evaluation be blocked until a non-deprecated sandbox/VM/container path is selected?
3. Should Olympus require `--sandbox-backend=bwrap|container|sandbox-exec|windows-sandbox` explicitly for executable evaluation?
4. What files must be mounted read-only for Pi SDK execution?
5. Should package managers be allowed inside the sandbox, or should packages be resolved/extracted outside then copied in?
6. Can network denial be enforced uniformly enough to claim `offline`?
7. How should the sandbox communicate with host brokers: stdin/stdout RPC, Unix socket, named pipe, or temp files?
8. What is the fallback behavior when no OS sandbox is available?

## 6. Source list

- Pi packages: `https://pi.dev/docs/latest/packages`
- Pi extensions: `https://pi.dev/docs/latest/extensions`
- Pi repository: `https://github.com/earendil-works/pi`
- macOS `sandbox-exec` man page: `https://keith.github.io/xcode-man-pages/sandbox-exec.1.html`
- Apple App Sandbox: `https://developer.apple.com/documentation/security/app_sandbox`
- Bubblewrap repository: `https://github.com/containers/bubblewrap`
- Bubblewrap man page: `https://manpages.debian.org/bookworm/bubblewrap/bwrap.1.en.html`
- Firejail repository: `https://github.com/netblue30/firejail`
- Firejail documentation: `https://firejail.wordpress.com/documentation-2/basic-usage/`
- nsjail repository: `https://github.com/google/nsjail`
- Windows AppContainer: `https://learn.microsoft.com/en-us/windows/win32/secauthz/appcontainer-isolation`
- Windows Job Objects: `https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects`
- Windows Sandbox overview: `https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-overview`
- Windows Sandbox configuration: `https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-configure-using-wsb-file`
- Windows containers: `https://learn.microsoft.com/en-us/virtualization/windowscontainers/about/`

## Proposed sandbox profiles

| Profile | Reads | Writes | Network | Credentials | Package scripts | Host tools | Project mutation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| inspect-only | package metadata/files only | none | no | no | no | no | no |
| passive-resource-install | selected skill/prompt/theme files | project `.pi` resource refs only after dry-run | no | no | no | no | no source mutation |
| package-eval-offline | copied package + temp settings + optional project snapshot | temp root/output only | denied | no | no by default | no direct host tools | no |
| project-read-output-write | project mounted/copied read-only + package + temp home | declared output root only | denied unless approved | no | only explicitly trusted | broker only | no direct mutation |
| brokered-host-tools | same as project-read-output-write | output root only | broker-mediated or denied | no raw credential files | trusted only | approved brokers | only via brokered operation and confirmation |
| trusted-dev | selected developer roots | selected roots | optional | explicit | allowed if trusted | allowed with logging | yes, explicit |
| unsafe-host | unrestricted by Olympus | unrestricted by Olympus | unrestricted | visible | allowed | arbitrary | yes; outside guarantees |

**Decision:** `unsafe-host` must be visibly outside the safety contract and cannot be reached accidentally by `skip-permissions`.

# Adapter Contract

Each platform adapter maps canonical harness source to native tool surfaces.

## Interface

```ts
interface HarnessAdapter {
  id: string;
  displayName: string;
  probe(context: ProbeContext): Promise<ProbeResult>;
  render(model: HarnessModel): Promise<RenderedArtifact[]>;
  install(plan: InstallPlan): Promise<InstallResult>;
  uninstall(plan: UninstallPlan): Promise<UninstallResult>;
  validate(context: ValidateContext): Promise<ValidateResult>;
  docs(): AdapterDocs;
}
```

## Required Metadata

- platform id
- official docs URL
- verified date
- support level
- native surfaces
- install targets
- uninstall targets
- generated artifact list
- validation commands

## Support Levels

| Level         | Meaning                              |
| ------------- | ------------------------------------ |
| `native`      | First-class platform surface exists. |
| `partial`     | Useful native subset exists.         |
| `prompt-only` | Rules/instructions only.             |
| `unsupported` | Do not install or advertise.         |
| `UNKNOWN`     | Not researched enough.               |

## Adapter Rules

- No adapter may claim support before platform spec has evidence.
- Rendered artifacts must include managed markers.
- Install must write manifest.
- Uninstall must remove manifest-listed files and known v3 residue only.
- Validation must run in temp home or fixture when possible.

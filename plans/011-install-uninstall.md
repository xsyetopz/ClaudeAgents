# OpenAgentLayer Install and Uninstall

OpenAgentLayer install/uninstall is a product surface, not an afterthought.

## Install

`install.sh` and `install.ps1` only bootstrap the OpenAgentLayer TypeScript installer.

Installer responsibilities:

- detect platforms
- probe adapter support
- render artifacts from source
- write managed markers
- write install manifest
- install `oal-runner`
- validate written files
- report exact unsupported surfaces

## Uninstall

`uninstall.sh --all` removes:

- OpenAgentLayer manifest-listed files
- OpenAgentLayer managed marker blocks
- OpenAgentLayer installed runner files
- known v3 residue

It must not remove unmarked user files.

## v3 Residue Cleanup

Known cleanup classes:

- old Claude plugin/cache files
- old Codex plugin/cache/config blocks
- old OpenCode plugin/templates
- old Copilot generated assets
- old optional IDE rule files
- old RTK policy references and managed config blocks

Exact paths must be implemented through tested cleanup tables.

## Safety

- temp-home smoke tests required
- dry-run mode required
- manifest delete before glob delete
- destructive cleanup logs exact paths

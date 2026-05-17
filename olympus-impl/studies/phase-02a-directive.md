# Phase 02A Directive — Read-Only Local Package Inspection

Run Phase 02A only.

Implement read-only local Pi package inspection for packages/olympus.

Scope:
- create packages/olympus skeleton if missing
- implement olympus inspect <local-package-path>
- read package.json
- discover Pi resources from pi manifest and conventional dirs
- classify passive resources: skills, prompts, themes
- classify executable resources: extensions, tools/providers/hooks/scripts/lifecycle scripts
- hash files/resources
- output inspection report
- add fixtures/tests for passive, mixed, lifecycle-script, malformed packages, and skill support files

Do not implement:
- install
- lock
- trust
- untrust
- uninstall
- sandbox execution
- broker
- global writes
- executable package execution

Safety constraints:
- no package code execution
- no lifecycle script execution
- no writes to ~/.pi
- no writes to project .pi except test temp dirs
- no mutation of OAL product files
- no deletion/move of OAL source/spec/test files

Expected end state:
- implementation files under packages/olympus only
- tests/fixtures under packages/olympus/test or equivalent
- study/directive files under olympus-impl/studies only
- passing targeted tests for inspect behavior

End report with:
“Phase 02A inspect implementation complete.”

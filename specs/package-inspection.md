# Package Inspection Contract

Inspection and evaluation accept local package paths. They do not install dependencies or execute package code.

## Inventory

Olympus records package identity, discovered Pi resources, scripts, executable indicators, support files, and hashes. Skill support files are included in the hash inventory when discovered.

## Classification

- Skills and prompts: passive untrusted.
- Themes: passive static.
- Extensions, tools, providers, hooks, lifecycle scripts, package scripts, and source files that imply execution: executable.

## Risk labels

Evaluation reports conservative risk labels for executable resources, conflicts, scripts, missing metadata, and install blockers. A package is installable only when the implemented policy can mirror passive resources safely.

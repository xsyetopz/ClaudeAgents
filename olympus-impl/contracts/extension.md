# Olympus Extension Contract

Olympus is PiCodingAgent-first and uses Pi-native package/resource surfaces.

## Supported Pi surfaces

- `.pi/settings.json`
- `.pi/prompts/*.md`
- `.pi/skills/**/SKILL.md`
- `.pi/themes/*.json`
- `.pi/extensions/*.ts` and `.pi/extensions/*/index.ts`
- package `pi.extensions`, `pi.skills`, `pi.prompts`, and `pi.themes`

## Olympus-owned extension requirements

An Olympus-generated extension must declare:

- purpose and non-goals;
- Pi events subscribed to;
- commands, tools, flags, shortcuts, or providers registered;
- filesystem/network/process/credential side effects;
- required trust, broker, and sandbox capabilities;
- verification method;
- uninstall/disable behavior.

## Third-party extension policy

Third-party extensions are executable resources. They may be inspected and hashed without execution, but must not execute until explicit trust, lock, capability approval, and OS sandbox policy exist.

## Passive resource policy

Skills, prompts, and themes may be installed project-locally later through an Olympus-owned sanitized mirror, but they remain untrusted prompt/config surfaces and must be labeled accordingly.

## Conflict policy

Olympus must report collisions for skill names, prompt command names, theme names, extension commands, tools, and built-in tool overrides. Tool/provider/hook overrides are high-risk executable conflicts.

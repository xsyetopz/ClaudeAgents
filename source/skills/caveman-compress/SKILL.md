# Caveman Compress

## openagentlayer Contract

- Finish the user's explicit objective on the real target path; do not reduce the task to advice or a smaller substitute.
- Treat exact parity, 1:1 behavior, source behavior, reference behavior, and image-backed matching as reference-bound work. Inspect the reference first and preserve observable behavior.
- Do not use task-shrinking language, temporary-work notes, approximation wording, substitute implementations, or trailing opt-in offers.
- Ask only when the missing decision changes correctness or safety and cannot be recovered from local evidence.
- If blocked, use `BLOCKED`, `Attempted`, `Evidence`, and `Need` with concrete details.


## Skill Procedure

Compress a prose-first file into Caveman style using the local script shipped with this skill.

## Allowed Targets

- Markdown: `.md`, `.mdx`
- Plain text: `.txt`
- Extensionless text files

Never compress:

- code files
- config files
- lockfiles
- binaries
- any `*.original.md` backup

## Run

Resolve the target to an absolute path, then run the local script adjacent to this skill:

```bash
node scripts/compress.mjs /absolute/path/to/file
```

## Requirements

- Write a human-readable backup as `<file>.original.md` before overwriting.
- Preserve fenced code blocks, inline code, URLs, paths, headings, lists, and tables.
- Refuse unsupported file types instead of guessing.
- Report exactly what changed and where the backup was written.

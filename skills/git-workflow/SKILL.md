---
name: git-workflow
description: Git workflow conventions for commits, branches, and PRs. Use when the user mentions "commit", "branch", "PR", "pull request", "merge", "rebase", "git workflow", or asks about commit message format, branch naming, or PR templates.
---

# Git Workflow

## Commit Messages

Use Conventional Commits: `type(scope): description`

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`

Rules:

1. Imperative mood: "add feature" not "added feature"
2. Subject line max 72 characters
3. Body explains why, not what
4. Reference issues: `Closes #123`
5. Co-author line for AI-assisted commits:

   ```text
   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

### Claude Code Commit Format

Always use HEREDOC for commit messages to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
feat(auth): add token refresh on expiry

Tokens now auto-refresh 5 minutes before expiry to prevent
mid-request auth failures.

Closes #42

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

## Branch Naming

| Pattern           | Purpose                             |
| ----------------- | ----------------------------------- |
| `main` / `master` | Production code                     |
| `feat/<name>`     | New feature                         |
| `fix/<name>`      | Bug fix                             |
| `refactor/<name>` | Refactoring without behavior change |
| `chore/<name>`    | Maintenance                         |

Names: lowercase, hyphens, no slashes beyond the prefix. Example: `feat/token-refresh`

## Pull Requests

1. Title follows Conventional Commits format
2. Description template:

   ```markdown
   ## Summary
   <1-3 bullet points>

   ## Test plan
   - [ ] Test case 1
   - [ ] Test case 2
   ```

3. One PR solves one problem — no drive-by fixes
4. Rebase to main before merge, prefer squash merge for small PRs

## Workflow

1. Create branch from main
2. Commit focused changes (one logical change per commit)
3. Run tests before pushing
4. Create PR with clear description
5. Address review feedback in new commits (don't force-push during review)
6. Squash merge after approval

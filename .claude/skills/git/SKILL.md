---
name: git
description: Git workflow rules for this repo - branch naming, when to branch, and commit granularity. Use when starting any code change, creating a branch, committing work, or running /tdd. Enforces the "never commit to main" rule.
---

# Git Workflow

## Rule 0: Never commit to `main`

Every code change runs on a branch. No exceptions - not for typo fixes, not for docs, not for "just one line." If you find yourself on `main` and about to edit, stop and branch first.

## Branch syntax

Format: `type/issue-number-short-description`

- **type**: one of `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`
- **issue-number**: GitHub issue number (see [issue-tracker.md](../../../docs/agents/issue-tracker.md))
- **short-description**: kebab-case, 2-5 words, describes the change

Examples:

- `feat/42-user-login`
- `bug/87-cart-total-rounding`
- `hotfix/103-extract-auth-middleware`
- `task/56-simplify-payment-service` (refactoring, migration, coding tasks that are not a feature, bug fix, or docs change)

**No issue yet?** Create one first with `gh issue create` before branching. Issues are the single source of truth for what work exists.

## Workflow

### One branch per issue

A branch belongs to its issue, not to a single session. As long as work continues on the same issue, **reuse the existing branch** - do not open a new one for each follow-up change, review fix, or TDD cycle.

### Starting work on an issue

```
[ ] Have an issue number (create one if needed)
[ ] Check if a branch for the issue already exists:
      git branch --list "*/N-*"        # local
      git ls-remote --heads origin "*/N-*"  # remote
[ ] If a branch exists:
      git checkout <existing-branch> && git pull
[ ] If no branch exists:
      git checkout main && git pull
      git checkout -b type/N-short-description
```

Rule of thumb: the issue number `N` should appear in exactly one active branch at a time.

### Committing

Commit after a complete unit of work, not mid-flight. A unit of work is:

- One bug fix
- One refactor step that leaves tests green
- One full RED -> GREEN -> REFACTOR cycle when using [/tdd](../tdd/SKILL.md)

Commit message format: `type: #issue-number short imperative summary` (matches branch type prefix).

Example: `feat: #42 add user login endpoint`

### Pushing

Push when the work is ready for review or you need to share it. Use `-u` on first push: `git push -u origin <branch>`.

## /tdd integration

When [/tdd](../tdd/SKILL.md) runs:

1. **Before RED**: ensure you're on the branch for the current issue. If a branch already exists for that issue, check it out - do not open a fresh one. If none exists, create it per "Starting work on an issue."
2. **During the cycle**: do NOT commit between RED, GREEN, and REFACTOR. The cycle is one atomic unit.
3. **After REFACTOR (back to GREEN)**: commit the full cycle as one commit.
4. **Next cycle**: stay on the same branch, repeat.

Result: each commit on a TDD branch represents one behavior fully tested, implemented, and refactored.

## Checklist before any code edit

```
[ ] Am I on a branch (not main)?
[ ] Does the branch name match type/N-short-description?
[ ] Does an issue exist for this work?
[ ] If continuing work on an existing issue: am I on that issue's branch (not a new one)?
```

If any answer is no, stop and fix before editing.

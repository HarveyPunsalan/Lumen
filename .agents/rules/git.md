# Git

Read this before committing.

## Commits

One logical unit per commit. If the message needs the word "and", it is
probably two commits.

Format is `type(scope): description`.

| Type | Use for |
|---|---|
| `feat` | new capability |
| `fix` | bug fix |
| `chore` | dependencies, config |
| `docs` | documentation |
| `refactor` | no behaviour change |
| `perf` | measured improvement |
| `test` | tests |

Good: `feat(capture): isolate a single window as the Target`
Bad: `fix`, `changes`, `working now`, `stuff`

The test is whether someone reading the history in six months can tell what
changed and why.

## Never

**Never push.** Not to main, not to a branch, not ever. I say when.

**Never force push.**

**Never amend a commit that exists on a remote.**

**Never auto-commit anything under `docs/`, `.agents/`, or `AGENTS.md`.** Those
are mine to commit when I decide.

## Branches

`main` is always buildable. Do not commit broken code to it.

Feature work goes on a branch named `feat/`, `fix/`, or `chore/`. Merge to
main only when it builds and typechecks.

Solo project, so branches are for safety not for review. Nothing forbids
working on main, but a half-finished capture pipeline on main is a bad state
to be in when something breaks.

## Before committing

Run `npm run typecheck` and `npm run build`. Both must pass.

Check `git status` for anything you did not mean to add. `node_modules`,
`dist/`, and `dist-electron/` are ignored and must stay that way.

Never commit a `.env` file, a credential, a Recording, or anything containing
PII.

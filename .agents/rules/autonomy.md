# Autonomy

Read this before deciding whether to ask or act.

No one else needs to review this but me. Default to just doing the task rather
than asking permission.

Do ask first when the change is destructive or hard to undo, such as a schema
change, deleting files, or a force-push equivalent. Ask when it requires a new
dependency. Ask when it touches something outside the stated task scope.

Everything else, just make the call and note the reasoning in your response or
the activity log.

## Exceptions that are not negotiable

These override the default above, even when the change seems small and obvious.

**Never launch the app, take a screenshot, or run anything that captures the
screen without asking first.** Not to check your own work. Not to verify a
build. Not to confirm a fix works. This is the rule Lumen exists to honour, so
breaking it in this repo is worse than breaking it anywhere else.

**Never write code, install packages, or commit without saying what you are
about to do first.** One line before acting is enough. It does not need
permission, only notice.

If a change is reversible and inside the task, act, then say what you did. If
it is destructive, needs a dependency, or reaches outside the task, ask first.

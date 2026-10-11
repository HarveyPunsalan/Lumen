# Style

Read this before writing any code at all.

## Simplicity

Concise, short solutions. Do not scaffold for hypothetical future needs.

The obvious solution beats the clever one. A reader who has to work out what a
function does is a cost paid every time it is read.

Do not abstract for one use. Do not build a factory for a thing constructed
once. Do not add a configuration option for a value with one sensible setting.

## Data structures

Right data structure or algorithm for the problem, not the cleverest one.

- An array for order, a Map for lookup, a Set for membership. Reach for a tree,
  a graph or a heap only when the problem actually needs one.
- If a structure is unusual, the comment says why. "Indexed by id for the
  Library view" is useful. "This is a heap" is not.
- Do not build a general purpose collection for one problem. A type that does
  one thing beats a flexible one that does anything.
- Optimise after a measurement, not before. A faster algorithm on data that
  never arrives in bulk is slower code.

## Size

Flag over-engineering or oversized files that need a split, and say why. Do not
split them silently as part of an unrelated task, and do not let one grow
further without mentioning it.

A module that needs its own folder is the signal. Reach for that before
reaching for a design pattern.

## Matching what is already there

Match the existing style and syntax in the file you are touching. If the
existing style is bad, say so instead of quietly fixing it.

If you notice a bug outside the current task, flag it and describe its blast
radius. Do not fix it as a side effect of unrelated work.

## Comments

One line. One sentence. Only where the code is not obvious.

Explain why, not what.

```ts
// good: timeslice is required, or a two hour session buffers in RAM
recorder.start(1000)

// bad: start the recorder
recorder.start(1000)
```

Delete comments that restate the function name. Delete commented-out code
rather than leaving it as a note to yourself.

No emojis or special characters in code comments.

## Files

Markdown files use kebab-case naming, for example `system-design.md`.

Maintain `docs/activity-log.md` with short dated entries per session: what
changed, why, and anything unresolved. It is for memory across sessions, not a
team artifact.

## Visibility

Least privilege. Keep things local and unexported unless there is a real reason
to expose them. `export` is a decision, not a default.

A helper used by one file stays unexported. If it needs exporting later, that
is a one-line change at the time it is needed.

## Dependencies

No new external libraries without asking first. This is npm, so check that a
package actually supports npm before suggesting it.

Use `package-lock.json` and `package.json` for correct versions. Never leave
behind a `yarn.lock` or `bun.lockb`.

Before installing any package, verify it against the official registry at
npmjs.com. Check it is real and not a typosquat, especially for anything
unfamiliar.

## Duplication

Avoid redundancy unless it meaningfully improves readability. Three similar
blocks that each make sense on their own are better than one abstracted
function that needs a comment to explain its parameters.

Two blocks that are genuinely identical, extract. Three that look similar but
differ in a way that matters, leave them.

## Naming

Words come from CONTEXT.md. Read it before naming anything.

A function called `getSources()` is right. One called `getCaptureTargets()`
is wrong, because Target means something specific here and Source does not.

Names say what it is, not what it does. `Library` not `FolderManager`.

Boolean names read as assertions. `isLocked`, `hasSegment`, `canExport`.

## Imports

Import the narrowest thing that works. `import { spawn } from
'node:child_process'`, not the whole module.

No default exports except where a library requires it.

Group imports: node builtins, then external, then local. Keep it consistent
with whatever the file already does.

## Errors

Fail loudly and specifically. An error message that names the problem and the
fix beats one that names the category.

```ts
throw new Error(
  'Screen recording permission is not granted. Enable it in System Settings, then restart Lumen.',
)
```

Do not swallow errors. If a failure is expected and handled, say so in a
comment. If it is not expected, let it propagate.

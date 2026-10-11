# Design

Read this before building any screen or changing how one looks.

## Mode: Operate

Lumen is a tool someone operates, not a page they read. The visitor completes
a task, so scanability, consistency, and native expectations outrank
expression. Brand lives in precise details.

The skill defaults toward expressive design. This line exists to stop it
pushing the wrong way for a recorder. Someone mid-presentation is looking for
the stop button, not admiring the interface.

## Skills

Load these through the skill tool and run them for real. Do not improvise.

- `impeccable` - the command set below
- `ui-ux-pro-max` - palette, type scale, spacing, iconography
- `frontend-design` - art direction and typography
- `minimalist-ui` - clean editorial interface, warm monochrome, flat grids. The
  right default for a dark focused tool
- `high-end-visual-design` - the exact spacing, shadow, and type scale choices
  that read as expensive rather than cheap

This app is a portfolio piece. A generic interface makes it look generated.

If a skill fails to load, say so and stop. Do not continue and do not call the
work finished.

## Commands by moment

| Moment | Command |
|---|---|
| New screen or feature | `shape` |
| First render of the app | `init`, then `new-work` |
| After any screen renders | `critique <target>` |
| Before calling a screen done | `audit <target>` |
| Empty states, no Recordings yet | `onboard <target>` |
| Error, loading, and permission states | `harden <target>` |
| Labels and error copy | `clarify <target>` |
| Spacing, rhythm, hierarchy | `layout <target>` |
| Fonts and type scale | `typeset <target>` |
| Colour and palette | `colorize <target>` |
| Looks bland or timid | `bolder <target>` |
| Looks loud or overstimulating | `quieter <target>` |
| Too much on screen | `distill <target>` |
| Needs personality | `delight <target>` |
| Motion | `animate <target>` |
| Different screen sizes | `adapt <target>`, native variant |
| Slow render | `optimize <target>` |
| Before a release | `polish <target>` |
| Pull shared tokens out | `extract <target>` |
| Regenerate DESIGN.md from code | `document` |
| Compare variants | `live` |
| Push past conventional | `overdrive <target>` |

## The three gates

If only three commands ever run, they are these.

1. `shape` before writing a screen. Plan the UX first.
2. `critique` after it renders. Get a scored review of what is actually there.
3. `audit` before calling it done. Technical checks for accessibility and
   performance.

A screen that skipped all three is not finished. Say so rather than claiming
otherwise.

## Not used here

`gpt-taste` is GSAP scroll choreography and AIDA page structure for landing
pages. A desktop app has no scroll site, so its rules push the wrong way.

`image-to-code`, `imagegen-frontend-web`, `imagegen-frontend-mobile`,
`brand`, `brandkit`, `banner-design`, `slides` and `design` are marketing and
brand work. Lumen is neither a landing page nor a campaign.

`industrial-brutalist-ui` is the wrong genre. `redesign-existing-projects`
needs an incumbent design to audit, and there is none yet.

## Artifacts

`impeccable init` writes `PRODUCT.md`. `document` writes `DESIGN.md`. Both are
committed and read automatically by future sessions, so the design context
survives without anyone repeating it in conversation.

Keep them current. A stale DESIGN.md is worse than none, because the next
session trusts it.

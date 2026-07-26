# project-living-docs

A Claude Code plugin that builds **living project documents** and a **standalone
daily brief** — one self-contained HTML page per project, rebuilt on a schedule
from Slack, GitHub, Gmail, Calendar, Drive and Pact, and published to a private
Claude Artifact you can bookmark.

The content is a JSON data model (`#doc-data`) baked into the page; a locked
renderer turns it into markup, so a refresh is a cheap surgical data patch, not an
HTML rewrite. That is what makes an **hourly** (or 15-minute) refresh affordable.

## What's inside

| Skill | What it does |
|---|---|
| `project-doc-setup` | One-time interview → config → first build → publish → schedule. The front door. |
| `project-doc` | Builds (`init`) and surgically refreshes (`refresh`) a repo's living document. |
| `daily-brief-setup` | One-time setup for the standalone multi-project morning brief. |
| `daily-brief` | Builds the daily brief (also supplies the project doc's Today tab). |

Slash commands: `/project-doc-setup`, `/project-doc-refresh`, `/daily-brief-setup`.

## Install (Claude Code / desktop)

From this directory (or a git remote hosting it):

```
/plugin marketplace add /Users/frsty/dev/agent-skills/project-living-docs
/plugin install project-living-docs@project-living-docs
```

Or point the marketplace at a git URL if you push this folder to a repo:

```
/plugin marketplace add <you>/project-living-docs
/plugin install project-living-docs@project-living-docs
```

Then restart / reload so the skills register.

## Use

1. In a repo, run `/project-doc-setup` (do the **first run in Claude Code web** —
   it needs GitHub access and the Artifact tool to publish and to create the cloud
   routine). Answer the source and goal questions; "decide for me" is offered
   wherever an answer can be derived.
2. It builds the first document, publishes a **private** Artifact, and offers an
   **hourly** cloud routine. The expensive synthesis (Today painting, goal
   re-evaluation) self-gates to once a day; most hourly runs publish nothing.
3. For the standalone brief, run `/daily-brief-setup`.

## Notes

- **Publishing needs the Artifact tool + GitHub**, which is why setup and the
  routine belong in Claude Code web, not a cowork/session task. Run locally, setup
  still builds the doc and writes a routine spec to activate in the web app.
- **The published Artifact is the single source of truth** — cursors, scope and
  content all live inline in it. Sharing the doc shares its source scope (channel
  ids, Gmail query), not credentials; artifacts are private by default.
- The renderer, validator, migrator and slicer are **locked** JS/mjs — copied
  verbatim, never hand-edited. Their tests (`*.test.mjs`) run with plain `node`.
- See `skills/project-doc/VERIFY.md` for the first-live-run checklist.

## Verify the locked assets

```
cd skills/project-doc/references
node doc-render.test.mjs && node doc-data-check.test.mjs && node doc-migrate.test.mjs
```

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

Do the **first run in Claude Code web** — it needs GitHub access and the Artifact
tool to publish. The web app has **no local skills and no `/plugin`**, so you don't
install anything: the setup prompt tells the agent to **`curl` the skill straight
from GitHub and follow it**. Pick the repo when prompted.

The skills live under one raw base:

```
https://raw.githubusercontent.com/frstycodes/project-living-docs/main/skills/
```

**Set up a project's living document** — paste in a Claude Code web session opened
on the repo:

```
Set up my project living document. The skill is on GitHub — fetch it and follow it:

  curl -sSL https://raw.githubusercontent.com/frstycodes/project-living-docs/main/skills/project-doc-setup/SKILL.md

Follow that SKILL.md exactly. It links to sibling files with relative paths
(references/…, ../project-doc/…); resolve each against the same base
(…/main/skills/…) and curl it when the skill says to read it. The locked .mjs
files (doc-render.mjs, check.mjs, doc-slice.mjs, …) are fetched the same way and
run with node. Do the interview, build the first document, publish it as a private
Artifact, and hand me a paste-ready prompt to schedule an hourly refresh routine.
```

**Set up the standalone daily brief** — paste in any Claude Code web session:

```
Set up my standalone daily brief. The skill is on GitHub — fetch it and follow it:

  curl -sSL https://raw.githubusercontent.com/frstycodes/project-living-docs/main/skills/daily-brief-setup/SKILL.md

Follow that SKILL.md exactly, curling any file it references from the same base
(…/main/skills/…). Ask what my brief covers and where it goes, build the first one,
publish it as a private Artifact, and hand me a paste-ready prompt to rebuild it
each morning.
```

**If `curl` to raw GitHub is blocked**, clone once and follow the files on disk —
swap the `curl` line for this and point at the same SKILL.md under the clone:

```
git clone --depth 1 https://github.com/frstycodes/project-living-docs /tmp/pld
```

e.g. *"Read `/tmp/pld/skills/project-doc-setup/SKILL.md` and follow it exactly —
every referenced file (references/…, ../project-doc/…, the locked .mjs) is in that
clone; run the .mjs with node."* Same for `daily-brief-setup` and for the routine
prompt (`skills/project-doc/SKILL.md`, refresh branch).

Setup answers the source and goal questions (with "decide for me" wherever an
answer can be derived), builds the first document, publishes a **private**
Artifact, and hands you a **paste-ready routine prompt**. That routine prompt
also curls the refresh skill from GitHub, then refreshes on a schedule — you paste
it into a new claude.ai/code routine and pick the repo; the routine drafts its own
cron. The expensive synthesis (Today painting, goal re-evaluation) self-gates to
once a day, so most hourly runs publish nothing. **The refresh never posts to a
project channel** — it publishes silently to the same bookmarked URL, with an
optional DM ping only if you ask for one.

## Notes

- **Publishing needs the Artifact tool + GitHub**, which is why the routine belongs
  in Claude Code web, not a cowork/session task. Setup never creates the routine
  itself — it builds and publishes the doc, then hands you a paste-ready prompt and
  the clicks to stand the routine up in claude.ai/code, where its own Claude drafts
  the cron.
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

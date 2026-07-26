# Handing off the unattended refresh

The payoff of the whole setup is a document that stays live without anyone
re-running it. That means a **Claude Code cloud routine** — created in
claude.ai/code, where GitHub access exists and a scheduled agent survives
detached. But **setup does not create the routine.** Claude Code routines accept
a plain-language prompt and draft the detailed spec — cron included — themselves.
So the seamless move is to hand the user a ready-to-paste prompt and the few
clicks to activate it. All they do on the routine side is paste and pick the
repository.

This is the same handoff everywhere — local CLI or Code web. You cannot reliably
provision another environment's scheduler from inside a build, and you do not need
to: the routine's own Claude turns the prompt into a schedule. Don't call
`schedule`, `CronCreate`, or any `scheduled-tasks`/cowork task — those are the
wrong tool (session-only, or no GitHub access). Draft the prompt, give the steps,
stop.

## What to hand the user

Ask once, calm default: *"Want this to stay live? I'll give you a one-time prompt
to paste into a Claude Code routine — it refreshes hourly on its own."* Then ask
whether they want a **DM ping** when something changes — **off by default, and
never a project channel** (the doc bakes in private scope; a channel post exposes
it to the whole team). If they decline scheduling, stop — the document is
refreshable by hand with `/project-doc-refresh`.

If they accept, give them exactly two things.

### 1. The paste-ready routine prompt

A cloud routine has **no local skills access**, so the prompt installs the plugin
from GitHub first, then runs its refresh command — it does not "invoke the
project-doc skill". Fill in the real `artifactUrl` (and drop or keep the DM line
per the user's choice), then hand it over verbatim in a fenced block:

```
First, install the living-docs plugin from GitHub:
  /plugin marketplace add frstycodes/project-living-docs
  /plugin install project-living-docs@project-living-docs

Then, every hour, keep this repo's living project document current by running
/project-doc-refresh:
- Fetch the published Artifact at <ARTIFACT_URL> and slice its #doc-data.
- Query each source configured in the doc's #doc-config for activity since its
  cursor, patch only what changed, auto-check any todos whose PR merged or bead
  closed, render, validate with check.mjs, and republish to the SAME Artifact URL.
- The expensive daily synthesis (Today, goal re-evaluation) self-gates on
  #doc-state.lastDaily — most hours there is nothing to do, and that is correct:
  publish nothing on those runs.
- Notify: publish silently. On a run that changed something, DM me the doc's URL —
  never post to a project or shared channel. (Omit this line for no ping at all.)
- A source unreachable in this environment is skipped and noted, never a failure.
```

Use the real GitHub slug — `frstycodes/project-living-docs`. Tell them the
routine's Claude turns "every hour" into a concrete cron (an off-minute, so a
fleet doesn't all wake on the hour) — they don't write one. Hourly is cheap by
design; if they'd rather, they can just say "every morning" in the prompt instead.

### 2. The clicks

1. Open **claude.ai/code**.
2. Start a new **routine** (scheduled agent).
3. Paste the prompt above.
4. **Select this repository** so the routine runs with its GitHub access and
   connectors.
5. Save. Its first run self-verifies against the real cloud environment —
   skipping and flagging (via notify) any source that environment can't reach.

## The line that matters

A routine that has never run successfully in its real environment is not "set up"
— it is a hope, and its first live run is what proves it. You are handing the user
a prompt that makes that run happen; say so plainly, and never report a schedule
as active when all you did was draft its prompt.

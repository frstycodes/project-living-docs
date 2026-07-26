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

A cloud routine has **no local skills and no `/plugin`**, so the prompt tells the
agent to **clone** the skill repo from GitHub and follow it — clone, not curl, so
every reference file (`update-protocol.md`, the richness floor, `check.mjs`) is on
disk; a curl of the lone SKILL.md yields a thin, preview-less refresh. The prompt
states only what the skill can't know: *which* Artifact, and the notify choice.
Fill in the real `artifactUrl` (and drop or keep the DM line per the user's
choice):

```
Every hour, refresh my project living document. Clone the skill and follow its
refresh branch exactly:
  git clone --depth 1 https://github.com/frstycodes/project-living-docs /tmp/pld
Read /tmp/pld/skills/project-doc/SKILL.md and follow the refresh branch, including
every reference file it links. Run the locked .mjs with node. Before republishing,
run `node /tmp/pld/skills/project-doc/references/publish-gate.mjs <built-file>` and
republish ONLY the exact file it blesses with PUBLISH-OK — never a file it refuses.
Refresh the doc at <ARTIFACT_URL>. Publish silently; on a change, DM me the URL —
never a project or shared channel. (Drop the DM clause for no ping at all.)
```

Tell them the routine's Claude turns "every hour" into a concrete cron (an
off-minute, so a fleet doesn't all wake on the hour) — they don't write one.
Hourly is cheap by design; if they'd rather, they can just say "every morning" in
the prompt instead.

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

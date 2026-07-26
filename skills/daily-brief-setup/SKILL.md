---
name: daily-brief-setup
description: One-time setup for the standalone Daily Brief — ask what the brief covers and where it goes, build the first one, and optionally schedule it to rebuild every morning as a Claude Code cloud routine. Use when a user wants to set up, configure, or start receiving their daily brief / morning brief automatically on a schedule, or the first time they want a recurring brief.
---

`daily-brief-setup` is the front door to the `daily-brief` skill, the same way
`project-doc-setup` is the front door to `project-doc`. It runs **once**: it
decides what the standalone brief covers and where it is written, builds the
first one, and — if the user wants — schedules it to rebuild every morning
without anyone re-running it.

It is separate from `daily-brief` on purpose. `daily-brief` is a builder: it
renders *today* from scratch every run and overwrites its output. Setup is the
one-time conversation and the scheduling — a different lifecycle, kept apart so
the builder stays a builder.

**The standalone brief is the multi-project one** (`scope: all`): every calendar
event, inbox item, to-do and update across all projects. The per-project brief is
a different thing — it is a fragment `project-doc` embeds in its Today tab, and it
is configured there, not here. This skill only ever sets up the standalone brief.

## Why this is simpler than project-doc-setup

The brief is a **stateless snapshot**. There are no cursors, no surgical patch,
no backup, no rollback — each run rebuilds the whole brief for the current day
and overwrites the file. That collapses most of project-doc's machinery:

- **No `state.json`, no refresh protocol.** A scheduled run is just "invoke
  `daily-brief` with the saved config." Yesterday's brief is simply overwritten.
- **No source contract, no goal-finding.** The brief has a fixed set of sources
  and no accumulated record to keep honest.
- **Unattended failure is soft.** A source that is down produces a *thinner*
  brief with a noted gap — never a failed run, never a rollback. The worst case
  is an incomplete brief that tomorrow's run replaces.

## The arc

1. **Interview** — short, see below.
2. **Write `~/.claude/daily-brief/config.json`** — the single, user-level
   standalone-brief config (schema below), as a local seed. Not repo-scoped: the
   standalone brief spans every project and is tied to no `.git` root.
3. **Build and publish the first brief.** Invoke `daily-brief` with `scope: all`
   and the config's `out`; confirm it wrote a complete document, then **publish it
   as a Claude Artifact** and store the returned URL as `artifactUrl` in the
   config. The brief is stateless, so a scheduled run just rebuilds and
   republishes to that same URL — nothing to fetch back, no state to carry.
4. **Offer to schedule** — opt-in, same cloud-routine pattern as
   `project-doc-setup`. See "Scheduling" below.

## Interview

Ask conversationally, one thing at a time. **Offer "decide for me" on every
question a good answer can be derived for** — take a sensible default now and let
it sharpen on later runs. Withhold it only where the answer is the user's to give
(their preference, their identity, where notifications go).

- **What the brief covers.** `scope: all` by default. The user may narrow it —
  specific calendars, Slack channels, people, or a Gmail query. **Do not ask for a
  raw Gmail search string:** present a default derived from their domain and let
  them add to it, or offer **"decide for me"** (watch the obvious senders now,
  refine which mail is project-relevant as real mail arrives). "Decide for me"
  here means: default to everything, and narrow only if the brief gets noisy.
- **Where it goes.** The `out` path — a stable location the user opens each
  morning. Default `~/daily-brief/brief.html`. **Needs the user** (it's their
  preference), though the default stands if they shrug.
- **When it runs** (only if scheduling) — the morning hour. **Offer "decide for
  me"**: default an **off-minute** time like `07:07`, so a fleet of briefs does
  not all wake at `07:00`.
- **Where the link is sent** — the `notify` channel. **Needs the user**: only they
  know where they want their morning brief to land.

## Config schema

`~/.claude/daily-brief/config.json`:

```json
{
  "scope": "all",
  "out": "/Users/you/daily-brief/brief.html",
  "artifactUrl": null,
  "sources": {
    "calendarIds": ["primary"],
    "slackChannels": [],
    "people": []
  },
  "cadence": "7 7 * * *",
  "notify": { "channel": "slack", "target": "#me" }
}
```

- `scope` is always `all` for the standalone brief.
- `out` is the file the brief overwrites each run (a build artifact; the Artifact
  is what the user actually opens).
- `artifactUrl` is where the brief is published; each run republishes there in
  place. Null until the first publish.
- `sources` narrows what the brief includes; every empty list means "no filter,
  include everything of that kind."
- `cadence` is a 5-field cron in local time, off-minute. Absent = not scheduled.
- `notify` is where the morning link is sent (default Slack). **The brief notifies
  every run** — it is a morning nudge, unlike the project doc which notifies only
  on change.

Because a cloud clone has neither this file nor `~/.claude`, the routine carries
the whole config (it is small and non-secret — auth stays in the MCP tools) plus
the `artifactUrl`. The config file is a local seed; the routine is what survives.

## Scheduling

Identical pattern to `project-doc-setup` — the same rules, for the same reasons:

- The schedule is a **Claude Code cloud routine** (claude.ai/code), because that
  environment has the connector access a background run needs and survives
  detached.
- **Never** use `CronCreate` (session-only, 7-day expiry, dies with the session)
  or a cowork/`scheduled-tasks` task (wrong environment).
- **Setup does not create the routine.** Claude Code routines draft their own cron
  from a plain-language prompt, so you hand the user a paste-ready prompt and the
  clicks to activate it. Opt-in, default cadence calm (every morning).

Hand the user two things — the same handoff local or in Code web:

1. **The paste-ready routine prompt.** A cloud routine has **no local skills
   access**, so the prompt installs the plugin from GitHub first, then runs its
   command — it does not "invoke the daily-brief skill". Fill in the real
   `artifactUrl` and config:

   ```
   First, install the living-docs plugin from GitHub:
     /plugin marketplace add frstycodes/project-living-docs
     /plugin install project-living-docs@project-living-docs

   Then, every morning, rebuild my standalone daily brief by running
   /daily-brief with scope: all and the config below. It is a stateless snapshot —
   rebuild the whole brief for today from Slack, Gmail, Calendar, GitHub and Drive,
   republish to the SAME Artifact URL <ARTIFACT_URL>, and DM me the link every run
   (a morning brief always notifies — my own DM, never a shared channel). A source
   that is down produces a thinner brief with the gap noted, never a failed run.

   Config: <paste the config.json contents>
   ```

   Use the real GitHub slug — `frstycodes/project-living-docs`. Tell them the
   routine's Claude turns "every morning" into an off-minute cron (e.g. `07:07`) —
   they don't write one.

2. **The clicks:** open claude.ai/code → new routine → paste the prompt → save.
   Its first run self-verifies against the real cloud environment, flagging any
   source that environment can't reach. Never report a schedule as live when all
   you did was draft its prompt.

## Hard don'ts

The brief itself is `daily-brief`'s locked shell — this skill never touches its
CSS, JS, sprite or components, and never redesigns the brief. Setup writes config
and schedules; the builder builds.

## Done when

`~/.claude/daily-brief/config.json` exists and parses; the first brief is built
at `out` as a complete standalone document and **published as an Artifact** with
its URL stored as `artifactUrl`; and the user has been handed the paste-ready
routine prompt (with real `artifactUrl`, config and notify channel filled in) plus
the clicks to stand it up in claude.ai/code — never a claim that a schedule is live
when all setup did was draft its prompt.

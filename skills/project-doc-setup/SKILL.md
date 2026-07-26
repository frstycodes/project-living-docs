---
name: project-doc-setup
description: One-time interactive setup for a project's living document — interview the user for sources and goal, discover connected tools, write the config, build the first document, and optionally schedule an unattended refresh as a Claude Code cloud routine. Use when a user wants to set up, onboard, configure or start a project doc / project brief for a repo for the first time, or when project-doc reports no config exists yet.
---

`project-doc-setup` is the front door to the `project-doc` skill. It runs **once
per project**: it decides *what* the living document watches and *why*, writes
the config, hands off to `project-doc init` to build, and — if the user wants —
puts the document on a schedule so it stays live without anyone re-running it.

It is deliberately separate from `project-doc` because it has a different
lifecycle and a different failure mode. Setup is conversational, run once, and
decision-heavy; a bad setup is a bad *interview*. `project-doc` is a builder, run
many times, and a bad run is a bad *build*. Keeping them apart keeps each honest.

**Setup owns the decisions; `project-doc` owns the execution.** Nothing here
writes document markup — it writes the config, seeds the goal, drafts the
goal, then invokes `project-doc init`, which assumes a valid config and builds.

## The arc

Run these in order. Each step is detailed in the references; do not summarise
them away.

1. **Locate the repo and claim the directory.** Walk up from cwd to the `.git`
   root. The document and its config live in `<repo-root>/.ignored/project-doc/`.
   If a `config.json` already exists there, this is not a first setup — tell the
   user, and point them at `project-doc` to refresh or at editing the config
   directly. Do not silently overwrite a config.
2. **Verify the ignore.** Before writing anything into `.ignored/`, run
   `git check-ignore .ignored`; if it is not ignored, add `.ignored/` to
   `.gitignore`. The config names private channels and the document bakes in
   avatars — none of it may be committed by accident.
3. **Detect the environment**, and say it out loud. See "Environment" below —
   it decides where the build and publish happen; step 7's routine handoff is the
   same either way.
4. **Interview for sources**, then **draft and sharpen the goal.** Follow
   [`references/interview.md`](references/interview.md) exactly — the source menu
   is discovery-hinted and every inclusion is the user's explicit choice, and the
   goal is drafted from the sources just read, then grilled to a point.
5. **Write the config.** Author a local `config.json` (schema in
   [`project-doc/references/config.md`](../project-doc/references/config.md)) as
   the setup-time seed; it is baked inline into the document as `#doc-config` at
   build, and from then on the **published Artifact is the single source of
   truth** — no `state.json`, no sidecar. Custom sources register against
   [`project-doc/references/source-contract.md`](../project-doc/references/source-contract.md).
   Seed `#doc-state` with `{"format": 2, "lastRun": null, "artifactUrl": null,
   "cursors": {}}` — empty cursors mean init reads each source from the beginning.
6. **Hand off, build, and publish.** Invoke `project-doc` in its `init` branch: it
   reads the config, builds the document, runs `check.mjs`, and **publishes the
   first Artifact**, writing the returned URL back into `#doc-state.artifactUrl`
   (see [`project-doc/references/publishing.md`](../project-doc/references/publishing.md)).
   Do not re-implement the build. If init fails validation, surface it and stop —
   a schedule pointing at a broken build is worse than no schedule.
   **Warn about sharing:** the document is private by default, and its inline
   scope (channel ids, Gmail query) travels with it — *sharing the doc shares what
   it watches* (not credentials). Say this plainly.
7. **Hand off the schedule.** Opt-in, calm default cadence, and pick the **notify
   channel** (default Slack) — the routine sends the doc's stable URL there, but
   only on runs that produced a change. **Setup does not create the routine.**
   Claude Code routines draft their own cron from a plain-language prompt, so you
   hand the user a paste-ready prompt (carrying the one pointer that matters, the
   `artifactUrl`) plus the clicks to activate it — the same handoff local or in
   Code web. Follow [`references/scheduling.md`](references/scheduling.md). Never
   strand the user with a built doc and no way forward.

## Environment

The refresh is meant to run **unattended, in the background** — and the right
home for that is a **Claude Code cloud routine** (claude.ai/code), because that
environment has GitHub access and survives detached. A cowork/session scheduled
task is the wrong tool: it cannot reach GitHub the way Code web can, and the
in-session `CronCreate` scheduler is session-only (7-day expiry, dies with the
session) — **never use it for this.**

Setup itself runs wherever the user invoked it, and step 7 is the **same either
way**: it does not create the routine. It hands the user a paste-ready prompt and
the clicks to stand it up in claude.ai/code, where the routine's own Claude drafts
the cron and the user just selects the repository. So there is no environment
branch to detect for scheduling — the doc is built and published locally or in the
cloud, and the routine is always activated by the user in Code web from the prompt
you hand them.

## Done when

the config is baked inline as `#doc-config` and any local `config.json` cache is
git-ignored; every chosen source is either a documented built-in or a
contract-valid `custom` entry; the goal is written into `#goal` from real source
evidence, not invented; the first document is built, `check.mjs` exits clean, and
it is **published as an Artifact** with the URL stored in `#doc-state.artifactUrl`;
the user has been told sharing the doc shares its scope; and they have been handed
the paste-ready routine prompt (with the real `artifactUrl` and notify channel
filled in) plus the clicks to stand it up in claude.ai/code — never a claim that a
schedule is live when all setup did was draft its prompt.

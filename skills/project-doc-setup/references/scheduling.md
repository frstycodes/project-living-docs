# Scheduling the unattended refresh

The payoff of the whole setup is a document that stays live without anyone
re-running it. That means a **Claude Code cloud routine** — created in
claude.ai/code, where GitHub access exists and a scheduled agent survives
detached. This step is **opt-in**: ask once, default the cadence to something
calm, and never force it.

## What NOT to use

- **`CronCreate`** (the in-session scheduler) is session-only: in-memory, gone
  when the session ends, auto-expires after 7 days. It cannot run a durable
  background refresh. Never use it for this.
- **A cowork / `scheduled-tasks` task** runs in an environment without the GitHub
  access the refresh needs. Wrong tool.

The only correct target is a Claude Code cloud routine.

## Ask, then branch on environment

Ask: *"Keep this live? I can refresh it every hour so it's always current."*
Default cadence **hourly**, at an **off-minute** (e.g. `07 * * * *`), so a fleet of
these does not all wake on the hour. Hourly is cheap by design: the run does only
mechanical data patches (auto-checking todos, appending new events) most hours, and
does the expensive synthesis — the Today painting, the goal re-evaluation — **once
a day**, self-gated on `#doc-state.lastDaily` (see "Two cadence tiers" in
[`update-protocol.md`](../project-doc/references/update-protocol.md)). So hourly does
not churn: most hours publish nothing at all. If the user prefers, offer daily
instead. If they decline scheduling, stop here — the document is refreshable by hand.

If they accept, branch on the environment detected in the skill's step 3:

### In Claude Code web (cloud)

1. **Create the routine** with the `schedule` skill (cloud routines / scheduled
   cloud agents). It carries one pointer — the document's `artifactUrl` — and runs
   `project-doc` (refresh branch), which `WebFetch`es that Artifact, patches it,
   and republishes. Also carry the notify channel.
2. **Run one supervised dry-run now.** Trigger a single execution and wait for it.
   This exercises the *real* environment the routine will use — the cloud env's
   connector set, `Artifact` and `WebFetch` access — not a local proxy.
3. **Check what it published.** The dry-run either republished the Artifact
   cleanly or reported a source unreachable *in the cloud env* (a connector
   present locally but not in Code web) via its notify. If a source was skipped,
   surface exactly which and either:
   - drop it from the config (with the user's ok), or
   - tell the user how to connect it in the Code web environment,
   then re-run the dry-run.
4. **Only go live once the dry-run republished cleanly.** A routine that has never
   successfully run is not a schedule, it is an 8am surprise.

### Local CLI (or any non-cloud environment)

You cannot provision or verify a cloud routine from here. Do not pretend to.

1. **Build and publish are already done** — the document exists at its
   `artifactUrl`.
2. **Write the routine spec** to `<repo-root>/.ignored/project-doc/routine.md`:
   the cron expression, the `artifactUrl` the routine will refresh, the notify
   channel, and the exact sources this project uses (so the user can confirm they
   are connected in Code web).
3. **Tell the user the one thing to do:** open claude.ai/code and create a
   scheduled routine from `routine.md` — and that its first run there will
   self-verify, skipping and flagging (via notify) any source the cloud
   environment cannot reach.

## The line that matters

A scheduled refresh that has never run successfully in its real environment is
not "set up" — it is a hope. The supervised dry-run is what turns "should work at
8am" into "confirmed working, now detached." When you cannot run it (local),
say so plainly and hand off the exact next step; never report a schedule that was
never verified.

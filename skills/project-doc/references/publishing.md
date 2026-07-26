# Publishing — the Artifact is the source of truth

The document is hosted as a **Claude Artifact**: private by default, at one stable
URL, republished in place every run. That hosted page is the single source of
truth — a run reads it, patches it, and writes it back. This file is the
mechanics; the editorial protocol is [`update-protocol.md`](update-protocol.md).

## The run loop

1. **Fetch programmatically, then slice — do not read the whole document into
   context.** The published Artifact is hundreds of KB of HTML/CSS/JS/sprites;
   pulling that into the model each run is the dominant cost, and at 15-minute or
   5-minute cadence it dwarfs everything else. So fetch the raw file with a shell
   step, then extract only the small JSON blocks the run patches:

   ```
   curl -sL "$artifactUrl" -o cache.html
   node <skill-dir>/references/doc-slice.mjs cache.html doc-state doc-data > slice.json
   ```

   The model works from `slice.json` (cursors + content), **never** the rendered
   markup — per-run cost then scales with `#doc-data` size, not document size.
   (`WebFetch` is only for when a human is driving and wants to see the page; the
   scheduled loop uses the slice.)
2. **Patch** the sliced `#doc-data` per the refresh protocol — cheap-tier field
   flips and appends, plus the daily tier when `lastDaily` says so.
3. **Render and validate.** `renderBody` the patched `#doc-data`, reassemble the
   document, run `check.mjs` (both passes). **Not clean → do not publish** (see
   Rollback).
4. **Publish** with the `Artifact` tool, passing the existing `url` so it
   redeploys **in place** to the same address. Carry a short `label` (the run
   date) so the Artifact's version history is legible for rollback.
5. **Store** the URL. On the very first publish (init) the tool returns a fresh
   URL — write it into `#doc-state.artifactUrl` and republish once so the document
   knows its own address. On every later run the URL is unchanged.
6. **Notify** per the rule below.

**A no-op costs almost nothing.** Slice → query sources after the sliced cursors →
if nothing new and it is not the daily tier's turn, exit without rendering or
publishing. The only cost of a quiet 15-minute run is the `curl`, the slice, and
the source queries — no markup in context, no republish.

## First publish vs redeploy

- **No `artifactUrl` yet** (init, or a document that lost its URL): publish fresh,
  capture the returned URL, bake it into `#doc-state.artifactUrl`.
- **Have `artifactUrl`**: pass it as `url` to update in place. The bookmark never
  changes.
- **Self-heal:** if `#doc-state.artifactUrl` is missing but this document was
  clearly published before, `Artifact action:list` and match by title before
  minting a new URL — a new URL orphans the user's bookmark.

## Rollback is "don't publish"

There is no `.bak`. A build that fails `check.mjs` is simply **never published**,
so the previously published Artifact stays live and correct, and its cursors
(inside it) are untouched — the next run retries the same window. If a *published*
document is later found wrong, restore it from the Artifact's **version history**
(the `label` on each publish) and re-run. Integrity failures never reach a viewer.

## Publishing is best-effort; the build is not lost

Publishing is **delivery, not integrity**. A clean build must never be discarded
because the publish step flaked:

- Retry the publish **once**.
- Still failing (tool unavailable in this environment, transport error): keep the
  clean build — write it to the local `.ignored/` cache if one is in use — leave
  the last good Artifact live, and **notify the failure** ("built, couldn't
  publish; the doc is unchanged at its usual link"). Exit non-zero so a scheduler
  notices, but do not treat it as an integrity failure — nothing is corrupt.

## Notify

**The refresh never posts to a project channel.** The document bakes in private
scope and a channel post drops it in front of the whole team unasked. Notify is
**off by default**; if the user wants a ping, it goes to **their own DM only** —
never a shared or project channel. The link sent is always the stable
`artifactUrl`.

- **Default: no notify.** A refresh publishes silently to the same URL the user
  bookmarked; they open it when they want. Offer a DM ping at setup; if declined,
  the routine notifies nothing.
- **A DM ping fires only on a real change** — a run that produced a changelog
  entry. A no-change run publishes nothing and says nothing; a daily "nothing
  happened" ping trains the user to ignore the doc.
- **The daily brief notifies every run** — it is a morning nudge to the user's own
  DM, that is its job.
- A **publish failure** notifies the user's DM regardless, on either deliverable —
  a broken build is worth interrupting for; a channel post still is not.

## The archive is its own Artifact

Compaction (see [`update-protocol.md`](update-protocol.md)) publishes the overflow
of old What's-New runs as a **second Artifact** and stores its URL in
`#doc-state.archiveArtifactUrl`. The "Older runs" link in the live document is the
**absolute** archive URL when hosted — a relative `archive.html` is a dead link on
a single hosted page. Only a purely-local, never-published document uses a
relative archive path.

## Privacy

Artifacts are **private by default** — only the user sees them, which is what
makes it safe to bake the source scope (channel ids, Gmail query) inline. Those
are **not credentials** (auth lives in the connected MCP tools, never stored), but
they do describe what the project watches. **Sharing the doc shares its scope** —
setup says this out loud, and nothing here ever makes a project doc public on its
own.

## Environment note

`Artifact` and `WebFetch` are built into Claude Code under the user's account, so
a Claude Code **cloud routine** has them — that is why the routine can fetch,
patch and republish with no filesystem. If a run genuinely finds the `Artifact`
tool absent, it falls back to the best-effort path above: keep the build, notify,
do not fail the whole run over delivery.

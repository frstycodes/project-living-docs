# The refresh protocol

**Surgical refresh**: append one changelog entry, patch only what it cites, leave everything
else byte-identical. A refresh that rewrites the whole document has destroyed the record it
existed to keep — old sections drift, links rot, and nobody notices because the output still
looks plausible.

Work through the steps in order.

---

## The Artifact is the state

The published Artifact is the **single source of truth**. Everything a run needs —
the section markup, the cursors (`#doc-state`), the scope and config
(`#doc-config`), the allowlist, the previews — lives inline in that one hosted
document. A run does not depend on any local file: it `WebFetch`es the Artifact,
patches it in memory, validates, and republishes to the same URL. This is what
lets the refresh run in a Claude Code cloud routine, where the repo is cloned
fresh every time and nothing on disk survives between runs.

There is therefore **no `state.json`, no `.bak`, no `refresh.log`, no lock file** —
those were a local-filesystem model this one replaces. Backup is the Artifact's
own version history; rollback is *not republishing* a bad build, so the last good
version simply stays live. The publishing mechanics are in
[`publishing.md`](publishing.md); this file is the editorial protocol.

## Two cadence tiers, one routine

The document is meant to run **hourly** so it is genuinely current, but most of the
per-run cost is synthesis that does not change hour to hour. So a run does two
tiers of work, and self-paces the expensive one — there is **one** hourly routine,
not two schedules:

- **Every run (cheap, mechanical):** advance cursors for succeeded sources;
  **auto-check watched todos** (below); append genuinely new events and lane items
  from the window; patch the sections those cite. This is pure data patching —
  a handful of field flips and array appends — so it is fast and near-free in
  tokens. Most hours are a no-op and publish nothing.
- **Once a day (expensive, synthetic):** regenerate the Today brief and its
  painting, re-evaluate `#goal`, and refresh the synthesis sections (`tldr`,
  `primer`, `glossary`). Gate this on `#doc-state.lastDaily`: do it only when the
  calendar day (in the document's `timezone`) has rolled over since `lastDaily`,
  then set `lastDaily` to now. A run that is not the day's first skips all of it.

`#panel-today` is only rebuilt on the daily tier — an hourly run leaves the
existing brief in place (it is the day's brief, not an hourly one).

### Auto-checking watched todos

A lane item may carry `watch: { kind, ref }` (see [`data-model.md`](data-model.md)).
On every run, for each watched item, look in the new activity you already fetched:
if its PR merged or its bead closed, **flip its linked gantt row to
`status: "shipped"`** and write one `res` (Resolved) changelog bullet citing the
merge/close. Never invent completion — only a real merge/close checks the box. An
item whose watch has not resolved is left exactly as it is.

**Adding todos intraday** is the same mechanism in reverse: when the window brings
a new PR assigned to you or a new bead, append a lane item (and its gantt row) —
that is an ordinary cheap-tier data patch, no daily pass required.

## Refresh runs unattended

A refresh runs **detached, on a schedule, with no one watching**. So it **never
prompts, never blocks, never waits for confirmation.** Every branch has an
autonomous default; anything genuinely undecidable is left untouched and noted.

Two failure classes, handled differently — the whole safety model:

- **An integrity failure** — `check.mjs` fails on the patched document, or
  `#doc-state.format` is newer than this skill — means *the document would be
  wrong.* **Do not republish.** The previously published Artifact stays live
  untouched, cursors are not advanced (they live in the doc you did not
  republish), the failure is notified per [`publishing.md`](publishing.md), and
  the run exits non-zero. Never publish a broken or half-patched document.
- **A source outage** — one tool times out, a connector is missing in this
  environment, an API 500s — is normal for a background job. **Skip that source,
  leave its cursor exactly where it was, add one `inferred` bullet noting the gap
  ("couldn't reach Slack this run"), and carry on with the healthy sources.** The
  source self-heals next run when it is back.

The hard line under both: **a cursor is advanced only for a source that actually
succeeded this run** — and because cursors live inside the document, they advance
only by republishing it. A skipped or failed source keeps its old cursor, always.

## 1. Fetch programmatically and slice — not into context

The run is handed one thing: the `artifactUrl`. **Do not `WebFetch` the whole
rendered document into context** — fetch it with a shell step and slice out only
the JSON blocks you patch (see [`publishing.md`](publishing.md)):

```
curl -sL "$artifactUrl" -o cache.html
node <skill-dir>/references/doc-slice.mjs cache.html doc-state doc-data > slice.json
```

You work from `slice.json` — cursors and content — never the markup. This is what
keeps a 15-minute (or 5-minute) cadence cheap: per-run cost scales with
`#doc-data` size, not the size of the published page.

If there is **no document and no `artifactUrl`**: stop. There is nothing to
refresh; `init` (via `project-doc-setup`) builds the first one. Do not fabricate
a document here.

Check `#doc-state.format` is **3**; a higher number was written by a newer skill —
stop rather than patch data you do not understand. A format-**2** document has no
`#doc-data` (its content is hand-written HTML): migrate it first (see "Migration —
format 2 → format 3" below) before refreshing.

Read the document's inline blocks — `#doc-data` (the content you will patch),
`#doc-state` (cursors), `#doc-config` (scope), `#doc-allowlist`, `#doc-previews`.
You patch the data, never the rendered markup.

## 2. Hold the fetched version as the rollback point

No file copy — the rollback point is simply **the version currently live at
`artifactUrl`**, which you do not overwrite until a clean build is ready to
republish (step 8). Keep the fetched `#doc-data` as the base you patch.

## 3. Read the cursors

They are in the document's `#doc-state` block.

**The cursors are the refresh window, not the calendar.** Query each source for activity
strictly after its own cursor — never "the last 24 hours", never "since yesterday". A run
that was skipped for nine days then picks up nine days of activity and self-heals. A run that
asks for "yesterday" loses eight days silently.

Cursor per source: Slack — newest `ts` per channel (and remember `includeThreads`: thread
replies to older parents never appear in channel history after the cursor — query threads
with activity after the cursor separately, per `config.md`). GitHub — highest PR number per
repo and newest commit sha **per tracked branch**. Gmail — newest `internalDate`.
Calendar — newest event end. Drive — newest `modifiedTime` per folder. Pact — newest bead
update time.

## 4. Query each source, then decide whether anything happened

Fetch, then judge. Activity is not news: a rebase, a lint commit, a "thanks!" reply and a
calendar invite that nobody accepted are all *activity*, and none of them change a section.

**A source scoped by "decide for me" may refine its own scope.** A Gmail block with
`"auto": true` (setup derived the query rather than the user authoring it) is a starting
point, not a fixed query: when a run sees which senders and threads actually belong to the
project, it may add terms to the query — or create a Gmail label and switch to it — and
write the improved query back into `#doc-config`, so future reads are tighter. A block with
`"auto": false` was the user's own and is never rewritten. The same principle applies to any
source whose scope setup defaulted: sharpen it from real data, never silently narrow it in a
way that would drop already-reported items.

Custom sources are queried exactly like built-ins: call the source's `tool`, take everything
whose `cursorField` is newer than `cursors.<id>`. A source whose tool is **absent or errors
in this environment** is not a failure of the run — apply the source-outage rule from
"Refresh runs unattended": skip it, leave its cursor, note the gap with an `inferred` bullet,
and continue. Only a source that succeeded gets its cursor advanced in step 8.

**If nothing new is worth reporting:** do not republish. Advancing cursors past unreported
activity would mean republishing the document, and a republish with no changelog entry is
noise — so leave the Artifact exactly as it is. The cursors stay where they were; next run
re-reads the same small window, finds the same nothing, and is cheap. Notify nothing on a
no-change run for the doc (see the on-change rule in [`publishing.md`](publishing.md)). The
today line and relative ages stay honest regardless: `doc-shell.js` computes them at open
time from the already-published document.

## The unit of a patch is a data node, not markup

From here on you edit **`#doc-data`**, never HTML. The renderer
([`doc-render.mjs`](doc-render.mjs)) turns the patched data into markup at publish
(step 8), so a patch is an array append or a field change — the spark strip, the
filter chips, the legend, the tile counts, the gantt axis and every id are
**derived** and never touched by hand. Find the section by its `id` in
`data.sections`, edit its `blocks`, done. Block shapes are in
[`data-model.md`](data-model.md).

## 5. Append one run to What's New

Push one run object to the front of the `whatsnew` section's `blocks.runs`, set its
`latest: true`, and clear `latest` on the run that had it:

```json
{ "iso": "2026-07-24", "date": "24 July", "time": "09:26 NPT",
  "sources": "slack · github · pact", "latest": true, "bullets": [ … ] }
```

Each bullet is `{ kind, strong?, text, cites?, goto? }`:

- `kind` ∈ `dec|risk|res|add|upd|watch`; `strong` is the bold lead clause, `text` the
  rest — **two lines at most** once rendered;
- `cites: [Cite]` names where you learned it — PR, Slack permalink, doc URL, bead id. No
  URL is fine (the chip renders unlinked);
- `goto: { target, label }` links to the section it changed — exactly one.

A bullet with no `goto` patched nothing: find its section or cut it. A claim you inferred
rather than read carries a cite with `"kind": "link"` and hedged phrasing **or**, if there
is no artifact at all, an `inferred` mark — represent that by giving the bullet **no
`cites`** and phrasing it as a reading; the renderer/skill treats a cite-less bullet as
inferred. Every bullet is either cited or inferred; neither means it does not ship.

If a bullet needs depth, that depth lives in the block it patches (a `body`/`disc` field),
never as a second card in the changelog.

## 6. Patch only the cited data nodes

For each section the entry's `goto`s name, edit that section's `blocks` and nothing else:

- **Timeline event / decision** → push an `Event` to the `timeline` section's `blocks`:
  `{ kind, iso, date, title, gist, body?, cites?, flag? }`. A decision or pivot is just an
  event with that `kind` — the timeline **is** the decision log; `title` is the fork,
  `gist` the verdict, `body` the Why/Rejected/Consequences. The renderer re-derives the
  month cluster, the spark height, the filter chip and the legend entry — you add none of
  them.
- **State change** → edit or add a `Row` in the right group's `rows` (or add the group).
  The tile count is derived from the rows; never write it.
- **Architecture change** → edit a stage's `detail`, or add a `{ title, gist, detail }` to
  the `pipeline` blocks. Numbers, ids and arrows are derived.
- **Lane change** → edit the `lane` item **and its `gantt` row**: `status`, integer
  `c1`/`span`, and the `vh` sentence must still agree. If the window scrolled past its
  first column, re-base every row's `c1` **and set `window.start`** to the new column-1
  date. The today line is derived — never patch it.
- **Question answered** → move the item from the `ask` block's `open` array to `done`,
  adding `answer` and `cites`. Never delete the question.
- **New jargon** → add a `{ term, def, code? }` to the right glossary category's `terms`.

**The disclosure rule still governs.** When new information would make a visible line long,
the visible field (`title`/`gist`) stays one line and the detail goes into the block's
`body`/`disc` field, appended to what is there. Never shorten a visible line by dropping the
prose — move it.

Sections nobody cited are left untouched **unless** a bullet cites them, in which case fix
the wrong field rather than rewriting the section. A contradiction between an old fact and
new activity *is* a `upd` bullet: cite the section and fix the field.

**`#goal` is re-evaluated on the daily tier** (see "Two cadence tiers"), not only
when cited — append-only and confidence-gated:

- **Hard signal** — a decided change (a call, a written scope change, a milestone
  hit/missed): set the `goal` block's `current` to the new framing, push the prior framing
  as a dated `shift` (`{ date, kind, title, verdict, why?, cites }`), and write one `upd`
  bullet citing the evidence and `goto`-ing `goal`. The old framing is **never deleted** —
  it becomes the shift record.
- **Soft drift** — trending away but nothing decided: do **not** change `current`. Set the
  `goal` block's `historical` (or add a drift note) as an inferred reading, and write one
  `watch` bullet. A later run promotes it if a decision confirms, or drops it if the drift
  reverses.

Only a decision changes `current`; everything else is a visible, reversible note.

The `today` tab is not in `#doc-data` — it is the daily-brief fragment, rebuilt on the
**daily tier** and passed to `renderBody`; an hourly run leaves the existing brief in place.
It is the day's brief, not part of the record.

## 7. Move the new flags

Flags are data: set `flag: true` on each node this entry touched, and clear `flag` on every
other node. The renderer emits the `new` pill from that field, so the badge always means
"changed in the newest entry", never "changed at some point". `check.mjs` need not count
markup — the flag lives on the data it belongs to.

## 8. Advance cursors, render, validate, publish

In the patched `#doc-data`/`#doc-state`: set each cursor to the newest item you actually
**processed from a source that succeeded** — not to "now" (that swallows anything that
arrived mid-run), and never for a source you skipped. Set `lastRun` to the current timestamp
with offset, and `#doc-data.meta.updatedAt` (the renderer puts it in the dial).

**Render, then assemble.** Run `renderBody` from `doc-render.mjs` on the patched `#doc-data`
(with the fresh Today fragment) to regenerate the body, and rebuild the document: skeleton,
style, sprites, that body, the inline state blocks (with the patched `#doc-data`), the
scripts. The markup is generated — you never hand-edit it.

Validate the assembled document **before it is published**:

```
node <skill-dir>/references/check.mjs <assembled-file>
```

This runs both passes — the `#doc-data` schema/cross-refs and the rendered-HTML sanity. Fix
every error and re-run until clean. **If it cannot be made clean, do not publish** — the
previously published Artifact stays live, cursors are not advanced (they are inside the doc
you did not publish), notify the failure, exit non-zero. This is the integrity-failure branch:
rollback is simply *not republishing*.

When clean, **publish** per [`publishing.md`](publishing.md): republish to the existing
`artifactUrl` (updating it in place), then notify only if this run produced a changelog entry.
If a human is present, confirm what changed and the doc's URL; unattended, the notify is the
report.

---

## Rollback

There is no `.bak`. The rollback point is the **Artifact's own version history** and the fact
that a bad build is simply never published. If a *published* document is later found wrong,
restore it from the Artifact's version picker (the `label` each publish carries, per
`publishing.md`) and re-run from step 1.

## Migration — format 2 → format 3 (one-time, per document)

A document built before the data model is **format 2**: its content is hand-written
HTML with no `#doc-data`. The first time the new skill meets one (step 1 sees
`format: 2` and no `#doc-data`), migrate it before refreshing — its own named run,
never silent:

1. **Fetch** the format-2 document (its `artifactUrl`, or the local cache).
2. **Parse** it to `#doc-data`:

   ```
   node <skill-dir>/references/doc-migrate.mjs <format-2 index.html> > doc-data.json
   ```

   `doc-migrate.mjs` parses exactly the markup `doc-render.mjs` emits — the two are
   the same spec — and is round-trip tested (`doc-migrate.test.mjs`). It is
   **best-effort**: a document whose markup drifted from the spec may not fully
   parse, which is why step 4 verifies before anything is published.
3. **Assemble format 3**: build the document from that `#doc-data` via `renderBody`
   (as in `SKILL.md`'s build order), carrying the old `#doc-state` cursors forward
   and setting `format: 3`. Lift `#doc-config`, `#doc-allowlist` and `#doc-previews`
   across unchanged.
4. **Verify, then publish.** Run `check.mjs` (both passes) and eyeball the rendered
   result against the original — the `What's New` history, the timeline, the settled
   questions must all still be there. Only when it is clean and complete, republish
   to the same `artifactUrl`. The format-2 version stays in the Artifact's version
   history, so a bad migration is one restore away and is never the live document.

After migration the document is format 3 and every later refresh is a data patch.

## Re-shell — upgrading the locked assets

The style, sprite and script blocks are locked *against refreshes*, not against time. When
the skill's `references/` assets have changed since the document was built (a fixed bug in
`doc-shell.js`, a new card kind), the user may ask for a **re-shell**: fetch the current
document, replace its `<style>` contents, both sprites, and the `<script>` contents with the
current assets, verbatim — and touch **nothing** between them. Sections, changelog, state
blocks all stay byte-identical. Run `check.mjs`, then republish. A re-shell is never done
silently as part of a refresh; it is its own run, named to the user.

## Compaction — when the record outgrows the file

Depth accumulates by design, but a document too big to read is a record nobody keeps —
and an Artifact has a size ceiling of its own. When the document passes ~400 KB or
`#whatsnew` holds more than ~24 runs:

- move the `.wn-run`s beyond the newest 12, verbatim, into an **archive document** — the
  same skeleton, style and sprite blocks, one `#whatsnew`-shaped section, newest first;
- **publish the archive as its own Artifact** and store its URL in `#doc-state.archiveArtifactUrl`;
- leave one plain link at the bottom of `.wn`: `<a class="goto" href="{{archive url}}">Older runs</a>` —
  the **absolute archive Artifact URL** when the document is hosted (a relative
  `archive.html` would be a dead link on a single hosted page), and a relative
  `archive.html` only for a purely-local, unpublished document;
- prune `#doc-previews` of keys no remaining chip references.

Sections other than What's New are never compacted — their depth is the record. Timeline
months (decision events included) and settled questions stay.

## Integrity checks before publishing

`check.mjs` mechanises these — run it (step 8) rather than eyeballing; the list is the
contract it checks, and applies to `init` exactly as it applies to `refresh`.

**Two passes, one command.** For a format-3 document `check.mjs` first validates
`#doc-data` (the source of truth) against the schema and its cross-references — via
`doc-data-check.mjs`, unit-tested in `doc-data-check.test.mjs` — then runs the HTML pass
below on the rendered-and-assembled document (sprites resolve, hosts allowlisted, links land,
JSON blocks parse). Most of the old DOM invariants — tile counts, gantt integers, disclosure
bodies, filter/legend coverage, the glyph ban — are now **guaranteed by `doc-render.mjs`** and
need no separate check: the renderer cannot emit them wrong. What the data pass adds is the
shape the renderer assumes and the cross-refs it cannot see (a gantt bar targeting a real
lane item, a cite that promises a preview payload, exactly one `latest` run).

- Exactly one element carries `is-latest`.
- No `.doc-mast`, no `.tabs`, and the project name appears only in `.dial-name`.
- `#doc-state` is present, parses, is `format: 2`, has `cursors`, and any `artifactUrl` is
  an `https:` URL.
- The dial has one `role="tab"` per panel, each panel `aria-labelledby` its tab, exactly
  one `aria-selected="true"` and exactly one `tabindex="0"`; no `aria-haspopup`; every
  `data-short` is twelve characters or fewer.
- Every `href` starting `http` has a host on the allowlist, and every such anchor carries
  `target="_blank" rel="noopener"`.
- Every `<a href="#…">` resolves to an `id` that exists in the document, and no `id` is
  duplicated.
- Every `<li>` in `#timeline-list` has a `data-type` matching a filter button, and every
  filter button **except `all`** has at least one matching item.
- Every `.tile[data-state]` count equals the number of `.row` + `.disc` children in the
  `.state-group` with the same `data-state` (runtime recounts, but the no-JS view must
  already be true).
- Every `details.disc` has both a `<summary>` and a non-empty `.disc-body`, and its marker is
  `<svg class="disc-i"><use href="#i-chev"/></svg>` — no unicode glyph anywhere in the file.
- Every `.stage-btn[aria-controls]` points at a `.stage-d` id that exists.
- `.gantt` carries `data-start` (ISO date) and `data-unit`; exactly one `.g-today`, first
  child of `.g-rows`. Every `.g-bar` href resolves to a `.item` id, carries a non-empty
  `.vh` sentence, and has `--c1` and `--span` as integers inside `1…--cols`.
- Every `<use href="#…">` resolves to a `<symbol>` in one of the two sprites.
- `--mono` appears only on `.tok` and `<code>`; no date, source name or pill is mono.
- `doc-state`, `doc-config`, `doc-allowlist` and `doc-previews` all parse as JSON.
- Every `data-cite` key on a chip has an entry in `#doc-previews`, and `#doc-previews`
  carries no key that no chip references.
- Exactly one `.src-note`, and it is the last element of `#whatsnew`.
- The cited sections have a `.cite` chip or an `inferred` pill on every item.

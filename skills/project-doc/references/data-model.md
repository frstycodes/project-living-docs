# The data model — `#doc-data` (format 3)

**The document's content is JSON, not markup.** `#doc-data` is the single edit
surface: a refresh patches this data, then the locked renderer
([`doc-render.mjs`](doc-render.mjs)) turns it into the exact HTML that
`doc-components.css` styles and `doc-shell.js` drives. The LLM never writes markup
— it writes data, and the renderer owns the shell. A surgical edit is therefore an
array append or a field flip, not a byte-exact HTML string replacement, which is
what makes hourly refreshes cheap.

Three inline blocks, separate concerns:

- `#doc-state` — cursors, `artifactUrl`, `format` (see [`config.md`](config.md)).
- `#doc-config` — scope + settings.
- **`#doc-data`** — the content, below.

## Top level

```json
{
  "meta": { "project": "", "tagline": "", "timezone": "", "locale": "", "updatedAt": "" },
  "sections": [ SectionNode, … ]
}
```

`sections` order **is** render order. A section appears, disappears, moves or is
renamed purely by editing this array — that is the editorial freedom, preserved.

## SectionNode — chrome is data, layout is locked

```json
{
  "id": "state", "tab": "project",
  "eyebrow": "where things stand", "title": "36 territories, 9 to go",
  "lead": "Shipped, stuck, at risk.", "icon": "i-layers",
  "layout": "timeline|state|ask|whatsnew|tldr|goal|primer|glossary|pipeline|gantt|lane|prose",
  "blocks": …
}
```

`eyebrow`, `title`, `lead`, `icon`, the section's **presence** and its **order**
are free — the LLM's editorial call. `layout` selects a **locked** visual grammar;
the renderer owns how that grammar looks and all its invariants (tile counts,
sprite icons, a11y, filters, spark). A title that changes with the content ("36
territories, 9 to go") is just a string the model sets from the blocks.

**Unknown `layout` → `prose`** (the section-level escape hatch): a novel section
renders as eyebrow + title + lead + generic blocks, never blocked.

## Block shapes by layout

All eleven layouts are implemented in [`doc-render.mjs`](doc-render.mjs) and
golden-tested in [`doc-render.test.mjs`](doc-render.test.mjs) (`node doc-render.test.mjs`).

- **`timeline`** — `blocks: [Event]`, `Event = { kind, iso, date, title, gist,
  body?, bodyHead?, cites?, flag? }`. `kind ∈ decision|pivot|incident|milestone|
  build|meeting`. The renderer **derives** the spark strip, the multi-select filter
  chips (one per kind present), the legend, and the month clustering from the
  events — the LLM supplies only events, so those can never drift.
- **`state`** — `blocks: [Group]`, `Group = { state, rows: [Row] }`,
  `Row = { title, status?, gist?, cites?, flag? }`. `state ∈ risk|blocked|flight|
  shipped`. Tile counts are **derived from the rows**.
- **`ask`** — `blocks: { open: [Q], done: [Q] }`,
  `Q = { q, who?, ctx?, answer?, cites? }`. Tally counts are computed at runtime by
  `doc-shell.js`; ship `0`.
- **`prose` / generic** — `blocks: [GenericBlock]`,
  `GenericBlock = { type: "p"|"callout"|"disc"|"fields", … }`.
  `fields = [{ label, value }]` is the key/value escape hatch for content of an
  unknown shape.

- **`whatsnew`** — `blocks: { runs: [{ iso, date, time, sources, latest,
  bullets: [{ kind, strong?, text, cites?, goto? }] }], srcNote? }`. `kind ∈ dec|
  risk|res|add|upd|watch`. `goto = { target, label }`. The newest run sets
  `latest: true` (renders `is-latest`).
- **`tldr`** — `blocks: { tiles: [{ n, label, gist? , risk? }], key?, long?, longGist? }`.
- **`goal`** — `blocks: { current?, shifts: [DecisionRow], historical? }`,
  `DecisionRow = { date, kind, title, verdict, why?, cites? }`, `kind ∈ decision|
  pivot|milestone`.
- **`primer`** — `blocks: [{ q, a, body }]`.
- **`glossary`** — `blocks: [{ name, terms: [{ term, def, code? }] }]`. The letter
  rail is **derived** from the terms present.
- **`pipeline`** — `blocks: [{ title, gist, detail }]`. Numbers and stage ids are
  **derived** (order → `01`, title → `stage-<slug>`); the last stage has no arrow.
- **`gantt`** — `blocks: { window: { start, unit, cols, todayC1?, vh }, rows:
  [{ title, laneId, status, c1, span, dep?, vh }] }`. The month band and day band
  are **derived** from `start`/`unit`/`cols`; `is-tight` is derived from `span < 3`.
- **`lane`** — `blocks: [{ id, title, href?, tag?, d, cites?, disc?, watch? }]`.
  `item-n` is **derived** from order. `watch` is optional **metadata the renderer
  ignores** — `{ kind: "pr"|"bead", ref }` (a PR number `"acme/x#53"` or a bead id)
  — read by the hourly auto-check: when that PR merges or that bead closes, the run
  flips the item's linked gantt row to `status: "shipped"` and writes a `res`
  changelog bullet. That is how a todo checks itself.

## Cite

```json
{ "key": "pr-53", "kind": "pr|slack|gmail|cal|drive|bead|commit|path|thread|link",
  "raw": "PR #53", "url": "https://…", "preview": { … } }
```

`url` present and allowlisted → linked `<a class="cite">`; else `<span>`.
`preview` present → the chip carries `data-cite` and its payload goes in
`#doc-previews`. `kind: "link"` (or any unknown kind) → the generic `#i-link` chip
and the generic preview card.

## The security invariant (absolute)

Every value that came from a source is escaped by the renderer — `esc()` on text,
`escAttr()` on attribute values. A generic node (unknown cite kind, generic block,
prose section) carries **structured data** — labels, strings, an href — and
**never source-authored markup**. Unknown *shape* is fine; unknown *markup* is
never rendered. This is what lets the model be flexible about content it has never
seen without reopening the XSS surface the skill closed.

## Rendering

`doc-render.mjs` runs at **publish time** in node (no DOM, no dependency). The
build: write/patch `#doc-data` → `renderSections(data)` → assemble the document →
`check.mjs` → publish, baking both the rendered HTML (for no-JS and first paint)
and `#doc-data` (the edit surface for the next run) into the Artifact.
`doc-shell.js` handles interactivity on the baked HTML, unchanged.

# The source contract

A source is anything the document reads to learn what happened: Slack, GitHub,
Gmail, Calendar, Drive, Pact and the repo are the built-ins, but the set is
**open**. Any tool the user has connected can become a source — a Linear
workspace, a Notion database, a Jira project, an RSS feed — as long as it can
answer the one question a refresh asks: *what changed since last time, and where
can I link it?*

There are **two tiers**, and a source declares which one it can reach by what it
supplies. Nothing else in the skill needs to change to add a source — the
rendering, the cursors and the citation chips are already generic. This file is
the checklist a source meets to register.

---

## Tier 1 — first-class

A first-class source gets a linked citation chip, a hover preview card, and its
own cursor. To qualify it must supply all of:

| Field | Meaning |
|---|---|
| `id` | the config key, lowercase (`linear`, `notion`) |
| `name` | display name (`Linear`) |
| `cursor` | the value that marks "everything up to here is already in the document", and the query that fetches **strictly after** it — an issue-updated timestamp, a monotonic id, a page-revision number. Stored per-source inline in the document's `#doc-state`, exactly like the built-ins. |
| `citationKind` | one of the kinds in the citation table in [`sections.md`](sections.md), whose sprite icon already exists — or `link` (see Tier 2). A source that reuses `pr`/`bead`/`slack`/`cal`/`drive` semantics reuses that kind and its card. |
| `allowlistHosts` | every host its permalinks live on, added to the document's allowlist at build so the chips resolve to real links. |

Optional, and worth it:

| Field | Meaning |
|---|---|
| `preview` | a payload shaped like one of the `.cprev` kinds in [`sections.md`](sections.md), baked into `#doc-previews` so the hover card renders with no fetch. If a source's shape matches an existing card (an issue reads like a `bead`: id, title, status, assignee), reuse that kind's preview fields verbatim. |

A first-class source that is **new** — not a reskin of an existing kind — needs a
sprite symbol and, if it wants a bespoke card, a `.cprev` layout. **That is a
locked-file change** (`doc-sprite.svg`, `doc-shell.js`, `doc-components.css`) and
therefore a skill-version bump, not a per-project addition. Until then, register
it as Tier 2.

## Tier 2 — generic link

A source that cannot meet Tier 1 — no stable permalink, no known card shape, an
unstructured feed — still belongs in the document. It registers with just:

| Field | Meaning |
|---|---|
| `id`, `name` | as above |
| `cursor` | as above — even a generic feed has a "newest seen" marker; without one it re-reports everything every run |
| `citationKind: "link"` | renders the `#i-link` chip. Linked if the URL's host is allowlisted, an unlinked `<span>` otherwise. |

A `link`-kind citation gets a **generic card**: the source name on the band,
whatever `title` it has, an optional `author` and `age`, and — if the source
supplies one — its **favicon**. No fabricated fields, no fetch.

```json
"preview": {
  "source": "Linear", "title": "Audit trail is append-only", "author": "sandesh",
  "modified": "2026-07-21T11:20:00Z",
  "favicon": "data:image/png;base64,iVBORw0KGgo…"
}
```

- `favicon` must be a **`data:` URI** — a favicon fetched once at build time and
  inlined, exactly like the avatar rule. An external URL is ignored (CSP blocks it
  in the Artifact anyway), and a missing or broken favicon falls back to the
  generic link glyph, which is a designed state. Grab it from the source's origin
  (`/favicon.ico` or the page's `<link rel="icon">`), downscale to ~16px, base64
  it. Roughly 1–2 KB. It is what makes a custom source's card feel like *that*
  service instead of a nameless link.
- **A custom source should register a preview, not just a bare chip.** The richness
  floor in [`sections.md`](sections.md) applies to custom sources exactly as it
  does to built-ins: a chip you resolved but left without a payload is a bare link
  where a card was available. A `link` citation with genuinely nothing to preview
  is just the chip — the floor, needing **no locked-file change**.

---

## Registering a source at setup

`project-doc-setup` writes each chosen source into `config.json`'s `sources`
block. A built-in uses its documented block ([`config.md`](config.md)); a custom
source uses:

```json
"sources": {
  "custom": [
    {
      "id": "linear",
      "name": "Linear",
      "tool": "mcp__…__list_issues",
      "citationKind": "bead",
      "cursorField": "updatedAt",
      "allowlistHosts": ["linear.app"],
      "query": { "team": "LAT", "project": "Latitude" }
    }
  ]
}
```

- `tool` names the MCP tool the refresh calls to read it. A source whose tool is
  not present in the run environment is **skipped, not failed** — the same rule
  as any unreachable built-in (see the unattended failure model in
  [`update-protocol.md`](update-protocol.md)).
- `citationKind` reuses an existing kind or is `link`. **Never invent a kind
  string** — an unknown kind falls back to the generic `link` card at runtime,
  so inventing one just loses the chip's specificity silently.
- `cursorField` names the field on the tool's items that is the cursor. Its
  newest value seen this run is written to `#doc-state` under `cursors.<id>`.
- `query` is whatever the tool needs to scope to this project.

## The one invariant

**A source is only ever as trustworthy as its citations.** A first-class source
links; a generic source links when it can and shows plain text when it can't; a
source that cannot cite an item at all does not put that item in a cited section.
Adding a source never relaxes the sourcing standard in [`SKILL.md`](../SKILL.md)
— it only widens where the citations come from.

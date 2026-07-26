# Per-project config

The config is authored once at setup and then **baked inline into the published
document** as `<script type="application/json" id="doc-config">`, because the
Artifact is the single source of truth and a scheduled cloud run — which clones
the repo fresh — has no local file to read. `project-doc-setup` writes a local
`config.json` while interviewing, but the moment the document is published, the
inline `#doc-config` block is authoritative; every `refresh` reads scope, `you`,
`brief`, `timezone` and `locale` from there, not from a sidecar.

The block carries the full config below **except the `allowlist`**, which has its
own `#doc-allowlist` block. `timezone`/`locale` are the same values the runtime
already reads from `#doc-config`.

**Privacy — say this at setup.** The scope (`sources`) names what the project
watches: Slack channel ids, a Gmail query, Drive folders. That is **not
credentials** — auth stays in the user's connected MCP tools and is never stored —
but it does travel inline in the document. Artifacts are **private by default**,
so this is safe as long as the doc stays private. **Sharing the doc shares its
scope.** A local `config.json`, if kept as a setup convenience, must still be
git-ignored (`git check-ignore .ignored`; add `.ignored/` to `.gitignore` if
not) so it is never committed.

```json
{
  "project": "Latitude",
  "tagline": "The living document — everything that happened, and where you stand.",
  "timezone": "Asia/Kathmandu",
  "locale": "en-GB",
  "you": {
    "name": "Sandesh",
    "role": "Frontend, review queue + audit trail",
    "beadAssignee": "sandesh",
    "lane": { "windowUnit": "week", "windowColumns": 12 }
  },
  "sources": {
    "slack": {
      "channels": [
        { "id": "C08AB12CD", "name": "latitude" },
        { "id": "C08XY99ZZ", "name": "latitude-pact" }
      ],
      "includeThreads": true
    },
    "github": {
      "repos": ["acme/latitude"],
      "branches": ["main"],
      "prLabels": [],
      "ignoreAuthors": ["dependabot[bot]"]
    },
    "gmail": { "query": "from:latitudemedia.com OR subject:latitude", "auto": true, "enabled": true },
    "calendar": { "match": "latitude|standup", "calendarIds": ["primary"] },
    "drive": { "folderIds": ["0ABcDeFgH"], "recursive": true },
    "pact": { "project": "latitude" },
    "repo": {
      "contextFiles": ["CLAUDE.md", "AGENTS.md", "CONTEXT-MAP.md"],
      "readCommitLog": true
    },
    "custom": [
      {
        "id": "linear",
        "name": "Linear",
        "tool": "mcp__linear__list_issues",
        "citationKind": "bead",
        "cursorField": "updatedAt",
        "allowlistHosts": ["linear.app"],
        "query": { "team": "LAT" }
      }
    ]
  },
  "brief": {
    "scope": "project",
    "slackChannels": ["C08AB12CD", "C08XY99ZZ"],
    "githubRepo": "acme/latitude",
    "gmailQuery": "from:latitudemedia.com",
    "calendarMatch": "latitude|standup",
    "pactProject": "latitude"
  },
  "allowlist": [
    "github.com",
    "slack.com",
    "docs.google.com",
    "drive.google.com",
    "mail.google.com",
    "calendar.google.com",
    "latitudemedia.com"
  ]
}
```

## Fields

| Field | Meaning |
|---|---|
| `project` | The name in `.dial-name`, inside the dial's popover. There is no masthead. Also the document's identity across refreshes — changing it does not create a second document. |
| `tagline` | Used as the `<title>` of the page. It no longer appears in the body. |
| `timezone` | IANA zone. Every timestamp the document displays is rendered in it; every cursor is stored in UTC or with an explicit offset. Baked into the page with `locale` as `<script type="application/json" id="doc-config">{"timezone":"…","locale":"…"}</script>` — `doc-shell.js` reads it to format runtime dates; a document without it falls back to the reader's zone, which disagrees with every other date on the page. |
| `locale` | BCP-47 tag for runtime date formatting (default `en-GB`). Travels in `doc-config` beside `timezone`. |
| `you` | Who "Your lane" and "Ask" are written for. `beadAssignee` filters Pact to their work. `lane.windowUnit` (`week` or `month`) and `lane.windowColumns` set the Gantt's `--cols` and the meaning of one column; twelve to sixteen columns is the readable range. |
| `sources.*` | Where to look. A missing or `enabled: false` block means that source is skipped and its cursor is left alone — a source you cannot reach must never silently look like a source with no activity. |
| `sources.custom[]` | Sources beyond the seven built-ins — a connected Linear, Notion, Jira, or any feed. Each registers against the **source contract** in [`source-contract.md`](source-contract.md), which is the authority on the fields and the two tiers (first-class card vs generic `link` chip). `project-doc-setup` writes these from the source menu; a user may hand-add one against the contract. Cursors for custom sources live under `#doc-state`'s `cursors.<id>`, exactly like the built-ins. |
| `sources.github.repos` | One entry per tracked repo (a legacy single-string `repo` is read as a one-element list). Cursors are keyed per repo, and per branch within it — see `#doc-state` below. |
| `sources.github.prLabels` | Only PRs carrying at least one of these labels are read; empty list = every PR. |
| `sources.slack.includeThreads` | When true, a channel's refresh window must also cover **thread replies to older messages**: a reply to a two-week-old parent never appears in the channel history after the cursor. Query threads whose latest reply is newer than the cursor (`conversations.replies` on parents with fresh activity, or a search scoped to the channel) — the channel cursor alone will silently lose decisions made in threads. |
| `brief` | Passed straight to the `daily-brief` skill as its project filter config. Duplicates the source ids on purpose, so the brief's scope can be narrower than the document's. |
| `allowlist` | Host suffixes permitted in `href`. Matching is exact host or `.suffix`. |

## The allowlist

It is embedded in the built document as
`<script type="application/json" id="doc-allowlist">` and enforced twice:

- **at build time**, by you — parse every URL before it becomes an `href`; a URL whose host
  fails, or whose scheme is not `http`, `https` or `mailto`, is written as plain text;
- **at runtime**, by `doc-shell.js` — any surviving anchor that fails is replaced with a
  `.blocked-link` span.

Same-document fragment links (`#timeline`) and **relative links** (the compaction
archive, a sibling file) are always allowed and are not on the list — they name
local facts, not network destinations.

Add a host only when the user asks for it. A link you cannot allowlist is still worth keeping
as visible plain text — the reader can copy it and decide for themselves.

Preview cards render an author's avatar only when its host is allowlisted — add
`avatars.githubusercontent.com` and the workspace's Slack avatar host if the user
wants real faces. Without them the cards show a monogram, which is also the
fallback when an image fails to load. Nothing else in a card is fetched.

## `#doc-state` — the inline state block

**The published Artifact is the single source of truth.** Everything the next run
needs to continue lives *inside* the document, because a scheduled cloud run
clones the repo fresh and a git-ignored sidecar file would never be there. Cursors
travel inline, in a `<script type="application/json" id="doc-state">` block, read
back each run by `WebFetch`-ing the Artifact:

```json
{
  "format": 3,
  "lastRun": "2026-07-24T09:26:00+05:45",
  "lastDaily": "2026-07-24T08:07:00+05:45",
  "artifactUrl": "https://claude.site/artifacts/…",
  "archiveArtifactUrl": null,
  "cursors": {
    "slack": { "C08AB12CD": "1753340000.001900", "C08XY99ZZ": "1753101234.000400" },
    "github": { "acme/latitude": { "lastPr": 51, "branches": { "main": "ea03d8f9c1…" } } },
    "gmail": { "lastInternalDate": "1753339200000" },
    "calendar": { "lastEndUtc": "2026-07-24T03:41:00Z" },
    "drive": { "0ABcDeFgH": "2026-07-23T18:02:11Z" },
    "pact": { "latitude": "2026-07-23T21:40:00Z" },
    "linear": "2026-07-23T20:00:00Z"
  },
  "sources": {
    "github": { "read": 57, "recorded": 41 },
    "slack":  { "read": 240, "recorded": 33 },
    "pact":   { "read": 62, "recorded": 56 }
  }
}
```

- `format` names the document contract this skill writes (**2**). A higher number
  means a newer skill built it — stop rather than patch markup you do not
  understand.
- `artifactUrl` is where this document is published; a run reads it to know which
  Artifact to fetch and republish. `archiveArtifactUrl` is the compaction
  archive's own Artifact (see the publishing protocol), or `null`.
- `lastDaily` is when the expensive daily tier last ran (see "Two cadence tiers"
  in [`update-protocol.md`](update-protocol.md)); an hourly run does the daily work
  only once the document-timezone day has rolled over past it.
- Cursors are keyed per source, per repo/branch where the source needs it, and
  under the custom source's `id` for custom sources.
- **`sources`** is the **read/recorded tally** — one `{ read, recorded }` per
  source. `read` is how many items the run paged past to the cursor floor (PRs +
  issues, Slack messages, beads, commits); `recorded` is how many of them became a
  cited item in the document. It exists to make **under-reading visible**: init
  fills it, every refresh adds what it newly read/recorded, and the publish gate
  both prints it and cross-checks `recorded` against the items actually rendered
  (a tally that disagrees with the page, or a `read` far larger than `recorded`
  with no reason, is flagged). `recorded < read` is normal — not every PR is a
  timeline event — but `read: 8` against a 200-PR repo, or `recorded: 41` while the
  page shows eight, is the sampling failure this field surfaces. Omit a source that
  was not read this run; never fabricate the counts.

Cursors advance by **republishing the document** — there is no separate file to
write. A document from before this model may carry a sibling `state.json`; lift
its contents back into `#doc-state`, delete the file, and carry on.

## `citations.json`

Beside `config.json`, written by the citation-resolution pass and read at build
time to turn citation chips into real links and to bake their preview payloads.
Its schema and the mapping rules are "Citations" in
[`sections.md`](sections.md). It is optional: with no file, every chip is an
unlinked `<span>` and the document is still correct.

## Adding a source later

Add its block to `sources`, leave its cursor out of `#doc-state`, and run `refresh`. A source
with no cursor is read from the project's beginning on its first run, then cursored normally.

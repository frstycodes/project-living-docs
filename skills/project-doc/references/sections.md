# The eleven sections

> **Markup is generated, not authored.** As of format 3 you never hand-write the
> HTML in this file. You write `#doc-data` (schema in
> [`data-model.md`](data-model.md)); the locked renderer
> [`doc-render.mjs`](doc-render.mjs) turns it into exactly the markup shown below.
> **The markup blocks here are reference — what the renderer produces — not a
> template to copy.** What still governs your authoring is everything in this file
> that is *not* markup: what each section is for, its voice, when to include it,
> the disclosure rule, the citation standard, the colour and type policies. Read
> it for intent; write data, not tags.

One panel per tab; sections nest inside panels. Every section is
`<section class="sec" id="…">` with an `.eyebrow` (icon + word), an `<h2>`, and a
`.sec-lead` paragraph — one line, not three — that says what the section is for.
A returning reader must be able to tell from that line whether this section
answers their question.

Panel skeleton:

```html
<div class="panel" role="tabpanel" id="panel-timeline" aria-labelledby="tab-timeline">
  <section class="sec" id="timeline">…</section>
</div>
```

**There is no masthead.** The document opens straight into Today's painting. The
project name and the updated-at line live inside the dial's popover (see "The
dial" below) — that is the page's only chrome.

---

# The disclosure rule

**This rule outranks every other instruction in this file, including every
instruction to be sparser. Read it before writing a single section.**

No content may be deleted to make a section sparse. The page reads sparse because
depth is *folded*, not because depth was *cut*.

Every unit of content is written in two parts:

1. **The visible line** — a headline plus a one-line gist. This is all the reader
   sees by default. One line. Not a paragraph that happens to be short.
2. **The disclosure** — a `<details class="disc">` holding the **full original
   prose, verbatim**: the reasoning, the alternatives, the caveats, the names, the
   numbers, the links.

Consequences, stated plainly because runs get this wrong:

- A run that shortens a visible line **must move the full text into the
  disclosure**. Never drop it, never paraphrase it into oblivion, never "the gist
  is enough". Summarising away detail is a defect, not a style choice.
- On refresh, if a section's visible line changes, the disclosure keeps the prior
  prose plus the new. Depth accumulates; the surface stays one line.
- If a unit genuinely has no depth, it has no disclosure. An empty `.disc` is worse
  than none.
- A section with more than roughly three consecutive paragraphs of visible body
  text has failed this rule. Find its shape and fold the rest.

Markup contract — every disclosure in the document is this shape:

```html
<details class="disc">
  <summary>
    <span class="disc-t">{{headline}}</span>
    <span class="disc-g">{{one-line gist}}</span>
    <svg class="disc-i" aria-hidden="true"><use href="#i-chev"/></svg>
  </summary>
  <div class="disc-body">
    <p>{{the full original prose, nothing removed}}</p>
  </div>
</details>
```

The marker is **always** `<svg class="disc-i"><use href="#i-chev"/></svg>` from
`references/doc-sprite.svg`. Never a unicode glyph (`▸ › ▾ →`) — a glyph ignores
`stroke-width` and will not line up with the rest of the icon set. The open/close
motion and its `prefers-reduced-motion` fallback are already in
`doc-components.css`; do not restyle it inline.

`.disc.flat` is the same disclosure with its card removed, for use where a boxed
disclosure would sit inside another box. **A card inside a card is always wrong.**

---

# The richness floor

**This is not a style preference. It is the difference between this document and a
bullet-point summary, and a run that trades it away has failed the same way a run
that drops a section has failed. Read it with the disclosure rule — they are the
two halves of the same promise: nothing observed is lost, it is only folded.**

A run economising on tokens will quietly collapse two things — the second altitude
of every item, and the preview payloads behind the chips. Both are the information.
The floors, non-negotiable:

1. **Every item that has depth carries a disclosure holding that depth verbatim.**
   Not a paraphrase, not "the gist is enough". If a Slack thread ran twelve
   messages, the visible line is the outcome and the `.disc-body` carries the
   reasoning, the names, the quotes. An item collapsed to a lone one-liner when the
   source had more is a defect. (The disclosure rule, applied to content.)

2. **Every cited item that *can* resolve to a preview *must* carry one.** A chip
   with a resolvable PR / bead / Slack / calendar / drive behind it and no
   `data-cite` + `#doc-previews` payload is a bare link where a hydrated card was
   available — the single most common way this document gets thinner than its
   sources. The target is near-total: on a healthy build, the large majority of
   chips carry a payload, and a run that emits mostly bare links has under-fetched.
   Fill the payload from data you already read to resolve the citation — you are
   not making a second fetch, you are keeping what the first one returned.

3. **Carry the source's own words and faces.** A PR preview keeps its real title,
   author, avatar, additions/deletions. A Slack preview keeps the **verbatim
   message text** and the author's face (inlined as a `data:` URI — see "The
   preview payload"). A bead keeps its status and assignee. Summarising these into
   the doc's own voice and discarding the originals is loss, not editing.

4. **Completeness over curation in the recorded sections.** What's New, Timeline,
   the Timeline's decisions and Current State record *what happened* — **every**
   decision, pivot, incident, milestone and shipped item the sources show, each
   cited, not a hand-picked highlight reel. Same for the Glossary (every term the
   team actually uses) and the goal's decision shifts. Curation is the visible
   line's job (one line each); the record is the disclosure's and the preview's.

   **Read the sources to exhaustion, do not sample.** This is the failure that
   loses the most: a mature project has *dozens* of timeline events and decisions,
   not ten. Page every source all the way back to its cursor floor — the whole
   Slack history for each channel, every PR and issue, every bead, the full commit
   log — and record each qualifying item. A run that stops after the first page,
   or keeps "the important ones", produces a doc that is 3–10× thinner than the
   sources: ten timeline events where the sources hold fifty, seven decisions where
   there are sixty, twenty glossary terms where the team uses eighty. That is the
   single biggest data loss this document can suffer, and it is invisible in the
   rendered page — it just looks tidy. `check.mjs` warns when folded depth is thin
   for the item count, but it cannot see the events you never read; only reading to
   the floor prevents it.

The self-check before publishing: **would a reader who opened every disclosure and
hovered every chip learn as much as a reader of the raw sources would?** If the
answer is no, the run cut depth it was supposed to fold. The `.sec-lead` "Today is
the tone" line governs the *visible surface* — one line per item, sparse by
folding. It never licenses a thinner *record*.

---

# The dial

The document's navigation is one floating button, fixed bottom-right, whose
popover holds the six tabs vertically. It replaces both the masthead and the
old horizontal tablist. Emit it **once**, as the last element before the star
tooltip, outside `<main>`.

```html
<div class="dial">
  <div class="dial-pop" id="doc-dial-pop" role="tablist" aria-orientation="vertical"
       aria-label="Sections" hidden>
    <button class="dial-tab" type="button" role="tab" id="tab-today"
            aria-controls="panel-today" aria-selected="true" tabindex="0" data-short="Today">
      <svg class="ic ic-s" aria-hidden="true"><use href="#i-sun"/></svg>
      <span class="dial-tab-t">Today</span>
    </button>
    …five more…
    <div class="dial-id">
      <span class="dial-name">{{project}}</span>
      <span class="dial-meta">updated {{24 Jul 2026 · 09:26 NPT}}</span>
    </div>
  </div>
  <button class="dial-btn" type="button" id="doc-dial-btn"
          aria-expanded="false" aria-controls="doc-dial-pop"
          aria-label="Sections">
    <svg class="ic ic-s" aria-hidden="true"><use href="#i-sun"/></svg>
    <span class="dial-cur">Today</span>
    <svg class="ic ic-s dial-caret" aria-hidden="true"><use href="#i-chev"/></svg>
  </button>
</div>
```

Rules:

- **Ids are fixed.** `doc-dial-btn` and `doc-dial-pop`; `doc-shell.js` wires them.
- **The trigger is a disclosure, not a menu**: `aria-expanded` + `aria-controls`
  only. No `aria-haspopup` — announcing a menu and delivering a tablist is the
  mixed-semantics defect this line exists to prevent.
- One `role="tab"` per panel, in tab order, each with `aria-controls` pointing at
  its panel and the matching panel carrying `aria-labelledby="tab-…"`. The first
  is `aria-selected="true"` and `tabindex="0"`; the rest are `false` / `-1`.
- `data-short` is what the closed trigger displays. Keep it under twelve
  characters — the trigger is a pill, not a title bar.
- Tab icons, in order: `#i-sun` `#i-pulse` `#i-compass` `#i-layers` `#i-clock`
  `#i-user`. The trigger's own icon is swapped to match the current tab
  at runtime; ship it holding the first tab's symbol.
- `.dial-id` is where the masthead went. It is the **only** place the project name
  appears. Do not reintroduce a title anywhere in the body.
- The popover ships `hidden`, so a JS failure leaves every panel visible.

Behaviour, all of it already in `doc-shell.js` — emit only the markup:

| Input | Result |
|---|---|
| pointer comes within 132px of the dial (fine pointer only) | opens; closes past 222px unless pinned. Proximity, not hover — you never have to land on the button. The gap between the two radii is hysteresis, so hovering the edge can't flicker it. Never an invisible padded hit area: that would dead-zone the page's bottom-right corner. |
| click / tap / Enter / Space on the trigger | opens and **pins**; again closes |
| focus reaching the trigger or a tab | opens silently |
| `↓` `→` / `↑` `←` on a tab | moves and activates the neighbour, keeps focus |
| `Home` / `End` | first / last tab |
| `Escape` | closes, returns focus to the trigger |
| click outside, or focus leaving the dial | closes |
| click a tab | activates it, writes the hash, closes, returns focus |

Motion is `--spring` with a 26 ms per-item stagger, and the popover scales from
its own bottom-right corner (the trigger), not from centre. Opening, closing and
switching each play a short synthesised Web Audio blip. **Every bit of that is off
under `prefers-reduced-motion` — no movement and no sound.**

The no-JS jump list is the **first element in the body** — the dial itself sits
at the end of the body. `html.js` hides the list:

```html
<nav class="nojs-nav wrap" aria-label="Sections">
  <a href="#panel-today">Today</a> … <a href="#panel-you">You</a>
</nav>
```

---

# Type policy

| Family | Where it is allowed | Where it is a bug |
|---|---|---|
| `--serif` | section `<h2>`, `.dial-name`, the latest What's New date, month labels in Timeline | body copy, labels, any paragraph |
| `--mono` | machine tokens only — PR numbers, bead ids, commit shas, identifiers — via `<span class="tok">` or `<code>` | dates, source names, eyebrows, pills, tile numbers, meta |
| `--sans` | everything else, including every large number | — |

The retired mono labels become `.lbl`: sans, 10 px, `.12em` tracking, uppercase.
A **tile number is sans**, proportional figures, no `tabular-nums` — equal-width
digits make a three-digit number look loose at display size.

# Colour policy

The document has exactly **two** hues, and neither is ever the only channel.

| Token | Value | Means | Where |
|---|---|---|---|
| `--accent` | `#FFE501` | a choice was made, or this is where you are | decision + pivot pills and dots, `.callout.key`, the selected tab and filter, the Gantt's today line, the Ask tally |
| `--alert` | `#FF6B5A` | this needs a response | at-risk tiles and bars, blocked bars, incident dots and pills, closed PRs, the deletions half of a diff stat |

`--alert` is defined in `doc-components.css`'s own `:root` because `shell.css`
belongs to the sibling `daily-brief` skill and is never edited. It clears AA as
text and as a graphical indicator on both surfaces: 6.75:1 on `--page`, 6.02:1 on
`--card`, and `--accent-ink` on `--alert` is 6.75:1 for filled pills and tiles.

**Status is never colour alone.** Every alert-coloured thing also carries its
icon and its word — a red dot with no `incident` label is a defect, not a style.
Introducing a third hue is a spec change, not a run's decision.

---

# Citations — an icon chip on every cited item

Today attaches a source-brand icon to each item. Every other tab now does the
same. The chip renders from the citation's **kind**, so a plain-text citation with
no URL still gets its icon — as a `<span>`, never as a fabricated `href`.

```html
<!-- has a URL -->
<a class="cite" data-cite="pr-53" href="{{url}}" target="_blank" rel="noopener">
  <svg class="ic ic-b" aria-hidden="true"><use href="#i-github"/></svg>
  <span class="tok">PR #53</span>
  <span class="cite-tip">Open in GitHub</span>
</a>

<!-- no URL: same icon, no link, no tooltip -->
<span class="cite" data-cite="bead-0082">
  <svg class="ic ic-s" aria-hidden="true"><use href="#i-bead"/></svg>
  <span class="tok">BEAD-0082</span>
</span>
```

## Resolving a citation — `citations.json`

**A chip is a link. Every chip a run can resolve becomes an `<a>` that opens the
thing it names.** A chip that only looks like a citation and goes nowhere is the
document lying about its own sourcing.

Resolution reads `<repo-root>/.ignored/project-doc/citations.json`, written
beside `config.json` by the citation-resolution pass:

```json
{ "citations": [ { "key": "pr-53", "kind": "pr|bead|slack|cal|drive|path",
  "raw": "PR #53", "resolved": true, "url": "https://github.com/acme/x/pull/53",
  "confidence": "exact", "preview": { "...kind-specific..." } } ] }
```

| Kind | `preview` fields |
|---|---|
| `pr` | `number, repo, title, state` (`open`/`closed`/`merged`/`draft`), `author, authorAvatarUrl, additions, deletions, changedFiles, createdAt, mergedAt, closedAt, branch` — `closedAt` so a closed PR's age names its close, not its creation |
| `slack` | `channel, author, authorAvatarUrl, text, ts, permalink` |
| `bead` | `id, title, status, assignee, due` |
| `cal` | `title, start, end` (ISO **with the doc timezone's offset**), `day, dateNum, month, time` (pre-formatted in the doc timezone — a *range* has no single ISO field to format from), `attendees: [{ name, avatarUrl }], attendeeCount, conferenceUrl, location, organizer` |
| `drive` | `title, mimeType, modified, owner, ownerAvatarUrl` |
| `path` | `path, exists, lines` |

**Mapping, per cited item, in this order:**

1. Normalise the raw citation text to a key — `PR #53` → `pr-53`, `BEAD-0082` →
   `bead-0082`, a Slack permalink → `slack-{{channel}}-{{ts}}`, a Drive file id →
   `drive-{{id}}`, a Calendar event id → `cal-{{id}}` (use the **instance** id,
   `…_20260701T160000Z`, never the recurring-series id — a citation names one
   sitting of a meeting, not the series), a repo path →
   `path-{{slugified path}}`. Lowercase, hyphens, no other punctuation; a
   provider id keeps its own case, the way a Slack channel id already does.
2. Look the key up in `citations.json`. **No entry → the chip is a `<span>`.**
   Never invent a URL, never guess the org or repo from context, never reuse a
   URL from a similar-looking citation.
3. Entry with `resolved: true` **and** a `url` whose host passes the allowlist in
   `config.md` → `<a class="cite" href …>`. Every other case, including
   `resolved: true` with a host that is not allowlisted, is a `<span class="cite">`
   with the URL preserved as plain text nearby if it is worth copying.
4. `confidence` other than `exact` still links, but the item's prose carries a
   `<span class="pill inferred">inferred</span>` — a probable link is not a fact.
5. Either way, if the entry has a `preview`, the chip carries
   `data-cite="{{key}}"`. That attribute is the only thing binding a chip to its
   card.

If `citations.json` does not exist, every chip is a `<span>` and the document is
still correct — it is simply unlinked. **Never block a run on that file.**

## Resolve fully — a title-only card is a defect the gate rejects

When you resolve a citation, pull the item's **whole** payload, not just enough to
label a chip. A PR resolved to `{title, state}` renders a card that says author
"unknown" with no diff and no files — the exact breakage `check.mjs` now fails the
build on. Fetch every field the card shows, in the same call that resolves the URL:

- **PR / commit** — `gh pr view <n> --json title,state,author,additions,deletions,changedFiles,createdAt,mergedAt,closedAt,headRefName` (or the GitHub API). `author`, `additions`, `deletions` and `changedFiles` are **required** — a PR always has them, and the gate errors if they are missing. Then download the author's avatar (`author.avatarUrl` / `https://github.com/<login>.png`) and inline it as a `data:` URI in `authorAvatarUrl`.
- **Slack** — keep the **verbatim** message `text`, the `author`, the `ts`, the `channel`, and the author's avatar. Slack's API often returns no avatar URL, so fetch the face once at build and inline it as a `data:` URI; a monogram is the fallback, not the target.
- **Drive** — `title, mimeType, modified, owner` and the owner's avatar inlined.
- **Bead / calendar** — every field in the kind's row of the table above.

The rule: **fetch the face and the numbers once, at resolve time, and inline
them.** You already made the call that resolved the link — carry back everything it
returned. "I have the title" is where the last run stopped, and it is why avatars
were monograms and PR cards read "unknown".

## The preview payload

Every preview used anywhere in the document is baked into **one** JSON block,
emitted with the other state blocks (see the build order in `SKILL.md`):

```html
<script type="application/json" id="doc-previews">
{"pr-53":{"kind":"pr","raw":"PR #53","preview":{"number":53,"repo":"acme/latitude",
 "title":"Review queue: append-only audit trail","state":"merged","author":"sandesh",
 "authorAvatarUrl":"https://avatars.githubusercontent.com/u/1?v=4","additions":412,
 "deletions":96,"changedFiles":7,"createdAt":"2026-07-18T09:00:00Z",
 "mergedAt":"2026-07-21T11:20:00Z","branch":"feat/review-history"}}}
</script>
```

Rules: escape `<`, `&` and any `</script` sequence; drop `permalink` and `url`
from the payload (the chip's own `href` already carries them); include a citation
**only if a chip in the document references it** — never inline `citations.json`
wholesale, which carries entries no chip uses and bloats the file. The keyed
object above is the only shape a run may emit. (`doc-shell.js` still parses the
`{ "citations": [ … ] }` array shape, but only so documents built before this
rule keep working.)

**No fetch happens when a card opens.** The only network request a card can make
is an avatar `<img>`, and only when its host is allowlisted — otherwise, and on
any load error, the avatar is a monogram. Add `avatars.githubusercontent.com`
(and the Slack avatar host) to `allowlist` if the user wants real faces.

`authorAvatarUrl` also accepts a **`data:image/{png|jpeg|gif|webp};base64,…`
URI**, which needs no allowlist entry because it makes no request. Prefer it:
Slack's API commonly returns no avatar URL at all (`authorAvatarUrl: null` on
every message), and a face fetched once at build time and inlined survives an
expired CDN link and a file:// open on a plane. Roughly 4 KB per 48px JPEG.
Match a downloaded face to a message by **given name only, normalised** —
`String(n).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()` on both sides,
so `Ivan Reyes` finds the face filed under `Iván`. No match is not a failure:
the card falls back to the monogram, which is a designed state.

## The preview card

`doc-shell.js` builds one reused `div.cprev` with `createElement` and
`textContent` — never a concatenated HTML string — and appends it to `<body>`.
You emit no markup for it. Its shape, which every kind fills the same way:

```html
<div class="cprev" id="doc-cprev" role="tooltip" aria-hidden="true">
  <div class="cprev-top">
    <span class="pill merged"><svg class="ic ic-s"><use href="#i-merge"/></svg>Merged</span>
    <span class="cprev-id tok">acme/latitude#53</span>
    <span class="cprev-age">3d ago</span>
  </div>
  <div class="cprev-t">Review queue: append-only audit trail</div>
  <div class="cprev-foot">
    <span class="cprev-who"><img class="cprev-av" alt="">sandesh</span>
    <span class="cprev-stat">
      <span class="cprev-add">+412</span><span class="cprev-del">−96</span>
      <span class="cprev-files"><svg class="ic ic-s"><use href="#i-file"/></svg>7 files</span>
    </span>
  </div>
</div>
```

Three bands: **top** identifies it, **title** is the one line worth reading,
**foot** is who and how much. A bead fills them with status + id / title /
assignee, a Drive doc with type / title / owner, a repo path with presence /
path / line count. A band with nothing to say is omitted, never left empty.

**Slack is the one exception**, because a message read out of its author and its
time stops being a message. Its top band is the Slack mark plus `#channel`, and
its title and foot fold into one `.cprev-msg` block under a quote rule:

```html
<div class="cprev-top">
  <span class="cprev-src">
    <svg class="ic ic-b"><use href="#i-slack"/></svg>
    <span class="cprev-ch"><svg class="ic ic-s"><use href="#i-hash"/></svg>latitude</span>
  </span>
</div>
<div class="cprev-msg">
  <img class="cprev-av" alt="">
  <div class="cprev-body">
    <div class="cprev-line"><span class="cprev-name">Iván Reyes</span><span class="cprev-when">3d ago</span></div>
    <div class="cprev-t is-quote">…the message, 12.5px, clamped at 5 lines…</div>
  </div>
</div>
```

The Slack **mark** is the only Slack colour on the card, and there are no
`--sl-*` tokens: aubergine `#4A154B` on `--card` `#1D1D1D` is 1.19:1, which is
invisible. The mark's own lobes clear AA graphical against `--card` (#36C5F0
8.34:1, #ECB22E 8.80:1, #2EB67D 6.50:1, #E01E5A 3.61:1) and every word on the
card stays on the document's ink ramp. Slack timestamps arrive as epoch seconds
(`"1782231991.073999"`), not ISO — `doc-shell.js` reads both.

**Calendar and Drive are specialised the same way**, and for the same reason: an
event read without its time and its room is not an event, and a file read
without its type is not a file. Both borrow Slack's two-column shape — a fixed
left column, then a body — so all three feel like one object seen from three
sides.

A **Calendar** card is `#i-cal` + `Calendar` on the band with the age at the
right (`3w ago` for a past sitting, `in 5d` for one still coming), then a
tear-off **date tile** beside the title, the when line
(`Wed · 9:45 – 10:15 PM NPT · 30 min` — duration is computed from `start`/`end`,
never baked), and the conferencing link as **text** with the Meet mark. The foot
is up to five attendee faces overlapped, then `#i-user` and the full guest count,
because a stack of five circles does not say there were ten people there.

```html
<div class="cprev-top">
  <span class="cprev-src"><svg class="ic ic-b"><use href="#i-cal"/></svg>
    <span class="cprev-ch">Calendar</span></span>
  <span class="cprev-age">3w ago</span>
</div>
<div class="cprev-cal is-past">
  <div class="cprev-tile"><span class="cprev-tile-m">Jul</span><span class="cprev-tile-d">1</span></div>
  <div class="cprev-ev">
    <div class="cprev-t">Bi-weekly check-in</div>
    <div class="cprev-when-l">Wed<span class="cprev-dot">·</span>9:45 – 10:15 PM NPT<span class="cprev-dot">·</span>30 min</div>
    <div class="cprev-conf"><svg class="ic ic-b"><use href="#i-meet"/></svg><span>meet.google.com/yzu-nrnc-vxs</span></div>
  </div>
</div>
<div class="cprev-foot">
  <span class="cprev-faces"><img class="cprev-av" alt=""><span class="cprev-av mono">M</span></span>
  <span class="cprev-guests"><svg class="ic ic-s"><use href="#i-user"/></svg>10 guests</span>
</div>
```

**Past reads as past on two channels, never colour alone**: `.is-past` drops the
date tile to the `--ink-4` end of the ramp and removes its cap rule, and the age
word already says `3w ago` rather than `in 5d`.

A **Drive** card is `#i-drive` + `Drive` on the band with the modified age at the
right, then the **file-type mark** — `#i-gdoc`, `#i-gsheet`, `#i-gslide`,
`#i-gpdf`, falling back to the stroked `#i-file` — beside the title and the
product it opens in. Foot is the owner and the absolute modified date, formatted
in the document's own `timezone` so it cannot disagree with every other date on
the page.

There are no `--goog-*` tokens either, and the arithmetic is why: every Google
hue that could carry a *word* fails AA text on `--card` — Calendar `#1967D2`
3.14:1, Drive `#0066DA` 3.14:1, Meet `#00832D` 3.44:1 — and the ones that pass
(`#FBBC04` 9.87:1, `#34A853` 5.52:1) would read as our own accent and status
colours. So the marks carry all of it, and they clear AA graphical (3:1) on every
lobe: Docs `#4285F4` 4.73:1, Sheets `#0F9D58` 4.80:1, Slides `#F4B400` 9.13:1,
PDF `#EA4335` 4.30:1. The figures live beside the symbols in `doc-sprite.svg`.

**Nothing inside a card is clickable** — it is a `role="tooltip"`. A Meet link on
a Calendar card is text you read, not a link you follow; the chip's own `href` is
the only way out.

PR state maps onto the loudness ladder, so the card needs no colour of its own:
`.pill.merged` (filled accent, it landed), `.pill.open` (outlined),
`.pill.closed` (ruled `--alert`, it did not land), `.pill.draft` (ghost).

**Interaction contract**, all of it already in `doc-shell.js`:

| | |
|---|---|
| opens on | pointer enter **and** keyboard focus, after a 350 ms intent delay |
| closes on | pointer leave / blur after 120 ms, `Escape`, any scroll |
| position | above the chip by default; below if there is no room above; clamped 12 px inside the viewport on both axes |
| origin | the transform origin tracks the chip after a flip, so the card always scales out of its own trigger |
| a11y | the chip gets `aria-describedby` only while its card is open; an unlinked chip with a preview gets `tabindex="0"` |
| motion | springs out of the chip with an overshoot and a ~2° counter-rotation — the daily brief's `.startip` / `.avname` `pop-in`, scaled back for a surface this size |
| reduced motion | the card still appears — it carries information. It just stops moving: no transition, no keyframes. |

| Kind | Symbol | Class on the `<svg>` | Label |
|---|---|---|---|
| Slack | `#i-slack` | `ic ic-b` | the channel, `#latitude` |
| GitHub PR / commit | `#i-github` | `ic ic-b` | `<span class="tok">PR #53</span>` |
| Gmail | `#i-gmail` | `ic ic-b` | the sender or subject |
| Calendar | `#i-cal` | `ic ic-b` | the meeting |
| Drive / doc | `#i-drive` | `ic ic-b` | the doc title |
| Pact bead | `#i-bead` | `ic ic-s` | `<span class="tok">BEAD-0082</span>` |
| repo commit | `#i-commit` | `ic ic-s` | `<span class="tok">ea03d8f</span>` |
| a thread with no permalink | `#i-thread` | `ic ic-s` | where it was said |
| anything else with a URL | `#i-link` | `ic ic-s` | the host or title |

`ic-b` icons are the brand marks and carry their own colour; `ic-s` icons are
stroked `currentColor`. Getting the class wrong makes the icon invisible.

Several chips in a row go in `<p class="cites">…</p>`. A link to the section a
change affected is a `.goto`, never a `.cite`:

```html
<a class="goto" href="#timeline">Timeline<svg class="ic ic-s" aria-hidden="true"><use href="#i-arrow"/></svg></a>
```

**Never a unicode glyph where an icon belongs.** Not `→`, not `✓`, not `·` used as
a bullet. Every marker comes from one of the two sprites.

---

## 1. Today — `#panel-today`

**You do not write this section.** Invoke the sibling `daily-brief` skill:

- input: `scope: project`, plus the project's `brief` block from `config.md` (channels, repo,
  Gmail query, calendar filter, bead project).
- output: a markup **fragment** — no doctype, `<head>`, `<body>`, `<style>`, `<script>` or SVG
  sprite. Everything it needs is already on the page, because the build inlines
  `daily-brief/references/shell.css` and `shell.js`.
- placement: drop the fragment straight inside `#panel-today`, unmodified. Do not wrap it in
  `section.sec` — the brief brings its own `<section>` rhythm from `shell.css`.
- if the sibling skill is unavailable, render `#panel-today` as a single `.callout.quiet`
  saying the brief could not be generated, and carry on with the other six tabs.

**Today is the interactive brief, never a text stand-in.** The one acceptable
outputs for `#panel-today` are (a) the real `daily-brief` `scope: project`
fragment — the same painting, item rows, checkable to-dos, avatars and hover
detail the standalone brief has — or (b) the single `.callout.quiet` fallback
above when the skill genuinely cannot run. **Do not** hand-write a prose "here's
what's happening today" summary as a substitute: a paragraph of text in this panel
is the failure mode this rule exists to stop. If you find yourself composing
sentences for Today instead of invoking `daily-brief`, stop and invoke it. The
brief's own CSS and JS are already on the page, so the fragment is fully
interactive the moment it lands.

With the masthead gone, **the painting hero is the document's opening**. Do not
put anything above it.

`daily-brief` also renders a standalone all-projects brief on its own. That output is not
this document's concern and must never be embedded here.

Today is the tone the other six tabs are measured against. When a section here
looks denser than the brief does, the section is wrong.

## 2. What's New — `#whatsnew`

**A dated spine, not a stack of cards.** One rail runs down the whole changelog;
each refresh hangs off it as a node. There is exactly **one level of surface** —
no card, no card-inside-a-card. The newest run is unmistakable: a filled accent
node and a large serif date. Older runs recede by type size and ink level, never
by being hidden.

```html
<div class="wn">
  <article class="wn-run is-latest">
    <header class="wn-when">
      <time class="wn-d" datetime="2026-07-24">24 July</time>
      <span class="lbl">09:26 NPT</span>
      <span class="lbl">slack · github · pact</span>
    </header>
    <ul class="wn-bul">
      <li>
        <span class="wn-k dec"><svg class="ic ic-s" aria-hidden="true"><use href="#i-fork"/></svg>Decision</span>
        <p class="wn-x"><strong>Market homepage is in scope.</strong>
           Validated on the EDF call; the leaderboard ships as static buttons.</p>
        <p class="wn-m">
          <a class="cite" href="https://…">…</a>
          <a class="goto" href="#timeline">Timeline<svg class="ic ic-s" aria-hidden="true"><use href="#i-arrow"/></svg></a>
        </p>
      </li>
    </ul>
  </article>
  <article class="wn-run">…the previous run, same shape, no is-latest…</article>
</div>
```

Kinds and their icons — the word is always present, the icon never replaces it:

| Class | Word | Icon |
|---|---|---|
| `wn-k dec` | Decision | `#i-fork` |
| `wn-k risk` | Risk | `#i-alert` |
| `wn-k res` | Resolved | `#i-check` |
| `wn-k add` | Added | `#i-ship` |
| `wn-k upd` | Updated | `#i-flight` |
| `wn-k watch` | Watch | `#i-search` |

Rules: exactly one `.wn-run` per refresh, never an entry for a run that found
nothing, exactly one `is-latest` in the document. `.wn-x` is **two lines, hard
cap**; a bullet that wants a third line wants a `.disc.flat` under it, or wants to
be two bullets. Every bullet ends in `.wn-m` carrying at least one `.cite` and
exactly one `.goto`. A bullet with no `.goto` patched nothing, which means it did
not belong here.

## 3. TL;DR — `#tldr`

**Fifteen seconds, and the numbers do the work.** Three to five `.tile`s, then one
`.callout.key` with the single sentence a reader must not miss. That is the whole
visible surface. The paragraph that used to sit here is now the body of one
`.disc.flat` headed "The long version" — folded, not cut.

```html
<div class="tiles">
  <div class="tile is-done"><span class="tile-n">36</span>
    <span class="tile-k">US territories</span>
    <span class="tile-g">compared apples-to-apples</span></div>
  <div class="tile is-risk"><span class="tile-n">9</span>
    <span class="tile-k">weeks to launch</span></div>
</div>
<div class="callout key"><p>{{the sentence they must not miss}}</p></div>
<details class="disc flat">
  <summary><span class="disc-t">The long version</span>
    <span class="disc-g">What it is, who buys it, where it stands.</span>
    <svg class="disc-i" aria-hidden="true"><use href="#i-chev"/></svg></summary>
  <div class="disc-body"><p>{{every paragraph that used to be visible here}}</p></div>
</details>
```

A tile is a **real number with a unit**, never a word dressed as a metric. If you
cannot put a figure in `.tile-n`, it is not a tile — it is a sentence, and
sentences live in the disclosure. Exactly one `is-risk` tile at most: it is the
loud rung, and two loud tiles are none.

Synthesis, no citations.

## 4. The goal — `#goal`

The goal as originally framed, then how it moved, with dates, and who moved it.
The current framing in a `.callout.key`; each shift as one row in a `.decisions`
list — this section is the component's one home now that the decision log tab is
retired. The now-historical framing in `.callout.quiet`.

The `.decisions` row contract:

```html
<div class="decisions">
  <details class="disc">
    <summary>
      <span class="dec-date">Jun 23</span>
      <span class="dec-t">Scope narrowed to US
        <span class="pill pivot"><svg class="ic ic-s" aria-hidden="true"><use href="#i-pivot"/></svg>pivot</span></span>
      <span class="dec-v">The goal now names 36 US territories; EU comparison is out.</span>
      <svg class="disc-i" aria-hidden="true"><use href="#i-chev"/></svg>
    </summary>
    <div class="disc-body">
      <h4>Why</h4><p>{{who moved it, and on what evidence}}</p>
      <p class="cites"><a class="cite" href="https://…">…</a></p>
    </div>
  </details>
</div>
```

The summary is a three-column grid: date, title (**with its kind pill nested
inside `.dec-t`** — a pill left outside lands in the verdict column), verdict.
The verdict is a **statement about the present**, never a restatement of the
title. Kind pill is `.pill decision` (a choice), `.pill pivot` (a reversal) or
`.pill milestone` (a commitment). Never a table.

## 5. Primer — `#primer`

**Question-and-answer cards.** One question per card, a short answer in view, the
full explanation folded. Never a wall of explanatory prose.

```html
<div class="qa">
  <details class="disc">
    <summary>
      <span class="qa-q">Why is the ledger append-only?</span>
      <span class="qa-a">Because a corrected number must never erase the number it corrected.</span>
      <svg class="disc-i" aria-hidden="true"><use href="#i-chev"/></svg>
    </summary>
    <div class="disc-body"><p>{{the full explanation}}</p></div>
  </details>
</div>
```

Write the questions in the words a newcomer would actually use ("what is a demand
ratchet?"), not in the words the team uses to answer them. Eight to fourteen cards.
Synthesis, no citations.

## 6. Glossary — `#glossary`

**A term grid you can scan, filter or jump into by letter.** Ids `gsearch`,
`galpha`, `gempty` and the classes are wired in `doc-shell.js` — keep them
exactly. A definition is **one sentence**; anything longer is a Primer card.

```html
<div class="gtools">
  <div class="gsearch-wrap">
    <svg class="ic ic-s" aria-hidden="true"><use href="#i-search"/></svg>
    <input class="gsearch" id="gsearch" type="search" placeholder="Filter terms…"
           aria-label="Filter glossary terms">
  </div>
  <div class="galpha" id="galpha" role="group" aria-label="Jump to letter">
    <button type="button" data-letter="A" aria-pressed="false">A</button>
    … one per letter you actually want offered …
  </div>
</div>
<div class="gcat">
  <h3>The analytical framework</h3>
  <dl class="gterms">
    <div class="gterm"><dt>Demand ratchet</dt><dd>A billing floor set by a past peak.</dd></div>
    <div class="gterm"><dt><code>t1ExplicitGw</code></dt><dd>Tier-one load credibility, in explicit gigawatts.</dd></div>
  </dl>
</div>
<p class="gempty" id="gempty" hidden>No terms match that filter.</p>
```

Letters with no matching term are disabled automatically — emit A–Z and let
`doc-shell.js` grey out the empty ones, or emit only the letters you have. Search
and letter are ANDed. Terms are the words the team actually says; a term that is a
real identifier goes in `<code>` (that is the mono ration), a term that is a phrase
does not.

## 7. Architecture — `#architecture`

**A diagram, not a numbered list.** The pipeline is one unbroken left-to-right run
of nodes joined by real arrows, scrolling inside its own rail rather than wrapping
(a wrapped pipeline leaves an arrow pointing at nothing). Selecting a node opens
its depth in the inspector *below* the strip, so the diagram never reflows.

```html
<div class="pipe-wrap">
  <div class="pipe-rail">
    <ol class="pipe">
      <li>
        <button class="stage-btn" type="button" aria-expanded="false" aria-controls="stage-extract">
          <span class="stage-n">02</span>
          <span class="stage-t">Extract</span>
          <span class="stage-g">Claude reads the PDF into typed JSON</span>
        </button>
        <svg class="pipe-arrow" aria-hidden="true"><use href="#i-arrow"/></svg>
      </li>
      … the last <li> has no arrow …
    </ol>
  </div>
  <div class="pipe-detail">
    <div class="stage-d" id="stage-extract" hidden>
      <h4>02 · Extract</h4>
      <p>{{what runs, where, named as the repo names it. Identifiers in <code>.</code>}}</p>
    </div>
    … one per stage, in the same order …
  </div>
</div>
```

Rules: `aria-controls` must match the panel `id`; panels ship `hidden`, so without
JS every stage's depth reads open, in order, each under its own `<h4>`. Every
`<li>` except the last carries a trailing `.pipe-arrow` — the arrow is markup, not
a CSS glyph. `.stage-g` is one short clause. Component names as the repo names
them, identifiers in `<code>`. No images, no external assets. Anything that is
genuinely not a stage (deploy topology, environments) goes below the diagram as
`.disc` blocks.

## 8. Current state — `#state`

**The tiles are the anchor and the control; the rows recede.** A tile is a
`<button>` that filters the groups below it, so the counts are not decoration.

```html
<div class="tiles">
  <button class="tile is-risk" type="button" data-state="risk" aria-pressed="false">
    <span class="tile-n">1</span>
    <span class="tile-k"><svg class="ic ic-s" aria-hidden="true"><use href="#i-alert"/></svg>at risk</span>
  </button>
  <button class="tile is-blocked" type="button" data-state="blocked" aria-pressed="false">…</button>
  <button class="tile is-flight" type="button" data-state="flight" aria-pressed="false">…</button>
  <button class="tile is-done"   type="button" data-state="shipped" aria-pressed="false">…</button>
</div>

<div class="state-group" data-state="blocked">
  <h3><svg class="ic ic-s" aria-hidden="true"><use href="#i-block"/></svg>Blocked</h3>
  <div class="rows">
    <div class="row">
      <span class="row-t">Post-approval corrections <span class="pill notstarted">…</span></span>
      <span class="row-m"><a class="cite" href="https://…">…</a></span>
      <span class="row-g">Waiting on a decision. <span class="pill flag">new</span></span>
    </div>
    <details class="disc">…a row that needs depth…</details>
  </div>
</div>
```

Groups, in this order, only the ones that have items: **risk · blocked · flight ·
shipped**. What is stuck reads before what is finished. `data-state` on the tile
and on its group must match, and **the tile count must equal the number of `.row`
plus `.disc` children in its group** — a tile that disagrees with its group is a
lie the reader will catch instantly. Ship real counts: they are the no-JS view.
At runtime `doc-shell.js` re-reads each count off its group (the Ask-tally rule)
and disables any tile whose group has nothing, so a stale or zero count can
never survive with JS on.

The row is a two-column grid: `.row-t` (title, with its status pill **nested
inside it**) and `.row-m` (the citation chip, right-aligned) share the first line;
`.row-g` takes the second. A pill left outside `.row-t` lands in the meta column
and breaks the grid.

Status pills carry an icon and a word: `.pill done` `#i-check`, `.pill progress`
`#i-flight`, `.pill notstarted` `#i-block`, `.pill review` `#i-doc`. **Cited
section**: every row carries a `.cite`, linked or not.

## 9. Timeline — `#timeline`

**Denser in information, lighter in text.** Events cluster by month; the rail
carries the structure; an activity strip above shows the shape of the project
before a single word is read.

```html
<ul class="tl-spark" aria-label="Events per month">
  <li style="--h:22"><a href="#tl-may" aria-label="May: 2 events"></a></li>
  <li style="--h:100"><a href="#tl-jun" aria-label="June: 5 events"></a></li>
</ul>
<div class="tl-spark-ax" aria-hidden="true"><span class="lbl">May</span><span class="lbl">Jun</span></div>

<div class="filters" id="tl-filters" role="group" aria-label="Filter timeline">
  <button type="button" data-filter="all" aria-pressed="true">All</button>
  <button type="button" data-filter="decision" aria-pressed="false">Decisions</button>
  <button type="button" data-filter="pivot" aria-pressed="false">Pivots</button>
  <button type="button" data-filter="incident" aria-pressed="false">Incidents</button>
  … one button per `data-type` present, and no others …
</div>

<div class="timeline" id="timeline-list">
  <section class="tl-month" id="tl-jun">
    <h3>June 2026</h3>
    <ol>
      <li data-type="decision">
        <span class="t-date">Jun 23</span><span class="t-dot"></span>
        <div class="t-body">
          <div class="t-head">
            <span class="pill decision"><svg class="ic ic-s" aria-hidden="true"><use href="#i-fork"/></svg>decision</span>
            <span class="t-title">Airtable ruled out; AWS chosen</span></div>
          <p class="t-desc">Validation lives in the product instead.</p>
          <div class="t-src"><a class="cite" href="https://…">…</a></div>
        </div>
      </li>
    </ol>
  </section>
</div>
```

`--h` is an **integer 1–100**, the month's event count scaled so the busiest month
is 100. Each bar links to its month cluster and carries an `aria-label` naming the
month and the count — that is the strip's text equivalent. Ship real values: they
are the no-JS view. At runtime `doc-shell.js` recomputes every `--h` and every
count from the month clusters the bars link to, so the strip cannot drift from
the rail.

**Emit one filter chip per `data-type` present on the rail — every kind gets its
own, `pivot` included, never folded under `decision`.** A chip with no matching
item is a dead button: drop it. The chips are **multi-select** (`doc-shell.js`):
each is an independent toggle, several can be active at once, and an empty
selection means All. Set the initial `aria-pressed` to `true` only on the `All`
chip. Filtering hides items *and* empties out month clusters automatically.
`.t-desc` is **one line**; anything longer folds into a `.disc.flat` inside
`.t-body`. Newest last, so the eye reads the project forward. **Cited section.**

**A decision is an event here — the timeline is the decision log.** There is no
separate Decisions tab. A `data-type="decision"` (or `pivot`) event carries the
full record in place:

- `.t-title` is the fork ("Airtable ruled out; AWS chosen"); `.t-desc` is the
  **verdict** — a statement about the present, what is true now because of this
  decision, never a restatement of the title.
- Rationale, alternatives and consequences fold into the event's `.disc.flat`
  inside `.t-body`, under `<h4>Why</h4>`, `<h4>Rejected</h4>` and
  `<h4>Consequences</h4>` — the disclosure rule applies: depth is folded, never
  cut. A decision with no recorded depth has no disclosure.
- The citation chips stay in `.t-src`, as on every other event.
- The `decision` filter button *is* the decision log view: one press and the rail
  shows only the forks, in order. That is why the filter may never be dropped
  while a decision event exists.

Structural rules the filter depends on, all three load-bearing:

- `data-type` goes on the event `<li>` and **nowhere else inside `#timeline-list`**.
  `doc-shell.js` reads `.tl-month > ol > li[data-type]`; an attribute on a nested
  span would make a month look non-empty when all its events are filtered out.
- `.tl-month` sections are **direct children** of `#timeline-list`.
- Filtering works by setting `hidden`. `doc-components.css` states
  `[hidden] { display: none !important }` once, as an invariant, because the
  timeline's own `display: grid` used to outrank `[hidden]`'s `display: none` and
  filtered-out events kept rendering. Never re-specialise a `[hidden]` rule per
  component, and never hide by class.

## The dot vocabulary and its legend

The dot is defined **once**, on `.t-dot`, and the legend swatches are literal
`.t-dot` elements carrying the same `data-type`. They render from the same rules
as the rail, so they cannot drift:

```html
<div class="legend">
  <span data-type="decision"><span class="t-dot"></span>
    <svg class="ic ic-s" aria-hidden="true"><use href="#i-fork"/></svg>
    <span class="lg-w">decision</span> — a choice was made</span>
  <span data-type="pivot"><span class="t-dot"></span>
    <svg class="ic ic-s" aria-hidden="true"><use href="#i-pivot"/></svg>
    <span class="lg-w">pivot</span> — a choice was reversed</span>
  <span data-type="incident"><span class="t-dot"></span>
    <svg class="ic ic-s" aria-hidden="true"><use href="#i-alert"/></svg>
    <span class="lg-w">incident</span> — it needs a response</span>
  … one per `data-type` actually present, in ladder order …
</div>
```

Emit a legend entry for **every `data-type` used and no others**. Writing a
swatch by hand — a bare `<span class="g-key">`, a coloured box, an icon standing
in for a dot — is the defect this shape exists to prevent.

**`decision` and `pivot` must be told apart** — they are different events (a
choice made vs a choice reversed). They share the accent hue (both are choices),
so the distinction is carried by **two other channels, never colour alone**: the
**icon** (`#i-fork` for decision, `#i-pivot` for pivot) and the **dot** (decision
is a filled accent disc with a halo; pivot is a dashed accent ring). Use
`#i-pivot` everywhere a pivot appears — its pill, its legend entry, its timeline
event — and `#i-fork` only for decisions.

| `data-type` | Dot | Icon | Word |
|---|---|---|---|
| `decision` | filled `--accent`, accent halo | `#i-fork` | decision |
| `pivot` | dashed accent ring | `#i-pivot` | pivot |
| `incident` | filled `--alert`, alert halo | `#i-alert` | incident |
| `milestone` | filled `--ink` | milestone |
| `build` | filled `--ink-4` | built |
| `meeting` | dotted hollow ring | meeting |

`incident` is the one place the timeline uses `--alert`, and it still carries
`#i-alert` and the word — never the colour alone.

## 10. Your lane — `#lane`

Two halves: **a Gantt chart of your work across time**, then the same items in
full as `.item` rows. The chart is the visual; the list is its text equivalent and
its detail. Every bar links to its own item, so the two never disagree.

### The chart

```html
<div class="gantt-wrap">
  <div class="gantt" style="--cols:12" data-start="2026-05-04" data-unit="week">
    <div class="g-head">
      <span></span>
      <div class="g-axis">
        <div class="g-ticks g-months">
          <span class="g-tick" style="--c1:1;--span:4">May</span>
          <span class="g-tick" style="--c1:5;--span:4">Jun</span>
        </div>
        <div class="g-ticks g-days">
          <span class="g-tick" style="--c1:1">4</span>
          <span class="g-tick" style="--c1:2">11</span>
          … one per column, in order, no gaps …
        </div>
        <span class="vh">Columns are weeks, 4 May to 20 July 2026.</span>
      </div>
    </div>
    <ol class="g-rows">
      <span class="g-today" style="--c1:11"></span>
      <li class="g-row" data-status="blocked">
        <span class="g-lab">Territory ingest
          <span class="g-dep"><svg class="ic ic-s" aria-hidden="true"><use href="#i-link"/></svg>waits on answer key</span>
        </span>
        <span class="g-track">
          <a class="g-bar" href="#lane-2" style="--c1:9;--span:4">
            <svg class="ic ic-s" aria-hidden="true"><use href="#i-block"/></svg><span>Blocked</span>
            <span class="vh">Territory ingest, blocked, week 9 to week 12, waiting on the answer-key audit.</span>
          </a>
        </span>
      </li>
    </ol>
  </div>
</div>
<div class="g-legend">
  <span><span class="g-key" aria-hidden="true"></span><svg class="ic ic-s" aria-hidden="true"><use href="#i-ship"/></svg>shipped</span>
  <span><span class="g-key k-flight" aria-hidden="true"></span><svg class="ic ic-s" aria-hidden="true"><use href="#i-flight"/></svg>in flight</span>
  <span><span class="g-key k-blocked" aria-hidden="true"></span><svg class="ic ic-s" aria-hidden="true"><use href="#i-block"/></svg>blocked</span>
  <span><span class="g-key k-risk" aria-hidden="true"></span><svg class="ic ic-s" aria-hidden="true"><use href="#i-alert"/></svg>at risk</span>
</div>
```

**Data contract.** To draw a bar, a run must be able to supply, per lane item:

| Field | Required | Becomes |
|---|---|---|
| `title` | yes | `.g-lab` and the start of the `.vh` sentence |
| `laneId` | yes | the `id` on the `.item` below; the bar's `href` is `#{{laneId}}` |
| `status` | yes | `data-status`, one of `shipped` `flight` `blocked` `risk` |
| `start`, `end` | yes | `--c1` and `--span`, in whole columns |
| `dependsOn` | no | a `.g-dep` line under the label, naming the predecessor |

Geometry rules, and they are not negotiable because a wrong integer silently
lies:

- Choose a window and a column unit first — **twelve to sixteen columns**, one
  week or one month each — and put it in `--cols` on `.gantt`, plus
  `data-start` (the ISO date column 1 begins on) and `data-unit`
  (`week` or `month`). Those two attributes are what let the runtime keep the
  today line honest between refreshes.
- `--c1` is the 1-based column the bar starts in; `--span` is its width in
  columns. Both are **integers**, clamped into `1…--cols`. An item that starts
  before the window starts at column 1; an item with no end date spans to the
  last column.
- **`.g-today` is emitted exactly once, as the first child of `.g-rows`** — not
  once per row. One per row drew a dashed stack of disconnected ticks instead of
  a line. It carries only `--c1` and spans the whole plot area, computing its own
  offset from the chart's `--lab`, `--gap` and `--cols`, so it lands on its
  gridline at every width. If today falls outside the window, omit it entirely.
  The `--c1` you write is the **no-JS fallback for the day of the build**:
  `doc-shell.js` recomputes the line's column from `data-start` / `data-unit`
  on every open (and removes it when today leaves the window), so a document
  that sat unrefreshed for a month still draws today where today is.
- **The axis is two bands and it shows real dates, not months alone.**
  `.g-ticks.g-months` carries the month names with `--c1` / `--span`;
  `.g-ticks.g-days` carries **one label per column, in column order, no gaps** —
  the day-of-month the column starts on (`4`, `11`, `18`…). Reading the two
  together gives `11 May`. Add `is-dense` to `.g-days` when `--cols` is over 14
  and every other date drops out rather than overlapping. A `.vh` line inside
  `.g-axis` states the window in words, because the day band alone is ambiguous
  to a screen reader.
- Inline `style` on these elements carries **geometry only** — never colour, never
  anything but `--c1`, `--span`, `--cols`, `--h`.

Encoding rules, from the dataviz guidance and the token contract together:

- Status is **never** colour alone. Each bar carries the loudness rung *and* an
  icon *and* the word. The legend repeats all three.
- Bars are 22 px, 4 px radius, and never taller. Gridlines are hairline, solid and
  recessive.
- Every bar has a `.vh` sentence naming the item, its status, its span and its
  dependency. That is the accessible equivalent, and the lane list below is the
  table view.
- A bar under three columns wide gets `class="g-bar is-tight"`: only its icon
  shows, because a clipped label is worse than no label.
- **No dependency arrows.** An overlay of arrows across a CSS grid breaks the
  moment a row wraps; the dependency is named in `.g-dep` and repeated in the
  `.vh` sentence instead.
- The chart scrolls inside `.gantt-wrap` at narrow widths, with the label column
  pinned. **The page body must never scroll horizontally.**

If a run cannot supply `start` and `end` for at least three items, **do not draw a
chart**. Ship the lane list alone and say so in `.sec-lead`. A Gantt drawn from
guessed dates is the worst thing this document could do.

### The list

**Reuse the Today tab's `.item` row** so "what I should do" looks and behaves
identically in both tabs. The wrapper is `.list.lane-list`, **never `id="todos"`**:
these are not checkable, and that id would hand them to the brief's checkbox logic.

```html
<ol class="list lane-list">
  <li class="item" id="lane-1">
    <span class="item-n">1</span>
    <div class="body">
      <div class="t"><a href="https://…">Analyst review screen</a>
        <span class="tag fill">due Aug 7</span></div>
      <div class="d">Slice 4 is in draft and needs a decision on post-approval corrections.</div>
      <p class="cites"><a class="cite" href="https://…">…</a></p>
      <details class="disc">
        <summary><span class="disc-t">What's involved</span>
          <svg class="disc-i" aria-hidden="true"><use href="#i-chev"/></svg></summary>
        <div class="disc-body"><p>{{the full context — bead ids, blockers, who to ask}}</p></div>
      </details>
    </div>
  </li>
</ol>
```

The `id` on each `.item` is the bar's target. `.d` is one line; everything else folds.

## 11. Ask — `#ask`

**An open ledger of what is still owed.** Not a numbered card grid — that read as
a form, and a question is not a form field. The section's idea is the *debt*: it
opens on a running tally of unanswered questions, then lists them hanging off a
rail, each with a hollow accent mark that is visibly *not yet closed*. Answered
ones are neither deleted nor left shouting: they settle into a folded tray, mark
closed to a check, ink dropped one step.

```html
<div class="ask">
  <div class="ask-tally">
    <span class="ask-n" id="ask-count">0</span>
    <span class="ask-n-k">open questions</span>
    <span class="ask-strokes" id="ask-strokes" aria-hidden="true"></span>
  </div>

  <ol class="ask-open" id="ask-open">
    <li class="ask-q">
      <span class="ask-mark"><svg class="ic ic-s" aria-hidden="true"><use href="#i-ask"/></svg></span>
      <p class="ask-t">What is the API contract for the review screen?</p>
      <div class="ask-body">
        <p class="ask-who"><span class="lbl">ask</span>Iván<span class="lbl">blocks</span>slice 4</p>
        <p class="ctx">Blocks slice 4 until the shape of the decision payload is fixed.</p>
      </div>
    </li>
  </ol>

  <details class="disc flat ask-tray">
    <summary>
      <span class="disc-t">Settled</span>
      <span class="disc-g"><span class="ask-tray-n" id="ask-done-n">0</span> answered, kept on the record</span>
      <svg class="disc-i" aria-hidden="true"><use href="#i-chev"/></svg>
    </summary>
    <div class="disc-body">
      <ol class="ask-done" id="ask-done">
        <li class="ask-q is-answered">
          <span class="ask-mark"><svg class="ic ic-s" aria-hidden="true"><use href="#i-check"/></svg></span>
          <p class="ask-t">Is the Clerk secret fixed, and who owns it?</p>
          <div class="ask-body">
            <p class="ask-ans"><strong>Answered Jul 18.</strong> Confirmed working on staging; Iván owns rotation.</p>
            <p class="cites"><a class="cite" data-cite="slack-latitude-1752..." href="https://…">…</a></p>
          </div>
        </li>
      </ol>
    </div>
  </details>
</div>
```

Rules:

- **Ids are fixed**: `ask-open`, `ask-done`, `ask-count`, `ask-done-n`,
  `ask-strokes`. `doc-shell.js` reads the counts **off the lists** and writes
  them into the tally, then draws one hand-tally stroke per open question — four
  uprights and a cross for every five. Ship `0` in both number slots: a typed
  count that disagrees with the rows is the exact failure the section is built to
  make impossible. Without JS the tally reads `0` and the list beneath it is
  still complete and correct.
- The mark is `#i-ask` while open and `#i-check` once answered. It is the whole
  status channel plus the word in `.ask-ans` — never colour alone.
- `.ask-t` is the question, **written as a question**, in the words the person
  asking would actually use, ending in a question mark. One line where possible.
- `.ask-who` names who holds the answer and what the question is holding up.
  Those two facts are what turn a question into work; omit the line only if
  neither is known.
- One line of context is `.ctx`. A paragraph is a `<details class="disc flat">`
  inside `.ask-body`. Answered questions put the one-line answer in `.ask-ans`
  and the full answer in a `.disc.flat` under it — **folded, never cut**.
- Order open questions by what they block, hardest first. Order the tray newest
  answered first.
- **`#ask` carries no `.src-note`.** The compiled-from line belongs at the end of
  `#whatsnew` and appears exactly once in the document.

Motion, all in `doc-components.css`: the strokes draw in with a 55 ms stagger,
and opening an answer makes its mark nod once. Nothing hovers that is not
interactive — the question rows are static text, so the only hover states in the
section are on the tray's `<summary>`, the per-question disclosures and the
citation chips.

---

## Shared pieces

- `.pill flag` reading **new** is the only "new" badge. It is set on items the latest
  changelog entry touched and cleared from everything else on the next refresh.
- `.pill inferred` marks a claim you concluded rather than read. It is the alternative to
  omitting the item, never to citing one.
- `.callout` — plain, `.key` (must be read, filled accent), `.crit` (something is
  wrong, ruled), `.quiet` (aside, dashed). **At most one `.callout.key` per
  section**; two shouting lines are none.
- `.src-note` — the "what this was compiled from" line. **Exactly one in the
  document, as the last element of `#whatsnew`.** It never appears under `#ask`,
  under `#lane`, or anywhere in the You tab: a reader who has reached their own
  queue does not need the provenance of the whole build restated at them.
- `.legend` for explaining what the timeline dots mean, once, under the timeline.
  Its swatches are real `.t-dot` elements with real `data-type` values — see
  "The dot vocabulary and its legend" in §9. Never a hand-drawn swatch.
- `.lbl` for any small tracked label. `.tok` for any machine token.
- `.vh` for text that exists only for assistive technology.
- Cards are used sparingly and **never nested**. `.disc.flat`, `.rows > .disc` and
  `.decisions > .disc` exist precisely so a disclosure inside a grouped surface
  drops its own card.

## Affordances

**A hover state is a promise that something will happen if you click.** Only
`a[href]`, `<button>`, `<summary>`, `<input>` and `[tabindex]` may lift, tint,
outline or take a pointer cursor. Static rows — a timeline event, a Gantt row, a
lane item, a question, a `.tile` that is not a filter — get none of it, and
`doc-components.css` no longer provides it for them. The `.tile`s in `#state`
**are** buttons and keep every state they have.

Keyboard focus is the opposite rule: `:focus-visible` stays on everything
genuinely focusable, the ring is `shell.css`'s accent outline, and no markup in
this document may suppress it. If you make something reveal content on hover, it
must also reveal it on focus, and it must be focusable to begin with.

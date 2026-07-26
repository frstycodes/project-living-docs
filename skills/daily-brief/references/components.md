# Component catalog

Every component here is scope-agnostic: `scope: all` and `scope: project` emit
identical markup. Scope changes only which items survive the filter and whether
the document wrapper is emitted — never the components.

Fill the `{{placeholders}}`. Drop any optional part that has no data — never emit
an empty tag. If a section would be empty, it does not exist: no zero-states, no
"Nothing here!" cards, no placeholder rows. A quiet day gets a short page.

Invented one-off sections are allowed when the day calls for one, built from the
existing primitives (`.grid`, `.item`, `.up`, `.tag`, `.sico`, `.avas`).

## Page skeleton

`scope: all` only. Order inside `<body>`: grain svg → sprite → hero →
`<main class="wrap">` (feature + sections) → footer → star tooltip → `<script>`.

```html
<svg class="grain"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>
```

Then `references/sprite.svg` verbatim.

`scope: project` emits the hero-through-tooltip run only, with no grain, no
sprite, no `<main>` of its own — the host document owns those.

## Hero (always this shape)

Rails live **inside** the hero (`.hero-edge`), so they scroll away with the
painting. Title sits **on** the painting.

```html
<div class="hero wrap">
  <div class="hero-edge hero-date">{{24 Jul 2026}}</div>
  <div class="hero-edge hero-time" id="clock">—</div>
  <div class="herofig rise">
    <div class="frame">
      <img src="__ART__" alt="{{painting title — what it shows}}">
    </div>
    <div class="title">
      <span class="the">The</span>
      <span class="big">{{Weekday}} Brief</span>
    </div>
  </div>
  <div class="underhero rise">
    <p class="blurb">{{one or two sentences, a situation with a pun}}</p>
    <p class="credit">{{Title, Artist, Date. medium in lowercase}}</p>
  </div>
</div>
```

## Section shell (every section)

Left rail is sticky: eyebrow + title + optional lead + optional star badge.
Content on the right.

```html
<section class="rise">
  <div class="grid">
    <div class="side">
      <div class="eyebrow">{{MONO EYEBROW}}</div>
      <h2 class="h">{{Verb-led title, two or three words}}</h2>
      <p class="lead">{{optional, one sentence}}</p>
    </div>
    <div>{{content}}</div>
  </div>
</section>
```

## Feature — "Push your work forward"

The day's single highest-leverage move. One boxed card, directly under the hero,
before everything else. Carries one of the page's two star badges.

The left column carries the section name in **serif** ("Push your work forward")
— no mono eyebrow here — and the right column carries the topic as a sans title
above the paragraph. Avatars go at the **end of the paragraph**, never in the
left column where the badge would cover them.

The badge is absolutely positioned and hangs off the card's bottom-left edge — it
must never expand the card or reserve space inside it.

```html
<div class="feature rise">
  <div class="grid">
    <div class="side">
      <h2 class="h">Push your work forward</h2>
      <div class="badgewrap">
        <button class="star" data-tip-head="Start a chat about this" data-prompt="{{full prompt}}" aria-label="{{what it copies}}">
          <span class="star-txt">Let's<br>do it <span class="star-arrow">→</span></span>
        </button>
      </div>
    </div>
    <div>
      <h3 class="fp-topic">{{the move, verb-led — the actual headline}}</h3>
      <p class="fp">{{2–4 sentences naming people, docs, PRs. Wrap key nouns in <b> or link them.}}{{avatar chips at the end}}</p>
    </div>
  </div>
</div>
```

## To-do item (checkable)

Wrap the list in `<div class="list" id="todos">` and put the all-done card as the
**last child inside that same div**.

The whole row is a hover surface and clicking anywhere on it toggles the item —
links, buttons and the checkbox itself excepted. That is in `shell.js`; emit only
the markup.

```html
<div class="item">
  <label class="chk"><input type="checkbox"><span class="box"><svg viewBox="0 0 14 14"><polyline points="2,7.5 6,11 12,3.5"/></svg></span></label>
  <div class="body">
    <div class="t"><a href="{{permalink}}" target="_blank" rel="noopener">{{title}}</a> <span class="tag fill">{{tag}}</span>{{source icon}}{{avatars}}</div>
    <div class="d">{{two or three sentences}}</div>
  </div>
</div>
```

## Numbered update (read-only news)

```html
<div class="ups">
  <div class="up">
    <span class="up-num">01</span>
    <div class="up-body">
      <div class="up-t"><a href="{{permalink}}" target="_blank" rel="noopener">{{title}}</a><span class="tag fill">{{Label}}</span></div>
      <div class="up-d">{{two sentences}}{{source icon}}{{avatars}}</div>
    </div>
  </div>
</div>
```

Keep the placement difference: on a **to-do** the source icon and avatars sit
after the title; on an **update** they sit at the end of the paragraph.

## Schedule card (interactive)

Two flat columns, both top-aligned — no card background, no divider on desktop.
Times sit left as hover/active pills; detail at the same top edge on the right,
star badge hanging off its bottom-right. Clicking a time highlights it. Carries
the page's second star badge. Times in the list are compact (`9:15p`); the detail
line spells out the range.

```html
<div class="sched">
  <div class="sched-list" id="schedList">
    <button class="sched-item is-active" type="button" data-index="0">
      <span class="sched-time">{{9:15p}}</span>
      <span class="sched-ev">{{Event name}}</span>
    </button>
  </div>
  <div class="sched-detail">
    <div>
      <div class="dt">{{Event — 9:15 PM – 9:45 PM}}</div>
      <div class="dd">{{who's on it, what to bring}} <a href="{{meet link}}" target="_blank" rel="noopener">{{meet.google.com/...}}</a></div>
      <div class="count" id="countdown">—</div>
    </div>
    <div class="badgewrap sched-badge">
      <button class="star star--prep" data-tip-head="Start a chat to prep for this meeting" data-prompt="{{full prompt}}" aria-label="{{what it copies}}">
        <span class="star-txt">Prep me <span class="star-arrow">→</span></span>
      </button>
    </div>
  </div>
</div>
```

## Reading item

```html
<div class="reads">
  <a class="read" href="{{url}}" target="_blank" rel="noopener">
    <div class="k">{{MONO KICKER}}</div>
    <div class="rt">{{Doc title}} <svg class="sico-static" style="width:15px;height:15px;vertical-align:-3px"><use href="#i-drive"/></svg></div>
    <div class="rd">{{why it matters to you specifically}}</div>
  </a>
</div>
```

## All-done card (last child of `#todos`)

When every box is checked, `shell.js` adds `.is-all-done` to `#todos`: the rows
blur out and this card fades up centred over them as an absolute overlay, with a
staged reveal (close → badge pop → title → desc), a confetti burst, and a chime.
Checking plays a rising blip, unchecking a falling one. The checked circle greys
to `--ink-4` rather than filling accent — a finished row recedes, not shouts.
Never a plain inline line of text.

```html
<div class="alldone" id="alldone">
  <div class="alldone-card">
    <button class="alldone-close" id="alldoneClose" type="button" aria-label="Back to to-dos">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    </button>
    <div class="alldone-badge">
      <svg viewBox="0 0 20 20"><path d="M5 10.5L8.25 13.75L15 6.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <p class="alldone-t">You cleared the list.</p>
    <p class="alldone-d">Nice work. The rest of the day is yours.</p>
  </div>
</div>
```

## Source icon — always a real link

Never a bare decorative `<svg>`. The icon links to the item's source and carries
a `.source-tip` naming the destination. Symbol id matches the source: `#i-slack`,
`#i-gmail`, `#i-cal`, `#i-github`, `#i-drive`.

```html
<a class="sico" href="{{permalink}}" target="_blank" rel="noopener" aria-label="Open in {{Slack}}"><svg><use href="#i-slack"/></svg><span class="source-tip">Open in {{Slack}}</span></a>
```

Tag each **item**, not the section — one list often mixes a Slack ask and a
GitHub PR. Never put a brand icon on a section eyebrow.

## Avatar chips

```html
<span class="avas">
  <span class="av"><img class="ava" loading="lazy" data-initial="R" src="{{https://ca.slack-edge.com/TEAM-UID-hash-72}}" alt="Raúl"><span class="avname">Raúl</span></span>
</span>
```

- Use the `-72` sized Slack variant (`ca.slack-edge.com/{team}-{uid}-{hash}-72`),
  never the multi-megabyte `_original`. Link the CDN URL directly — do **not**
  base64-embed avatars.
- `data-initial` is required: `shell.js` swaps a failed image for a monogram chip,
  so a dead URL never shows a broken image.
- Someone with no Slack account gets
  `<span class="av"><span class="ava mono">S</span><span class="avname">Scott</span></span>`.
- Hover lift and name spring are already in `shell.css` — do not re-implement.

## Footer

Prose, not a nav bar: real "and", italic *your*, every source a live link. List
only the sources you actually drew on today.

```html
<footer class="wrap rise">
  <div class="foot-fade" aria-hidden="true"></div>
  <div class="foot-halftone" aria-hidden="true"></div>
  <div class="foot-inner">
    <p class="foot-credit">Made for you using <em>your</em>
      <a class="fsrc" href="https://app.slack.com/client" target="_blank" rel="noopener"><svg><use href="#i-slack"/></svg>Slack</a>,
      <a class="fsrc" href="https://mail.google.com/mail/u/0/#inbox" target="_blank" rel="noopener"><svg><use href="#i-gmail"/></svg>Gmail</a>,
      <a class="fsrc" href="https://calendar.google.com/" target="_blank" rel="noopener"><svg><use href="#i-cal"/></svg>Calendar</a>,
      <a class="fsrc" href="https://github.com/notifications" target="_blank" rel="noopener"><svg><use href="#i-github"/></svg>GitHub</a>, and
      <a class="fsrc" href="https://drive.google.com/" target="_blank" rel="noopener"><svg><use href="#i-drive"/></svg>Drive</a>.
    </p>
  </div>
</footer>
```

## Shared star tooltip (once, before `</body>`)

One popover serves every star badge; `shell.js` positions it.

```html
<div id="startip" class="startip" role="tooltip" aria-hidden="true">
  <div class="startip-head"><svg><use href="#i-spark"/></svg><span id="startipHead"></span></div>
  <div class="startip-body" id="startipBody"></div>
</div>
```

## Star badges

- **Two per page, maximum.** One per section. In practice: the feature card and
  the schedule card.
- Clicking copies `data-prompt` to the clipboard; hovering shows it in the shared
  popover so the reader knows what they're getting.
- Badges sit at a hand-pinned angle (`--rot`) and swing further on hover with a
  prismatic sheen. Label is serif italic, counter-rotated. `.star` for the feature
  badge, `.star--prep` for the schedule one.
- The prompt is written **to the reader's agent**, in full, with enough context to
  act without this page. Not a summary of the item — an instruction.

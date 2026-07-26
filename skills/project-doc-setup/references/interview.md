# The setup interview

Two parts, in order: **sources**, then **the goal**. Ask conversationally, one
concern at a time — this is the one place in the whole skill that is allowed to
be slow, because every wrong answer here is baked into every refresh after it.

Do not dump all questions at once.

## "Decide for me" — offer it on every derivable question

Setup already has a lot of evidence in hand: the repo, its context files, the
connected tools, the org domain, pinned messages, the top Pact goal. Whenever a
good answer can be **derived from that evidence**, offer the user a **"decide for
me"** option alongside answering themselves. Choosing it means: *you* pick a
sensible default now from what you can see, and refine it on later runs as the
real data arrives. Many users do not know the exact Gmail query or the precise
goal on day one — "decide for me" lets setup finish without a wrong guess being
forced out of them.

**Withhold "decide for me" only when the answer is the user's to give** — their
opinion, their identity, their consent, something the evidence cannot reveal:

| Offer "decide for me" | Never — needs the user |
|---|---|
| Gmail query / labels (derive from domain + project) | **Which sources to include** — consent to watch a private channel is theirs |
| Slack channel *scope* once a source is in | **The `you` block** — their name, role, assignee id |
| Drive folders, calendar match, Pact project key | **Whether to notify at all** — off by default; a ping goes to their **own DM only**, never a project channel |
| The **goal** (draft from sources) | Anything they state as an explicit preference |
| The Gantt window unit/columns | |
| Cadence (default daily, off-minute) | |

The test: *could I answer this correctly from what I can already see?* If yes,
offer to. If it needs their judgement or their permission, ask — no "decide for
me".

When the user picks "decide for me", say what you defaulted to and that it will
sharpen over time — never silently choose.

Do not invent sources the user did not consent to, or a goal you did not either
derive-and-show or have confirmed.

---

## Part 1 — sources

The document watches a set of sources. Seven are built-in — Slack, GitHub,
Gmail, Calendar, Drive, Pact, the repo. Anything else the user has connected can
join as a **custom** source (see
[`source-contract.md`](../project-doc/references/source-contract.md)).

**Discovery is a hint, never the driver.** Enumerate what tools are actually
connected in this environment and use that to *pre-check the obvious ones* — but
a connected tool is not proof the user wants it in *this* project's document. Every
inclusion is the user's explicit choice.

Work through it like this:

1. **Offer the built-ins as a checklist**, pre-checking the ones whose tools are
   present. "GitHub and Slack are connected — track both? (default yes). Gmail,
   Calendar, Drive, Pact are available too — which belong in this project's doc?"
2. **For each source the user includes, collect its scope** — the exact block the
   built-in needs in `config.md`: which Slack channels, which repo and branches,
   the calendar match, the Drive folders, the Pact project. A source with no scope
   watches nothing or watches everything; both are wrong. Scope is a *derivable*
   detail, so each of these offers "decide for me" (default from the repo, the org
   domain, the project name) — only the *inclusion* of the source was the user's
   call.

   **Gmail is the one to get right, because a raw query is a bad thing to ask a
   human for.** Do not ask the user to author a Gmail search string. Instead:
   - **Present a default query** you built from what you know — the org domain
     (`from:latitudemedia.com`), the project name in the subject
     (`subject:latitude`), any obvious label. Show it in plain terms: "I'll watch
     mail from latitudemedia.com and anything mentioning Latitude."
   - **Let the user add to it** — more senders, a shared label, a distribution
     list — folded into the same query.
   - **Or "decide for me"** — take the default now and, crucially, **refine it
     during extraction**: on the first read the run sees which senders and threads
     actually belong to the project, and it may **add query terms or create a
     Gmail label** to scope future reads more precisely, writing the improved query
     back into `#doc-config`. The query is not frozen at setup — it is a starting
     point that sharpens once it has seen real mail.
3. **Offer "add another."** If the user names a tool that is not a built-in
   (Linear, Notion, Jira, an RSS feed), register it as a `custom` source:
   - reuse an existing `citationKind` if its items read like one (a Linear issue
     reads like a `bead`: id, title, status, assignee) — that gets it a real
     card for free;
   - otherwise `citationKind: "link"` — the generic chip, linked when its host is
     allowlisted;
   - collect `tool`, `cursorField`, `allowlistHosts`, `query` per the contract.
   Never invent a new kind string — an unknown kind loses the chip's specificity
   silently.
4. **Confirm the `you` block** — whose "Your lane" and "Ask" tabs these are:
   name, role, the Pact assignee to filter on, the Gantt window (week/month, how
   many columns).
5. **Confirm the `brief` block** — the narrower filter passed to `daily-brief`
   for the Today tab. It defaults to the same ids as the sources but may be
   scoped tighter.

Anything the user cannot answer, leave out rather than guess. A missing source is
added later with one `refresh`; a wrong source pollutes every run.

---

## Part 2 — the goal

The `#goal` section is why the document exists: it says what "done" looks like.
Do not ask for it cold — you have just read the sources, so **draft it from
them**, then sharpen.

1. **Draft from evidence.** Read what you already gathered — the repo README and
   context files, pinned Slack, a kickoff doc in Drive, the top Pact goal — and
   write a one-paragraph draft goal with a measurable, human-evaluable success
   criterion. Cite what you drew it from.
2. **Offer the draft, or grill it to a point.** Show the draft and offer both: the
   user can sharpen it, or pick **"decide for me"** — accept the drafted goal as
   the day-one framing, knowing every refresh re-evaluates and updates it against
   real activity (the goal is the most self-correcting field in the document, so a
   rough day-one goal is cheap). Many users genuinely do not know the exact goal
   yet; forcing one out of them writes a worse goal than the evidence already
   suggests.

   If they want to sharpen, put two or three questions, one at a time:
   - "Done looks like *X* — is that the real finish line, or a milestone on the
     way to it?"
   - "Who judges whether it's met — and by when?"
   - "What would make this *not* met that the draft doesn't capture?"
   Rewrite the goal after each answer. Stop when the user stops changing it.
3. **If Pact is a configured source, offer `pact-goals`.** It produces a
   structured goal + milestones in the Pact vocabulary. Use it only then — never
   drag Pact's machinery into a project that does not use beads.
4. **Write it into `#goal`** as the config's goal seed: the current framing in a
   `.callout.key`, the success criterion explicit. No historical framing yet —
   there is no history on day one.

The goal is not frozen. On every refresh, `project-doc` re-evaluates it against
new activity and updates it in place, append-only and confidence-gated (see the
goal step in
[`update-protocol.md`](../project-doc/references/update-protocol.md)). Setup only
has to get day one right.

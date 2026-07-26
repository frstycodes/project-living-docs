# First-live-run verification

Everything below the unit tests can only be checked live — publish, cloud routine,
connectors, the sandboxed Artifact. Work top to bottom; stop at the first hard
failure and fix before continuing. **Do the first run in Claude Code web**, not
local — that is the environment the routine will use.

## 0. Preflight (local, before web)

- [ ] `node references/doc-render.test.mjs` → `12 passed`
- [ ] `node references/doc-data-check.test.mjs` → `12 passed`
- [ ] `node references/doc-migrate.test.mjs` → `13 passed`
- [ ] `node --check` passes on `doc-render.mjs`, `doc-migrate.mjs`, `doc-data-check.mjs`, `check.mjs`
- [ ] daily-brief `shell.js`, `sprite.svg` resolve from where the skill expects them

## 1. Setup (`project-doc-setup`, in Code web)

- [ ] Repo root found by `.git`; `git check-ignore .ignored` passes (or `.ignored/` was added to `.gitignore`)
- [ ] Source menu pre-checks connected tools; **inclusion is your explicit choice**, not auto
- [ ] Gmail: offered a plain-language default + "decide for me" — **never asked to type a raw query**
- [ ] Goal: drafted from real sources (README/pinned/kickoff), then grill-or-"decide for me"
- [ ] "Decide for me" offered on derivable questions, withheld on `you`/notify/consent
- [ ] Sharing caveat stated out loud: *sharing the doc shares its scope*

## 2. Init build + first publish

- [ ] Build writes `#doc-data` (JSON), runs `renderBody`, assembles the document
- [ ] `node references/check.mjs <file>` → `clean` (both passes: data + rendered HTML)
- [ ] Published as a **private** Artifact; `#doc-state.artifactUrl` now holds the returned URL
- [ ] `#doc-state.format` is **3**; `cursors` seeded at newest-seen per source
- [ ] Both sprites inlined (open the URL: brand icons — Slack/GitHub/Cal/Drive — are visible, not empty boxes)

## 3. Render fidelity + interactivity (open the Artifact)

- [ ] Opens straight into Today's painting — **no masthead**
- [ ] Dial bottom-right names the current tab; opens on hover/click/focus; arrows move tabs; Esc closes
- [ ] Deep link `#timeline` activates Timeline **and** scrolls
- [ ] **Timeline filters are multi-select**; `pivot` has its own chip and its own icon (arrow, not fork)
- [ ] Timeline spark heights + legend match the events; a month with all events filtered disappears
- [ ] State tiles filter; each count equals its group; a zero group's tile is disabled
- [ ] Gantt: one continuous today line, dated axis, bars link to lane items
- [ ] Callouts are **subtle** (faint accent wash, readable ink) — not bright-yellow slabs
- [ ] **Copy button works in the Artifact sandbox** (the hardened ladder) — copies, or falls back to selected text; never dead "copy failed"
- [ ] Copy tooltip lands **on** its button, not offset across the page
- [ ] Every resolvable citation chip is a link; hover cards open with no network request
- [ ] Toggle `prefers-reduced-motion`: no motion, no sound anywhere (incl. the chip tooltip)
- [ ] Disable JS: every panel visible, no-JS nav present, content intact (it was baked, not client-rendered)

## 4. Data-model plumbing

- [ ] `#doc-data`, `#doc-state`, `#doc-config`, `#doc-allowlist`, `#doc-previews` all present and parse
- [ ] A source-fetched string containing `<` `&` `"` renders escaped, not as markup (pick a message with a bracket)
- [ ] A custom / unknown source renders as the generic `#i-link` chip + generic card, not a broken card
- [ ] A custom source with a baked `favicon` (`data:` URI) shows it on the generic card in place of the `#i-link` glyph
- [ ] **Today is the interactive `daily-brief` fragment** (painting, item rows, hover detail) — not a hand-written prose summary
- [ ] **Richness floor**: the large majority of citation chips carry a `data-cite` payload (not bare links); items with real depth carry a disclosure holding it verbatim

## 5. Cloud routine (the risky part — this is why we test live)

- [ ] `Artifact` and `WebFetch` are actually available in the cloud routine (not just locally)
- [ ] Routine created as a **Claude Code cloud routine** (not `CronCreate`, not a cowork task)
- [ ] Routine carries only the `artifactUrl` pointer (+ DM target if notify was enabled) — **never a project-channel notify**
- [ ] **First run**: after pasting the setup prompt and picking the repo, trigger one run now, wait, confirm it **republished to the same URL** (URL unchanged)
- [ ] First run reached GitHub (the connector cowork lacks) — no "couldn't reach GitHub" in the notify
- [ ] Any source unreachable *in the cloud env* is surfaced by name before going live

## 6. Refresh behaviours

- [ ] Run fetches **programmatically** (`curl` + `doc-slice.mjs`) — the rendered markup never enters model context (matters most at 15-min/5-min cadence)
- [ ] Run with nothing new → **publishes nothing**, no changelog entry, no ping (notify off by default; when on, DM-only and change-only); cost is only curl + slice + source queries
- [ ] Run with real activity → exactly one new `.wn-run` marked latest; `new` flags moved to touched items only
- [ ] A patch is a **data** edit: confirm the diff touched `#doc-data`, not hand-edited HTML
- [ ] Cursor advanced **only** for sources that succeeded this run
- [ ] Auto-check: merge a watched PR (or close a watched bead) → its gantt bar flips to `shipped` + a `res` bullet appears
- [ ] Intraday: a newly-assigned PR/bead appears as a new lane item on the next hourly run
- [ ] Daily gate: two runs same day → the **second** does not rebuild Today / re-evaluate the goal (`lastDaily` unchanged)

## 7. Failure modes

- [ ] Force `check.mjs` to fail (hand-break the data) → run **does not publish**; last-good Artifact stays live; exits non-zero
- [ ] Simulate a source outage → that source skipped, its cursor **unchanged**, an `inferred` "couldn't reach X" note added, other sources still update
- [ ] Publish failure (if reproducible) → build kept, last-good URL stays, failure notified — not treated as corruption

## 8. Migration (only if an existing format-2 doc)

- [ ] `node references/doc-migrate.mjs <old index.html> > doc-data.json` produces `#doc-data`
- [ ] Assembled format-3 doc passes `check.mjs`
- [ ] Eyeball: What's New history, timeline (incl. decisions), settled questions all still present
- [ ] Only then republish; the format-2 version remains in the Artifact's version history

---

**Green means:** the data model round-trips through a real publish, the cloud
routine republishes with GitHub access, auto-check and the daily gate behave, and
every failure degrades instead of corrupting. That is the whole rearchitecture,
proven on live rails.

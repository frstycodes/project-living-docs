---
name: daily-brief
description: Build the Daily Brief — a hand-designed HTML brief of the day's calendar, inbox, to-dos and updates. Use when the user asks for their daily brief or morning brief, or when another skill needs a brief fragment scoped to one project.
---

The shell is **locked**: `references/shell.css`, `references/shell.js`,
`references/sprite.svg` and the markup in `references/components.md` are copied
verbatim. You do not redesign them, rename classes, retune spacing, or "improve"
the CSS. Every day looks like the same publication.

Your freedom is **editorial, not visual**: which sections run, in what order and
under what names; how many items each holds and what they say; the painting, the
blurb, the pun.

Dark-only is deliberate. There is no light theme and no theme toggle — do not add
one.

## Inputs

| Input | Default | Meaning |
|---|---|---|
| `scope` | `all` | `all` or `project` — see below |
| `out` | `brief.html` | Output path |
| `filter` | — | Required when `scope: project` |

`filter` is a config the caller supplies: repo slug, Slack channel list, people
names, Pact/beads project key. An item matching **none** of those is excluded.

## Setup and scheduling

First-time configuration of the **standalone** brief and putting it on a morning
schedule belong to the sibling `daily-brief-setup` skill — it interviews the user,
writes `~/.claude/daily-brief/config.json`, builds the first brief, and creates a
Claude Code cloud routine. This skill stays a pure builder.

A scheduled/unattended run reads that config, passes its `scope`, `out` and
`sources` into the build order below — a full rebuild, never a patch — then
**publishes to the config's `artifactUrl`** (a Claude Artifact, redeployed in
place) and sends the link to the config's `notify` channel. **Unattended runs
degrade softly:** a source that is unreachable produces a thinner brief with the
gap noted, never a failed run; a publish that fails keeps the last good Artifact
and notifies. The brief is a snapshot — tomorrow's run overwrites today's — so
there is nothing to back up, fetch back, or roll back.

## Scope

Both modes run the same machinery, the same components, the same painting and
blurb. Only two things change:

- **`scope: all`** — every calendar event, inbox item, to-do and update,
  regardless of project. Write a complete standalone HTML document to `out`:
  `<!doctype>`, `<html>`, `<head>` with `<style>` = `shell.css`, `<body>` opening
  with the grain svg and `sprite.svg`, closing with `<script>` = `shell.js`.
- **`scope: project`** — items filtered through `filter`. Emit a **fragment**: the
  brief's markup only. No `<!doctype>`, `<html>`, `<head>`, `<body>`, no
  `<style>`, no `<script>`, no sprite — the caller already owns the document shell
  and has included them once.

## Build order

1. **Gather** — Slack, Gmail, Calendar, GitHub, Drive. Get real permalinks and
   real avatar URLs; you need both to build items. Under `scope: project`, apply
   `filter` here, once, before anything is drafted.
2. **Pick the painting** per `references/voice.md`, download it, base64-encode it.
3. **Choose sections** and draft content in the voice rules of
   `references/voice.md`.
4. **Emit** using the markup in `references/components.md`, wrapped per the scope
   above.
5. **Inject the art**: the hero `<img src="__ART__">` carries a literal `__ART__`
   placeholder. The final step replaces that exact token with the
   `data:image/jpeg;base64,…` string. Keep the token in the emitted markup until
   that substitution — never paste the base64 inline while drafting.

## Hard don'ts

Full list in `references/voice.md`; these three are non-negotiable and apply to
any code you write around the brief:

- Never inject a model-generated string with `innerHTML`. Use `textContent`.
- Parse and host-allowlist every URL before it becomes an `href`.
- No `localStorage` — in-memory state only.
- Never reuse Dia's wordmark, dot mark, sign-off, or `dia-report://` scheme.

## Token layer

The `:root` custom properties in `shell.css` are the canonical token layer for a
family of related documents; another skill reads that exact file and builds on
top of it. Do not rename, remove, or reorder:
`--page --card --hairline --ink --ink-2 --ink-3 --ink-4 --accent --accent-ink
--ease --spring --serif --sans --mono`.

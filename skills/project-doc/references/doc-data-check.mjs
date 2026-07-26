/* project-doc data-model validator — LOCKED.
   Pure: validateData(data, previews) -> { errors, warns }. No I/O, no globals, so
   it is unit-testable on its own (doc-data-check.test.mjs) and imported by
   check.mjs for the source-of-truth pass.

   Most of the old DOM invariants (tile counts, gantt integers, disclosure bodies,
   filter/legend coverage, glyph bans) are now guaranteed by doc-render.mjs and
   need no check. What remains is the shape the renderer assumes and the
   cross-references it cannot verify on its own: a gantt bar targeting a real lane
   item, a cite that promises a preview payload, exactly one latest changelog run. */

const LAYOUTS = new Set(['timeline', 'state', 'ask', 'whatsnew', 'tldr', 'goal',
  'primer', 'glossary', 'pipeline', 'gantt', 'lane', 'prose', 'generic']);
const TL = new Set(['decision', 'pivot', 'incident', 'milestone', 'build', 'meeting']);
const STATES = new Set(['risk', 'blocked', 'flight', 'shipped']);
const WN = new Set(['dec', 'risk', 'res', 'add', 'upd', 'watch']);

function collectCites(list, into) {
  if (Array.isArray(list)) for (const c of list) if (c && c.key) into.push(c);
}

export function validateData(d, previews = {}) {
  const errors = [], warns = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warns.push(m);
  if (!d || !Array.isArray(d.sections) || !d.sections.length) {
    err('#doc-data has no sections'); return { errors, warns };
  }

  const secIds = new Set();
  const laneIds = new Set();
  const ganttTargets = [];
  const allCites = [];
  let latestRuns = 0, hasWhatsnew = false;

  // first pass: every lane item id, so gantt bars can be cross-checked
  for (const s of d.sections) {
    if (s && s.layout === 'lane') for (const it of (s.blocks || [])) if (it && it.id) laneIds.add(it.id);
  }

  for (const s of d.sections) {
    if (!s || typeof s.id !== 'string') { err('a section has no id'); continue; }
    if (secIds.has(s.id)) err(`duplicate section id "${s.id}"`);
    secIds.add(s.id);
    if (!s.title) err(`section "${s.id}" has no title`);
    if (typeof s.layout !== 'string') err(`section "${s.id}" has no layout`);
    else if (!LAYOUTS.has(s.layout)) warn(`section "${s.id}" layout "${s.layout}" is unknown — renders as prose`);
    const b = s.blocks;
    if (s.layout === 'timeline') {
      if (!Array.isArray(b)) { err(`timeline "${s.id}" blocks must be an array`); continue; }
      for (const e of b) {
        if (!TL.has(e.kind)) err(`timeline "${s.id}": event kind "${e.kind}" is not a known type`);
        if (!/^\d{4}-\d{2}-\d{2}/.test(e.iso || '')) err(`timeline "${s.id}": event "${e.title}" has no ISO iso`);
        if (!e.title) err(`timeline "${s.id}": an event has no title`);
        collectCites(e.cites, allCites);
      }
    } else if (s.layout === 'state') {
      if (!Array.isArray(b)) { err(`state "${s.id}" blocks must be an array`); continue; }
      for (const g of b) {
        if (!STATES.has(g.state)) err(`state "${s.id}": group state "${g.state}" is invalid`);
        for (const r of (g.rows || [])) collectCites(r.cites, allCites);
      }
    } else if (s.layout === 'gantt') {
      if (!b || !b.window) { err(`gantt "${s.id}" has no window`); continue; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(b.window.start || '')) err(`gantt "${s.id}": window.start must be an ISO date`);
      if (!['week', 'month'].includes(b.window.unit)) err(`gantt "${s.id}": window.unit must be week|month`);
      for (const r of (b.rows || [])) {
        if (!STATES.has(r.status)) err(`gantt "${s.id}": bar status "${r.status}" is invalid`);
        if (!Number.isInteger(r.c1) || !Number.isInteger(r.span)) err(`gantt "${s.id}": bar c1/span must be integers`);
        if (r.laneId) ganttTargets.push([s.id, r.laneId]);
      }
    } else if (s.layout === 'whatsnew') {
      hasWhatsnew = true;
      if (!b || !Array.isArray(b.runs)) { err(`whatsnew "${s.id}" has no runs`); continue; }
      for (const run of b.runs) {
        if (run.latest) latestRuns++;
        for (const bl of (run.bullets || [])) {
          if (!WN.has(bl.kind)) err(`whatsnew "${s.id}": bullet kind "${bl.kind}" is invalid`);
          collectCites(bl.cites, allCites);
        }
      }
    } else if (s.layout === 'ask') {
      if (!b || (!Array.isArray(b.open) && !Array.isArray(b.done))) err(`ask "${s.id}" has no open/done arrays`);
      for (const q of ((b && b.done) || [])) collectCites(q.cites, allCites);
    } else if (s.layout === 'lane') {
      if (!Array.isArray(b)) { err(`lane "${s.id}" blocks must be an array`); continue; }
      for (const it of b) {
        if (!it.id) err(`lane "${s.id}": an item has no id`);
        if (!it.title) err(`lane "${s.id}": an item has no title`);
        if (it.watch && !['pr', 'bead'].includes(it.watch.kind))
          err(`lane "${s.id}": item "${it.id}" watch.kind must be pr|bead`);
        collectCites(it.cites, allCites);
      }
    } else if (s.layout === 'goal') {
      for (const sh of ((b && b.shifts) || [])) collectCites(sh.cites, allCites);
    }
  }

  if (hasWhatsnew && latestRuns !== 1) err(`${latestRuns} What's New runs marked latest, expected exactly 1`);
  for (const [sid, laneId] of ganttTargets) {
    if (!laneIds.has(laneId)) err(`gantt "${sid}": bar laneId "${laneId}" matches no lane item`);
  }
  for (const c of allCites) {
    if (c.preview && !(c.key in previews)) err(`cite "${c.key}" carries a preview but #doc-previews has no entry`);
  }
  return { errors, warns };
}

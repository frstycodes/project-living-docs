/* project-doc format-2 -> format-3 migrator — LOCKED.
   Parses a hand-authored (format-2) document's section markup back into #doc-data,
   so an existing living document can move to the data model without losing its
   record. Run once per document (see update-protocol.md / config.md).

   It parses exactly the markup doc-render.mjs emits — format-2 docs were authored
   to the same sections.md spec, so the two are the same shape. That also makes it
   round-trip-testable: data -> renderSection -> parseSection -> data
   (doc-migrate.test.mjs). Input is normalised (whitespace between tags collapsed)
   first, so hand-authored spacing does not matter.

   Best-effort by design: a document with markup that drifted from the spec may
   not fully parse. The migration is verified before it replaces the live Artifact
   (check.mjs on the rendered result), and the old Artifact stays in version
   history — so a bad parse is caught, never shipped. */

export function norm(s) { return String(s).replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim(); }

const ENT = [[/&lt;/g, '<'], [/&gt;/g, '>'], [/&quot;/g, '"'], [/&amp;/g, '&']];
function unesc(s) { s = String(s == null ? '' : s); for (const [re, ch] of ENT) s = s.replace(re, ch); return s; }

// icon id -> citation kind (inverse of doc-render's CITE_KIND)
const ICON_KIND = {
  'i-github': 'pr', 'i-slack': 'slack', 'i-gmail': 'gmail', 'i-cal': 'cal',
  'i-drive': 'drive', 'i-bead': 'bead', 'i-commit': 'commit', 'i-file': 'path',
  'i-thread': 'thread', 'i-link': 'link'
};
function m1(re, s) { const m = s.match(re); return m ? m[1] : undefined; }
function all(re, s) { const out = []; let m; while ((m = re.exec(s))) out.push(m); return out; }

// {CITES} — the structure is fixed: wrapper (<a>|<span>), one <svg><use>, then
// either a <span class="tok"> or bare text, then the wrapper close. Matching that
// shape explicitly avoids the nested-</span> trap a lazy inner-capture falls into.
function parseCites(html) {
  const out = [];
  const re = /<(a|span) class="cite"([^>]*)><svg[^>]*><use href="#([^"]+)"\/><\/svg>(?:<span class="tok">([\s\S]*?)<\/span>|([\s\S]*?))<\/\1>/g;
  for (const m of all(re, html)) {
    const attrs = m[2], iconId = m[3];
    const c = { kind: ICON_KIND[iconId] || 'link' };
    c.raw = unesc(m[4] != null ? m[4] : (m[5] || '').trim());
    const key = m1(/data-cite="([^"]+)"/, attrs);
    if (key) { c.key = key; c.preview = {}; }
    const href = m1(/href="([^"]+)"/, attrs);
    if (href) c.url = unesc(href);
    out.push(c);
  }
  return out;
}
function discBody(html) { // the <p> text inside a .disc/.disc.flat body
  const b = html.match(/<div class="disc-body">([\s\S]*?)<\/div>/);
  return b ? unesc(m1(/<p>([\s\S]*?)<\/p>/, b[1]) || '') : undefined;
}

// {PER-LAYOUT PARSERS} — each is the inverse of a render<Layout>
function parseTimeline(h) {
  const events = [];
  for (const mo of all(/<section class="tl-month" id="tl-([\d-]+)">[\s\S]*?<ol>([\s\S]*?)<\/ol><\/section>/g, h)) {
    const ym = mo[1]; // "2026-06"
    for (const li of all(/<li data-type="([^"]+)">([\s\S]*?)<\/li>/g, mo[2])) {
      const kind = li[1], body = li[2];
      const date = unesc(m1(/<span class="t-date">([\s\S]*?)<\/span>/, body) || '');
      const day = (date.match(/(\d{1,2})/) || [])[1] || '01';
      const e = { kind, iso: `${ym}-${day.padStart(2, '0')}`, date,
        title: unesc(m1(/<span class="t-title">([\s\S]*?)<\/span>/, body) || '') };
      const gist = m1(/<p class="t-desc">([\s\S]*?)<\/p>/, body);
      if (gist != null) e.gist = unesc(gist);
      const src = body.match(/<div class="t-src">([\s\S]*?)<\/div>/);
      if (src) { const cs = parseCites(src[1]); if (cs.length) e.cites = cs; }
      const bd = discBody(body); if (bd != null) e.body = bd;
      if (/<span class="pill flag">/.test(body.split('</div>')[0] || '')) e.flag = true;
      events.push(e);
    }
  }
  return events;
}
function parseState(h) {
  const groups = [];
  // chunk per group (lookahead to the next group or section end); the row regex
  // below is self-delimiting, so the chunk needs no exact closing-div boundary —
  // trying to bound it on </div></div> mis-nests with the row's own closing div
  for (const g of all(/<div class="state-group" data-state="([^"]+)">([\s\S]*?)(?=<div class="state-group" data-state=|$)/g, h)) {
    const state = g[1], rows = [];
    for (const r of all(/<div class="row"><span class="row-t">([\s\S]*?)<\/span><span class="row-m">([\s\S]*?)<\/span><span class="row-g">([\s\S]*?)<\/span><\/div>/g, g[2])) {
      const row = {};
      const status = m1(/<span class="pill ([^"]+)">/, r[1]);
      row.title = unesc(r[1].replace(/<span class="pill[\s\S]*$/, '').trim());
      if (status && status !== 'flag') row.status = status;
      const cs = parseCites(r[2]); if (cs.length) row.cites = cs;
      const flag = /<span class="pill flag">/.test(r[3]);
      row.gist = unesc(r[3].replace(/<span class="pill flag">[\s\S]*?<\/span>/, '').trim());
      if (flag) row.flag = true;
      rows.push(row);
    }
    groups.push({ state, rows });
  }
  return groups;
}
function parseAsk(h) {
  const open = [];
  for (const q of all(/<li class="ask-q"><span class="ask-mark">[\s\S]*?<\/span><p class="ask-t">([\s\S]*?)<\/p><div class="ask-body">([\s\S]*?)<\/div><\/li>/g, h)) {
    const item = { q: unesc(q[1]) };
    const who = m1(/<p class="ask-who">([\s\S]*?)<\/p>/, q[2]); if (who != null) item.who = unesc(who);
    const ctx = m1(/<p class="ctx">([\s\S]*?)<\/p>/, q[2]); if (ctx != null) item.ctx = unesc(ctx);
    open.push(item);
  }
  const done = [];
  const doneWrap = h.match(/<ol class="ask-done" id="ask-done">([\s\S]*?)<\/ol>/);
  if (doneWrap) {
    for (const q of all(/<li class="ask-q is-answered"><span class="ask-mark">[\s\S]*?<\/span><p class="ask-t">([\s\S]*?)<\/p><div class="ask-body">([\s\S]*?)<\/div><\/li>/g, doneWrap[1])) {
      const item = { q: unesc(q[1]) };
      const ans = m1(/<p class="ask-ans">([\s\S]*?)<\/p>/, q[2]); if (ans != null) item.answer = unesc(ans);
      const cs = parseCites(q[2]); if (cs.length) item.cites = cs;
      done.push(item);
    }
  }
  return { open, done };
}
function parseLane(h) {
  const items = [];
  for (const it of all(/<li class="item" id="([^"]+)"><span class="item-n">\d+<\/span><div class="body">([\s\S]*?)<\/div><\/li>/g, h)) {
    const id = it[1], b = it[2];
    const item = { id };
    const t = b.match(/<div class="t">([\s\S]*?)<\/div>/)[1];
    const a = t.match(/<a href="([^"]+)">([\s\S]*?)<\/a>/);
    if (a) { item.href = unesc(a[1]); item.title = unesc(a[2]); }
    else item.title = unesc(t.replace(/<span class="tag[\s\S]*$/, '').trim());
    const tag = m1(/<span class="tag fill">([\s\S]*?)<\/span>/, t); if (tag != null) item.tag = unesc(tag);
    item.d = unesc(m1(/<div class="d">([\s\S]*?)<\/div>/, b) || '');
    const cs = parseCites(b.match(/<p class="cites">([\s\S]*?)<\/p>/) ? b.match(/<p class="cites">([\s\S]*?)<\/p>/)[1] : '');
    if (cs.length) item.cites = cs;
    const bd = discBody(b); if (bd != null) item.disc = bd;
    items.push(item);
  }
  return items;
}
function parseGantt(h) {
  const g = h.match(/<div class="gantt" style="--cols:(\d+)" data-start="([^"]+)" data-unit="([^"]+)">/);
  const window = { start: g[2], unit: g[3], cols: Number(g[1]) };
  const today = m1(/<span class="g-today" style="--c1:(\d+)"><\/span>/, h);
  if (today) window.todayC1 = Number(today);
  window.vh = unesc(m1(/<div class="g-axis">[\s\S]*?<span class="vh">([\s\S]*?)<\/span><\/div>/, h) || '');
  const rows = [];
  for (const r of all(/<li class="g-row" data-status="([^"]+)"><span class="g-lab">([\s\S]*?)<\/span><span class="g-track">([\s\S]*?)<\/span><\/li>/g, h)) {
    const row = { status: r[1] };
    const dep = m1(/<span class="g-dep">[\s\S]*?<\/svg>([\s\S]*?)<\/span>/, r[2]);
    row.title = unesc(r[2].replace(/<span class="g-dep">[\s\S]*$/, '').trim());
    const bar = r[3];
    row.laneId = m1(/href="#([^"]+)"/, bar);
    row.c1 = Number(m1(/--c1:(\d+)/, bar)); row.span = Number(m1(/--span:(\d+)/, bar));
    row.vh = unesc(m1(/<span class="vh">([\s\S]*?)<\/span>/, bar) || '');
    if (dep != null) row.dep = unesc(dep);
    rows.push(row);
  }
  return { window, rows };
}
function parseWhatsnew(h) {
  const runs = [];
  for (const r of all(/<article class="wn-run( is-latest)?"><header class="wn-when">([\s\S]*?)<\/header><ul class="wn-bul">([\s\S]*?)<\/ul><\/article>/g, h)) {
    const run = {};
    if (r[1]) run.latest = true;
    run.iso = m1(/datetime="([^"]+)"/, r[2]);
    run.date = unesc(m1(/<time[^>]*>([\s\S]*?)<\/time>/, r[2]) || '');
    const lbls = all(/<span class="lbl">([\s\S]*?)<\/span>/g, r[2]).map((m) => unesc(m[1]));
    run.time = lbls[0] || ''; run.sources = lbls[1] || '';
    run.bullets = [];
    for (const li of all(/<li><span class="wn-k ([^"]+)">[\s\S]*?<\/svg>[\s\S]*?<\/span><p class="wn-x">([\s\S]*?)<\/p><p class="wn-m">([\s\S]*?)<\/p><\/li>/g, r[3])) {
      const bl = { kind: li[1] };
      const strong = m1(/<strong>([\s\S]*?)<\/strong>/, li[2]);
      if (strong != null) bl.strong = unesc(strong);
      bl.text = unesc(li[2].replace(/<strong>[\s\S]*?<\/strong>\s*/, '').trim());
      const cs = parseCites(li[3]); if (cs.length) bl.cites = cs;
      const goto = li[3].match(/<a class="goto" href="#([^"]+)">([\s\S]*?)<svg/);
      if (goto) bl.goto = { target: goto[1], label: unesc(goto[2]) };
      run.bullets.push(bl);
    }
    runs.push(run);
  }
  const out = { runs };
  const note = m1(/<p class="src-note">([\s\S]*?)<\/p>/, h);
  if (note != null) out.srcNote = unesc(note);
  return out;
}
function parseDecRow(html) {
  const d = { date: unesc(m1(/<span class="dec-date">([\s\S]*?)<\/span>/, html) || '') };
  const dt = m1(/<span class="dec-t">([\s\S]*?)<\/span><span class="dec-v">/, html) || '';
  d.kind = m1(/<span class="pill ([^"]+)">/, dt) || 'decision';
  d.title = unesc(dt.replace(/\s*<span class="pill[\s\S]*$/, '').trim());
  d.verdict = unesc(m1(/<span class="dec-v">([\s\S]*?)<\/span>/, html) || '');
  const why = m1(/<h4>Why<\/h4><p>([\s\S]*?)<\/p>/, html); if (why != null) d.why = unesc(why);
  const cs = parseCites(html.match(/<p class="cites">([\s\S]*?)<\/p>/) ? html.match(/<p class="cites">([\s\S]*?)<\/p>/)[1] : '');
  if (cs.length) d.cites = cs;
  return d;
}
function parseGoal(h) {
  const out = {};
  const key = m1(/<div class="callout key"><p>([\s\S]*?)<\/p><\/div>/, h); if (key != null) out.current = unesc(key);
  const decs = h.match(/<div class="decisions">([\s\S]*?)<\/div>(?:<div class="callout quiet">|$)/);
  out.shifts = decs ? all(/<details class="disc"><summary>([\s\S]*?)<\/summary><div class="disc-body">([\s\S]*?)<\/div><\/details>/g, decs[1]).map((m) => parseDecRow(m[1] + '<div class="disc-body">' + m[2] + '</div>')) : [];
  const q = m1(/<div class="callout quiet"><p>([\s\S]*?)<\/p><\/div>/, h); if (q != null) out.historical = unesc(q);
  return out;
}
function parseTldr(h) {
  const out = { tiles: [] };
  for (const t of all(/<div class="tile (is-\w+)"><span class="tile-n">([\s\S]*?)<\/span><span class="tile-k">([\s\S]*?)<\/span>(?:<span class="tile-g">([\s\S]*?)<\/span>)?<\/div>/g, h)) {
    const tile = { n: unesc(t[2]), label: unesc(t[3]) };
    if (t[1] === 'is-risk') tile.risk = true;
    if (t[4] != null) tile.gist = unesc(t[4]);
    out.tiles.push(tile);
  }
  const key = m1(/<div class="callout key"><p>([\s\S]*?)<\/p><\/div>/, h); if (key != null) out.key = unesc(key);
  const disc = h.match(/<details class="disc flat"><summary><span class="disc-t">([\s\S]*?)<\/span><span class="disc-g">([\s\S]*?)<\/span>[\s\S]*?<div class="disc-body"><p>([\s\S]*?)<\/p>/);
  if (disc) { out.long = unesc(disc[3]); out.longGist = unesc(disc[2]); }
  return out;
}
function parsePrimer(h) {
  return all(/<details class="disc"><summary><span class="qa-q">([\s\S]*?)<\/span><span class="qa-a">([\s\S]*?)<\/span>[\s\S]*?<div class="disc-body"><p>([\s\S]*?)<\/p><\/div><\/details>/g, h)
    .map((m) => ({ q: unesc(m[1]), a: unesc(m[2]), body: unesc(m[3]) }));
}
function parseGlossary(h) {
  return all(/<div class="gcat"><h3>([\s\S]*?)<\/h3><dl class="gterms">([\s\S]*?)<\/dl><\/div>/g, h).map((cat) => ({
    name: unesc(cat[1]),
    terms: all(/<div class="gterm"><dt>([\s\S]*?)<\/dt><dd>([\s\S]*?)<\/dd><\/div>/g, cat[2]).map((t) => {
      const code = /<code>/.test(t[1]);
      return { term: unesc(t[1].replace(/<\/?code>/g, '')), def: unesc(t[2]), ...(code ? { code: true } : {}) };
    })
  }));
}
function parsePipeline(h) {
  const stages = [];
  const details = h.match(/<div class="pipe-detail">([\s\S]*?)<\/div><\/div>$/) || h.match(/<div class="pipe-detail">([\s\S]*)/);
  for (const b of all(/<button class="stage-btn"[^>]*><span class="stage-n">\d+<\/span><span class="stage-t">([\s\S]*?)<\/span><span class="stage-g">([\s\S]*?)<\/span><\/button>/g, h)) {
    stages.push({ title: unesc(b[1]), gist: unesc(b[2]), detail: '' });
  }
  const dets = all(/<div class="stage-d" id="[^"]+" hidden><h4>[\s\S]*?<\/h4><p>([\s\S]*?)<\/p><\/div>/g, details ? details[1] : h);
  stages.forEach((s, i) => { if (dets[i]) s.detail = unesc(dets[i][1]); });
  return stages;
}
function parseProse(h) {
  // body after the section shell prefix (eyebrow/title/lead already consumed)
  const body = h.replace(/^<section[^>]*>(?:<p class="eyebrow">[\s\S]*?<\/p>)?<h2>[\s\S]*?<\/h2>(?:<p class="sec-lead">[\s\S]*?<\/p>)?/, '').replace(/<\/section>$/, '');
  const blocks = [];
  const re = /<div class="callout( \w+)?"><p>([\s\S]*?)<\/p><\/div>|<details class="disc flat"><summary><span class="disc-t">([\s\S]*?)<\/span>(?:<span class="disc-g">([\s\S]*?)<\/span>)?[\s\S]*?<div class="disc-body"><p>([\s\S]*?)<\/p><\/div><\/details>|<p>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(body))) {
    if (m[2] != null) { const b = { type: 'callout', text: unesc(m[2]) }; if (m[1]) b.variant = m[1].trim(); blocks.push(b); }
    else if (m[3] != null) { const b = { type: 'disc', title: unesc(m[3]), body: unesc(m[5]) }; if (m[4] != null) b.gist = unesc(m[4]); blocks.push(b); }
    else if (m[6] != null) blocks.push({ type: 'p', text: unesc(m[6]) });
  }
  return blocks;
}

function detect(body) {
  if (/class="wn"/.test(body)) return 'whatsnew';
  if (/class="tl-spark"/.test(body)) return 'timeline';
  if (/class="ask-tally"/.test(body)) return 'ask';
  if (/class="gantt"/.test(body)) return 'gantt';
  if (/lane-list/.test(body)) return 'lane';
  if (/class="pipe-wrap"/.test(body)) return 'pipeline';
  if (/class="qa"/.test(body)) return 'primer';
  if (/class="gtools"/.test(body)) return 'glossary';
  if (/class="decisions"/.test(body)) return 'goal';
  if (/class="state-group"/.test(body)) return 'state';
  if (/class="tiles"/.test(body)) return 'tldr';
  return 'prose';
}
const PARSERS = {
  timeline: parseTimeline, state: parseState, ask: parseAsk, lane: parseLane,
  gantt: parseGantt, whatsnew: parseWhatsnew, goal: parseGoal, tldr: parseTldr,
  primer: parsePrimer, glossary: parseGlossary, pipeline: parsePipeline, prose: parseProse
};

// {SECTION} — inverse of sectionShell + the layout body
export function parseSection(raw) {
  const html = norm(raw);
  const s = { id: m1(/<section class="sec" id="([^"]+)">/, html) };
  const eb = html.match(/<p class="eyebrow">(?:<svg[^>]*><use href="#([^"]+)"\/><\/svg>)?([^<]*)<\/p>/);
  if (eb) { if (eb[1]) s.icon = eb[1]; if (eb[2]) s.eyebrow = unesc(eb[2]); }
  s.title = unesc(m1(/<h2>([\s\S]*?)<\/h2>/, html) || '');
  const lead = m1(/<p class="sec-lead">([\s\S]*?)<\/p>/, html); if (lead != null) s.lead = unesc(lead);
  s.layout = detect(html);
  s.blocks = PARSERS[s.layout](html);
  return s;
}

// {DOCUMENT} — every section, tagged with the tab of the panel it sits in, plus
// meta lifted from the dial and #doc-config.
export function parseDoc(rawHtml) {
  const html = norm(rawHtml);
  const sections = [];
  for (const panel of all(/<div class="panel" role="tabpanel" id="panel-([^"]+)"[^>]*>([\s\S]*?)<\/div>(?=<div class="panel"|<\/main>)/g, html)) {
    const tab = panel[1];
    if (tab === 'today') continue; // the brief fragment is not part of the record
    for (const sm of all(/<section class="sec"[\s\S]*?<\/section>/g, panel[2])) {
      const sec = parseSection(sm[0]); sec.tab = tab; sections.push(sec);
    }
  }
  const cfg = (() => { try { return JSON.parse(m1(/id="doc-config">([\s\S]*?)<\/script>/, html) || '{}'); } catch { return {}; } })();
  const meta = {
    project: unesc(m1(/<span class="dial-name">([\s\S]*?)<\/span>/, html) || cfg.project || ''),
    tagline: cfg.tagline || '', timezone: cfg.timezone || '', locale: cfg.locale || '',
    updatedAt: unesc((m1(/<span class="dial-meta">updated ([\s\S]*?)<\/span>/, html) || '').trim())
  };
  return { meta, sections };
}

// CLI: node doc-migrate.mjs <format-2 index.html>  ->  #doc-data JSON on stdout
if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync } = await import('node:fs');
  process.stdout.write(JSON.stringify(parseDoc(readFileSync(process.argv[2], 'utf8')), null, 2) + '\n');
}

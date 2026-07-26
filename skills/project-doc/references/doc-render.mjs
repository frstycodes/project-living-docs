/* project-doc renderer — LOCKED.
   Pure data -> HTML string. No DOM, no dependency: runs in node at publish time.
   The document's content is #doc-data (JSON); this turns it into the exact markup
   doc-components.css styles and doc-shell.js drives. The LLM edits the data; this
   file owns the markup, so a surgical edit can never break the shell.

   Every value that came from a source is escaped here — esc() on text, escAttr()
   on attribute values — so a generic/unknown node can carry arbitrary DATA but
   never arbitrary MARKUP. That is the security invariant the data model rests on.

   Layouts implemented in this Phase-1 slice: timeline, state, ask, prose/generic.
   The rest (whatsnew, tldr, goal, primer, glossary, pipeline, gantt, lane) follow
   the identical pattern — a render<Layout>(section) that returns a string — and
   are listed in data-model.md. renderSection dispatches on section.layout, falling
   back to prose for any unknown layout (the section-level escape hatch). */

// {ESCAPING}
const AMP = /&/g, LT = /</g, GT = />/g, QUOT = /"/g;
export function esc(v) {
  return String(v == null ? '' : v).replace(AMP, '&amp;').replace(LT, '&lt;').replace(GT, '&gt;');
}
export function escAttr(v) {
  return esc(v).replace(QUOT, '&quot;');
}

// {PRIMITIVES}
function icon(id, brand) {
  return `<svg class="ic ${brand ? 'ic-b' : 'ic-s'}" aria-hidden="true"><use href="#${escAttr(id)}"/></svg>`;
}
function pill(cls, iconId, word) {
  return `<span class="pill ${escAttr(cls)}">${iconId ? icon(iconId) : ''}${esc(word)}</span>`;
}
const flagPill = '<span class="pill flag">new</span>';

// citation kind -> [sprite id, isBrandMark, wrapInTok]
const CITE_KIND = {
  pr: ['i-github', true, true],
  slack: ['i-slack', true, false],
  gmail: ['i-gmail', true, false],
  cal: ['i-cal', true, false],
  drive: ['i-drive', true, false],
  bead: ['i-bead', false, true],
  commit: ['i-commit', false, true],
  path: ['i-file', false, true],
  thread: ['i-thread', false, false],
  link: ['i-link', false, false]
};
function cite(c) {
  const k = CITE_KIND[c.kind] || CITE_KIND.link;
  const label = k[2] ? `<span class="tok">${esc(c.raw)}</span>` : esc(c.raw);
  const inner = icon(k[0], k[1]) + label;
  const dc = c.preview ? ` data-cite="${escAttr(c.key)}"` : '';
  if (c.url) return `<a class="cite"${dc} href="${escAttr(c.url)}" target="_blank" rel="noopener">${inner}</a>`;
  return `<span class="cite"${dc}>${inner}</span>`;
}
function cites(list, wrapClass) {
  if (!list || !list.length) return '';
  const inner = list.map(cite).join('');
  return wrapClass ? `<div class="${wrapClass}">${inner}</div>` : inner;
}

// a folded disclosure, the one depth idiom
function disc(headline, gist, bodyHtml, flat) {
  const cls = flat ? 'disc flat' : 'disc';
  const g = gist ? `<span class="disc-g">${esc(gist)}</span>` : '';
  return `<details class="${cls}"><summary><span class="disc-t">${esc(headline)}</span>${g}` +
    `<svg class="disc-i" aria-hidden="true"><use href="#i-chev"/></svg></summary>` +
    `<div class="disc-body">${bodyHtml}</div></details>`;
}

// {SECTION SHELL} — chrome is data: eyebrow, title, lead, icon are the LLM's
function sectionShell(section, bodyHtml) {
  const eyebrow = section.eyebrow
    ? `<p class="eyebrow">${section.icon ? icon(section.icon) : ''}${esc(section.eyebrow)}</p>` : '';
  const lead = section.lead ? `<p class="sec-lead">${esc(section.lead)}</p>` : '';
  return `<section class="sec" id="${escAttr(section.id)}">${eyebrow}` +
    `<h2>${esc(section.title)}</h2>${lead}${bodyHtml}</section>`;
}

// {TIMELINE} — the renderer owns the spark, the filters, the legend and the
// month clustering; the LLM supplies only the events. This is the whole point:
// filters/legend/spark can never drift from the events because they are derived.
const TL_KIND = {
  decision: ['decision', 'i-fork', 'decision', 'a choice was made'],
  pivot: ['pivot', 'i-pivot', 'pivot', 'a choice was reversed'],
  incident: ['incident', 'i-alert', 'incident', 'it needs a response'],
  milestone: ['milestone', 'i-check', 'milestone', 'a point was reached'],
  build: ['build', 'i-ship', 'built', 'it shipped'],
  meeting: ['meeting', 'i-user', 'meeting', 'people talked']
};
const TL_ORDER = ['decision', 'pivot', 'incident', 'milestone', 'build', 'meeting'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function monthKey(iso) { return String(iso).slice(0, 7); }
function monthLabel(key) {
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

function renderTimeline(section) {
  const events = (section.blocks || []).filter(Boolean);
  // group by month, ascending (newest last so the eye reads forward)
  const keys = [...new Set(events.map((e) => monthKey(e.iso)))].sort();
  const byMonth = new Map(keys.map((k) => [k, events.filter((e) => monthKey(e.iso) === k)]));
  const counts = keys.map((k) => byMonth.get(k).length);
  const max = Math.max(1, ...counts);

  // spark strip — derived height, derived aria
  const spark = keys.map((k, i) => {
    const n = counts[i];
    const h = Math.max(1, Math.round(n / max * 100));
    return `<li style="--h:${h}"><a href="#tl-${k}" aria-label="${escAttr(monthLabel(k))}: ${n} ${n === 1 ? 'event' : 'events'}"></a></li>`;
  }).join('');
  const sparkAx = keys.map((k) => `<span class="lbl">${esc(monthLabel(k).replace(/ \d+$/, ''))}</span>`).join('');

  // present kinds, in ladder order — filters and legend derive from these
  const present = TL_ORDER.filter((t) => events.some((e) => e.kind === t));
  const filters = `<button type="button" data-filter="all" aria-pressed="true">All</button>` +
    present.map((t) => `<button type="button" data-filter="${t}" aria-pressed="false">${esc(TL_KIND[t][2][0].toUpperCase() + TL_KIND[t][2].slice(1))}s</button>`).join('');
  const legend = present.map((t) => {
    const [, ic, word, desc] = TL_KIND[t];
    return `<span data-type="${t}"><span class="t-dot"></span>${icon(ic)}<span class="lg-w">${esc(word)}</span> — ${esc(desc)}</span>`;
  }).join('');

  const months = keys.map((k) => {
    const items = byMonth.get(k).slice().sort((a, b) => String(a.iso).localeCompare(b.iso)).map((e) => {
      const [cls, ic, word] = TL_KIND[e.kind] || ['milestone', 'i-check', e.kind];
      const head = `<div class="t-head">${pill(cls, ic, word)}${e.flag ? flagPill : ''}<span class="t-title">${esc(e.title)}</span></div>`;
      const desc = e.gist ? `<p class="t-desc">${esc(e.gist)}</p>` : '';
      const src = cites(e.cites, 't-src');
      const body = e.body ? disc(e.bodyHead || 'Detail', null, `<p>${esc(e.body)}</p>`, true) : '';
      return `<li data-type="${e.kind}"><span class="t-date">${esc(e.date)}</span><span class="t-dot"></span>` +
        `<div class="t-body">${head}${desc}${src}${body}</div></li>`;
    }).join('');
    return `<section class="tl-month" id="tl-${k}"><h3>${esc(monthLabel(k))}</h3><ol>${items}</ol></section>`;
  }).join('');

  const body =
    `<ul class="tl-spark" aria-label="Events per month">${spark}</ul>` +
    `<div class="tl-spark-ax" aria-hidden="true">${sparkAx}</div>` +
    `<div class="filters" id="tl-filters" role="group" aria-label="Filter timeline">${filters}</div>` +
    `<div class="timeline" id="timeline-list">${months}</div>` +
    `<div class="legend">${legend}</div>`;
  return sectionShell(section, body);
}

// {STATE} — tiles derived from the groups, so a count can never disagree
const STATE_GROUP = {
  risk: ['is-risk', 'i-alert', 'at risk'],
  blocked: ['is-blocked', 'i-block', 'Blocked'],
  flight: ['is-flight', 'i-flight', 'in flight'],
  shipped: ['is-done', 'i-ship', 'shipped']
};
const STATE_ORDER = ['risk', 'blocked', 'flight', 'shipped'];
const STATUS_PILL = {
  done: ['done', 'i-check', 'done'], progress: ['progress', 'i-flight', 'in progress'],
  notstarted: ['notstarted', 'i-block', 'not started'], review: ['review', 'i-doc', 'in review']
};
function renderState(section) {
  const groups = (section.blocks || []).filter(Boolean);
  const byState = new Map(groups.map((g) => [g.state, g]));
  const present = STATE_ORDER.filter((s) => byState.has(s) && (byState.get(s).rows || []).length);

  const tiles = present.map((s) => {
    const [cls, ic, label] = STATE_GROUP[s];
    const n = (byState.get(s).rows || []).length;
    return `<button class="tile ${cls}" type="button" data-state="${s}" aria-pressed="false">` +
      `<span class="tile-n">${n}</span><span class="tile-k">${icon(ic)}${esc(label)}</span></button>`;
  }).join('');

  const groupsHtml = present.map((s) => {
    const [, ic, label] = STATE_GROUP[s];
    const rows = (byState.get(s).rows || []).map((r) => {
      const sp = r.status ? ' ' + pill(STATUS_PILL[r.status] ? STATUS_PILL[r.status][0] : r.status,
        STATUS_PILL[r.status] ? STATUS_PILL[r.status][1] : null,
        STATUS_PILL[r.status] ? STATUS_PILL[r.status][2] : r.status) : '';
      const flag = r.flag ? ' ' + flagPill : '';
      return `<div class="row"><span class="row-t">${esc(r.title)}${sp}</span>` +
        `<span class="row-m">${cites(r.cites)}</span>` +
        `<span class="row-g">${esc(r.gist || '')}${flag}</span></div>`;
    }).join('');
    return `<div class="state-group" data-state="${s}"><h3>${icon(ic)}${esc(label)}</h3><div class="rows">${rows}</div></div>`;
  }).join('');

  return sectionShell(section, `<div class="tiles">${tiles}</div>${groupsHtml}`);
}

// {ASK} — the open ledger. counts are computed by doc-shell.js at runtime; ship 0.
function renderAsk(section) {
  const b = section.blocks || {};
  const open = (b.open || []).map((q) => {
    const who = q.who ? `<p class="ask-who">${esc(q.who)}</p>` : '';
    const ctx = q.ctx ? `<p class="ctx">${esc(q.ctx)}</p>` : '';
    return `<li class="ask-q"><span class="ask-mark"><svg class="ic ic-s" aria-hidden="true"><use href="#i-ask"/></svg></span>` +
      `<p class="ask-t">${esc(q.q)}</p><div class="ask-body">${who}${ctx}</div></li>`;
  }).join('');
  const done = (b.done || []).map((q) => {
    const ans = q.answer ? `<p class="ask-ans">${esc(q.answer)}</p>` : '';
    return `<li class="ask-q is-answered"><span class="ask-mark"><svg class="ic ic-s" aria-hidden="true"><use href="#i-check"/></svg></span>` +
      `<p class="ask-t">${esc(q.q)}</p><div class="ask-body">${ans}${cites(q.cites, 'cites')}</div></li>`;
  }).join('');
  const body =
    `<div class="ask"><div class="ask-tally"><span class="ask-n" id="ask-count">0</span>` +
    `<span class="ask-n-k">open questions</span><span class="ask-strokes" id="ask-strokes" aria-hidden="true"></span></div>` +
    `<ol class="ask-open" id="ask-open">${open}</ol>` +
    `<details class="disc flat ask-tray"><summary><span class="disc-t">Settled</span>` +
    `<span class="disc-g"><span class="ask-tray-n" id="ask-done-n">0</span> answered, kept on the record</span>` +
    `<svg class="disc-i" aria-hidden="true"><use href="#i-chev"/></svg></summary>` +
    `<div class="disc-body"><ol class="ask-done" id="ask-done">${done}</ol></div></details></div>`;
  return sectionShell(section, body);
}

// {GENERIC / PROSE} — the section-level escape hatch. Renders eyebrow/title/lead
// plus a list of generic blocks: a paragraph, a callout, a keyed field list, or a
// disclosure. Arbitrary DATA, never arbitrary markup.
function renderGenericBlock(block) {
  if (block.type === 'p') return `<p>${esc(block.text)}</p>`;
  if (block.type === 'callout') {
    const cls = block.variant ? ` ${escAttr(block.variant)}` : '';
    return `<div class="callout${cls}"><p>${esc(block.text)}</p></div>`;
  }
  if (block.type === 'disc') return disc(block.title, block.gist, `<p>${esc(block.body)}</p>`, true);
  if (block.type === 'fields') {
    const rows = (block.fields || []).map((f) =>
      `<div class="row"><span class="row-t">${esc(f.label)}</span><span class="row-g">${esc(f.value)}</span></div>`).join('');
    const head = block.title ? `<h3>${block.icon ? icon(block.icon) : ''}${esc(block.title)}</h3>` : '';
    return `${head}<div class="rows">${rows}</div>`;
  }
  // unknown block type: render its title/text safely rather than dropping it
  return block.text ? `<p>${esc(block.text)}</p>` : '';
}
function renderGeneric(section) {
  return sectionShell(section, (section.blocks || []).map(renderGenericBlock).join(''));
}

// {SHARED} — slug for ids, goto chip, decision row (goal + anywhere a fork shows)
function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function goto(target, label) {
  return `<a class="goto" href="#${escAttr(target)}">${esc(label)}` +
    `<svg class="ic ic-s" aria-hidden="true"><use href="#i-arrow"/></svg></a>`;
}
const DEC_PILL = {
  decision: ['decision', 'i-fork', 'decision'],
  pivot: ['pivot', 'i-pivot', 'pivot'],
  milestone: ['milestone', 'i-check', 'milestone']
};
function decisionRow(d) {
  const p = DEC_PILL[d.kind] || DEC_PILL.decision;
  const why = d.why ? `<h4>Why</h4><p>${esc(d.why)}</p>` : '';
  const cs = d.cites && d.cites.length ? `<p class="cites">${d.cites.map(cite).join('')}</p>` : '';
  return `<details class="disc"><summary><span class="dec-date">${esc(d.date)}</span>` +
    `<span class="dec-t">${esc(d.title)} ${pill(p[0], p[1], p[2])}</span>` +
    `<span class="dec-v">${esc(d.verdict)}</span>` +
    `<svg class="disc-i" aria-hidden="true"><use href="#i-chev"/></svg></summary>` +
    `<div class="disc-body">${why}${cs}</div></details>`;
}

// {WHATS NEW} — a dated spine. The newest run carries is-latest.
const WN_KIND = {
  dec: ['dec', 'i-fork', 'Decision'], risk: ['risk', 'i-alert', 'Risk'],
  res: ['res', 'i-check', 'Resolved'], add: ['add', 'i-ship', 'Added'],
  upd: ['upd', 'i-flight', 'Updated'], watch: ['watch', 'i-search', 'Watch']
};
function renderWhatsnew(section) {
  const b = section.blocks || {};
  const runs = (b.runs || []).map((r) => {
    const bullets = (r.bullets || []).map((x) => {
      const k = WN_KIND[x.kind] || WN_KIND.upd;
      const strong = x.strong ? `<strong>${esc(x.strong)}</strong> ` : '';
      const meta = `<p class="wn-m">${cites(x.cites)}${x.goto ? goto(x.goto.target, x.goto.label) : ''}</p>`;
      return `<li><span class="wn-k ${k[0]}">${icon(k[1])}${esc(k[2])}</span>` +
        `<p class="wn-x">${strong}${esc(x.text)}</p>${meta}</li>`;
    }).join('');
    const labels = `<span class="lbl">${esc(r.time)}</span><span class="lbl">${esc(r.sources)}</span>`;
    return `<article class="wn-run${r.latest ? ' is-latest' : ''}">` +
      `<header class="wn-when"><time class="wn-d" datetime="${escAttr(r.iso)}">${esc(r.date)}</time>${labels}</header>` +
      `<ul class="wn-bul">${bullets}</ul></article>`;
  }).join('');
  const note = b.srcNote ? `<p class="src-note">${esc(b.srcNote)}</p>` : '';
  return sectionShell(section, `<div class="wn">${runs}</div>${note}`);
}

// {TL;DR} — big numbers, one key line, the prose folded
function renderTldr(section) {
  const b = section.blocks || {};
  const tiles = (b.tiles || []).map((t) => {
    const cls = t.risk ? 'is-risk' : 'is-done';
    const g = t.gist ? `<span class="tile-g">${esc(t.gist)}</span>` : '';
    return `<div class="tile ${cls}"><span class="tile-n">${esc(t.n)}</span>` +
      `<span class="tile-k">${esc(t.label)}</span>${g}</div>`;
  }).join('');
  const key = b.key ? `<div class="callout key"><p>${esc(b.key)}</p></div>` : '';
  const long = b.long ? disc('The long version', b.longGist, `<p>${esc(b.long)}</p>`, true) : '';
  return sectionShell(section, `<div class="tiles">${tiles}</div>${key}${long}`);
}

// {GOAL} — current framing, shifts as decision rows, historical folded
function renderGoal(section) {
  const b = section.blocks || {};
  const current = b.current ? `<div class="callout key"><p>${esc(b.current)}</p></div>` : '';
  const shifts = (b.shifts || []).length
    ? `<div class="decisions">${b.shifts.map(decisionRow).join('')}</div>` : '';
  const hist = b.historical ? `<div class="callout quiet"><p>${esc(b.historical)}</p></div>` : '';
  return sectionShell(section, `${current}${shifts}${hist}`);
}

// {PRIMER} — question cards
function renderPrimer(section) {
  const items = (section.blocks || []).map((q) =>
    `<details class="disc"><summary><span class="qa-q">${esc(q.q)}</span>` +
    `<span class="qa-a">${esc(q.a)}</span>` +
    `<svg class="disc-i" aria-hidden="true"><use href="#i-chev"/></svg></summary>` +
    `<div class="disc-body"><p>${esc(q.body)}</p></div></details>`).join('');
  return sectionShell(section, `<div class="qa">${items}</div>`);
}

// {GLOSSARY} — the letter rail is derived from the terms present
function renderGlossary(section) {
  const cats = section.blocks || [];
  const initials = [...new Set(cats.flatMap((c) => (c.terms || []).map(
    (t) => String(t.term).trim().charAt(0).toUpperCase())))].filter(Boolean).sort();
  const rail = initials.map((l) =>
    `<button type="button" data-letter="${escAttr(l)}" aria-pressed="false">${esc(l)}</button>`).join('');
  const catsHtml = cats.map((c) => {
    const terms = (c.terms || []).map((t) => {
      const dt = t.code ? `<code>${esc(t.term)}</code>` : esc(t.term);
      return `<div class="gterm"><dt>${dt}</dt><dd>${esc(t.def)}</dd></div>`;
    }).join('');
    return `<div class="gcat"><h3>${esc(c.name)}</h3><dl class="gterms">${terms}</dl></div>`;
  }).join('');
  const tools = `<div class="gtools"><div class="gsearch-wrap">` +
    `<svg class="ic ic-s" aria-hidden="true"><use href="#i-search"/></svg>` +
    `<input class="gsearch" id="gsearch" type="search" placeholder="Filter terms…" aria-label="Filter glossary terms"></div>` +
    `<div class="galpha" id="galpha" role="group" aria-label="Jump to letter">${rail}</div></div>`;
  const empty = `<p class="gempty" id="gempty" hidden>No terms match that filter.</p>`;
  return sectionShell(section, `${tools}${catsHtml}${empty}`);
}

// {PIPELINE} — numbered stages, arrows are markup, last has none
function renderPipeline(section) {
  const stages = section.blocks || [];
  const arrow = '<svg class="pipe-arrow" aria-hidden="true"><use href="#i-arrow"/></svg>';
  const nodes = stages.map((s, i) => {
    const nn = String(i + 1).padStart(2, '0');
    const id = 'stage-' + slug(s.title);
    return `<li><button class="stage-btn" type="button" aria-expanded="false" aria-controls="${id}">` +
      `<span class="stage-n">${nn}</span><span class="stage-t">${esc(s.title)}</span>` +
      `<span class="stage-g">${esc(s.gist)}</span></button>${i < stages.length - 1 ? arrow : ''}</li>`;
  }).join('');
  const details = stages.map((s, i) => {
    const nn = String(i + 1).padStart(2, '0');
    const id = 'stage-' + slug(s.title);
    return `<div class="stage-d" id="${id}" hidden><h4>${nn} · ${esc(s.title)}</h4><p>${esc(s.detail)}</p></div>`;
  }).join('');
  return sectionShell(section,
    `<div class="pipe-wrap"><div class="pipe-rail"><ol class="pipe">${nodes}</ol></div>` +
    `<div class="pipe-detail">${details}</div></div>`);
}

// {GANTT} — the axis (month band + day band) is derived from window start/unit/cols
const G_STATUS = {
  shipped: ['i-ship', 'Shipped'], flight: ['i-flight', 'In flight'],
  blocked: ['i-block', 'Blocked'], risk: ['i-alert', 'At risk']
};
const G_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function ganttAxis(win) {
  const [y, m, d] = win.start.split('-').map(Number);
  const base = Date.UTC(y, m - 1, d);
  const stepDays = win.unit === 'month' ? 30 : 7;
  const days = [], monthOfCol = [];
  for (let i = 0; i < win.cols; i++) {
    const dt = new Date(base + i * stepDays * 864e5);
    days.push(dt.getUTCDate());
    monthOfCol.push(dt.getUTCMonth());
  }
  // group consecutive columns sharing a month
  const groups = [];
  for (let i = 0; i < win.cols; i++) {
    const last = groups[groups.length - 1];
    if (last && last.month === monthOfCol[i]) last.span++;
    else groups.push({ month: monthOfCol[i], c1: i + 1, span: 1 });
  }
  const dense = win.cols > 14;
  const monthsBand = groups.map((g) =>
    `<span class="g-tick" style="--c1:${g.c1};--span:${g.span}">${G_MONTHS_SHORT[g.month]}</span>`).join('');
  const daysBand = days.map((n, i) =>
    `<span class="g-tick" style="--c1:${i + 1}">${n}</span>`).join('');
  return { monthsBand, daysBand, dense };
}
function renderGantt(section) {
  const win = section.blocks.window;
  const rows = section.blocks.rows || [];
  const ax = ganttAxis(win);
  const head = `<div class="g-head"><span></span><div class="g-axis">` +
    `<div class="g-ticks g-months">${ax.monthsBand}</div>` +
    `<div class="g-ticks g-days${ax.dense ? ' is-dense' : ''}">${ax.daysBand}</div>` +
    `<span class="vh">${esc(win.vh)}</span></div></div>`;
  const today = win.todayC1 ? `<span class="g-today" style="--c1:${win.todayC1}"></span>` : '';
  const rowsHtml = rows.map((r) => {
    const st = G_STATUS[r.status] || G_STATUS.flight;
    const tight = r.span < 3 ? ' is-tight' : '';
    const dep = r.dep ? `<span class="g-dep"><svg class="ic ic-s" aria-hidden="true"><use href="#i-link"/></svg>${esc(r.dep)}</span>` : '';
    const bar = `<a class="g-bar${tight}" href="#${escAttr(r.laneId)}" style="--c1:${r.c1};--span:${r.span}">` +
      `${icon(st[0])}<span>${esc(st[1])}</span><span class="vh">${esc(r.vh)}</span></a>`;
    return `<li class="g-row" data-status="${r.status}"><span class="g-lab">${esc(r.title)}${dep}</span>` +
      `<span class="g-track">${bar}</span></li>`;
  }).join('');
  const legend = `<div class="g-legend">` +
    `<span><span class="g-key" aria-hidden="true"></span><svg class="ic ic-s" aria-hidden="true"><use href="#i-ship"/></svg>shipped</span>` +
    `<span><span class="g-key k-flight" aria-hidden="true"></span><svg class="ic ic-s" aria-hidden="true"><use href="#i-flight"/></svg>in flight</span>` +
    `<span><span class="g-key k-blocked" aria-hidden="true"></span><svg class="ic ic-s" aria-hidden="true"><use href="#i-block"/></svg>blocked</span>` +
    `<span><span class="g-key k-risk" aria-hidden="true"></span><svg class="ic ic-s" aria-hidden="true"><use href="#i-alert"/></svg>at risk</span></div>`;
  const body = `<div class="gantt-wrap"><div class="gantt" style="--cols:${win.cols}" data-start="${escAttr(win.start)}" data-unit="${escAttr(win.unit)}">` +
    `${head}<ol class="g-rows">${today}${rowsHtml}</ol></div></div>${legend}`;
  return sectionShell(section, body);
}

// {LANE} — the Today .item row reused; ids are the gantt bars' targets
function renderLane(section) {
  const items = (section.blocks || []).map((it, i) => {
    const title = it.href ? `<a href="${escAttr(it.href)}">${esc(it.title)}</a>` : esc(it.title);
    const tag = it.tag ? ` <span class="tag fill">${esc(it.tag)}</span>` : '';
    const cs = it.cites && it.cites.length ? `<p class="cites">${it.cites.map(cite).join('')}</p>` : '';
    const d = it.disc ? disc(it.discHead || "What's involved", null, `<p>${esc(it.disc)}</p>`, false) : '';
    return `<li class="item" id="${escAttr(it.id)}"><span class="item-n">${i + 1}</span>` +
      `<div class="body"><div class="t">${title}${tag}</div>` +
      `<div class="d">${esc(it.d)}</div>${cs}${d}</div></li>`;
  }).join('');
  return sectionShell(section, `<ol class="list lane-list">${items}</ol>`);
}

// {DISPATCH}
const LAYOUTS = {
  timeline: renderTimeline,
  state: renderState,
  ask: renderAsk,
  whatsnew: renderWhatsnew,
  tldr: renderTldr,
  goal: renderGoal,
  primer: renderPrimer,
  glossary: renderGlossary,
  pipeline: renderPipeline,
  gantt: renderGantt,
  lane: renderLane,
  prose: renderGeneric,
  generic: renderGeneric
};
export function renderSection(section) {
  const fn = LAYOUTS[section.layout] || renderGeneric; // unknown layout -> prose
  return fn(section);
}
export function renderSections(data) {
  return (data.sections || []).map(renderSection).join('');
}

// {BODY} — the whole document body from data: the no-JS nav, the six tab panels
// (sections grouped by their `tab`), and the dial. The LLM writes data only; the
// fixed chrome the skill used to hand-copy ("emit it exactly") is generated here,
// so it can never drift. #panel-today is filled by the daily-brief fragment,
// which is trusted skill output passed in as todayHtml — the one raw-HTML input.
const TABS = [
  { tab: 'today', panel: 'panel-today', id: 'tab-today', icon: 'i-sun', label: 'Today', short: 'Today' },
  { tab: 'whatsnew', panel: 'panel-whatsnew', id: 'tab-whatsnew', icon: 'i-pulse', label: "What's New", short: "What's New" },
  { tab: 'orientation', panel: 'panel-orientation', id: 'tab-orientation', icon: 'i-compass', label: 'Orientation', short: 'Orientation' },
  { tab: 'project', panel: 'panel-project', id: 'tab-project', icon: 'i-layers', label: 'Project', short: 'Project' },
  { tab: 'timeline', panel: 'panel-timeline', id: 'tab-timeline', icon: 'i-clock', label: 'Timeline', short: 'Timeline' },
  { tab: 'you', panel: 'panel-you', id: 'tab-you', icon: 'i-user', label: 'You', short: 'You' }
];
export function renderBody(data, todayHtml = '') {
  const sections = data.sections || [];
  const present = TABS.filter((t) => t.tab === 'today' ? true : sections.some((s) => s.tab === t.tab));
  const nav = `<nav class="nojs-nav wrap" aria-label="Sections">` +
    present.map((t) => `<a href="#${t.panel}">${esc(t.label)}</a>`).join('') + `</nav>`;
  const panels = present.map((t) => {
    const content = t.tab === 'today' ? todayHtml
      : sections.filter((s) => s.tab === t.tab).map(renderSection).join('');
    return `<div class="panel" role="tabpanel" id="${t.panel}" aria-labelledby="${t.id}">${content}</div>`;
  }).join('');
  const tabs = present.map((t, i) =>
    `<button class="dial-tab" type="button" role="tab" id="${t.id}" aria-controls="${t.panel}" ` +
    `aria-selected="${i === 0 ? 'true' : 'false'}" tabindex="${i === 0 ? '0' : '-1'}" data-short="${escAttr(t.short)}">` +
    `${icon(t.icon)}<span class="dial-tab-t">${esc(t.label)}</span></button>`).join('');
  const m = data.meta || {};
  const first = present[0];
  const dial = `<div class="dial"><div class="dial-pop" id="doc-dial-pop" role="tablist" ` +
    `aria-orientation="vertical" aria-label="Sections" hidden>${tabs}` +
    `<div class="dial-id"><span class="dial-name">${esc(m.project || '')}</span>` +
    `<span class="dial-meta">updated ${esc(m.updatedAt || '')}</span></div></div>` +
    `<button class="dial-btn" type="button" id="doc-dial-btn" aria-expanded="false" ` +
    `aria-controls="doc-dial-pop" aria-label="Sections">${icon(first.icon)}` +
    `<span class="dial-cur">${esc(first.short)}</span>` +
    `<svg class="ic ic-s dial-caret" aria-hidden="true"><use href="#i-chev"/></svg></button></div>`;
  return `${nav}<main class="wrap">${panels}</main>${dial}`;
}

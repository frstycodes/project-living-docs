import { renderSection, renderBody } from './doc-render.mjs';

const norm = (s) => s.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
let pass = 0, fail = 0;
function golden(name, got, want) {
  const a = norm(got), b = norm(want);
  if (a === b) { pass++; console.log('PASS', name); return; }
  fail++;
  console.log('FAIL', name);
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  console.log('  got : …' + a.slice(Math.max(0, i - 30), i + 70));
  console.log('  want: …' + b.slice(Math.max(0, i - 30), i + 70));
}
const sec = (id, title, body) => `<section class="sec" id="${id}"><h2>${title}</h2>${body}</section>`;

// ---- timeline: spark + filters + legend all derived from two events ----
golden('timeline', renderSection({
  id: 'timeline', tab: 'timeline', eyebrow: 'the record', icon: 'i-clock',
  title: 'How we got here', lead: 'Every fork, in order.', layout: 'timeline',
  blocks: [
    { kind: 'decision', iso: '2026-06-23', date: 'Jun 23', title: 'Airtable ruled out; AWS chosen',
      gist: 'Validation lives in the product instead.',
      cites: [{ kind: 'pr', raw: 'PR #53', url: 'https://github.com/acme/latitude/pull/53' }] },
    { kind: 'pivot', iso: '2026-06-28', date: 'Jun 28', title: 'Scope narrowed to US',
      gist: 'EU comparison dropped.',
      cites: [{ kind: 'slack', raw: 'thread', url: 'https://acme.slack.com/x' }] }
  ]
}), `
<section class="sec" id="timeline">
  <p class="eyebrow"><svg class="ic ic-s" aria-hidden="true"><use href="#i-clock"/></svg>the record</p>
  <h2>How we got here</h2><p class="sec-lead">Every fork, in order.</p>
  <ul class="tl-spark" aria-label="Events per month"><li style="--h:100"><a href="#tl-2026-06" aria-label="June 2026: 2 events"></a></li></ul>
  <div class="tl-spark-ax" aria-hidden="true"><span class="lbl">June</span></div>
  <div class="filters" id="tl-filters" role="group" aria-label="Filter timeline">
    <button type="button" data-filter="all" aria-pressed="true">All</button>
    <button type="button" data-filter="decision" aria-pressed="false">Decisions</button>
    <button type="button" data-filter="pivot" aria-pressed="false">Pivots</button></div>
  <div class="timeline" id="timeline-list"><section class="tl-month" id="tl-2026-06"><h3>June 2026</h3><ol>
    <li data-type="decision"><span class="t-date">Jun 23</span><span class="t-dot"></span><div class="t-body"><div class="t-head">
      <span class="pill decision"><svg class="ic ic-s" aria-hidden="true"><use href="#i-fork"/></svg>decision</span><span class="t-title">Airtable ruled out; AWS chosen</span></div>
      <p class="t-desc">Validation lives in the product instead.</p>
      <div class="t-src"><a class="cite" href="https://github.com/acme/latitude/pull/53" target="_blank" rel="noopener"><svg class="ic ic-b" aria-hidden="true"><use href="#i-github"/></svg><span class="tok">PR #53</span></a></div></div></li>
    <li data-type="pivot"><span class="t-date">Jun 28</span><span class="t-dot"></span><div class="t-body"><div class="t-head">
      <span class="pill pivot"><svg class="ic ic-s" aria-hidden="true"><use href="#i-pivot"/></svg>pivot</span><span class="t-title">Scope narrowed to US</span></div>
      <p class="t-desc">EU comparison dropped.</p>
      <div class="t-src"><a class="cite" href="https://acme.slack.com/x" target="_blank" rel="noopener"><svg class="ic ic-b" aria-hidden="true"><use href="#i-slack"/></svg>thread</a></div></div></li>
  </ol></section></div>
  <div class="legend">
    <span data-type="decision"><span class="t-dot"></span><svg class="ic ic-s" aria-hidden="true"><use href="#i-fork"/></svg><span class="lg-w">decision</span> — a choice was made</span>
    <span data-type="pivot"><span class="t-dot"></span><svg class="ic ic-s" aria-hidden="true"><use href="#i-pivot"/></svg><span class="lg-w">pivot</span> — a choice was reversed</span></div>
</section>`);

// ---- state: tile count derived from rows ----
golden('state', renderSection({
  id: 'state', tab: 'project', eyebrow: 'where things stand', icon: 'i-layers',
  title: '36 territories, 9 to go', lead: 'Shipped, stuck, at risk.', layout: 'state',
  blocks: [{ state: 'blocked', rows: [
    { title: 'Post-approval corrections', status: 'notstarted', gist: 'Waiting on a decision.', flag: true,
      cites: [{ kind: 'bead', raw: 'BEAD-0082' }] }] }]
}), `
<section class="sec" id="state">
  <p class="eyebrow"><svg class="ic ic-s" aria-hidden="true"><use href="#i-layers"/></svg>where things stand</p>
  <h2>36 territories, 9 to go</h2><p class="sec-lead">Shipped, stuck, at risk.</p>
  <div class="tiles"><button class="tile is-blocked" type="button" data-state="blocked" aria-pressed="false"><span class="tile-n">1</span><span class="tile-k"><svg class="ic ic-s" aria-hidden="true"><use href="#i-block"/></svg>Blocked</span></button></div>
  <div class="state-group" data-state="blocked"><h3><svg class="ic ic-s" aria-hidden="true"><use href="#i-block"/></svg>Blocked</h3><div class="rows">
    <div class="row"><span class="row-t">Post-approval corrections <span class="pill notstarted"><svg class="ic ic-s" aria-hidden="true"><use href="#i-block"/></svg>not started</span></span><span class="row-m"><span class="cite"><svg class="ic ic-s" aria-hidden="true"><use href="#i-bead"/></svg><span class="tok">BEAD-0082</span></span></span><span class="row-g">Waiting on a decision. <span class="pill flag">new</span></span></div>
  </div></div></section>`);

// ---- generic: unknown layout -> prose, and escaping ----
golden('generic+escaping', renderSection({
  id: 'notes', tab: 'project', eyebrow: 'aside', title: 'Deploy topology', lead: 'Where it runs.',
  layout: 'made-up-layout',
  blocks: [{ type: 'p', text: 'Two <regions> & a CDN.' }, { type: 'callout', variant: 'quiet', text: 'Staging mirrors prod.' }]
}), `
<section class="sec" id="notes"><p class="eyebrow">aside</p><h2>Deploy topology</h2><p class="sec-lead">Where it runs.</p>
  <p>Two &lt;regions&gt; &amp; a CDN.</p><div class="callout quiet"><p>Staging mirrors prod.</p></div></section>`);

// ---- whatsnew ----
golden('whatsnew', renderSection({
  id: 'whatsnew', title: "What's new", layout: 'whatsnew',
  blocks: { runs: [{ iso: '2026-07-24', date: '24 July', time: '09:26 NPT', sources: 'slack · github', latest: true,
    bullets: [{ kind: 'dec', strong: 'Market homepage is in scope.', text: 'Validated on the EDF call.',
      cites: [{ kind: 'slack', raw: 'thread', url: 'https://acme.slack.com/x' }], goto: { target: 'timeline', label: 'Timeline' } }] }],
    srcNote: 'Compiled from Slack, GitHub.' }
}), sec('whatsnew', "What's new",
  `<div class="wn"><article class="wn-run is-latest"><header class="wn-when"><time class="wn-d" datetime="2026-07-24">24 July</time><span class="lbl">09:26 NPT</span><span class="lbl">slack · github</span></header><ul class="wn-bul"><li><span class="wn-k dec"><svg class="ic ic-s" aria-hidden="true"><use href="#i-fork"/></svg>Decision</span><p class="wn-x"><strong>Market homepage is in scope.</strong> Validated on the EDF call.</p><p class="wn-m"><a class="cite" href="https://acme.slack.com/x" target="_blank" rel="noopener"><svg class="ic ic-b" aria-hidden="true"><use href="#i-slack"/></svg>thread</a><a class="goto" href="#timeline">Timeline<svg class="ic ic-s" aria-hidden="true"><use href="#i-arrow"/></svg></a></p></li></ul></article></div><p class="src-note">Compiled from Slack, GitHub.</p>`));

// ---- tldr ----
golden('tldr', renderSection({
  id: 'tldr', title: 'TL;DR', layout: 'tldr',
  blocks: { tiles: [{ n: 36, label: 'US territories', gist: 'compared apples-to-apples' }, { n: 9, label: 'weeks to launch', risk: true }],
    key: 'Nine weeks. Watch the answer-key audit.', long: 'Full context here.', longGist: 'What it is.' }
}), sec('tldr', 'TL;DR',
  `<div class="tiles"><div class="tile is-done"><span class="tile-n">36</span><span class="tile-k">US territories</span><span class="tile-g">compared apples-to-apples</span></div><div class="tile is-risk"><span class="tile-n">9</span><span class="tile-k">weeks to launch</span></div></div><div class="callout key"><p>Nine weeks. Watch the answer-key audit.</p></div><details class="disc flat"><summary><span class="disc-t">The long version</span><span class="disc-g">What it is.</span><svg class="disc-i" aria-hidden="true"><use href="#i-chev"/></svg></summary><div class="disc-body"><p>Full context here.</p></div></details>`));

// ---- goal ----
golden('goal', renderSection({
  id: 'goal', title: 'The goal', layout: 'goal',
  blocks: { current: '36 US territories, apples-to-apples, by launch.',
    shifts: [{ date: 'Jul 1', kind: 'pivot', title: 'Scope narrowed to US', verdict: 'EU is out.', why: 'Confirmed on the call.',
      cites: [{ kind: 'pr', raw: 'PR #12', url: 'https://github.com/a/b/pull/12' }] }],
    historical: 'Originally global.' }
}), sec('goal', 'The goal',
  `<div class="callout key"><p>36 US territories, apples-to-apples, by launch.</p></div><div class="decisions"><details class="disc"><summary><span class="dec-date">Jul 1</span><span class="dec-t">Scope narrowed to US <span class="pill pivot"><svg class="ic ic-s" aria-hidden="true"><use href="#i-pivot"/></svg>pivot</span></span><span class="dec-v">EU is out.</span><svg class="disc-i" aria-hidden="true"><use href="#i-chev"/></svg></summary><div class="disc-body"><h4>Why</h4><p>Confirmed on the call.</p><p class="cites"><a class="cite" href="https://github.com/a/b/pull/12" target="_blank" rel="noopener"><svg class="ic ic-b" aria-hidden="true"><use href="#i-github"/></svg><span class="tok">PR #12</span></a></p></div></details></div><div class="callout quiet"><p>Originally global.</p></div>`));

// ---- primer ----
golden('primer', renderSection({
  id: 'primer', title: 'Primer', layout: 'primer',
  blocks: [{ q: 'Why append-only?', a: 'So corrections never erase.', body: 'The ledger keeps every version.' }]
}), sec('primer', 'Primer',
  `<div class="qa"><details class="disc"><summary><span class="qa-q">Why append-only?</span><span class="qa-a">So corrections never erase.</span><svg class="disc-i" aria-hidden="true"><use href="#i-chev"/></svg></summary><div class="disc-body"><p>The ledger keeps every version.</p></div></details></div>`));

// ---- glossary: letter rail derived from terms ----
golden('glossary', renderSection({
  id: 'glossary', title: 'Glossary', layout: 'glossary',
  blocks: [{ name: 'Framework', terms: [
    { term: 'Demand ratchet', def: 'A billing floor set by a past peak.' },
    { term: 't1ExplicitGw', def: 'Tier-one load, explicit GW.', code: true }] }]
}), sec('glossary', 'Glossary',
  `<div class="gtools"><div class="gsearch-wrap"><svg class="ic ic-s" aria-hidden="true"><use href="#i-search"/></svg><input class="gsearch" id="gsearch" type="search" placeholder="Filter terms…" aria-label="Filter glossary terms"></div><div class="galpha" id="galpha" role="group" aria-label="Jump to letter"><button type="button" data-letter="D" aria-pressed="false">D</button><button type="button" data-letter="T" aria-pressed="false">T</button></div></div><div class="gcat"><h3>Framework</h3><dl class="gterms"><div class="gterm"><dt>Demand ratchet</dt><dd>A billing floor set by a past peak.</dd></div><div class="gterm"><dt><code>t1ExplicitGw</code></dt><dd>Tier-one load, explicit GW.</dd></div></dl></div><p class="gempty" id="gempty" hidden>No terms match that filter.</p>`));

// ---- pipeline: numbered, arrows, last has none ----
golden('pipeline', renderSection({
  id: 'architecture', title: 'Architecture', layout: 'pipeline',
  blocks: [{ title: 'Extract', gist: 'Claude reads the PDF', detail: 'Runs in the worker.' },
    { title: 'Store', gist: 'Typed JSON to Postgres', detail: 'Append-only.' }]
}), sec('architecture', 'Architecture',
  `<div class="pipe-wrap"><div class="pipe-rail"><ol class="pipe"><li><button class="stage-btn" type="button" aria-expanded="false" aria-controls="stage-extract"><span class="stage-n">01</span><span class="stage-t">Extract</span><span class="stage-g">Claude reads the PDF</span></button><svg class="pipe-arrow" aria-hidden="true"><use href="#i-arrow"/></svg></li><li><button class="stage-btn" type="button" aria-expanded="false" aria-controls="stage-store"><span class="stage-n">02</span><span class="stage-t">Store</span><span class="stage-g">Typed JSON to Postgres</span></button></li></ol></div><div class="pipe-detail"><div class="stage-d" id="stage-extract" hidden><h4>01 · Extract</h4><p>Runs in the worker.</p></div><div class="stage-d" id="stage-store" hidden><h4>02 · Store</h4><p>Append-only.</p></div></div></div>`));

// ---- gantt: axis month band + day band derived from window ----
golden('gantt', renderSection({
  id: 'lane', title: 'Your lane', layout: 'gantt',
  blocks: { window: { start: '2026-05-04', unit: 'week', cols: 12, todayC1: 11, vh: 'Columns are weeks.' },
    rows: [{ title: 'Territory ingest', laneId: 'lane-2', status: 'blocked', c1: 9, span: 4,
      dep: 'waits on answer key', vh: 'Territory ingest, blocked, week 9 to 12.' }] }
}), sec('lane', 'Your lane',
  `<div class="gantt-wrap"><div class="gantt" style="--cols:12" data-start="2026-05-04" data-unit="week"><div class="g-head"><span></span><div class="g-axis"><div class="g-ticks g-months"><span class="g-tick" style="--c1:1;--span:4">May</span><span class="g-tick" style="--c1:5;--span:5">Jun</span><span class="g-tick" style="--c1:10;--span:3">Jul</span></div><div class="g-ticks g-days"><span class="g-tick" style="--c1:1">4</span><span class="g-tick" style="--c1:2">11</span><span class="g-tick" style="--c1:3">18</span><span class="g-tick" style="--c1:4">25</span><span class="g-tick" style="--c1:5">1</span><span class="g-tick" style="--c1:6">8</span><span class="g-tick" style="--c1:7">15</span><span class="g-tick" style="--c1:8">22</span><span class="g-tick" style="--c1:9">29</span><span class="g-tick" style="--c1:10">6</span><span class="g-tick" style="--c1:11">13</span><span class="g-tick" style="--c1:12">20</span></div><span class="vh">Columns are weeks.</span></div></div><ol class="g-rows"><span class="g-today" style="--c1:11"></span><li class="g-row" data-status="blocked"><span class="g-lab">Territory ingest<span class="g-dep"><svg class="ic ic-s" aria-hidden="true"><use href="#i-link"/></svg>waits on answer key</span></span><span class="g-track"><a class="g-bar" href="#lane-2" style="--c1:9;--span:4"><svg class="ic ic-s" aria-hidden="true"><use href="#i-block"/></svg><span>Blocked</span><span class="vh">Territory ingest, blocked, week 9 to 12.</span></a></span></li></ol></div></div><div class="g-legend"><span><span class="g-key" aria-hidden="true"></span><svg class="ic ic-s" aria-hidden="true"><use href="#i-ship"/></svg>shipped</span><span><span class="g-key k-flight" aria-hidden="true"></span><svg class="ic ic-s" aria-hidden="true"><use href="#i-flight"/></svg>in flight</span><span><span class="g-key k-blocked" aria-hidden="true"></span><svg class="ic ic-s" aria-hidden="true"><use href="#i-block"/></svg>blocked</span><span><span class="g-key k-risk" aria-hidden="true"></span><svg class="ic ic-s" aria-hidden="true"><use href="#i-alert"/></svg>at risk</span></div>`));

// ---- lane list ----
golden('lane', renderSection({
  id: 'lanelist', title: 'Lane list', layout: 'lane',
  blocks: [{ id: 'lane-1', title: 'Analyst review screen', href: 'https://x.y/1', tag: 'due Aug 7',
    d: 'Slice 4 in draft.', cites: [{ kind: 'bead', raw: 'BEAD-1' }], disc: 'Full context.' }]
}), sec('lanelist', 'Lane list',
  `<ol class="list lane-list"><li class="item" id="lane-1"><span class="item-n">1</span><div class="body"><div class="t"><a href="https://x.y/1">Analyst review screen</a> <span class="tag fill">due Aug 7</span></div><div class="d">Slice 4 in draft.</div><p class="cites"><span class="cite"><svg class="ic ic-s" aria-hidden="true"><use href="#i-bead"/></svg><span class="tok">BEAD-1</span></span></p><details class="disc"><summary><span class="disc-t">What's involved</span><svg class="disc-i" aria-hidden="true"><use href="#i-chev"/></svg></summary><div class="disc-body"><p>Full context.</p></div></details></div></li></ol>`));

// ---- body: nav + panels grouped by tab + dial, all chrome from data ----
golden('body', renderBody({
  meta: { project: 'Latitude', updatedAt: '24 Jul' },
  sections: [{ id: 'arch', tab: 'project', title: 'Arch', layout: 'prose', blocks: [{ type: 'p', text: 'hi' }] }]
}, '<section>brief</section>'),
`<nav class="nojs-nav wrap" aria-label="Sections"><a href="#panel-today">Today</a><a href="#panel-project">Project</a></nav>` +
`<main class="wrap">` +
`<div class="panel" role="tabpanel" id="panel-today" aria-labelledby="tab-today"><section>brief</section></div>` +
`<div class="panel" role="tabpanel" id="panel-project" aria-labelledby="tab-project"><section class="sec" id="arch"><h2>Arch</h2><p>hi</p></section></div>` +
`</main>` +
`<div class="dial"><div class="dial-pop" id="doc-dial-pop" role="tablist" aria-orientation="vertical" aria-label="Sections" hidden>` +
`<button class="dial-tab" type="button" role="tab" id="tab-today" aria-controls="panel-today" aria-selected="true" tabindex="0" data-short="Today"><svg class="ic ic-s" aria-hidden="true"><use href="#i-sun"/></svg><span class="dial-tab-t">Today</span></button>` +
`<button class="dial-tab" type="button" role="tab" id="tab-project" aria-controls="panel-project" aria-selected="false" tabindex="-1" data-short="Project"><svg class="ic ic-s" aria-hidden="true"><use href="#i-layers"/></svg><span class="dial-tab-t">Project</span></button>` +
`<div class="dial-id"><span class="dial-name">Latitude</span><span class="dial-meta">updated 24 Jul</span></div></div>` +
`<button class="dial-btn" type="button" id="doc-dial-btn" aria-expanded="false" aria-controls="doc-dial-pop" aria-label="Sections"><svg class="ic ic-s" aria-hidden="true"><use href="#i-sun"/></svg><span class="dial-cur">Today</span><svg class="ic ic-s dial-caret" aria-hidden="true"><use href="#i-chev"/></svg></button></div>`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

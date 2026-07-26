import { renderSection, renderBody } from './doc-render.mjs';
import { parseSection, parseDoc } from './doc-migrate.mjs';

// stable stringify (sorted keys) so key order never causes a false diff
function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
let pass = 0, fail = 0;
function roundtrip(name, section) {
  const back = parseSection(renderSection(section));
  delete back.tab; // tab comes from the panel in parseDoc, not a lone section
  const a = stable(section), b = stable(back);
  if (a === b) { pass++; console.log('PASS', name); return; }
  fail++;
  console.log('FAIL', name, '\n  in : ', a, '\n  out: ', b);
}

roundtrip('timeline', {
  id: 'timeline', eyebrow: 'the record', icon: 'i-clock', title: 'How we got here', lead: 'Every fork.', layout: 'timeline',
  blocks: [
    { kind: 'decision', iso: '2026-06-23', date: 'Jun 23', title: 'Airtable out', gist: 'AWS chosen',
      cites: [{ kind: 'pr', raw: 'PR #53', url: 'https://github.com/a/b/pull/53' }] },
    { kind: 'pivot', iso: '2026-06-28', date: 'Jun 28', title: 'US only', gist: 'EU dropped', body: 'The long why.' }
  ]
});

roundtrip('state', {
  id: 'state', title: 'State', layout: 'state',
  blocks: [{ state: 'blocked', rows: [
    { title: 'Corrections', status: 'notstarted', gist: 'Waiting.', flag: true, cites: [{ kind: 'bead', raw: 'BEAD-1' }] }] }]
});

roundtrip('ask', {
  id: 'ask', title: 'Ask', layout: 'ask',
  blocks: {
    open: [{ q: 'What is the API contract?', who: 'Iván owns it', ctx: 'Blocks slice 4.' }],
    done: [{ q: 'Is the secret fixed?', answer: 'Yes, Jul 18.', cites: [{ kind: 'slack', raw: 'thread', url: 'https://x.slack.com/1' }] }]
  }
});

roundtrip('lane', {
  id: 'lanelist', title: 'Lane', layout: 'lane',
  blocks: [{ id: 'lane-1', title: 'Review screen', href: 'https://x.y/1', tag: 'due Aug 7', d: 'In draft.',
    cites: [{ kind: 'bead', raw: 'BEAD-2' }], disc: 'Full context.' }]
});

roundtrip('gantt', {
  id: 'lane', title: 'Lane', layout: 'gantt',
  blocks: { window: { start: '2026-05-04', unit: 'week', cols: 12, todayC1: 11, vh: 'Columns are weeks.' },
    rows: [{ title: 'Ingest', laneId: 'lane-1', status: 'blocked', c1: 9, span: 4, dep: 'waits on key', vh: 'Ingest, blocked.' }] }
});

roundtrip('whatsnew', {
  id: 'whatsnew', title: 'New', layout: 'whatsnew',
  blocks: { runs: [{ iso: '2026-07-24', date: '24 July', time: '09:26 NPT', sources: 'slack · github', latest: true,
    bullets: [{ kind: 'dec', strong: 'Homepage in scope.', text: 'Validated.',
      cites: [{ kind: 'slack', raw: 'thread', url: 'https://x.slack.com/2' }], goto: { target: 'timeline', label: 'Timeline' } }] }],
    srcNote: 'Compiled from Slack.' }
});

roundtrip('goal', {
  id: 'goal', title: 'Goal', layout: 'goal',
  blocks: { current: '36 US territories by launch.',
    shifts: [{ date: 'Jul 1', kind: 'pivot', title: 'US only', verdict: 'EU out.', why: 'Confirmed.',
      cites: [{ kind: 'pr', raw: 'PR #12', url: 'https://github.com/a/b/pull/12' }] }],
    historical: 'Originally global.' }
});

roundtrip('tldr', {
  id: 'tldr', title: 'TLDR', layout: 'tldr',
  blocks: { tiles: [{ n: '36', label: 'territories', gist: 'compared' }, { n: '9', label: 'weeks', risk: true }],
    key: 'Nine weeks left.', long: 'Full context.', longGist: 'What it is.' }
});

roundtrip('primer', {
  id: 'primer', title: 'Primer', layout: 'primer',
  blocks: [{ q: 'Why append-only?', a: 'No erasing.', body: 'Keeps versions.' }]
});

roundtrip('glossary', {
  id: 'glossary', title: 'Glossary', layout: 'glossary',
  blocks: [{ name: 'Framework', terms: [
    { term: 'Demand ratchet', def: 'A floor.' }, { term: 't1ExplicitGw', def: 'Load.', code: true }] }]
});

roundtrip('pipeline', {
  id: 'architecture', title: 'Arch', layout: 'pipeline',
  blocks: [{ title: 'Extract', gist: 'reads PDF', detail: 'in worker' }, { title: 'Store', gist: 'to PG', detail: 'append-only' }]
});

roundtrip('prose', {
  id: 'notes', eyebrow: 'aside', title: 'Topology', lead: 'Where it runs.', layout: 'prose',
  blocks: [{ type: 'p', text: 'Two regions & a CDN.' }, { type: 'callout', variant: 'quiet', text: 'Staging mirrors prod.' },
    { type: 'disc', title: 'Deploy detail', gist: 'the how', body: 'Blue-green.' }]
});

// ---- full document: parseDoc recovers sections (with tab) + meta ----
const docData = {
  meta: { project: 'Latitude', tagline: '', timezone: '', locale: '', updatedAt: '24 Jul 2026' },
  sections: [
    { id: 'arch', tab: 'project', title: 'Architecture', layout: 'prose', blocks: [{ type: 'p', text: 'Two services.' }] },
    { id: 'tl', tab: 'timeline', title: 'Timeline', layout: 'timeline',
      blocks: [{ kind: 'build', iso: '2026-06-01', date: 'Jun 1', title: 'Shipped ingest' }] }
  ]
};
const doc = parseDoc(renderBody(docData));
{
  const a = stable(docData), b = stable(doc);
  if (a === b) { pass++; console.log('PASS parseDoc'); }
  else { fail++; console.log('FAIL parseDoc', '\n  in : ', a, '\n  out: ', b); }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

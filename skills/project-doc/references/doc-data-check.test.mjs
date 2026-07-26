import { validateData } from './doc-data-check.mjs';

let pass = 0, fail = 0;
function expect(name, data, previews, wantSubstr) {
  const { errors } = validateData(data, previews);
  const hit = wantSubstr === null ? errors.length === 0 : errors.some((e) => e.includes(wantSubstr));
  if (hit) { pass++; console.log('PASS', name); return; }
  fail++;
  console.log('FAIL', name, '\n  wanted:', wantSubstr, '\n  got   :', JSON.stringify(errors));
}

// a valid document, cross-refs intact
const good = {
  meta: { project: 'X' },
  sections: [
    { id: 'whatsnew', title: "What's new", layout: 'whatsnew',
      blocks: { runs: [{ iso: '2026-07-24', date: '24 Jul', time: '9am', sources: 'slack', latest: true,
        bullets: [{ kind: 'dec', text: 'a', goto: { target: 'timeline', label: 'Timeline' },
          cites: [{ key: 'pr-1', kind: 'pr', raw: 'PR #1', url: 'https://x', preview: {} }] }] }] } },
    { id: 'timeline', title: 'Timeline', layout: 'timeline',
      blocks: [{ kind: 'pivot', iso: '2026-06-01', date: 'Jun 1', title: 't' }] },
    { id: 'lane', title: 'Lane', layout: 'gantt',
      blocks: { window: { start: '2026-05-04', unit: 'week', cols: 12 },
        rows: [{ title: 'r', laneId: 'lane-1', status: 'blocked', c1: 1, span: 4, vh: 'v' }] } },
    { id: 'lanelist', title: 'Lane list', layout: 'lane',
      blocks: [{ id: 'lane-1', title: 'i', d: 'x' }] }
  ]
};
expect('valid document', good, { 'pr-1': {} }, null);

const clone = () => JSON.parse(JSON.stringify(good));

let d = clone(); d.sections[1].blocks[0].kind = 'nonsense';
expect('unknown timeline kind', d, { 'pr-1': {} }, 'not a known type');

d = clone(); d.sections[1].blocks[0].iso = 'yesterday';
expect('non-ISO event date', d, { 'pr-1': {} }, 'no ISO iso');

d = clone(); d.sections[2].blocks.rows[0].laneId = 'lane-999';
expect('gantt bar targets missing lane item', d, { 'pr-1': {} }, 'matches no lane item');

d = clone(); d.sections[2].blocks.rows[0].span = 4.5;
expect('non-integer gantt span', d, { 'pr-1': {} }, 'must be integers');

d = clone(); d.sections[0].blocks.runs.push({ iso: '2026-07-25', bullets: [], latest: true });
expect('two latest runs', d, { 'pr-1': {} }, 'expected exactly 1');

d = clone();
expect('cite promises preview with no payload', d, {}, 'no entry');

d = clone(); d.sections[3].blocks[0].id = '';
expect('lane item without id', d, { 'pr-1': {} }, 'an item has no id');

d = clone(); d.sections.push({ id: 'timeline', title: 'dup', layout: 'prose', blocks: [] });
expect('duplicate section id', d, { 'pr-1': {} }, 'duplicate section id');

d = clone(); d.sections[3].blocks[0].watch = { kind: 'jira', ref: 'X-1' };
expect('bad watch kind', d, { 'pr-1': {} }, 'watch.kind must be pr|bead');

d = clone(); d.sections[3].blocks[0].watch = { kind: 'pr', ref: 'acme/x#5' };
expect('valid watch passes', d, { 'pr-1': {} }, null);

expect('empty document', { sections: [] }, {}, 'no sections');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

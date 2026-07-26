/* project-doc block slicer — LOCKED.
   Pulls an inline JSON block out of a fetched document WITHOUT the rendered
   markup ever entering the model's context. At high cadence (15-min, 5-min) the
   whole published Artifact is hundreds of KB of HTML/CSS/JS/sprites; reading that
   into context each run is the dominant cost. A run instead fetches the document
   programmatically (curl/bash), slices out just #doc-data / #doc-state with this,
   and the model patches that small JSON. Per-run cost scales with #doc-data size,
   not document size.

   Usage:
     node doc-slice.mjs <cache.html> doc-data              # prints the block's JSON text
     node doc-slice.mjs <cache.html> doc-state doc-data    # prints {"doc-state":…,"doc-data":…}
*/

export function sliceBlock(html, id) {
  const m = String(html).match(new RegExp(
    `<script type="application/json" id="${id}">([\\s\\S]*?)</script>`));
  return m ? m[1] : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(process.argv[2], 'utf8');
  const ids = process.argv.slice(3);
  if (ids.length <= 1) {
    process.stdout.write((sliceBlock(html, ids[0] || 'doc-data') || '') + '\n');
  } else {
    const out = {};
    for (const id of ids) { try { out[id] = JSON.parse(sliceBlock(html, id)); } catch { out[id] = null; } }
    process.stdout.write(JSON.stringify(out) + '\n');
  }
}

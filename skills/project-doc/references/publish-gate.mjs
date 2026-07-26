#!/usr/bin/env node
/* project-doc publish gate — LOCKED.
   Usage: node publish-gate.mjs <path-to-index.html>

   The single command that stands between a build and the Artifact. It runs
   check.mjs; ONLY if check.mjs exits clean does it print a PUBLISH-OK line
   carrying the sha256 of the exact bytes on disk. On any error it prints the
   check output, a blunt refusal, and exits non-zero.

   The contract the skill enforces: never publish a file this gate did not bless,
   and publish EXACTLY the bytes it hashed — do not edit the file after the gate
   ran. That is what makes "run check.mjs before publishing" airtight instead of
   advisory: there is one go/no-go, it is machine-checked, and it names the bytes. */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const path = process.argv[2];
if (!path) { console.error('usage: node publish-gate.mjs <path-to-index.html>'); process.exit(2); }

const here = dirname(fileURLToPath(import.meta.url));
const check = join(here, 'check.mjs');

let clean = true;
try {
  // inherit stdio so check.mjs's own warnings and errors show through verbatim
  execFileSync(process.execPath, [check, path], { stdio: 'inherit' });
} catch {
  clean = false;
}

if (!clean) {
  console.log('\n⛔ DO NOT PUBLISH — check.mjs found at least one error above.');
  console.log('   Fix #doc-data and re-render, then run this gate again.');
  process.exit(1);
}

const sha = createHash('sha256').update(readFileSync(path)).digest('hex');
console.log(`\n✅ PUBLISH-OK  sha256=${sha}`);
console.log('   Publish EXACTLY this file to the Artifact. Do not edit it after this line —');
console.log('   any change re-opens the gate, so re-run this command on the final bytes.');
process.exit(0);

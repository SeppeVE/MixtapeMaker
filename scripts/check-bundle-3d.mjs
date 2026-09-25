#!/usr/bin/env node
// Bundle check for the 3D library (Stage 7). Run after `npm run build`:
//
//   npm run build && npm run check:bundle-3d
//   BUDGET_KB=400 npm run check:bundle-3d     (gzip budget for the 3D view's code, default 350)
//
// Reads .output/public/_nuxt and follows the chunks' imports:
//   - three.js must not be reachable through static imports from the app's entry
//     (it may only load when the 3D view mounts);
//   - the 3D view's own code (everything only it reaches, dynamic imports included)
//     must fit the gzip budget. pdf-lib is listed apart: it only loads for Print,
//     and the 2D library's PDF export uses the same chunk.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const DIR = new URL('../.output/public/_nuxt/', import.meta.url).pathname;
const BUDGET_KB = Number(process.env.BUDGET_KB ?? 350);

let failures = 0;
function check(ok, label, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

let files;
try {
  files = readdirSync(DIR).filter((f) => f.endsWith('.js'));
} catch {
  console.error(`No build found in ${DIR}. Run \`npm run build\` first.`);
  process.exit(1);
}
const source = Object.fromEntries(files.map((f) => [f, readFileSync(DIR + f, 'utf8')]));
const ref = (f) => new RegExp(`["/]${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`);
const staticImports = (f) => [...source[f].matchAll(/(?:from|import)\s*"\.\/([^"]+\.js)"/g)].map((m) => m[1]).filter((x) => source[x]);
const dynamicImports = (f) => [...source[f].matchAll(/import\(\s*"\.\/([^"]+\.js)"\s*\)/g)].map((m) => m[1]).filter((x) => source[x]);
// Vite's preload helper lists the chunks a dynamic import pulls in; those are dynamic too.
const mapDeps = (f) => [...source[f].matchAll(/"\.\/([^"]+\.js)"/g)].map((m) => m[1]).filter((x) => source[x]);

function closure(roots, edges) {
  const seen = new Set();
  const stack = [...roots];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    stack.push(...edges(f));
  }
  return seen;
}

const size = (set) => {
  let raw = 0;
  let gz = 0;
  for (const f of set) {
    raw += statSync(DIR + f).size;
    gz += gzipSync(source[f]).length;
  }
  return { raw, gz };
};
const kb = (n) => `${(n / 1024).toFixed(0)} kB`;

// three.js: its core and module chunks.
const three = files.filter((f) => source[f].includes('WebGLRenderer') || (source[f].includes('BufferGeometry') && source[f].length > 150_000));
check(three.length > 0, 'found the three.js chunks', three.map((f) => `${f} ${kb(source[f].length)}`).join(', '));

// Entry: the chunk nothing else refers to that loads the pages.
const roots = files.filter((f) => !files.some((g) => g !== f && ref(f).test(source[g])));
const entry = roots.filter((f) => source[f].includes('__vite__mapDeps')).sort((a, b) => source[b].length - source[a].length)[0];
check(!!entry, 'found the app entry', entry);
const entryStatic = closure([entry], staticImports);
const leaked = three.filter((f) => entryStatic.has(f));
check(leaked.length === 0, 'three.js is not in the entry\'s static imports', leaked.join(', ') || `${entryStatic.size} chunks, ${kb(size(entryStatic).gz)} gzip`);

// The 3D view: the Library3D component's chunk, and every chunk it reaches.
const library3d = files.find((f) => source[f].includes('lib3d-canvas'));
check(!!library3d, 'found the Library3D chunk', library3d);
const viewStatic = closure([library3d], staticImports);
const leakedView = three.filter((f) => viewStatic.has(f));
check(leakedView.length === 0, 'three.js loads only when the 3D view mounts (dynamic import)', leakedView.join(', '));
const viewAll = closure([library3d], (f) => [...new Set([...staticImports(f), ...dynamicImports(f), ...mapDeps(f)])]);
const onPrint = new Set([...viewAll].filter((f) => !entryStatic.has(f) && source[f].includes('PDFDocument')));
const own = new Set([...viewAll].filter((f) => !entryStatic.has(f) && !onPrint.has(f)));
const total = size(own);
const threeSize = size(new Set(three));
check(total.gz <= BUDGET_KB * 1024, `3D view code within ${BUDGET_KB} kB gzip`,
  `${own.size} chunks, ${kb(total.raw)} raw / ${kb(total.gz)} gzip, of which three.js ${kb(threeSize.raw)} / ${kb(threeSize.gz)}`);
console.log(`info  largest: ${[...own].map((f) => [f, gzipSync(source[f]).length]).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f, n]) => `${f} ${kb(n)}`).join(', ')}`);
console.log(`info  pdf-lib for Print (on demand, shared with the 2D export): ${kb(size(onPrint).gz)} gzip`);

// Debug tooling stays out of production (Stage 8): the __cassette3d hooks, lil-gui, stats.js.
const debugChunks = files.filter((f) => /__cassette3d|lil-gui|"FPS","#0ff"/.test(source[f]));
check(debugChunks.length === 0, 'no debug hooks, lil-gui or stats.js in the build', debugChunks.join(', '));

// Assets it fetches.
const hdri = new URL('../.output/public/3d/hdri/studio.exr', import.meta.url).pathname;
try {
  console.log(`info  studio HDRI ${kb(statSync(hdri).size)} (fetched when the 3D view mounts)`);
} catch {
  check(false, 'studio HDRI is in the build', hdri);
}

console.log(failures ? `\n${failures} FAILED` : '\nAll passed.');
process.exit(failures ? 1 : 0);

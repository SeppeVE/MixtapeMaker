#!/usr/bin/env node
// End-to-end test of the stored J-card render cache (SUPABASE_SETUP.md step 3k)
// against a mocked Supabase: Playwright answers the app's auth, REST and storage
// requests, so the real upload / row update / stored-render paths run unchanged.
//
// Needs the dev server started with the dummy project URL the mock listens on:
//   NUXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NUXT_PUBLIC_SUPABASE_ANON_KEY=dummy npm run dev
//   npm run test:render-cache
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3100';
const SUPABASE = 'http://127.0.0.1:54321';
const OUT_DIR = new URL('../.screenshots/', import.meta.url).pathname;
const EXECUTABLE = process.env.CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER = '22222222-2222-4222-8222-222222222222';
const MIXTAPE_ID = '33333333-3333-4333-8333-333333333333';
const JCARD_ID = '44444444-4444-4444-8444-444444444444';

let failures = 0;
function check(ok, label, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

// --- Mock data ----------------------------------------------------------------------

const now = '2026-09-23T12:00:00.000Z';
const mixtapeRow = {
  id: MIXTAPE_ID, user_id: USER_ID, title: 'Mocked Cloud Tape', cassette_length: 90,
  side_a: [{ id: 's1', title: 'Heroes', artist: 'David Bowie', album: '', duration: 371, albumCover: '' }],
  side_b: [{ id: 's2', title: 'Dreams', artist: 'Fleetwood Mac', album: '', duration: 257, albumCover: '' }],
  created_at: now, updated_at: now, is_public: false, share_token: null, is_copy: false,
};
const content = (title) => ({
  flaps: 2, isReversed: false, shortBack: false, backgroundColor: '#d9c9a3', continuousBackground: false,
  flapContents: [`<h2 style="text-align:center"><span style="font-family: 'Bebas Neue'; font-size: 10mm">${title}</span></h2>`, '<p>Panel two</p>', '', '', '', ''],
  coverImageBehindContent: false, isFullCoverImage: false,
  spineTopContent: `<strong>${title}</strong>`, spineCenterContent: '', spineBottomContent: 'C90',
  backLeftContent: '<h4>Side A</h4><ol><li>Heroes</li></ol>', backRightContent: '<h4>Side B</h4><ol><li>Dreams</li></ol>',
});
const jcardRow = {
  id: JCARD_ID, user_id: USER_ID, mixtape_id: MIXTAPE_ID, title: 'Mocked card', content: content('FROM THE CLOUD'),
  created_at: now, updated_at: now, is_public: false, is_copy: false, copied_from_id: null, render: null,
};

// --- Mock Supabase ------------------------------------------------------------------

const files = new Map(); // storage path → { body, type }
const log = { uploads: [], patches: [], removed: [], downloads: [] };
const inserted = new Map(); // cards created by the editor during the test

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-expose-headers': 'content-range',
};
const json = (route, body, status = 200) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) });

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}
const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
const accessToken = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: USER_ID, role: 'authenticated', exp, aud: 'authenticated' })}.sig`;
const user = { id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'test@example.com', app_metadata: {}, user_metadata: {}, created_at: now };
const session = { access_token: accessToken, refresh_token: 'refresh', token_type: 'bearer', expires_in: 86400, expires_at: exp, user };

async function handle(route) {
  const req = route.request();
  const url = new URL(req.url());
  const method = req.method();
  if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const path = url.pathname;

  if (path.startsWith('/auth/v1/')) {
    if (path.endsWith('/user')) return json(route, user);
    if (path.endsWith('/token')) return json(route, session);
    return json(route, {});
  }

  if (path.startsWith('/rest/v1/')) {
    const table = path.slice('/rest/v1/'.length);
    const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
    if (table === 'mixtapes') return json(route, single ? mixtapeRow : [mixtapeRow]);
    if (table === 'jcards') {
      if (method === 'PATCH') {
        const body = req.postDataJSON();
        const id = url.searchParams.get('id')?.replace(/^eq\./, '');
        log.patches.push({ id, ...body });
        const target = id === JCARD_ID ? jcardRow : inserted.get(id);
        if (target) Object.assign(target, body);
        return single ? json(route, target ?? {}) : route.fulfill({ status: 204, headers: cors });
      }
      if (method === 'POST') {
        // Insert from the editor: echo the row back with an id, like Postgres would.
        const body = req.postDataJSON();
        const row = { ...body, id: body.id ?? '55555555-5555-4555-8555-555555555555', created_at: now, updated_at: now, render: null };
        inserted.set(row.id, row);
        return json(route, single ? row : [row], 201);
      }
      const id = url.searchParams.get('id')?.replace(/^eq\./, '');
      if (id && inserted.has(id)) {
        const row = inserted.get(id);
        return json(route, url.searchParams.get('select') === 'render' ? { render: row.render } : row);
      }
      const select = url.searchParams.get('select');
      const row = select === 'render' ? { render: jcardRow.render } : jcardRow;
      return json(route, single ? row : [row]);
    }
    return json(route, single ? {} : []);
  }

  if (path.startsWith('/storage/v1/object/list/')) {
    const { prefix } = req.postDataJSON();
    const names = [...files.keys()]
      .filter((p) => p.startsWith(`jcard-renders/${prefix}/`))
      .map((p) => ({ name: p.slice(`jcard-renders/${prefix}/`.length), id: p }));
    return json(route, names);
  }
  if (path.startsWith('/storage/v1/object/public/')) {
    const key = decodeURIComponent(path.slice('/storage/v1/object/public/'.length));
    log.downloads.push(key);
    const file = files.get(key);
    if (!file) return route.fulfill({ status: 404, headers: cors, body: 'not found' });
    return route.fulfill({ status: 200, headers: { ...cors, 'content-type': file.type }, body: file.body });
  }
  if (path.startsWith('/storage/v1/object/') && method === 'DELETE') {
    const bucket = path.slice('/storage/v1/object/'.length);
    const { prefixes } = req.postDataJSON();
    for (const p of prefixes) {
      files.delete(`${bucket}/${p}`);
      log.removed.push(p);
    }
    return json(route, prefixes.map((name) => ({ name })));
  }
  if (path.startsWith('/storage/v1/object/') && (method === 'POST' || method === 'PUT')) {
    const key = decodeURIComponent(path.slice('/storage/v1/object/'.length));
    const body = req.postDataBuffer();
    // supabase-js sends the blob as multipart form data; keep just the file part.
    const type = req.headers()['content-type'] ?? '';
    const file = type.startsWith('multipart/') ? extractMultipartFile(body, type) : { body, type };
    files.set(key, file);
    log.uploads.push({ key, bytes: file.body.length, type: file.type });
    return json(route, { Key: key, Id: key });
  }
  return json(route, {});
}

async function waitFor(fn, timeoutMs) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const v = fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

function extractMultipartFile(body, contentType) {
  const boundary = `--${contentType.split('boundary=')[1]}`;
  const text = body.toString('latin1');
  for (const part of text.split(boundary)) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd < 0) continue;
    const headers = part.slice(0, headerEnd);
    if (!/filename=/i.test(headers)) continue;
    const type = /content-type:\s*([^\r\n]+)/i.exec(headers)?.[1] ?? 'application/octet-stream';
    const data = part.slice(headerEnd + 4, part.lastIndexOf('\r\n'));
    return { body: Buffer.from(data, 'latin1'), type };
  }
  return { body, type: contentType };
}

// --- Run ------------------------------------------------------------------------------

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await context.addInitScript(([key, value]) => localStorage.setItem(key, value), ['sb-127-auth-token', JSON.stringify(session)]);
await context.route(`${SUPABASE}/**`, handle);
const page = await context.newPage();
page.on('pageerror', (err) => console.log(`page error: ${err.message}`));

async function openViewer(label) {
  // ?tape=: straight onto the turntable (the viewer otherwise opens on the shelf).
  await page.goto(`${BASE_URL}/library/3d?3d=1&tape=${MIXTAPE_ID}&view=threeQuarter&turntable=0`, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => ['ready', 'error'].includes(window.__cassette3d?.getTextureReport().status),
    null,
    { timeout: 60_000 },
  );
  // Let a write-back settle before reading the report.
  await page.waitForFunction(() => window.__cassette3d.getTextureReport().writeBack !== 'pending', null, { timeout: 60_000 });
  const report = await page.evaluate(() => window.__cassette3d.getTextureReport());
  await page.screenshot({ path: `${OUT_DIR}render-cache-${label}.png` });
  return report;
}

try {
  // 1. No stored render: the viewer renders the card and, as its owner, uploads it.
  let report = await openViewer('1-runtime');
  check(report.status === 'ready' && report.tape?.source === 'cloud', 'signed-in tape loads from the (mock) cloud', `${report.tape?.title}`);
  check(report.origin === 'runtime', 'no stored render: rendered in the browser', report.origin);
  check(report.writeBack === 'stored', 'owner: the render is uploaded', report.writeBack);
  const outsideKey = `jcard-renders/${USER_ID}/${JCARD_ID}/${report.version}-outside.webp`;
  check(files.has(outsideKey), 'outside face stored at {user}/{card}/{version}-outside.webp', [...files.keys()].join(', '));
  check(files.get(outsideKey)?.type === 'image/webp', 'stored as WebP', `${files.get(outsideKey)?.type}, ${files.get(outsideKey)?.body.length} bytes`);
  check(![...files.keys()].some((k) => k.endsWith('-inside.webp')), 'no inside face for a card without inside content');
  const patch = log.patches.at(-1)?.render;
  check(patch?.version === report.version, 'row.render.version = content hash', `${patch?.version}`);
  check(!!patch?.outside?.panels?.flap1 && !!patch?.outside?.panels?.spine && !!patch?.outside?.panels?.back, 'row.render has the panel layout', JSON.stringify(patch?.outside?.panels));
  const spineKey = `jcard-renders/${USER_ID}/${JCARD_ID}/${report.version}-spine.webp`;
  check(files.has(spineKey) && patch?.spine?.url?.endsWith(`${report.version}-spine.webp`) && patch?.spine?.height === 512,
    'spine crop stored beside the faces, row.render.spine points at it', `${files.get(spineKey)?.body.length} bytes, ${JSON.stringify(patch?.spine)}`);
  const firstVersion = report.version;

  // 1b. The shelf in a fresh tab: the card's spine comes from the stored spine file, not a render.
  await page.goto(`${BASE_URL}/library/3d?3d=1`, { waitUntil: 'networkidle' });
  const shelfSpine = await page.waitForFunction(() => {
    const info = window.__cassette3d?.getShelfInfo();
    return info && info.count > 0 && info.realSpines.length > 0 ? info : null;
  }, null, { timeout: 30_000 }).then((h) => h.jsonValue()).catch(() => null);
  check(!!shelfSpine && log.downloads.includes(spineKey), 'shelf: the real spine is loaded from the stored spine file',
    shelfSpine ? `real spines ${JSON.stringify(shelfSpine.realSpines)}` : 'none within 30 s');
  check(!log.downloads.some((k) => k.endsWith('-outside.webp')), 'shelf: without downloading the full render');
  await page.screenshot({ path: `${OUT_DIR}render-cache-1b-shelf.png` });

  // 2. Fresh tab (empty memory cache): the stored render is used.
  report = await openViewer('2-stored');
  check(report.origin === 'stored', 'matching stored render: loaded instead of rendered', `${report.origin}, load ${report.snapshotMs} ms, total ${report.totalMs} ms`);
  check(report.writeBack === 'skipped', 'nothing uploaded again', report.writeBack);

  // 3. The card changes: the stored render is stale, gets replaced, the old files go.
  jcardRow.content = content('EDITED CARD');
  report = await openViewer('3-edited');
  check(report.version !== firstVersion, 'new content, new hash');
  check(report.origin === 'runtime' && report.writeBack === 'stored', 'stale stored render: re-rendered and replaced', `${report.origin}/${report.writeBack}`);
  check(log.removed.some((p) => p.includes(firstVersion)), 'the old version\'s files are deleted', log.removed.join(', '));
  check(files.size === 2 && [...files.keys()].every((k) => k.includes(report.version)), 'only the new version\'s files are left (outside + spine)', [...files.keys()].join(', '));

  // 3b. A render stored before spines existed: the viewer adds the spine from the stored images.
  const { spine: _dropped, ...noSpine } = jcardRow.render;
  jcardRow.render = noSpine;
  files.delete(`jcard-renders/${USER_ID}/${JCARD_ID}/${report.version}-spine.webp`);
  report = await openViewer('3b-backfill');
  check(report.origin === 'stored' && report.writeBack === 'stored', 'old render without a spine: loaded, spine added', `${report.origin}/${report.writeBack}`);
  check(files.has(`jcard-renders/${USER_ID}/${JCARD_ID}/${report.version}-spine.webp`) && !!jcardRow.render.spine && jcardRow.render.version === report.version,
    'spine uploaded and added to the same render version', JSON.stringify(jcardRow.render.spine));

  // 4. Somebody else's card: rendered, never uploaded.
  jcardRow.user_id = OTHER_USER;
  jcardRow.render = null;
  jcardRow.content = content('NOT MINE');
  const uploadsBefore = log.uploads.length;
  report = await openViewer('4-not-owner');
  check(report.origin === 'runtime' && report.writeBack === 'skipped', "someone else's card: not uploaded", `${report.origin}/${report.writeBack}`);
  check(log.uploads.length === uploadsBefore, 'no upload request made');

  // 5. A render pointing outside our bucket is ignored.
  jcardRow.user_id = USER_ID;
  jcardRow.content = content('UNTRUSTED');
  const version = await page.evaluate(async (c) => {
    const { jcardRenderVersion } = await import('/_nuxt/lib/cassette3d/textures/jcardRender.ts');
    return jcardRenderVersion(c);
  }, jcardRow.content).catch(() => null);
  if (version) {
    jcardRow.render = { version, pxPerMm: 11.8, outside: { url: 'https://evil.example/x.webp', panels: {} } };
    report = await openViewer('5-untrusted');
    check(report.origin === 'runtime', 'render URL outside the bucket: ignored, rendered here', report.origin);
  } else {
    console.log('skip  untrusted-URL check (could not import the hash function in the page)');
  }

  // 6. The editor: saving a card to the cloud stores its render a few seconds later.
  await page.goto(`${BASE_URL}/cards/designer`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const start = Date.now();
  const saved = await waitFor(() => [...inserted.values()][0], 15_000);
  check(!!saved, 'editor: Save inserts the card', saved?.id);
  const stored = await waitFor(() => saved && log.patches.find((p) => p.id === saved.id && p.render), 45_000);
  check(!!stored, 'editor: the render is stored after the save settles', stored ? `${Math.round((Date.now() - start) / 1000)} s after saving, version ${stored.render.version}` : 'no render PATCH within 45 s');
  check(!!stored && files.has(`jcard-renders/${USER_ID}/${saved.id}/${stored.render.version}-outside.webp`), 'editor: file uploaded to the user\'s folder');
  check(!!stored?.render?.spine && files.has(`jcard-renders/${USER_ID}/${saved.id}/${stored.render.version}-spine.webp`), 'editor: the spine is stored too');
} finally {
  await browser.close();
}

console.log(`\nScreenshots in ${OUT_DIR}render-cache-*.png`);
process.exit(failures ? 1 : 0);

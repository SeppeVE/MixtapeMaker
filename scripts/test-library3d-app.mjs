#!/usr/bin/env node
// Stage 5 (app integration) of the 3D library, end to end against a mocked
// Supabase: the tape panel's details and actions (edit, J-card, PDF, share,
// public, delete), the 2D/3D switch and its remembered choice, the ?tape= deep
// link following the selection, the unsaved-draft note, and a user's public
// shelf (/user/{username}/3d).
//
// Needs the dev server started with the dummy project URL the mock listens on:
//   NUXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NUXT_PUBLIC_SUPABASE_ANON_KEY=dummy npm run dev
//   npm run test:library3d
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3100';
const SUPABASE = 'http://127.0.0.1:54321';
const OUT_DIR = new URL('../.screenshots/', import.meta.url).pathname;
const EXECUTABLE = process.env.CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TAPE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TAPE_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TAPE_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'; // no J-card: never on the shelf
const CARD_A = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1';
const CARD_B = 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1';
// Someone else's profile (@maker): one public tape with a public card, one public
// tape without a card, one private tape whose card is public.
const OTHER_USER = '22222222-2222-4222-8222-222222222222';
const PRIVATE_USER = '33333333-3333-4333-8333-333333333333';
const TAPE_D = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const TAPE_E = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const TAPE_F = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const CARD_D = 'd1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1';
const CARD_F = 'f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1';

let failures = 0;
function check(ok, label, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

// --- Mock data ----------------------------------------------------------------------

const song = (id, title, artist, duration) => ({ id, title, artist, album: '', duration, albumCover: '' });
const mixtapes = new Map([
  [TAPE_A, {
    id: TAPE_A, user_id: USER_ID, title: 'Summer Drive', cassette_length: 60,
    side_a: [song('s1', 'Heroes', 'David Bowie', 371), song('s2', 'Dreams', 'Fleetwood Mac', 257)],
    side_b: [song('s3', 'Hounds of Love', 'Kate Bush', 183)],
    created_at: '2026-09-20T12:00:00.000Z', updated_at: '2026-09-22T12:00:00.000Z', is_public: false, share_token: null, is_copy: false,
  }],
  [TAPE_B, {
    id: TAPE_B, user_id: USER_ID, title: 'Rainy Sunday', cassette_length: 90,
    side_a: [song('s4', 'Pink Moon', 'Nick Drake', 124)], side_b: [],
    created_at: '2026-09-19T12:00:00.000Z', updated_at: '2026-09-21T12:00:00.000Z', is_public: true, share_token: null, is_copy: false,
  }],
  [TAPE_C, {
    id: TAPE_C, user_id: USER_ID, title: 'No Card Yet', cassette_length: 90, side_a: [], side_b: [],
    created_at: '2026-09-18T12:00:00.000Z', updated_at: '2026-09-18T12:00:00.000Z', is_public: false, share_token: null, is_copy: false,
  }],
]);
const content = (title, color) => ({
  flaps: 2, isReversed: false, shortBack: false, backgroundColor: color, continuousBackground: false,
  flapContents: [`<h2 style="text-align:center"><span style="font-family: 'Bebas Neue'; font-size: 10mm">${title}</span></h2>`, '<p>Panel two</p>', '', '', '', ''],
  coverImageBehindContent: false, isFullCoverImage: false,
  spineTopContent: `<strong>${title}</strong>`, spineCenterContent: '', spineBottomContent: 'C60',
  backLeftContent: '<h4>Side A</h4>', backRightContent: '<h4>Side B</h4>',
});
const card = (id, mixtapeId, title, color) => ({
  id, user_id: USER_ID, mixtape_id: mixtapeId, title, content: content(title, color),
  created_at: '2026-09-20T12:00:00.000Z', updated_at: '2026-09-20T12:00:00.000Z', is_public: false, is_copy: false, copied_from_id: null, render: null,
});
const jcards = [card(CARD_A, TAPE_A, 'Summer Drive card', '#d9c9a3'), card(CARD_B, TAPE_B, 'Rainy Sunday card', '#9fb7c9')];
const otherTape = (id, title, isPublic) => ({
  id, user_id: OTHER_USER, title, cassette_length: 90, side_a: [song(`${id}-1`, 'Teardrop', 'Massive Attack', 330)], side_b: [],
  created_at: '2026-09-10T12:00:00.000Z', updated_at: '2026-09-11T12:00:00.000Z', is_public: isPublic, share_token: null, is_copy: false,
});
for (const t of [otherTape(TAPE_D, 'Night Bus', true), otherTape(TAPE_E, 'No Card Public', true), otherTape(TAPE_F, 'Secret Tape', false)]) mixtapes.set(t.id, t);
jcards.push(
  { ...card(CARD_D, TAPE_D, 'Night Bus card', '#2b2d42'), user_id: OTHER_USER, is_public: true },
  { ...card(CARD_F, TAPE_F, 'Secret card', '#8d99ae'), user_id: OTHER_USER, is_public: true },
);
// Tester's own public profile: Summer Drive once it's public, with its card made public.
const profileRow = (id, username, isPrivate = false) => ({
  id, username, avatar_url: null, bio: null, is_private: isPrivate, is_admin: false, seen_notification_id: null, created_at: '2026-09-01T00:00:00.000Z',
});
const profiles = [profileRow(USER_ID, 'tester'), profileRow(OTHER_USER, 'maker'), profileRow(PRIVATE_USER, 'hidden', true)];

/** PostgREST `col=eq.value` filters, as the app sends them. */
function matches(row, params) {
  for (const [key, value] of params) {
    if (!value.startsWith('eq.') || !(key in row)) continue;
    if (String(row[key]) !== value.slice(3)) return false;
  }
  return true;
}
const log = { patches: [], deletes: [] };

// --- Mock Supabase ------------------------------------------------------------------

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-expose-headers': 'content-range',
};
const json = (route, body, status = 200) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) });
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
const accessToken = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: USER_ID, role: 'authenticated', exp, aud: 'authenticated' })}.sig`;
const user = { id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'test@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-09-01T00:00:00.000Z' };
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
    const id = url.searchParams.get('id')?.replace(/^eq\./, '');
    if (table === 'mixtapes') {
      if (method === 'PATCH') {
        const body = req.postDataJSON();
        log.patches.push({ id, ...body });
        Object.assign(mixtapes.get(id) ?? {}, body);
        return route.fulfill({ status: 204, headers: cors });
      }
      if (method === 'DELETE') {
        log.deletes.push(id);
        mixtapes.delete(id);
        return route.fulfill({ status: 204, headers: cors });
      }
      const rows = [...mixtapes.values()].filter((r) => matches(r, url.searchParams)).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      return json(route, single ? rows[0] : rows);
    }
    if (table === 'jcards') {
      if (method === 'PATCH') return route.fulfill({ status: 204, headers: cors });
      const rows = jcards.filter((c) => matches(c, url.searchParams));
      if (url.searchParams.get('select') === 'render') return json(route, { render: rows[0]?.render ?? null });
      return json(route, single ? rows[0] : rows);
    }
    if (table === 'profiles') {
      const rows = profiles.filter((r) => matches(r, url.searchParams));
      if (single && !rows.length) return json(route, { code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'JSON object requested, multiple (or no) rows returned' }, 406);
      return json(route, single ? rows[0] : rows);
    }
    return json(route, single ? {} : []);
  }
  if (path.startsWith('/storage/v1/object/public/')) return route.fulfill({ status: 404, headers: cors, body: 'not found' });
  return json(route, {});
}

// --- Run ------------------------------------------------------------------------------

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE_URL });
// Signed in, and no view remembered yet; the flag comes from ?3d=1 on each visit.
await context.addInitScript(([key, value]) => {
  if (!sessionStorage.getItem('__init')) {
    sessionStorage.setItem('__init', '1');
    localStorage.setItem(key, value);
  }
}, ['sb-127-auth-token', JSON.stringify(session)]);
await context.route(`${SUPABASE}/**`, handle);
const page = await context.newPage();
page.on('pageerror', (err) => console.log(`page error: ${err.message}`));
page.on('dialog', (d) => d.accept());

const idle = () => page.waitForFunction(() => !window.__cassette3d.isAnimating(), null, { timeout: 30_000 });
const query = () => new URL(page.url()).searchParams;
async function openShelf(extra = '') {
  await page.goto(`${BASE_URL}/library/3d?3d=1${extra}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__cassette3d?.getShelfInfo().count >= 0 && document.querySelector('.lib3d-toolbar, .lib3d-panel'), null, { timeout: 60_000 });
}
async function takeOut(index) {
  await page.evaluate((i) => window.__cassette3d.selectTape(i), index);
  await idle();
  await page.waitForSelector('.lib3d-panel');
}
const panelText = () => page.locator('.lib3d-panel').innerText();

try {
  // 1. The shelf shows the two tapes with J-cards; ?tape= isn't in the URL yet.
  await openShelf();
  let info = await page.evaluate(() => window.__cassette3d.getShelfInfo());
  check(info.count === 2, 'shelf: the two mixtapes with a J-card', `${info.count} tapes`);
  check(!query().has('tape'), 'shelf: no ?tape= while everything is on the shelf');

  // 2. Take one out: the panel shows title, dedication, sides with counts and durations.
  await takeOut(0);
  const text = await panelText();
  check(/Summer Drive/.test(text), 'panel: title', text.split('\n')[0]);
  check(/Side A\s*2 tracks · 10:28/.test(text) && /Side B\s*1 track · 3:03/.test(text), 'panel: side A/B track counts and durations', text.replace(/\n/g, ' | '));
  check(/13:31 on a C-60/.test(text) && /Private/.test(text), 'panel: total, cassette length and visibility');
  check(query().get('tape') === TAPE_A, 'deep link: the URL follows the tape off the shelf', page.url());
  await page.screenshot({ path: `${OUT_DIR}app-panel.png` });

  // 3. Make public → the database, the panel and the explore-link modal.
  await page.getByRole('button', { name: 'Make public' }).click();
  await page.waitForFunction(() => document.querySelector('.lib3d-panel')?.textContent.includes('Make private'), null, { timeout: 10_000 });
  check(log.patches.some((p) => p.id === TAPE_A && p.is_public === true), 'Make public: saved to the mixtape row', JSON.stringify(log.patches.at(-1)));
  check(await page.getByText('Mixtape is now public').isVisible().catch(() => false), 'Make public: the explore link modal opens');
  await page.screenshot({ path: `${OUT_DIR}app-public.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.goto(page.url(), { waitUntil: 'networkidle' }); // closes any modal, and checks the deep link on reload
  await page.waitForSelector('.lib3d-panel', { timeout: 60_000 });
  info = await page.evaluate(() => ({ s: window.__cassette3d.getState(), sel: window.__cassette3d.getShelfInfo().selected }));
  check(info.s === 'presented' && info.sel === 0, 'deep link: a reload comes back to the same tape', JSON.stringify(info));
  check(/Public/.test(await panelText()), 'Make public: still public after a reload');
  await page.getByRole('button', { name: 'Make private' }).click();
  await page.waitForFunction(() => document.querySelector('.lib3d-panel')?.textContent.includes('Make public'), null, { timeout: 10_000 });
  check(log.patches.some((p) => p.id === TAPE_A && p.is_public === false), 'Make private: saved');

  // 4. Copy link: a share token is written and the link lands on the clipboard.
  await page.getByRole('button', { name: 'Copy link' }).click();
  await page.getByText('Share link ready').waitFor({ timeout: 10_000 });
  const token = mixtapes.get(TAPE_A).share_token;
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  check(!!token && clip.endsWith(`/share/${token}`), 'Copy link: token saved, link copied', clip);
  await page.goto(page.url(), { waitUntil: 'networkidle' });
  await page.waitForSelector('.lib3d-panel', { timeout: 60_000 });

  // 5. Print J-card: a PDF download.
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    page.getByRole('button', { name: 'Print J-card (PDF)' }).click(),
  ]);
  check(download.suggestedFilename().endsWith('.pdf'), 'Print J-card: the PDF downloads', download.suggestedFilename());

  // 6. Back to the shelf: ?tape= goes; a deep link to a tape that isn't there says so.
  await page.getByRole('button', { name: 'Back to the shelf' }).click();
  await idle();
  await page.waitForTimeout(200);
  check(!query().has('tape'), 'deep link: ?tape= leaves the URL on the shelf', page.url());
  await openShelf(`&tape=${TAPE_C}`);
  await page.waitForSelector('.lib3d-note');
  check(await page.getByText("That tape isn't on your shelf").isVisible(), 'deep link: a tape without a J-card gets a note');

  // 7. Delete: gone from the database and the shelf.
  await takeOut(1);
  check(/Rainy Sunday/.test(await panelText()), 'delete: the right tape is out');
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.waitForFunction(() => window.__cassette3d.getShelfInfo().count === 1 && window.__cassette3d.getState() === 'onShelf', null, { timeout: 30_000 });
  check(log.deletes.includes(TAPE_B), 'delete: the mixtape row is deleted');
  const ids = await page.evaluate(() => window.__cassette3d.getShelfInfo().ids);
  check(ids.length === 1 && ids[0] === TAPE_A, 'delete: the case leaves the shelf', JSON.stringify(ids));
  await page.screenshot({ path: `${OUT_DIR}app-deleted.png` });

  // 8. Edit tape / Edit J-card open the editors with that tape / card.
  await takeOut(0);
  await page.getByRole('button', { name: 'Edit tape' }).click();
  await page.waitForURL('**/mixtape', { timeout: 30_000 });
  const loaded = await page.evaluate(() => JSON.parse(localStorage.getItem('mixtape-current') ?? 'null'));
  check(page.url().endsWith('/mixtape') && loaded?.id === 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Edit tape: the mixtape editor opens with that tape', `${page.url()}, ${loaded?.title}`);
  await openShelf(`&tape=${TAPE_A}`);
  await page.waitForSelector('.lib3d-panel', { timeout: 60_000 });
  await page.getByRole('button', { name: 'Edit J-card' }).click();
  await page.waitForURL('**/cards/designer', { timeout: 30_000 });
  const active = await page.evaluate(() => Object.keys(localStorage).map((k) => localStorage.getItem(k)).find((v) => v?.includes('Summer Drive card')));
  check(page.url().endsWith('/cards/designer') && !!active, 'Edit J-card: the designer opens with its card');

  // 9. The 2D/3D switch, and the choice remembered.
  await page.goto(`${BASE_URL}/library?3d=1`, { waitUntil: 'networkidle' });
  check(page.url().includes('/library?') && !page.url().includes('/library/3d'), '2D/3D: with nothing remembered, /library is the list');
  await page.locator('.lib-view-toggle-btn', { hasText: '3D' }).click();
  await page.waitForURL('**/library/3d**', { timeout: 30_000 });
  check(await page.evaluate(() => localStorage.getItem('library-view')) === '3d', '2D/3D: choosing 3D is remembered');
  await page.goto(`${BASE_URL}/library?3d=1`, { waitUntil: 'networkidle' });
  await page.waitForURL('**/library/3d**', { timeout: 30_000 });
  check(page.url().includes('/library/3d'), '2D/3D: /library now opens the shelf', page.url());
  await page.waitForSelector('.lib3d-toolbar .lib-view-toggle', { timeout: 60_000 });
  await page.screenshot({ path: `${OUT_DIR}app-toolbar.png` });
  await page.locator('.lib-view-toggle-btn', { hasText: '2D' }).click();
  await page.waitForURL((u) => u.pathname === '/library', { timeout: 30_000 });
  await page.waitForTimeout(500);
  check(new URL(page.url()).pathname === '/library' && await page.evaluate(() => localStorage.getItem('library-view')) === '2d', '2D/3D: back to the list, remembered');
  await page.goto(`${BASE_URL}/library?3d=1&tab=jcards`, { waitUntil: 'networkidle' });
  check(new URL(page.url()).pathname === '/library', '2D/3D: ?tab= links always get the list');
  await page.evaluate(() => localStorage.setItem('library-view', '3d'));
  await page.goto(`${BASE_URL}/library`, { waitUntil: 'networkidle' });
  check(new URL(page.url()).pathname === '/library', '2D/3D: flag off, the remembered 3D is ignored');

  // 10. New menu, and the unsaved draft note.
  await page.evaluate(() => localStorage.setItem('mixtape-current', JSON.stringify({
    id: 'local-draft-1', title: 'Work in progress', cassetteLength: 90,
    sideA: [{ id: 'x1', title: 'Song', artist: 'Band', album: '', duration: 200, albumCover: '' }], sideB: [],
    createdAt: '2026-09-24T10:00:00.000Z', updatedAt: '2026-09-24T10:00:00.000Z', isPublic: false, isCopy: false,
  })));
  await openShelf();
  const draftNote = page.locator('.lib3d-draft');
  const hasDraft = await draftNote.isVisible().catch(() => false);
  check(hasDraft && /Work in progress/.test(await draftNote.innerText()), 'draft: the unsaved draft shows on the shelf with Open / Save');
  await page.locator('.lib3d-menu-button').click();
  const items = await page.locator('.lib3d-menu-items').innerText();
  check(/New mixtape/.test(items) && /New J-card/.test(items) && /All J-cards/.test(items), 'New menu: mixtape, J-card, all J-cards', items.replace(/\n/g, ' | '));
  await page.screenshot({ path: `${OUT_DIR}app-menu.png` });

  // 11. A user's public shelf: their public tapes that have a public J-card.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE_URL}/user/maker/3d?3d=1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.lib3d-toolbar', { timeout: 60_000 });
  info = await page.evaluate(() => window.__cassette3d.getShelfInfo());
  check(info.count === 1 && info.ids[0] === TAPE_D, 'public shelf: only public tapes with a public J-card', JSON.stringify(info.ids));
  check(await page.locator('.lib3d-owner').innerText() === '◀ @maker' && !(await page.locator('.lib3d-menu').count()) && !(await page.locator('.lib3d-toolbar .lib-view-toggle').count()),
    'public shelf: toolbar links back to the profile, no New menu or 2D/3D switch');
  await page.screenshot({ path: `${OUT_DIR}app-public-shelf.png` });
  await takeOut(0);
  const pub = await panelText();
  check(/Night Bus/.test(pub) && /By @maker/.test(pub) && /Copy tape to my library/.test(pub) && /Copy J-card to my library/.test(pub) && /Tape page/.test(pub) && /Print J-card/.test(pub),
    'public shelf: the panel offers copy, tape page and print', pub.replace(/\n/g, ' | '));
  check(!/Delete|Make p|Copy link|Edit tape/.test(pub), 'public shelf: none of the owner actions on someone else\'s tape');
  check(query().get('tape') === TAPE_D, 'public shelf: ?tape= follows the selection too');
  await page.screenshot({ path: `${OUT_DIR}app-public-panel.png` });
  await page.getByRole('button', { name: 'Copy tape to my library' }).click();
  await page.waitForURL('**/mixtape', { timeout: 30_000 });
  const copied = await page.evaluate(() => JSON.parse(localStorage.getItem('mixtape-current') ?? 'null'));
  check(copied?.title === 'Night Bus' && copied.isCopy === true && copied.id !== TAPE_D, 'public shelf: Copy tape opens a private copy in the editor', `${copied?.title}, isCopy ${copied?.isCopy}`);

  await page.goto(`${BASE_URL}/user/nobody/3d?3d=1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.lib3d-empty', { timeout: 60_000 });
  check(/No user named @nobody/.test(await page.locator('.lib3d-empty').innerText()), 'public shelf: unknown user');
  await page.goto(`${BASE_URL}/user/hidden/3d?3d=1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.lib3d-empty', { timeout: 60_000 });
  check(/set their profile to private/.test(await page.locator('.lib3d-empty').innerText()), 'public shelf: private profile');

  // Your own public shelf: Summer Drive is public (its card too) → Edit instead of Copy.
  mixtapes.get(TAPE_A).is_public = true;
  jcards.find((c) => c.id === CARD_A).is_public = true;
  await page.goto(`${BASE_URL}/user/tester/3d?3d=1&tape=${TAPE_A}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.lib3d-panel', { timeout: 60_000 });
  const mine = await panelText();
  check(/Edit tape/.test(mine) && /Edit J-card/.test(mine) && !/Copy tape/.test(mine), 'public shelf: your own tapes can be edited, not copied', mine.replace(/\n/g, ' | '));

  // The profile page links to the shelf (client-side navigation: the mock only answers the browser).
  await page.getByRole('button', { name: 'Back to the shelf' }).click();
  await idle();
  await page.locator('.lp-nav-links a', { hasText: '@tester' }).click();
  await page.waitForURL((u) => u.pathname === '/user/tester', { timeout: 30_000 });
  const shelfLink = page.getByRole('link', { name: 'View on a 3D shelf' });
  await shelfLink.waitFor({ timeout: 30_000 });
  check((await shelfLink.getAttribute('href')) === '/user/tester/3d?3d=1', 'profile: links to its 3D shelf', await shelfLink.getAttribute('href'));
  await page.goto(`${BASE_URL}/user/maker/3d`, { waitUntil: 'commit' });
  await page.waitForURL((u) => u.pathname === '/user/maker', { timeout: 30_000 }).catch(() => undefined);
  check(new URL(page.url()).pathname === '/user/maker', 'public shelf: flag off → the profile page', page.url());

  // 12. Phone: the panel starts folded.
  await page.setViewportSize({ width: 390, height: 844 });
  await openShelf(`&tape=${TAPE_A}`);
  await page.waitForSelector('.lib3d-panel', { timeout: 60_000 });
  const expanded = await page.locator('.lib3d-panel-head').getAttribute('aria-expanded');
  check(expanded === 'false', 'phone: the panel starts folded');
  await page.screenshot({ path: `${OUT_DIR}app-mobile.png` });
  await page.locator('.lib3d-panel-head').click();
  await page.screenshot({ path: `${OUT_DIR}app-mobile-open.png` });
} finally {
  await browser.close();
}

console.log(`\n${failures ? `${failures} FAILED` : 'All passed'}. Screenshots in ${OUT_DIR}`);
process.exit(failures ? 1 : 0);

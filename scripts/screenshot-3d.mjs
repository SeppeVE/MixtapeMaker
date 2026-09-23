#!/usr/bin/env node
// Screenshots and sanity checks for the 3D library (/library/3d).
//
// Needs the dev server running (`npm run dev`), because the window.__cassette3d
// debug hooks only exist in dev. Screenshots go to .screenshots/ (git-ignored).
//
//   npm run screenshot:3d
//   BASE_URL=http://localhost:3100 CYCLES=5 npm run screenshot:3d
//   STATES=presented,lidOpen npm run screenshot:3d     (one shot per ?debugState)
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3100';
const OUT_DIR = new URL('../.screenshots/', import.meta.url).pathname;
const CYCLES = Number(process.env.CYCLES ?? 3);
const STATES = (process.env.STATES ?? '').split(',').filter(Boolean);
// Any Chromium works: CHROMIUM_PATH, a preinstalled one, or Playwright's own
// (`npx playwright install chromium`).
const EXECUTABLE = process.env.CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

// three.js keeps one module-level texture (the DFG lookup table for PBR
// materials) that it never disposes; it's shared by every renderer and goes
// away with the GL context, so it's allowed here.
const SHARED_TEXTURES = 1;

let failures = 0;
function check(ok, label, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

async function frames(page, n = 3) {
  await page.evaluate((count) => new Promise((resolve) => {
    let left = count;
    const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  }), n);
}

async function waitForScene(page) {
  await page.waitForFunction(() => (window.__cassette3d?.info().render.calls ?? 0) > 0, null, { timeout: 30_000 });
  // The tape's textures arrive after the scene is up; memory numbers are only comparable once they're on.
  await page.waitForFunction(
    () => ['ready', 'error'].includes(window.__cassette3d?.getTextureReport().status),
    null,
    { timeout: 60_000 },
  );
  // A few more frames so shadows and the environment have settled.
  await frames(page);
}

// Stage 2: each sample tape, textured. `setup` runs in the page after the fixture is on.
const FIXTURE_SHOTS = [
  ['front', (api) => api.setView('front')],
  ['threeQuarter', (api) => api.setView('threeQuarter')],
  ['cover-closeup', (api) => { api.setView('front'); api.setDistanceScale(0.45); }],
  ['spine', (api) => { api.setView('spine'); api.setDistanceScale(0.6); }],
  ['back', (api) => api.setView('back')],
  ['label', (api) => { api.setPartsVisible({ case: false, jcard: false }); api.setView('front'); api.setElevation(0); api.setDistanceScale(0.8); }],
  ['label-b', (api) => { api.setView('back'); api.setElevation(0); api.setDistanceScale(0.8); }],
  ['flat-outside', (api) => { api.setPartsVisible({ case: false, cassette: false, jcard: true }); api.setJCardFold(0); api.setView('front'); api.setElevation(0); api.setDistanceScale(1.9); }],
  ['flat-inside', (api) => { api.setView('back'); api.setElevation(0); api.setDistanceScale(1.9); }],
];
const FIXTURES = (process.env.FIXTURES ?? '1,2,3').split(',').filter(Boolean);

// Stage 1: the closed case from fixed views, then variants. `setup` runs in the page.
const HERO_SHOTS = [
  ['front', (api) => api.setView('front')],
  ['threeQuarter', (api) => api.setView('threeQuarter')],
  ['spine', (api) => api.setView('spine')],
  ['back', (api) => api.setView('back')],
  ['threeQuarterBack', (api) => api.setView('threeQuarterBack')],
  ['lid-open', (api) => { api.setView('threeQuarter'); api.setLidAngle(105); }],
  ['lid-open-spine', (api) => { api.setView('spine'); api.setLidAngle(60); }],
  ['smoke', (api) => { api.setView('threeQuarter'); api.setLidAngle(0); api.setCaseTint('smoke'); }],
  ['cassette', (api) => { api.setCaseTint('clear'); api.setView('threeQuarter'); api.setPartsVisible({ case: false, jcard: false }); }],
  ['cassette-back', (api) => api.setView('threeQuarterBack')],
  // From above: the case's cross-section, then the J-card folding on its own.
  ['top', (api) => { api.setPartsVisible({ case: true, jcard: true }); api.setView('front'); api.setElevation(89); }],
  ['top-6flaps', (api) => { api.setJCardLayout(6, false); api.setView('front'); api.setElevation(89); }],
  ['jcard-folding', (api) => { api.setPartsVisible({ case: false, cassette: false }); api.setJCardLayout(4, false); api.setJCardFold(0.6); api.setView('front'); api.setElevation(89); }],
  ['jcard-flat', (api) => { api.setJCardFold(0); api.setView('back'); }],
];

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (err) => console.log(`page error: ${err.message}`));

try {
  // 1. Feature flag: without the override the route falls back to the 2D library
  //    (unless NUXT_PUBLIC_LIBRARY3D=true on the server).
  await page.goto(`${BASE_URL}/library/3d`, { waitUntil: 'networkidle' });
  console.log(`info  /library/3d without ?3d=1 → ${new URL(page.url()).pathname}`);

  // 2. The scene renders.
  await page.goto(`${BASE_URL}/library/3d?3d=1`, { waitUntil: 'networkidle' });
  await waitForScene(page);
  const baseline = await page.evaluate(() => window.__cassette3d.info());
  check(baseline.render.calls > 0, 'scene renders', JSON.stringify(baseline));
  await page.screenshot({ path: `${OUT_DIR}scene.png` });

  for (const [name, setup] of HERO_SHOTS) {
    await page.evaluate(`(${setup.toString()})(window.__cassette3d)`);
    await frames(page);
    await page.screenshot({ path: `${OUT_DIR}hero-${name}.png` });
  }
  await page.evaluate(() => {
    const api = window.__cassette3d;
    api.setPartsVisible({ case: true, cassette: true, jcard: true });
    api.setJCardLayout(2, false);
    api.setJCardFold(1);
    api.setLidAngle(0);
  });

  for (const fixture of FIXTURES) {
    const report = await page.evaluate((f) => window.__cassette3d.loadFixture(f), fixture);
    const badFonts = report.fonts.filter((f) => !f.loaded).map((f) => f.family);
    const badImages = report.images.filter((i) => !i.ok);
    check(report.status === 'ready', `fixture ${fixture}: textures ready`, `${report.totalMs} ms, snapshot ${report.snapshotMs} ms${report.cached ? ', cached' : ''}`);
    check(badFonts.length === 0, `fixture ${fixture}: fonts loaded`, badFonts.join(', ') || report.fonts.map((f) => f.family).join(', '));
    check(badImages.length === 0, `fixture ${fixture}: images fetch with CORS`, JSON.stringify(badImages));
    for (const [name, setup] of FIXTURE_SHOTS) {
      await page.evaluate(`(${setup.toString()})(window.__cassette3d)`);
      await frames(page);
      await page.screenshot({ path: `${OUT_DIR}tape${fixture}-${name}.png` });
    }
    await page.evaluate(() => {
      const api = window.__cassette3d;
      api.setPartsVisible({ case: true, cassette: true, jcard: true });
      api.setJCardFold(1);
    });
  }
  const again = await page.evaluate(() => window.__cassette3d.loadFixture('1'));
  check(again.cached, 'fixture 1 again: served from the snapshot cache', `${again.totalMs} ms`);

  // Phone framing: the whole case must stay in view at every turntable angle.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  for (const view of ['front', 'spine', 'threeQuarter']) {
    await page.evaluate((v) => window.__cassette3d.setView(v), view);
    await frames(page);
    await page.screenshot({ path: `${OUT_DIR}hero-mobile-${view}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 800 });

  // 3. Navigate away and back, client-side, and compare renderer memory.
  for (let i = 0; i < CYCLES; i++) {
    await page.getByRole('link', { name: 'Library', exact: true }).first().click();
    await page.waitForURL((url) => url.pathname === '/library');
    const afterLeave = await page.evaluate(() => ({
      hooks: !!window.__cassette3d,
      canvases: document.querySelectorAll('canvas').length,
      lastDispose: window.__cassette3dLastDispose,
    }));
    check(
      !afterLeave.hooks && afterLeave.canvases === 0 && afterLeave.lastDispose?.geometries === 0 && afterLeave.lastDispose?.textures <= SHARED_TEXTURES,
      `cycle ${i + 1}: leaving frees everything`,
      JSON.stringify(afterLeave),
    );
    await page.goBack();
    await waitForScene(page);
    const again = await page.evaluate(() => ({ ...window.__cassette3d.info(), canvases: document.querySelectorAll('canvas').length }));
    check(
      again.memory.geometries === baseline.memory.geometries && again.memory.textures === baseline.memory.textures && again.canvases === 1,
      `cycle ${i + 1}: returning matches baseline`,
      JSON.stringify(again),
    );
  }

  // 4. Debug overlay.
  await page.goto(`${BASE_URL}/library/3d?3d=1&debug=1`, { waitUntil: 'networkidle' });
  await waitForScene(page);
  check(await page.locator('.lil-gui').count() > 0, 'lil-gui shows with ?debug=1');
  await page.screenshot({ path: `${OUT_DIR}debug.png` });

  // 5. Optional per-state shots via ?debugState.
  for (const state of STATES) {
    await page.goto(`${BASE_URL}/library/3d?3d=1&debugState=${state}`, { waitUntil: 'networkidle' });
    await waitForScene(page);
    const got = await page.evaluate(() => window.__cassette3d.getState());
    check(got === state, `debugState=${state}`, got);
    await page.screenshot({ path: `${OUT_DIR}state-${state}.png` });
  }
} finally {
  await browser.close();
}

console.log(`\nScreenshots in ${OUT_DIR}`);
process.exit(failures ? 1 : 0);

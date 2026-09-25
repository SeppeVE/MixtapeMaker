#!/usr/bin/env node
// Screenshots and sanity checks for the 3D library (/library/3d).
//
// Needs the dev server running (`npm run dev`), because the window.__cassette3d
// debug hooks only exist in dev. Screenshots go to .screenshots/ (git-ignored).
//
//   npm run screenshot:3d
//   BASE_URL=http://localhost:3100 CYCLES=5 npm run screenshot:3d
//   STATES=presented,lidOpen npm run screenshot:3d     (which ?debugState shots; default: all)
//   SPAM=80 npm run screenshot:3d                       (random requests in the spam test)
//   SEED=300 npm run screenshot:3d                      (tapes on the seeded shelf; default 150)
//   MAX_CALLS=12 npm run screenshot:3d                  (draw-call budget for the whole shelf)
//   ONLY=polish npm run screenshot:3d                   (only the Stage 6 checks and shots)
//   ONLY=quality npm run screenshot:3d                  (only the Stage 7 checks: tiers, probe, context loss, no WebGL)
//   ONLY=leak CYCLES=20 npm run screenshot:3d           (only the leave/return leak check)
//   TIER=mid npm run screenshot:3d                      (tier for the Stage 1–6 checks; default high)
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3100';
const OUT_DIR = new URL('../.screenshots/', import.meta.url).pathname;
const CYCLES = Number(process.env.CYCLES ?? 3);
const HERO_STATES = ['presented', 'lidOpen', 'cassetteOut', 'jcardOut', 'jcardUnfolded'];
const TAPE_STATES = ['onShelf', 'pulledOut', ...HERO_STATES];
const STATES = (process.env.STATES ?? TAPE_STATES.join(',')).split(',').filter(Boolean);
const SPAM = Number(process.env.SPAM ?? 40);
const SEED = Number(process.env.SEED ?? 150);
const MAX_CALLS = Number(process.env.MAX_CALLS ?? 10);
// Quality tier for the Stage 1–6 checks: high, so they cover the full pipeline
// (SwiftShader would pick low by itself). The Stage 7 checks set their own.
const TIER = process.env.TIER ?? 'high';
// Any Chromium works: CHROMIUM_PATH, a preinstalled one, or Playwright's own
// (`npx playwright install chromium`).
const EXECUTABLE = process.env.CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

// three.js's module-level DFG lookup texture used to stay behind (and keep every
// old renderer alive); scene.ts disposes it since Stage 7, so nothing may remain.
const SHARED_TEXTURES = 0;

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
  // Resting on the shelf, no tape is textured: the shelf being up is enough.
  await page.waitForFunction(
    () => {
      const api = window.__cassette3d;
      if (!api) return false;
      if (api.getTarget() === 'onShelf') return api.getShelfInfo().count > 0 && !api.isAnimating();
      return ['ready', 'error'].includes(api.getTextureReport().status);
    },
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
  ['lid-open-back', (api) => { api.setView('threeQuarterBack'); api.setLidAngle(105); }],
  ['lid-open-top', (api) => { api.setView('front'); api.setLidAngle(90); api.setElevation(89); }],
  ['lid-lifting', (api) => { api.setView('spine'); api.setLidAngle(12); api.setElevation(20); }],
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
  if (process.env.ONLY) {
    if (process.env.ONLY === 'polish') await polishTests(page);
    if (process.env.ONLY === 'quality') await qualityTests(page);
    if (process.env.ONLY === 'leak') {
      await page.goto(`${BASE_URL}/library/3d?3d=1&tier=${TIER}&fixture=1`, { waitUntil: 'networkidle' });
      await waitForScene(page);
      await leakCycles(page, CYCLES, await page.evaluate(() => window.__cassette3d.info()));
    }
    await browser.close();
    process.exit(failures ? 1 : 0);
  }
  // 1. Feature flag: without the override the route falls back to the 2D library
  //    (unless NUXT_PUBLIC_LIBRARY3D=true on the server).
  await page.goto(`${BASE_URL}/library/3d`, { waitUntil: 'networkidle' });
  console.log(`info  /library/3d without ?3d=1 → ${new URL(page.url()).pathname}`);

  // 2. The scene renders. ?fixture=1: the sample shelf, with sample 1 presented on the turntable.
  await page.goto(`${BASE_URL}/library/3d?3d=1&tier=${TIER}&fixture=1`, { waitUntil: 'networkidle' });
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
    check(report.status === 'ready', `fixture ${fixture}: textures ready`, `${report.origin}, ${report.totalMs} ms, snapshot ${report.snapshotMs} ms`);
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
  check(again.origin === 'memory', 'fixture 1 again: served from the snapshot cache', `${again.origin}, ${again.totalMs} ms`);

  // Stage 3: the tape machine.
  await page.evaluate(() => { window.__cassette3d.goTo('presented'); window.__cassette3d.setView('front'); });
  const idle = (timeout = 30_000) => page.waitForFunction(() => !window.__cassette3d.isAnimating(), null, { timeout });

  // a) Walk forwards through every state, animated, then all the way back.
  for (const state of HERO_STATES.slice(1)) {
    await page.evaluate((s) => window.__cassette3d.request(s), state);
    await idle();
    const got = await page.evaluate(() => ({ s: window.__cassette3d.getState(), e: window.__cassette3d.poseError() }));
    check(got.s === state && got.e < 1e-6, `animated to ${state}`, `state ${got.s}, pose error ${got.e}`);
    await frames(page);
    await page.screenshot({ path: `${OUT_DIR}machine-${state}.png` });
  }
  await page.evaluate(() => window.__cassette3d.request('presented'));
  await idle();
  let got = await page.evaluate(() => ({ s: window.__cassette3d.getState(), e: window.__cassette3d.poseError() }));
  check(got.s === 'presented' && got.e < 1e-6, 'all the way back to presented in one request', JSON.stringify(got));

  // b) Mid-animation reversal: open, then close again 0.3 s in.
  await page.evaluate(() => window.__cassette3d.request('lidOpen'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT_DIR}machine-mid-open.png` });
  await page.evaluate(() => window.__cassette3d.request('presented'));
  await idle();
  got = await page.evaluate(() => ({ s: window.__cassette3d.getState(), e: window.__cassette3d.poseError() }));
  check(got.s === 'presented' && got.e < 1e-6, 'reversed mid-animation, back at rest', JSON.stringify(got));

  // c) Spam: random requests at random moments, then it must settle exactly on the last one.
  const spam = await page.evaluate(async ({ states, n }) => {
    const api = window.__cassette3d;
    let last = 'presented';
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      if (r < 0.2) api.step(1);
      else if (r < 0.35) api.step(-1);
      else api.request(states[Math.floor(Math.random() * states.length)]);
      last = api.getTarget();
      await new Promise((res) => setTimeout(res, Math.random() * 250));
    }
    return last;
  }, { states: HERO_STATES, n: SPAM });
  await idle(60_000);
  got = await page.evaluate(() => ({ s: window.__cassette3d.getState(), e: window.__cassette3d.poseError() }));
  check(got.s === spam && got.e < 1e-6, `spam test (${SPAM} random requests) settles on the last one`, `wanted ${spam}, ${JSON.stringify(got)}`);
  await frames(page);
  await page.screenshot({ path: `${OUT_DIR}machine-after-spam.png` });

  // d) The overlay: its buttons drive the same machine.
  await page.evaluate(() => window.__cassette3d.goTo('presented'));
  await page.getByRole('button', { name: 'Open case' }).click();
  await idle();
  check(await page.evaluate(() => window.__cassette3d.getState()) === 'lidOpen', 'overlay button: Open case');
  await page.keyboard.press('Escape');
  await idle();
  check(await page.evaluate(() => window.__cassette3d.getState()) === 'presented', 'Escape steps back');

  // e) Clicking the case itself opens it; clicking the cassette takes it out.
  await page.evaluate(() => { window.__cassette3d.goTo('presented'); window.__cassette3d.setView('front'); });
  await frames(page);
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await idle();
  check(await page.evaluate(() => window.__cassette3d.getState()) === 'lidOpen', 'clicking the case opens it');

  // f) The unfolded card (fixture 2 has an inside): turn it over, then fold everything away.
  await page.evaluate(() => window.__cassette3d.loadFixture('2'));
  await page.evaluate(() => window.__cassette3d.request('jcardUnfolded'));
  await idle();
  await page.evaluate(() => window.__cassette3d.flip());
  await idle();
  got = await page.evaluate(() => ({ s: window.__cassette3d.getState(), e: window.__cassette3d.poseError() }));
  check(got.s === 'jcardUnfolded' && got.e < 1e-6, 'turned the unfolded card over', JSON.stringify(got));
  await frames(page);
  await page.screenshot({ path: `${OUT_DIR}machine-jcardUnfolded-inside.png` });
  await page.evaluate(() => window.__cassette3d.request('presented'));
  await idle();
  got = await page.evaluate(() => ({ s: window.__cassette3d.getState(), e: window.__cassette3d.poseError() }));
  check(got.s === 'presented' && got.e < 1e-6, 'from the turned-over card back to presented', JSON.stringify(got));

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
  await leakCycles(page, CYCLES, baseline);

  // 4. Debug overlay.
  await page.goto(`${BASE_URL}/library/3d?3d=1&tier=${TIER}&debug=1`, { waitUntil: 'networkidle' });
  await waitForScene(page);
  check(await page.locator('.lil-gui').count() > 0, 'lil-gui shows with ?debug=1');
  await page.screenshot({ path: `${OUT_DIR}debug.png` });

  // 5. Optional per-state shots via ?debugState.
  for (const state of STATES) {
    await page.goto(`${BASE_URL}/library/3d?3d=1&tier=${TIER}&debugState=${state}`, { waitUntil: 'networkidle' });
    await waitForScene(page);
    const got = await page.evaluate(() => window.__cassette3d.getState());
    check(got === state, `debugState=${state}`, got);
    await page.screenshot({ path: `${OUT_DIR}state-${state}.png` });
  }

  // 6. Reduced motion: a request becomes a quick fade and a cut.
  await page.goto(`${BASE_URL}/library/3d?3d=1&tier=${TIER}&fixture=1&motion=reduce&turntable=0`, { waitUntil: 'networkidle' });
  await waitForScene(page);
  const t0 = Date.now();
  await page.evaluate(() => window.__cassette3d.request('jcardOut'));
  await page.waitForFunction(() => !window.__cassette3d.isAnimating(), null, { timeout: 10_000 });
  const reduced = await page.evaluate(() => ({ s: window.__cassette3d.getState(), e: window.__cassette3d.poseError() }));
  check(reduced.s === 'jcardOut' && reduced.e < 1e-6, 'reduced motion: straight to the state', `${Date.now() - t0} ms, ${JSON.stringify(reduced)}`);
  await page.evaluate(() => window.__cassette3d.request('onShelf'));
  await page.waitForFunction(() => !window.__cassette3d.isAnimating(), null, { timeout: 10_000 });
  const reducedBack = await page.evaluate(() => ({ s: window.__cassette3d.getState(), e: window.__cassette3d.poseError() }));
  check(reducedBack.s === 'onShelf' && reducedBack.e < 1e-6, 'reduced motion: back onto the shelf', JSON.stringify(reducedBack));

  // 7. Stage 4: the shelf, seeded with SEED tapes.
  await shelfTests(page);

  // 8. Stage 6: lighting, surfaces, contact shadows, sound.
  await polishTests(page);

  // 9. Stage 7: quality tiers, the frame-time probe, textures on selection, context loss, no WebGL.
  await qualityTests(page);
} finally {
  await browser.close();
}

/**
 * Leave the 3D page and come back, `cycles` times (Stage 7: CYCLES=20). Each time,
 * leaving must free every geometry and texture, and coming back must match the
 * first mount's renderer memory. The JS heap (after a forced GC) must end where
 * it was after the first return, give or take 10 % + 3 MB (the snapshot cache
 * and the like fill up on the first round).
 */
async function leakCycles(page, cycles, baseline) {
  const cdp = await page.context().newCDPSession(page);
  const heap = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    return (await cdp.send('Runtime.getHeapUsage')).usedSize;
  };
  const heaps = [];
  for (let i = 0; i < cycles; i++) {
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
    heaps.push(await heap());
    check(
      again.memory.geometries === baseline.memory.geometries && again.memory.textures === baseline.memory.textures && again.canvases === 1,
      `cycle ${i + 1}: returning matches baseline`,
      `${JSON.stringify(again)}, heap ${(heaps.at(-1) / 1e6).toFixed(1)} MB`,
    );
  }
  if (heaps.length >= 2) {
    const [first, last] = [heaps[0], heaps.at(-1)];
    check(last <= first * 1.1 + 3e6, `JS heap back to baseline after ${cycles} cycles`, `${(first / 1e6).toFixed(1)} MB → ${(last / 1e6).toFixed(1)} MB`);
  }
  await cdp.detach();
}

async function qualityTests(page) {
  const idle = (timeout = 60_000) => page.waitForFunction(() => !window.__cassette3d.isAnimating(), null, { timeout });
  const url = (query) => `${BASE_URL}/library/3d?3d=1&${query}`;
  // What each tier should have switched on and off, read back from the scene.
  const readScene = () => page.evaluate(() => {
    const api = window.__cassette3d;
    const scene = api.scene;
    let key = null;
    let plastic = null;
    scene.traverse((o) => {
      if (o.isDirectionalLight) key = o;
      const m = o.material;
      if (!plastic && m && !Array.isArray(m) && String(m.name).startsWith('casePlastic')) plastic = m;
    });
    const flap = scene.getObjectByName('flap1');
    const faces = flap && Array.isArray(flap.material) ? flap.material : [];
    const map = faces[4]?.map;
    return {
      quality: api.quality(),
      pixelRatio: api.renderer.getPixelRatio(),
      shadows: key.castShadow,
      shadowSize: key.shadow.mapSize.x,
      contact: scene.getObjectByName('contactShadows').visible,
      transmission: plastic.transmission,
      blended: plastic.transparent,
      scuffs: !('NO_SCUFFS' in (plastic.defines ?? {})),
      jcardPx: map?.image ? Math.max(map.image.width, map.image.height) : null,
      calls: api.info().render.calls,
    };
  });
  const EXPECT = {
    high: { pixelRatio: 2, shadows: true, shadowSize: 2048, contact: true, transmission: 1, blended: false, scuffs: true, jcardPx: 4096, dof: true },
    mid: { pixelRatio: 1.5, shadows: true, shadowSize: 1024, contact: true, transmission: 0, blended: true, scuffs: true, jcardPx: 2048, dof: false },
    low: { pixelRatio: 1, shadows: false, contact: false, transmission: 0, blended: true, scuffs: false, jcardPx: 1024, dof: false },
  };
  const matches = (got, want) => got.quality.tier === want.tier
    && got.pixelRatio <= want.pixelRatio
    && got.shadows === want.shadows && (!want.shadows || got.shadowSize === want.shadowSize)
    && got.contact === want.contact && got.transmission === want.transmission && got.blended === want.blended
    && got.scuffs === want.scuffs && got.jcardPx !== null && got.jcardPx <= want.jcardPx
    && got.quality.dofActive === want.dof;

  // a) ?tier= forces each tier, and everything in the table follows.
  for (const tier of ['high', 'mid', 'low']) {
    await page.goto(url(`tier=${tier}&fixture=1&turntable=0`), { waitUntil: 'networkidle' });
    await waitForScene(page);
    await page.evaluate(() => window.__cassette3d.setView('threeQuarter'));
    await frames(page, 5);
    const got = await readScene();
    check(matches(got, { ...EXPECT[tier], tier }) && got.quality.forced, `?tier=${tier}: settings applied`, JSON.stringify({ ...got, quality: { tier: got.quality.tier, forced: got.quality.forced, dofActive: got.quality.dofActive } }));
    await page.screenshot({ path: `${OUT_DIR}quality-${tier}.png` });
    if (tier !== 'mid') {
      await page.evaluate(() => window.__cassette3d.request('jcardUnfolded'));
      await idle();
      await frames(page, 5);
      await page.screenshot({ path: `${OUT_DIR}quality-${tier}-unfolded.png` });
    }
  }

  // b) Picked from the device: SwiftShader is a software renderer, so low.
  await page.goto(url('fixture=1&turntable=0'), { waitUntil: 'networkidle' });
  await waitForScene(page);
  const auto = await readScene();
  check(auto.quality.tier === 'low' && !auto.quality.forced && auto.quality.reasons.some((r) => r.startsWith('software renderer')),
    'no ?tier=: a software renderer gets low', auto.quality.reasons.join('; '));

  // c) The frame-time probe: started on high, this slow renderer gets stepped down to low.
  await page.goto(url('probeFrom=high&fixture=1'), { waitUntil: 'networkidle' });
  await waitForScene(page);
  await page.waitForFunction(() => window.__cassette3d.quality().tier === 'low', null, { timeout: 180_000 }).catch(() => {});
  const probed = await readScene();
  check(probed.quality.tier === 'low' && probed.quality.probes.length === 2 && !probed.shadows && !probed.contact,
    'frame-time probe steps high → mid → low on a slow renderer', JSON.stringify(probed.quality.probes));

  // d) Full-size J-card textures only while the tape is off the shelf: putting it back
  //    frees them, taking it out makes them again, and round trips settle on the same numbers.
  await page.goto(url(`tier=${TIER}&fixture=1&turntable=0`), { waitUntil: 'networkidle' });
  await waitForScene(page);
  const selected = await page.evaluate(() => window.__cassette3d.getShelfInfo().selected);
  const counts = [await page.evaluate(() => window.__cassette3d.info().memory.textures)];
  for (let round = 0; round < 2; round++) {
    await page.evaluate(() => window.__cassette3d.request('onShelf'));
    await idle();
    await frames(page);
    const report = await page.evaluate(() => window.__cassette3d.getTextureReport().status);
    counts.push(await page.evaluate(() => window.__cassette3d.info().memory.textures));
    if (round === 0) check(report === 'idle' && counts[1] < counts[0], 'back on the shelf: the J-card and label textures are freed', `${counts[0]} → ${counts[1]} textures`);
    await page.evaluate((i) => window.__cassette3d.selectTape(i), selected);
    await page.waitForFunction(() => window.__cassette3d.getTextureReport().status === 'ready' && !window.__cassette3d.isAnimating(), null, { timeout: 60_000 });
    await frames(page);
    counts.push(await page.evaluate(() => window.__cassette3d.info().memory.textures));
  }
  check(counts[3] === counts[1] && counts[4] === counts[2] && counts[2] > counts[1], 'taking it out and back again settles (no texture leak)', counts.join(' → '));

  // e) Context loss: the whole scene is rebuilt, with the same tape out. Once with the
  //    browser giving the context back, once without (a fresh canvas after the wait).
  for (const restore of [400, null]) {
    const before = await page.evaluate(() => {
      window.__oldRenderer = window.__cassette3d.renderer;
      return window.__cassette3d.getTextureReport().tape?.id;
    });
    const lost = await page.evaluate((ms) => window.__cassette3d.loseContext(ms), restore);
    await page.waitForFunction(
      () => window.__cassette3d && window.__cassette3d.renderer !== window.__oldRenderer
        && window.__cassette3d.getTextureReport().status === 'ready' && !window.__cassette3d.isAnimating(),
      null,
      { timeout: 120_000 },
    );
    await frames(page, 5);
    const rebuilt = await page.evaluate(() => ({
      state: window.__cassette3d.getState(),
      tape: window.__cassette3d.getTextureReport().tape?.id,
      canvases: document.querySelectorAll('canvas').length,
      reported: window.__cassette3d.reportedErrors().filter((r) => r.area === 'contextLost').length,
    }));
    check(lost && rebuilt.state === 'presented' && rebuilt.tape === before && rebuilt.canvases === 1 && rebuilt.reported > 0,
      `context lost${restore === null ? ' for good' : ''}: scene rebuilt with the same tape`, JSON.stringify(rebuilt));
    await page.screenshot({ path: `${OUT_DIR}quality-after-context-loss${restore === null ? '-fresh' : ''}.png` });
  }

  // f) No WebGL at all: straight on to the 2D library, with a note.
  const noGl = await chromium.launch({ executablePath: EXECUTABLE, args: ['--disable-3d-apis', '--disable-gpu'] });
  try {
    const p2 = await noGl.newPage({ viewport: { width: 1280, height: 800 } });
    await p2.goto(url('fixture=1'), { waitUntil: 'networkidle' });
    await p2.waitForURL((u) => u.pathname === '/library', { timeout: 30_000 }).catch(() => {});
    const note = await p2.getByText('can\'t show the 3D library').isVisible().catch(() => false);
    const after = { path: new URL(p2.url()).pathname, view: new URL(p2.url()).searchParams.get('view'), note, remembered: await p2.evaluate(() => localStorage.getItem('library-view')) };
    check(after.path === '/library' && after.view === '2d' && note && after.remembered === '2d', 'no WebGL: redirected to the 2D library with a note', JSON.stringify(after));
    await p2.screenshot({ path: `${OUT_DIR}quality-no-webgl.png` });
  } finally {
    await noGl.close();
  }
}

async function polishTests(page) {
  await page.goto(`${BASE_URL}/library/3d?3d=1&tier=${TIER}&fixture=1&turntable=0`, { waitUntil: 'networkidle' });
  await waitForScene(page);
  const idle = () => page.waitForFunction(() => !window.__cassette3d.isAnimating(), null, { timeout: 30_000 });
  check(await page.evaluate(() => window.__cassette3d.environment()) === 'hdri', 'lit by the studio HDRI (not the RoomEnvironment fallback)');

  const contactVisible = () => page.evaluate(() => window.__cassette3d.scene.getObjectByName('contactShadows').visible);
  await frames(page);
  check(await contactVisible(), 'contact shadows under the hero tape');

  // Screenshots for judging the look (compare with the Stage 5 ones, or vhs.texs.org).
  const POLISH_SHOTS = [
    ['threeQuarter', (api) => api.setView('threeQuarter')],
    ['scuffs', (api) => { api.setView('threeQuarter'); api.setElevation(28); api.setDistanceScale(0.55); }],
    ['scuffs-empty', (api) => api.setPartsVisible({ jcard: false, cassette: false })],
    ['paper-closeup', (api) => { api.setPartsVisible({ case: false, jcard: true, cassette: false }); api.setView('front'); api.setElevation(5); api.setDistanceScale(0.3); }],
    ['label-closeup', (api) => { api.setPartsVisible({ case: false, jcard: false, cassette: true }); api.setView('front'); api.setElevation(10); api.setDistanceScale(0.5); }],
  ];
  for (const [name, setup] of POLISH_SHOTS) {
    await page.evaluate(`(${setup.toString()})(window.__cassette3d)`);
    await frames(page, 5);
    await page.screenshot({ path: `${OUT_DIR}polish-${name}.png` });
  }
  await page.evaluate(() => {
    const api = window.__cassette3d;
    api.setPartsVisible({ case: true, cassette: true, jcard: true });
    api.setView('front');
    api.setElevation(10);
    api.setDistanceScale(1);
  });

  // Sound: walk the tape with the overlay's buttons (real clicks, so the audio can start)
  // and check every step was heard (synthesised, or a recording where one is set up).
  const clickAndWait = async (name) => {
    await page.getByRole('button', { name }).click();
    await idle();
  };
  for (const name of ['Open case', 'Take out cassette', 'Take out J-card', 'Unfold J-card']) await clickAndWait(name);
  await frames(page, 5);
  await page.screenshot({ path: `${OUT_DIR}polish-unfolded.png` });
  await clickAndWait('Fold up');
  await frames(page, 5);
  await page.screenshot({ path: `${OUT_DIR}polish-cassette-on-table.png` });
  await page.evaluate(() => window.__cassette3d.request('presented'));
  await idle();
  await page.waitForTimeout(300);
  const heard = await page.evaluate(() => window.__cassette3d.sounds());
  const cues = heard.map((h) => h.cue);
  // In order (other cues may sit in between: several creases, the card turning back).
  const expected = ['caseOpen', 'cassetteOut', 'paperSlide', 'cassetteDown', 'crease', 'crease', 'paperSlide', 'cassetteIn', 'caseClose'];
  let matched = 0;
  for (const c of cues) if (c === expected[matched]) matched++;
  const inOrder = matched === expected.length;
  check(inOrder && heard.every((h) => h.source !== 'silent'), 'sound cues on every step, audible', cues.join(' '));
  check(heard.some((h) => h.source === 'synth' || h.source === 'file'), 'sounds are synthesised or recordings', [...new Set(heard.map((h) => h.source))].join(', '));

  // The mute switch: silences the cues and survives a reload.
  await page.getByRole('button', { name: 'Sound effects' }).first().click();
  const muted = await page.evaluate(() => ({ muted: window.__cassette3d.isMuted(), saved: localStorage.getItem('library3d-sound') }));
  check(muted.muted && muted.saved === 'off', 'mute switch mutes and is remembered', JSON.stringify(muted));
  await page.reload({ waitUntil: 'networkidle' });
  await waitForScene(page);
  await clickAndWait('Open case');
  const afterReload = await page.evaluate(() => ({ muted: window.__cassette3d.isMuted(), last: window.__cassette3d.sounds().at(-1) }));
  check(afterReload.muted && afterReload.last?.source === 'silent', 'still muted after a reload', JSON.stringify(afterReload));
  await page.getByRole('button', { name: 'Sound effects' }).first().click();
  check(await page.evaluate(() => !window.__cassette3d.isMuted() && localStorage.getItem('library3d-sound') === 'on'), 'unmuting is remembered too');

  // Back on the shelf: no contact shadows (the hero tape isn't out).
  await page.evaluate(() => window.__cassette3d.goTo('onShelf'));
  await frames(page);
  check(!(await contactVisible()), 'no contact shadows while the tape is on the shelf');
  await page.goto(`${BASE_URL}/library/3d?3d=1&tier=${TIER}&seed=60`, { waitUntil: 'networkidle' });
  await waitForScene(page);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT_DIR}polish-shelf.png` });
}

async function shelfTests(page) {
  const api = () => page.evaluate(() => {
    const a = window.__cassette3d;
    const info = a.getShelfInfo();
    return {
      s: a.getState(), t: a.getTarget(), e: a.poseError(), calls: a.info().render.calls,
      count: info.count, shown: info.order.length, selected: info.selected, hovered: info.hovered, bays: info.bays,
    };
  });
  const idle = (timeout = 30_000) => page.waitForFunction(() => !window.__cassette3d.isAnimating(), null, { timeout });
  const waitForShelf = async () => {
    await page.waitForFunction(() => window.__cassette3d?.getShelfInfo().count > 0 && window.__cassette3d.getState() === 'onShelf', null, { timeout: 60_000 });
    await frames(page, 4);
  };

  await page.goto(`${BASE_URL}/library/3d?3d=1&tier=${TIER}&seed=${SEED}`, { waitUntil: 'networkidle' });
  await waitForShelf();
  let got = await api();
  check(got.count === SEED && got.shown === SEED, `shelf: ${SEED} seeded tapes on the shelf`, `${got.count} tapes, ${got.bays} bays`);
  check(got.calls <= MAX_CALLS, `shelf: ${SEED} tapes in a handful of draw calls`, `${got.calls} calls (budget ${MAX_CALLS})`);
  await page.screenshot({ path: `${OUT_DIR}shelf.png` });
  await page.evaluate(() => { window.__cassette3d.setShelfZoom(0.3); window.__cassette3d.setShelfPan(-12, 48); });
  await frames(page);
  await page.screenshot({ path: `${OUT_DIR}shelf-closeup.png` });
  await page.evaluate(() => { window.__cassette3d.setShelfZoom(1); window.__cassette3d.setShelfPan(1e3, 0); });
  await frames(page);
  await page.screenshot({ path: `${OUT_DIR}shelf-last-bay.png` });
  await page.evaluate(() => window.__cassette3d.setShelfPan(-1e3, 0));
  await frames(page);

  // Hover with a real mouse: the case slides out and the overlay names it.
  const canvas = await page.locator('canvas').boundingBox();
  const target = 30;
  const at = await page.evaluate((i) => window.__cassette3d.spineScreenPosition(i), target);
  await page.mouse.move(canvas.x + at.x, canvas.y + at.y);
  await page.waitForTimeout(500);
  got = await api();
  const title = await page.evaluate((i) => window.__cassette3d.getShelfInfo().ids[i], target);
  const caption = await page.locator('.lib3d-caption strong').textContent().catch(() => '');
  check(got.hovered === target && !!caption, 'shelf: hovering a spine highlights it and shows its title', `hovered ${got.hovered}, "${caption}" (${title})`);
  await page.screenshot({ path: `${OUT_DIR}shelf-hover.png` });

  // Click: off the shelf, onto the turntable.
  await page.mouse.click(canvas.x + at.x, canvas.y + at.y);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT_DIR}shelf-pulling.png` });
  await idle();
  got = await api();
  check(got.s === 'presented' && got.selected === target && got.e < 1e-6, 'shelf: clicking a tape brings it to the turntable', JSON.stringify(got));
  await frames(page);
  await page.screenshot({ path: `${OUT_DIR}shelf-presented.png` });

  // And back onto the shelf; the instance takes over again.
  await page.evaluate(() => window.__cassette3d.request('onShelf'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT_DIR}shelf-returning.png` });
  await idle();
  await frames(page);
  got = await api();
  check(got.s === 'onShelf' && got.e < 1e-6 && got.calls <= MAX_CALLS, 'shelf: back onto the shelf', JSON.stringify(got));

  // Reverse mid-flight.
  await page.evaluate((i) => window.__cassette3d.selectTape(i), 5);
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__cassette3d.request('onShelf'));
  await idle();
  got = await api();
  check(got.s === 'onShelf' && got.e < 1e-6, 'shelf: reversed mid-flight, back in its slot', JSON.stringify(got));

  // Another tape while one is out: the first goes back, then the second comes off.
  await page.evaluate(() => window.__cassette3d.selectTape(7));
  await idle();
  await page.evaluate(() => window.__cassette3d.selectTape(12));
  await idle();
  got = await api();
  check(got.s === 'presented' && got.selected === 12 && got.e < 1e-6, 'shelf: choosing another tape swaps them', JSON.stringify(got));

  // Escape walks back: presented → pulledOut → onShelf.
  await page.keyboard.press('Escape');
  await idle();
  const mid = (await api()).s;
  await page.keyboard.press('Escape');
  await idle();
  got = await api();
  check(mid === 'pulledOut' && got.s === 'onShelf', 'shelf: Escape puts the tape back step by step', `${mid} → ${got.s}`);

  // Search and sort re-flow the shelf.
  // A word only some seeded titles have (the seeded track lists all share the same songs).
  const shown = await page.evaluate(() => window.__cassette3d.setShelfView('velvet', 'title').length);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT_DIR}shelf-search.png` });
  const titles = await page.evaluate(() => {
    const a = window.__cassette3d.getShelfInfo();
    // List items read "<title>, C-90 · 11 tracks": compare the titles only.
    return a.order.map((i) => (document.querySelectorAll('.lib3d-list-item')[a.order.indexOf(i)]?.textContent ?? '').trim().replace(/, C-\d+ · \d+ tracks$/, ''));
  });
  const sorted = titles.every((t, i) => i === 0 || titles[i - 1].localeCompare(t, undefined, { sensitivity: 'base', numeric: true }) <= 0);
  check(shown > 0 && shown < SEED && sorted, 'shelf: search filters and sort orders the shelf', `${shown} shown, sorted ${sorted}`);
  await page.fill('.lib3d-search', 'zzzz-no-such-tape');
  await page.waitForTimeout(200);
  check(await page.locator('.lib3d-empty').isVisible(), 'shelf: a search with no match says so');
  await page.fill('.lib3d-search', '');
  await page.waitForTimeout(200);
  got = await api();
  check(got.shown === SEED, 'shelf: clearing the search puts every tape back', `${got.shown}`);

  // Keyboard: the hidden list of tapes; focus highlights, Enter takes it off the shelf.
  const first = page.locator('.lib3d-list-item').first();
  await first.focus();
  await page.waitForTimeout(300);
  const focused = (await api()).hovered;
  await page.keyboard.press('Enter');
  await idle();
  got = await api();
  check(focused !== null && got.s === 'presented' && got.selected === focused, 'shelf: keyboard focus highlights a tape and Enter selects it', `focused ${focused}, ${JSON.stringify(got)}`);
  await page.getByRole('button', { name: 'Back to the shelf' }).click();
  await idle();

  // Phone.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await frames(page);
  await page.screenshot({ path: `${OUT_DIR}shelf-mobile.png` });
  await page.setViewportSize({ width: 1280, height: 800 });

  // Deep link: ?tape= starts with that tape on the turntable; Back puts it on the shelf.
  await page.goto(`${BASE_URL}/library/3d?3d=1&tier=${TIER}&seed=${SEED}&tape=seed-100`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__cassette3d?.getShelfInfo().count > 0, null, { timeout: 60_000 });
  await frames(page, 4);
  got = await api();
  check(got.s === 'presented' && got.selected === 100, 'shelf: ?tape= deep link presents that tape', JSON.stringify(got));
  await page.evaluate(() => window.__cassette3d.request('onShelf'));
  await idle();
  await frames(page);
  got = await api();
  check(got.s === 'onShelf' && got.e < 1e-6, 'shelf: deep-linked tape goes back to its slot (in bay 2)', JSON.stringify(got));
  await page.screenshot({ path: `${OUT_DIR}shelf-deeplink-returned.png` });

  // Empty shelf (dev: ?seed=0).
  await page.goto(`${BASE_URL}/library/3d?3d=1&tier=${TIER}&seed=0`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.lib3d-empty', { timeout: 30_000 });
  check(await page.getByRole('button', { name: /Make a tape/ }).isVisible(), 'shelf: empty state offers to make a tape');
  await page.screenshot({ path: `${OUT_DIR}shelf-empty.png` });
}

console.log(`\nScreenshots in ${OUT_DIR}`);
process.exit(failures ? 1 : 0);

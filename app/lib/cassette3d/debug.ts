import { CASE } from './dimensions';
import { DEFAULT_HERO_OPTIONS, type Hero, type HeroOptions, type TextureReport } from './hero';
import type { TapeData } from './tapeData';
import type { Library, ShelfSort } from './library';
import { HERO_VIEWS, isHeroViewName, type HeroViewName } from './heroView';
import { SURFACE, type CaseTint } from './materials';
import { ENVIRONMENT, type CassetteScene } from './scene';
import { CONTACT_SHADOWS } from './contactShadows';
import { DOF } from './dof';
import type { TapeSounds } from './audio';
import { recentReports, type ReportedError } from './report';
import { ANIM } from './animation/config';
import { isTapeState, TAPE_STATES, type TapeState } from './animation/states';

/**
 * Debug hooks for tuning and for screenshot-based self-verification.
 *
 *  - ?debug=1                       lil-gui + stats.js overlay
 *  - ?debugState=<state>&tape=<id>  jump straight to a state, no animation
 *  - window.__cassette3d            (dev only) goTo / setTape / getState / renderer info,
 *                                   plus the Stage 1 hero controls (views, lid, J-card fold)
 *
 * Tape (Stage 2): ?fixture=1|2|3 shows a built-in sample; ?tape=<mixtape id> one of yours.
 * Shelf (Stage 4): ?seed=<n> fills it with n generated tapes (dev only).
 *
 * Hero inspection params (Stage 1): ?view=front|threeQuarter|spine|back|threeQuarterBack,
 * ?case=smoke, ?flaps=1–6, ?shortBack=1, ?lid=<deg>, ?moving=lid|tray, ?fold=<0–1>, ?turntable=0.
 *
 * ?motion=reduce forces the reduced-motion path.
 */

export interface DebugParams {
  debug: boolean;
  debugState: TapeState | null;
  tape: string | null;
  hero: HeroOptions;
}

type QueryValue = string | null | (string | null)[] | undefined;

function first(value: QueryValue): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

export function parseDebugParams(query: Record<string, QueryValue>): DebugParams {
  const state = first(query.debugState);
  if (state && !isTapeState(state)) console.warn(`[cassette3d] Unknown debugState "${state}"`);
  return {
    debug: first(query.debug) === '1',
    debugState: isTapeState(state) ? state : null,
    tape: first(query.tape),
    hero: parseHeroParams(query),
  };
}

function numberParam(value: QueryValue, fallback: number, min: number, max: number): number {
  const raw = first(value);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
}

function parseHeroParams(query: Record<string, QueryValue>): HeroOptions {
  const d = DEFAULT_HERO_OPTIONS;
  const view = first(query.view);
  const tint = first(query.case);
  return {
    flaps: Math.round(numberParam(query.flaps, d.flaps, 1, 6)),
    shortBack: first(query.shortBack) === '1',
    tint: tint === 'smoke' || tint === 'clear' ? tint : d.tint,
    view: isHeroViewName(view) ? view : null,
    lidDeg: numberParam(query.lid, d.lidDeg, 0, CASE.lidOpenDeg),
    movingHalf: first(query.moving) === 'tray' ? 'tray' : d.movingHalf,
    fold: numberParam(query.fold, d.fold, 0, 1),
    autoRotate: first(query.turntable) !== '0',
  };
}

export interface Cassette3DDebugApi {
  /** Jump straight to a state, no animation. */
  goTo: (state: TapeState) => void;
  /** Animate to a state (queued / reversed like a click would be). */
  request: (state: TapeState) => void;
  /** One step forwards (+1) or back (−1). */
  step: (dir: 1 | -1) => void;
  setTape: (id: string | null) => void;
  getState: () => TapeState;
  getTarget: () => TapeState;
  isAnimating: () => boolean;
  /** 0 when every animated number is exactly at the resting state's value. */
  poseError: () => number;
  /** Swing the camera to the other face of the unfolded card. */
  flip: () => Promise<void>;
  getTape: () => string | null;
  readonly renderer: CassetteScene['renderer'];
  readonly scene: CassetteScene['scene'];
  /** Snapshot of renderer.info.memory / render, safe to JSON-serialise from Playwright. */
  info: () => { memory: { geometries: number; textures: number }; render: { calls: number; triangles: number } };
  // Stage 1 hero controls.
  setView: (view: HeroViewName) => void;
  setAutoRotate: (on: boolean) => void;
  setElevation: (deg: number) => void;
  setDistanceScale: (scale: number) => void;
  setLidAngle: (deg: number) => void;
  setMovingHalf: Hero['setMovingHalf'];
  setJCardFold: (amount: number) => void;
  setJCardLayout: (flaps: number, shortBack?: boolean) => void;
  setCaseTint: (tint: CaseTint) => void;
  setPartsVisible: Hero['setPartsVisible'];
  // Stage 2 textures.
  /** Show a built-in sample tape (1–3); resolves when its textures are on. */
  loadFixture: (name: string) => Promise<TextureReport>;
  /** Show any mixtape + J-card pair, e.g. rows pasted from the database. */
  showTape: (data: Omit<TapeData, 'source'> & { source?: TapeData['source'] }) => Promise<TextureReport>;
  getTextureReport: () => TextureReport;
  // Stage 4 shelf.
  /** Take tape `index` (in the shelf's list) off the shelf, animated. */
  selectTape: (index: number) => void;
  /** Hover highlight, as the overlay's keyboard focus does. */
  highlightTape: (index: number | null) => void;
  setShelfView: (search: string, sort: ShelfSort) => number[];
  getShelfInfo: () => {
    count: number;
    order: number[];
    selected: number | null;
    hovered: number | null;
    /** Tapes whose spine on the shelf is the real one (from a render), not drawn. */
    realSpines: number[];
    bays: number;
    pan: { x: number; y: number };
    zoom: number;
    ids: string[];
  };
  setShelfPan: (x: number, y: number) => void;
  setShelfZoom: (zoom: number) => void;
  /** Screen position (CSS px, relative to the canvas) of a tape's spine, or null if it isn't on the shelf. */
  spineScreenPosition: (index: number) => { x: number; y: number } | null;
  // Stage 6 polish.
  /** Which environment map lit the scene: the studio HDRI, or RoomEnvironment if it failed to load. */
  environment: () => Promise<'hdri' | 'room'>;
  /** Sound cues so far (newest last) and the mute switch. */
  sounds: () => ReturnType<TapeSounds['log']>;
  isMuted: () => boolean;
  // Stage 7 robustness.
  /** The quality tier in use, why, and what the frame-time probe did. */
  quality: () => unknown;
  /** Lose the WebGL context; the browser gives it back after `restoreAfterMs` (null: never, so the rebuild starts over). */
  loseContext: (restoreAfterMs: number | null) => boolean;
  /** Errors and warnings passed to Sentry (tagged feature: library3d), newest last. */
  reportedErrors: () => ReportedError[];
  /** The Stage 6 tuning objects, live (as the GUI edits them). */
  tuning: { surface: typeof SURFACE; contactShadows: typeof CONTACT_SHADOWS; environment: typeof ENVIRONMENT; dof: typeof DOF };
}

declare global {
  interface Window {
    __cassette3d?: Cassette3DDebugApi;
    /** renderer.info.memory right after the last dispose, before the renderer itself went away. */
    __cassette3dLastDispose?: { geometries: number; textures: number };
  }
}

/** Installs the debug hooks. Returns a cleanup function. */
export async function installDebug(
  handle: CassetteScene,
  hero: Hero,
  library: Library,
  params: DebugParams,
  isDev: boolean,
  sounds: TapeSounds | null = null,
  extra: { quality: () => unknown; loseContext: (restoreAfterMs: number | null) => boolean } = {
    quality: () => null,
    loseContext: () => false,
  },
): Promise<() => void> {
  const cleanups: (() => void)[] = [];

  let tape: string | null = params.tape;

  if (isDev) {
    const { renderer } = handle;
    // Under browser automation (headless, software GL) a frame can take over half a
    // second, and GSAP's lag smoothing then crawls at ~33 ms per frame. Let the
    // timelines follow the wall clock instead so tests finish in real time.
    if (navigator.webdriver) {
      const { gsap } = await import('gsap');
      gsap.ticker.lagSmoothing(0);
      cleanups.push(() => gsap.ticker.lagSmoothing(500, 33));
    }
    window.__cassette3d = {
      goTo(next) {
        if (!isTapeState(next)) throw new Error(`Unknown tape state "${next}"`);
        hero.machine.jump(next);
      },
      request(next) {
        if (!isTapeState(next)) throw new Error(`Unknown tape state "${next}"`);
        hero.machine.request(next);
      },
      step: (dir) => hero.machine.step(dir),
      setTape(id) {
        tape = id;
      },
      getState: () => hero.machine.getState(),
      getTarget: () => hero.machine.getTarget(),
      isAnimating: () => hero.machine.isAnimating(),
      poseError: () => hero.machine.poseError(),
      flip: () => hero.machine.flip(),
      getTape: () => tape,
      renderer,
      scene: handle.scene,
      info: () => ({
        memory: { ...renderer.info.memory },
        render: { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles },
      }),
      setView: (view) => hero.view.setView(view),
      setAutoRotate: (on) => hero.view.setAutoRotate(on),
      setElevation: (deg) => hero.view.setElevation(deg),
      setDistanceScale: (scale) => hero.view.setDistanceScale(scale),
      setLidAngle: (deg) => hero.setLidAngle(deg),
      setMovingHalf: (half) => hero.setMovingHalf(half),
      setJCardFold: (amount) => hero.setJCardFold(amount),
      setJCardLayout: (flaps, shortBack = false) => hero.setJCardLayout({ flaps, shortBack }),
      setCaseTint: (tint) => hero.tape.setCaseTint(tint),
      setPartsVisible: (parts) => hero.setPartsVisible(parts),
      async loadFixture(name) {
        const { FIXTURES } = await import('./fixtures');
        const make = FIXTURES[name];
        if (!make) throw new Error(`Unknown fixture "${name}"`);
        await hero.setTape(make());
        return hero.getTextureReport();
      },
      async showTape(data) {
        await hero.setTape({ source: 'fixture', ...data });
        return hero.getTextureReport();
      },
      getTextureReport: () => hero.getTextureReport(),
      selectTape: (index) => library.select(index),
      highlightTape: (index) => library.highlight(index),
      setShelfView: (search, sort) => library.setView(search, sort),
      getShelfInfo() {
        const shelf = library.shelf();
        const view = library.shelfView();
        return {
          count: library.getTapes().length,
          order: [...library.getOrder()],
          selected: library.selected(),
          hovered: library.hovered(),
          realSpines: library.realSpines(),
          bays: shelf?.layout.bays ?? 0,
          pan: view.getPan(),
          zoom: view.getZoom(),
          ids: library.getTapes().map((t) => t.mixtape.id),
        };
      },
      setShelfPan: (x, y) => library.shelfView().setPan(x, y),
      setShelfZoom: (zoom) => library.shelfView().setZoom(zoom),
      spineScreenPosition(index) {
        const p = library.shelf()?.slotPosition(index);
        if (!p) return null;
        // The middle of the spine face, a little up so it clears the row's board.
        p.z += CASE.width / 2;
        p.project(handle.camera);
        const canvas = handle.renderer.domElement;
        return { x: ((p.x + 1) / 2) * canvas.clientWidth, y: ((1 - p.y) / 2) * canvas.clientHeight };
      },
      environment: () => handle.environmentReady,
      sounds: () => sounds?.log() ?? [],
      isMuted: () => sounds?.isMuted() ?? true,
      quality: extra.quality,
      loseContext: extra.loseContext,
      reportedErrors: recentReports,
      tuning: { surface: SURFACE, contactShadows: CONTACT_SHADOWS, environment: ENVIRONMENT, dof: DOF },
    };
    cleanups.push(() => {
      window.__cassette3dLastDispose = { ...renderer.info.memory };
      delete window.__cassette3d;
    });
  }

  if (params.debug) {
    const [{ default: GUI }, { default: Stats }] = await Promise.all([import('lil-gui'), import('stats.js')]);

    const stats = new Stats();
    stats.dom.style.position = 'absolute';
    stats.dom.style.left = '8px';
    stats.dom.style.top = '8px';
    handle.renderer.domElement.parentElement?.appendChild(stats.dom);
    const offFrame = handle.onFrame(() => stats.update());

    const gui = new GUI({ title: 'cassette3d', container: handle.renderer.domElement.parentElement ?? undefined });
    gui.domElement.style.position = 'absolute';
    gui.domElement.style.right = '8px';
    gui.domElement.style.top = '8px';
    const r = gui.addFolder('Renderer');
    r.add(handle.renderer, 'toneMappingExposure', 0, 3, 0.01).name('exposure');
    r.add(handle.scene, 'environmentIntensity', 0, 3, 0.01).name('env intensity');
    r.add(ENVIRONMENT, 'rotationDeg', -180, 180, 1).name('env rotation').onChange((deg: number) => {
      handle.scene.environmentRotation.y = (deg * Math.PI) / 180;
    });
    const contact = r.addFolder('Contact shadows').close();
    const redraw = () => handle.contactShadows.invalidate();
    contact.add(CONTACT_SHADOWS, 'opacity', 0, 1, 0.01);
    contact.add(CONTACT_SHADOWS, 'darkness', 0, 4, 0.05).onChange(redraw);
    contact.add(CONTACT_SHADOWS, 'far', 0.2, 8, 0.1).name('reach cm').onChange(redraw);
    contact.add(CONTACT_SHADOWS, 'blur', 0, 8, 0.1).onChange(redraw);
    const key = gui.addFolder('Key light');
    key.add(handle.keyLight, 'intensity', 0, 10, 0.05);
    // Direction the light comes from (its distance follows the shadow focus).
    key.add(handle.keyOffset, 'x', -60, 60, 0.5);
    key.add(handle.keyOffset, 'y', 1, 80, 0.5);
    key.add(handle.keyOffset, 'z', -60, 60, 0.5);

    const settings = {
      view: params.hero.view ?? 'threeQuarter',
      turntable: params.hero.autoRotate && !params.hero.view,
      lid: params.hero.lidDeg,
      moving: params.hero.movingHalf,
      fold: params.hero.fold,
      flaps: params.hero.flaps,
      shortBack: params.hero.shortBack,
      tint: params.hero.tint,
    };
    const tape = gui.addFolder('Tape');
    tape.add(settings, 'view', Object.keys(HERO_VIEWS)).onChange((v: HeroViewName) => {
      hero.view.setView(v);
      settings.turntable = false;
      turntableCtrl.updateDisplay();
    });
    const turntableCtrl = tape.add(settings, 'turntable').onChange((on: boolean) => hero.view.setAutoRotate(on));
    tape.add(settings, 'lid', 0, CASE.lidOpenDeg, 1).name('open (deg)').onChange((v: number) => hero.setLidAngle(v));
    tape.add(settings, 'moving', ['tray', 'lid']).name('swinging half').onChange((v: 'tray' | 'lid') => hero.setMovingHalf(v));
    tape.add(settings, 'fold', 0, 1, 0.01).name('J-card fold').onChange((v: number) => hero.setJCardFold(v));
    const relayout = () => hero.setJCardLayout({ flaps: settings.flaps, shortBack: settings.shortBack });
    tape.add(settings, 'flaps', 1, 6, 1).onChange(relayout);
    tape.add(settings, 'shortBack').onChange(relayout);

    const states = gui.addFolder('Tape machine');
    const actions = Object.fromEntries(TAPE_STATES.map((st) => [st, () => hero.machine.request(st)]));
    for (const st of TAPE_STATES) states.add(actions, st).name(`→ ${st}`);
    const shelfTiming = states.addFolder('Shelf timing (next transition)').close();
    shelfTiming.add(ANIM.shelf, 'pullDuration', 0.1, 2, 0.05).name('pull out: s');
    shelfTiming.add(ANIM.shelf, 'flyDuration', 0.2, 3, 0.05).name('fly in: s');
    shelfTiming.add(ANIM.shelf, 'arc', 0, 10, 0.1).name('fly arc cm');
    shelfTiming.add(ANIM.shelf, 'presentTurnDeg', -90, 90, 1).name('lands at deg');
    const timing = states.addFolder('Timing (next transition)').close();
    timing.add(ANIM.open, 'turnDeg', -90, 90, 1).name('open: turn');
    timing.add(ANIM.open, 'lidDuration', 0.1, 3, 0.05).name('open: lid s');
    timing.add(ANIM.open, 'lidDelay', 0, 1.5, 0.05).name('open: lid delay');
    timing.add(ANIM.open, 'lidEase', ['back.out(1.2)', 'back.out(1.6)', 'back.out(2.2)', 'power2.out', 'elastic.out(1,0.6)']).name('open: lid ease');
    timing.add(ANIM.cassetteOut, 'duration', 0.1, 3, 0.05).name('cassette: s');
    timing.add(ANIM.cassetteOut, 'lift', 0, 5, 0.1).name('cassette: lift cm');
    timing.add(ANIM.jcardOut, 'duration', 0.1, 3, 0.05).name('J-card: s');
    timing.add(ANIM.unfold, 'duration', 0.1, 4, 0.05).name('unfold: s');
    timing.add(ANIM.unfold, 'stagger', 0, 1, 0.01).name('unfold: stagger');

    const plastic = hero.tape.materials.casePlastic;
    const mat = gui.addFolder('Case plastic');
    mat.add(settings, 'tint', ['clear', 'smoke']).onChange((v: CaseTint) => hero.tape.setCaseTint(v));
    mat.add(plastic, 'roughness', 0, 0.5, 0.005);
    mat.add(plastic, 'transmission', 0, 1, 0.01);
    mat.add(plastic, 'thickness', 0, 1, 0.005);
    mat.add(plastic, 'ior', 1, 2, 0.01);
    mat.add(plastic, 'attenuationDistance', 0.05, 10, 0.05);
    mat.add(plastic, 'envMapIntensity', 0, 3, 0.05);
    mat.add(SURFACE, 'scuffRoughness', 0, 1, 0.01).name('scuff roughness');
    const paper = gui.addFolder('Paper');
    paper.add(SURFACE, 'paperNormal', 0, 2, 0.01).name('grain strength').onChange((v: number) => {
      hero.tape.root.traverse((obj) => {
        const m = (obj as { material?: unknown }).material;
        for (const x of (Array.isArray(m) ? m : [m]) as { normalScale?: { set: (a: number, b: number) => void } }[]) {
          x?.normalScale?.set(v, v);
        }
      });
    });

    const shell = hero.tape.materials.shell;
    const shellFolder = gui.addFolder('Cassette shell');
    shellFolder.add(shell, 'roughness', 0, 1, 0.01);
    shellFolder.addColor(shell, 'color');

    cleanups.push(() => {
      offFrame();
      gui.destroy();
      stats.dom.remove();
    });
  }

  return () => cleanups.forEach((fn) => fn());
}

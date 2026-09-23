import { CASE } from './dimensions';
import { DEFAULT_HERO_OPTIONS, type Hero, type HeroOptions, type TextureReport } from './hero';
import type { TapeData } from './tapeData';
import { HERO_VIEWS, isHeroViewName, type HeroViewName } from './heroView';
import type { CaseTint } from './materials';
import type { CassetteScene } from './scene';
import { isTapeState, type TapeState } from './states';

/**
 * Debug hooks for tuning and for screenshot-based self-verification.
 *
 *  - ?debug=1                       lil-gui + stats.js overlay
 *  - ?debugState=<state>&tape=<id>  jump straight to a state, no animation
 *  - window.__cassette3d            (dev only) goTo / setTape / getState / renderer info,
 *                                   plus the Stage 1 hero controls (views, lid, J-card fold)
 *
 * Tape (Stage 2): ?fixture=1|2|3 shows a built-in sample; ?tape=<mixtape id> one of yours.
 *
 * Hero inspection params (Stage 1): ?view=front|threeQuarter|spine|back|threeQuarterBack,
 * ?case=smoke, ?flaps=1–6, ?shortBack=1, ?lid=<deg>, ?moving=lid|tray, ?fold=<0–1>, ?turntable=0.
 *
 * State jumps are recorded but have nothing to move until Stage 3 adds the tape machine.
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
    movingHalf: first(query.moving) === 'lid' ? 'lid' : d.movingHalf,
    fold: numberParam(query.fold, d.fold, 0, 1),
    autoRotate: first(query.turntable) !== '0',
  };
}

export interface Cassette3DDebugApi {
  goTo: (state: TapeState) => void;
  setTape: (id: string | null) => void;
  getState: () => TapeState;
  getTape: () => string | null;
  readonly renderer: CassetteScene['renderer'];
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
  params: DebugParams,
  isDev: boolean,
): Promise<() => void> {
  const cleanups: (() => void)[] = [];

  let state: TapeState = params.debugState ?? 'presented';
  let tape: string | null = params.tape;

  if (isDev) {
    const { renderer } = handle;
    window.__cassette3d = {
      goTo(next) {
        if (!isTapeState(next)) throw new Error(`Unknown tape state "${next}"`);
        state = next;
      },
      setTape(id) {
        tape = id;
      },
      getState: () => state,
      getTape: () => tape,
      renderer,
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
    const key = gui.addFolder('Key light');
    key.add(handle.keyLight, 'intensity', 0, 10, 0.05);
    key.add(handle.keyLight.position, 'x', -60, 60, 0.5);
    key.add(handle.keyLight.position, 'y', 1, 80, 0.5);
    key.add(handle.keyLight.position, 'z', -60, 60, 0.5);

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

    const plastic = hero.tape.materials.casePlastic;
    const mat = gui.addFolder('Case plastic');
    mat.add(settings, 'tint', ['clear', 'smoke']).onChange((v: CaseTint) => hero.tape.setCaseTint(v));
    mat.add(plastic, 'roughness', 0, 0.5, 0.005);
    mat.add(plastic, 'transmission', 0, 1, 0.01);
    mat.add(plastic, 'thickness', 0, 1, 0.005);
    mat.add(plastic, 'ior', 1, 2, 0.01);
    mat.add(plastic, 'attenuationDistance', 0.05, 10, 0.05);
    mat.add(plastic, 'envMapIntensity', 0, 3, 0.05);

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

import type { CassetteScene } from './scene';
import { isTapeState, type TapeState } from './states';

/**
 * Debug hooks for tuning and for screenshot-based self-verification.
 *
 *  - ?debug=1                       lil-gui + stats.js overlay
 *  - ?debugState=<state>&tape=<id>  jump straight to a state, no animation
 *  - window.__cassette3d            (dev only) goTo / setTape / getState / renderer info
 *
 * State jumps are recorded but have nothing to move until Stage 3 adds the tape machine.
 */

export interface DebugParams {
  debug: boolean;
  debugState: TapeState | null;
  tape: string | null;
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
}

declare global {
  interface Window {
    __cassette3d?: Cassette3DDebugApi;
    /** renderer.info.memory right after the last dispose, before the renderer itself went away. */
    __cassette3dLastDispose?: { geometries: number; textures: number };
  }
}

/** Installs the debug hooks. Returns a cleanup function. */
export async function installDebug(handle: CassetteScene, params: DebugParams, isDev: boolean): Promise<() => void> {
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

    cleanups.push(() => {
      offFrame();
      gui.destroy();
      stats.dom.remove();
    });
  }

  return () => cleanups.forEach((fn) => fn());
}

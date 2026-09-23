import { CASE_LAYOUT } from './dimensions';
import { createHeroView, type HeroView, type HeroViewName } from './heroView';
import type { CaseTint } from './materials';
import type { CaseHalf } from './objects/caseModel';
import { createJCard, type JCardOptions } from './objects/jcard';
import { createTape, type TapeModel } from './objects/tape';
import { disposeObjectTree, type CassetteScene } from './scene';
import type { TapeData } from './tapeData';
import { applyJCardTextures, type JCardTextureSet } from './textures/jcardTexture';
import type { ImageCheck } from './textures/jcardSnapshot';
import { applyLabelTextures, labelStyleFor, type LabelTextureSet } from './textures/labelTexture';
import { createSnapshotSource, type SnapshotResult, type SnapshotSource, type WriteBackStatus } from './textures/snapshotSource';

/**
 * Stage 1 content: one closed tape with a placeholder J-card on the hero turntable.
 * Stage 3 hands the tape to the tape machine; Stage 4 puts the shelf behind it.
 */
export interface HeroOptions extends JCardOptions {
  tint: CaseTint;
  /** Start on a fixed view instead of spinning. */
  view: HeroViewName | null;
  /** Lid opening in degrees (debug: checks the hinge). */
  lidDeg: number;
  /** Which half swings open (debug). */
  movingHalf: CaseHalf;
  /** J-card fold, 1 = folded in the case, 0 = flat (debug). */
  fold: number;
  autoRotate: boolean;
}

export const DEFAULT_HERO_OPTIONS: HeroOptions = {
  flaps: 2,
  shortBack: false,
  tint: 'clear',
  view: null,
  lidDeg: 0,
  movingHalf: 'tray',
  fold: 1,
  autoRotate: true,
};

/** What happened the last time a tape's textures were built (debug + screenshots). */
export interface TextureReport {
  status: 'idle' | 'loading' | 'ready' | 'error';
  tape: { id: string; title: string; source: TapeData['source']; jcardId: string } | null;
  /** memory: this tab had it; stored: the saved render; runtime: rendered here just now. */
  origin: SnapshotResult['origin'] | null;
  /** Content hash of the card (what a stored render must match). */
  version: string | null;
  /** Whether a runtime render of your own card was uploaded for next time. */
  writeBack: WriteBackStatus | 'pending' | null;
  /** Snapshot time (J-card DOM → canvases), then the whole thing incl. labels. */
  snapshotMs: number | null;
  totalMs: number | null;
  pxPerMm: number | null;
  fonts: { family: string; loaded: boolean }[];
  images: ImageCheck[];
  hasInside: boolean;
  error?: string;
}

export interface Hero {
  tape: TapeModel;
  view: HeroView;
  setLidAngle: (deg: number) => void;
  setMovingHalf: (half: CaseHalf) => void;
  setJCardFold: (amount: number) => void;
  /** Rebuild the placeholder J-card with a different panel layout. */
  setJCardLayout: (layout: JCardOptions) => void;
  /** Show or hide the parts, e.g. to look at the J-card on its own (debug). */
  setPartsVisible: (parts: Partial<Record<'case' | 'cassette' | 'jcard', boolean>>) => void;
  /** Show a real tape: rebuilds the J-card to its layout, then textures it and the labels. */
  setTape: (data: TapeData) => Promise<void>;
  getTextureReport: () => TextureReport;
  onTextureStatus: (fn: (status: TextureReport['status']) => void) => void;
  dispose: () => void;
}

export function createHero(
  handle: CassetteScene,
  options: HeroOptions,
  snapshotSource: SnapshotSource = createSnapshotSource({ supabaseUrl: '' }),
): Hero {
  const tape = createTape(options);
  const view = createHeroView(handle, { autoRotate: options.autoRotate && !options.view });
  view.turntable.add(tape.root);

  let fold = options.fold;
  let jcardTextures: JCardTextureSet | null = null;
  let labelTextures: LabelTextureSet | null = null;
  let generation = 0;
  let disposed = false;
  let statusListener: ((status: TextureReport['status']) => void) | null = null;
  let report: TextureReport = emptyReport();
  const setReport = (next: TextureReport) => {
    report = next;
    statusListener?.(next.status);
  };

  function clearTextures() {
    jcardTextures?.dispose();
    jcardTextures = null;
    labelTextures?.dispose();
    labelTextures = null;
  }

  function relayout(layout: JCardOptions) {
    clearTextures();
    // Materials are shared with the rest of the tape, so only the geometry goes.
    const old = tape.jcard.root;
    const wasVisible = old.visible;
    old.removeFromParent();
    old.traverse((obj) => (obj as { geometry?: { dispose: () => void } }).geometry?.dispose());
    const jcard = createJCard(layout, tape.materials.paper);
    jcard.root.position.set(CASE_LAYOUT.jcard.x, CASE_LAYOUT.jcard.y, CASE_LAYOUT.jcard.z);
    jcard.root.visible = wasVisible;
    tape.case.lid.add(jcard.root);
    tape.jcard = jcard;
    jcard.setFold(fold);
  }

  tape.case.setMovingHalf(options.movingHalf);
  tape.case.setLidAngle(options.lidDeg);
  tape.jcard.setFold(fold);
  if (options.view) view.setView(options.view);

  return {
    tape,
    view,
    setLidAngle(deg) {
      tape.case.setLidAngle(deg);
    },
    setMovingHalf(half) {
      tape.case.setMovingHalf(half);
    },
    setJCardFold(amount) {
      fold = amount;
      tape.jcard.setFold(amount);
    },
    setJCardLayout(layout) {
      generation++;
      relayout(layout);
      setReport(emptyReport());
    },
    setPartsVisible(parts) {
      // The cassette rides in the tray and the J-card in the lid, so hide only the plastic parts.
      if (parts.case !== undefined) {
        for (const child of [...tape.case.tray.children, ...tape.case.lid.children]) {
          if (child !== tape.jcard.root && child !== tape.cassette.root) child.visible = parts.case!;
        }
      }
      if (parts.cassette !== undefined) tape.cassette.root.visible = parts.cassette;
      if (parts.jcard !== undefined) tape.jcard.root.visible = parts.jcard;
    },
    async setTape(data) {
      const gen = ++generation;
      const { mixtape, jcard } = data;
      const t0 = performance.now();
      setReport({
        ...emptyReport(),
        status: 'loading',
        tape: { id: mixtape.id, title: mixtape.title, source: data.source, jcardId: jcard.id },
      });
      relayout({ flaps: jcard.content.flaps, shortBack: jcard.content.shortBack });
      try {
        const result = await snapshotSource(jcard);
        const { snapshot } = result;
        if (disposed || gen !== generation) return;
        jcardTextures = applyJCardTextures(tape.jcard, snapshot, handle.renderer, tape.materials.paper);
        const labels = await applyLabelTextures(tape.cassette, mixtape, labelStyleFor(jcard.content), handle.renderer);
        if (disposed || gen !== generation) {
          labels.dispose();
          return;
        }
        labelTextures = labels;
        setReport({
          ...report,
          status: 'ready',
          snapshotMs: snapshot.ms,
          totalMs: Math.round(performance.now() - t0),
          pxPerMm: snapshot.pxPerMm,
          fonts: snapshot.fonts,
          images: snapshot.images,
          hasInside: !!snapshot.inside,
          origin: result.origin,
          version: result.version,
          writeBack: 'pending',
        });
        void result.writeBack.then((status) => {
          if (!disposed && gen === generation) report = { ...report, writeBack: status };
        });
        const failed = snapshot.images.filter((i) => !i.ok);
        if (failed.length) console.warn('[cassette3d] J-card images that could not be fetched with CORS:', failed);
      } catch (err) {
        if (disposed || gen !== generation) return;
        console.error('[cassette3d] Could not build the J-card textures', err);
        setReport({ ...report, status: 'error', error: err instanceof Error ? err.message : String(err) });
      }
    },
    getTextureReport: () => report,
    onTextureStatus(fn) {
      statusListener = fn;
    },
    dispose() {
      disposed = true;
      statusListener = null;
      clearTextures();
      view.dispose();
      tape.dispose();
      disposeObjectTree(view.turntable);
    },
  };
}

function emptyReport(): TextureReport {
  return {
    status: 'idle', tape: null, origin: null, version: null, writeBack: null, snapshotMs: null, totalMs: null,
    pxPerMm: null, fonts: [], images: [], hasInside: false,
  };
}

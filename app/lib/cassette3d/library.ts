import { Matrix4, Raycaster, Vector2, Vector3, type Texture } from 'three';
import type { TapeState } from './animation/tapeMachine';
import { SHELF } from './dimensions';
import type { Hero } from './hero';
import { computeShelfLayout } from './shelf/layout';
import { createShelf, type Shelf } from './shelf/shelfModel';
import { createShelfView, type ShelfView } from './shelf/shelfView';
import type { CassetteScene } from './scene';
import type { TapeData } from './tapeData';
import { jcardRenderVersion } from './textures/jcardRender';
import { spineFromSnapshot } from './textures/jcardTexture';
import { getSnapshot, isSnapshotCached } from './textures/snapshotCache';
import { drawSpine, loadSpineFonts, spineFonts } from './textures/spineTexture';
import { registerCustomFonts } from '~/utils/fontManager';
import type { CustomFont } from '~/types';

/**
 * The 3D library: the shelf with every tape on it, and the hero tape that a
 * selected case turns into. Selecting a case hides its instance, gives the hero
 * that tape, and asks the tape machine for 'presented': it slides out of its
 * row (pulledOut), then flies to the turntable while the camera follows. Going
 * back retraces the same path and the instance reappears.
 *
 * Also owns: hover (the case slides out a little), search and sort (the shelf
 * re-flows), the camera blend between the shelf and the hero view, the shadow
 * focus, and the spines (drawn at once, upgraded to real renders when this tab
 * has them).
 */

export type ShelfSort = 'updated' | 'created' | 'title';

export interface LibraryOptions {
  /** Called when the hovered (or keyboard-focused) tape changes. */
  onHover?: (index: number | null) => void;
  /** Called when the tapes shown on the shelf change (search / sort / new list). */
  onOrder?: (order: number[]) => void;
  /** Called when the selected tape changes. */
  onSelect?: (index: number | null) => void;
}

export interface Library {
  /** Put these tapes on the shelf. `initial` takes one straight off it, with no animation. */
  setTapes: (tapes: TapeData[], initial?: { index: number; state: TapeState } | null) => Promise<void>;
  getTapes: () => TapeData[];
  /** Take a tape off the shelf (a tape already out goes back first). */
  select: (index: number) => void;
  selected: () => number | null;
  /** The hovered (or keyboard-highlighted) tape. */
  hovered: () => number | null;
  /** Highlight a tape as if hovered (keyboard focus in the overlay), or clear it. */
  highlight: (index: number | null) => void;
  /** Filter and sort the shelf. Returns the tapes shown, in order. */
  setView: (search: string, sort: ShelfSort) => number[];
  getOrder: () => number[];
  /** World matrix of the selected tape's slot, for the tape machine. */
  slotMatrix: (out: Matrix4) => Matrix4 | null;
  /** Whether the shelf is up (the tape machine may go back to it). */
  hasShelf: () => boolean;
  shelfView: () => ShelfView;
  shelf: () => Shelf | null;
  dispose: () => void;
}

const CLICK_SLOP_PX = 6;
const HERO_FOCUS = { x: 0, y: 0, z: 0, halfSize: 12 };
/** Shelf brightness while a tape is on the turntable. */
const SHELF_DIM = 0.3;

export function createLibrary(handle: CassetteScene, hero: Hero, options: LibraryOptions = {}): Library {
  const { camera, renderer } = handle;
  const canvas = renderer.domElement;
  const machine = hero.machine;
  let tapes: TapeData[] = [];
  let shelf: Shelf | null = null;
  const shelfView = createShelfView(handle, computeShelfLayout(0));
  let order: number[] = [];
  let selected: number | null = null;
  let pending: number | null = null;
  let hovered: number | null = null;
  let highlighted: number | null = null;
  let generation = 0;
  let disposed = false;
  /** Drawn spines, kept for the hero's placeholder until a real one arrives. */
  let drawn: HTMLCanvasElement[] = [];
  /** Tapes whose atlas cell already holds the real spine. */
  let real = new Set<number>();

  // --- Camera blend + shadow focus ------------------------------------------------------
  const shelfPos = new Vector3();
  const shelfTarget = new Vector3();
  hero.view.setCameraFilter((position, target) => {
    const k = machine.shelfBlend();
    if (k <= 0) return;
    shelfView.pose(shelfPos, shelfTarget);
    position.lerp(shelfPos, k);
    target.lerp(shelfTarget, k);
  });

  const offFrame = handle.onFrame((dt) => {
    shelf?.update(dt);
    shelf?.atlas.flush();
    // The environment is rebuilt after a context loss; keep the shelf on the current one.
    shelf?.setEnvironment(handle.scene.environment as Texture | null);
    const k = machine.shelfBlend();
    // With a tape off the shelf, the shelf steps back into the dark behind it.
    shelf?.setDim(SHELF_DIM + (1 - SHELF_DIM) * k);
    const { width, height } = shelfView.visibleSize();
    const pan = shelfView.getPan();
    const shelfHalf = (Math.max(width, height) / 2) * 1.1;
    const lerp = (a: number, b: number) => a + (b - a) * k;
    handle.setShadowFocus(
      lerp(HERO_FOCUS.x, pan.x),
      lerp(HERO_FOCUS.y, pan.y),
      lerp(HERO_FOCUS.z, SHELF.frontZ - SHELF.depth / 2),
      lerp(HERO_FOCUS.halfSize, shelfHalf),
    );
  });

  // --- Following the tape machine ------------------------------------------------------------
  const onShelfStates = new Set<TapeState>(['onShelf', 'pulledOut']);
  let lastTarget: TapeState = machine.getTarget();
  const offMachine = machine.onChange((s) => {
    const resting = s.state === 'onShelf' && s.target === 'onShelf';
    hero.view.turntable.visible = !resting && selected !== null;
    shelf?.setTaken(resting ? null : selected);
    const shelfMode = onShelfStates.has(s.state) && onShelfStates.has(s.target);
    shelfView.setEnabled(shelfMode);
    if (!shelfMode) setHovered(null);
    // Heading back to the shelf: make sure the slot it lands in is in view.
    if (onShelfStates.has(s.target) && !onShelfStates.has(lastTarget) && selected !== null) {
      const p = shelf?.slotPosition(selected);
      if (p) shelfView.reveal(p.x, p.y);
    }
    lastTarget = s.target;
    if (resting && !s.animating && pending !== null) {
      const next = pending;
      pending = null;
      start(next);
    }
  });

  function start(index: number) {
    const tape = tapes[index];
    if (!tape || !shelf?.slotPosition(index)) return;
    selected = index;
    options.onSelect?.(index);
    const gen = generation;
    void hero.setTape(tape, { spine: drawn[index] }).then(() => {
      if (disposed || gen !== generation || selected !== index) return;
      upgradeSpine(index, hero.spineThumbnail(shelf?.atlas.spineHeight));
    });
    machine.request('presented');
  }

  function upgradeSpine(index: number, canvas: HTMLCanvasElement | null | undefined) {
    if (!canvas || !shelf) return;
    shelf.atlas.setSpine(index, canvas);
    real.add(index);
  }

  // --- Picking on the shelf ----------------------------------------------------------------
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let down: { x: number; y: number } | null = null;
  const shelfMode = () => onShelfStates.has(machine.getState()) && onShelfStates.has(machine.getTarget());

  function tapeAt(clientX: number, clientY: number): { index: number | null; heroHit: boolean } {
    if (!shelf) return { index: null, heroHit: false };
    const rect = canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    // The pulled-out case stands in front of the shelf; clicks on it are the hero's.
    if (hero.view.turntable.visible && raycaster.intersectObject(hero.view.turntable, true).length) {
      return { index: null, heroHit: true };
    }
    return { index: shelf.pick(raycaster), heroHit: false };
  }

  function setHovered(index: number | null) {
    if (index === hovered) return;
    hovered = index;
    shelf?.setHovered(index ?? highlighted);
    options.onHover?.(index ?? highlighted);
  }

  function onMove(e: PointerEvent) {
    if (!shelfMode()) return;
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_SLOP_PX) {
      // Panning: no hover flicker.
      setHovered(null);
      return;
    }
    const { index, heroHit } = tapeAt(e.clientX, e.clientY);
    setHovered(index);
    if (index !== null) canvas.style.cursor = 'pointer';
    else if (!heroHit) canvas.style.cursor = shelfMode() ? 'grab' : '';
  }
  function onDown(e: PointerEvent) {
    down = { x: e.clientX, y: e.clientY };
  }
  function onUp(e: PointerEvent) {
    const start = down;
    down = null;
    if (!start || !shelfMode() || Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_SLOP_PX) return;
    const { index } = tapeAt(e.clientX, e.clientY);
    if (index !== null) {
      setHovered(null);
      select(index);
    }
  }
  function onLeave() {
    down = null;
    setHovered(null);
  }
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);

  function select(index: number) {
    if (!tapes[index]) return;
    if (index === selected && machine.getTarget() !== 'onShelf') {
      machine.request('presented');
      return;
    }
    const resting = machine.getState() === 'onShelf' && machine.getTarget() === 'onShelf';
    if (selected !== null && !resting) {
      // Another tape is out: it goes back first, then this one comes off.
      pending = index;
      machine.request('onShelf');
      return;
    }
    start(index);
  }

  // --- Search and sort -----------------------------------------------------------------------
  function computeOrder(search: string, sort: ShelfSort): number[] {
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
    const indices = tapes.map((_, i) => i).filter((i) => {
      if (!terms.length) return true;
      const m = tapes[i]!.mixtape;
      const haystack = [m.title, ...[...m.sideA, ...m.sideB].flatMap((s) => [s.title, s.artist])].join(' ').toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
    const time = (iso: string) => new Date(iso).getTime() || 0;
    const key = (i: number) => tapes[i]!.mixtape;
    if (sort === 'title') {
      indices.sort((a, b) => key(a).title.localeCompare(key(b).title, undefined, { sensitivity: 'base', numeric: true }) || a - b);
    } else if (sort === 'created') {
      indices.sort((a, b) => time(key(b).createdAt) - time(key(a).createdAt) || a - b);
    } else {
      indices.sort((a, b) => time(key(b).updatedAt) - time(key(a).updatedAt) || a - b);
    }
    return indices;
  }

  function applyOrder(next: number[], animate: boolean) {
    order = next;
    shelf?.setOrder(order, animate);
    options.onOrder?.(order);
  }

  // --- Tapes -----------------------------------------------------------------------------------
  async function setTapes(next: TapeData[], initial: { index: number; state: TapeState } | null = null) {
    const gen = ++generation;
    tapes = next;
    selected = null;
    pending = null;
    options.onSelect?.(null);
    setHovered(null);
    real = new Set();
    shelf?.dispose();
    shelf = createShelf(tapes.map((t) => ({ color: cardColor(t.jcard.content.backgroundColor) })), renderer);
    handle.scene.add(shelf.root);
    shelfView.setLayout(shelf.layout);
    applyOrder(computeOrder('', 'updated'), false);

    // Spines: drawn now with whatever fonts are ready, again once they've loaded.
    const height = shelf.atlas.spineHeight;
    const drawAll = () => {
      drawn = tapes.map((t, i) => {
        const canvas = drawSpine(t.jcard.content, t.mixtape.title, height);
        if (!real.has(i)) shelf?.atlas.setSpine(i, canvas);
        return canvas;
      });
    };
    drawAll();

    if (initial && tapes[initial.index]) {
      start(initial.index);
      machine.jump(initial.state);
    } else {
      machine.jump('onShelf');
    }

    const families = new Set<string>();
    const custom: CustomFont[] = [];
    for (const t of tapes) {
      const fonts = spineFonts(t.jcard.content);
      fonts.forEach((f) => families.add(f));
      custom.push(...(t.jcard.content.customFonts ?? []).filter((f) => fonts.includes(f.name)));
    }
    await registerCustomFonts(custom).catch(() => undefined);
    await loadSpineFonts(families);
    if (disposed || gen !== generation) return;
    drawAll();

    // Real spines for any card this tab has already rendered (memory cache).
    for (let i = 0; i < tapes.length; i++) {
      const { jcard } = tapes[i]!;
      const key = `${jcard.id}:${await jcardRenderVersion(jcard.content)}`;
      if (disposed || gen !== generation) return;
      if (!isSnapshotCached(key) || real.has(i)) continue;
      try {
        const cached = await getSnapshot(key, () => Promise.reject(new Error('not cached')));
        if (disposed || gen !== generation) return;
        upgradeSpine(i, spineFromSnapshot(cached.snapshot, height));
      } catch { /* evicted meanwhile: keep the drawn spine */ }
    }
  }

  return {
    setTapes,
    getTapes: () => tapes,
    select,
    selected: () => selected,
    hovered: () => hovered ?? highlighted,
    highlight(index) {
      highlighted = index;
      shelf?.setHovered(hovered ?? index);
      if (index !== null && shelfMode()) {
        const p = shelf?.slotPosition(index);
        if (p) shelfView.reveal(p.x, p.y);
      }
    },
    setView(search, sort) {
      applyOrder(computeOrder(search, sort), true);
      return order;
    },
    getOrder: () => order,
    slotMatrix(out) {
      return selected !== null && shelf ? shelf.slotMatrix(selected, out) : null;
    },
    hasShelf: () => !!shelf,
    shelfView: () => shelfView,
    shelf: () => shelf,
    dispose() {
      disposed = true;
      offFrame();
      offMachine();
      hero.view.setCameraFilter(null);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      shelfView.dispose();
      shelf?.dispose();
      shelf = null;
    },
  };
}

/** The card's background colour if it's a plain hex colour, else card-stock white. */
function cardColor(color: string | undefined): string {
  return color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color.trim()) ? color.trim() : '#e4dfd3';
}

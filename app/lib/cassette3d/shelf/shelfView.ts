import { MathUtils, Vector3 } from 'three';
import { SHELF } from '../dimensions';
import type { CassetteScene } from '../scene';
import type { ShelfLayout } from './layout';

/**
 * The camera in front of the shelf. It looks straight at the bookcase, fitted to
 * its full height, and pans sideways over the bays (large libraries grow to the
 * right). Zooming in also lets it pan up and down.
 *
 * Input, while enabled: drag to pan (with a little inertia); the wheel or a
 * trackpad scroll pans; ctrl + wheel (a trackpad pinch) and a two-finger pinch zoom.
 *
 * pose() gives the camera position and target; the library blends it with the
 * hero camera while a tape flies between the shelf and the turntable.
 */

export interface ShelfView {
  /** Where the camera would be right now, in world space. */
  pose: (outPosition: Vector3, outTarget: Vector3) => void;
  setLayout: (layout: ShelfLayout) => void;
  setEnabled: (on: boolean) => void;
  /** Pan so that a point (e.g. a tape's slot) is comfortably in view. */
  reveal: (x: number, y: number) => void;
  /** Zoom factor (1 = the whole shelf height fills the view; smaller is closer). */
  getZoom: () => number;
  setZoom: (zoom: number) => void;
  getPan: () => { x: number; y: number };
  setPan: (x: number, y: number) => void;
  /** Visible area at the spines' depth, cm. */
  visibleSize: () => { width: number; height: number };
  dispose: () => void;
}

const ELEVATION_DEG = 7;
const FIT_MARGIN = 1.06;
const ZOOM_RANGE: [number, number] = [0.3, 1];
/** How far past the bookcase's ends the view may go, cm. */
const EDGE = 3;
const REVEAL_MARGIN = 6;

export function createShelfView(handle: CassetteScene, initial: ShelfLayout): ShelfView {
  const { camera, renderer } = handle;
  const canvas = renderer.domElement;
  let layout = initial;
  let enabled = false;
  let zoom = 1;
  const pan = { x: 0, y: 0 };
  const velocity = { x: 0, y: 0 };
  /** Where the camera looks: a little behind the spines. */
  const lookZ = SHELF.frontZ - 2;

  const vHalf = () => MathUtils.degToRad(camera.fov / 2);
  const fullHeight = () => layout.bounds.maxY - layout.bounds.minY;
  const distance = () => ((fullHeight() / 2) * FIT_MARGIN * zoom) / Math.tan(vHalf());
  function visibleSize() {
    const h = 2 * distance() * Math.tan(vHalf());
    return { width: h * camera.aspect, height: h };
  }

  function clampPan() {
    const { width, height } = visibleSize();
    const b = layout.bounds;
    const clampAxis = (value: number, min: number, max: number, half: number) => {
      const lo = min + half - EDGE;
      const hi = max - half + EDGE;
      return lo > hi ? (min + max) / 2 : MathUtils.clamp(value, lo, hi);
    };
    pan.x = clampAxis(pan.x, b.minX, b.maxX, width / 2);
    pan.y = clampAxis(pan.y, b.minY, b.maxY, height / 2);
  }

  function home() {
    // Start at the top left of the bookcase with its whole height in view, or,
    // for a small library that fills only the top rows, closer in on those.
    const used = Math.ceil(layout.slots.length / Math.max(layout.perRow, 1));
    const rows = Math.max(2, used);
    zoom = rows >= layout.rowFloors.length ? 1 : MathUtils.clamp((rows * (SHELF.rowClearance + SHELF.board) + 2 * SHELF.board) / fullHeight(), ...ZOOM_RANGE);
    pan.x = -Infinity;
    pan.y = Infinity;
    clampPan();
  }
  home();

  const offResize = handle.onResize(clampPan);
  const offFrame = handle.onFrame((dt) => {
    if (dragging || (!velocity.x && !velocity.y)) return;
    pan.x += velocity.x * dt;
    pan.y += velocity.y * dt;
    const decay = Math.exp(-5 * dt);
    velocity.x *= decay;
    velocity.y *= decay;
    if (Math.hypot(velocity.x, velocity.y) < 0.5) velocity.x = velocity.y = 0;
    clampPan();
  });

  // --- Input -----------------------------------------------------------------------------
  const pointers = new Map<number, { x: number; y: number }>();
  let dragging = false;
  let lastT = 0;
  let pinchStart: { dist: number; zoom: number } | null = null;

  const cmPerPx = () => visibleSize().height / Math.max(canvas.clientHeight, 1);

  function onDown(e: PointerEvent) {
    if (!enabled) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    velocity.x = velocity.y = 0;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = { dist: Math.hypot(a!.x - b!.x, a!.y - b!.y), zoom };
    }
    dragging = true;
    lastT = performance.now();
    canvas.setPointerCapture(e.pointerId);
  }
  function onMove(e: PointerEvent) {
    const prev = pointers.get(e.pointerId);
    if (!enabled || !prev || !dragging) return;
    const now = performance.now();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2 && pinchStart) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      setZoom((pinchStart.zoom * pinchStart.dist) / Math.max(dist, 1));
      return;
    }
    const k = cmPerPx();
    const dx = -(e.clientX - prev.x) * k;
    const dy = (e.clientY - prev.y) * k;
    pan.x += dx;
    pan.y += dy;
    const dtS = Math.max((now - lastT) / 1000, 1 / 120);
    velocity.x = dx / dtS;
    velocity.y = dy / dtS;
    lastT = now;
    clampPan();
  }
  function onUp(e: PointerEvent) {
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (pointers.size) return;
    dragging = false;
    // A pause before letting go means no fling.
    if (performance.now() - lastT > 80) velocity.x = velocity.y = 0;
  }
  function onWheel(e: WheelEvent) {
    if (!enabled) return;
    e.preventDefault();
    const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.clientHeight : 1;
    if (e.ctrlKey) {
      setZoom(zoom * Math.exp(e.deltaY * scale * 0.004));
      return;
    }
    const k = cmPerPx();
    const { height } = visibleSize();
    // At full height there's nothing to scroll vertically, so the wheel moves along the shelf.
    const canScrollY = height < fullHeight() - 1;
    pan.x += (e.deltaX + (canScrollY || e.shiftKey ? 0 : e.deltaY)) * scale * k;
    if (canScrollY && !e.shiftKey) pan.y -= e.deltaY * scale * k;
    velocity.x = velocity.y = 0;
    clampPan();
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  function setZoom(z: number) {
    zoom = MathUtils.clamp(z, ...ZOOM_RANGE);
    clampPan();
  }

  const e = MathUtils.degToRad(ELEVATION_DEG);
  return {
    pose(outPosition, outTarget) {
      const d = distance();
      outTarget.set(pan.x, pan.y, lookZ);
      outPosition.set(pan.x, pan.y + Math.sin(e) * d, lookZ + Math.cos(e) * d);
    },
    setLayout(next) {
      const firstLayout = layout.slots.length === 0;
      layout = next;
      if (firstLayout) home();
      else clampPan();
    },
    setEnabled(on) {
      enabled = on;
      if (!on) {
        pointers.clear();
        dragging = false;
        pinchStart = null;
        velocity.x = velocity.y = 0;
      }
    },
    reveal(x, y) {
      const { width, height } = visibleSize();
      const mx = Math.min(REVEAL_MARGIN, width / 4);
      const my = Math.min(REVEAL_MARGIN, height / 4);
      if (x < pan.x - width / 2 + mx) pan.x = x + width / 2 - mx;
      if (x > pan.x + width / 2 - mx) pan.x = x - width / 2 + mx;
      if (y < pan.y - height / 2 + my) pan.y = y + height / 2 - my;
      if (y > pan.y + height / 2 - my) pan.y = y - height / 2 + my;
      velocity.x = velocity.y = 0;
      clampPan();
    },
    getZoom: () => zoom,
    setZoom,
    getPan: () => ({ ...pan }),
    setPan(x, y) {
      pan.x = x;
      pan.y = y;
      velocity.x = velocity.y = 0;
      clampPan();
    },
    visibleSize,
    dispose() {
      offFrame();
      offResize();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
    },
  };
}

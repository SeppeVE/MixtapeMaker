import { Color, Raycaster, Vector2, type Material, type Mesh, type Object3D, type PerspectiveCamera } from 'three';

/**
 * Pointer picking on the tape: hovering a part that does something shows a
 * pointer cursor and a subtle glow; clicking it (a press without a drag) runs
 * its action. Which part does what in which state is decided by `actionFor`.
 */

export type TapePart = 'case' | 'cassette' | 'jcard';

export interface PickTargets {
  /** The plastic: tray and lid, without the cassette and J-card that ride in the lid. */
  case: Object3D[];
  cassette: Object3D;
  jcard: Object3D;
}

export interface PickingOptions {
  canvas: HTMLCanvasElement;
  camera: PerspectiveCamera;
  targets: () => PickTargets;
  /** The action for clicking `part` right now, or null when it does nothing. */
  actionFor: (part: TapePart) => (() => void) | null;
  /** Glow strength for the hovered part. */
  glow?: number;
}

export interface Picking {
  /** Re-run hover after the scene changed under a still pointer (e.g. a state change). */
  refresh: () => void;
  dispose: () => void;
}

const CLICK_SLOP_PX = 6;
const GLOW_COLOR = new Color('#fff4dc');

export function createPicking(options: PickingOptions): Picking {
  const { canvas, camera } = options;
  const glow = options.glow ?? 0.07;
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let inside = false;
  let hovered: TapePart | null = null;
  let down: { x: number; y: number } | null = null;
  const lit = new Map<Material, { color: Color; intensity: number }>();

  function partAt(clientX: number, clientY: number): TapePart | null {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const t = options.targets();
    const hits = raycaster.intersectObjects([t.cassette, t.jcard, ...t.case], true);
    for (const hit of hits) {
      if (!isVisible(hit.object)) continue;
      if (isInside(hit.object, t.cassette)) return 'cassette';
      if (isInside(hit.object, t.jcard)) return 'jcard';
      return 'case';
    }
    return null;
  }

  function setHover(part: TapePart | null) {
    const active = part && options.actionFor(part) ? part : null;
    canvas.style.cursor = active ? 'pointer' : '';
    if (active === hovered) return;
    unglow();
    hovered = active;
    if (active) glowPart(active);
  }

  function glowPart(part: TapePart) {
    const t = options.targets();
    const roots = part === 'case' ? t.case : [part === 'cassette' ? t.cassette : t.jcard];
    for (const root of roots) {
      root.traverse((obj) => {
        // The case's parts contain the lid, which holds the cassette and J-card: skip those.
        if (part === 'case' && (isInside(obj, t.cassette) || isInside(obj, t.jcard))) return;
        const mat = (obj as Mesh).material as Material | Material[] | undefined;
        for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) {
          const e = m as Material & { emissive?: Color; emissiveIntensity?: number };
          if (!e.emissive || lit.has(m)) continue;
          lit.set(m, { color: e.emissive.clone(), intensity: e.emissiveIntensity ?? 1 });
          e.emissive.copy(GLOW_COLOR);
          e.emissiveIntensity = glow;
        }
      });
    }
  }

  function unglow() {
    for (const [m, orig] of lit) {
      const e = m as Material & { emissive: Color; emissiveIntensity: number };
      e.emissive.copy(orig.color);
      e.emissiveIntensity = orig.intensity;
    }
    lit.clear();
  }

  let last = { x: 0, y: 0 };
  function onMove(e: PointerEvent) {
    inside = true;
    last = { x: e.clientX, y: e.clientY };
    // While a drag is in progress (turntable, orbit) don't flicker the hover.
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_SLOP_PX) return;
    setHover(partAt(e.clientX, e.clientY));
  }
  function onDown(e: PointerEvent) {
    down = { x: e.clientX, y: e.clientY };
  }
  function onUp(e: PointerEvent) {
    const start = down;
    down = null;
    if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_SLOP_PX) return;
    const part = partAt(e.clientX, e.clientY);
    const action = part ? options.actionFor(part) : null;
    if (action) {
      setHover(null);
      action();
    }
  }
  function onLeave() {
    inside = false;
    down = null;
    setHover(null);
  }

  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);

  return {
    refresh() {
      if (inside) setHover(partAt(last.x, last.y));
      else setHover(null);
    },
    dispose() {
      unglow();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
    },
  };
}

function isInside(obj: Object3D, root: Object3D): boolean {
  for (let o: Object3D | null = obj; o; o = o.parent) if (o === root) return true;
  return false;
}

function isVisible(obj: Object3D): boolean {
  for (let o: Object3D | null = obj; o; o = o.parent) if (!o.visible) return false;
  return true;
}

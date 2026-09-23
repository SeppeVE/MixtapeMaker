import { Group, MathUtils, Vector3 } from 'three';
import { CASE } from './dimensions';
import type { CassetteScene } from './scene';

/**
 * Hero view: one closed case standing upright on its short end, lit from a fixed
 * key light, on a turntable. The object turns, not the camera, so the highlights
 * sweep across the plastic the way they would on a real turntable.
 *
 * Drag sideways to spin (with a little inertia), up and down to tilt the camera.
 * Any drag stops the automatic spin.
 */

export const HERO_VIEWS = {
  front: 0,
  threeQuarter: 35,
  spine: 90,
  back: 180,
  threeQuarterBack: 215,
} as const;

export type HeroViewName = keyof typeof HERO_VIEWS;

export function isHeroViewName(value: unknown): value is HeroViewName {
  return typeof value === 'string' && value in HERO_VIEWS;
}

export interface HeroView {
  /** Add the object to inspect (in its case frame). */
  turntable: Group;
  setView: (view: HeroViewName) => void;
  setAutoRotate: (on: boolean) => void;
  /** Camera elevation in degrees (debug; dragging is limited to a gentler range). */
  setElevation: (deg: number) => void;
  /** Multiply the fitted camera distance (debug: < 1 for close-ups, > 1 to see a flat J-card). */
  setDistanceScale: (scale: number) => void;
  /** Turntable angle in degrees. */
  getAngle: () => number;
  dispose: () => void;
}

const AUTO_SPEED = 0.35; // rad/s
const DEFAULT_ELEVATION = 10; // degrees
const ELEVATION_RANGE: [number, number] = [-5, 60];
/** Small lift so the case's shadow separates from it. */
const LIFT = 0.02;

export function createHeroView(handle: CassetteScene, options: { autoRotate?: boolean } = {}): HeroView {
  const { camera, scene, renderer } = handle;
  const canvas = renderer.domElement;

  const turntable = new Group();
  turntable.name = 'turntable';
  // Standing on the short end: the case frame's Y is up, so the bottom end sits on the floor.
  turntable.position.y = CASE.length / 2 + LIFT;
  scene.add(turntable);

  let autoRotate = options.autoRotate ?? true;
  let elevation = DEFAULT_ELEVATION;
  let spinVelocity = 0;
  let distanceScale = 1;
  const target = new Vector3(0, turntable.position.y, 0);

  /**
   * Distance that keeps the whole case in frame at any turntable angle: its
   * projected height vertically, the footprint's circle horizontally, plus that radius
   * again because the near side of the case is closer than its centre.
   */
  function fitDistance() {
    const vHalf = MathUtils.degToRad(camera.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
    const footprint = Math.hypot(CASE.width, CASE.depth) / 2;
    // Seen from higher up, less of the height and more of the footprint fills the frame.
    const e = MathUtils.degToRad(elevation);
    const vExtent = (CASE.length / 2) * Math.cos(e) + footprint * Math.sin(e);
    const forHeight = vExtent / Math.tan(vHalf);
    const forWidth = footprint / Math.tan(hHalf);
    return (Math.max(forHeight, forWidth) + footprint) * 1.08;
  }

  function placeCamera() {
    const d = fitDistance() * distanceScale;
    const e = MathUtils.degToRad(elevation);
    camera.position.set(0, target.y + Math.sin(e) * d, Math.cos(e) * d);
    camera.lookAt(target);
  }
  placeCamera();
  const offResize = handle.onResize(placeCamera);

  const offFrame = handle.onFrame((dt) => {
    if (dragging) return;
    if (Math.abs(spinVelocity) > 0.001) {
      turntable.rotation.y += spinVelocity * dt;
      spinVelocity *= Math.exp(-4 * dt);
    } else if (autoRotate) {
      turntable.rotation.y += AUTO_SPEED * dt;
    }
  });

  // --- Pointer drag -----------------------------------------------------------
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let lastT = 0;
  function onDown(e: PointerEvent) {
    dragging = true;
    autoRotate = false;
    spinVelocity = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = performance.now();
    canvas.setPointerCapture(e.pointerId);
  }
  function onMove(e: PointerEvent) {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const angle = (dx / Math.max(canvas.clientWidth, 1)) * Math.PI * 1.5;
    turntable.rotation.y += angle;
    spinVelocity = angle / Math.max((now - lastT) / 1000, 1 / 120);
    elevation = MathUtils.clamp(elevation + (dy / Math.max(canvas.clientHeight, 1)) * 90, ...ELEVATION_RANGE);
    placeCamera();
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = now;
  }
  function onUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    if (performance.now() - lastT > 80) spinVelocity = 0;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.style.cursor = 'grab';

  return {
    turntable,
    setView(view) {
      autoRotate = false;
      spinVelocity = 0;
      elevation = DEFAULT_ELEVATION;
      distanceScale = 1;
      turntable.rotation.y = MathUtils.degToRad(HERO_VIEWS[view]);
      placeCamera();
    },
    setAutoRotate(on) {
      autoRotate = on;
      spinVelocity = 0;
    },
    setElevation(deg) {
      elevation = MathUtils.clamp(deg, -89, 89);
      placeCamera();
    },
    setDistanceScale(scale) {
      distanceScale = MathUtils.clamp(scale, 0.2, 5);
      placeCamera();
    },
    getAngle: () => MathUtils.radToDeg(turntable.rotation.y),
    dispose() {
      offFrame();
      offResize();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.style.cursor = '';
      turntable.removeFromParent();
    },
  };
}

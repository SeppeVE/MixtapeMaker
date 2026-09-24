import { Group, MathUtils, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CASE } from './dimensions';
import type { CassetteScene } from './scene';

/**
 * Hero view: one case standing upright on its short end, lit from a fixed key
 * light, on a turntable. The object turns, not the camera, so the highlights
 * sweep across the plastic the way they would on a real turntable.
 *
 * The camera follows a small "rig" (elevation, distance, target) every frame,
 * so the tape machine can animate the framing between states. While the
 * machine is driving, the turntable is locked: no auto-spin, no dragging.
 * For the unfolded J-card the view can hand the camera to a limited
 * OrbitControls, and blend back to the rig afterwards.
 *
 * Unlocked: drag sideways to spin (with a little inertia), up and down to tilt
 * the camera. Any drag stops the automatic spin.
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

/** What the camera follows. Target is relative to the case's centre on the turntable. */
export interface CameraRig {
  /** Degrees above the horizon. */
  elevation: number;
  /** Multiplier on the distance that fits the whole case in frame. */
  distanceScale: number;
  targetX: number;
  targetY: number;
  targetZ: number;
}

export interface HeroView {
  /** Add the object to inspect (in its case frame). */
  turntable: Group;
  /** Live camera rig: change it and the camera follows on the next frame. */
  rig: CameraRig;
  setView: (view: HeroViewName) => void;
  setAutoRotate: (on: boolean) => void;
  /** Camera elevation in degrees (debug; dragging is limited to a gentler range). */
  setElevation: (deg: number) => void;
  /** Multiply the fitted camera distance (debug: < 1 for close-ups, > 1 to see a flat J-card). */
  setDistanceScale: (scale: number) => void;
  /** Stop the turntable's own motion (auto-spin, drag, inertia) while something else drives it. */
  setLocked: (locked: boolean) => void;
  /** Distance scale at which a subject `width` × `height` cm fits the frame, seen from `elevation`°. */
  fitScaleFor: (width: number, height: number, elevation: number) => number;
  /** Hand the camera to a limited orbit around the rig target (the unfolded J-card). */
  startOrbit: (azimuthDeg: number) => void;
  /** Blend the camera back from the orbit to the rig over `seconds`. */
  stopOrbit: (seconds: number) => Promise<void>;
  isOrbiting: () => boolean;
  /** Turntable angle in degrees. */
  getAngle: () => number;
  dispose: () => void;
}

const AUTO_SPEED = 0.35; // rad/s
export const DEFAULT_ELEVATION = 10; // degrees
const ELEVATION_RANGE: [number, number] = [-5, 60];
/** Small lift so the case's shadow separates from it. */
const LIFT = 0.02;
const FIT_MARGIN = 1.08;

export function defaultRig(): CameraRig {
  return { elevation: DEFAULT_ELEVATION, distanceScale: 1, targetX: 0, targetY: 0, targetZ: 0 };
}

export function createHeroView(handle: CassetteScene, options: { autoRotate?: boolean } = {}): HeroView {
  const { camera, scene, renderer } = handle;
  const canvas = renderer.domElement;

  const turntable = new Group();
  turntable.name = 'turntable';
  // Standing on the short end: the case frame's Y is up, so the bottom end sits on the floor.
  turntable.position.y = CASE.length / 2 + LIFT;
  scene.add(turntable);

  let autoRotate = options.autoRotate ?? true;
  let locked = false;
  let spinVelocity = 0;
  const rig = defaultRig();
  const target = new Vector3();

  const vHalf = () => MathUtils.degToRad(camera.fov / 2);
  const hHalf = () => Math.atan(Math.tan(vHalf()) * camera.aspect);

  /**
   * Distance that keeps the whole case in frame at any turntable angle: its
   * projected height vertically, the footprint's circle horizontally, plus that radius
   * again because the near side of the case is closer than its centre.
   */
  function fitDistance(elevationDeg: number) {
    const footprint = Math.hypot(CASE.width, CASE.depth) / 2;
    // Seen from higher up, less of the height and more of the footprint fills the frame.
    const e = MathUtils.degToRad(elevationDeg);
    const vExtent = (CASE.length / 2) * Math.cos(e) + footprint * Math.sin(e);
    const forHeight = vExtent / Math.tan(vHalf());
    const forWidth = footprint / Math.tan(hHalf());
    return (Math.max(forHeight, forWidth) + footprint) * FIT_MARGIN;
  }

  const rigPosition = new Vector3();
  function rigPose() {
    target.set(rig.targetX, turntable.position.y + rig.targetY, rig.targetZ);
    const d = fitDistance(rig.elevation) * rig.distanceScale;
    const e = MathUtils.degToRad(rig.elevation);
    rigPosition.set(target.x, target.y + Math.sin(e) * d, target.z + Math.cos(e) * d);
  }

  function placeCamera() {
    rigPose();
    camera.position.copy(rigPosition);
    camera.lookAt(target);
  }
  placeCamera();

  // --- Orbit (unfolded J-card) ---------------------------------------------------
  let orbit: OrbitControls | null = null;
  let blend: { from: Vector3; fromTarget: Vector3; t: number; seconds: number; done: () => void } | null = null;

  const offResize = handle.onResize(() => {
    if (!orbit && !blend) placeCamera();
  });

  const offFrame = handle.onFrame((dt) => {
    if (orbit) {
      orbit.update(dt);
      return;
    }
    if (blend) {
      blend.t = Math.min(1, blend.t + dt / Math.max(blend.seconds, 1e-3));
      const k = blend.t * blend.t * (3 - 2 * blend.t);
      rigPose();
      camera.position.lerpVectors(blend.from, rigPosition, k);
      camera.lookAt(new Vector3().lerpVectors(blend.fromTarget, target, k));
      if (blend.t >= 1) {
        const done = blend.done;
        blend = null;
        done();
      }
      return;
    }

    if (!locked && !dragging) {
      if (Math.abs(spinVelocity) > 0.001) {
        turntable.rotation.y += spinVelocity * dt;
        spinVelocity *= Math.exp(-4 * dt);
      } else if (autoRotate) {
        turntable.rotation.y += AUTO_SPEED * dt;
      }
    }
    placeCamera();
  });

  // --- Pointer drag (unlocked only) ---------------------------------------------------
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let lastT = 0;
  function onDown(e: PointerEvent) {
    if (locked || orbit) return;
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
    rig.elevation = MathUtils.clamp(rig.elevation + (dy / Math.max(canvas.clientHeight, 1)) * 90, ...ELEVATION_RANGE);
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

  function endOrbit() {
    orbit?.dispose();
    orbit = null;
  }

  return {
    turntable,
    rig,
    setView(view) {
      autoRotate = false;
      spinVelocity = 0;
      Object.assign(rig, defaultRig());
      turntable.rotation.y = MathUtils.degToRad(HERO_VIEWS[view]);
      placeCamera();
    },
    setAutoRotate(on) {
      autoRotate = on;
      spinVelocity = 0;
    },
    setElevation(deg) {
      rig.elevation = MathUtils.clamp(deg, -89, 89);
      placeCamera();
    },
    setDistanceScale(scale) {
      rig.distanceScale = MathUtils.clamp(scale, 0.2, 5);
      placeCamera();
    },
    setLocked(on) {
      locked = on;
      if (on) {
        spinVelocity = 0;
        dragging = false;
      }
      canvas.style.cursor = on ? '' : 'grab';
    },
    fitScaleFor(width, height, elevation) {
      const forHeight = height / 2 / Math.tan(vHalf());
      const forWidth = width / 2 / Math.tan(hHalf());
      return (Math.max(forHeight, forWidth) * FIT_MARGIN) / fitDistance(elevation);
    },
    startOrbit(azimuthDeg) {
      if (orbit) return;
      blend = null;
      // Start from the rig's pose: after a jump (reduced motion, ?debugState) the camera
      // hasn't followed the rig yet, it only does that on the next frame.
      placeCamera();
      orbit = new OrbitControls(camera, canvas);
      orbit.target.copy(target);
      orbit.enableDamping = true;
      orbit.dampingFactor = 0.08;
      orbit.enablePan = false;
      orbit.rotateSpeed = 0.6;
      // Clamped: no looking from below the floor or straight down, a limited zoom range.
      orbit.minPolarAngle = MathUtils.degToRad(25);
      orbit.maxPolarAngle = MathUtils.degToRad(110);
      orbit.minAzimuthAngle = -MathUtils.degToRad(azimuthDeg);
      orbit.maxAzimuthAngle = MathUtils.degToRad(azimuthDeg);
      const d = camera.position.distanceTo(target);
      orbit.minDistance = d * 0.45;
      orbit.maxDistance = d * 1.4;
      orbit.update();
    },
    stopOrbit(seconds) {
      if (!orbit) return Promise.resolve();
      const fromTarget = orbit.target.clone();
      endOrbit();
      return new Promise((resolve) => {
        blend = { from: camera.position.clone(), fromTarget, t: 0, seconds, done: resolve };
      });
    },
    isOrbiting: () => !!orbit,
    getAngle: () => MathUtils.radToDeg(turntable.rotation.y),
    dispose() {
      endOrbit();
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

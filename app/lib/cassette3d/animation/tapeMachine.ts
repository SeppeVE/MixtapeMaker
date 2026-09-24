import { gsap } from 'gsap';
import { Euler, MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import { CASE_LAYOUT, JCARD } from '../dimensions';
import type { HeroView } from '../heroView';
import type { CassetteScene } from '../scene';
import type { TapeModel } from '../objects/tape';
import { ANIM } from './config';

/**
 * The tape state machine: the only thing that moves tape objects once a tape
 * leaves 'presented'.
 *
 * A state is a set of numbers (turntable angle, lid angle, how far the cassette
 * and the J-card are out, how unfolded the card is, the camera rig). Every frame
 * the machine derives every pose from those numbers, so a transition is one GSAP
 * timeline tweening numbers: reversing it retraces exactly the same path, a jump
 * just sets the numbers, and nothing can be left stuck in between.
 *
 * The cassette and J-card stay children of the lid throughout; their "out"
 * poses are worked out in world space and converted back into the lid's frame.
 */

export const TAPE_STATES = [
  'onShelf',
  'pulledOut',
  'presented',
  'lidOpen',
  'cassetteOut',
  'jcardOut',
  'jcardUnfolded',
] as const;

export type TapeState = (typeof TAPE_STATES)[number];

export function isTapeState(value: unknown): value is TapeState {
  return typeof value === 'string' && (TAPE_STATES as readonly string[]).includes(value);
}

/** The states this machine drives; onShelf and pulledOut arrive with the shelf (Stage 4). */
export const HERO_STATES = ['presented', 'lidOpen', 'cassetteOut', 'jcardOut', 'jcardUnfolded'] as const;
export type HeroState = (typeof HERO_STATES)[number];

export function isHeroState(value: unknown): value is HeroState {
  return typeof value === 'string' && (HERO_STATES as readonly string[]).includes(value);
}

interface Params {
  turn: number;
  lid: number;
  cassette: number;
  cassetteAside: number;
  jcard: number;
  unfold: number;
  /** Unfolded card turned over (0 = outside facing you, 1 = inside). Only ever non-zero in jcardUnfolded. */
  flip: number;
  elevation: number;
  distanceScale: number;
  targetX: number;
  targetY: number;
  targetZ: number;
}

export interface TapeMachineOptions {
  /** True when the viewer prefers reduced motion: transitions become short fades with a cut. */
  reducedMotion?: () => boolean;
  /** Fade the view out or in (reduced motion). Resolves when the fade is done. */
  fade?: (to: 'out' | 'in', ms: number) => Promise<void>;
}

export interface TapeMachineStatus {
  /** Last state the tape came to rest in. */
  state: HeroState;
  /** Where it's heading (same as `state` when idle). */
  target: HeroState;
  animating: boolean;
}

export interface TapeMachine {
  getState: () => HeroState;
  getTarget: () => HeroState;
  isAnimating: () => boolean;
  /** Animate to `state`, one step at a time. Mid-animation: queued, or reversed if it points back. */
  request: (state: HeroState) => void;
  /** One step forwards (+1) or back (−1) from wherever the tape is heading. */
  step: (dir: 1 | -1) => void;
  /** Go straight to `state` with no animation. */
  jump: (state: HeroState) => void;
  /** Turn the unfolded card over (and back again). */
  flip: () => Promise<void>;
  onChange: (fn: (status: TapeMachineStatus) => void) => () => void;
  /** Largest difference between the animated numbers and the resting state's (debug: 0 when settled). */
  poseError: () => number;
  dispose: () => void;
}

const _m = new Matrix4();
const _inv = new Matrix4();
const _pos = new Vector3();
const _quat = new Quaternion();
const _scale = new Vector3(1, 1, 1);
const _euler = new Euler();

export function createTapeMachine(
  handle: CassetteScene,
  view: HeroView,
  getTape: () => TapeModel,
  options: TapeMachineOptions = {},
): TapeMachine {
  // Resting in 'presented': whatever the turntable and camera were doing (captured on leaving).
  let presentedRest: Params = {
    turn: 0, lid: 0, cassette: 0, cassetteAside: 0, jcard: 0, unfold: 0, flip: 0,
    elevation: view.rig.elevation, distanceScale: view.rig.distanceScale,
    targetX: view.rig.targetX, targetY: view.rig.targetY, targetZ: view.rig.targetZ,
  };
  const params: Params = { ...presentedRest };
  let flipTween: gsap.core.Tween | null = null;
  let settled = 0; // index into HERO_STATES
  let goal = 0;
  let anim: { a: number; tl: gsap.core.Timeline; backwards: boolean } | null = null;
  let busy = false; // waiting on an orbit release or a fade
  let disposed = false;
  const listeners = new Set<(s: TapeMachineStatus) => void>();

  // Cassette and J-card homes, in the lid's frame.
  const cassetteHome = new Matrix4().compose(
    new Vector3(CASE_LAYOUT.cassette.x, CASE_LAYOUT.cassette.y, CASE_LAYOUT.cassette.z),
    new Quaternion().setFromEuler(new Euler(0, 0, -Math.PI / 2)),
    new Vector3(1, 1, 1),
  );
  const jcardHome = new Matrix4().makeTranslation(CASE_LAYOUT.jcard.x, CASE_LAYOUT.jcard.y, CASE_LAYOUT.jcard.z);

  // --- State tables ----------------------------------------------------------------

  function cardWidths() {
    const tape = getTape();
    const widths = Object.fromEntries(tape.jcard.panels.map((p) => [p.name, p.width]));
    const flaps = tape.jcard.panels.filter((p) => p.name.startsWith('flap')).reduce((s, p) => s + p.width, 0);
    const left = (widths.spine ?? JCARD.spine) + (widths.back ?? JCARD.backFull);
    const cover = widths.flap1 ?? JCARD.flaps[0]!;
    return { cover, flaps, left, total: flaps + left };
  }

  function restParams(state: HeroState): Params {
    const i = HERO_STATES.indexOf(state);
    const base: Params = { ...presentedRest, lid: 0, cassette: 0, cassetteAside: 0, jcard: 0, unfold: 0, flip: 0 };
    if (i === 0) return base;
    const p: Params = { ...base, turn: ANIM.open.turnDeg, lid: ANIM.open.lidDeg, ...ANIM.camera.lidOpen };
    if (i >= 2) Object.assign(p, { cassette: 1 }, ANIM.camera.cassetteOut);
    if (i >= 3) Object.assign(p, { cassetteAside: 1, jcard: 1 }, ANIM.camera.jcardOut);
    if (i >= 4) {
      const { elevation, margin, targetX, targetY, targetZ } = ANIM.camera.jcardUnfolded;
      // Turned over or not is up to the viewer; either way counts as resting.
      Object.assign(p, { unfold: 1, flip: Math.round(params.flip), elevation, targetX, targetY, targetZ });
      p.distanceScale = view.fitScaleFor(cardWidths().total * margin, JCARD.height * margin, elevation);
    }
    return p;
  }

  // --- Transitions ---------------------------------------------------------------------

  /** The forward timeline for step a → a+1, from rest(a) to rest(a+1). Paused. */
  function buildStep(a: number): gsap.core.Timeline {
    const from = restParams(HERO_STATES[a]!);
    const to = restParams(HERO_STATES[a + 1]!);
    const tl = gsap.timeline({ paused: true });
    const tween = (keys: (keyof Params)[], duration: number, ease: string, at = 0) => {
      const f: Partial<Params> = {};
      const t: Partial<Params> = {};
      for (const k of keys) {
        f[k] = from[k];
        t[k] = to[k];
      }
      tl.fromTo(params, f, { ...t, duration, ease, immediateRender: false }, at);
    };
    const camera: (keyof Params)[] = ['elevation', 'distanceScale', 'targetX', 'targetY', 'targetZ'];
    // Everything that doesn't move in this step still gets pinned to its rest value.
    const pin = (keys: (keyof Params)[]) => tween(keys, 0.001, 'none', 0);

    switch (a) {
      case 0: { // presented → lidOpen
        const o = ANIM.open;
        tween(['turn'], o.turnDuration, o.turnEase);
        tween(['lid'], o.lidDuration, o.lidEase, o.lidDelay);
        tween(camera, Math.max(o.turnDuration, o.lidDelay + o.lidDuration), ANIM.camera.ease);
        pin(['cassette', 'cassetteAside', 'jcard', 'unfold']);
        break;
      }
      case 1: { // lidOpen → cassetteOut
        const c = ANIM.cassetteOut;
        tween(['cassette'], c.duration, c.ease);
        tween(camera, c.duration, ANIM.camera.ease);
        pin(['turn', 'lid', 'cassetteAside', 'jcard', 'unfold']);
        break;
      }
      case 2: { // cassetteOut → jcardOut
        const j = ANIM.jcardOut;
        tween(['cassetteAside'], j.cassetteDuration, j.ease);
        tween(['jcard'], j.duration, j.ease, j.delay);
        tween(camera, j.delay + j.duration, ANIM.camera.ease);
        pin(['turn', 'lid', 'cassette', 'unfold']);
        break;
      }
      case 3: { // jcardOut → jcardUnfolded
        const u = ANIM.unfold;
        tween(['unfold'], u.duration, u.ease);
        tween(camera, u.duration, ANIM.camera.ease);
        pin(['turn', 'lid', 'cassette', 'cassetteAside', 'jcard', 'flip']);
        break;
      }
    }
    if (a < 3) pin(['flip']);
    return tl;
  }

  function emit() {
    const status = { state: HERO_STATES[settled]!, target: HERO_STATES[goal]!, animating: !!anim || busy || !!flipTween };
    for (const fn of listeners) fn(status);
  }

  function leavePresented() {
    // Take over from the turntable: remember where it and the camera were.
    const turn = normalizeDeg(view.getAngle());
    presentedRest = {
      turn, lid: 0, cassette: 0, cassetteAside: 0, jcard: 0, unfold: 0, flip: 0,
      elevation: view.rig.elevation, distanceScale: view.rig.distanceScale,
      targetX: view.rig.targetX, targetY: view.rig.targetY, targetZ: view.rig.targetZ,
    };
    Object.assign(params, presentedRest);
    view.setAutoRotate(false);
    view.setLocked(true);
    getTape().jcard.setFold(1);
  }

  function arrive(index: number) {
    settled = index;
    anim = null;
    Object.assign(params, restParams(HERO_STATES[index]!));
    apply();
    if (index === 0) view.setLocked(false);
    if (HERO_STATES[index] === 'jcardUnfolded') view.startOrbit(ANIM.orbit.azimuthDeg);
    emit();
    drive();
  }

  async function startStep() {
    if (settled === goal || disposed) return;
    const forward = goal > settled;

    if (settled === 0 && forward) leavePresented();
    // Leaving the unfolded card: turn it back face up and give the camera back to the rig first.
    if (view.isOrbiting() || params.flip > 0 || flipTween) {
      busy = true;
      emit();
      await Promise.all([view.stopOrbit(ANIM.orbit.releaseSeconds), turnCard(0)]);
      busy = false;
      if (disposed) return;
      if (settled === goal) return emit();
    }

    if (options.reducedMotion?.()) {
      busy = true;
      emit();
      const ms = ANIM.reducedMotion.fadeMs;
      await options.fade?.('out', ms);
      if (disposed) return;
      busy = false;
      jumpTo(goal);
      await options.fade?.('in', ms);
      return;
    }

    const a = forward ? settled : settled - 1;
    const tl = buildStep(a);
    anim = { a, tl, backwards: !forward };
    tl.eventCallback('onComplete', () => arrive(a + 1));
    tl.eventCallback('onReverseComplete', () => arrive(a));
    if (forward) tl.play(0);
    // Suppress events on the jump to the end, or it would fire onComplete right away.
    else tl.progress(1, true).reverse();
    emit();
  }

  /** Called whenever the goal changes or a step ends. */
  function drive() {
    if (busy || disposed) return;
    if (!anim) {
      void startStep();
      return;
    }
    // Mid-step: keep going if the goal is at or beyond where we're heading,
    // otherwise turn round (the goal is behind us).
    const heading = anim.backwards ? anim.a : anim.a + 1;
    const leaving = anim.backwards ? anim.a + 1 : anim.a;
    const pointsBack = anim.backwards ? goal >= leaving : goal <= leaving;
    if (pointsBack && goal !== heading) {
      const { tl, a } = anim;
      anim.backwards = !anim.backwards;
      tl.reversed(!tl.reversed());
      // Turned round before the first frame: the playhead already sits where it's
      // now heading, and GSAP won't fire a completion for a move of zero. Arrive now.
      const p = tl.progress();
      if (tl.reversed() && p <= 0) {
        tl.kill();
        arrive(a);
        return;
      }
      if (!tl.reversed() && p >= 1) {
        tl.kill();
        arrive(a + 1);
        return;
      }
      if (tl.paused()) tl.resume();
      emit();
    }
  }

  /** Tween the unfolded card's flip to 0 or 1. */
  function turnCard(to: number): Promise<void> {
    flipTween?.kill();
    if (params.flip === to) {
      flipTween = null;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      flipTween = gsap.to(params, {
        flip: to,
        duration: options.reducedMotion?.() ? 0 : ANIM.flip.duration * Math.abs(to - params.flip),
        ease: ANIM.flip.ease,
        onComplete: () => {
          flipTween = null;
          emit();
          resolve();
        },
      });
      emit();
    });
  }

  function jumpTo(index: number) {
    anim?.tl.kill();
    anim = null;
    flipTween?.kill();
    flipTween = null;
    params.flip = 0;
    if (settled === 0 && index !== 0) leavePresented();
    if (view.isOrbiting() && HERO_STATES[index] !== 'jcardUnfolded') void view.stopOrbit(0);
    goal = index;
    arrive(index);
  }

  // --- Poses -------------------------------------------------------------------------------

  function targetMatrix(pos: { x: number; y: number; z: number }, rotDeg: { x: number; y: number; z: number }, out: Matrix4) {
    _euler.set(MathUtils.degToRad(rotDeg.x), MathUtils.degToRad(rotDeg.y), MathUtils.degToRad(rotDeg.z));
    _quat.setFromEuler(_euler);
    _pos.set(pos.x, view.turntable.position.y + pos.y, pos.z);
    return out.compose(_pos, _quat, _scale);
  }

  /** Blend two world matrices along "lift out, then arc across" (t in 0–1). */
  function flight(home: Matrix4, away: Matrix4, t: number, lift: number, liftShare: number, arc: number, liftDir: Vector3, out: Matrix4) {
    const hp = new Vector3();
    const hq = new Quaternion();
    const ap = new Vector3();
    const aq = new Quaternion();
    home.decompose(hp, hq, _scale);
    away.decompose(ap, aq, _scale);
    const lifted = hp.clone().addScaledVector(liftDir, lift);
    if (t <= liftShare) {
      _pos.lerpVectors(hp, lifted, liftShare > 0 ? t / liftShare : 1);
      _quat.copy(hq);
    } else {
      const u = (t - liftShare) / (1 - liftShare);
      _pos.lerpVectors(lifted, ap, u);
      _pos.y += Math.sin(Math.PI * u) * arc;
      _quat.slerpQuaternions(hq, aq, u);
    }
    _scale.set(1, 1, 1);
    return out.compose(_pos, _quat, _scale);
  }

  /** Straight blend with an arc, for moves between two away poses. */
  function glide(from: Matrix4, to: Matrix4, t: number, arc: number, out: Matrix4) {
    const fp = new Vector3();
    const fq = new Quaternion();
    const tp = new Vector3();
    const tq = new Quaternion();
    from.decompose(fp, fq, _scale);
    to.decompose(tp, tq, _scale);
    _pos.lerpVectors(fp, tp, t);
    _pos.y += Math.sin(Math.PI * t) * arc;
    _quat.slerpQuaternions(fq, tq, t);
    _scale.set(1, 1, 1);
    return out.compose(_pos, _quat, _scale);
  }

  const lidWorld = new Matrix4();
  const liftDir = new Vector3();
  const home = new Matrix4();
  const a1 = new Matrix4();
  const a2 = new Matrix4();
  const world = new Matrix4();

  function setLocal(obj: { position: Vector3; quaternion: Quaternion; scale: Vector3 }, worldMatrix: Matrix4) {
    _m.multiplyMatrices(_inv, worldMatrix);
    _m.decompose(obj.position, obj.quaternion, obj.scale);
  }

  function apply() {
    const tape = getTape();
    view.turntable.rotation.y = MathUtils.degToRad(params.turn);
    tape.case.setLidAngle(params.lid);
    view.turntable.updateMatrixWorld(true);
    lidWorld.copy(tape.case.lid.matrixWorld);
    _inv.copy(lidWorld).invert();
    // Out of the lid = away from the J-card cover, along the lid's −Z.
    liftDir.set(0, 0, -1).transformDirection(lidWorld);

    // Cassette.
    home.multiplyMatrices(lidWorld, cassetteHome);
    const c = ANIM.cassetteOut;
    targetMatrix(c.position, c.rotationDeg, a1);
    flight(home, a1, params.cassette, c.lift, c.liftShare, c.arc, liftDir, world);
    if (params.cassetteAside > 0) {
      targetMatrix(ANIM.jcardOut.cassetteAside, ANIM.jcardOut.cassetteAsideRotationDeg, a2);
      glide(world.clone(), a2, params.cassetteAside, 1.0, world);
    }
    setLocal(tape.cassette.root, world);

    // J-card: the root is the cover/spine crease, so aim the cover's centre and
    // slide towards the flat card's centre as it unfolds.
    const { cover, flaps, left } = cardWidths();
    const foldedCentre = cover / 2;
    const flatCentre = (flaps - left) / 2;
    const u = smooth(params.unfold);
    const centre = foldedCentre + (flatCentre - foldedCentre) * u;
    home.multiplyMatrices(lidWorld, jcardHome);
    const j = ANIM.jcardOut;
    const rot = {
      x: j.rotationDeg.x + (ANIM.unfold.rotationDeg.x - j.rotationDeg.x) * u,
      y: j.rotationDeg.y + (ANIM.unfold.rotationDeg.y - j.rotationDeg.y) * u + 180 * smooth(params.flip),
      z: j.rotationDeg.z + (ANIM.unfold.rotationDeg.z - j.rotationDeg.z) * u,
    };
    targetMatrix(j.position, rot, a1);
    // Shift from "cover centre" to the root (crease) in the card's own X.
    a1.multiply(_m.makeTranslation(-centre, 0, 0));
    flight(home, a1, params.jcard, j.lift, j.liftShare, j.arc, liftDir, world);
    setLocal(tape.jcard.root, world);

    // Creases, one after another.
    const hinges = tape.jcard.hinges;
    const s = ANIM.unfold.stagger;
    const span = 1 + s * Math.max(hinges.length - 1, 0);
    hinges.forEach((h, k) => {
      const local = MathUtils.clamp(params.unfold * span - s * k, 0, 1);
      h.pivot.rotation.y = h.foldedAngle * (1 - smooth(local));
    });

    Object.assign(view.rig, {
      elevation: params.elevation,
      distanceScale: params.distanceScale,
      targetX: params.targetX,
      targetY: params.targetY,
      targetZ: params.targetZ,
    });
  }

  const offFrame = handle.onFrame(() => {
    // Resting in 'presented' the turntable and the debug hooks own the tape.
    if (settled === 0 && !anim && !busy) return;
    apply();
  });

  return {
    getState: () => HERO_STATES[settled]!,
    getTarget: () => HERO_STATES[goal]!,
    isAnimating: () => !!anim || busy || !!flipTween,
    request(state) {
      goal = HERO_STATES.indexOf(state);
      emit();
      drive();
    },
    step(dir) {
      const next = MathUtils.clamp(goal + dir, 0, HERO_STATES.length - 1);
      goal = next;
      emit();
      drive();
    },
    jump(state) {
      jumpTo(HERO_STATES.indexOf(state));
    },
    flip() {
      if (HERO_STATES[settled] !== 'jcardUnfolded' || anim || busy) return Promise.resolve();
      return turnCard(params.flip >= 0.5 ? 0 : 1);
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    poseError() {
      const rest = restParams(HERO_STATES[settled]!);
      return Math.max(...(Object.keys(rest) as (keyof Params)[]).map((k) => Math.abs(rest[k] - params[k])));
    },
    dispose() {
      disposed = true;
      anim?.tl.kill();
      anim = null;
      offFrame();
      listeners.clear();
    },
  };
}

function smooth(t: number) {
  const x = MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function normalizeDeg(deg: number) {
  const d = ((deg % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}

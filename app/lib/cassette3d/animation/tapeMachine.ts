import { gsap } from 'gsap';
import { Euler, MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import { CASE_LAYOUT, CASSETTE, JCARD, SHELF } from '../dimensions';
import { defaultRig, HERO_CENTRE_Y, type HeroView } from '../heroView';
import type { CassetteScene } from '../scene';
import type { TapeModel } from '../objects/tape';
import type { SoundCue } from '../audio';
import { ANIM } from './config';
import { TAPE_STATES, type TapeState } from './states';

/**
 * The tape state machine: the only thing that moves tape objects once a tape
 * leaves 'presented'. From Stage 4 it also carries the tape between its slot on
 * the shelf and the turntable (onShelf → pulledOut → presented), and blends the
 * camera from the shelf to the hero view on the way.
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

// The state names live in a three-free module, so pages can check a ?debugState=
// without pulling three.js in (Stage 7 bundle check).
export { TAPE_STATES, HERO_STATES, isTapeState, isHeroState } from './states';
export type { TapeState, HeroState } from './states';

interface Params {
  turn: number;
  lid: number;
  cassette: number;
  cassetteAside: number;
  jcard: number;
  unfold: number;
  /** Unfolded card turned over (0 = outside facing you, 1 = inside). Only ever non-zero in jcardUnfolded. */
  flip: number;
  /** How far the case has slid out of its slot (0 = on the shelf, 1 = pulled out). */
  pull: number;
  /** Flight from the pulled-out pose to the turntable (0 = at the shelf, 1 = on the turntable). */
  fly: number;
  /** Camera: 1 = the shelf camera, 0 = the hero rig. */
  shelf: number;
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
  /** Whether there is a shelf to go back to. Without one, 'presented' is as far back as it goes. */
  hasShelf?: () => boolean;
  /** World matrix of the current tape's slot on the shelf (case frame), or null if it has none. */
  getSlot?: (out: Matrix4) => Matrix4 | null;
  /**
   * Something audible happened (Stage 6): called at the moment on the timeline,
   * whichever way it plays (closing the lid gives 'caseClose' as it shuts).
   */
  cue?: (cue: SoundCue) => void;
}

export interface TapeMachineStatus {
  /** Last state the tape came to rest in. */
  state: TapeState;
  /** Where it's heading (same as `state` when idle). */
  target: TapeState;
  animating: boolean;
}

export interface TapeMachine {
  getState: () => TapeState;
  getTarget: () => TapeState;
  isAnimating: () => boolean;
  /** Animate to `state`, one step at a time. Mid-animation: queued, or reversed if it points back. */
  request: (state: TapeState) => void;
  /** One step forwards (+1) or back (−1) from wherever the tape is heading. */
  step: (dir: 1 | -1) => void;
  /** Go straight to `state` with no animation. */
  jump: (state: TapeState) => void;
  /** How much of the camera is the shelf camera right now (1 = all of it). */
  shelfBlend: () => number;
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
/** Index of 'presented': below it the tape is on (or at) the shelf. */
const P = TAPE_STATES.indexOf('presented');
const LAST = TAPE_STATES.length - 1;

export function createTapeMachine(
  handle: CassetteScene,
  view: HeroView,
  getTape: () => TapeModel,
  options: TapeMachineOptions = {},
): TapeMachine {
  // Resting in 'presented': whatever the turntable and camera were doing (captured on leaving).
  let presentedRest: Params = {
    turn: 0, lid: 0, cassette: 0, cassetteAside: 0, jcard: 0, unfold: 0, flip: 0, pull: 1, fly: 1, shelf: 0,
    elevation: view.rig.elevation, distanceScale: view.rig.distanceScale,
    targetX: view.rig.targetX, targetY: view.rig.targetY, targetZ: view.rig.targetZ,
  };
  const params: Params = { ...presentedRest };
  let flipTween: gsap.core.Tween | null = null;
  let settled = P; // index into TAPE_STATES
  let goal = P;
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

  /** Resting in 'presented' after coming off the shelf: cover towards you, at a slight angle. */
  function shelfArrival(): Params {
    return {
      turn: ANIM.shelf.presentTurnDeg, lid: 0, cassette: 0, cassetteAside: 0, jcard: 0, unfold: 0, flip: 0,
      pull: 1, fly: 1, shelf: 0, ...defaultRig(),
    };
  }

  const slotMatrix = new Matrix4();
  /** How far back the tape can go: the shelf, if there is one. */
  const minIndex = () => (options.hasShelf?.() ? 0 : P);

  function restParams(state: TapeState): Params {
    const i = TAPE_STATES.indexOf(state);
    const base: Params = {
      ...presentedRest, lid: 0, cassette: 0, cassetteAside: 0, jcard: 0, unfold: 0, flip: 0, pull: 1, fly: 1, shelf: 0,
    };
    if (i < P) return { ...base, pull: i === P - 1 ? 1 : 0, fly: 0, shelf: 1 };
    const h = i - P;
    if (h === 0) return base;
    const p: Params = { ...base, turn: ANIM.open.turnDeg, lid: ANIM.open.lidDeg, ...ANIM.camera.lidOpen };
    if (h >= 2) Object.assign(p, { cassette: 1 }, ANIM.camera.cassetteOut);
    if (h >= 3) Object.assign(p, { cassetteAside: 1, jcard: 1 }, ANIM.camera.jcardOut);
    if (h >= 4) {
      const { elevation, margin, targetX, targetY, targetZ } = ANIM.camera.jcardUnfolded;
      // Turned over or not is up to the viewer; either way counts as resting.
      Object.assign(p, { unfold: 1, flip: Math.round(params.flip), elevation, targetX, targetY, targetZ });
      p.distanceScale = view.fitScaleFor(cardWidths().total * margin, JCARD.height * margin, elevation);
    }
    return p;
  }

  // --- Transitions ---------------------------------------------------------------------

  /** The forward timeline for step a → a+1 (indices into TAPE_STATES), from rest(a) to rest(a+1). Paused. */
  function buildStep(a: number): gsap.core.Timeline {
    const from = restParams(TAPE_STATES[a]!);
    const to = restParams(TAPE_STATES[a + 1]!);
    const tl = gsap.timeline({ paused: true });
    const moved = new Set<keyof Params>();
    const tween = (keys: (keyof Params)[], duration: number, ease: string, at = 0) => {
      const f: Partial<Params> = {};
      const t: Partial<Params> = {};
      for (const k of keys) {
        f[k] = from[k];
        t[k] = to[k];
        moved.add(k);
      }
      tl.fromTo(params, f, { ...t, duration, ease, immediateRender: false }, at);
    };
    const camera: (keyof Params)[] = ['elevation', 'distanceScale', 'targetX', 'targetY', 'targetZ'];
    /**
     * A sound at `at` s: `forward` when the playhead passes going forwards, `backward`
     * going back. GSAP fires a timeline callback both ways; a backward cue sits just
     * after the moment it marks, since the playhead reaches it from later on.
     */
    const sound = (at: number, forward: SoundCue | null, backward: SoundCue | null) => {
      if (!options.cue) return;
      tl.call(() => {
        const c = tl.reversed() ? backward : forward;
        if (c) options.cue!(c);
      }, undefined, at);
    };
    const BACK = 0.02;

    switch (TAPE_STATES[a]) {
      case 'onShelf': { // → pulledOut
        const s = ANIM.shelf;
        tween(['pull'], s.pullDuration, s.pullEase);
        sound(0, 'shelfOut', null);
        // Pushed back in: the case knocks home at the end.
        sound(BACK, null, 'shelfIn');
        break;
      }
      case 'pulledOut': { // → presented
        const s = ANIM.shelf;
        tween(['fly'], s.flyDuration, s.flyEase);
        tween(['shelf'], s.flyDuration, s.cameraEase);
        break;
      }
      case 'presented': { // → lidOpen
        const o = ANIM.open;
        tween(['turn'], o.turnDuration, o.turnEase);
        tween(['lid'], o.lidDuration, o.lidEase, o.lidDelay);
        tween(camera, Math.max(o.turnDuration, o.lidDelay + o.lidDuration), ANIM.camera.ease);
        // The lid unlatches as it starts to move, and snaps shut when it gets back.
        sound(o.lidDelay, 'caseOpen', null);
        sound(o.lidDelay + BACK, null, 'caseClose');
        break;
      }
      case 'lidOpen': { // → cassetteOut
        const c = ANIM.cassetteOut;
        tween(['cassette'], c.duration, c.ease);
        tween(camera, c.duration, ANIM.camera.ease);
        // Off the spindles as it lifts; back on them as it seats.
        sound(0.04, 'cassetteOut', null);
        sound(BACK, null, 'cassetteIn');
        break;
      }
      case 'cassetteOut': { // → jcardOut
        const j = ANIM.jcardOut;
        tween(['cassetteAside'], j.cassetteDuration, j.ease);
        tween(['jcard'], j.duration, j.ease, j.delay);
        tween(camera, j.delay + j.duration, ANIM.camera.ease);
        // The cassette lands on the table; the card slides out of the lid (or back in).
        sound(j.cassetteDuration * 0.92, 'cassetteDown', null);
        sound(j.delay, 'paperSlide', null);
        sound(j.delay + j.duration * 0.75, null, 'paperSlide');
        break;
      }
      case 'jcardOut': { // → jcardUnfolded
        const u = ANIM.unfold;
        tween(['unfold'], u.duration, u.ease);
        tween(camera, u.duration, ANIM.camera.ease);
        // Each crease as it starts to open (unfolding), or as it starts to close (folding up).
        // Crease k swings over unfold ∈ [s·k, s·k + 1] / span; the ease is close enough to linear here.
        const creases = getTape().jcard.hinges.length;
        const span = 1 + u.stagger * Math.max(creases - 1, 0);
        for (let k = 0; k < creases; k++) {
          sound((u.duration * (u.stagger * k + 0.05)) / span, 'crease', null);
          sound((u.duration * (u.stagger * k + 0.95)) / span, null, 'crease');
        }
        break;
      }
    }
    // Everything that doesn't move in this step still gets pinned to its rest value.
    const rest = (Object.keys(from) as (keyof Params)[]).filter((k) => !moved.has(k));
    tween(rest, 0.001, 'none', 0);
    return tl;
  }

  function emit() {
    const status = { state: TAPE_STATES[settled]!, target: TAPE_STATES[goal]!, animating: !!anim || busy || !!flipTween };
    for (const fn of listeners) fn(status);
  }

  function leavePresented() {
    // Take over from the turntable: remember where it and the camera were.
    const turn = normalizeDeg(view.getAngle());
    presentedRest = {
      turn, lid: 0, cassette: 0, cassetteAside: 0, jcard: 0, unfold: 0, flip: 0, pull: 1, fly: 1, shelf: 0,
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
    anim?.tl.kill();
    anim = null;
    // Back on the shelf: next time it comes off, it lands facing you again.
    if (index === 0) presentedRest = shelfArrival();
    Object.assign(params, restParams(TAPE_STATES[index]!));
    apply();
    if (index === P) view.setLocked(false);
    if (TAPE_STATES[index] === 'jcardUnfolded') view.startOrbit(ANIM.orbit.azimuthDeg);
    emit();
    drive();
  }

  async function startStep() {
    if (settled === goal || disposed) return;
    const forward = goal > settled;

    // Leaving the turntable either way (opening, or back to the shelf): take over from it.
    if (settled === P) leavePresented();
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
    else {
      // A tween played back past its start puts back the values it found when it first
      // rendered. Going backwards, that first render is the jump to the end: let it find
      // the step's start values, or a delayed part (the lid, the J-card) snaps back out
      // for the rest of the step once the playhead passes its start, as if undone.
      Object.assign(params, restParams(TAPE_STATES[a]!));
      // Suppress events on the jump to the end, or it would fire onComplete right away.
      tl.progress(1, true).reverse();
    }
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
    if (!options.reducedMotion?.()) options.cue?.('flip');
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
    if (settled === P && index !== P) leavePresented();
    if (view.isOrbiting() && TAPE_STATES[index] !== 'jcardUnfolded') void view.stopOrbit(0);
    goal = index;
    arrive(index);
  }

  // --- Poses -------------------------------------------------------------------------------

  function targetMatrix(pos: { x: number; y: number; z: number }, rotDeg: { x: number; y: number; z: number }, out: Matrix4) {
    _euler.set(MathUtils.degToRad(rotDeg.x), MathUtils.degToRad(rotDeg.y), MathUtils.degToRad(rotDeg.z));
    _quat.setFromEuler(_euler);
    _pos.set(pos.x, HERO_CENTRE_Y + pos.y, pos.z);
    return out.compose(_pos, _quat, _scale);
  }

  /**
   * Blend two world matrices along "slide clear (optional), lift out, then arc
   * across" (t in 0–1). The slide takes t up to `slide.share`, the lift up to `liftShare`;
   * `slide.turnDelay` holds the turn back for that share of the arc, and `slide.bulge`
   * bows the arc away from the lid by that much (cm), so it turns clear of the card.
   */
  function flight(
    home: Matrix4, away: Matrix4, t: number, lift: number, liftShare: number, arc: number, liftDir: Vector3, out: Matrix4,
    slide: { offset: Vector3; share: number; turnDelay: number; bulge: number } | null = null,
  ) {
    const hp = new Vector3();
    const hq = new Quaternion();
    const ap = new Vector3();
    const aq = new Quaternion();
    home.decompose(hp, hq, _scale);
    away.decompose(ap, aq, _scale);
    const slideShare = slide ? Math.min(slide.share, liftShare) : 0;
    const slid = slide ? hp.clone().add(slide.offset) : hp;
    const lifted = slid.clone().addScaledVector(liftDir, lift);
    if (slideShare > 0 && t <= slideShare) {
      _pos.lerpVectors(hp, slid, smooth(t / slideShare));
      _quat.copy(hq);
    } else if (t <= liftShare) {
      _pos.lerpVectors(slid, lifted, liftShare > slideShare ? (t - slideShare) / (liftShare - slideShare) : 1);
      _quat.copy(hq);
    } else {
      const u = (t - liftShare) / (1 - liftShare);
      _pos.lerpVectors(lifted, ap, u);
      _pos.y += Math.sin(Math.PI * u) * arc;
      if (slide) _pos.addScaledVector(liftDir, Math.sin(Math.PI * u) * slide.bulge);
      const delay = slide?.turnDelay ?? 0;
      _quat.slerpQuaternions(hq, aq, delay > 0 ? smooth(MathUtils.clamp((u - delay) / (1 - delay), 0, 1)) : u);
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
  const cassetteSlide = { offset: new Vector3(), share: 0, turnDelay: 0, bulge: 0 };
  const home = new Matrix4();
  const a1 = new Matrix4();
  const a2 = new Matrix4();
  const world = new Matrix4();

  function setLocal(obj: { position: Vector3; quaternion: Quaternion; scale: Vector3 }, worldMatrix: Matrix4) {
    _m.multiplyMatrices(_inv, worldMatrix);
    _m.decompose(obj.position, obj.quaternion, obj.scale);
  }

  const heroPos = new Vector3();
  const heroQuat = new Quaternion();
  const slotPos = new Vector3();
  const slotQuat = new Quaternion();
  const pulledPos = new Vector3();

  /** Where the turntable (the tape's carrier) is: on the shelf, in flight, or home. */
  function placeCarrier() {
    const turntable = view.turntable;
    if (params.fly >= 1 || !options.getSlot?.(slotMatrix)) {
      turntable.position.set(0, HERO_CENTRE_Y, 0);
      turntable.rotation.set(0, MathUtils.degToRad(params.turn), 0);
      return;
    }
    slotMatrix.decompose(slotPos, slotQuat, _scale);
    pulledPos.copy(slotPos);
    pulledPos.z += SHELF.pullOut;
    if (params.fly <= 0) {
      turntable.position.lerpVectors(slotPos, pulledPos, params.pull);
      turntable.quaternion.copy(slotQuat);
      return;
    }
    heroPos.set(0, HERO_CENTRE_Y, 0);
    _euler.set(0, MathUtils.degToRad(params.turn), 0);
    heroQuat.setFromEuler(_euler);
    const u = params.fly;
    turntable.position.lerpVectors(pulledPos, heroPos, u);
    turntable.position.y += Math.sin(Math.PI * u) * ANIM.shelf.arc;
    turntable.quaternion.slerpQuaternions(slotQuat, heroQuat, u);
  }

  function apply() {
    const tape = getTape();
    placeCarrier();
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
    // Its hinge-side edge sits on the J-card's back flap: slide it off (away from the hinge, the lid's +X) first.
    const backTip = CASE_LAYOUT.jcard.x + (getTape().jcard.panels.find((p) => p.name === 'back')?.width ?? JCARD.backFull);
    const slide = Math.max(0, backTip - (CASE_LAYOUT.cassette.x - CASSETTE.height / 2) + c.slideMargin);
    cassetteSlide.offset.set(1, 0, 0).transformDirection(lidWorld).multiplyScalar(slide);
    cassetteSlide.share = c.slideShare;
    cassetteSlide.turnDelay = c.turnDelay;
    cassetteSlide.bulge = c.bulge;
    flight(home, a1, params.cassette, c.lift, c.liftShare, c.arc, liftDir, world, cassetteSlide);
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
    if (settled === P && !anim && !busy) return;
    apply();
  });

  return {
    getState: () => TAPE_STATES[settled]!,
    getTarget: () => TAPE_STATES[goal]!,
    isAnimating: () => !!anim || busy || !!flipTween,
    request(state) {
      goal = MathUtils.clamp(TAPE_STATES.indexOf(state), minIndex(), LAST);
      emit();
      drive();
    },
    step(dir) {
      goal = MathUtils.clamp(goal + dir, minIndex(), LAST);
      emit();
      drive();
    },
    jump(state) {
      jumpTo(MathUtils.clamp(TAPE_STATES.indexOf(state), minIndex(), LAST));
    },
    shelfBlend: () => params.shelf,
    flip() {
      if (TAPE_STATES[settled] !== 'jcardUnfolded' || anim || busy) return Promise.resolve();
      return turnCard(params.flip >= 0.5 ? 0 : 1);
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    poseError() {
      const rest = restParams(TAPE_STATES[settled]!);
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

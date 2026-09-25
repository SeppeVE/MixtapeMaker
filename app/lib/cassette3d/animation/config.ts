/**
 * Every duration, ease and pose of the tape machine, in one place. The debug
 * GUI (?debug=1) edits this object live; a change applies from the next
 * transition. Durations are seconds, angles degrees, positions cm.
 *
 * Poses are relative to the centre of the case on the turntable, in world axes:
 * +X right, +Y up, +Z towards the camera (at the default front view).
 */
export const ANIM = {
  shelf: {
    /** onShelf → pulledOut: the case slides out of its row (SHELF.pullOut cm). */
    pullDuration: 0.5,
    pullEase: 'power2.out',
    /** pulledOut → presented: it flies to the turntable while the camera follows. */
    flyDuration: 1.4,
    flyEase: 'power2.inOut',
    cameraEase: 'power2.inOut',
    /** Height of the flight's arc, cm. */
    arc: 3,
    /** Turntable angle the case lands at, so it arrives showing its cover at a slight angle. */
    presentTurnDeg: -20,
  },
  open: {
    /** Turntable turn that shows the open case like a book, both halves visible. */
    turnDeg: -35,
    turnDuration: 0.9,
    turnEase: 'power2.inOut',
    lidDeg: 105,
    lidDelay: 0.2,
    lidDuration: 1.0,
    /** Slight overshoot, then settle. */
    lidEase: 'back.out(1.6)',
  },
  cassetteOut: {
    duration: 1.5,
    ease: 'power2.inOut',
    /**
     * First slide away from the hinge until the cassette clears the J-card's back
     * flap (folded under it), over this share of the move, plus this margin (cm)...
     */
    slideShare: 0.22,
    slideMargin: 0.25,
    /** ...then lift straight out of the lid by this much (cm), until this share of the move... */
    lift: 2.2,
    liftShare: 0.45,
    /** ...then fly to the reading pose, not turning for this share of the flight... */
    turnDelay: 0.2,
    /** ...bowing out from the lid by this much (cm), so it doesn't swing back into the card... */
    bulge: 1.5,
    /** ...on a gentle arc upwards (cm). */
    arc: 1.5,
    position: { x: 0.3, y: 0.4, z: 6.5 },
    rotationDeg: { x: -6, y: 10, z: 0 },
  },
  jcardOut: {
    duration: 1.15,
    delay: 0.2,
    ease: 'power2.inOut',
    lift: 1.8,
    liftShare: 0.3,
    arc: 1.2,
    /** Where the J-card cover's centre goes, folded. */
    position: { x: 0, y: 0.2, z: 5.5 },
    rotationDeg: { x: -3, y: 12, z: 0 },
    /** The cassette makes room: it goes to lie on the table, label up. */
    cassetteDuration: 0.9,
    cassetteAside: { x: 9.5, y: -4.85, z: 1.5 },
    cassetteAsideRotationDeg: { x: -90, y: 0, z: -18 },
  },
  unfold: {
    duration: 1.5,
    ease: 'power1.inOut',
    /** Each crease starts this share of its own swing after the previous one. */
    stagger: 0.45,
    /** Card faces the camera square on once flat. */
    rotationDeg: { x: 0, y: 0, z: 0 },
  },
  camera: {
    ease: 'power2.inOut',
    lidOpen: { elevation: 16, distanceScale: 1.2, targetX: -0.8, targetY: 0, targetZ: 1 },
    cassetteOut: { elevation: 12, distanceScale: 1.05, targetX: 0, targetY: 0, targetZ: 3 },
    jcardOut: { elevation: 12, distanceScale: 1.1, targetX: 1.5, targetY: -0.5, targetZ: 4.5 },
    /** Distance for the unfolded card is fitted to its width at run time; this is extra room. */
    jcardUnfolded: { elevation: 5, margin: 1.15, targetX: 0, targetY: 0, targetZ: 5.5 },
  },
  orbit: {
    /** Blend from the orbit camera back to the animated rig when leaving the unfolded card. */
    releaseSeconds: 0.45,
    /** Sideways limit either way, so the camera never ends up behind the card (in the case). */
    azimuthDeg: 70,
  },
  flip: {
    /** "Turn over": the unfolded card spins round to show its inside. */
    duration: 1.1,
    ease: 'power2.inOut',
  },
  reducedMotion: {
    /** With prefers-reduced-motion: fade out, cut to the new state, fade in. */
    fadeMs: 140,
  },
};

export type AnimConfig = typeof ANIM;

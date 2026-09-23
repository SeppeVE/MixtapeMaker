import {
  BACK_FULL_MM,
  BACK_SHORT_MM,
  FLAPS_MM,
  JCARD_HEIGHT_MM,
  SPINE_MM,
} from '~/components/jcard/dimensions';

/**
 * Every physical dimension of the 3D objects, in scene units (1 unit = 1 cm).
 * Geometry is built procedurally from these, so tuning happens here.
 *
 * Case frame (closed case, reading the J-card cover upright):
 *   +X  towards the open edge          (hinge edge at -X)
 *   +Y  up, along the case's long side
 *   +Z  out of the lid, towards the viewer (back of the tray at -Z)
 * The origin is the centre of the closed case's bounding box.
 */

const MM = 0.1;

/** Norelco box, closed. */
export const CASE = {
  width: 6.9,   // X, hinge edge to open edge
  length: 10.9, // Y
  depth: 1.7,   // Z
  /** Wall thickness of the tray (floor, open-edge wall, end walls, spine window). */
  wall: 0.11,
  /** Thickness of the lid's front plate. */
  lidThickness: 0.11,
  /** The lid's end tabs sit outside the tray's end walls; this is their thickness. */
  tabThickness: 0.09,
  /** How far the lid's end tabs reach down the case's short ends (the band along the top). */
  tabBand: 0.28,
  /** Outer corner rounding of the plastic parts. */
  cornerRadius: 0.06,
  /**
   * Hinge. Two short pins, one per short end, sit this far in from the hinge edge and
   * down from the lid's top face. The lid's hinge edge is a quarter-round knuckle
   * centred on the pin axis, so it swings clear of the tray's spine window.
   * (Reference photos: pivot ≈ 3–4 mm in from the hinge edge; human to confirm.)
   */
  hingeInset: 0.35,
  pinRadius: 0.1,
  /** Clearance between the lid knuckle's swept circle and the tray. */
  hingeClearance: 0.008,
  /** How far the lid opens, in degrees (Stage 3 animates to this). */
  lidOpenDeg: 105,
  /** Cross-shaped spindle posts that go into the cassette hubs. */
  /** `insert` is how far each post reaches into the hub above the cassette's underside. */
  spindle: { armLength: 0.62, armWidth: 0.12, insert: 0.4 },
  /** Ribs on the tray floor the cassette rests on (their height follows from the layout). */
  rib: { width: 0.1 },
  /** Snap nubs on the open-edge wall's top that keep the case shut. */
  nub: { radius: 0.06, length: 0.5 },
  /** Clips on the lid's inner face that hook under the J-card cover's free edge. */
  clip: { length: 0.8, height: 0.065, reach: 0.14 },
} as const;

/** Compact cassette, in its own frame: long side X, tape edge at -Y, label (side A) at +Z. */
export const CASSETTE = {
  width: 10.04,  // X
  height: 6.38,  // Y
  thickness: 1.2, // Z, overall
  cornerRadius: 0.22,
  /** Depth of the label recess on each face. */
  recess: 0.03,
  /** Label area (the recess), centred in X. */
  label: { width: 8.6, bottom: -1.45, top: 2.8, cornerRadius: 0.2 },
  /** Clear window through the middle; the hubs and tape pack show through it. */
  window: { width: 6.3, height: 2.0, centerY: 0.45, cornerRadius: 0.95 },
  /** Raised trapezoid along the tape edge, on both faces. */
  trapezoid: { topWidth: 6.0, bottomWidth: 7.4, height: 1.3, raise: 0.035 },
  hub: {
    /** Hub centres sit ±spacing/2 from the middle (42.5 mm apart on a real tape). */
    spacing: 4.25,
    outerRadius: 0.72,
    innerRadius: 0.42,
    teeth: 6,
    toothDepth: 0.12,
    height: 0.6,
  },
  /** Radius of the spindle holes in the window panes. */
  spindleHole: 0.55,
  /** Tape pack wound round each hub (radii for a tape near its middle). */
  tape: { width: 0.381, packRadiusA: 2.0, packRadiusB: 1.55 },
  screw: {
    radius: 0.17,
    headRadius: 0.13,
    positions: [
      [-4.6, 2.75], [4.6, 2.75], [-4.6, -2.3], [4.6, -2.3], [0, -2.55],
    ] as ReadonlyArray<readonly [number, number]>,
  },
  /** Openings along the tape edge (capstan / head / capstan). */
  headOpenings: [
    { x: 0, width: 1.6 },
    { x: -2.2, width: 0.9 },
    { x: 2.2, width: 0.9 },
    { x: -3.55, width: 0.55 },
    { x: 3.55, width: 0.55 },
  ] as ReadonlyArray<{ x: number; width: number }>,
  headOpeningDepth: 0.55,
  /** Write-protect tabs on the edge opposite the tape. */
  writeProtect: { width: 0.75, depth: 0.32, inset: 1.2 },
} as const;

/** J-card, from the same numbers the PDF export uses (app/components/jcard/dimensions.ts). */
export const JCARD = {
  height: JCARD_HEIGHT_MM * MM,
  spine: SPINE_MM * MM,
  backFull: BACK_FULL_MM * MM,
  backShort: BACK_SHORT_MM * MM,
  /** Flap widths, cover first. */
  flaps: FLAPS_MM.map((w) => w * MM) as readonly number[],
  /** Card stock thickness. */
  thickness: 0.02,
  /** Gap between the card and the plastic it rests against. */
  gap: 0.006,
} as const;

// --- Derived values ---------------------------------------------------------

/** Top of the tray's walls (the lid plate rests on them). */
export const TRAY_TOP = CASE.depth / 2 - CASE.lidThickness;
/** Half length of the tray (inside the lid's end tabs). */
export const TRAY_HALF_LENGTH = CASE.length / 2 - CASE.tabThickness;
/** Hinge pin axis, in the case frame's XZ plane (it runs along Y). */
export const HINGE_AXIS = {
  x: -CASE.width / 2 + CASE.hingeInset,
  z: CASE.depth / 2 - CASE.hingeInset,
} as const;
/** Radius swept by the outside of the lid knuckle; the tray keeps clear of it. */
export const HINGE_SWEEP_RADIUS = CASE.hingeInset + CASE.hingeClearance;

/**
 * Where the J-card and cassette sit inside the closed case (case frame).
 *
 * The cover lies against the lid plate. The spine runs down the inside of the
 * spine window, and the back flap folds under the cassette, so from behind the
 * back panel covers the hinge-side third of the case. The cassette sits between
 * the cover and the back flap, tape edge towards the hinge, held up by the
 * spindle posts and the floor ribs.
 */
export const CASE_LAYOUT = (() => {
  const t = JCARD.thickness;
  /** Outside face of the J-card cover. */
  const coverOuterZ = CASE.depth / 2 - CASE.lidThickness - JCARD.gap;
  /** Outside face of the J-card spine. */
  const spineOuterX = -CASE.width / 2 + CASE.wall + JCARD.gap;
  /** Inner (upper) face of the back flap once folded under the cassette. */
  const backInnerZ = coverOuterZ - JCARD.spine - t;
  const cassetteBottomZ = backInnerZ + JCARD.gap;
  const floorTopZ = -CASE.depth / 2 + CASE.wall;
  const openWallInnerX = CASE.width / 2 - CASE.wall;
  const cassetteX = (spineOuterX + t + openWallInnerX) / 2;
  const hubOffsetX = CASSETTE.window.centerY;
  return {
    /** J-card root: the cover/spine crease, on the cover's outside face. */
    jcard: { x: spineOuterX + t, y: 0, z: coverOuterZ },
    /** Cassette centre. It's rotated −90° about Z: its tape edge (−Y) faces the hinge (−X). */
    cassette: { x: cassetteX, y: 0, z: cassetteBottomZ + CASSETTE.thickness / 2 },
    /** Hub / spindle centres in the case's XY plane. */
    hubs: [
      { x: cassetteX + hubOffsetX, y: CASSETTE.hub.spacing / 2 },
      { x: cassetteX + hubOffsetX, y: -CASSETTE.hub.spacing / 2 },
    ],
    floorTopZ,
    cassetteBottomZ,
    openWallInnerX,
    /** The floor ribs stay clear of the back flap (full width) so the card lies flat. */
    ribMinX: spineOuterX + t + JCARD.backFull + 0.15,
  };
})();

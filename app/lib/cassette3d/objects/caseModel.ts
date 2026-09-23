import { BoxGeometry, CylinderGeometry, Group, Mesh, Shape, type Material } from 'three';
import {
  CASE,
  CASE_LAYOUT,
  CASSETTE,
  HINGE_AXIS,
  HINGE_SWEEP_RADIUS,
  TRAY_HALF_LENGTH,
  TRAY_TOP,
} from '../dimensions';
import { extrudeAlongY, extrudeSlabY } from './geometry';

/**
 * The Norelco case: a deep tray and a lid that pivots on two pins at the short ends.
 * Built in the case frame described in dimensions.ts.
 *
 * Both halves hang off a pivot on the hinge axis, so either one can be the half
 * that swings. By default the tray swings and the lid stays put: the cassette sits
 * on the tray's spindles and the J-card is clipped into the lid, so opening the
 * case swings the cassette out while the J-card stays in place. (The J-card cover
 * lies between the lid and the cassette, so they have to be on opposite halves.)
 *
 * Hierarchy:
 *   root
 *   ├─ trayPivot     on the hinge axis
 *   │  └─ tray       offset back by the axis, so its children use case coordinates:
 *   │                body, end walls, pins, spindle posts, ribs, nubs (+ the cassette)
 *   └─ lidPivot      on the hinge axis
 *      └─ lid        same offset: front plate, tabs, clips (+ the J-card)
 */
export type CaseHalf = 'tray' | 'lid';

export interface CaseModel {
  root: Group;
  trayPivot: Group;
  tray: Group;
  lidPivot: Group;
  lid: Group;
  /** Open the case by `deg` degrees (0 = closed, CASE.lidOpenDeg = fully open). */
  setLidAngle: (deg: number) => void;
  /** Which half swings when the case opens (the other stays where it is). Default 'tray'. */
  setMovingHalf: (half: CaseHalf) => void;
}

const hx = CASE.width / 2;
const hz = CASE.depth / 2;
const R = CASE.hingeInset;

/** Where the tray's spine-window wall meets the circle the lid knuckle sweeps. */
function sweepAngleAtX(dx: number) {
  const dz = -Math.sqrt(HINGE_SWEEP_RADIUS ** 2 - dx ** 2);
  return Math.atan2(dz, dx);
}

export function createCase(plastic: Material): CaseModel {
  const root = new Group();
  root.name = 'case';

  const trayPivot = new Group();
  trayPivot.name = 'trayPivot';
  trayPivot.position.set(HINGE_AXIS.x, 0, HINGE_AXIS.z);
  root.add(trayPivot);

  const tray = new Group();
  tray.name = 'tray';
  tray.position.set(-HINGE_AXIS.x, 0, -HINGE_AXIS.z);
  trayPivot.add(tray);

  const lidPivot = new Group();
  lidPivot.name = 'lidPivot';
  lidPivot.position.set(HINGE_AXIS.x, 0, HINGE_AXIS.z);
  root.add(lidPivot);

  const lid = new Group();
  lid.name = 'lid';
  lid.position.set(-HINGE_AXIS.x, 0, -HINGE_AXIS.z);
  lidPivot.add(lid);

  const add = (parent: Group, mesh: Mesh, name: string) => {
    mesh.name = name;
    parent.add(mesh);
    return mesh;
  };

  // --- Tray ------------------------------------------------------------------
  add(tray, new Mesh(extrudeAlongY(trayProfile(), 2 * (TRAY_HALF_LENGTH - CASE.wall)), plastic), 'trayBody');

  const endWall = endWallProfile();
  add(tray, new Mesh(extrudeSlabY(endWall, TRAY_HALF_LENGTH - CASE.wall, CASE.wall), plastic), 'trayEndTop');
  add(tray, new Mesh(extrudeSlabY(endWall, -TRAY_HALF_LENGTH, CASE.wall), plastic), 'trayEndBottom');

  // Hinge pins: short stubs through the end walls' hinge corner into the lid tabs.
  // Their outer ends show as small discs on the tabs.
  for (const sign of [1, -1]) {
    const inner = TRAY_HALF_LENGTH - CASE.wall - 0.03;
    const outer = CASE.length / 2 + 0.006;
    const pin = new Mesh(new CylinderGeometry(CASE.pinRadius, CASE.pinRadius, outer - inner, 24), plastic);
    pin.position.set(HINGE_AXIS.x, sign * (inner + outer) / 2, HINGE_AXIS.z);
    add(tray, pin, sign > 0 ? 'pinTop' : 'pinBottom');
  }

  // Cross-shaped spindle posts, rising from the floor into the cassette hubs.
  const postTop = CASE_LAYOUT.cassetteBottomZ + CASE.spindle.insert;
  const postHeight = postTop - CASE_LAYOUT.floorTopZ;
  for (const [i, hub] of CASE_LAYOUT.hubs.entries()) {
    const post = new Group();
    post.name = `spindle${i}`;
    post.position.set(hub.x, hub.y, CASE_LAYOUT.floorTopZ + postHeight / 2);
    const { armLength, armWidth } = CASE.spindle;
    post.add(new Mesh(new BoxGeometry(armLength, armWidth, postHeight), plastic));
    post.add(new Mesh(new BoxGeometry(armWidth, armLength, postHeight), plastic));
    tray.add(post);
  }

  // Floor ribs the cassette rests on: two long ones clear of the J-card back flap,
  // plus short cross ribs near the ends.
  const ribHeight = CASE_LAYOUT.cassetteBottomZ - CASE_LAYOUT.floorTopZ;
  const ribZ = CASE_LAYOUT.floorTopZ + ribHeight / 2;
  const ribLength = 2 * (TRAY_HALF_LENGTH - CASE.wall) - 1.4;
  for (const x of [CASE_LAYOUT.ribMinX, CASE_LAYOUT.openWallInnerX - 0.55]) {
    const rib = new Mesh(new BoxGeometry(CASE.rib.width, ribLength, ribHeight), plastic);
    rib.position.set(x, 0, ribZ);
    add(tray, rib, 'rib');
  }
  const crossRibX0 = CASE_LAYOUT.ribMinX;
  const crossRibX1 = CASE_LAYOUT.openWallInnerX;
  for (const sign of [1, -1]) {
    const rib = new Mesh(new BoxGeometry(crossRibX1 - crossRibX0, CASE.rib.width, ribHeight), plastic);
    rib.position.set((crossRibX0 + crossRibX1) / 2, sign * (TRAY_HALF_LENGTH - CASE.wall - 0.28), ribZ);
    add(tray, rib, 'crossRib');
  }

  // Guide tabs on the open-edge wall that keep the cassette from sliding.
  const cassetteEdgeX = CASE_LAYOUT.cassette.x + CASSETTE.height / 2;
  const tabDepth = Math.max(CASE_LAYOUT.openWallInnerX - cassetteEdgeX, 0.02);
  for (const y of [-3.2, 3.2]) {
    const tab = new Mesh(new BoxGeometry(tabDepth, 0.5, 0.7), plastic);
    tab.position.set(CASE_LAYOUT.openWallInnerX - tabDepth / 2, y, CASE_LAYOUT.floorTopZ + 0.35);
    add(tray, tab, 'guideTab');
  }

  // Snap nubs just under the rim of the open-edge wall, on its inside.
  for (const y of [-2.2, 2.2]) {
    const nub = new Mesh(new CylinderGeometry(CASE.nub.radius, CASE.nub.radius, CASE.nub.length, 12, 1, false, 0, Math.PI), plastic);
    // Half cylinder along Y, bulging towards −X.
    nub.rotation.y = Math.PI;
    nub.position.set(CASE_LAYOUT.openWallInnerX, y, TRAY_TOP - 0.12);
    add(tray, nub, 'snapNub');
  }

  // --- Lid -------------------------------------------------------------------
  add(lid, new Mesh(extrudeAlongY(lidProfile(), 2 * TRAY_HALF_LENGTH), plastic), 'lidPlate');
  const tab = lidTabProfile();
  add(lid, new Mesh(extrudeSlabY(tab, TRAY_HALF_LENGTH, CASE.tabThickness), plastic), 'lidTabTop');
  add(lid, new Mesh(extrudeSlabY(tab, -CASE.length / 2, CASE.tabThickness), plastic), 'lidTabBottom');

  // Two clips on the lid's inner face that hook round the J-card cover's free edge.
  const clipX = CASE_LAYOUT.openWallInnerX - 0.08;
  for (const y of [-2.6, 2.6]) {
    const clip = new Group();
    clip.name = 'jcardClip';
    const { length, height, reach } = CASE.clip;
    const upright = new Mesh(new BoxGeometry(0.05, length, height), plastic);
    upright.position.set(0.025, 0, -height / 2);
    const hook = new Mesh(new BoxGeometry(reach, length, 0.02), plastic);
    hook.position.set(0.05 - reach / 2, 0, -height + 0.01);
    clip.add(upright, hook);
    clip.position.set(clipX, y, TRAY_TOP);
    lid.add(clip);
  }

  root.traverse((obj) => {
    // Clear plastic shouldn't throw solid shadows; the paper and the shell do that.
    obj.castShadow = false;
    obj.receiveShadow = false;
  });

  let angle = 0;
  let moving: CaseHalf = 'tray';
  const apply = () => {
    // Opening turns the lid's free edge (+X) up towards +Z, a negative turn about Y,
    // relative to the tray. Turning the tray the other way gives the same relative motion.
    const rad = (angle * Math.PI) / 180;
    lidPivot.rotation.y = moving === 'lid' ? -rad : 0;
    trayPivot.rotation.y = moving === 'tray' ? rad : 0;
  };

  return {
    root,
    trayPivot,
    tray,
    lidPivot,
    lid,
    setLidAngle(deg) {
      angle = deg;
      apply();
    },
    setMovingHalf(half) {
      moving = half;
      apply();
    },
  };
}

/**
 * Tray cross-section (XZ): floor, open-edge wall and the spine window along the hinge edge.
 * The spine window's top follows the circle the lid knuckle sweeps, so the lid clears it.
 */
function trayProfile(): Shape {
  const w = CASE.wall;
  const r = CASE.cornerRadius;
  const zOuter = HINGE_AXIS.z + Math.sin(sweepAngleAtX(-R)) * HINGE_SWEEP_RADIUS;
  const zInner = HINGE_AXIS.z + Math.sin(sweepAngleAtX(-R + w)) * HINGE_SWEEP_RADIUS;

  const s = new Shape();
  s.moveTo(-hx, zOuter);
  s.lineTo(-hx, -hz + r);
  s.quadraticCurveTo(-hx, -hz, -hx + r, -hz);
  s.lineTo(hx - r, -hz);
  s.quadraticCurveTo(hx, -hz, hx, -hz + r);
  s.lineTo(hx, TRAY_TOP - 0.02);
  s.quadraticCurveTo(hx, TRAY_TOP, hx - 0.02, TRAY_TOP);
  s.lineTo(hx - w, TRAY_TOP);
  s.lineTo(hx - w, -hz + w);
  s.lineTo(-hx + w, -hz + w);
  s.lineTo(-hx + w, zInner);
  s.absarc(HINGE_AXIS.x, HINGE_AXIS.z, HINGE_SWEEP_RADIUS, sweepAngleAtX(-R + w), sweepAngleAtX(-R), true);
  s.closePath();
  return s;
}

/** Tray end wall (XZ): the full cross-section, with a bite round the hinge for the knuckle. */
function endWallProfile(): Shape {
  const r = CASE.cornerRadius;
  const topDx = Math.sqrt(HINGE_SWEEP_RADIUS ** 2 - (TRAY_TOP - HINGE_AXIS.z) ** 2);
  const s = new Shape();
  s.moveTo(-hx, HINGE_AXIS.z + Math.sin(sweepAngleAtX(-R)) * HINGE_SWEEP_RADIUS);
  s.lineTo(-hx, -hz + r);
  s.quadraticCurveTo(-hx, -hz, -hx + r, -hz);
  s.lineTo(hx - r, -hz);
  s.quadraticCurveTo(hx, -hz, hx, -hz + r);
  s.lineTo(hx, TRAY_TOP);
  s.lineTo(HINGE_AXIS.x + topDx, TRAY_TOP);
  s.absarc(
    HINGE_AXIS.x, HINGE_AXIS.z, HINGE_SWEEP_RADIUS,
    Math.atan2(TRAY_TOP - HINGE_AXIS.z, topDx), sweepAngleAtX(-R), true,
  );
  s.closePath();
  return s;
}

/**
 * Lid cross-section (XZ): the front plate plus a quarter-round knuckle along the hinge
 * edge, centred on the pin axis. The knuckle runs a little past the quarter so that,
 * closed, it meets the top of the spine window.
 */
function lidProfile(): Shape {
  const t = CASE.lidThickness;
  const r = CASE.cornerRadius;
  const past = 0.2; // radians past the quarter
  const s = new Shape();
  s.moveTo(HINGE_AXIS.x, hz);
  s.lineTo(hx - r, hz);
  s.quadraticCurveTo(hx, hz, hx, hz - r);
  s.lineTo(hx, hz - t);
  s.lineTo(HINGE_AXIS.x, hz - t);
  s.absarc(HINGE_AXIS.x, HINGE_AXIS.z, R - t, Math.PI / 2, Math.PI + past, false);
  s.absarc(HINGE_AXIS.x, HINGE_AXIS.z, R, Math.PI + past, Math.PI / 2, true);
  s.closePath();
  return s;
}

/**
 * Lid end tab (XZ), outside the tray's end wall: a band along the top edge that
 * widens into a rounded ear round the pin. The pin shows through a hole in the ear.
 */
function lidTabProfile(): Shape {
  const r = CASE.cornerRadius;
  const bandBottom = hz - CASE.tabBand;
  const earR = R + 0.12;
  const s = new Shape();
  s.moveTo(HINGE_AXIS.x, hz);
  s.lineTo(hx - r, hz);
  s.quadraticCurveTo(hx, hz, hx, hz - r);
  s.lineTo(hx, bandBottom);
  s.lineTo(HINGE_AXIS.x + earR + 0.6, bandBottom);
  s.quadraticCurveTo(HINGE_AXIS.x + earR, bandBottom, HINGE_AXIS.x + earR * 0.6, HINGE_AXIS.z - earR * 0.8);
  s.quadraticCurveTo(HINGE_AXIS.x, HINGE_AXIS.z - earR * 1.05, HINGE_AXIS.x - R, HINGE_AXIS.z - earR * 0.55);
  s.lineTo(-hx, HINGE_AXIS.z);
  s.absarc(HINGE_AXIS.x, HINGE_AXIS.z, R, Math.PI, Math.PI / 2, true);
  s.closePath();

  const hole = new Shape();
  hole.absarc(HINGE_AXIS.x, HINGE_AXIS.z, CASE.pinRadius, 0, Math.PI * 2, false);
  s.holes.push(hole);
  return s;
}

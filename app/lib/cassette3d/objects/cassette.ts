import { BoxGeometry, CylinderGeometry, Group, Mesh, Path, Shape, ShapeGeometry } from 'three';
import { CASSETTE } from '../dimensions';
import type { TapeMaterials } from '../materials';
import { extrudeZ } from './geometry';

/**
 * Compact cassette, built in its own frame: long side along X, tape edge at −Y,
 * side A label facing +Z, origin at the centre.
 *
 * The shell is a solid core (with the window, screw holes and edge openings cut
 * through it) between two thin face plates that leave the label area recessed.
 * The hubs and tape pack only need to look right through the window, so they
 * simply overlap the solid core everywhere else.
 */
export interface CassetteModel {
  root: Group;
  /** Label meshes for side A (+Z) and side B (−Z). Stage 2 gives them textures. */
  labelA: Mesh;
  labelB: Mesh;
}

const hw = CASSETTE.width / 2;
const hh = CASSETTE.height / 2;
/** Half thickness of the body, without the raised trapezoid. */
const bodyHalf = CASSETTE.thickness / 2 - CASSETTE.trapezoid.raise;
/** Half thickness of the core (the floor of the label recess). */
const coreHalf = bodyHalf - CASSETTE.recess;

export function createCassette(materials: TapeMaterials): CassetteModel {
  const root = new Group();
  root.name = 'cassette';
  const add = (mesh: Mesh, name: string) => {
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };

  // --- Shell -------------------------------------------------------------------
  const core = coreOutline();
  core.holes.push(windowPath(), ...screwHoles());
  add(new Mesh(extrudeZ(core, -coreHalf, 2 * coreHalf), materials.shell), 'core');

  const plate = roundedRect(-hw, -hh, CASSETTE.width, CASSETTE.height, CASSETTE.cornerRadius);
  const { label } = CASSETTE;
  plate.holes.push(
    roundedRect(-label.width / 2, label.bottom, label.width, label.top - label.bottom, label.cornerRadius),
    ...screwHoles(),
  );
  add(new Mesh(extrudeZ(plate, coreHalf, CASSETTE.recess, { bevel: 0.012 }), materials.shell), 'plateA');
  add(new Mesh(extrudeZ(plate, -bodyHalf, CASSETTE.recess, { bevel: 0.012 }), materials.shell), 'plateB');

  const trap = trapezoidShape();
  const { raise } = CASSETTE.trapezoid;
  add(new Mesh(extrudeZ(trap, bodyHalf - 0.005, raise + 0.005, { bevel: 0.012 }), materials.shellGloss), 'trapezoidA');
  add(new Mesh(extrudeZ(trap, -bodyHalf - raise, raise + 0.005, { bevel: 0.012 }), materials.shellGloss), 'trapezoidB');

  // --- Labels (side B is turned round so it reads correctly from behind) ----------
  const labelShape = roundedRect(-label.width / 2, label.bottom, label.width, label.top - label.bottom, label.cornerRadius);
  labelShape.holes.push(windowPath());
  const labelGeometry = new ShapeGeometry(labelShape, 12);
  // ShapeGeometry's UVs are the shape's own coordinates; stretch them to 0–1 over
  // the label area so a label texture maps onto it edge to edge.
  const uv = labelGeometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(
      i,
      (uv.getX(i) + label.width / 2) / label.width,
      (uv.getY(i) - label.bottom) / (label.top - label.bottom),
    );
  }
  const labelA = add(new Mesh(labelGeometry, materials.label), 'labelA');
  labelA.position.z = coreHalf + 0.002;
  const labelB = add(new Mesh(labelGeometry.clone(), materials.label), 'labelB');
  labelB.position.z = -coreHalf - 0.002;
  labelB.rotation.y = Math.PI;

  // --- Window panes, with holes for the spindles ------------------------------------
  const pane = windowShape();
  for (const x of hubXs()) pane.holes.push(circlePath(x, CASSETTE.window.centerY, CASSETTE.spindleHole));
  const paneGeometry = new ShapeGeometry(pane, 24);
  for (const [side, z] of [['A', coreHalf - 0.004], ['B', -coreHalf + 0.004]] as const) {
    const m = new Mesh(side === 'A' ? paneGeometry : paneGeometry.clone(), materials.windowPane);
    m.name = `pane${side}`;
    m.position.z = z;
    m.renderOrder = 2;
    root.add(m);
  }

  // --- Hubs and tape pack -------------------------------------------------------------
  const { hub, tape } = CASSETTE;
  const hubShape = circleShape(0, 0, hub.outerRadius);
  hubShape.holes.push(toothedHole());
  const hubGeometry = extrudeZ(hubShape, -hub.height / 2, hub.height, { curveSegments: 32 });
  const packs = [tape.packRadiusA, tape.packRadiusB];
  hubXs().forEach((x, i) => {
    const h = add(new Mesh(i === 0 ? hubGeometry : hubGeometry.clone(), materials.hub), `hub${i}`);
    h.position.set(x, CASSETTE.window.centerY, 0);
    h.rotation.z = i * 0.4;

    const pack = circleShape(0, 0, packs[i]!);
    pack.holes.push(circlePath(0, 0, hub.outerRadius - 0.01));
    const p = add(new Mesh(extrudeZ(pack, -tape.width / 2, tape.width, { curveSegments: 48 }), materials.tape), `tapePack${i}`);
    p.position.set(x, CASSETTE.window.centerY, 0);
  });

  // Tape running along the tape edge, visible through the head openings, with the
  // felt pressure pad behind it in the middle opening.
  const run = add(new Mesh(new BoxGeometry(2 * 3.9, 0.012, tape.width), materials.tape), 'tapeRun');
  run.position.set(0, -hh + 0.14, 0);
  const pad = add(new Mesh(new BoxGeometry(0.45, 0.14, 0.34), materials.label), 'pressurePad');
  pad.position.set(0, -hh + 0.24, 0);

  // --- Screws: heads recessed on side B, tips deep in the holes on side A ---------------
  const { screw } = CASSETTE;
  const screwLength = 2 * coreHalf - 0.3;
  const screwGeometry = new CylinderGeometry(screw.headRadius + 0.03, screw.headRadius + 0.03, screwLength, 16);
  screwGeometry.rotateX(Math.PI / 2);
  for (const [i, [x, y]] of screw.positions.entries()) {
    const s = add(new Mesh(i === 0 ? screwGeometry : screwGeometry.clone(), materials.screw), 'screw');
    s.position.set(x, y, -bodyHalf + 0.08 + screwLength / 2);
  }

  // --- Write-protect tabs, intact, at the back of their pockets ----------------------
  const wp = CASSETTE.writeProtect;
  for (const sign of [-1, 1]) {
    const tab = add(new Mesh(new BoxGeometry(wp.width, wp.depth, 0.3), materials.shell), 'writeProtectTab');
    tab.position.set(sign * (hw - wp.inset), hh - wp.depth / 2, -coreHalf + 0.15);
  }

  return { root, labelA, labelB };
}

function hubXs(): [number, number] {
  return [-CASSETTE.hub.spacing / 2, CASSETTE.hub.spacing / 2];
}

/** Outline of the core: rounded rectangle with the head openings and write-protect pockets notched in. */
function coreOutline(): Shape {
  const r = CASSETTE.cornerRadius;
  const d = CASSETTE.headOpeningDepth;
  const s = new Shape();
  s.moveTo(-hw + r, -hh);
  // Tape edge, left to right, with the openings.
  for (const o of [...CASSETTE.headOpenings].sort((a, b) => a.x - b.x)) {
    const depth = o.width < 0.7 ? d * 0.6 : d;
    s.lineTo(o.x - o.width / 2, -hh);
    s.lineTo(o.x - o.width / 2, -hh + depth);
    s.lineTo(o.x + o.width / 2, -hh + depth);
    s.lineTo(o.x + o.width / 2, -hh);
  }
  s.lineTo(hw - r, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -hh + r);
  s.lineTo(hw, hh - r);
  s.quadraticCurveTo(hw, hh, hw - r, hh);
  // Top edge, right to left, with the write-protect pockets.
  const wp = CASSETTE.writeProtect;
  for (const cx of [hw - wp.inset, -hw + wp.inset]) {
    s.lineTo(cx + wp.width / 2, hh);
    s.lineTo(cx + wp.width / 2, hh - wp.depth);
    s.lineTo(cx - wp.width / 2, hh - wp.depth);
    s.lineTo(cx - wp.width / 2, hh);
  }
  s.lineTo(-hw + r, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - r);
  s.lineTo(-hw, -hh + r);
  s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return s;
}

function trapezoidShape(): Shape {
  const { topWidth, bottomWidth, height } = CASSETTE.trapezoid;
  const s = new Shape();
  s.moveTo(-bottomWidth / 2, -hh);
  s.lineTo(bottomWidth / 2, -hh);
  s.lineTo(topWidth / 2, -hh + height);
  s.lineTo(-topWidth / 2, -hh + height);
  s.closePath();
  for (const [x, y] of CASSETTE.screw.positions) {
    if (y < -hh + height && Math.abs(x) < topWidth / 2) s.holes.push(circlePath(x, y, CASSETTE.screw.radius));
  }
  return s;
}

function windowShape(): Shape {
  const w = CASSETTE.window;
  return roundedRect(-w.width / 2, w.centerY - w.height / 2, w.width, w.height, w.cornerRadius);
}

function windowPath(): Path {
  return windowShape();
}

function screwHoles(): Path[] {
  return CASSETTE.screw.positions.map(([x, y]) => circlePath(x, y, CASSETTE.screw.radius));
}

/** The hub's spindle hole: a circle with teeth pointing inwards. */
function toothedHole(): Path {
  const { innerRadius, teeth, toothDepth } = CASSETTE.hub;
  const p = new Path();
  const steps = teeth * 8;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const phase = (i % 8) / 8;
    const r = phase >= 0.25 && phase <= 0.5 ? innerRadius - toothDepth : innerRadius;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  return p;
}

function roundedRect(x: number, y: number, w: number, h: number, r: number): Shape {
  const radius = Math.min(r, w / 2, h / 2);
  const s = new Shape();
  s.moveTo(x + radius, y);
  s.lineTo(x + w - radius, y);
  s.absarc(x + w - radius, y + radius, radius, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - radius);
  s.absarc(x + w - radius, y + h - radius, radius, 0, Math.PI / 2, false);
  s.lineTo(x + radius, y + h);
  s.absarc(x + radius, y + h - radius, radius, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + radius);
  s.absarc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5, false);
  return s;
}

function circleShape(x: number, y: number, r: number): Shape {
  const s = new Shape();
  s.absarc(x, y, r, 0, Math.PI * 2, false);
  return s;
}

function circlePath(x: number, y: number, r: number): Path {
  const p = new Path();
  p.absarc(x, y, r, 0, Math.PI * 2, true);
  return p;
}

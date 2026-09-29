import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  LatheGeometry,
  LinearMipmapLinearFilter,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  RepeatWrapping,
  ShapeGeometry,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
  type Material,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SHELF } from '../dimensions';
import { createWoodTexture } from '../textures/woodTexture';
import { SHELF_HEIGHT, type ShelfLayout } from './layout';

/**
 * The room the bookcase stands in, so the shelf isn't floating in the dark: a
 * papered wall and a floor, pastel fairy lights draped along the top, a pothos
 * trailing over the top right corner, a big leafy plant on the floor to the
 * left and a side table with a glowing lamp on the right. All procedural, no
 * downloads.
 *
 * It steps back with the shelf while a tape is off it (setDim), and the fairy
 * lights twinkle a little (update).
 */

export interface Room {
  root: Group;
  /** 1 = normal; lower dims the room with the shelf (a tape is on the turntable). */
  setDim: (amount: number) => void;
  update: (dt: number) => void;
  /**
   * Give the wall the scene's environment map at a low intensity (as the shelf's
   * plastic): at full strength the studio HDRI washes it out.
   */
  setEnvironment: (texture: Texture | null) => void;
  dispose: () => void;
}

/** Back of the bookcase; the wall stands just behind it. */
const BACK_Z = SHELF.frontZ - SHELF.depth - SHELF.back;
const WALL_Z = BACK_Z - 0.3;
const BULB_COLOURS = ['#ffd27a', '#ff9fb2', '#9fe3c8', '#9cc8ff', '#ffb36b', '#e7b0ff'];
/** Fairy lights per cm of bookcase. */
const BULBS_PER_CM = 0.3;
const LAMP_INTENSITY = 1300;
const STRING_INTENSITY = 300;
/** Environment light on the wall. */
const ROOM_ENV = 0.12;

export function createRoom(layout: ShelfLayout, renderer: WebGLRenderer): Room {
  const root = new Group();
  root.name = 'room';
  const { minX, maxX } = layout.bounds;
  const width = maxX - minX;
  const midX = (minX + maxX) / 2;
  const textures: Texture[] = [];
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  /** Materials whose colour follows setDim, with their full colour. */
  const dimmable: { material: MeshStandardMaterial | MeshLambertMaterial; base: Color }[] = [];
  const own = <T extends Material>(m: T, dim = true): T => {
    materials.push(m);
    if (dim && 'color' in m) dimmable.push({ material: m as unknown as MeshStandardMaterial, base: (m as unknown as MeshStandardMaterial).color.clone() });
    return m;
  };
  const geo = <T extends BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  // --- Wall and floor ------------------------------------------------------------------
  const span = width + 400;
  const wallTexture = createWallpaper(renderer);
  wallTexture.repeat.set(span / 60, 300 / 60);
  textures.push(wallTexture);
  const wall = new Mesh(
    geo(new PlaneGeometry(span, 300)),
    own(new MeshStandardMaterial({ name: 'roomWall', map: wallTexture, roughness: 0.95, metalness: 0, envMapIntensity: ROOM_ENV })),
  );
  wall.position.set(midX, 300 / 2 - 60, WALL_Z);
  wall.receiveShadow = true;
  root.add(wall);

  const floorTexture = createWoodTexture(renderer, 29);
  floorTexture.repeat.set(span / 90, 160 / 90);
  textures.push(floorTexture);
  // Matte (no specular): dimming a colour doesn't dim reflections, and with a tape on the
  // turntable the floor under it must go dark with the rest of the room.
  const floor = new Mesh(
    geo(new PlaneGeometry(span, 160)),
    own(new MeshLambertMaterial({ name: 'roomFloor', map: floorTexture, color: '#b08462' })),
  );
  floor.rotation.x = -Math.PI / 2;
  // A hair under the shadow catcher at y = 0, so the tapes' shadows still land.
  floor.position.set(midX, -0.05, WALL_Z + 80);
  floor.receiveShadow = true;
  root.add(floor);

  // A skirting board where they meet.
  const skirting = new Mesh(geo(new CylinderGeometry(0.6, 0.6, span, 6)), own(new MeshStandardMaterial({ color: '#efe6d6', roughness: 0.6 })));
  skirting.rotation.z = Math.PI / 2;
  skirting.position.set(midX, 3, WALL_Z + 0.4);
  skirting.scale.set(1, 1, 0.5);
  root.add(skirting);

  // --- Fairy lights along the top --------------------------------------------------------
  const topY = SHELF_HEIGHT + 0.4;
  const frontZ = SHELF.frontZ + 0.6;
  const hooks: Vector3[] = [];
  const loops = Math.max(2, Math.round(width / 26));
  for (let i = 0; i <= loops; i++) hooks.push(new Vector3(minX + 1 + ((width - 2) * i) / loops, topY, frontZ));
  const wirePoints: Vector3[] = [];
  for (let i = 0; i < loops; i++) {
    const a = hooks[i]!;
    const b = hooks[i + 1]!;
    // Shallow, so the bulbs hang above the top row's cases, not over their spines.
    const sag = 1.8 + (i % 2) * 0.5;
    for (let s = 0; s < 12; s++) {
      const t = s / 12;
      wirePoints.push(new Vector3(a.x + (b.x - a.x) * t, topY - sag * 4 * t * (1 - t), frontZ + Math.sin(t * Math.PI) * 0.8));
    }
  }
  wirePoints.push(hooks[hooks.length - 1]!.clone());
  // Hanging over the ends, down the sides a little.
  wirePoints.unshift(new Vector3(minX - 0.6, topY - 9, frontZ - 1));
  wirePoints.push(new Vector3(maxX + 0.6, topY - 12, frontZ - 1));
  const wireCurve = new CatmullRomCurve3(wirePoints, false, 'catmullrom', 0.3);
  const wire = new Mesh(
    geo(new TubeGeometry(wireCurve, wirePoints.length * 6, 0.07, 4, false)),
    own(new MeshStandardMaterial({ color: '#3a4a33', roughness: 0.7 })),
  );
  root.add(wire);

  const bulbCount = Math.max(12, Math.round((width + 20) * BULBS_PER_CM));
  const bulbGeometry = geo(new SphereGeometry(0.42, 10, 8));
  bulbGeometry.scale(1, 1.35, 1);
  const bulbMaterial = own(new MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), false);
  const bulbs = new InstancedMesh(bulbGeometry, bulbMaterial, bulbCount);
  bulbs.name = 'fairyLights';
  const glowPositions = new Float32Array(bulbCount * 3);
  const glowColours = new Float32Array(bulbCount * 3);
  const bulbBase: Color[] = [];
  const phases: number[] = [];
  const m = new Matrix4();
  const p = new Vector3();
  for (let i = 0; i < bulbCount; i++) {
    wireCurve.getPointAt((i + 0.5) / bulbCount, p);
    p.y -= 0.45;
    m.makeTranslation(p.x, p.y, p.z);
    bulbs.setMatrixAt(i, m);
    const c = new Color(BULB_COLOURS[i % BULB_COLOURS.length]!);
    bulbBase.push(c);
    bulbs.setColorAt(i, c);
    glowPositions.set([p.x, p.y, p.z + 0.2], i * 3);
    glowColours.set([c.r, c.g, c.b], i * 3);
    phases.push(i * 2.39);
  }
  root.add(bulbs);
  const glowTexture = createGlowTexture();
  textures.push(glowTexture);
  const glowGeometry = geo(new BufferGeometry());
  glowGeometry.setAttribute('position', new BufferAttribute(glowPositions, 3));
  glowGeometry.setAttribute('color', new BufferAttribute(glowColours, 3));
  const glowMaterial = own(new PointsMaterial({
    size: 4.2,
    map: glowTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: AdditiveBlending,
    sizeAttenuation: true,
  }), false);
  const glow = new Points(glowGeometry, glowMaterial);
  glow.name = 'fairyGlow';
  glow.renderOrder = 2;
  root.add(glow);
  // Their light on the top of the bookcase and the wall above it: a couple of soft lamps stand in for the string.
  const stringLights: PointLight[] = [];
  const stringCount = Math.max(1, Math.round(width / 50));
  for (let i = 0; i < stringCount; i++) {
    const light = new PointLight('#ffd9a8', STRING_INTENSITY, 90, 2);
    light.position.set(minX + (width * (i + 0.5)) / stringCount, topY + 4, frontZ + 22);
    stringLights.push(light);
    root.add(light);
  }

  // --- Pothos trailing over the top right corner -------------------------------------
  const potMaterial = own(new MeshStandardMaterial({ name: 'terracotta', color: '#c8643f', roughness: 0.85 }));
  const soilMaterial = own(new MeshStandardMaterial({ color: '#3b2a1e', roughness: 1 }));
  const leafMaterial = own(new MeshStandardMaterial({ name: 'leaf', color: '#ffffff', roughness: 0.55, side: DoubleSide }));
  const stemMaterial = own(new MeshStandardMaterial({ color: '#4d7a3a', roughness: 0.7 }));

  const hangPot = pot(6.5, 5.8, potMaterial, soilMaterial, geo);
  // In the top right corner, trailing down the outside of the side panel, clear of the tapes.
  const hangX = maxX - 5;
  const hangZ = SHELF.frontZ - SHELF.depth / 2 + 1;
  hangPot.position.set(hangX, SHELF_HEIGHT, hangZ);
  root.add(hangPot);

  const leafShape = heartLeaf();
  const leafGeometry = geo(new ShapeGeometry(leafShape, 6));
  bendLeaf(leafGeometry, 0.25);
  const leaves: { matrix: Matrix4; color: Color }[] = [];
  const stems: BufferGeometry[] = [];
  const rand = seeded(7);
  const vines = [
    { dx: 6.5, drop: 34, out: 4, sway: 2 },
    { dx: 8, drop: 48, out: 3, sway: 3 },
    { dx: 5.5, drop: 20, out: 5, sway: -1.5 },
    { dx: 10, drop: 26, out: 2, sway: 2.5 },
  ];
  for (const v of vines) {
    const start = new Vector3(hangX + v.dx * 0.4, SHELF_HEIGHT + 5.5, hangZ + 1.5);
    const edge = new Vector3(hangX + v.dx, SHELF_HEIGHT + 1.2, SHELF.frontZ + 1.2);
    const pts = [start, new Vector3(hangX + v.dx * 0.8, SHELF_HEIGHT + 4, hangZ + 4), edge];
    for (let k = 1; k <= 4; k++) {
      const t = k / 4;
      pts.push(new Vector3(hangX + v.dx + Math.sin(t * 2.4) * v.sway, SHELF_HEIGHT - v.drop * t, SHELF.frontZ + 1.2 + v.out * Math.sin(t * 1.6) * 0.5));
    }
    const curve = new CatmullRomCurve3(pts);
    stems.push(new TubeGeometry(curve, 40, 0.12, 4, false));
    const count = Math.round(curve.getLength() / 3.2);
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 0.5);
      const at = curve.getPointAt(t);
      const size = 2 + rand() * 1.2 - t * 0.5;
      leaves.push({ matrix: leafMatrix(at, rand, size, i % 2 ? 1 : -1, 'hang'), color: leafColour(rand) });
    }
  }
  // A crown of leaves in the pot.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const at = new Vector3(hangX + Math.cos(a) * 2.6, SHELF_HEIGHT + 6 + rand() * 2.5, hangZ + Math.sin(a) * 2.6);
    leaves.push({ matrix: leafMatrix(at, rand, 2.4 + rand() * 1, Math.cos(a) > 0 ? 1 : -1, 'crown', a), color: leafColour(rand) });
  }

  // --- A big leafy plant on the floor, left -----------------------------------------------
  const bandMaterial = own(new MeshStandardMaterial({ color: '#e9dcc6', roughness: 0.8 }));
  const floorPot = pot(24, 11, potMaterial, soilMaterial, geo, bandMaterial);
  const plantX = minX - 26;
  const plantZ = SHELF.frontZ - 3;
  floorPot.position.set(plantX, 0, plantZ);
  root.add(floorPot);
  const bigLeafGeometry = geo(new ShapeGeometry(bigLeaf(), 8));
  bendLeaf(bigLeafGeometry, 0.18);
  const bigLeaves: { matrix: Matrix4; color: Color }[] = [];
  const up = new Vector3(0, 0, 1);
  for (let i = 0; i < 9; i++) {
    // Stems fan out of the pot, mostly up and towards the bookcase (into view).
    // Mostly up and away from the bookcase, so it frames the shelf without covering tapes.
    const a = -1.1 + (i / 8) * 1.5 + (rand() - 0.5) * 0.25;
    const len = 22 + rand() * 22;
    const base = new Vector3(plantX + (rand() - 0.5) * 3, 21, plantZ + (rand() - 0.5) * 3);
    const tip = new Vector3(base.x + Math.sin(a) * len * 0.75, base.y + Math.cos(a * 0.8) * len, base.z + (rand() - 0.2) * 8);
    const mid = base.clone().lerp(tip, 0.5).add(new Vector3(-Math.sin(a) * 3, 3, 0));
    const curve = new CatmullRomCurve3([base, mid, tip]);
    stems.push(new TubeGeometry(curve, 12, 0.3, 5, false));
    // A leaf at the tip and one or two along the stem, each facing the room.
    const at = [1, 0.62, ...(len > 34 ? [0.35] : [])];
    at.forEach((t, k) => {
      const point = curve.getPointAt(t);
      const dir = curve.getTangentAt(t);
      if (k > 0) dir.applyAxisAngle(up, (k % 2 ? 1 : -1) * (0.7 + rand() * 0.3));
      const size = (k === 0 ? 13 : 10) + rand() * 3;
      bigLeaves.push({ matrix: facingLeaf(point, dir, size, rand), color: leafColour(rand, true) });
    });
  }

  // --- A side table with a lamp, right ----------------------------------------------------
  // Low enough that its glowing shade stays in the frame beside the bookcase.
  const lampX = maxX + 28;
  const lampZ = SHELF.frontZ - 4;
  const tableMaterial = own(new MeshStandardMaterial({ color: '#e7d7bd', roughness: 0.6 }));
  const brass = own(new MeshStandardMaterial({ color: '#b08a4a', roughness: 0.35, metalness: 0.8 }));
  const lamp = new Group();
  lamp.position.set(lampX, 0, lampZ);
  const TABLE = 32;
  const top = new Mesh(geo(new CylinderGeometry(14, 14, 2, 32)), tableMaterial);
  top.position.y = TABLE;
  lamp.add(top);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.4;
    const leg = new Mesh(geo(new CylinderGeometry(0.9, 0.7, TABLE, 8)), tableMaterial);
    leg.position.set(Math.cos(a) * 9, TABLE / 2, Math.sin(a) * 9);
    leg.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
    lamp.add(leg);
  }
  const lampBase = new Mesh(geo(new SphereGeometry(5.5, 24, 16)), own(new MeshStandardMaterial({ color: '#5fae9a', roughness: 0.35 })));
  lampBase.scale.set(1, 1.15, 1);
  lampBase.position.y = TABLE + 1 + 5.5;
  const neck = new Mesh(geo(new CylinderGeometry(0.5, 0.5, 8, 8)), brass);
  neck.position.y = TABLE + 16;
  const shadeMaterial = own(new MeshStandardMaterial({
    color: '#ffdca8',
    emissive: new Color('#ffb45e'),
    emissiveIntensity: 1.3,
    roughness: 0.9,
    side: DoubleSide,
  }), false);
  const shade = new Mesh(geo(new CylinderGeometry(7, 11, 12, 32, 1, true)), shadeMaterial);
  shade.position.y = TABLE + 23;
  const bulb = new Mesh(geo(new SphereGeometry(1.8, 12, 10)), own(new MeshBasicMaterial({ color: '#fff1d0', toneMapped: false }), false));
  bulb.position.y = TABLE + 20;
  lamp.add(lampBase, neck, shade, bulb);
  for (const o of [top, lampBase]) o.castShadow = o.receiveShadow = true;
  // A small plant on the table too.
  const tablePot = pot(7, 3.6, potMaterial, soilMaterial, geo);
  tablePot.position.set(-8, TABLE + 1, 5);
  lamp.add(tablePot);
  root.add(lamp);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const at = new Vector3(lampX - 8 + Math.cos(a) * 1.8, TABLE + 8 + rand() * 2, lampZ + 5 + Math.sin(a) * 1.8);
    leaves.push({ matrix: leafMatrix(at, rand, 2.6 + rand(), Math.cos(a) > 0 ? 1 : -1, 'crown', a), color: leafColour(rand) });
  }
  const lampLight = new PointLight('#ffc98a', LAMP_INTENSITY, 220, 2);
  lampLight.position.set(lampX, TABLE + 20, lampZ + 2);
  root.add(lampLight);

  // --- Plant meshes: every stem in one mesh, the two leaf shapes instanced ----------------
  const stemGeometry = geo(mergeGeometries(stems, false)!);
  for (const s of stems) s.dispose();
  root.add(new Mesh(stemGeometry, stemMaterial));
  for (const [g, list] of [[leafGeometry, leaves], [bigLeafGeometry, bigLeaves]] as const) {
    const mesh = new InstancedMesh(g, leafMaterial, list.length);
    list.forEach((l, i) => {
      mesh.setMatrixAt(i, l.matrix);
      mesh.setColorAt(i, l.color);
    });
    mesh.castShadow = true;
    root.add(mesh);
  }

  // --- Dim and twinkle ---------------------------------------------------------------------
  let dim = 1;
  let time = 0;
  const colour = new Color();
  const glowAttr = glowGeometry.getAttribute('color') as BufferAttribute;

  return {
    root,
    setDim(amount) {
      if (amount === dim) return;
      dim = amount;
      for (const { material, base: c } of dimmable) material.color.copy(c).multiplyScalar(amount);
      shadeMaterial.emissiveIntensity = 0.35 + 0.95 * amount;
      lampLight.intensity = LAMP_INTENSITY * (0.25 + 0.75 * amount);
      for (const l of stringLights) l.intensity = STRING_INTENSITY * amount;
      glowMaterial.opacity = 0.35 + 0.45 * amount;
    },
    update(dt) {
      time += dt;
      for (let i = 0; i < bulbCount; i++) {
        const twinkle = 0.78 + 0.22 * Math.sin(time * 1.3 + phases[i]!) * Math.sin(time * 0.37 + phases[i]! * 1.7);
        const k = twinkle * (0.45 + 0.55 * dim);
        colour.copy(bulbBase[i]!).multiplyScalar(k);
        bulbs.setColorAt(i, colour);
        glowAttr.setXYZ(i, colour.r, colour.g, colour.b);
      }
      bulbs.instanceColor!.needsUpdate = true;
      glowAttr.needsUpdate = true;
    },
    setEnvironment(texture) {
      const material = wall.material as MeshStandardMaterial;
      if (material.envMap === texture) return;
      material.envMap = texture;
      material.needsUpdate = true;
    },
    dispose() {
      root.removeFromParent();
      for (const g of geometries) g.dispose();
      for (const t of textures) t.dispose();
      for (const mat of materials) mat.dispose();
      bulbs.dispose();
      root.traverse((o) => {
        if (o instanceof InstancedMesh) o.dispose();
        if (o instanceof PointLight) o.dispose();
      });
    },
  };
}

// --- Pieces --------------------------------------------------------------------------------

/** A flower pot (lathe) with soil in it, standing on y = 0, optionally with a painted band. */
function pot(
  height: number,
  radius: number,
  material: Material,
  soil: Material,
  geo: <T extends BufferGeometry>(g: T) => T,
  band?: Material,
): Group {
  const r = radius;
  const h = height;
  const profile = [
    new Vector2(0, 0),
    new Vector2(r * 0.72, 0),
    new Vector2(r * 0.8, h * 0.15),
    new Vector2(r * 0.92, h * 0.8),
    new Vector2(r * 1.02, h * 0.82),
    new Vector2(r * 1.04, h),
    new Vector2(r * 0.94, h),
    new Vector2(r * 0.9, h * 0.86),
  ];
  const group = new Group();
  const body = new Mesh(geo(new LatheGeometry(profile, 28)), material);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  const top = new Mesh(geo(new CylinderGeometry(r * 0.9, r * 0.9, 0.2, 24)), soil);
  top.position.y = h * 0.88;
  group.add(top);
  if (band) {
    const stripe = new Mesh(
      geo(new CylinderGeometry(r * 0.905, r * 0.87, h * 0.14, 28, 1, true)),
      band,
    );
    stripe.position.y = h * 0.5;
    group.add(stripe);
  }
  return group;
}

/** A pothos leaf, about 1 unit long, pointing along +Y from its stalk at the origin. */
function heartLeaf(): Shape {
  const s = new Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(-0.55, -0.05, -0.62, 0.55, 0, 1);
  s.bezierCurveTo(0.62, 0.55, 0.55, -0.05, 0, 0);
  return s;
}

/** A long, broad leaf, about 1 unit long along +Y. */
function bigLeaf(): Shape {
  const s = new Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(-0.42, 0.15, -0.38, 0.7, 0, 1);
  s.bezierCurveTo(0.38, 0.7, 0.42, 0.15, 0, 0);
  return s;
}

/** Fold a flat leaf along its midrib a little, and curve it back along its length. */
function bendLeaf(g: BufferGeometry, amount: number) {
  const pos = g.getAttribute('position') as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.abs(x) * amount * 0.8 - y * y * amount * 0.35);
  }
  g.computeVertexNormals();
}

function leafMatrix(at: Vector3, rand: () => number, size: number, side: 1 | -1, kind: 'hang' | 'crown', angle = 0): Matrix4 {
  const o = new Object3D();
  o.position.copy(at);
  if (kind === 'hang') {
    // Hanging from the vine, facing out of the shelf, tips down and to one side.
    o.rotation.set(-0.3 + (rand() - 0.5) * 0.5, 0, Math.PI + side * (0.5 + rand() * 0.6));
  } else {
    // Out of the pot, arching outwards.
    o.rotation.set(0, -angle + Math.PI / 2, 0);
    o.rotateX(-0.9 - rand() * 0.4);
  }
  o.scale.setScalar(size);
  o.updateMatrix();
  return o.matrix.clone();
}

/** A leaf at `at` pointing along `dir`, turned to face the room (+Z) as far as it can. */
function facingLeaf(at: Vector3, dir: Vector3, size: number, rand: () => number): Matrix4 {
  const y = dir.clone().normalize();
  const z = new Vector3(0, 0.25, 1).addScaledVector(y, -new Vector3(0, 0.25, 1).dot(y)).normalize();
  const x = new Vector3().crossVectors(y, z);
  const m = new Matrix4().makeBasis(x, y, z);
  const o = new Object3D();
  o.quaternion.setFromRotationMatrix(m);
  o.rotateY((rand() - 0.5) * 0.9);
  o.position.copy(at).addScaledVector(y, -size * 0.1);
  o.scale.setScalar(size);
  o.updateMatrix();
  return o.matrix.clone();
}

function leafColour(rand: () => number, dark = false): Color {
  const c = new Color().setHSL(0.26 + rand() * 0.07, 0.5 + rand() * 0.2, (dark ? 0.14 : 0.2) + rand() * 0.1);
  // Pothos: now and then a leaf with a paler, marbled look.
  if (!dark && rand() < 0.25) c.lerp(new Color('#b9cf78'), 0.3);
  return c;
}

/** Warm painted wallpaper: soft stripes with a tiny hand-stamped flower between them. Tileable. */
function createWallpaper(renderer: WebGLRenderer): CanvasTexture {
  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const rand = seeded(3);
  ctx.fillStyle = '#e9c9a4';
  ctx.fillRect(0, 0, S, S);
  // Stripes.
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = 'rgba(214, 150, 112, 0.35)';
    ctx.fillRect(i * (S / 4) + S / 16, 0, S / 32, S);
  }
  // Little flowers between them.
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const x = i * (S / 4) + S / 5.5;
      const y = j * (S / 4) + (i % 2 ? S / 8 : 0) + S / 16;
      ctx.fillStyle = 'rgba(245, 232, 210, 0.9)';
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(214, 120, 80, 0.8)';
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Paper grain.
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = rand() < 0.5 ? 'rgba(120, 70, 40, 0.05)' : 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(rand() * S, rand() * S, 1.5, 1.5);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.minFilter = LinearMipmapLinearFilter;
  return texture;
}

/** A soft round glow for the fairy lights. */
function createGlowTexture(): CanvasTexture {
  const S = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function seeded(seed: number): () => number {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

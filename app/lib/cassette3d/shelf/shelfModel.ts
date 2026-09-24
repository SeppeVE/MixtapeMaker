import {
  BoxGeometry,
  BufferAttribute,
  Color,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Raycaster,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CASE, SHELF } from '../dimensions';
import { createShelfPlasticMaterial } from '../materials';
import { createWoodTexture, WOOD_TILE_CM } from '../textures/woodTexture';
import { bayLeft, computeShelfLayout, SHELF_HEIGHT, type ShelfLayout } from './layout';
import { createSpineAtlas, type SpineAtlas, type SpineFace } from './spineAtlas';

/**
 * The shelf: a wooden bookcase and every tape on it as instances, so the whole
 * library draws in a handful of calls however many tapes there are:
 *
 *   wood         one merged mesh (sides, boards, plinth, back panel)
 *   contents     one InstancedMesh: a block standing in for the J-card and
 *                cassette inside each case. Its spine face shows the tape's
 *                cell of the spine atlas through a per-instance UV rect
 *                (onBeforeCompile); the other faces take the card's colour.
 *   plastic      one InstancedMesh of the clear case, same instance matrices, in a
 *                cheaper plastic than the hero's (no transmission pass).
 *
 * Instance i is tape i of the list the shelf was built with. Which slot it
 * stands in follows the current order (search / sort), and hidden tapes (filtered
 * out, or taken off the shelf) are scaled to zero. Instances ease to their slot,
 * and a hovered case slides out a little.
 */

export interface ShelfTape {
  /** Card colour, for the faces of the case that aren't the spine. */
  color: string;
}

export interface Shelf {
  root: Group;
  layout: ShelfLayout;
  atlas: SpineAtlas;
  /** Put these tapes (indices) on the shelf in this order; everything else is hidden. */
  setOrder: (order: number[], animate?: boolean) => void;
  /** The tape currently off the shelf (its instance hidden), or null. */
  setTaken: (index: number | null) => void;
  setHovered: (index: number | null) => void;
  /** World matrix of a tape's slot (case frame, spine towards +Z), or null if it isn't on the shelf. */
  slotMatrix: (index: number, out: Matrix4) => Matrix4 | null;
  /** Slot centre of a tape, or null. */
  slotPosition: (index: number) => Vector3 | null;
  /** Darken the shelf (1 = normal): it steps back while a tape is off it. */
  setDim: (amount: number) => void;
  /** The tape under the ray, or null. Only tapes standing on the shelf count. */
  pick: (raycaster: Raycaster) => number | null;
  update: (dt: number) => void;
  /**
   * Give the plastic the scene's environment map as its own: a material's
   * envMapIntensity is ignored for scene.environment (three uses the scene's
   * environmentIntensity then), and the shelf's plastic needs a dimmer one.
   */
  setEnvironment: (texture: Texture | null) => void;
  dispose: () => void;
}

/** Spine out: the case frame's −X (the hinge edge) faces the viewer. */
const SPINE_OUT = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
/** Exponential easing rates (1/s) for moving between slots and sliding out on hover. */
const MOVE_RATE = 9;
const HOVER_RATE = 14;

export function createShelf(tapes: ShelfTape[], renderer: WebGLRenderer): Shelf {
  const count = tapes.length;
  const layout = computeShelfLayout(count);
  const root = new Group();
  root.name = 'shelf';

  // --- Wood ------------------------------------------------------------------------
  const woodMap = createWoodTexture(renderer);
  const wood = new Mesh(buildWoodGeometry(layout), new MeshStandardMaterial({
    name: 'shelfWood',
    map: woodMap,
    vertexColors: true,
    roughness: 0.62,
    metalness: 0,
  }));
  wood.name = 'shelfWood';
  wood.castShadow = true;
  wood.receiveShadow = true;
  root.add(wood);

  // --- Contents block + spine atlas ------------------------------------------------
  const inner = {
    x0: -CASE.width / 2 + CASE.wall,
    x1: CASE.width / 2 - CASE.wall,
    y: CASE.length / 2 - CASE.tabThickness - CASE.wall,
    z0: -CASE.depth / 2 + CASE.wall,
    z1: CASE.depth / 2 - CASE.lidThickness,
  };
  const face: SpineFace = { zMin: inner.z0, zMax: inner.z1, yMin: -inner.y, yMax: inner.y };
  const atlas = createSpineAtlas(Math.max(count, 1), face, renderer);

  const contentsGeometry = new BoxGeometry(inner.x1 - inner.x0, inner.y * 2, inner.z1 - inner.z0);
  contentsGeometry.translate((inner.x0 + inner.x1) / 2, 0, (inner.z0 + inner.z1) / 2);
  // Face order: +X (open edge, deep in the shelf), −X (spine), +Y, −Y (ends), +Z (lid: cover), −Z (tray).
  const FACE_SHADE = [0.28, 1, 0.42, 0.42, 1, 0.78];
  const shade = new Float32Array(24 * 3);
  const mask = new Float32Array(24);
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      shade.set([FACE_SHADE[f]!, FACE_SHADE[f]!, FACE_SHADE[f]!], (f * 4 + v) * 3);
      mask[f * 4 + v] = f === 1 ? 1 : 0;
    }
  }
  contentsGeometry.setAttribute('color', new BufferAttribute(shade, 3));
  contentsGeometry.setAttribute('aSpineMask', new BufferAttribute(mask, 1));
  const rects = new Float32Array(Math.max(count, 1) * 4);
  for (let i = 0; i < count; i++) rects.set(atlas.cellRect(i), i * 4);
  contentsGeometry.setAttribute('aSpineRect', new InstancedBufferAttribute(rects, 4));
  // How far each case is slid out (0–1 of the hover distance): the hovered one also glows a little.
  const hoverAttr = new InstancedBufferAttribute(new Float32Array(Math.max(count, 1)), 1);
  contentsGeometry.setAttribute('aHover', hoverAttr);

  const contentsMaterial = new MeshStandardMaterial({
    name: 'shelfContents',
    map: atlas.texture,
    vertexColors: true,
    roughness: 0.78,
    metalness: 0,
  });
  contentsMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aSpineRect;\nattribute float aSpineMask;\nattribute float aHover;\nvarying float vSpineMask;\nvarying float vHover;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = vMapUv * aSpineRect.zw + aSpineRect.xy;\nvSpineMask = aSpineMask;\nvHover = aHover;')
      // The spine shows the atlas as drawn; the other faces take the instance (card) colour.
      .replace('#include <color_vertex>', '#include <color_vertex>\nvColor = mix(vColor, vec4(1.0), aSpineMask);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vSpineMask;\nvarying float vHover;')
      .replace('#include <map_fragment>', 'diffuseColor *= mix(vec4(1.0), texture2D(map, vMapUv), vSpineMask);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.95, 0.85) * (0.32 * vHover) * diffuseColor.rgb;');
  };
  contentsMaterial.customProgramCacheKey = () => 'shelfContents';

  const n = Math.max(count, 1);
  const contents = new InstancedMesh(contentsGeometry, contentsMaterial, n);
  contents.name = 'shelfContents';
  contents.castShadow = true;
  contents.receiveShadow = true;
  const color = new Color();
  for (let i = 0; i < count; i++) contents.setColorAt(i, color.set(tapes[i]!.color));
  root.add(contents);

  // --- Plastic ------------------------------------------------------------------------
  const plasticGeometry = new RoundedBoxGeometry(CASE.width, CASE.length, CASE.depth, 2, CASE.cornerRadius);
  const plastic = new InstancedMesh(plasticGeometry, createShelfPlasticMaterial(), n);
  plastic.name = 'shelfPlastic';
  // Same instances, same matrices: share the attribute so it uploads once.
  plastic.instanceMatrix = contents.instanceMatrix;
  root.add(plastic);

  if (count === 0) contents.count = plastic.count = 0;

  // --- Per-instance state -------------------------------------------------------------
  const cur = Array.from({ length: count }, () => new Vector3());
  const target = Array.from({ length: count }, () => new Vector3());
  const hoverCur = new Float32Array(count);
  const slotOf = new Int32Array(count).fill(-1);
  let taken: number | null = null;
  let hovered: number | null = null;
  const moving = new Set<number>();
  const m = new Matrix4();
  const one = new Vector3(1, 1, 1);
  const zero = new Vector3(0, 0, 0);
  const p = new Vector3();

  const shown = (i: number) => slotOf[i]! >= 0 && i !== taken;

  function writeMatrix(i: number) {
    p.copy(cur[i]!);
    p.z += hoverCur[i]!;
    m.compose(p, SPINE_OUT, shown(i) ? one : zero);
    contents.setMatrixAt(i, m);
  }

  function setOrder(order: number[], animate = true) {
    slotOf.fill(-1);
    order.forEach((index, slot) => {
      if (index < 0 || index >= count || slot >= layout.slots.length) return;
      slotOf[index] = slot;
      const s = layout.slots[slot]!;
      target[index]!.set(s.x, s.y, s.z);
    });
    for (let i = 0; i < count; i++) {
      // Newly shown tapes appear in place rather than flying in from wherever they were.
      if (!animate || slotOf[i]! < 0 || cur[i]!.lengthSq() === 0) cur[i]!.copy(target[i]!);
      else moving.add(i);
      writeMatrix(i);
    }
    contents.instanceMatrix.needsUpdate = true;
    contents.computeBoundingSphere();
    plastic.boundingSphere = contents.boundingSphere;
  }
  setOrder(Array.from({ length: count }, (_, i) => i), false);

  return {
    root,
    layout,
    atlas,
    setOrder,
    setTaken(index) {
      const before = taken;
      taken = index;
      for (const i of [before, index]) if (i !== null && i < count) writeMatrix(i);
      contents.instanceMatrix.needsUpdate = true;
    },
    setHovered(index) {
      if (hovered !== null) moving.add(hovered);
      hovered = index;
      if (index !== null) moving.add(index);
    },
    slotMatrix(index, out) {
      if (index < 0 || index >= count || slotOf[index]! < 0) return null;
      return out.compose(target[index]!, SPINE_OUT, one);
    },
    slotPosition(index) {
      if (index < 0 || index >= count || slotOf[index]! < 0) return null;
      return target[index]!.clone();
    },
    pick(raycaster) {
      if (!count) return null;
      for (const hit of raycaster.intersectObject(contents, false)) {
        const i = hit.instanceId;
        if (i !== undefined && i < count && shown(i)) return i;
      }
      return null;
    },
    update(dt) {
      if (!moving.size) return;
      const kMove = 1 - Math.exp(-MOVE_RATE * dt);
      const kHover = 1 - Math.exp(-HOVER_RATE * dt);
      for (const i of moving) {
        const c = cur[i]!;
        c.lerp(target[i]!, kMove);
        const wanted = i === hovered ? SHELF.hoverPull : 0;
        hoverCur[i] = hoverCur[i]! + (wanted - hoverCur[i]!) * kHover;
        if (c.distanceToSquared(target[i]!) < 1e-6 && Math.abs(wanted - hoverCur[i]!) < 1e-4) {
          c.copy(target[i]!);
          hoverCur[i] = wanted;
          moving.delete(i);
        }
        writeMatrix(i);
        hoverAttr.setX(i, hoverCur[i]! / SHELF.hoverPull);
      }
      contents.instanceMatrix.needsUpdate = true;
      hoverAttr.needsUpdate = true;
    },
    setDim(amount) {
      contentsMaterial.color.setScalar(amount);
      (wood.material as MeshStandardMaterial).color.setScalar(amount);
    },
    setEnvironment(texture) {
      const material = plastic.material as MeshPhysicalMaterial;
      if (material.envMap === texture) return;
      material.envMap = texture;
      material.needsUpdate = true;
    },
    dispose() {
      root.removeFromParent();
      wood.geometry.dispose();
      (wood.material as MeshStandardMaterial).dispose();
      woodMap.dispose();
      contentsGeometry.dispose();
      contentsMaterial.dispose();
      plasticGeometry.dispose();
      plastic.material.dispose();
      contents.dispose();
      plastic.dispose();
      atlas.dispose();
    },
  };
}

// --- Wood geometry --------------------------------------------------------------------

/**
 * A box with world-scaled UVs (WOOD_TILE_CM per texture tile) and a flat vertex
 * colour. The grain runs along the box's longest side.
 */
function woodBox(w: number, h: number, d: number, x: number, y: number, z: number, shade = 1): BufferGeometry {
  const g = new BoxGeometry(w, h, d);
  g.translate(x, y, z);
  const size: Record<'x' | 'y' | 'z', number> = { x: w, y: h, z: d };
  // BoxGeometry faces: ±X (u along z, v along y), ±Y (u along x, v along z), ±Z (u along x, v along y).
  const axes: [keyof typeof size, keyof typeof size][] = [['z', 'y'], ['z', 'y'], ['x', 'z'], ['x', 'z'], ['x', 'y'], ['x', 'y']];
  const grainAxis = (Object.keys(size) as (keyof typeof size)[]).reduce((a, b) => (size[b] > size[a] ? b : a));
  const uv = g.getAttribute('uv') as BufferAttribute;
  // A different offset per box, so neighbouring boards don't show the same grain.
  const offset = ((x * 0.37 + y * 0.61 + z * 0.13) % 1 + 1) % 1;
  for (let f = 0; f < 6; f++) {
    const [ua, va] = axes[f]!;
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      let u = (uv.getX(i) * size[ua]) / WOOD_TILE_CM;
      let t = (uv.getY(i) * size[va]) / WOOD_TILE_CM;
      // Grain runs along the texture's u: swap when the face's long side is its v.
      if (va === grainAxis) [u, t] = [t, u];
      uv.setXY(i, u + offset, t + offset * 0.5);
    }
  }
  const colors = new Float32Array(g.getAttribute('position').count * 3).fill(shade);
  g.setAttribute('color', new BufferAttribute(colors, 3));
  return g;
}

function buildWoodGeometry(layout: ShelfLayout): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const { bays } = layout;
  const cz = SHELF.frontZ - SHELF.depth / 2;
  const innerWidth = bays * SHELF.bayWidth + (bays - 1) * SHELF.side;
  const left = bayLeft(0);
  const midX = left + innerWidth / 2;
  // Sides (and the dividers between bays).
  for (let b = 0; b <= bays; b++) {
    parts.push(woodBox(SHELF.side, SHELF_HEIGHT, SHELF.depth, bayLeft(b) - SHELF.side / 2, SHELF_HEIGHT / 2, cz));
  }
  // Boards the rows stand on, and the top.
  for (let b = 0; b < bays; b++) {
    const x = bayLeft(b) + SHELF.bayWidth / 2;
    for (const floor of layout.rowFloors) parts.push(woodBox(SHELF.bayWidth, SHELF.board, SHELF.depth, x, floor - SHELF.board / 2, cz));
    parts.push(woodBox(SHELF.bayWidth, SHELF.board, SHELF.depth, x, SHELF_HEIGHT - SHELF.board / 2, cz));
  }
  // Recessed plinth and the back panel, a shade darker.
  parts.push(woodBox(innerWidth, SHELF.plinth, SHELF.board, midX, SHELF.plinth / 2, SHELF.frontZ - 1.2 - SHELF.board / 2, 0.7));
  parts.push(woodBox(innerWidth + 2 * SHELF.side, SHELF_HEIGHT, SHELF.back, midX, SHELF_HEIGHT / 2, SHELF.frontZ - SHELF.depth - SHELF.back / 2, 0.55));
  const merged = mergeGeometries(parts, false)!;
  for (const g of parts) g.dispose();
  return merged;
}

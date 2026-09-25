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
import { createCoverAtlas, type CoverAtlas } from './coverAtlas';
import { createSpineAtlas, type SpineAtlas, type SpineFace } from './spineAtlas';

/**
 * The shelf: a wooden bookcase and every tape on it as instances, so the whole
 * library draws in a handful of calls however many tapes there are:
 *
 *   wood         one merged mesh (sides, boards, plinth, back panel)
 *   contents     one InstancedMesh: a block standing in for the J-card and
 *                cassette inside each case. Its spine face shows the tape's
 *                cell of the spine atlas through a per-instance UV rect
 *                (onBeforeCompile). The last case of each row, the only one
 *                whose lid shows, wears its J-card cover there from the cover
 *                atlas; the other faces take the card's colour.
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
  covers: CoverAtlas;
  /** Give a tape's case its J-card cover, shown while it's the last on its row. */
  setCover: (index: number, cover: HTMLCanvasElement) => void;
  /** Tapes whose lid shows: the last one standing on each row. */
  rowEnds: () => number[];
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
  const woodMaterial = new MeshStandardMaterial({
    name: 'shelfWood',
    map: woodMap,
    vertexColors: true,
    roughness: 0.62,
    metalness: 0,
  });
  addWoodOcclusion(woodMaterial, layout);
  const wood = new Mesh(buildWoodGeometry(layout), woodMaterial);
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
  const rowCount = layout.bays * SHELF.rows;
  const covers = createCoverAtlas(rowCount, { xMin: inner.x0, xMax: inner.x1, yMin: -inner.y, yMax: inner.y }, renderer);

  const contentsGeometry = new BoxGeometry(inner.x1 - inner.x0, inner.y * 2, inner.z1 - inner.z0);
  contentsGeometry.translate((inner.x0 + inner.x1) / 2, 0, (inner.z0 + inner.z1) / 2);
  // Face order: +X (open edge, deep in the shelf), −X (spine), +Y, −Y (ends), +Z (lid: cover), −Z (tray).
  const FACE_SHADE = [0.28, 1, 0.42, 0.42, 1, 0.78];
  const shade = new Float32Array(24 * 3);
  const mask = new Float32Array(24);
  const coverMask = new Float32Array(24);
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      shade.set([FACE_SHADE[f]!, FACE_SHADE[f]!, FACE_SHADE[f]!], (f * 4 + v) * 3);
      mask[f * 4 + v] = f === 1 ? 1 : 0;
      coverMask[f * 4 + v] = f === 4 ? 1 : 0;
    }
  }
  contentsGeometry.setAttribute('color', new BufferAttribute(shade, 3));
  contentsGeometry.setAttribute('aSpineMask', new BufferAttribute(mask, 1));
  contentsGeometry.setAttribute('aCoverMask', new BufferAttribute(coverMask, 1));
  const rects = new Float32Array(Math.max(count, 1) * 4);
  for (let i = 0; i < count; i++) rects.set(atlas.cellRect(i), i * 4);
  contentsGeometry.setAttribute('aSpineRect', new InstancedBufferAttribute(rects, 4));
  // The cover atlas cell of a row-end case; all zero (no cover) for the rest.
  const coverAttr = new InstancedBufferAttribute(new Float32Array(Math.max(count, 1) * 4), 4);
  contentsGeometry.setAttribute('aCoverRect', coverAttr);
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
    shader.uniforms.coverMap = { value: covers.texture };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aSpineRect;\nattribute float aSpineMask;\nattribute vec4 aCoverRect;\nattribute float aCoverMask;\nattribute float aHover;\nvarying float vSpineMask;\nvarying float vCover;\nvarying vec2 vCoverUv;\nvarying float vHover;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = vMapUv * aSpineRect.zw + aSpineRect.xy;\nvSpineMask = aSpineMask;\nvCover = aCoverMask * step(1e-6, aCoverRect.z);\nvCoverUv = uv * aCoverRect.zw + aCoverRect.xy;\nvHover = aHover;')
      // The spine (and a row-end lid) shows its atlas as drawn; the other faces take the instance (card) colour.
      .replace('#include <color_vertex>', '#include <color_vertex>\nvColor = mix(vColor, vec4(1.0), max(aSpineMask, vCover));');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D coverMap;\nvarying float vSpineMask;\nvarying float vCover;\nvarying vec2 vCoverUv;\nvarying float vHover;')
      .replace('#include <map_fragment>', 'diffuseColor *= mix(vec4(1.0), texture2D(map, vMapUv), vSpineMask);\ndiffuseColor *= mix(vec4(1.0), texture2D(coverMap, vCoverUv), vCover);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.95, 0.85) * (0.32 * vHover) * diffuseColor.rgb;');
    // Faked occlusion (Stage 6): darker where the case stands on the board, a little under
    // the board above, and deeper into the shelf. Hovered cases slide out into the light.
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vCaseLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCaseLocal = position.xy;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vCaseLocal;')
      .replace('#include <aomap_fragment>', occlusionChunk(`
        float ao = mix(0.45, 1.0, smoothstep(${f(-inner.y)}, ${f(-inner.y + 1.6)}, vCaseLocal.y));
        ao *= mix(0.8, 1.0, smoothstep(${f(inner.y)}, ${f(inner.y - 1.2)}, vCaseLocal.y));
        ao *= mix(0.55, 1.0, smoothstep(${f(inner.x1)}, ${f(inner.x0)}, vCaseLocal.x));
        ao = mix(ao, 1.0, vHover * 0.6);
      `));
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

  // --- Covers on the row ends -----------------------------------------------------------
  const coverOf: (HTMLCanvasElement | undefined)[] = [];
  /** Tape standing last on each row (−1: empty row), and what each row's cell holds. */
  const rowEnd = new Int32Array(rowCount).fill(-1);
  const cellHolds: (HTMLCanvasElement | undefined)[] = [];
  const noCover = [0, 0, 0, 0];

  function refreshCovers() {
    rowEnd.fill(-1);
    for (let i = 0; i < count; i++) {
      if (!shown(i)) continue;
      const row = Math.floor(slotOf[i]! / layout.perRow);
      const end = rowEnd[row]!;
      if (row < rowCount && (end < 0 || slotOf[end]! < slotOf[i]!)) rowEnd[row] = i;
    }
    for (let i = 0; i < count; i++) coverAttr.set(noCover, i * 4);
    rowEnd.forEach((i, row) => {
      const cover = i >= 0 ? coverOf[i] : undefined;
      if (!cover) return;
      if (cellHolds[row] !== cover) {
        covers.setCover(row, cover, tapes[i]!.color);
        cellHolds[row] = cover;
      }
      coverAttr.set(covers.cellRect(row), i * 4);
    });
    coverAttr.needsUpdate = true;
  }

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
    refreshCovers();
  }
  setOrder(Array.from({ length: count }, (_, i) => i), false);

  return {
    root,
    layout,
    atlas,
    covers,
    setCover(index, cover) {
      if (index < 0 || index >= count) return;
      coverOf[index] = cover;
      if (rowEnd.includes(index)) refreshCovers();
    },
    rowEnds: () => [...rowEnd].filter((i) => i >= 0),
    setOrder,
    setTaken(index) {
      const before = taken;
      if (before === index) return;
      taken = index;
      for (const i of [before, index]) if (i !== null && i < count) writeMatrix(i);
      contents.instanceMatrix.needsUpdate = true;
      // A tape taken off the end of a row uncovers its neighbour's lid.
      refreshCovers();
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
      woodMaterial.dispose();
      woodMap.dispose();
      contentsGeometry.dispose();
      contentsMaterial.dispose();
      plasticGeometry.dispose();
      plastic.material.dispose();
      contents.dispose();
      plastic.dispose();
      atlas.dispose();
      covers.dispose();
    },
  };
}

// --- Faked ambient occlusion (Stage 6) ---------------------------------------------------

const f = (n: number) => n.toFixed(4);
/** Share of its reflections the wood keeps. */
const WOOD_SPECULAR = 0.3;

/**
 * Apply `ao` (computed by `body`) to the light: all of the environment light, and
 * part of the key light, whose shadow map is too coarse over the shelf to darken corners.
 * `specular` scales every reflection on top.
 */
function occlusionChunk(body: string, specular = 1): string {
  return `
    #include <aomap_fragment>
    {
      ${body}
      reflectedLight.indirectDiffuse *= ao;
      reflectedLight.indirectSpecular *= ao * ${f(specular)};
      reflectedLight.directDiffuse *= mix(1.0, ao, 0.5);
      reflectedLight.directSpecular *= mix(1.0, ao, 0.5) * ${f(specular)};
    }
  `;
}

/**
 * Darken the inside of every cubby towards its corners and its back, where a real
 * bookcase gets less light: no SSAO pass, just distances to the cubby's walls
 * worked out from the layout (the wood mesh is built in world cm). A term is
 * skipped on the wall it belongs to (by the surface normal), so walls darken
 * towards their edges, not all over.
 */
function addWoodOcclusion(material: MeshStandardMaterial, layout: ShelfLayout) {
  const floors = layout.rowFloors.map(f).join(', ');
  const rows = layout.rowFloors.length;
  const backZ = SHELF.frontZ - SHELF.depth;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vShelfPos;\nvarying vec3 vShelfNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvShelfPos = position;\nvShelfNormal = normal;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vShelfPos;
        varying vec3 vShelfNormal;
        const float ROW_FLOORS[${rows}] = float[${rows}](${floors});
        float shelfOcclusion(vec3 p, vec3 n) {
          // Bay boundaries run through the middle of the side panels, so a cubby's inner side
          // faces (exactly on its edges) never flicker between two bays.
          float bay = floor((p.x - ${f(bayLeft(0) - SHELF.side / 2)}) / ${f(SHELF.bayWidth + SHELF.side)});
          if (bay < 0.0 || bay > ${f(layout.bays - 1)}) return 1.0;
          float lx = p.x - (${f(bayLeft(0))} + bay * ${f(SHELF.bayWidth + SHELF.side)});
          if (lx < -0.01 || lx > ${f(SHELF.bayWidth + 0.01)}) return 1.0;
          if (p.z > ${f(SHELF.frontZ + 0.01)} || p.z < ${f(backZ - 0.01)}) return 1.0;
          float below = -1.0;
          for (int r = 0; r < ${rows}; r++) {
            float d = p.y - ROW_FLOORS[r];
            if (d >= -0.01 && d <= ${f(SHELF.rowClearance + 0.01)}) below = max(d, 0.0);
          }
          if (below < 0.0) return 1.0;
          float above = ${f(SHELF.rowClearance)} - below;
          vec3 a = abs(n);
          float dz = p.z - ${f(backZ)};
          float ao = 1.0;
          ao *= 1.0 - 0.5 * (1.0 - smoothstep(0.0, 4.0, dz)) * (1.0 - a.z);
          ao *= 1.0 - 0.4 * (1.0 - smoothstep(0.0, 3.0, below)) * (1.0 - a.y);
          ao *= 1.0 - 0.3 * (1.0 - smoothstep(0.0, 2.5, above)) * (1.0 - a.y);
          ao *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 3.0, lx)) * (1.0 - a.x);
          ao *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 3.0, ${f(SHELF.bayWidth)} - lx)) * (1.0 - a.x);
          // Less of the room reaches the back of a cubby.
          ao *= mix(0.7, 1.0, smoothstep(0.0, ${f(SHELF.depth)}, dz));
          return ao;
        }`)
      // The studio HDRI's overhead lights and the key light turned the board tops white at
      // a glancing angle; the wood (oiled, not lacquered) keeps a fraction of its reflections.
      .replace('#include <aomap_fragment>', occlusionChunk('float ao = shelfOcclusion(vShelfPos, normalize(vShelfNormal));', WOOD_SPECULAR));
  };
  material.customProgramCacheKey = () => `shelfWood-${layout.bays}-${rows}`;
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

import {
  CanvasTexture,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RepeatWrapping,
  type Texture,
  type WebGLRenderer,
} from 'three';

/**
 * Procedural surface detail (Stage 6), drawn on canvases once per page and
 * uploaded per tape:
 *
 *  - case scuffs: fine scratches and two fingerprints, as a mask the case
 *    plastic turns into roughness (see materials.ts). Only visible where the
 *    plastic catches a highlight, like on a real case.
 *  - paper grain: a tileable normal map (fibres and tooth) plus a roughness
 *    map for the J-card and the cassette labels.
 *
 * Drawn in code, like the wood: no image files, and the look is tunable here.
 */

/** Size of one paper grain tile, cm. */
export const PAPER_TILE_CM = 3;
/** The scuff mask covers a square this big (cm), centred on the case. */
export const SCUFF_TILE_CM = 12;

const PAPER_SIZE = 512;
const SCUFF_SIZE = 1024;

let paperCanvases: { normal: HTMLCanvasElement; roughness: HTMLCanvasElement } | null = null;
let scuffCanvas: HTMLCanvasElement | null = null;

export interface PaperGrain {
  normal: Texture;
  roughness: Texture;
}

/** Paper grain textures (tile PAPER_TILE_CM); the caller owns and disposes them. */
export function createPaperGrain(renderer: WebGLRenderer): PaperGrain {
  paperCanvases ??= drawPaperGrain();
  return {
    normal: dataTexture(paperCanvases.normal, renderer),
    roughness: dataTexture(paperCanvases.roughness, renderer),
  };
}

/** Scuff mask for the case plastic (white = scratched); the caller owns and disposes it. */
export function createCaseScuffs(renderer: WebGLRenderer): Texture {
  scuffCanvas ??= drawScuffs();
  return dataTexture(scuffCanvas, renderer);
}

function dataTexture(canvas: HTMLCanvasElement, renderer: WebGLRenderer): Texture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = NoColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

// --- Noise ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth value noise on a `size` grid that tiles, with `cells` lattice cells across. */
function tileableNoise(size: number, cells: number, seed: number): Float32Array {
  const rand = mulberry32(seed);
  const lattice = Float32Array.from({ length: cells * cells }, () => rand());
  const out = new Float32Array(size * size);
  const step = cells / size;
  for (let y = 0; y < size; y++) {
    const fy = y * step;
    const y0 = Math.floor(fy);
    const ty = fy - y0;
    const sy = ty * ty * (3 - 2 * ty);
    const r0 = (y0 % cells) * cells;
    const r1 = ((y0 + 1) % cells) * cells;
    for (let x = 0; x < size; x++) {
      const fx = x * step;
      const x0 = Math.floor(fx);
      const tx = fx - x0;
      const sx = tx * tx * (3 - 2 * tx);
      const c0 = x0 % cells;
      const c1 = (x0 + 1) % cells;
      const a = lattice[r0 + c0]! + (lattice[r0 + c1]! - lattice[r0 + c0]!) * sx;
      const b = lattice[r1 + c0]! + (lattice[r1 + c1]! - lattice[r1 + c0]!) * sx;
      out[y * size + x] = a + (b - a) * sy;
    }
  }
  return out;
}

// --- Paper ---------------------------------------------------------------------------

function drawPaperGrain() {
  const n = PAPER_SIZE;
  const height = new Float32Array(n * n);
  // Tooth: a few octaves of value noise, finest strongest (paper is mostly fine grain).
  const octaves: [number, number][] = [[16, 0.25], [48, 0.35], [128, 0.5], [256, 0.35]];
  octaves.forEach(([cells, amp], i) => {
    const layer = tileableNoise(n, cells, 1234 + i * 77);
    for (let k = 0; k < height.length; k++) height[k] = height[k]! + (layer[k]! - 0.5) * amp;
  });
  // Fibres: short strokes, raised or pressed in, wrapping round the edges so the tile repeats.
  const rand = mulberry32(99);
  for (let f = 0; f < 2600; f++) {
    let x = rand() * n;
    let y = rand() * n;
    const angle = rand() * Math.PI;
    const len = 4 + rand() * 18;
    const amp = (rand() - 0.4) * 0.5;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const bend = (rand() - 0.5) * 0.08;
    for (let s = 0; s < len; s++) {
      const i = ((Math.round(y) % n) + n) % n;
      const j = ((Math.round(x) % n) + n) % n;
      const fade = Math.sin((Math.PI * s) / len);
      height[i * n + j] = height[i * n + j]! + amp * fade;
      x += dx + bend * s * -dy;
      y += dy + bend * s * dx;
    }
  }

  const normal = document.createElement('canvas');
  const rough = document.createElement('canvas');
  normal.width = normal.height = rough.width = rough.height = n;
  const nctx = normal.getContext('2d')!;
  const rctx = rough.getContext('2d')!;
  const nimg = nctx.createImageData(n, n);
  const rimg = rctx.createImageData(n, n);
  const h = (x: number, y: number) => height[(((y % n) + n) % n) * n + (((x % n) + n) % n)]!;
  const strength = 2.2;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      // Canvas y runs down, texture v up (flipY): the green channel's sign follows v.
      const nx = -(h(x + 1, y) - h(x - 1, y)) * strength;
      const ny = (h(x, y + 1) - h(x, y - 1)) * strength;
      const len = Math.hypot(nx, ny, 1);
      const o = (y * n + x) * 4;
      nimg.data[o] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      nimg.data[o + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      nimg.data[o + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      nimg.data[o + 3] = 255;
      // Roughness 0.74–0.92: the raised tooth is a little rougher than the pressed hollows.
      const r = Math.round((0.83 + h(x, y) * 0.12) * 255);
      rimg.data[o] = rimg.data[o + 1] = rimg.data[o + 2] = Math.max(0, Math.min(255, r));
      rimg.data[o + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);
  rctx.putImageData(rimg, 0, 0);
  return { normal, roughness: rough };
}

// --- Case scuffs -----------------------------------------------------------------------

function drawScuffs(): HTMLCanvasElement {
  const n = SCUFF_SIZE;
  const pxPerCm = n / SCUFF_TILE_CM;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = n;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, n, n);
  const rand = mulberry32(7);
  ctx.lineCap = 'round';

  // Hairline scratches, mostly along the case's length (sliding in and out of a shelf),
  // some across, a few anywhere. Each is a faint, slightly curved stroke.
  const families = [
    { count: 30, angle: Math.PI / 2, spread: 0.25 },
    { count: 12, angle: 0.15, spread: 0.3 },
    { count: 10, angle: 0, spread: Math.PI },
  ];
  for (const fam of families) {
    for (let i = 0; i < fam.count; i++) {
      const x = rand() * n;
      const y = rand() * n;
      const angle = fam.angle + (rand() - 0.5) * 2 * fam.spread;
      const len = (0.15 + Math.pow(rand(), 3) * 2) * pxPerCm;
      const bend = (rand() - 0.5) * 0.25 * len;
      const dx = Math.cos(angle) * len;
      const dy = Math.sin(angle) * len;
      ctx.strokeStyle = `rgba(255,255,255,${0.3 + rand() * 0.4})`;
      ctx.lineWidth = 0.9 + rand() * 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + dx / 2 - (dy / len) * bend, y + dy / 2 + (dx / len) * bend, x + dx, y + dy);
      ctx.stroke();
    }
  }
  // Tiny scuffs.
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.08 + rand() * 0.2})`;
    const r = 0.4 + rand() * 1.2;
    ctx.beginPath();
    ctx.arc(rand() * n, rand() * n, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Two fingerprints near the open edge (+X), where a case is held: a greasy haze with
  // ridges in it. Map centre = case centre; +X right, +Y up (canvas y is flipped).
  const prints = [
    { x: 2.1, y: -1.2, angle: 0.5, scale: 1 },
    { x: 1.4, y: 3.1, angle: -0.3, scale: 0.9 },
  ];
  for (const p of prints) {
    const cx = n / 2 + p.x * pxPerCm;
    const cy = n / 2 - p.y * pxPerCm;
    const rx = 0.62 * pxPerCm * p.scale;
    const ry = 0.82 * pxPerCm * p.scale;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p.angle);
    const haze = ctx.createRadialGradient(0, 0, 0, 0, 0, ry * 1.1);
    haze.addColorStop(0, 'rgba(255,255,255,0.16)');
    haze.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = haze;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 1.1, ry * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ridges ~0.45 mm apart, wobbling, broken in places, fading towards the edge.
    const spacing = 0.045 * pxPerCm;
    ctx.lineWidth = spacing * 0.45;
    for (let k = 1; k * spacing < ry; k++) {
      const t = (k * spacing) / ry;
      ctx.strokeStyle = `rgba(255,255,255,${0.2 * (1 - t * t)})`;
      const phase = rand() * Math.PI * 2;
      ctx.beginPath();
      const steps = 48;
      let drawing = false;
      for (let s = 0; s <= steps; s++) {
        const a = (s / steps) * Math.PI * 2;
        if (rand() < 0.06) {
          drawing = false;
          continue;
        }
        const wobble = 1 + 0.03 * Math.sin(a * 5 + phase);
        const px = Math.cos(a) * rx * t * wobble;
        // The ridges flatten into arches at the top of the pad.
        const py = Math.sin(a) * ry * t * wobble * (a > Math.PI ? 1 : 0.85);
        if (drawing) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
        drawing = true;
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  return canvas;
}

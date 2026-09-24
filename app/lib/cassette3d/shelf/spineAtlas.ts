import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace, type WebGLRenderer } from 'three';
import { CASE_LAYOUT, JCARD } from '../dimensions';

/**
 * Every shelf spine packed into one texture, so all cases draw in one call.
 *
 * A cell is the whole spine-side face of a case's contents block (see
 * shelfModel.ts): the J-card spine where it sits behind the plastic, and dark
 * around it where the cassette and the empty tray show. Cells are indexed by
 * tape; each instance reads its cell through a per-instance UV rect.
 */

/** Size of the contents block's spine face, cm: case depth (u) × length (v). */
export interface SpineFace {
  /** Z range of the face in the case frame (u = 0 at zMin). */
  zMin: number;
  zMax: number;
  /** Y range (v = 0 at yMin). */
  yMin: number;
  yMax: number;
}

export interface SpineAtlas {
  texture: CanvasTexture;
  /** UV rect of a tape's cell: offset x, offset y, scale x, scale y. */
  cellRect: (index: number) => [number, number, number, number];
  /** Height in px a spine drawn for this atlas should have. */
  spineHeight: number;
  /** Draw a J-card spine panel (12.7 × 102 mm, any resolution) into a tape's cell. */
  setSpine: (index: number, spine: CanvasImageSource & { width: number; height: number }) => void;
  /** Upload pending changes (call once per frame). */
  flush: () => void;
  dispose: () => void;
}

const ATLAS_WIDTH = 2048;
const EMPTY = '#141210';

export function createSpineAtlas(count: number, face: SpineFace, renderer: WebGLRenderer): SpineAtlas {
  const maxSize = Math.min(renderer.capabilities.maxTextureSize, 8192);
  const aspect = (face.zMax - face.zMin) / (face.yMax - face.yMin);
  // Largest cell height (≤ 256 px) whose grid still fits the GPU's texture limit.
  let cellH = 256;
  let cellW = 0;
  let cols = 0;
  let height = 0;
  for (;;) {
    cellW = Math.max(4, Math.round(cellH * aspect));
    cols = Math.floor(ATLAS_WIDTH / cellW);
    const rows = Math.max(1, Math.ceil(count / cols));
    height = 2 ** Math.ceil(Math.log2(rows * cellH));
    if (height <= maxSize || cellH <= 32) break;
    cellH /= 2;
  }
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_WIDTH;
  canvas.height = Math.min(height, maxSize);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = EMPTY;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;

  // Where the J-card spine sits in the face (case frame → cell fractions).
  const faceW = face.zMax - face.zMin;
  const faceH = face.yMax - face.yMin;
  const spineZ0 = CASE_LAYOUT.jcard.z - JCARD.spine;
  const u0 = (spineZ0 - face.zMin) / faceW;
  const u1 = (CASE_LAYOUT.jcard.z - face.zMin) / faceW;
  const v0 = (-JCARD.height / 2 - face.yMin) / faceH;
  const v1 = (JCARD.height / 2 - face.yMin) / faceH;

  const cellOrigin = (i: number) => ({ x: (i % cols) * cellW, y: Math.floor(i / cols) * cellH });
  let dirty = true;

  return {
    texture,
    spineHeight: Math.round((v1 - v0) * cellH),
    cellRect(i) {
      const { x, y } = cellOrigin(i);
      // Half a pixel in from each edge, so filtering never picks up the neighbour.
      const inset = 0.5;
      return [
        (x + inset) / canvas.width,
        1 - (y + cellH - inset) / canvas.height,
        (cellW - 2 * inset) / canvas.width,
        (cellH - 2 * inset) / canvas.height,
      ];
    },
    setSpine(i, spine) {
      const { x, y } = cellOrigin(i);
      if (y + cellH > canvas.height) return;
      // Around the J-card spine: the card's folded edge and the cassette behind the
      // plastic. A darkened stretch of the spine itself gives it the card's colour.
      ctx.fillStyle = EMPTY;
      ctx.fillRect(x, y, cellW, cellH);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(spine, 0, 0, Math.max(1, spine.width / 6), spine.height, x, y, cellW, cellH);
      ctx.globalAlpha = 1;
      // Canvas y runs down; the face's v runs up.
      const dx = x + u0 * cellW;
      const dw = (u1 - u0) * cellW;
      const dy = y + (1 - v1) * cellH;
      const dh = (v1 - v0) * cellH;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(spine, 0, 0, spine.width, spine.height, dx, dy, dw, dh);
      dirty = true;
    },
    flush() {
      if (!dirty) return;
      dirty = false;
      texture.needsUpdate = true;
    },
    dispose() {
      texture.dispose();
      canvas.width = canvas.height = 0;
    },
  };
}

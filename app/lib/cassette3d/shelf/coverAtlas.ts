import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace, type WebGLRenderer } from 'three';
import { CASE_LAYOUT, JCARD } from '../dimensions';

/**
 * J-card covers for the cases at the right-hand end of each row: the only ones
 * whose lid (cover side) shows, since the cases stand spine out, cover facing
 * right. One cell per shelf row, so the atlas stays small however many tapes
 * there are; a row's cell is redrawn when a different tape ends up at its end.
 */

/** The contents block's lid face, cm, in the case frame: x (u) × y (v). */
export interface CoverFace {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface CoverAtlas {
  texture: CanvasTexture;
  /** UV rect of a row's cell: offset x, offset y, scale x, scale y. */
  cellRect: (row: number) => [number, number, number, number];
  /** Height in px a cover drawn for this atlas should have. */
  coverHeight: number;
  /** Draw a J-card cover panel (any resolution) on the card's colour into a row's cell. */
  setCover: (row: number, cover: CanvasImageSource & { width: number; height: number }, background: string) => void;
  /** Upload pending changes (call once per frame). */
  flush: () => void;
  dispose: () => void;
}

const CELL_H = 256;

export function createCoverAtlas(rows: number, face: CoverFace, renderer: WebGLRenderer): CoverAtlas {
  const faceW = face.xMax - face.xMin;
  const faceH = face.yMax - face.yMin;
  const cellW = Math.round((CELL_H * faceW) / faceH);
  const maxSize = Math.min(renderer.capabilities.maxTextureSize, 4096);
  const cols = Math.max(1, Math.floor(maxSize / cellW));
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(cols, Math.max(rows, 1)) * cellW;
  canvas.height = Math.ceil(Math.max(rows, 1) / cols) * CELL_H;
  const ctx = canvas.getContext('2d')!;

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;

  // Where the J-card cover sits on the lid face (case frame → cell fractions).
  const u0 = (CASE_LAYOUT.jcard.x - face.xMin) / faceW;
  const u1 = (CASE_LAYOUT.jcard.x + JCARD.flaps[0]! - face.xMin) / faceW;
  const v0 = (-JCARD.height / 2 - face.yMin) / faceH;
  const v1 = (JCARD.height / 2 - face.yMin) / faceH;

  const cellOrigin = (row: number) => ({ x: (row % cols) * cellW, y: Math.floor(row / cols) * CELL_H });
  let dirty = false;

  return {
    texture,
    coverHeight: Math.round((v1 - v0) * CELL_H),
    cellRect(row) {
      const { x, y } = cellOrigin(row);
      const inset = 0.5;
      return [
        (x + inset) / canvas.width,
        1 - (y + CELL_H - inset) / canvas.height,
        (cellW - 2 * inset) / canvas.width,
        (CELL_H - 2 * inset) / canvas.height,
      ];
    },
    setCover(row, cover, background) {
      const { x, y } = cellOrigin(row);
      if (y + CELL_H > canvas.height) return;
      ctx.fillStyle = background;
      ctx.fillRect(x, y, cellW, CELL_H);
      // Canvas y runs down; the face's v runs up. The cover's left edge is its spine fold (−X).
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(cover, 0, 0, cover.width, cover.height, x + u0 * cellW, y + (1 - v1) * CELL_H, (u1 - u0) * cellW, (v1 - v0) * CELL_H);
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

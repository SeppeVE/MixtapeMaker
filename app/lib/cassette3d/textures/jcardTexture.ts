import {
  CanvasTexture,
  LinearMipmapLinearFilter,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Material,
  type Mesh,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { JCARD } from '../dimensions';
import { applyPaperGrain, cloneGrain } from '../materials';
import type { JCardModel, JCardPanel } from '../objects/jcard';
import type { FaceSnapshot, JCardSnapshot } from './jcardSnapshot';
import { coverFromSnapshot, spineFromSnapshot } from './jcardRender';

/**
 * Turns a J-card snapshot into textures on the hinged 3D card.
 *
 * Each face (outside, inside) is uploaded once as one texture. Every panel
 * shows its own columns of it through a clone with its own offset/repeat;
 * clones share the uploaded image, so there's no per-panel copy on the CPU or
 * the GPU. (Cropping each panel out with drawImage took seconds per card on
 * software-rendered canvases.) A face wider than the GPU allows is scaled down.
 *
 * BoxGeometry's +Z face shows the outside and its −Z face the inside; the −Z
 * face's UVs already run right-to-left, which matches the inside snapshot being
 * drawn as the mirror image of the outside.
 */

/** Box face groups: +X, −X, +Y, −Y, +Z (outside), −Z (inside). */
const OUTSIDE = 4;
const INSIDE = 5;

export interface JCardTextureSet {
  materials: Material[];
  /** Low-resolution crop of the outside spine, for the shelf (Stage 4). Made on first call. */
  spineThumbnail: (height?: number) => HTMLCanvasElement | null;
  /** Low-resolution crop of the outside cover, for the shelf's row-end cases. */
  coverThumbnail: (height?: number) => HTMLCanvasElement | null;
  dispose: () => void;
}

export function applyJCardTextures(
  jcard: JCardModel,
  snapshot: JCardSnapshot,
  renderer: WebGLRenderer,
  paper: Material,
  /** Longest side of a face texture (the quality tier's limit); the GPU's own limit applies too. */
  maxPx = Infinity,
): JCardTextureSet {
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const maxSize = Math.min(renderer.capabilities.maxTextureSize, maxPx);
  const textures: Texture[] = [];
  const owned: Material[] = [];

  const makeFace = (face: FaceSnapshot | undefined) => {
    if (!face) return null;
    const image = fitToSize(face.canvas, maxSize);
    const base = new CanvasTexture(image);
    base.colorSpace = SRGBColorSpace;
    base.anisotropy = anisotropy;
    base.minFilter = LinearMipmapLinearFilter;
    base.generateMipmaps = true;
    textures.push(base);
    return { base, width: face.canvas.width, panels: face.panels };
  };
  const faces = { outside: makeFace(snapshot.outside), inside: makeFace(snapshot.inside) };

  const faceMaterial = (face: ReturnType<typeof makeFace>, panel: JCardPanel): Material => {
    const { name } = panel;
    const rect = face?.panels[name];
    if (!face || !rect || rect.width <= 0) return paper;
    const map = face.base.clone();
    map.repeat.set(rect.width / face.width, 1);
    map.offset.set(rect.x / face.width, 0);
    textures.push(map);
    const material = new MeshStandardMaterial({ name: `jcard-${name}`, map, roughness: 0.82, metalness: 0 });
    // The plain paper's grain, at this panel's size.
    const grain = cloneGrain(paper);
    if (grain) {
      applyPaperGrain(material, grain, panel.width, JCARD.height, false);
      textures.push(grain.normal, grain.roughness);
    }
    owned.push(material);
    return material;
  };

  for (const panel of jcard.panels) {
    const materials: Material[] = [paper, paper, paper, paper, paper, paper];
    materials[OUTSIDE] = faceMaterial(faces.outside, panel);
    materials[INSIDE] = faceMaterial(faces.inside, panel);
    (panel.mesh as Mesh).material = materials;
  }

  return {
    materials: owned,
    spineThumbnail: (height = 256) => spineFromSnapshot(snapshot, height),
    coverThumbnail: (height = 256) => coverFromSnapshot(snapshot, height),
    dispose() {
      for (const t of textures) t.dispose();
      for (const m of owned) m.dispose();
      for (const panel of jcard.panels) (panel.mesh as Mesh).material = paper;
    },
  };
}

/** The canvas itself, or a scaled-down copy when it's larger than the GPU's texture limit. */
function fitToSize(canvas: HTMLCanvasElement, maxSize: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSize / canvas.width, maxSize / canvas.height);
  if (scale >= 1) return canvas;
  const out = document.createElement('canvas');
  out.width = Math.floor(canvas.width * scale);
  out.height = Math.floor(canvas.height * scale);
  const ctx = out.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, out.width, out.height);
  }
  return out;
}

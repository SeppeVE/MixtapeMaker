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
import type { JCardModel, JCardPanelName } from '../objects/jcard';
import type { FaceSnapshot, JCardSnapshot, PanelRect } from './jcardSnapshot';

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
  dispose: () => void;
}

export function applyJCardTextures(
  jcard: JCardModel,
  snapshot: JCardSnapshot,
  renderer: WebGLRenderer,
  paper: Material,
): JCardTextureSet {
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const maxSize = renderer.capabilities.maxTextureSize;
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

  const faceMaterial = (face: ReturnType<typeof makeFace>, name: JCardPanelName): Material => {
    const rect = face?.panels[name];
    if (!face || !rect || rect.width <= 0) return paper;
    const map = face.base.clone();
    map.repeat.set(rect.width / face.width, 1);
    map.offset.set(rect.x / face.width, 0);
    textures.push(map);
    const material = new MeshStandardMaterial({ name: `jcard-${name}`, map, roughness: 0.82, metalness: 0 });
    owned.push(material);
    return material;
  };

  for (const panel of jcard.panels) {
    const materials: Material[] = [paper, paper, paper, paper, paper, paper];
    materials[OUTSIDE] = faceMaterial(faces.outside, panel.name);
    materials[INSIDE] = faceMaterial(faces.inside, panel.name);
    (panel.mesh as Mesh).material = materials;
  }

  return {
    materials: owned,
    spineThumbnail(height = 256) {
      const rect = snapshot.outside.panels.spine;
      return rect ? cropPanel(snapshot.outside.canvas, rect, height) : null;
    },
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

/** Copy one panel's columns out of a face canvas, scaled to `height` px. */
function cropPanel(source: HTMLCanvasElement, rect: PanelRect, height: number): HTMLCanvasElement {
  const scale = height / source.height;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(rect.width * scale));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, rect.x, 0, rect.width, source.height, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

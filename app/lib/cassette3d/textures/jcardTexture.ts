import {
  CanvasTexture,
  LinearMipmapLinearFilter,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Material,
  type Mesh,
  type WebGLRenderer,
} from 'three';
import type { JCardModel, JCardPanelName } from '../objects/jcard';
import type { FaceSnapshot, JCardSnapshot, PanelRect } from './jcardSnapshot';

/**
 * Turns a J-card snapshot into textures on the hinged 3D card.
 *
 * Each panel gets its own texture per face rather than one atlas: panels are at
 * most 65 × 102 mm (≈ 770 × 1200 px at 300 dpi), so every texture stays well under
 * any GPU's size limit, and the panel boxes' own UVs (0–1 per face) need no remapping.
 * BoxGeometry's +Z face shows the outside and its −Z face the inside; the −Z face's
 * UVs already run right-to-left, which matches the inside snapshot being drawn as
 * the mirror image of the outside.
 */

/** Box face groups: +X, −X, +Y, −Y, +Z (outside), −Z (inside). */
const OUTSIDE = 4;
const INSIDE = 5;

export interface JCardTextureSet {
  materials: Material[];
  /** Low-resolution crop of the outside spine, for the shelf (Stage 4). */
  spineThumbnail: HTMLCanvasElement | null;
  dispose: () => void;
}

export function applyJCardTextures(
  jcard: JCardModel,
  snapshot: JCardSnapshot,
  renderer: WebGLRenderer,
  paper: Material,
): JCardTextureSet {
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const owned: Material[] = [];

  const faceMaterial = (face: FaceSnapshot | undefined, name: JCardPanelName): Material => {
    const rect = face?.panels[name];
    if (!face || !rect || rect.width <= 0) return paper;
    const texture = new CanvasTexture(cropPanel(face.canvas, rect));
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = anisotropy;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    const material = new MeshStandardMaterial({ name: `jcard-${name}`, map: texture, roughness: 0.82, metalness: 0 });
    owned.push(material);
    return material;
  };

  for (const panel of jcard.panels) {
    const materials: Material[] = [paper, paper, paper, paper, paper, paper];
    materials[OUTSIDE] = faceMaterial(snapshot.outside, panel.name);
    materials[INSIDE] = faceMaterial(snapshot.inside, panel.name);
    (panel.mesh as Mesh).material = materials;
  }

  const spine = snapshot.outside.panels.spine;
  return {
    materials: owned,
    spineThumbnail: spine ? cropPanel(snapshot.outside.canvas, spine, 256) : null,
    dispose() {
      for (const m of owned) {
        (m as MeshStandardMaterial).map?.dispose();
        m.dispose();
      }
      for (const panel of jcard.panels) (panel.mesh as Mesh).material = paper;
    },
  };
}

/** Copy one panel's columns out of a face canvas, optionally scaled to `height` px. */
function cropPanel(source: HTMLCanvasElement, rect: PanelRect, height = source.height): HTMLCanvasElement {
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

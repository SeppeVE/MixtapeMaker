import { CanvasTexture, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace, type WebGLRenderer } from 'three';

/**
 * A tileable oak-like wood grain drawn on a 2D canvas (1k), for the shelf.
 *
 * Stand-in for a CC0 photo texture: this sandbox can't reach the CC0 libraries
 * (Poly Haven, ambientCG). The shelf maps it in world units (WOOD_TILE_CM per
 * tile), so swapping in a photo texture later is a change here only.
 * Grain runs along u.
 */

export const WOOD_TILE_CM = 60;
const SIZE = 1024;

export function createWoodTexture(renderer: WebGLRenderer, seed = 11): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;

  ctx.fillStyle = '#8a5a36';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Broad colour bands across the grain.
  for (let i = 0; i < 26; i++) {
    const y = rand() * SIZE;
    const h = 20 + rand() * 90;
    const light = rand() < 0.5;
    ctx.fillStyle = light ? `rgba(176, 124, 78, ${0.12 + rand() * 0.18})` : `rgba(74, 43, 22, ${0.1 + rand() * 0.18})`;
    for (const o of [-SIZE, 0, SIZE]) ctx.fillRect(0, y + o, SIZE, h);
  }

  // Grain lines: thin, slightly wavy, tileable along u (whole sine periods) and v (wrapped).
  for (let i = 0; i < 520; i++) {
    const y0 = rand() * SIZE;
    const amp = 1 + rand() * 6;
    const periods = 1 + Math.floor(rand() * 3);
    const phase = rand() * Math.PI * 2;
    const dark = rand() < 0.7;
    ctx.strokeStyle = dark ? `rgba(58, 32, 16, ${0.08 + rand() * 0.28})` : `rgba(196, 146, 96, ${0.06 + rand() * 0.16})`;
    ctx.lineWidth = 0.6 + rand() * (dark ? 2.2 : 1.4);
    for (const o of [-SIZE, 0, SIZE]) {
      ctx.beginPath();
      for (let x = 0; x <= SIZE; x += 16) {
        const y = y0 + o + Math.sin((x / SIZE) * Math.PI * 2 * periods + phase) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // Pores: short dark dashes along the grain.
  for (let i = 0; i < 2600; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    ctx.fillStyle = `rgba(40, 22, 10, ${0.1 + rand() * 0.25})`;
    ctx.fillRect(x, y, 3 + rand() * 9, 1);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.minFilter = LinearMipmapLinearFilter;
  return texture;
}

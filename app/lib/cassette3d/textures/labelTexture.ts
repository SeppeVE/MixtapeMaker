import {
  CanvasTexture,
  LinearMipmapLinearFilter,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Material,
  type Mesh,
  type WebGLRenderer,
} from 'three';
import type { JCardContent, Mixtape } from '~/types';
import { CASSETTE } from '../dimensions';
import type { CassetteModel } from '../objects/cassette';
import { collectFontFamilies } from './jcardSnapshot';

/**
 * Cassette labels drawn on a 2D canvas: the mixtape's name on ruled lines above
 * the window, a big side letter beside it, the tape length, and a colour stripe
 * below. The stripe colour and the handwriting font come from the J-card when
 * it has usable ones.
 */

const PX_PER_CM = 220;
const FALLBACK_FONT = 'Permanent Marker';
const FALLBACK_STRIPE = '#c8452e';
const PAPER = '#f2ebd9';
const INK = '#221a26';

export interface LabelStyle {
  font: string;
  stripe: string;
}

/** Font and stripe colour for a tape's labels, taken from its J-card where possible. */
export function labelStyleFor(content: JCardContent | null): LabelStyle {
  const coverFonts = content ? collectFontFamilies({ ...content, flapContents: [content.flapContents[0] ?? ''] } as JCardContent) : [];
  const font = coverFonts[0] ?? FALLBACK_FONT;
  const bg = content?.backgroundColor;
  // A near-white or near-black card colour makes a dull stripe; use the classic red instead.
  const l = bg ? luminance(bg) : null;
  const stripe = bg && l !== null && l > 0.08 && l < 0.8 ? bg : FALLBACK_STRIPE;
  return { font, stripe };
}

export async function drawLabel(mixtape: Pick<Mixtape, 'title' | 'cassetteLength'>, side: 'A' | 'B', style: LabelStyle) {
  const { label, window: win } = CASSETTE;
  const W = Math.round(label.width * PX_PER_CM);
  const H = Math.round((label.top - label.bottom) * PX_PER_CM);
  // Label-local cm → canvas px (canvas y runs downwards).
  const px = (xCm: number) => (xCm + label.width / 2) * PX_PER_CM;
  const py = (yCm: number) => (label.top - yCm) * PX_PER_CM;
  const winLeft = px(-win.width / 2);
  const winRight = px(win.width / 2);
  const winTop = py(win.centerY + win.height / 2);
  const winBottom = py(win.centerY - win.height / 2);

  const [font, letterFont, smallFont] = await Promise.all([
    ensureFont(style.font),
    ensureFont('Bebas Neue'),
    ensureFont('JetBrains Mono'),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  // Ruled writing lines above the window.
  const margin = 0.28 * PX_PER_CM;
  const titleBase = winTop - 0.2 * PX_PER_CM;
  ctx.strokeStyle = 'rgba(60, 45, 70, 0.28)';
  ctx.lineWidth = 3;
  for (const y of [titleBase, titleBase - 0.5 * PX_PER_CM]) {
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(W - margin, y);
    ctx.stroke();
  }

  // Title, shrunk to fit the line, then ellipsised as a last resort.
  ctx.fillStyle = INK;
  ctx.textBaseline = 'alphabetic';
  const maxWidth = W - 2 * margin - 0.9 * PX_PER_CM;
  let size = 0.62 * PX_PER_CM;
  const setFont = () => { ctx.font = `${Math.round(size)}px ${font}`; };
  setFont();
  const title = mixtape.title.trim() || 'Untitled mixtape';
  while (ctx.measureText(title).width > maxWidth && size > 0.34 * PX_PER_CM) {
    size *= 0.94;
    setFont();
  }
  ctx.fillText(fitText(ctx, title, maxWidth), margin + 0.9 * PX_PER_CM, titleBase - 0.08 * PX_PER_CM);

  // Side letter, left of the title and above the window's left end.
  ctx.font = `${Math.round(0.95 * PX_PER_CM)}px ${letterFont}`;
  ctx.textAlign = 'center';
  ctx.fillText(side, margin + 0.38 * PX_PER_CM, titleBase);
  ctx.textAlign = 'left';

  // Beside the window: small print, like a real label.
  ctx.font = `${Math.round(0.26 * PX_PER_CM)}px ${smallFont}`;
  ctx.fillStyle = 'rgba(34, 26, 38, 0.7)';
  ctx.textAlign = 'center';
  const midY = (winTop + winBottom) / 2 + 0.09 * PX_PER_CM;
  ctx.fillText('STEREO', (winLeft + margin) / 2, midY);
  ctx.fillText(`C${mixtape.cassetteLength}`, (winRight + W - margin) / 2, midY);
  ctx.textAlign = 'left';

  // Colour stripe band below the window, with a thin dark rule over it.
  const stripeTop = winBottom + 0.14 * PX_PER_CM;
  ctx.fillStyle = style.stripe;
  ctx.fillRect(0, stripeTop, W, H - stripeTop);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(0, stripeTop, W, 0.04 * PX_PER_CM);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillRect(0, stripeTop + 0.22 * PX_PER_CM, W, 0.05 * PX_PER_CM);

  return canvas;
}

export interface LabelTextureSet {
  dispose: () => void;
}

/** Draw both labels and put them on the cassette. */
export async function applyLabelTextures(
  cassette: CassetteModel,
  mixtape: Pick<Mixtape, 'title' | 'cassetteLength'>,
  style: LabelStyle,
  renderer: WebGLRenderer,
): Promise<LabelTextureSet> {
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const originals = new Map<Mesh, Material | Material[]>();
  const owned: MeshStandardMaterial[] = [];
  for (const [mesh, side] of [[cassette.labelA, 'A'], [cassette.labelB, 'B']] as const) {
    const texture = new CanvasTexture(await drawLabel(mixtape, side, style));
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = anisotropy;
    texture.minFilter = LinearMipmapLinearFilter;
    const material = new MeshStandardMaterial({ name: `label${side}`, map: texture, roughness: 0.8, metalness: 0 });
    originals.set(mesh, mesh.material);
    mesh.material = material;
    owned.push(material);
  }
  return {
    dispose() {
      for (const [mesh, material] of originals) mesh.material = material;
      for (const m of owned) {
        m.map?.dispose();
        m.dispose();
      }
    },
  };
}

// --- helpers -------------------------------------------------------------------

/** Load the font (Fontsource faces load lazily) and return a CSS font-family stack. */
async function ensureFont(family: string): Promise<string> {
  const css = `"${family.replace(/"/g, '\\"')}"`;
  try {
    await Promise.race([
      document.fonts.load(`64px ${css}`),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  } catch { /* fall through to the fallback stack */ }
  return `${css}, "${FALLBACK_FONT}", cursive`;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Relative luminance of a CSS hex colour, or null if it isn't one. */
function luminance(color: string): number | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return null;
  let hex = m[1]!;
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

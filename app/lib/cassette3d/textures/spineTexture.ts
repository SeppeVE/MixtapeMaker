import type { JCardContent } from '~/types';
import { JCARD } from '../dimensions';

/**
 * Shelf spines drawn straight onto a 2D canvas from the J-card's content: its
 * background colour and the spine's top / centre / bottom text in the spine's own
 * font and colour. Instant, so all tapes get a readable spine at once; a tape's
 * real spine (cropped from its J-card render) replaces it once this tab has one.
 * Images (background photos) are left out: they'd need the full render.
 */

const FALLBACK_FONT = 'Bebas Neue';

interface SpineText {
  text: string;
  color: string | null;
  font: string | null;
}

/** Plain text plus the first colour and font found in one spine HTML field. */
function readSpineHtml(html: string): SpineText {
  if (!html) return { text: '', color: null, font: null };
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const text = (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
  let color: string | null = null;
  let font: string | null = null;
  for (const el of doc.body.querySelectorAll<HTMLElement>('[style]')) {
    color ??= el.style.color || null;
    if (!font && el.style.fontFamily) font = el.style.fontFamily.split(',')[0]!.trim().replace(/^["']|["']$/g, '');
  }
  return { text, color, font };
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

/** Font families a drawn spine needs, so they can be loaded once for the whole shelf. */
export function spineFonts(content: JCardContent): string[] {
  const fonts = [content.spineTopContent, content.spineCenterContent, content.spineBottomContent]
    .map((h) => readSpineHtml(h ?? '').font)
    .filter((f): f is string => !!f);
  return fonts.length ? fonts : [FALLBACK_FONT];
}

/**
 * The J-card spine panel (12.7 × 102 mm) drawn `height` px tall. Text runs along
 * the spine, reading top to bottom (bottom to top on reversed cards), like the
 * printed Spine component.
 */
export function drawSpine(content: JCardContent, fallbackTitle: string, height = 256): HTMLCanvasElement {
  const H = Math.round(height);
  const W = Math.max(1, Math.round((H * JCARD.spine) / JCARD.height));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const bg = content.backgroundColor || '#e4dfd3';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const top = readSpineHtml(content.spineTopContent ?? '');
  const centre = readSpineHtml(content.spineCenterContent ?? '');
  const bottom = readSpineHtml(content.spineBottomContent ?? '');
  if (!top.text && !centre.text && !bottom.text) top.text = fallbackTitle;

  const l = luminance(bg);
  const defaultInk = l !== null && l < 0.35 ? '#f5efe2' : '#1e1a1c';
  const px = H / (JCARD.height * 10); // px per mm
  // 2.5 mm text like the printed spine, but never cramped: the shelf shows it small.
  const size = Math.min(W * 0.62, 3.4 * px);
  const margin = 1.5 * px;

  // Rotate so the canvas x axis runs down the spine (up it when reversed).
  ctx.save();
  if (content.isReversed) {
    ctx.translate(0, H);
    ctx.rotate(-Math.PI / 2);
  } else {
    ctx.translate(W, 0);
    ctx.rotate(Math.PI / 2);
  }
  ctx.textBaseline = 'middle';
  const length = H - 2 * margin;
  const draw = (t: SpineText, align: CanvasTextAlign, x: number, maxWidth: number) => {
    if (!t.text || maxWidth <= 0) return;
    ctx.font = `${size}px "${(t.font ?? top.font ?? FALLBACK_FONT).replace(/"/g, '')}", "${FALLBACK_FONT}", sans-serif`;
    ctx.fillStyle = t.color ?? top.color ?? defaultInk;
    ctx.textAlign = align;
    ctx.fillText(fitText(ctx, t.text, maxWidth), x, W / 2);
  };
  // Top and bottom share the length with the centre text, if there is any.
  const share = centre.text ? 0.3 : top.text && bottom.text ? 0.72 : 1;
  draw(top, 'left', margin, length * share);
  draw(centre, 'center', H / 2, length * 0.4);
  draw(bottom, 'right', H - margin, length * (1 - share) - (top.text ? 2 * px : 0));
  ctx.restore();
  return canvas;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Load the families (Fontsource faces load lazily), giving up on each after `timeoutMs`. */
export async function loadSpineFonts(families: Iterable<string>, timeoutMs = 3000): Promise<void> {
  await Promise.all(
    [...new Set(families)].map((family) =>
      Promise.race([
        document.fonts.load(`32px "${family.replace(/"/g, '')}"`).catch(() => undefined),
        new Promise((r) => setTimeout(r, timeoutMs)),
      ]),
    ),
  );
}

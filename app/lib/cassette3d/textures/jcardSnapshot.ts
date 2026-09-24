import { createApp, h, type Component } from 'vue';
import { toCanvas } from 'html-to-image';
import type { JCardContent } from '~/types';
import JCardPrintable from '~/components/jcard/JCardPrintable.vue';
import JCardInsidePrintable from '~/components/jcard/JCardInsidePrintable.vue';
import { JCARD_HEIGHT_MM, computeWidthMm } from '~/components/jcard/dimensions';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import { registerCustomFonts } from '~/utils/fontManager';
import {
  collectImageUrls,
  inlineCrossOriginFonts,
  inlineCustomFonts,
  jcardHasInsideContent,
  waitForImages,
} from '~/utils/jcardPdf';
import type { JCardPanelName } from '../objects/jcard';
import { DEFAULT_DPI } from './jcardRender';

/**
 * Renders a J-card's faces to canvases with the same printable components and
 * the same html-to-image path as the PDF export, so the 3D card matches the
 * export exactly. DOM only: turning the result into textures is jcardTexture.ts.
 */

const MM_TO_PX = 96 / 25.4;
const FONT_TIMEOUT_MS = 4000;

export type JCardFace = 'outside' | 'inside';

/** A panel's pixel column range in a face canvas. */
export interface PanelRect {
  x: number;
  width: number;
}

export interface FaceSnapshot {
  canvas: HTMLCanvasElement;
  panels: Partial<Record<JCardPanelName, PanelRect>>;
}

export interface ImageCheck {
  url: string;
  ok: boolean;
  /** Why it failed: 'cors' (fetch refused, most likely no CORS headers), 'http <status>' or 'load'. */
  reason?: string;
}

export interface JCardSnapshot {
  outside: FaceSnapshot;
  /** Absent when the card has nothing on its inside; the 3D card shows plain paper there. */
  inside?: FaceSnapshot;
  pxPerMm: number;
  /** Font families the card uses, and whether each finished loading before capture. */
  fonts: { family: string; loaded: boolean }[];
  images: ImageCheck[];
  ms: number;
}

export async function snapshotJCard(rawContent: JCardContent, dpi = DEFAULT_DPI): Promise<JCardSnapshot> {
  const t0 = performance.now();
  // Cut guides belong on paper, not on the 3D card (human decision, Stage 2 real-data check).
  const content: JCardContent = { ...migrateJCardContent(rawContent), showCutGuides: false };
  const pxPerMm = dpi / 25.4;

  const [images, fonts] = await Promise.all([
    checkImages(content),
    loadFonts(content),
    waitForImages(content),
  ]);

  const outside = await snapshotFace(JCardPrintable, content, 'outside', pxPerMm);
  const inside = jcardHasInsideContent(content)
    ? await snapshotFace(JCardInsidePrintable, content, 'inside', pxPerMm)
    : undefined;

  return { outside, inside, pxPerMm, fonts, images, ms: Math.round(performance.now() - t0) };
}

// --- Capture -------------------------------------------------------------------

async function snapshotFace(
  component: Component,
  content: JCardContent,
  face: JCardFace,
  pxPerMm: number,
): Promise<FaceSnapshot> {
  const widthMm = computeWidthMm(content);
  const heightMm = JCARD_HEIGHT_MM;

  // Off screen but laid out (display: none would give every panel a zero rect).
  const host = document.createElement('div');
  host.style.cssText = [
    'position: fixed',
    'left: -100000px',
    'top: 0',
    'pointer-events: none',
    `width: ${widthMm}mm`,
    `height: ${heightMm}mm`,
    'background: transparent',
    'zoom: 1',
    'transform: none',
  ].join(';');
  host.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);

  let app: ReturnType<typeof createApp> | null = null;
  try {
    app = createApp({ render: () => h(component, { content }) });
    app.mount(host);
    await twoFrames();

    const cardEl = host.querySelector<HTMLElement>('.jcard');
    if (!cardEl) throw new Error('Printable J-card failed to mount');

    await inlineCrossOriginFonts(host);
    inlineCustomFonts(host, content);

    const panels = measurePanels(cardEl, content, face, pxPerMm);
    const canvas = await toCanvas(cardEl, {
      pixelRatio: pxPerMm / MM_TO_PX,
      cacheBust: true,
      width: widthMm * MM_TO_PX,
      height: heightMm * MM_TO_PX,
      style: { transform: 'none', margin: '0' },
      backgroundColor: content.backgroundColor || '#ffffff',
    });
    return { canvas, panels };
  } finally {
    try { app?.unmount(); } catch { /* ignore */ }
    host.remove();
  }
}

/**
 * Pixel columns of each panel, read from the laid-out DOM so reversed cards and
 * the mirrored inside face need no special cases. On the inside face the flaps
 * come in reverse order (JCardInsidePrintable draws the mirror image).
 */
function measurePanels(
  cardEl: HTMLElement,
  content: JCardContent,
  face: JCardFace,
  pxPerMm: number,
): Partial<Record<JCardPanelName, PanelRect>> {
  const origin = cardEl.getBoundingClientRect().left;
  const scale = pxPerMm / MM_TO_PX;
  const rectOf = (el: Element): PanelRect => {
    const r = el.getBoundingClientRect();
    return { x: Math.round((r.left - origin) * scale), width: Math.round(r.width * scale) };
  };

  const panels: Partial<Record<JCardPanelName, PanelRect>> = {};
  const back = cardEl.querySelector(':scope > .jcard-back');
  const spine = cardEl.querySelector(':scope > .jcard-spine');
  if (back) panels.back = rectOf(back);
  if (spine) panels.spine = rectOf(spine);
  const flaps = [...cardEl.querySelectorAll(':scope > .jcard-flap')];
  flaps.forEach((el, i) => {
    const index = face === 'outside' ? i : content.flaps - 1 - i;
    panels[`flap${index + 1}`] = rectOf(el);
  });
  return panels;
}

// --- Fonts and images ------------------------------------------------------------

/** Every font family named in the card's HTML, plus its uploaded fonts. */
export function collectFontFamilies(content: JCardContent): string[] {
  const html = [
    ...content.flapContents,
    ...(content.insideFlapContents ?? []),
    content.spineTopContent,
    content.spineCenterContent,
    content.spineBottomContent,
    content.backLeftContent,
    content.backRightContent,
    content.insideSpineContent ?? '',
    content.insideBackContent ?? '',
  ].join('\n')
    // The editor stores quoted names as &quot;Lady Starlight&quot;: decode first, or the ';' ends the match.
    .replace(/&quot;/g, "'");
  const families = new Set<string>();
  for (const m of html.matchAll(/font-family:\s*([^;"]+)/gi)) {
    for (const part of m[1]!.split(',')) {
      const name = part.trim().replace(/^["']|["']$/g, '');
      if (name && !/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|inherit|initial)$/i.test(name)) families.add(name);
    }
  }
  for (const f of content.customFonts ?? []) families.add(f.name);
  return [...families];
}

/**
 * Make sure every font the card uses is loaded before capture: register the
 * card's uploaded fonts, then ask the browser to load each family (Fontsource
 * faces are only fetched on first use). Gives up per family after a timeout.
 */
async function loadFonts(content: JCardContent): Promise<{ family: string; loaded: boolean }[]> {
  if (content.customFonts?.length) await registerCustomFonts(content.customFonts);
  const families = collectFontFamilies(content);
  const results = await Promise.all(families.map(async (family) => {
    const spec = `16px "${family.replace(/"/g, '\\"')}"`;
    try {
      const faces = await withTimeout(document.fonts.load(spec), FONT_TIMEOUT_MS);
      return { family, loaded: !!faces?.length || document.fonts.check(spec) };
    } catch {
      return { family, loaded: false };
    }
  }));
  try { await withTimeout(document.fonts.ready, FONT_TIMEOUT_MS); } catch { /* capture anyway */ }
  return results;
}

/**
 * Fetch every image the card uses with CORS, the way html-to-image will. An image
 * that fails here comes out blank in the texture (and in the PDF export).
 */
async function checkImages(content: JCardContent): Promise<ImageCheck[]> {
  return Promise.all(collectImageUrls(content).map(async (url): Promise<ImageCheck> => {
    const label = url.startsWith('data:') ? `${url.slice(0, 32)}…` : url;
    if (url.startsWith('data:') || url.startsWith('blob:')) return { url: label, ok: true };
    try {
      const res = await fetch(url, { mode: 'cors', cache: 'force-cache' });
      return res.ok ? { url, ok: true } : { url, ok: false, reason: `http ${res.status}` };
    } catch {
      return { url, ok: false, reason: 'cors' };
    }
  }));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

function twoFrames() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

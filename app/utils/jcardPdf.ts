import { createApp, h, type Component } from 'vue';
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { toPng } from 'html-to-image';
import type { JCardContent, JCardDuplexFlip, JCardPaperSize } from '../types';
import { JCARD_HEIGHT_MM, computeWidthMm } from '../components/jcard/dimensions';
import JCardPrintable from '../components/jcard/JCardPrintable.vue';
import JCardInsidePrintable from '../components/jcard/JCardInsidePrintable.vue';

const MM_TO_PT = 72 / 25.4;
const MM_TO_PX = 96 / 25.4;
const SNAPSHOT_PIXEL_RATIO = 4;
/** Space between the card and the page edge on a custom ('fit') page, and the minimum on real paper. */
const MARGIN_MM = 12;
const CROP_GAP_MM = 1.5;
const CROP_LEN_MM = 5;
const CROP_WIDTH_PT = 0.5;
const SCALE_BAR_MM = 50;
const NOTE_PT = 7;

/** Landscape paper sizes in mm (long edge first). */
export const PAPER_SIZES_MM: Record<Exclude<JCardPaperSize, 'fit'>, { w: number; h: number; label: string }> = {
  a4: { w: 297, h: 210, label: 'A4' },
  letter: { w: 279.4, h: 215.9, label: 'US Letter' },
};

export const DEFAULT_PAPER: JCardPaperSize = 'a4';
export const DEFAULT_DUPLEX_FLIP: JCardDuplexFlip = 'long';

export interface JCardPdfLayout {
  widthMm: number;
  heightMm: number;
  /** Paper the user asked for. */
  requestedPaper: JCardPaperSize;
  /** Paper actually used: the requested one, or 'fit' when the card does not fit on it. */
  paper: JCardPaperSize;
  fitsRequested: boolean;
  pageWmm: number;
  pageHmm: number;
  /** Card position on the page (distance from the left / bottom page edge). Identical on both pages. */
  offsetXmm: number;
  offsetYmm: number;
}

/**
 * Where the card sits on the page. The card is centered on a real, fixed paper size so that
 * both PDF pages land on the same physical spot of the sheet, which is what makes a
 * two-sided print line up. A custom page ('fit') is only used when the card is wider than
 * the paper, because print drivers place odd-sized pages inconsistently.
 */
export function resolvePdfLayout(content: JCardContent): JCardPdfLayout {
  const widthMm = computeWidthMm(content);
  const heightMm = JCARD_HEIGHT_MM;
  const requestedPaper = content.paperSize ?? DEFAULT_PAPER;

  let paper: JCardPaperSize = requestedPaper;
  let pageWmm = widthMm + 2 * MARGIN_MM;
  let pageHmm = heightMm + 2 * MARGIN_MM;
  let fitsRequested = true;

  if (requestedPaper !== 'fit') {
    const size = PAPER_SIZES_MM[requestedPaper];
    fitsRequested = widthMm + 2 * MARGIN_MM <= size.w && heightMm + 2 * MARGIN_MM <= size.h;
    if (fitsRequested) {
      pageWmm = size.w;
      pageHmm = size.h;
    } else {
      paper = 'fit';
    }
  }

  return {
    widthMm,
    heightMm,
    requestedPaper,
    paper,
    fitsRequested,
    pageWmm,
    pageHmm,
    offsetXmm: (pageWmm - widthMm) / 2,
    offsetYmm: (pageHmm - heightMm) / 2,
  };
}

/** True when any inside panel has text, an image, or an inside background. */
export function jcardHasInsideContent(content: JCardContent): boolean {
  const flaps = content.flaps;
  const hasText = (v: string | undefined) => !!v && v.trim() !== '' && v.trim() !== '<p><br></p>';
  if (content.insideFlapContents?.slice(0, flaps).some(hasText)) return true;
  if (hasText(content.insideSpineContent) || hasText(content.insideBackContent)) return true;
  if (content.insideFlapImageUrls?.slice(0, flaps).some((u) => !!u)) return true;
  return !!content.insideBackPanelImageUrl || !!content.insideBackgroundImageUrl;
}

export function shouldExportInside(content: JCardContent): boolean {
  return content.exportInside ?? jcardHasInsideContent(content);
}

const twoFrames = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

export async function exportJCardToPDF(content: JCardContent, filename = 'jcard') {
  const layout = resolvePdfLayout(content);
  const { widthMm, heightMm } = layout;
  const flip = content.duplexFlip ?? DEFAULT_DUPLEX_FLIP;
  const withInside = shouldExportInside(content);
  const pageCount = withInside ? 2 : 1;

  await waitForImages(content);

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pageW = layout.pageWmm * MM_TO_PT;
  const pageH = layout.pageHmm * MM_TO_PT;
  const wPt = widthMm * MM_TO_PT;
  const hPt = heightMm * MM_TO_PT;
  const left = layout.offsetXmm * MM_TO_PT;
  const bottom = layout.offsetYmm * MM_TO_PT;
  const rect = { left, bottom, right: left + wPt, top: bottom + hPt };

  // ── Page 1: outside ─────────────────────────────────────────────────────
  const outsidePng = await snapshotCard(JCardPrintable, content, widthMm, heightMm);
  const page1 = pdf.addPage([pageW, pageH]);
  const outsideImage = await pdf.embedPng(outsidePng);
  page1.drawImage(outsideImage, { x: left, y: bottom, width: wPt, height: hPt });
  drawCropMarks(page1, rect);
  drawPageNotes(page1, font, rect, {
    heading: `OUTSIDE  -  page 1 of ${pageCount}`,
    settings: printSettingsLine(layout, flip, withInside),
  });

  // ── Page 2: inside, laid out to sit exactly behind page 1 after the duplex flip ──
  if (withInside) {
    const insidePng = await snapshotCard(JCardInsidePrintable, content, widthMm, heightMm);
    const page2 = pdf.addPage([pageW, pageH]);
    const insideImage = await pdf.embedPng(insidePng);
    if (flip === 'long') {
      // Flipping on the long edge of a landscape sheet mirrors top/bottom, not left/right.
      // The inside snapshot is drawn left/right-mirrored (book style), so rotate it 180°:
      // the panel order then matches page 1 and every panel lands behind its outside twin.
      page2.drawImage(insideImage, {
        x: rect.right,
        y: rect.top,
        width: wPt,
        height: hPt,
        rotate: degrees(180),
      });
    } else {
      // Short-edge flip mirrors left/right, which is exactly how the inside snapshot is laid out.
      page2.drawImage(insideImage, { x: left, y: bottom, width: wPt, height: hPt });
    }
    drawCropMarks(page2, rect);
    drawPageNotes(page2, font, rect, {
      heading: `INSIDE  -  page 2 of 2${flip === 'long' ? '  -  rotated 180° on purpose so it lines up after a long-edge flip' : ''}`,
      settings: printSettingsLine(layout, flip, withInside),
    });
  }

  const bytes = await pdf.save();
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.toLowerCase().replace(/\s+/g, '-')}-jcard.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── rendering helpers ──────────────────────────────────────────────────────

/** Mount a printable component off-screen at real size, snapshot it, tear it down. */
async function snapshotCard(
  component: Component,
  content: JCardContent,
  widthMm: number,
  heightMm: number,
): Promise<Uint8Array> {
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
  document.body.appendChild(host);

  let app: ReturnType<typeof createApp> | null = null;
  try {
    app = createApp({ render: () => h(component, { content }) });
    app.mount(host);
    await twoFrames();

    if ((document as any).fonts?.ready) {
      try { await (document as any).fonts.ready; } catch { /* ignore */ }
    }

    const cardEl = host.querySelector<HTMLElement>('.jcard');
    if (!cardEl) throw new Error('Printable card failed to mount');

    await inlineCrossOriginFonts(host);
    inlineCustomFonts(host, content);

    const pngDataUrl = await toPng(cardEl, {
      pixelRatio: SNAPSHOT_PIXEL_RATIO,
      cacheBust: true,
      width: widthMm * MM_TO_PX,
      height: heightMm * MM_TO_PX,
      style: { transform: 'none', margin: '0' },
      backgroundColor: content.backgroundColor || '#ffffff',
    });
    return dataUrlToUint8Array(pngDataUrl);
  } finally {
    try { app?.unmount(); } catch { /* ignore */ }
    if (host.parentNode) host.parentNode.removeChild(host);
  }
}

interface CardRect { left: number; right: number; bottom: number; top: number }

function drawCropMarks(page: PDFPage, { left, right, bottom, top }: CardRect) {
  const g = CROP_GAP_MM * MM_TO_PT;
  const l = CROP_LEN_MM * MM_TO_PT;
  const lineOpts = { thickness: CROP_WIDTH_PT, color: rgb(0, 0, 0) };
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, ...lineOpts });

  line(left - g - l, bottom, left - g, bottom);
  line(left, bottom - g - l, left, bottom - g);
  line(right + g, bottom, right + g + l, bottom);
  line(right, bottom - g - l, right, bottom - g);
  line(left - g - l, top, left - g, top);
  line(left, top + g, left, top + g + l);
  line(right + g, top, right + g + l, top);
  line(right, top + g, right, top + g + l);
}

function printSettingsLine(layout: JCardPdfLayout, flip: JCardDuplexFlip, withInside: boolean): string {
  const paper = layout.paper === 'fit'
    ? `custom page ${layout.pageWmm.toFixed(0)} x ${layout.pageHmm.toFixed(0)} mm`
    : `${PAPER_SIZES_MM[layout.paper].label} landscape`;
  const duplex = withInside
    ? `  -  two-sided, flip on ${flip} edge`
    : '';
  return `Print at 100% / actual size (never "fit to page")  -  ${paper}${duplex}  -  the bar below must measure ${SCALE_BAR_MM} mm`;
}

/**
 * Small notes in the margins: a heading above the card, print settings and a
 * calibration bar below it. Everything stays within MARGIN_MM of the card so it
 * also fits on a custom page.
 */
function drawPageNotes(
  page: PDFPage,
  font: PDFFont,
  rect: CardRect,
  notes: { heading: string; settings: string },
) {
  const ink = rgb(0.25, 0.25, 0.25);
  const maxWidth = rect.right - rect.left;

  const headingY = rect.top + (CROP_GAP_MM + CROP_LEN_MM + 2) * MM_TO_PT;
  page.drawText(fitText(notes.heading, font, NOTE_PT, maxWidth), {
    x: rect.left, y: headingY, size: NOTE_PT, font, color: ink,
  });

  // Calibration bar: a horizontal line with end ticks, exactly SCALE_BAR_MM long.
  const barY = rect.bottom - 9.5 * MM_TO_PT;
  const barEnd = rect.left + SCALE_BAR_MM * MM_TO_PT;
  const tick = 1.2 * MM_TO_PT;
  const barOpts = { thickness: 0.6, color: rgb(0, 0, 0) };
  page.drawLine({ start: { x: rect.left, y: barY }, end: { x: barEnd, y: barY }, ...barOpts });
  page.drawLine({ start: { x: rect.left, y: barY - tick }, end: { x: rect.left, y: barY + tick }, ...barOpts });
  page.drawLine({ start: { x: barEnd, y: barY - tick }, end: { x: barEnd, y: barY + tick }, ...barOpts });

  const labelX = barEnd + 2 * MM_TO_PT;
  const label = `${SCALE_BAR_MM} mm`;
  page.drawText(label, { x: labelX, y: barY - NOTE_PT * 0.35, size: NOTE_PT, font, color: ink });

  const settingsX = labelX + font.widthOfTextAtSize(label, NOTE_PT) + 4 * MM_TO_PT;
  const settingsWidth = rect.right - settingsX;
  if (settingsWidth > 20 * MM_TO_PT) {
    page.drawText(fitText(notes.settings, font, NOTE_PT, settingsWidth), {
      x: settingsX, y: barY - NOTE_PT * 0.35, size: NOTE_PT, font, color: ink,
    });
  } else {
    // Narrow card: put the settings on their own line under the bar instead.
    page.drawText(fitText(notes.settings, font, NOTE_PT, maxWidth), {
      x: rect.left, y: barY - tick - NOTE_PT, size: NOTE_PT, font, color: ink,
    });
  }
}

/** Trim a string with an ellipsis until it fits the given width. */
function fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, size) > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}...`;
}

// ─── asset helpers ──────────────────────────────────────────────────────────

function inlineCustomFonts(host: HTMLElement, content: JCardContent): void {
  if (!content.customFonts?.length) return;
  const css = content.customFonts
    .map((f) => `@font-face { font-family: '${f.name}'; src: url('data:${f.mimeType};base64,${f.data}'); }`)
    .join('\n');
  const style = document.createElement('style');
  style.textContent = css;
  host.prepend(style);
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function inlineCrossOriginFonts(host: HTMLElement): Promise<void> {
  const externalLinks = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  ).filter((l) => {
    try { return new URL(l.href).origin !== window.location.origin; }
    catch { return false; }
  });

  if (externalLinks.length === 0) return;

  const results = await Promise.allSettled(
    externalLinks.map((l) =>
      fetch(l.href, { mode: 'cors' }).then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${l.href}`);
        return r.text();
      }),
    ),
  );

  const combined = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
    .map((r) => r.value)
    .join('\n');

  if (combined) {
    const inlined = await inlineFontBinaries(combined);
    const style = document.createElement('style');
    style.textContent = inlined;
    host.prepend(style);
  }
}

async function inlineFontBinaries(css: string): Promise<string> {
  const urlRe = /url\(['"]?(https?:\/\/[^'")\s]+\.(?:woff2?|ttf|otf|eot)[^'")\s]*)['"]?\)/gi;
  const uniqueUrls = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(css)) !== null) uniqueUrls.add(m[1]);
  if (uniqueUrls.size === 0) return css;

  const dataMap = new Map<string, string>();
  await Promise.allSettled(
    [...uniqueUrls].map(async (url) => {
      try {
        const r = await fetch(url, { mode: 'cors' });
        if (!r.ok) return;
        const buf = await r.arrayBuffer();
        const b64 = await arrayBufferToBase64(buf);
        const mime = guessFontMime(url);
        dataMap.set(url, `data:${mime};base64,${b64}`);
      } catch { /* leave original url */ }
    }),
  );

  if (dataMap.size === 0) return css;

  return css.replace(
    /url\(['"]?(https?:\/\/[^'")\s]+\.(?:woff2?|ttf|otf|eot)[^'")\s]*)['"]?\)/gi,
    (orig, url) => {
      const data = dataMap.get(url);
      return data ? `url('${data}')` : orig;
    },
  );
}

function guessFontMime(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('.woff2')) return 'font/woff2';
  if (lower.includes('.woff')) return 'font/woff';
  if (lower.includes('.ttf')) return 'font/truetype';
  if (lower.includes('.otf')) return 'font/opentype';
  if (lower.includes('.eot')) return 'application/vnd.ms-fontobject';
  return 'font/woff2';
}

function arrayBufferToBase64(buf: ArrayBuffer): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    reader.readAsDataURL(new Blob([buf]));
  });
}

/** Every image URL the card can reference, outside and inside. */
function collectImageUrls(content: JCardContent): string[] {
  const urls = [
    content.backgroundImageUrl,
    content.coverImageUrl,
    content.backPanelImageUrl,
    content.insideBackgroundImageUrl,
    content.insideBackPanelImageUrl,
    ...(content.flapImageUrls ?? []),
    ...(content.insideFlapImageUrls ?? []),
  ];
  return [...new Set(urls.filter((u): u is string => typeof u === 'string' && u.length > 0))];
}

/** Warm the browser cache so the snapshot does not race image loads. */
function waitForImages(content: JCardContent): Promise<void> {
  const urls = collectImageUrls(content);
  if (urls.length === 0) return Promise.resolve();

  return Promise.all(
    urls.map((url) => new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    })),
  ).then(() => undefined);
}

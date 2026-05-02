import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { PDFDocument, rgb } from 'pdf-lib';
import { toPng } from 'html-to-image';
import { JCardContent } from '../types';
import { JCARD_HEIGHT_MM, computeWidthMm } from '../components/jcard/dimensions';
import JCardPrintable from '../components/jcard/JCardPrintable';

// PDF points: 72 pt = 1 inch, 1 mm = 72 / 25.4 pt
const MM_TO_PT = 72 / 25.4;
// CSS px: 96 dpi reference, 1 mm = 96 / 25.4 px
const MM_TO_PX = 96 / 25.4;

// How many output pixels per CSS pixel when snapshotting. Higher = sharper
// PDF but larger file. 4 ≈ 384 dpi at 96 css-dpi, more than enough for print.
const SNAPSHOT_PIXEL_RATIO = 4;

// White margin added around the card on the printed page (mm).
const MARGIN_MM = 10;

// Crop mark settings (mm). The gap keeps the mark off the card edge;
// the arm length is how long each tick line extends outward.
const CROP_GAP_MM  = 1.5;
const CROP_LEN_MM  = 5;
const CROP_WIDTH_PT = 0.5; // line thickness in PDF points

/**
 * Mount `JCardPrintable` into a hidden, exact-size DOM node, snapshot it
 * with html-to-image at high DPI, and embed the PNG in a one-page PDF
 * sized to the j-card's real-world dimensions.
 *
 * This replaces the previous hand-rolled pdf-lib drawing code: whatever
 * the on-screen designer renders is what ends up in the PDF, with no
 * parallel layout engine to keep in sync.
 */
export async function exportJCardToPDF(content: JCardContent, filename = 'jcard') {
  const widthMm  = computeWidthMm(content);
  const heightMm = JCARD_HEIGHT_MM;
  const widthPx  = widthMm  * MM_TO_PX;
  const heightPx = heightMm * MM_TO_PX;

  // Off-screen host. Positioned far off the viewport so it never flashes
  // or steals focus. Sized to the exact CSS-mm footprint of the card.
  const host = document.createElement('div');
  host.style.cssText = [
    'position: fixed',
    'left: -100000px',
    'top: 0',
    'pointer-events: none',
    `width: ${widthMm}mm`,
    `height: ${heightMm}mm`,
    'background: transparent',
    // make sure browser print/zoom features don't mess with the layout
    'zoom: 1',
    'transform: none',
  ].join(';');
  document.body.appendChild(host);

  let root: Root | null = null;
  try {
    // Render the printable card synchronously, then wait one frame so
    // layout, fonts, and images have a chance to settle before snapshot.
    root = createRoot(host);
    await new Promise<void>(resolve => {
      root!.render(React.createElement(JCardPrintable, { content }));
      // Two RAFs ≈ "after the next paint", which is enough for layout.
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    // Make sure web fonts have loaded — if the user's CSS uses custom
    // typefaces, html-to-image will otherwise rasterize them as fallback.
    if ((document as any).fonts?.ready) {
      try { await (document as any).fonts.ready; } catch { /* ignore */ }
    }

    // Grab the card element BEFORE inlineCrossOriginFonts, which calls
    // host.prepend(<style>) — that would shift host.firstElementChild away
    // from the .jcard element onto the injected <style> tag.
    // querySelector('.jcard') is explicit and order-independent.
    const cardEl = host.querySelector<HTMLElement>('.jcard');
    if (!cardEl) throw new Error('JCardPrintable failed to mount');

    // html-to-image tries to read cssRules from every linked stylesheet so it
    // can inline them. Cross-origin sheets (Google Fonts) throw a SecurityError
    // when cssRules is accessed. We work around this by fetching those CSS
    // files ourselves via fetch() (which respects CORS headers and succeeds),
    // then injecting them as a same-origin <style> element in the off-screen
    // host — html-to-image will read our injected copy instead.
    await inlineCrossOriginFonts(host);

    // Make sure any background images have actually finished decoding.
    await waitForImages(content);

    const pngDataUrl = await toPng(cardEl, {
      pixelRatio: SNAPSHOT_PIXEL_RATIO,
      cacheBust: true,
      // Force the canvas to the exact CSS size of the card so the
      // resulting bitmap has predictable mm-aligned dimensions.
      width:  widthPx,
      height: heightPx,
      style: {
        // html-to-image clones with the live computed styles; clear any
        // outer transforms so the clone renders at scale=1.
        transform: 'none',
        margin: '0',
      },
      backgroundColor: content.backgroundColor || '#ffffff',
    });

    // Build the PDF. Page size includes margin on all four sides.
    // pdf-lib uses bottom-left origin, so y=MARGIN_MM places the card
    // MARGIN_MM above the bottom of the page.
    const pageW = (widthMm  + 2 * MARGIN_MM) * MM_TO_PT;
    const pageH = (heightMm + 2 * MARGIN_MM) * MM_TO_PT;
    const pdf  = await PDFDocument.create();
    const page = pdf.addPage([pageW, pageH]);
    const pngBytes = dataUrlToUint8Array(pngDataUrl);
    const pngImage = await pdf.embedPng(pngBytes);
    page.drawImage(pngImage, {
      x: MARGIN_MM * MM_TO_PT,
      y: MARGIN_MM * MM_TO_PT,
      width:  widthMm  * MM_TO_PT,
      height: heightMm * MM_TO_PT,
    });

    // ── Crop marks ────────────────────────────────────────────────────────
    // pdf-lib uses bottom-left origin. Convert all measurements to points.
    const mPt   = MARGIN_MM  * MM_TO_PT;   // margin in pt
    const wPt   = widthMm    * MM_TO_PT;   // card width in pt
    const hPt   = heightMm   * MM_TO_PT;   // card height in pt
    const gPt   = CROP_GAP_MM * MM_TO_PT;  // gap from card edge
    const lPt   = CROP_LEN_MM * MM_TO_PT;  // arm length
    const markColor = rgb(0, 0, 0);
    const lineOpts = { thickness: CROP_WIDTH_PT, color: markColor };

    // Helper: card edges in PDF coordinates
    const left   = mPt;
    const right  = mPt + wPt;
    const bottom = mPt;
    const top    = mPt + hPt;

    // Bottom-left
    page.drawLine({ start: { x: left - gPt - lPt, y: bottom }, end: { x: left - gPt, y: bottom }, ...lineOpts });
    page.drawLine({ start: { x: left, y: bottom - gPt - lPt }, end: { x: left, y: bottom - gPt }, ...lineOpts });

    // Bottom-right
    page.drawLine({ start: { x: right + gPt, y: bottom }, end: { x: right + gPt + lPt, y: bottom }, ...lineOpts });
    page.drawLine({ start: { x: right, y: bottom - gPt - lPt }, end: { x: right, y: bottom - gPt }, ...lineOpts });

    // Top-left
    page.drawLine({ start: { x: left - gPt - lPt, y: top }, end: { x: left - gPt, y: top }, ...lineOpts });
    page.drawLine({ start: { x: left, y: top + gPt }, end: { x: left, y: top + gPt + lPt }, ...lineOpts });

    // Top-right
    page.drawLine({ start: { x: right + gPt, y: top }, end: { x: right + gPt + lPt, y: top }, ...lineOpts });
    page.drawLine({ start: { x: right, y: top + gPt }, end: { x: right, y: top + gPt + lPt }, ...lineOpts });

    const bytes = await pdf.save();
    const blob  = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = `${filename.toLowerCase().replace(/\s+/g, '-')}-jcard.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    // Always clean up — the off-screen host must not leak into the DOM.
    try { root?.unmount(); } catch { /* ignore */ }
    if (host.parentNode) host.parentNode.removeChild(host);
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  const b64   = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bin   = atob(b64);
  const out   = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Fetch every cross-origin font stylesheet linked in the document (e.g.
 * fonts.googleapis.com) and inject the CSS as a same-origin <style> element
 * inside the off-screen host.
 *
 * Problem: html-to-image reads `sheet.cssRules` on every linked stylesheet
 * to inline fonts before snapshotting. The browser blocks that property on
 * cross-origin sheets with a SecurityError, so Google Fonts stylesheets
 * can't be inlined and the fonts may fall back in the PNG.
 *
 * Solution: fetch() honours CORS response headers and succeeds where
 * cssRules access fails. We retrieve the CSS text, create a <style> element
 * (same-origin by definition), and prepend it to the host. html-to-image
 * finds our injected copy and reads it without error.
 */
async function inlineCrossOriginFonts(host: HTMLElement): Promise<void> {
  const externalLinks = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  ).filter(l => {
    try { return new URL(l.href).origin !== window.location.origin; }
    catch { return false; }
  });

  if (externalLinks.length === 0) return;

  const results = await Promise.allSettled(
    externalLinks.map(l =>
      fetch(l.href, { mode: 'cors' }).then(r => {
        if (!r.ok) throw new Error(`${r.status} ${l.href}`);
        return r.text();
      }),
    ),
  );

  const combined = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
    .map(r => r.value)
    .join('\n');

  if (combined) {
    const style = document.createElement('style');
    style.textContent = combined;
    host.prepend(style);
  }
}

/**
 * Pre-load each image referenced by the card content. html-to-image will
 * also fetch them, but pre-loading guarantees they're in the browser cache
 * (and decoded) by the time we snapshot, and surfaces CORS errors early.
 */
function waitForImages(content: JCardContent): Promise<void> {
  const urls = [content.backgroundImageUrl, content.coverImageUrl].filter(
    (u): u is string => typeof u === 'string' && u.length > 0,
  );
  if (urls.length === 0) return Promise.resolve();

  return Promise.all(urls.map(url => new Promise<void>(resolve => {
    const img = new Image();
    // Allow tainted-canvas-free reuse in html-to-image when the host serves CORS.
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve();
    img.onerror = () => resolve(); // don't block export on a bad image URL
    img.src = url;
  }))).then(() => undefined);
}

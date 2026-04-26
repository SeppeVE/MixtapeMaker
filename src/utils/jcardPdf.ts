import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { PDFDocument } from 'pdf-lib';
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

    // Make sure any background images have actually finished decoding.
    await waitForImages(content);

    // The element html-to-image should snapshot is the `.jcard` itself,
    // not the host (the host has the off-screen positioning).
    const cardEl = host.firstElementChild as HTMLElement | null;
    if (!cardEl) throw new Error('JCardPrintable failed to mount');

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

    // Build the PDF. Page size is in PDF points = mm × 72/25.4.
    const pdf  = await PDFDocument.create();
    const page = pdf.addPage([widthMm * MM_TO_PT, heightMm * MM_TO_PT]);
    const pngBytes = dataUrlToUint8Array(pngDataUrl);
    const pngImage = await pdf.embedPng(pngBytes);
    page.drawImage(pngImage, {
      x: 0,
      y: 0,
      width:  widthMm  * MM_TO_PT,
      height: heightMm * MM_TO_PT,
    });

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

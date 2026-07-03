import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { PDFDocument, rgb } from 'pdf-lib';
import { toPng } from 'html-to-image';
import { JCardContent } from '../types';
import { JCARD_HEIGHT_MM, computeWidthMm } from '../components/jcard/dimensions';
import JCardPrintable from '../components/jcard/JCardPrintable';
import JCardInsidePrintable from '../components/jcard/JCardInsidePrintable';

const MM_TO_PT = 72 / 25.4;
const MM_TO_PX = 96 / 25.4;
const SNAPSHOT_PIXEL_RATIO = 4;
const MARGIN_MM = 10;
const CROP_GAP_MM  = 1.5;
const CROP_LEN_MM  = 5;
const CROP_WIDTH_PT = 0.5;

export async function exportJCardToPDF(content: JCardContent, filename = 'jcard') {
  const widthMm  = computeWidthMm(content);
  const heightMm = JCARD_HEIGHT_MM;
  const widthPx  = widthMm  * MM_TO_PX;
  const heightPx = heightMm * MM_TO_PX;

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

  let root: Root | null = null;
  try {
    root = createRoot(host);
    await new Promise<void>(resolve => {
      root!.render(React.createElement(JCardPrintable, { content }));
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    if ((document as any).fonts?.ready) {
      try { await (document as any).fonts.ready; } catch { /* ignore */ }
    }

    const cardEl = host.querySelector<HTMLElement>('.jcard');
    if (!cardEl) throw new Error('JCardPrintable failed to mount');

    await inlineCrossOriginFonts(host);
    inlineCustomFonts(host, content);
    await waitForImages(content);

    const pngDataUrl = await toPng(cardEl, {
      pixelRatio: SNAPSHOT_PIXEL_RATIO,
      cacheBust: true,
      width:  widthPx,
      height: heightPx,
      style: {
        transform: 'none',
        margin: '0',
      },
      backgroundColor: content.backgroundColor || '#ffffff',
    });

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

    const mPt   = MARGIN_MM  * MM_TO_PT;
    const wPt   = widthMm    * MM_TO_PT;
    const hPt   = heightMm   * MM_TO_PT;
    const gPt   = CROP_GAP_MM * MM_TO_PT;
    const lPt   = CROP_LEN_MM * MM_TO_PT;
    const markColor = rgb(0, 0, 0);
    const lineOpts = { thickness: CROP_WIDTH_PT, color: markColor };

    const left   = mPt;
    const right  = mPt + wPt;
    const bottom = mPt;
    const top    = mPt + hPt;

    page.drawLine({ start: { x: left - gPt - lPt, y: bottom }, end: { x: left - gPt, y: bottom }, ...lineOpts });
    page.drawLine({ start: { x: left, y: bottom - gPt - lPt }, end: { x: left, y: bottom - gPt }, ...lineOpts });
    page.drawLine({ start: { x: right + gPt, y: bottom }, end: { x: right + gPt + lPt, y: bottom }, ...lineOpts });
    page.drawLine({ start: { x: right, y: bottom - gPt - lPt }, end: { x: right, y: bottom - gPt }, ...lineOpts });
    page.drawLine({ start: { x: left - gPt - lPt, y: top }, end: { x: left - gPt, y: top }, ...lineOpts });
    page.drawLine({ start: { x: left, y: top + gPt }, end: { x: left, y: top + gPt + lPt }, ...lineOpts });
    page.drawLine({ start: { x: right + gPt, y: top }, end: { x: right + gPt + lPt, y: top }, ...lineOpts });
    page.drawLine({ start: { x: right, y: top + gPt }, end: { x: right, y: top + gPt + lPt }, ...lineOpts });

    // ── Page 2: inside panels (double-sided print, reverse order) ────────
    const hasInsideContent =
      content.insideFlapContents?.some(f => f.trim()) ||
      !!content.insideSpineContent?.trim() ||
      !!content.insideBackContent?.trim();

    if (hasInsideContent) {
      const insideHost = document.createElement('div');
      insideHost.style.cssText = [
        'position: fixed', 'left: -100000px', 'top: 0',
        'pointer-events: none',
        `width: ${widthMm}mm`, `height: ${heightMm}mm`,
        'background: transparent', 'zoom: 1', 'transform: none',
      ].join(';');
      document.body.appendChild(insideHost);
      let insideRoot: Root | null = null;
      try {
        insideRoot = createRoot(insideHost);
        await new Promise<void>(resolve => {
          insideRoot!.render(React.createElement(JCardInsidePrintable, { content }));
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        if ((document as any).fonts?.ready) {
          try { await (document as any).fonts.ready; } catch { /* ignore */ }
        }
        const insideCardEl = insideHost.querySelector<HTMLElement>('.jcard');
        if (insideCardEl) {
          await inlineCrossOriginFonts(insideHost);
          inlineCustomFonts(insideHost, content);
          const insidePngUrl = await toPng(insideCardEl, {
            pixelRatio: SNAPSHOT_PIXEL_RATIO,
            cacheBust: true,
            width: widthPx, height: heightPx,
            style: { transform: 'none', margin: '0' },
            backgroundColor: content.backgroundColor || '#ffffff',
          });
          const page2 = pdf.addPage([pageW, pageH]);
          const insideBytes = dataUrlToUint8Array(insidePngUrl);
          const insideImage = await pdf.embedPng(insideBytes);
          page2.drawImage(insideImage, {
            x: MARGIN_MM * MM_TO_PT, y: MARGIN_MM * MM_TO_PT,
            width: widthMm * MM_TO_PT, height: heightMm * MM_TO_PT,
          });
          page2.drawLine({ start: { x: left - gPt - lPt, y: bottom }, end: { x: left - gPt, y: bottom }, ...lineOpts });
          page2.drawLine({ start: { x: left, y: bottom - gPt - lPt }, end: { x: left, y: bottom - gPt }, ...lineOpts });
          page2.drawLine({ start: { x: right + gPt, y: bottom }, end: { x: right + gPt + lPt, y: bottom }, ...lineOpts });
          page2.drawLine({ start: { x: right, y: bottom - gPt - lPt }, end: { x: right, y: bottom - gPt }, ...lineOpts });
          page2.drawLine({ start: { x: left - gPt - lPt, y: top }, end: { x: left - gPt, y: top }, ...lineOpts });
          page2.drawLine({ start: { x: left, y: top + gPt }, end: { x: left, y: top + gPt + lPt }, ...lineOpts });
          page2.drawLine({ start: { x: right + gPt, y: top }, end: { x: right + gPt + lPt, y: top }, ...lineOpts });
          page2.drawLine({ start: { x: right, y: top + gPt }, end: { x: right, y: top + gPt + lPt }, ...lineOpts });
        }
      } finally {
        try { insideRoot?.unmount(); } catch { /* ignore */ }
        if (insideHost.parentNode) insideHost.parentNode.removeChild(insideHost);
      }
    }

    const bytes = await pdf.save();
    const blob  = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = `${filename.toLowerCase().replace(/\s+/g, '-')}-jcard.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    try { root?.unmount(); } catch { /* ignore */ }
    if (host.parentNode) host.parentNode.removeChild(host);
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Inject @font-face rules for user-uploaded custom fonts directly into the
 * snapshot host element so html-to-image can find them in a real stylesheet.
 *
 * Custom fonts are registered via the FontFace API (document.fonts.add) which
 * does NOT appear in document.styleSheets — html-to-image therefore never sees
 * them and the rendered PNG falls back to the browser's default serif.
 * Injecting an explicit <style> block with data-URL sources fixes this.
 */
function inlineCustomFonts(host: HTMLElement, content: JCardContent): void {
  if (!content.customFonts?.length) return;
  const css = content.customFonts
    .map(
      f =>
        `@font-face { font-family: '${f.name}'; src: url('data:${f.mimeType};base64,${f.data}'); }`,
    )
    .join('\n');
  const style = document.createElement('style');
  style.textContent = css;
  host.prepend(style);
}


function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  const b64   = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bin   = atob(b64);
  const out   = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

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
    [...uniqueUrls].map(async url => {
      try {
        const r = await fetch(url, { mode: 'cors' });
        if (!r.ok) return;
        const buf  = await r.arrayBuffer();
        const b64  = await arrayBufferToBase64(buf);
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
  if (lower.includes('.woff'))  return 'font/woff';
  if (lower.includes('.ttf'))   return 'font/truetype';
  if (lower.includes('.otf'))   return 'font/opentype';
  if (lower.includes('.eot'))   return 'application/vnd.ms-fontobject';
  return 'font/woff2';
}

function arrayBufferToBase64(buf: ArrayBuffer): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    reader.readAsDataURL(new Blob([buf]));
  });
}

function waitForImages(content: JCardContent): Promise<void> {
  const urls = [content.backgroundImageUrl, content.coverImageUrl].filter(
    (u): u is string => typeof u === 'string' && u.length > 0,
  );
  if (urls.length === 0) return Promise.resolve();

  return Promise.all(urls.map(url => new Promise<void>(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  }))).then(() => undefined);
}

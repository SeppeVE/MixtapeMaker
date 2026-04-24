import { PDFDocument, PDFFont, StandardFonts, rgb, degrees, PDFPage } from 'pdf-lib';
import { JCardContent } from '../types';
import { JCARD_HEIGHT_MM, BACK_FULL_MM, BACK_SHORT_MM, SPINE_MM, FLAPS_MM, computeWidthMm } from '../components/jcard/dimensions';

// ─── Units ───────────────────────────────────────────────────────────────────
// pdf-lib uses PDF points (72 pt = 1 inch).
// Page origin is BOTTOM-LEFT; y increases UPWARD.
// CSS rotate(90deg) = CW = pdf-lib degrees(-90).

const MM = 72 / 25.4; // points per mm

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const c    = hex.replace('#', '');
  const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
  const n    = parseInt(full, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function embedImg(pdf: PDFDocument, url: string) {
  try {
    const buf   = await (await fetch(url)).arrayBuffer();
    const bytes = new Uint8Array(buf);
    try {
      return (url.match(/\.jpe?g/i) || url.startsWith('data:image/jpeg'))
        ? await pdf.embedJpg(bytes)
        : await pdf.embedPng(bytes);
    } catch {
      try { return await pdf.embedJpg(bytes); } catch { return await pdf.embedPng(bytes); }
    }
  } catch { return null; }
}

async function drawImg(
  pdf: PDFDocument, page: PDFPage,
  url: string, xMm: number, yMm: number, wMm: number, hMm: number,
) {
  const img = await embedImg(pdf, url);
  if (!img) return;
  const d     = img.scale(1);
  const scale = Math.max(wMm * MM / d.width, hMm * MM / d.height);
  const iw    = d.width * scale;
  const ih    = d.height * scale;
  page.drawImage(img, {
    x:      xMm * MM + (wMm * MM - iw) / 2,
    y:      yMm * MM + (hMm * MM - ih) / 2,
    width:  iw,
    height: ih,
  });
}

// ─── Rotated text helpers ─────────────────────────────────────────────────────
//
// The J-card preview uses CSS `rotate(90deg)` which is CW.
// In pdf-lib (y-up coords), the equivalent is degrees(-90).
//
// With degrees(-90):
//   • The text baseline runs DOWNWARD from the anchor point.
//   • First character is at (x, y); subsequent characters are at lower y values.
//   • To place a text block that STARTS at the top of the card:
//       y_anchor = pageHeight - topMargin
//   • To place a text block that ENDS at the bottom:
//       y_anchor = bottomMargin + textWidth
//   • To centre text at a given y:
//       y_anchor = targetY + textWidth / 2

function drawRotatedText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  x: number,      // page x in pts
  yAnchor: number, // page y in pts (first-char baseline; text flows down from here)
  rotDeg: number, // -90 normal, +90 reversed
) {
  if (!text.trim()) return;
  page.drawText(text, {
    x,
    y:      yAnchor,
    font,
    size,
    color:  rgb(0, 0, 0),
    rotate: degrees(rotDeg),
  });
}

// Draw a multi-line block of rotated text.
// Each visual "line" (paragraph) is drawn as a separate drawText call offset in x.
// In the CW-rotated view, moving LEFT in PDF space = moving DOWN visually.
// The first line (index 0) is the rightmost column (appears at top in reading order).
// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportJCardToPDF(content: JCardContent, filename = 'jcard') {
  const pdf  = await PDFDocument.create();
  const H    = JCARD_HEIGHT_MM;         // mm
  const W    = computeWidthMm(content); // mm
  const page = pdf.addPage([W * MM, H * MM]);

  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg  = await pdf.embedFont(StandardFonts.Helvetica);
  const { r, g, b } = hexToRgb(content.backgroundColor);

  // Font sizes (pt)
  const FS_BACK  = 5.5;
  const FS_SPINE = 6.5;
  const FS_COVER = 7;

  // Line height for back panel multi-line columns
  const LINE_H = FS_BACK * 1.45;

  // Margins (pt)
  const MY = 3.5 * MM; // vertical margin from card top/bottom
  const MX = 1.2 * MM; // horizontal margin from column edges

  // Y anchor for text that STARTS reading at the top of the card
  const Y_TOP = H * MM - MY;

  // Rotation: CSS rotate(90deg) CW = pdf-lib degrees(-90)
  const ROT = content.isReversed ? 90 : -90;

  // Build ordered parts
  interface Part { type: 'back' | 'spine' | 'flap'; index?: number; wMm: number; }
  const partsLtr: Part[] = [
    { type: 'back',  wMm: content.shortBack ? BACK_SHORT_MM : BACK_FULL_MM },
    { type: 'spine', wMm: SPINE_MM },
    ...Array.from({ length: content.flaps }, (_, i) =>
      ({ type: 'flap' as const, index: i, wMm: FLAPS_MM[i] })),
  ];
  const parts = content.isReversed ? [...partsLtr].reverse() : partsLtr;

  let cxPt = 0; // current x cursor in pts

  for (const part of parts) {
    const wPt = part.wMm * MM;

    // Fill background
    page.drawRectangle({ x: cxPt, y: 0, width: wPt, height: H * MM, color: rgb(r, g, b) });
    if (content.backgroundImageUrl) {
      await drawImg(pdf, page, content.backgroundImageUrl, cxPt / MM, 0, part.wMm, H);
    }

    // ── Back panel ──────────────────────────────────────────────────────────
    if (part.type === 'back') {
      const rawA = content.isReversed ? content.backRightContent : content.backLeftContent;
      const rawB = content.isReversed ? content.backLeftContent  : content.backRightContent;
      const linesA = stripHtml(rawA).split('\n').filter(l => l.trim());
      const linesB = stripHtml(rawB).split('\n').filter(l => l.trim());

      // Right half of back panel → Side A
      // Line[0] is rightmost (x = right edge − MX), each subsequent line is further left.
      // Clamp so lines don't cross into the left half.
      const rightEdge = cxPt + wPt - MX;
      const halfEdge  = cxPt + wPt / 2;
      linesA.forEach((line, i) => {
        const x = rightEdge - i * LINE_H;
        if (x < halfEdge) return; // overflow guard
        drawRotatedText(page, line, i === 0 ? bold : reg, FS_BACK, x, Y_TOP, ROT);
      });

      // Left half → Side B
      const halfRight = cxPt + wPt / 2 - MX;
      linesB.forEach((line, i) => {
        const x = halfRight - i * LINE_H;
        if (x < cxPt) return; // overflow guard
        drawRotatedText(page, line, i === 0 ? bold : reg, FS_BACK, x, Y_TOP, ROT);
      });

      // Dashed centre fold line
      page.drawLine({
        start:     { x: cxPt + wPt / 2, y: 0 },
        end:       { x: cxPt + wPt / 2, y: H * MM },
        thickness: 0.35,
        color:     rgb(0.75, 0, 0),
        dashArray: [2, 3],
        dashPhase: 0,
      });
    }

    // ── Spine ────────────────────────────────────────────────────────────────
    if (part.type === 'spine') {
      const xSp  = cxPt + wPt / 2; // centre of spine strip
      const top  = stripHtml(content.spineTopContent).split('\n').filter(Boolean)[0] ?? '';
      const ctr  = stripHtml(content.spineCenterContent).split('\n').filter(Boolean)[0] ?? '';
      const bot  = stripHtml(content.spineBottomContent).split('\n').filter(Boolean)[0] ?? '';

      // Top item: anchor near top, text flows downward
      if (top) drawRotatedText(page, top, bold, FS_SPINE, xSp, Y_TOP, ROT);

      // Centre item: anchor so text is centred at H/2
      if (ctr) {
        const tw = reg.widthOfTextAtSize(ctr, FS_SPINE);
        drawRotatedText(page, ctr, reg, FS_SPINE, xSp, (H / 2) * MM + tw / 2, ROT);
      }

      // Bottom item: anchor so text ends at bottom margin
      if (bot) {
        const tw = reg.widthOfTextAtSize(bot, FS_SPINE);
        drawRotatedText(page, bot, reg, FS_SPINE, xSp, MY + tw, ROT);
      }
    }

    // ── Cover flap (index 0) ─────────────────────────────────────────────────
    if (part.type === 'flap' && part.index === 0) {
      if (content.coverImageUrl) {
        const imgHmm = content.isFullCoverImage ? H : part.wMm;
        const imgYmm = content.isFullCoverImage ? 0 : H - imgHmm;
        await drawImg(pdf, page, content.coverImageUrl, cxPt / MM, imgYmm, part.wMm, imgHmm);
      }

      const txt = stripHtml(content.coverContent);
      const showText = txt && (!content.isFullCoverImage || content.coverImageBehindContent);
      if (showText) {
        const lineH = (FS_COVER + 1) * 1.35;
        txt.split('\n').slice(0, 10).forEach((line, i) => {
          if (!line.trim()) return;
          page.drawText(line.trim(), {
            x:     cxPt + 2 * MM,
            y:     H * MM - 4 * MM - i * lineH,
            font:  i === 0 ? bold : reg,
            size:  FS_COVER,
            color: rgb(0, 0, 0),
          });
        });
      }
    }

    // ── Blank flaps ───────────────────────────────────────────────────────────
    // (nothing to draw beyond background already filled above)

    // ── Part fold line (right edge of each part except the last) ─────────────
    page.drawLine({
      start:     { x: cxPt + wPt, y: 0 },
      end:       { x: cxPt + wPt, y: H * MM },
      thickness: 0.35,
      color:     rgb(0.75, 0, 0),
      dashArray: [2, 3],
      dashPhase: 0,
    });

    cxPt += wPt;
  }

  const bytes = await pdf.save();
  const blob  = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href = url;
  a.download = `${filename.toLowerCase().replace(/\s+/g, '-')}-jcard.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

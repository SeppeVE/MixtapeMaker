import { PDFDocument, StandardFonts, rgb, degrees, PDFPage } from 'pdf-lib';
import { JCardContent } from '../types';
import { JCARD_HEIGHT_MM, BACK_FULL_MM, BACK_SHORT_MM, SPINE_MM, FLAPS_MM, computeWidthMm } from '../components/jcard/dimensions';

const MM = 72 / 25.4;

function hexToRgb(hex: string) {
  const c = hex.replace('#', '');
  const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
  const n = parseInt(full, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

function stripHtml(html: string): string {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n').trim();
}

async function embedImg(pdf: PDFDocument, url: string) {
  try {
    const buf = await (await fetch(url)).arrayBuffer();
    const bytes = new Uint8Array(buf);
    try { return url.match(/\.jpe?g/i) || url.startsWith('data:image/jpeg') ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes); }
    catch { try { return await pdf.embedJpg(bytes); } catch { return await pdf.embedPng(bytes); } }
  } catch { return null; }
}

async function drawImg(pdf: PDFDocument, page: PDFPage, url: string, x: number, y: number, w: number, h: number) {
  const img = await embedImg(pdf, url);
  if (!img) return;
  const d = img.scale(1);
  const scale = Math.max(w * MM / d.width, h * MM / d.height);
  const iw = d.width * scale, ih = d.height * scale;
  page.drawImage(img, { x: x * MM + (w * MM - iw) / 2, y: y * MM + (h * MM - ih) / 2, width: iw, height: ih });
}

export async function exportJCardToPDF(content: JCardContent, filename = 'jcard') {
  const pdf  = await PDFDocument.create();
  const h    = JCARD_HEIGHT_MM;
  const w    = computeWidthMm(content);
  const page = pdf.addPage([w * MM, h * MM]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg  = await pdf.embedFont(StandardFonts.Helvetica);
  const bg   = hexToRgb(content.backgroundColor);
  const fs   = 6;

  interface Part { type: 'back' | 'spine' | 'flap'; index?: number; wMm: number; }
  const partsLtr: Part[] = [
    { type: 'back',  wMm: content.shortBack ? BACK_SHORT_MM : BACK_FULL_MM },
    { type: 'spine', wMm: SPINE_MM },
    ...Array.from({ length: content.flaps }, (_, i) => ({ type: 'flap' as const, index: i, wMm: FLAPS_MM[i] })),
  ];
  const parts = content.isReversed ? [...partsLtr].reverse() : partsLtr;

  let cx = 0;
  for (const part of parts) {
    const { r, g, b } = bg;
    page.drawRectangle({ x: cx * MM, y: 0, width: part.wMm * MM, height: h * MM, color: rgb(r, g, b) });
    if (content.backgroundImageUrl) await drawImg(pdf, page, content.backgroundImageUrl, cx, 0, part.wMm, h);

    const rot = content.isReversed ? -90 : 90;
    const mid = (cx + part.wMm / 2) * MM;

    if (part.type === 'back') {
      const l = stripHtml(content.isReversed ? content.backRightContent : content.backLeftContent);
      const r2 = stripHtml(content.isReversed ? content.backLeftContent : content.backRightContent);
      if (l) page.drawText(l.split('\n')[0], { x: mid, y: (h - 2) * MM, font: bold, size: fs, color: rgb(0,0,0), rotate: degrees(rot) });
      if (r2) page.drawText(r2.split('\n')[0], { x: mid, y: 2 * MM, font: reg, size: fs, color: rgb(0,0,0), rotate: degrees(rot) });
    }
    if (part.type === 'spine') {
      const top = stripHtml(content.spineTopContent);
      const ctr = stripHtml(content.spineCenterContent);
      const bot = stripHtml(content.spineBottomContent);
      if (top) page.drawText(top.split('\n')[0], { x: mid, y: (h - 2) * MM, font: bold, size: fs, color: rgb(0,0,0), rotate: degrees(rot) });
      if (ctr) page.drawText(ctr.split('\n')[0], { x: mid, y: (h / 2) * MM, font: reg,  size: fs, color: rgb(0,0,0), rotate: degrees(rot) });
      if (bot) page.drawText(bot.split('\n')[0], { x: mid, y: 2 * MM,       font: reg,  size: fs, color: rgb(0,0,0), rotate: degrees(rot) });
    }
    if (part.type === 'flap' && part.index === 0) {
      if (content.coverImageUrl) {
        const imgH = content.isFullCoverImage ? h : part.wMm;
        await drawImg(pdf, page, content.coverImageUrl, cx, content.isFullCoverImage ? 0 : h - imgH, part.wMm, imgH);
      }
      const txt = stripHtml(content.coverContent);
      if (txt && (!content.isFullCoverImage || content.coverImageBehindContent)) {
        txt.split('\n').slice(0, 8).forEach((line, i) => {
          page.drawText(line, { x: (cx + 2) * MM, y: (h - 4 - i * 4) * MM, font: i === 0 ? bold : reg, size: fs + 1, color: rgb(0,0,0) });
        });
      }
    }
    cx += part.wMm;
  }

  const bytes = await pdf.save();
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename.toLowerCase().replace(/\s+/g, '-')}-jcard.pdf`; a.click();
  URL.revokeObjectURL(url);
}

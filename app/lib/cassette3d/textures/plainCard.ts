import type { JCard, JCardContent, Mixtape, Song } from '~/types';
import { formatDuration } from '~/utils/timeUtils';
import { BACK_FULL_MM, FLAPS_MM, JCARD_HEIGHT_MM, SPINE_MM } from '~/components/jcard/dimensions';
import type { JCardSnapshot } from './jcardSnapshot';

/**
 * The home-made card a public mixtape without a J-card wears on the public
 * shelves: plain coloured paper, handwritten in marker and pen, with a doodled
 * cassette and music notes. The title, a song and the running time go on the
 * spine; the title and the first songs on the cover; the tracklist on the back.
 *
 * Everything is drawn in millimetres from a seed taken from the mixtape id, so
 * the shelf's small spine and cover and the full-size card in the hero look
 * alike and never change between visits.
 */

const MARKER = 'Permanent Marker';
const PEN = 'Caveat';
const PLAIN_FONTS = [MARKER, PEN];
const FONT_TIMEOUT_MS = 3000;
const PREFIX = 'plain:';

/** Paper stock, with the ink and the doodle colour that go with it. */
const PAPERS = [
  { paper: '#d9c3a0', ink: '#2b2622', accent: '#b8412c' }, // kraft
  { paper: '#efe6cf', ink: '#263245', accent: '#c2412d' }, // cream
  { paper: '#cfdde3', ink: '#22303f', accent: '#d0563b' }, // pale blue
  { paper: '#ecd3cf', ink: '#33262b', accent: '#2f5fa8' }, // pink
  { paper: '#d4e3cf', ink: '#24322a', accent: '#b8412c' }, // mint
  { paper: '#efe0a8', ink: '#2e2a22', accent: '#2f5fa8' }, // butter
] as const;

type Paper = (typeof PAPERS)[number];

/** Panel sizes, mm: a one-flap card with a full back. */
const H = JCARD_HEIGHT_MM;
const BACK = BACK_FULL_MM;
const SPINE = SPINE_MM;
const COVER = FLAPS_MM[0];
/** Resolution of the full-size card in the hero, px per mm (≈ 200 dpi). */
const FACE_PX_PER_MM = 8;

export function isPlainJCard(card: Pick<JCard, 'id'>): boolean {
  return card.id.startsWith(PREFIX);
}

function paperFor(mixtape: Pick<Mixtape, 'id'>): Paper {
  return PAPERS[hash(mixtape.id) % PAPERS.length]!;
}

/**
 * A stand-in J-card for a mixtape that has none, so the shelf and the hero can
 * treat it like any other tape. Its id changes with the mixtape, so an edited
 * tape never shows a cached drawing of its old tracklist.
 */
export function plainJCardFor(mixtape: Mixtape): JCard {
  const { paper } = paperFor(mixtape);
  const title = escapeHtml(mixtape.title || 'Untitled');
  const content: JCardContent = {
    flaps: 1,
    isReversed: false,
    shortBack: false,
    backgroundColor: paper,
    continuousBackground: false,
    // Only read for the cassette label's font and stripe; the card itself is drawn here.
    flapContents: [`<h2><span style="font-family: '${MARKER}'">${title}</span></h2>`, '', '', '', '', ''],
    coverImageBehindContent: false,
    isFullCoverImage: false,
    spineTopContent: title,
    spineCenterContent: '',
    spineBottomContent: '',
    backLeftContent: '',
    backRightContent: '',
    showCutGuides: false,
  };
  return {
    id: `${PREFIX}${mixtape.id}:${mixtape.updatedAt}`,
    title: mixtape.title,
    userId: mixtape.userId ?? '',
    mixtapeId: mixtape.id,
    content,
    createdAt: mixtape.createdAt,
    updatedAt: mixtape.updatedAt,
    isPublic: true,
    isCopy: false,
    render: null,
  };
}

/** The whole outside face, full size, as a snapshot for the hero's J-card textures. */
export async function plainSnapshot(mixtape: Mixtape): Promise<JCardSnapshot> {
  const t0 = performance.now();
  await loadPlainFonts();
  const k = FACE_PX_PER_MM;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((BACK + SPINE + COVER) * k);
  canvas.height = Math.round(H * k);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(k, k);
    drawBack(ctx, mixtape);
    ctx.save();
    ctx.translate(BACK, 0);
    drawSpinePanel(ctx, mixtape);
    ctx.restore();
    ctx.save();
    ctx.translate(BACK + SPINE, 0);
    drawCoverPanel(ctx, mixtape);
    ctx.restore();
  }
  const px = (mm: number) => Math.round(mm * k);
  return {
    outside: {
      canvas,
      panels: {
        back: { x: 0, width: px(BACK) },
        spine: { x: px(BACK), width: px(BACK + SPINE) - px(BACK) },
        flap1: { x: px(BACK + SPINE), width: canvas.width - px(BACK + SPINE) },
      },
    },
    pxPerMm: k,
    fonts: PLAIN_FONTS.map((family) => ({ family, loaded: document.fonts.check(`16px "${family}"`) })),
    images: [],
    ms: Math.round(performance.now() - t0),
  };
}

/** Load the marker and both weights of the pen (Fontsource faces load lazily), giving up after a timeout. */
export async function loadPlainFonts(): Promise<void> {
  await Promise.all([`32px "${MARKER}"`, `32px "${PEN}"`, `700 32px "${PEN}"`].map((spec) => Promise.race([
    document.fonts.load(spec).catch(() => undefined),
    new Promise((r) => setTimeout(r, FONT_TIMEOUT_MS)),
  ])));
}

/** The spine, `height` px tall, for the shelf. */
export function drawPlainSpine(mixtape: Mixtape, height = 256): HTMLCanvasElement {
  return panelCanvas(SPINE, height, (ctx) => drawSpinePanel(ctx, mixtape));
}

/** The cover, `height` px tall, for the shelf's row-end cases. */
export function drawPlainCover(mixtape: Mixtape, height = 256): HTMLCanvasElement {
  return panelCanvas(COVER, height, (ctx) => drawCoverPanel(ctx, mixtape));
}

export function plainPaperColor(mixtape: Pick<Mixtape, 'id'>): string {
  return paperFor(mixtape).paper;
}

function panelCanvas(widthMm: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const k = Math.round(height) / H;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(widthMm * k));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(canvas.width / widthMm, canvas.height / H);
    draw(ctx);
  }
  return canvas;
}

// --- Panels (all in mm; the panel's top-left corner at 0,0) ------------------------------

function drawSpinePanel(ctx: CanvasRenderingContext2D, mixtape: Mixtape) {
  const p = paperFor(mixtape);
  const rand = rng(`${mixtape.id}:spine`);
  paperBase(ctx, SPINE, H, p, rand);

  const songs = allSongs(mixtape);
  const duration = formatDuration(totalSeconds(songs));
  const first = songs[0];

  // Text runs down the spine, reading top to bottom (like drawSpine).
  ctx.save();
  ctx.translate(SPINE, 0);
  ctx.rotate(Math.PI / 2);
  const mid = SPINE / 2;
  ctx.textBaseline = 'middle';

  // Running time at the bottom, circled.
  ctx.font = `700 4.6px "${PEN}", cursive`;
  const durW = ctx.measureText(duration).width;
  const durX = H - 4 - durW;
  ctx.fillStyle = p.ink;
  ctx.textAlign = 'left';
  ctx.fillText(duration, durX, mid + 0.3);
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 0.35;
  scribbleEllipse(ctx, durX + durW / 2, mid, durW / 2 + 1.6, 3.4, rand);

  // A song, small, between the title and the time (when there's room).
  let titleEnd = durX - 4;
  if (first) {
    ctx.font = `400 3.6px "${PEN}", cursive`;
    const song = fitText(ctx, first.title, 26);
    const songW = ctx.measureText(song).width;
    const songX = durX - 3 - songW;
    ctx.fillStyle = p.ink;
    ctx.globalAlpha = 0.8;
    ctx.fillText(song, songX, mid + 0.4);
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.accent;
    noteGlyph(ctx, songX - 3.2, mid + 1.2, 1.3, rand);
    titleEnd = songX - 6;
  }

  // The title in marker, from the top.
  ctx.fillStyle = p.ink;
  ctx.font = `8px "${MARKER}", cursive`;
  ctx.fillText(fitText(ctx, mixtape.title || 'Untitled', Math.max(20, titleEnd - 4)), 4, mid + 0.4);
  ctx.restore();
}

function drawCoverPanel(ctx: CanvasRenderingContext2D, mixtape: Mixtape) {
  const p = paperFor(mixtape);
  const rand = rng(`${mixtape.id}:cover`);
  paperBase(ctx, COVER, H, p, rand);

  // A strip of masking tape across the top corner.
  ctx.save();
  ctx.translate(COVER - 12, 5);
  ctx.rotate(0.5 + (rand() - 0.5) * 0.2);
  ctx.fillStyle = 'rgba(246, 238, 210, 0.75)';
  ctx.fillRect(-9, -2.6, 18, 5.2);
  ctx.restore();

  // Title, in marker, up to three lines, with a squiggle under it.
  ctx.fillStyle = p.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let size = 9;
  let lines: string[] = [];
  for (; size >= 5.5; size -= 0.5) {
    ctx.font = `${size}px "${MARKER}", cursive`;
    lines = wrap(ctx, mixtape.title || 'Untitled', COVER - 12);
    if (lines.length <= 3) break;
  }
  lines = lines.slice(0, 3);
  let y = 7 + size;
  for (const line of lines) {
    ctx.save();
    ctx.translate(6, y);
    ctx.rotate((rand() - 0.5) * 0.04);
    ctx.fillText(line, 0, 0);
    ctx.restore();
    y += size * 1.1;
  }
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 0.6;
  squiggle(ctx, 6, y - size * 0.55, Math.min(COVER - 14, 40), rand);

  // The cassette doodle, with notes floating off it.
  const tapeTop = Math.max(y + 2, 36);
  ctx.strokeStyle = p.ink;
  ctx.fillStyle = p.ink;
  cassetteDoodle(ctx, 9, tapeTop, 38, 24, p, rand);
  ctx.fillStyle = p.accent;
  noteGlyph(ctx, 52, tapeTop + 5, 2.2, rand);
  noteGlyph(ctx, 57, tapeTop - 2, 1.6, rand, true);
  ctx.fillStyle = p.ink;
  sparkle(ctx, 50, tapeTop + 16, 1.4, rand);

  // The first songs, handwritten.
  const songs = allSongs(mixtape);
  const listTop = tapeTop + 31;
  const room = Math.max(0, Math.floor((H - 12 - listTop) / 5.2));
  const shown = songs.slice(0, Math.min(room, songs.length > room ? room - 1 : room));
  ctx.textBaseline = 'alphabetic';
  let ly = listTop;
  shown.forEach((s, i) => {
    ctx.font = `700 4.4px "${PEN}", cursive`;
    ctx.fillStyle = p.accent;
    ctx.fillText(`${i + 1}.`, 6, ly);
    ctx.fillStyle = p.ink;
    const text = s.artist ? `${s.title} – ${s.artist}` : s.title;
    ctx.font = `400 4.4px "${PEN}", cursive`;
    ctx.fillText(fitText(ctx, text, COVER - 17), 11, ly);
    ly += 5.2;
  });
  if (songs.length > shown.length) {
    ctx.font = `400 4px "${PEN}", cursive`;
    ctx.globalAlpha = 0.75;
    ctx.fillText(`+ ${songs.length - shown.length} more…`, 11, ly);
    ctx.globalAlpha = 1;
  }

  // Tape length, bottom right.
  ctx.font = `700 4.6px "${PEN}", cursive`;
  ctx.textAlign = 'right';
  ctx.fillStyle = p.ink;
  ctx.fillText(`C-${mixtape.cassetteLength} · ${formatDuration(totalSeconds(songs))}`, COVER - 5, H - 5);
  ctx.textAlign = 'left';
}

function drawBack(ctx: CanvasRenderingContext2D, mixtape: Mixtape) {
  const p = paperFor(mixtape);
  const rand = rng(`${mixtape.id}:back`);
  paperBase(ctx, BACK, H, p, rand);
  // Two columns of tracklist running along the panel, side A then side B.
  ctx.save();
  ctx.translate(BACK, 0);
  ctx.rotate(Math.PI / 2);
  const cols: [string, Song[]][] = [['side A', mixtape.sideA], ['side B', mixtape.sideB]];
  cols.forEach(([label, songs], c) => {
    const base = 7 + c * 11.5;
    ctx.fillStyle = p.accent;
    ctx.font = `700 4.4px "${PEN}", cursive`;
    ctx.fillText(label, 5, base);
    const labelW = ctx.measureText(label).width;
    ctx.fillStyle = p.ink;
    ctx.font = `400 3.8px "${PEN}", cursive`;
    const list = songs.length ? songs.map((s) => s.title).join(' · ') : '—';
    ctx.fillText(fitText(ctx, list, H - 12 - labelW), 8 + labelW, base);
  });
  ctx.restore();
  ctx.fillStyle = p.accent;
  noteGlyph(ctx, BACK / 2 - 1, H - 7, 1.6, rand);
}

// --- Paper and doodles ---------------------------------------------------------------------

function paperBase(ctx: CanvasRenderingContext2D, w: number, h: number, p: Paper, rand: () => number) {
  ctx.fillStyle = p.paper;
  ctx.fillRect(0, 0, w, h);
  // Fibres and flecks.
  const flecks = Math.round(w * h * 0.12);
  for (let i = 0; i < flecks; i++) {
    ctx.fillStyle = rand() < 0.5 ? 'rgba(60, 40, 20, 0.07)' : 'rgba(255, 255, 255, 0.12)';
    const r = 0.06 + rand() * 0.16;
    ctx.fillRect(rand() * w, rand() * h, r, r * (0.6 + rand()));
  }
  // A soft darkening towards the edges, like handled paper.
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(70,45,20,0.1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** A hand-drawn line through points: slight wobble, drawn twice like a sketch. */
function sketch(ctx: CanvasRenderingContext2D, pts: [number, number][], rand: () => number, wobble = 0.35, closed = false) {
  for (let pass = 0; pass < 2; pass++) {
    const j = () => (rand() - 0.5) * wobble;
    ctx.beginPath();
    const [x0, y0] = pts[0]!;
    ctx.moveTo(x0 + j(), y0 + j());
    const all = closed ? [...pts.slice(1), pts[0]!] : pts.slice(1);
    let [px, py] = pts[0]!;
    for (const [x, y] of all) {
      const mx = (px + x) / 2 + j() * 2;
      const my = (py + y) / 2 + j() * 2;
      ctx.quadraticCurveTo(mx, my, x + j(), y + j());
      [px, py] = [x, y];
    }
    ctx.globalAlpha = pass ? 0.55 : 1;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function scribbleEllipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, rand: () => number) {
  ctx.beginPath();
  const start = rand() * Math.PI * 2;
  const turns = Math.PI * 2 * 1.12;
  for (let t = 0; t <= 1.0001; t += 0.04) {
    const a = start + t * turns;
    const d = 1 + (rand() - 0.5) * 0.06 + t * 0.06;
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d;
    if (t === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function squiggle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, rand: () => number) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  const steps = Math.max(4, Math.round(w / 4));
  for (let i = 1; i <= steps; i++) {
    const px = x + (w * i) / steps;
    ctx.quadraticCurveTo(px - w / steps / 2, y + (i % 2 ? -1.3 : 1.3) + (rand() - 0.5) * 0.4, px, y + (rand() - 0.5) * 0.3);
  }
  ctx.lineCap = 'round';
  ctx.stroke();
}

function cassetteDoodle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: Paper, rand: () => number) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(-0.06 + (rand() - 0.5) * 0.06);
  ctx.translate(-w / 2, -h / 2);
  ctx.lineWidth = 0.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const r = 1.8;
  // Shell.
  sketch(ctx, [[r, 0], [w - r, 0], [w, r], [w, h - r], [w - r, h], [r, h], [0, h - r], [0, r]], rand, 0.4, true);
  // Label, with a scribbled title line.
  ctx.lineWidth = 0.35;
  sketch(ctx, [[3, 2.5], [w - 3, 2.5], [w - 3, h * 0.62], [3, h * 0.62]], rand, 0.3, true);
  ctx.strokeStyle = p.accent;
  squiggle(ctx, 5, 5.2, w * 0.45, rand);
  ctx.strokeStyle = p.ink;
  // Window and reels.
  const wy = h * 0.3;
  const wh = h * 0.24;
  sketch(ctx, [[w * 0.22, wy], [w * 0.78, wy], [w * 0.78, wy + wh], [w * 0.22, wy + wh]], rand, 0.3, true);
  for (const cx of [w * 0.33, w * 0.67]) {
    ctx.beginPath();
    ctx.arc(cx, wy + wh / 2, wh * 0.36, 0, Math.PI * 2);
    ctx.stroke();
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI * 2) / 3 + rand();
      ctx.beginPath();
      ctx.moveTo(cx, wy + wh / 2);
      ctx.lineTo(cx + Math.cos(a) * wh * 0.3, wy + wh / 2 + Math.sin(a) * wh * 0.3);
      ctx.stroke();
    }
  }
  // Trapezoid at the tape edge, with its holes.
  sketch(ctx, [[w * 0.2, h], [w * 0.27, h * 0.76], [w * 0.73, h * 0.76], [w * 0.8, h]], rand, 0.3);
  for (const hx of [w * 0.36, w * 0.64]) {
    ctx.beginPath();
    ctx.arc(hx, h * 0.88, 0.7, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** A quaver (or two beamed ones), filled in the current fill colour. */
function noteGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rand: () => number, pair = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rand() - 0.5) * 0.4);
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = s * 0.22;
  ctx.lineCap = 'round';
  const heads = pair ? [0, s * 2.2] : [0];
  for (const hx of heads) {
    ctx.beginPath();
    ctx.ellipse(hx, 0, s * 0.62, s * 0.45, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx + s * 0.55, 0);
    ctx.lineTo(hx + s * 0.55, -s * 2.6);
    ctx.stroke();
  }
  ctx.beginPath();
  if (pair) {
    ctx.moveTo(s * 0.55, -s * 2.6);
    ctx.lineTo(s * 2.75, -s * 2.8);
  } else {
    ctx.moveTo(s * 0.55, -s * 2.6);
    ctx.quadraticCurveTo(s * 1.6, -s * 1.9, s * 1.3, -s * 1.1);
  }
  ctx.stroke();
  ctx.restore();
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rand: () => number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rand());
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = s * 0.25;
  ctx.lineCap = 'round';
  for (let k = 0; k < 4; k++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, -s * (k % 2 ? 0.6 : 1));
    ctx.lineTo(0, s * (k % 2 ? 0.6 : 1));
    ctx.stroke();
  }
  ctx.restore();
}

// --- Helpers ---------------------------------------------------------------------------------

function allSongs(mixtape: Pick<Mixtape, 'sideA' | 'sideB'>): Song[] {
  return [...(mixtape.sideA ?? []), ...(mixtape.sideB ?? [])];
}

function totalSeconds(songs: Song[]): number {
  return songs.reduce((s, t) => s + (t.duration || 0), 0);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.map((l) => fitText(ctx, l, maxWidth));
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Seeded random numbers (mulberry32), so a tape's doodles are the same every time. */
function rng(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

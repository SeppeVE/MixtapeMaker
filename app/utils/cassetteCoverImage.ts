import { Mixtape, Side } from '../types';

// Mirrors app/components/tape/CassetteSVG.vue as a plain string template so it
// can be rasterized outside of Vue (no live component to mount when exporting).
const CASSETTE_W = 300;
const CASSETTE_H = 195;
const COVER_SIZE = 1000; // Square cover. Spotify accepts up to ~3000px; 1000 keeps the
// base64 payload comfortably under Spotify's 256KB limit for custom playlist images.
const BACKGROUND = '#2A1E28';
// Matches TapePreview.vue's per-side accent (accentColor computed there).
const ACCENT_COLORS: Record<Side, string> = { A: '#8FC9B7', B: '#B4A0C7' };
const SPOTIFY_IMAGE_LIMIT_BYTES = 256 * 1024;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCassetteSvgMarkup(title: string | undefined, side: Side): string {
  const isUntitled = !title || title === 'Untitled Mixtape';
  const starPts = '0,-13 2.9,-4 12.4,-4 4.8,1.5 7.6,10.5 0,5 -7.6,10.5 -4.8,1.5 -12.4,-4 -2.9,-4';
  const beads = [35, 47, 59, 71, 83];
  const screws: [number, number][] = [[15, 15], [285, 15], [15, 179], [285, 179]];
  const accentColor = ACCENT_COLORS[side];

  const label = isUntitled
    ? `<rect x="66" y="28" width="115" height="6" rx="2" fill="rgba(42,30,40,0.25)" />
       <rect x="66" y="39" width="78" height="5" rx="2" fill="rgba(42,30,40,0.18)" />`
    : `<clipPath id="label-clip"><rect x="66" y="22" width="190" height="33" /></clipPath>
       <text x="66" y="43" font-family="monospace" font-size="9" font-weight="700" fill="#2A1E28" clip-path="url(#label-clip)">${escapeXml(title!)}</text>`;

  return `
<svg width="${CASSETTE_W}" height="${CASSETTE_H}" viewBox="0 0 300 195" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="296" height="191" rx="10" fill="#D4A935" stroke="#2A1E28" stroke-width="3.5" />
  <rect x="5" y="5" width="290" height="185" rx="8" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.5" />
  <rect x="4" y="4" width="292" height="187" rx="9" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="1" />
  ${beads.map(cy => `<circle cx="10" cy="${cy}" r="4" fill="#2A1E28" />`).join('')}
  <rect x="27" y="16" width="246" height="114" rx="6" fill="#A8C4A2" stroke="#2A1E28" stroke-width="2.5" />
  <rect x="29" y="18" width="242" height="110" rx="4" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1" />
  <rect x="33" y="22" width="234" height="33" rx="2" fill="rgba(255,255,255,0.72)" />
  <text x="41" y="47" font-family="monospace" font-size="20" font-weight="900" fill="#5B2838">${side}</text>
  ${label}
  <line x1="33" y1="55" x2="267" y2="55" stroke="#5B2838" stroke-width="2" />
  <rect x="50" y="61" width="200" height="52" rx="3" fill="#2A1E28" stroke="#2A1E28" stroke-width="1.5" />
  <rect x="52" y="63" width="196" height="48" rx="2" fill="none" stroke="#4A3A48" stroke-width="1" />
  <rect x="107" y="69" width="86" height="34" rx="3" fill="#5B2838" opacity="0.85" />
  <path d="M 84 97 Q 150 85 216 97" stroke="#3a2a38" stroke-width="3" fill="none" />
  <g transform="translate(84 87)">
    <circle r="19" fill="#EFE8D6" stroke="#2A1E28" stroke-width="2" />
    <polygon points="${starPts}" fill="${accentColor}" />
    <circle r="4" fill="#5B2838" stroke="#2A1E28" stroke-width="1.5" />
  </g>
  <g transform="translate(216 87)">
    <circle r="19" fill="#EFE8D6" stroke="#2A1E28" stroke-width="2" />
    <polygon points="${starPts}" fill="${accentColor}" />
    <circle r="4" fill="#5B2838" stroke="#2A1E28" stroke-width="1.5" />
  </g>
  <polygon points="73,142 227,142 244,191 56,191" fill="#2A2020" stroke="#2A1E28" stroke-width="1.5" />
  <line x1="73" y1="142" x2="227" y2="142" stroke="#2A1E28" stroke-width="2.5" />
  <circle cx="86" cy="168" r="6" fill="#fff" stroke="#2A1E28" stroke-width="1.5" />
  <circle cx="118" cy="169" r="6" fill="#fff" stroke="#2A1E28" stroke-width="1.5" />
  <circle cx="150" cy="170" r="7" fill="#DDD2B8" stroke="#2A1E28" stroke-width="1.5" />
  <text x="150" y="175" text-anchor="middle" font-size="9" font-weight="bold" fill="#2A1E28">+</text>
  <circle cx="182" cy="169" r="6" fill="#fff" stroke="#2A1E28" stroke-width="1.5" />
  <circle cx="214" cy="168" r="6" fill="#fff" stroke="#2A1E28" stroke-width="1.5" />
  ${screws.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="7" fill="#DDD2B8" stroke="#2A1E28" stroke-width="1.5" /><text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="9" font-weight="bold" fill="#2A1E28">+</text>`).join('')}
</svg>`.trim();
}

/**
 * Renders the mixtape's own cassette artwork (its title burned into the
 * label, side badge and accent matching the given side) as a square JPEG,
 * base64-encoded with no data-URL prefix — the exact shape Spotify's "set
 * playlist cover image" endpoint expects. Spotify doesn't accept SVG
 * directly, so this rasterizes it via canvas client-side.
 */
export async function generateCassetteCoverJpegBase64(mixtape: Mixtape, side: Side = 'A'): Promise<string> {
  const svg = buildCassetteSvgMarkup(mixtape.title, side);
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to rasterize cassette SVG'));
      el.src = svgUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = COVER_SIZE;
    canvas.height = COVER_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, COVER_SIZE, COVER_SIZE);

    const scale = (COVER_SIZE * 0.86) / CASSETTE_W;
    const drawW = CASSETTE_W * scale;
    const drawH = CASSETTE_H * scale;
    ctx.drawImage(img, (COVER_SIZE - drawW) / 2, (COVER_SIZE - drawH) / 2, drawW, drawH);

    for (const quality of [0.92, 0.8, 0.65, 0.5]) {
      const base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1] ?? '';
      if (base64.length < SPOTIFY_IMAGE_LIMIT_BYTES) return base64;
    }
    throw new Error('Cover image too large after compression');
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

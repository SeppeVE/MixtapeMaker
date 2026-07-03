import { CustomFont } from '../types';

/**
 * Curated fonts loaded from Google Fonts (see index.html).
 * These are always available in the font picker without any upload.
 */
export const CURATED_FONTS: string[] = [
  'Inter',
  'IBM Plex Sans',
  'EB Garamond',
  'Playfair Display',
  'JetBrains Mono',
  'Permanent Marker',
  'Bebas Neue',
  'Caveat',
  'Special Elite',
];

/** Map file extension to the correct font MIME type. */
export function mimeTypeFromFile(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'woff2': return 'font/woff2';
    case 'woff':  return 'font/woff';
    case 'otf':   return 'font/otf';
    case 'ttf':   return 'font/ttf';
    default:      return 'font/otf';
  }
}

/**
 * Register custom fonts with the browser via the FontFace API.
 * Uses an explicit data-URL source (url(data:MIME;base64,...)) rather than
 * a raw ArrayBuffer so the browser always has the MIME type to parse correctly.
 * Safe to call multiple times — already-registered faces are skipped.
 */
export async function registerCustomFonts(fonts: CustomFont[]): Promise<void> {
  for (const font of fonts) {
    // document.fonts.check() is NOT the right guard here — it returns true for
    // any font the browser can render, including fallbacks, so it would skip
    // every unregistered font. Instead, check the FontFaceSet directly.
    const alreadyRegistered = [...document.fonts].some(f => f.family === font.name);
    if (alreadyRegistered) continue;
    try {
      const src = `url(data:${font.mimeType};base64,${font.data})`;
      const face = new FontFace(font.name, src);
      await face.load();
      document.fonts.add(face);
    } catch (err) {
      console.warn(`[fontManager] Failed to register font "${font.name}":`, err);
    }
  }
}

/**
 * Read a File as a base64 string (without the data-URL prefix).
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Derive a clean display name from a font filename.
 * e.g. "my-cool_font.woff2" → "My Cool Font"
 */
export function fontNameFromFile(file: File): string {
  return file.name
    .replace(/\.(woff2?|otf|ttf)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

import type { JCardContent, JCardRender, JCardRenderFace } from '~/types';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import type { JCardPanelName } from '../objects/jcard';
import type { FaceSnapshot, JCardSnapshot } from './jcardSnapshot';

/**
 * Stored J-card renders: what gets uploaded after a save, and turning a stored
 * render back into a snapshot the texture code can use. Storage-agnostic; the
 * Supabase side lives in app/utils/jcardRenders.ts.
 *
 * Kept free of the snapshot code (Vue printables, html-to-image) at runtime:
 * app/utils/jcardDatabase.ts imports this chain, and so does almost every page.
 */

/** Capture resolution: 300 dpi of physical size. */
export const DEFAULT_DPI = 300;

/**
 * Bump when the output of the render pipeline changes (resolution, components,
 * fonts...): every stored render then counts as stale and gets re-rendered.
 */
export const RENDER_PIPELINE = 'r1';
export const RENDER_BUCKET = 'jcard-renders';
const WEBP_QUALITY = 0.9;

/**
 * Content hash a stored render is valid for. Hashes the card's content, not
 * `updated_at`: some saves change content without touching `updated_at`, and
 * Postgres reorders jsonb keys, so keys are sorted before hashing.
 */
export async function jcardRenderVersion(content: JCardContent): Promise<string> {
  const text = `${RENDER_PIPELINE}|${DEFAULT_DPI}|${stableStringify(migrateJCardContent(content))}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** JSON with object keys sorted at every level and undefined values dropped, like jsonb. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? 'null' : stableStringify(v))).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}

/** Encode a face canvas for upload: WebP where the browser can, PNG otherwise. */
export function encodeFace(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not encode the J-card render'));
    }, 'image/webp', WEBP_QUALITY);
  });
}

/**
 * Only accept stored renders from our own bucket. The `render` column is written
 * by the card's owner, and public cards are shown to other people.
 */
export function isTrustedRender(render: JCardRender, supabaseUrl: string): boolean {
  const prefix = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${RENDER_BUCKET}/`;
  const faces = [render.outside, render.inside].filter((f): f is JCardRenderFace => !!f);
  return faces.length > 0 && faces.every((f) => typeof f.url === 'string' && f.url.startsWith(prefix));
}

/** Download a stored render and turn it back into a snapshot. */
export async function loadStoredSnapshot(render: JCardRender): Promise<JCardSnapshot> {
  const t0 = performance.now();
  const [outside, inside] = await Promise.all([
    loadFace(render.outside),
    render.inside ? loadFace(render.inside) : Promise.resolve(undefined),
  ]);
  return { outside, inside, pxPerMm: render.pxPerMm, fonts: [], images: [], ms: Math.round(performance.now() - t0) };
}

async function loadFace(face: JCardRenderFace): Promise<FaceSnapshot> {
  const res = await fetch(face.url, { mode: 'cors' });
  if (!res.ok) throw new Error(`Stored J-card render: http ${res.status}`);
  const bitmap = await createImageBitmap(await res.blob());
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
  bitmap.close();
  return { canvas, panels: face.panels as Partial<Record<JCardPanelName, { x: number; width: number }>> };
}

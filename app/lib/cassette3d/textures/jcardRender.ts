import type { JCardContent, JCardRender, JCardRenderFace } from '~/types';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import type { JCardPanelName } from '../objects/jcard';
import type { FaceSnapshot, JCardSnapshot, PanelRect } from './jcardSnapshot';

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
export const RENDER_PIPELINE = 'r2'; // r2: cut guides hidden
export const RENDER_BUCKET = 'jcard-renders';
/** Height of the stored spine crop the shelf uses, px (≈ 125 dpi; ~5–15 kB as WebP). */
export const SPINE_RENDER_HEIGHT = 512;
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

/** The outside spine of a snapshot, `height` px tall (the shelf's spine atlas, the stored spine). */
export function spineFromSnapshot(snapshot: JCardSnapshot, height = 256): HTMLCanvasElement | null {
  const rect = snapshot.outside.panels.spine;
  return rect ? cropPanel(snapshot.outside.canvas, rect, height) : null;
}

/** Copy one panel's columns out of a face canvas, scaled to `height` px. */
export function cropPanel(source: HTMLCanvasElement, rect: PanelRect, height: number): HTMLCanvasElement {
  const scale = height / source.height;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(rect.width * scale));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, rect.x, 0, rect.width, source.height, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

const bucketPrefix = (supabaseUrl: string) => `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${RENDER_BUCKET}/`;

/**
 * The stored spine's URL if the render has one from our own bucket, else null.
 * (The shelf checks the render's version against the card itself.)
 */
export function trustedSpineUrl(render: JCardRender | null | undefined, supabaseUrl: string): string | null {
  const url = render?.spine?.url;
  return typeof url === 'string' && !!supabaseUrl && url.startsWith(bucketPrefix(supabaseUrl)) ? url : null;
}

/** Download a stored spine as a canvas. */
export async function loadStoredSpine(url: string): Promise<HTMLCanvasElement> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`Stored J-card spine: http ${res.status}`);
  const bitmap = await createImageBitmap(await res.blob());
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}

/**
 * Only accept stored renders from our own bucket. The `render` column is written
 * by the card's owner, and public cards are shown to other people.
 */
export function isTrustedRender(render: JCardRender, supabaseUrl: string): boolean {
  const prefix = bucketPrefix(supabaseUrl);
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

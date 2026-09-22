import { supabase } from './supabase';
import { JCardContent } from '../types';

const BUCKET = 'jcard-images';
const THUMB_MAX_DIMENSION = 600;
const THUMB_QUALITY = 0.8;
// Ceiling for an image that has to ride inside the card's own content.
// Comfortably past what a 100mm-wide card resolves in print, and small enough
// that a card carrying two of them still fits in localStorage.
const INLINE_MAX_DIMENSION = 1200;
const INLINE_MAX_BYTES = 600 * 1024;

export interface UploadedJCardImage {
  url: string;
  /** Small upload-time thumbnail, used by the Explore grid preview. Absent when thumbnailing failed or the main upload fell back to a data: URL. */
  thumbUrl?: string;
}

export async function uploadJCardImage(file: File, userId: string, type: 'cover' | 'background', cardId?: string): Promise<UploadedJCardImage> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const base = `${type}-${Date.now()}`;
  const path = `${userId}/${cardId ?? 'tmp'}/${base}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
  if (error) return { url: await inlineFallback(file) };
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const thumbUrl = await uploadThumbnail(file, userId, cardId, base);
  return { url: data.publicUrl, thumbUrl };
}

export async function deleteJCardImage(publicUrl: string): Promise<void> {
  const path = bucketPath(publicUrl);
  if (!path) return;
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch { /* ignore */ }
}

/** Content keys holding one image URL. Keep in sync with JCardContent. */
const SINGLE_IMAGE_KEYS = [
  'backgroundImageUrl', 'backgroundImageThumbUrl',
  'coverImageUrl', 'coverImageThumbUrl',
  'insideBackgroundImageUrl', 'backPanelImageUrl', 'insideBackPanelImageUrl',
] as const;

/** Content keys holding an array of per-panel image URLs. */
const ARRAY_IMAGE_KEYS = ['flapImageUrls', 'insideFlapImageUrls'] as const;

function publicUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Lift an inlined image into the bucket. Copies inherit these from cards whose
 * author was signed out when they added the image; carried over as-is they'd
 * bloat the new card's row and the localStorage budget the designer saves into.
 * The copier is always signed in, so their own folder is writable.
 */
async function uploadDataUrl(dataUrl: string, userId: string, cardId: string): Promise<string | null> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const ext = blob.type.split('/')[1]?.split('+')[0] || 'jpg';
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `${userId}/${cardId}/inlined-${unique}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET).upload(path, blob, { upsert: true, contentType: blob.type });
    return error ? null : publicUrl(path);
  } catch {
    return null;
  }
}

/** The path inside BUCKET behind one of our public URLs, or null for a data: or foreign URL. */
function bucketPath(url: string): string | null {
  if (!url || url.startsWith('data:')) return null;
  try {
    const [, path] = new URL(url).pathname.split(`/${BUCKET}/`);
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
}

/**
 * Put a copy of `sourcePath` in the given card's folder. Tries a server-side
 * copy first and falls back to pulling the bytes through the browser, since
 * the bucket's policies may allow reading someone else's object but not
 * copying it directly. Null when neither route works.
 */
async function copyBucketObject(sourcePath: string, userId: string, cardId: string): Promise<string | null> {
  const destPath = `${userId}/${cardId}/${sourcePath.split('/').pop()}`;
  const { error } = await supabase.storage.from(BUCKET).copy(sourcePath, destPath);
  if (!error) return publicUrl(destPath);

  try {
    const { data, error: downloadError } = await supabase.storage.from(BUCKET).download(sourcePath);
    if (downloadError || !data) return null;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET).upload(destPath, data, { upsert: true, contentType: data.type });
    return uploadError ? null : publicUrl(destPath);
  } catch {
    return null;
  }
}

/**
 * Re-point every bucket-hosted image in `content` at a fresh copy under
 * `${userId}/${cardId}/`, so the card keeps working after the original author
 * replaces or deletes theirs.
 *
 * Images the source card carries inline are uploaded rather than copied along,
 * so a copy never inherits a multi-megabyte data: URL. Images hosted somewhere
 * else entirely are left alone.
 *
 * Best-effort per image: a failed duplication keeps the original URL rather
 * than failing the copy — a card that borrows one image is a far smaller loss
 * than no card at all.
 */
export async function duplicateJCardImages(
  content: JCardContent,
  userId: string,
  cardId: string,
): Promise<JCardContent> {
  const seen = new Map<string, string>();

  async function duplicate(url: string | undefined): Promise<string | undefined> {
    if (!url) return url;
    const cached = seen.get(url);
    if (cached) return cached;

    const path = bucketPath(url);
    let next: string;
    if (path) {
      next = (await copyBucketObject(path, userId, cardId)) ?? url;
    } else if (url.startsWith('data:')) {
      next = (await uploadDataUrl(url, userId, cardId)) ?? url;
    } else {
      return url; // hosted somewhere else entirely — leave it alone
    }
    seen.set(url, next);
    return next;
  }

  const next = { ...content } as JCardContent & Record<string, unknown>;
  for (const key of SINGLE_IMAGE_KEYS) {
    const value = next[key];
    if (typeof value === 'string') next[key] = await duplicate(value);
  }
  for (const key of ARRAY_IMAGE_KEYS) {
    const value = next[key];
    if (Array.isArray(value)) {
      next[key] = await Promise.all((value as (string | undefined)[]).map((url) => duplicate(url)));
    }
  }
  return next;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * The image couldn't be uploaded — a signed-out visitor has no folder of their
 * own to write to — so it has to travel inside the card's content instead.
 *
 * A full-resolution photo base64s to several megabytes, which blows the
 * localStorage budget the card is saved into and takes the whole card with it,
 * silently. Shrink anything big enough to be a problem; the original is kept
 * only when it's already small or the resize doesn't help.
 */
async function inlineFallback(file: File): Promise<string> {
  if (file.size <= INLINE_MAX_BYTES) return blobToDataUrl(file);
  try {
    const scaled = await createScaledBlob(file, INLINE_MAX_DIMENSION);
    if (scaled && scaled.blob.size < file.size) return blobToDataUrl(scaled.blob);
  } catch { /* fall through to the original */ }
  return blobToDataUrl(file);
}

/** Resize to at most THUMB_MAX_DIMENSION on the longest edge and upload next to the original as `<base>-thumb.<ext>`. Never throws — a failed thumbnail must never fail the main image upload. */
async function uploadThumbnail(file: File, userId: string, cardId: string | undefined, base: string): Promise<string | undefined> {
  try {
    const thumb = await createScaledBlob(file, THUMB_MAX_DIMENSION);
    if (!thumb) return undefined;
    const path = `${userId}/${cardId ?? 'tmp'}/${base}-thumb.${thumb.ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, thumb.blob, { upsert: true, contentType: thumb.blob.type });
    if (error) return undefined;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return undefined;
  }
}

/** Fit to `maxDimension` as WebP at THUMB_QUALITY, falling back to JPEG for browsers that can't encode WebP via canvas. */
async function createScaledBlob(file: Blob, maxDimension: number): Promise<{ blob: Blob; ext: string } | null> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const webp = await canvasToBlob(canvas, 'image/webp', THUMB_QUALITY);
    if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' };

    const jpeg = await canvasToBlob(canvas, 'image/jpeg', THUMB_QUALITY);
    return jpeg ? { blob: jpeg, ext: 'jpg' } : null;
  } finally {
    bitmap.close();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

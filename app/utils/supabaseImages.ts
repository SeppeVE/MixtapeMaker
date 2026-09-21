import { supabase } from './supabase';

const BUCKET = 'jcard-images';
const THUMB_MAX_DIMENSION = 600;
const THUMB_QUALITY = 0.8;

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
  if (error) return { url: await fileToDataUrl(file) };
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const thumbUrl = await uploadThumbnail(file, userId, cardId, base);
  return { url: data.publicUrl, thumbUrl };
}

export async function deleteJCardImage(publicUrl: string): Promise<void> {
  try {
    const url = new URL(publicUrl);
    const parts = url.pathname.split(`/${BUCKET}/`);
    if (parts.length < 2) return;
    await supabase.storage.from(BUCKET).remove([parts[1]]);
  } catch { /* ignore */ }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Resize to at most THUMB_MAX_DIMENSION on the longest edge and upload next to the original as `<base>-thumb.<ext>`. Never throws — a failed thumbnail must never fail the main image upload. */
async function uploadThumbnail(file: File, userId: string, cardId: string | undefined, base: string): Promise<string | undefined> {
  try {
    const thumb = await createThumbnailBlob(file);
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

/** WebP at THUMB_QUALITY, falling back to JPEG for browsers that can't encode WebP via canvas. */
async function createThumbnailBlob(file: File): Promise<{ blob: Blob; ext: string } | null> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, THUMB_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
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

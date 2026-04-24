import { supabase } from './supabase';

const BUCKET = 'jcard-images';

export async function uploadJCardImage(file: File, userId: string, type: 'cover' | 'background', cardId?: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/${cardId ?? 'tmp'}/${type}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
  if (error) return fileToDataUrl(file);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
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

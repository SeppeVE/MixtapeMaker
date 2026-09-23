import { supabase } from './supabase';
import type { Profile } from '../types';

// Keep in sync with the CHECK constraint on profiles.username in SUPABASE_SETUP.md.
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
export const USERNAME_RE = /^[a-z0-9_-]{3,24}$/;
// Keep in sync with the CHECK constraint on profiles.bio in SUPABASE_SETUP.md.
export const BIO_MAX_LENGTH = 300;

const AVATAR_BUCKET = 'avatars';
const AVATAR_SIZE = 256;

interface DbProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
  is_admin: boolean;
  seen_notification_id: string | null;
  created_at: string;
}

function dbToProfile(r: DbProfile): Profile {
  return {
    id: r.id,
    username: r.username,
    avatarUrl: r.avatar_url,
    bio: r.bio ?? null,
    isPrivate: r.is_private,
    isAdmin: r.is_admin ?? false,
    seenNotificationId: r.seen_notification_id ?? null,
    createdAt: r.created_at,
  };
}

/** Lowercase + strip anything outside [a-z0-9_-]; used both for defaults and to normalise input. */
export function normalizeUsername(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, USERNAME_MAX_LENGTH);
}

/** Human-readable reason a username is invalid, or null when it's fine. */
export function usernameError(username: string): string | null {
  if (username.length < USERNAME_MIN_LENGTH) return `At least ${USERNAME_MIN_LENGTH} characters`;
  if (username.length > USERNAME_MAX_LENGTH) return `At most ${USERNAME_MAX_LENGTH} characters`;
  if (!USERNAME_RE.test(username)) return 'Only lowercase letters, numbers, _ and -';
  return null;
}

/** Postgres unique-violation — the only unique constraint a client can hit here is the username. */
export function isUsernameTakenError(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'code' in error && error.code === '23505';
}

/** Default username: the part of the email before the @, same as the old nav label. */
export function defaultUsernameFromEmail(email: string | null | undefined): string {
  const base = normalizeUsername((email ?? '').split('@')[0] ?? '');
  return base.length >= USERNAME_MIN_LENGTH ? base : `user${base}`.slice(0, USERNAME_MAX_LENGTH);
}

export async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return dbToProfile(data as DbProfile);
}

/**
 * Load the signed-in user's profile, creating it when the DB trigger hasn't
 * (accounts that predate the profiles table, or a trigger that wasn't
 * installed). Retries with a random suffix if the default username is taken.
 */
export async function loadOrCreateOwnProfile(userId: string, email: string | null | undefined): Promise<Profile> {
  const existing = await loadProfile(userId);
  if (existing) return existing;

  const base = defaultUsernameFromEmail(email);
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = attempt === 0 ? '' : String(Math.floor(Math.random() * 10000));
    const username = `${base.slice(0, USERNAME_MAX_LENGTH - suffix.length)}${suffix}`;
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: userId, username })
      .select()
      .single();
    if (!error) return dbToProfile(data as DbProfile);
    if (!isUsernameTakenError(error)) {
      // A concurrent insert (second tab, trigger racing us) — read it back.
      const again = await loadProfile(userId);
      if (again) return again;
      throw error;
    }
  }
  throw new Error('Could not pick a free username');
}

export async function loadProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return dbToProfile(data as DbProfile);
}

/** Batch-load profiles by id (for author bylines). Missing ids are simply absent from the map. */
export async function loadProfilesByIds(ids: string[]): Promise<Map<string, Profile>> {
  const unique = [...new Set(ids)].filter(Boolean);
  const map = new Map<string, Profile>();
  if (unique.length === 0) return map;
  const { data, error } = await supabase.from('profiles').select('*').in('id', unique);
  if (error) throw error;
  for (const row of data as DbProfile[]) map.set(row.id, dbToProfile(row));
  return map;
}

export async function updateProfile(
  userId: string,
  patch: Partial<{ username: string; avatarUrl: string | null; bio: string | null; isPrivate: boolean; seenNotificationId: string | null }>,
): Promise<Profile> {
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.username !== undefined) dbPatch.username = patch.username;
  if (patch.avatarUrl !== undefined) dbPatch.avatar_url = patch.avatarUrl;
  if (patch.bio !== undefined) dbPatch.bio = patch.bio ? patch.bio.slice(0, BIO_MAX_LENGTH) : null;
  if (patch.isPrivate !== undefined) dbPatch.is_private = patch.isPrivate;
  if (patch.seenNotificationId !== undefined) dbPatch.seen_notification_id = patch.seenNotificationId;

  const { data, error } = await supabase.from('profiles').update(dbPatch).eq('id', userId).select().single();
  if (error) throw error;
  return dbToProfile(data as DbProfile);
}

/** Centre-crop and downscale an image file to a small square so avatars stay tiny. */
function squareImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas unavailable'));
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))), 'image/jpeg', 0.86);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}

/** Upload a profile picture and return its public URL. */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const blob = await squareImage(file);
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw error;
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Best-effort removal of a previously uploaded avatar (ignores foreign / already-gone URLs). */
export async function deleteAvatar(publicUrl: string): Promise<void> {
  try {
    const url = new URL(publicUrl);
    const parts = url.pathname.split(`/${AVATAR_BUCKET}/`);
    if (parts.length < 2) return;
    await supabase.storage.from(AVATAR_BUCKET).remove([parts[1]]);
  } catch { /* ignore */ }
}

/** Best-effort: remove every file under {userId}/ in a bucket (one level of folders deep). */
async function removeUserFiles(bucket: string, userId: string): Promise<void> {
  try {
    const { data: entries } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
    if (!entries?.length) return;
    const paths: string[] = [];
    for (const entry of entries) {
      if (entry.id) {
        paths.push(`${userId}/${entry.name}`);
      } else {
        // A folder (e.g. jcard-images/{uid}/{cardId}/…): list one level down.
        const { data: nested } = await supabase.storage.from(bucket).list(`${userId}/${entry.name}`, { limit: 1000 });
        for (const f of nested ?? []) if (f.id) paths.push(`${userId}/${entry.name}/${f.name}`);
      }
    }
    if (paths.length) await supabase.storage.from(bucket).remove(paths);
  } catch { /* ignore — the account row is what matters */ }
}

/**
 * Permanently delete the signed-in user's account. Uploaded files are removed
 * first (while the user's storage permissions still apply), then the
 * delete_own_account() SQL function removes the auth user, which cascades to
 * the profile, mixtapes, J-cards and feedback attribution. Ends signed out.
 */
export async function deleteOwnAccount(userId: string): Promise<void> {
  await Promise.all([
    removeUserFiles(AVATAR_BUCKET, userId),
    removeUserFiles('jcard-images', userId),
    removeUserFiles('jcard-renders', userId),
  ]);
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw error;
  await supabase.auth.signOut();
}

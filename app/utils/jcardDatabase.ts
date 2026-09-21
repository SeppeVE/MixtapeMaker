import { supabase } from './supabase';
import { JCard, JCardContent, JCardPreviewRow } from '../types';
import { duplicateJCardImages } from './supabaseImages';

interface DbJCard {
  id: string; user_id: string; mixtape_id: string | null;
  title: string; content: JCardContent; created_at: string; updated_at: string;
  is_public: boolean | null; is_copy: boolean | null; copied_from_id: string | null;
}

interface DbJCardPreviewRow {
  id: string; title: string; user_id: string; mixtape_id: string | null; updated_at: string;
  flap_count: number; has_inside: boolean; content: JCardContent;
}

function dbToJCard(r: DbJCard): JCard {
  return {
    id: r.id, title: r.title, userId: r.user_id, mixtapeId: r.mixtape_id, content: r.content,
    createdAt: r.created_at, updatedAt: r.updated_at, isPublic: r.is_public ?? false,
    isCopy: r.is_copy ?? false, copiedFromId: r.copied_from_id,
  };
}

function dbToJCardPreviewRow(r: DbJCardPreviewRow): JCardPreviewRow {
  return {
    id: r.id, title: r.title, userId: r.user_id, mixtapeId: r.mixtape_id, updatedAt: r.updated_at,
    flapCount: r.flap_count, hasInside: r.has_inside, content: r.content,
  };
}

export async function listJCards(userId: string): Promise<JCard[]> {
  const { data, error } = await supabase.from('jcards').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as DbJCard[]).map(dbToJCard);
}

export async function loadJCard(id: string): Promise<JCard | null> {
  const { data, error } = await supabase.from('jcards').select('*').eq('id', id).single();
  if (error) { if (error.code === 'PGRST116') return null; throw error; }
  return dbToJCard(data as DbJCard);
}

/** A single card, only if it's public (or the caller owns it — RLS decides). Null when hidden/missing. */
export async function loadPublicJCard(id: string): Promise<JCard | null> {
  const { data, error } = await supabase
    .from('jcards').select('*').eq('id', id).eq('is_public', true).eq('is_copy', false).single();
  if (error) { if (error.code === 'PGRST116') return null; throw error; }
  return dbToJCard(data as DbJCard);
}

/** Public cards a user has chosen to show on their profile. */
export async function listPublicJCardsByUser(userId: string): Promise<JCard[]> {
  const { data, error } = await supabase
    .from('jcards').select('*').eq('user_id', userId).eq('is_public', true).eq('is_copy', false)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as DbJCard[]).map(dbToJCard);
}

/** Public cards linked to a mixtape, shown on that mixtape's detail page. */
export async function listPublicJCardsForMixtape(mixtapeId: string): Promise<JCard[]> {
  const { data, error } = await supabase
    .from('jcards').select('*').eq('mixtape_id', mixtapeId).eq('is_public', true).eq('is_copy', false)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as DbJCard[]).map(dbToJCard);
}

/** Trimmed rows (no inside content, no custom fonts, no data: URLs) from the public_jcard_previews view. */
export async function searchPublicJCards(
  query: string,
  limit = 12,
  offset = 0,
): Promise<{ cards: JCardPreviewRow[]; total: number }> {
  let req = supabase.from('public_jcard_previews').select('*', { count: 'exact' });
  if (query.trim()) {
    req = req.ilike('title', `%${query.trim()}%`);
  }
  const { data, error, count } = await req
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { cards: (data as DbJCardPreviewRow[]).map(dbToJCardPreviewRow), total: count ?? 0 };
}

export async function createJCard(userId: string, input: {
  id?: string; title: string; content: JCardContent; mixtapeId?: string | null; isPublic?: boolean;
  isCopy?: boolean; copiedFromId?: string | null;
}): Promise<JCard> {
  const row: Record<string, unknown> = {
    user_id: userId, mixtape_id: input.mixtapeId ?? null, title: input.title, content: input.content,
    is_public: input.isPublic ?? false, is_copy: input.isCopy ?? false, copied_from_id: input.copiedFromId ?? null,
  };
  // Callers that need the id before the row exists pass their own — a copy
  // files its images under `${userId}/${cardId}/` before inserting. Everyone
  // else lets Supabase generate one.
  if (input.id) row.id = input.id;
  const { data, error } = await supabase.from('jcards').insert(row).select().single();
  if (error) throw error;
  return dbToJCard(data as DbJCard);
}

export class JCardCopyError extends Error {
  constructor(public reason: 'source-unavailable') {
    super(reason);
    this.name = 'JCardCopyError';
  }
}

/**
 * Duplicate someone else's public card into `userId`'s library: private,
 * unlinked from the source's mixtape, flagged as an untouched copy, and
 * pointed at its own images rather than the original author's.
 */
export async function copyPublicJCard(sourceId: string, userId: string): Promise<JCard> {
  const source = await loadPublicJCard(sourceId);
  if (!source) throw new JCardCopyError('source-unavailable');
  // Mint the id first so the images can be filed under the card that owns them.
  const id = crypto.randomUUID();
  const content = await duplicateJCardImages(source.content, userId, id);
  return createJCard(userId, {
    id,
    title: `${source.title || 'Untitled J-Card'} (copy)`,
    content,
    mixtapeId: null,
    isPublic: false,
    isCopy: true,
    copiedFromId: sourceId,
  });
}

export async function updateJCard(id: string, patch: Partial<{ title: string; content: JCardContent; mixtapeId: string | null; isPublic: boolean; isCopy: boolean }>): Promise<JCard> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.content !== undefined) dbPatch.content = patch.content;
  if (patch.mixtapeId !== undefined) dbPatch.mixtape_id = patch.mixtapeId;
  if (patch.isPublic !== undefined) dbPatch.is_public = patch.isPublic;
  if (patch.isCopy !== undefined) dbPatch.is_copy = patch.isCopy;
  const { data, error } = await supabase.from('jcards').update(dbPatch).eq('id', id).select().single();
  if (error) throw error;
  return dbToJCard(data as DbJCard);
}

export async function toggleJCardPublic(id: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase.from('jcards').update({ is_public: isPublic }).eq('id', id);
  if (error) throw error;
}

export async function deleteJCard(id: string): Promise<void> {
  const { error } = await supabase.from('jcards').delete().eq('id', id);
  if (error) throw error;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Upload a card to the cloud.
 * If the card's id is already a UUID (previously cloud-saved) we upsert in-place.
 * If it's a locally-generated id (timestamp format) we let Supabase create a new UUID,
 * and the returned card will have the new id — the caller should replace the local copy.
 */
export async function upsertJCard(card: JCard, userId: string): Promise<JCard> {
  const payload: Record<string, unknown> = {
    user_id: userId,
    mixtape_id: card.mixtapeId ?? null,
    title: card.title,
    content: card.content,
    is_public: card.isPublic ?? false,
    is_copy: card.isCopy ?? false,
    copied_from_id: card.copiedFromId ?? null,
    created_at: card.createdAt,
    updated_at: new Date().toISOString(),
  };

  // Only forward the id when it's already a valid UUID — otherwise let Supabase generate one.
  if (UUID_RE.test(card.id)) {
    payload.id = card.id;
  }

  const { data, error } = await supabase
    .from('jcards')
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return dbToJCard(data as DbJCard);
}

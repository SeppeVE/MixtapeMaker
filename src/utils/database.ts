import { supabase } from './supabase';
import { Mixtape } from '../types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DatabaseMixtape {
  id: string;
  user_id: string;
  title: string;
  cassette_length: number;
  side_a: unknown[];
  side_b: unknown[];
  created_at: string;
  updated_at: string;
  is_public: boolean;
}

// A cloud-saved mixtape always has a UUID id (see saveMixtape below).
export const isCloudId = (id: string): boolean => UUID_RE.test(id);

// Convert database format to app format
function dbToMixtape(dbMixtape: DatabaseMixtape): Mixtape {
  return {
    id: dbMixtape.id,
    title: dbMixtape.title,
    cassetteLength: dbMixtape.cassette_length as 60 | 90 | 120,
    sideA: dbMixtape.side_a as Mixtape['sideA'],
    sideB: dbMixtape.side_b as Mixtape['sideB'],
    createdAt: dbMixtape.created_at,
    updatedAt: dbMixtape.updated_at,
    isPublic: dbMixtape.is_public,
  };
}

// Convert app format to database format
function mixtapeToDb(mixtape: Mixtape, _userId: string): Omit<DatabaseMixtape, 'user_id'> {
  return {
    id: mixtape.id,
    title: mixtape.title,
    cassette_length: mixtape.cassetteLength,
    side_a: mixtape.sideA,
    side_b: mixtape.sideB,
    created_at: mixtape.createdAt,
    updated_at: mixtape.updatedAt,
    is_public: mixtape.isPublic,
  };
}

// Save a mixtape to the database
export async function saveMixtape(mixtape: Mixtape, userId: string): Promise<Mixtape> {
  const dbMixtape = mixtapeToDb(mixtape, userId);
  const payload: DatabaseMixtape = {
    ...dbMixtape,
    user_id: userId,
  };

  // Legacy cloud tapes use timestamp ids — keep them on update.
  // New local drafts get a UUID so future shares use a standard id format.
  if (!UUID_RE.test(mixtape.id)) {
    const existing = await loadMixtape(mixtape.id);
    payload.id = existing ? mixtape.id : crypto.randomUUID();
  }

  const { data, error } = await supabase
    .from('mixtapes')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return dbToMixtape(data);
}

// Load all mixtapes for a user
export async function loadMixtapes(userId: string): Promise<Mixtape[]> {
  const { data, error } = await supabase
    .from('mixtapes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data.map(dbToMixtape);
}

// Load a specific mixtape
export async function loadMixtape(mixtapeId: string): Promise<Mixtape | null> {
  const { data, error } = await supabase
    .from('mixtapes')
    .select('*')
    .eq('id', mixtapeId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return dbToMixtape(data);
}

// Delete a mixtape
export async function deleteMixtape(mixtapeId: string) {
  const { error } = await supabase
    .from('mixtapes')
    .delete()
    .eq('id', mixtapeId);

  if (error) throw error;
}

// Toggle whether a mixtape is publicly visible
export async function toggleMixtapePublic(mixtapeId: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase
    .from('mixtapes')
    .update({ is_public: isPublic })
    .eq('id', mixtapeId);

  if (error) throw error;
}

// Search publicly shared mixtapes by title
export async function searchPublicMixtapes(
  query: string,
  limit = 24,
  offset = 0
): Promise<Mixtape[]> {
  let req = supabase
    .from('mixtapes')
    .select('*')
    .eq('is_public', true);

  if (query.trim()) {
    req = req.ilike('title', `%${query.trim()}%`);
  }

  const { data, error } = await req
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data.map(dbToMixtape);
}

// Load a single public mixtape by id, returning null if it doesn't exist or isn't public
export async function loadPublicMixtape(mixtapeId: string): Promise<Mixtape | null> {
  const { data, error } = await supabase
    .from('mixtapes')
    .select('*')
    .eq('id', mixtapeId)
    .eq('is_public', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return dbToMixtape(data);
}

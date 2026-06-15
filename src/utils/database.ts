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
}

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
  };
}

// Save a mixtape to the database
export async function saveMixtape(mixtape: Mixtape, userId: string): Promise<Mixtape> {
  const dbMixtape = mixtapeToDb(mixtape, userId);

  // Strip locally-generated (non-UUID) ids so Supabase generates a real UUID
  const payload: Omit<DatabaseMixtape, 'user_id'> & { user_id: string; id?: string } = {
    ...dbMixtape,
    user_id: userId,
  };
  if (!UUID_RE.test(mixtape.id)) {
    delete payload.id;
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

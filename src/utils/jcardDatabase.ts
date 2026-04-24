import { supabase } from './supabase';
import { JCard, JCardContent } from '../types';

interface DbJCard {
  id: string; user_id: string; mixtape_id: string | null;
  title: string; content: JCardContent; created_at: string; updated_at: string;
}

function dbToJCard(r: DbJCard): JCard {
  return { id: r.id, title: r.title, userId: r.user_id, mixtapeId: r.mixtape_id, content: r.content, createdAt: r.created_at, updatedAt: r.updated_at };
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

export async function createJCard(userId: string, input: { title: string; content: JCardContent; mixtapeId?: string | null }): Promise<JCard> {
  const { data, error } = await supabase.from('jcards').insert({ user_id: userId, mixtape_id: input.mixtapeId ?? null, title: input.title, content: input.content }).select().single();
  if (error) throw error;
  return dbToJCard(data as DbJCard);
}

export async function updateJCard(id: string, patch: Partial<{ title: string; content: JCardContent; mixtapeId: string | null }>): Promise<JCard> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.content !== undefined) dbPatch.content = patch.content;
  if (patch.mixtapeId !== undefined) dbPatch.mixtape_id = patch.mixtapeId;
  const { data, error } = await supabase.from('jcards').update(dbPatch).eq('id', id).select().single();
  if (error) throw error;
  return dbToJCard(data as DbJCard);
}

export async function deleteJCard(id: string): Promise<void> {
  const { error } = await supabase.from('jcards').delete().eq('id', id);
  if (error) throw error;
}

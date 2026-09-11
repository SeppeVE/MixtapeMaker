import { supabase } from './supabase';
import type { AppNotification } from '../types';

// Keep in sync with the CHECK constraints on notifications in SUPABASE_SETUP.md.
export const NOTIFICATION_TITLE_MAX_LENGTH = 120;
export const NOTIFICATION_BODY_MAX_LENGTH = 2000;

interface DbNotification {
  id: string;
  title: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
  created_at: string;
}

function dbToNotification(r: DbNotification): AppNotification {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    linkUrl: r.link_url,
    linkLabel: r.link_label,
    createdAt: r.created_at,
  };
}

/** The single newest announcement — the only one a user is ever shown. */
export async function loadLatestNotification(): Promise<AppNotification | null> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? dbToNotification(data as DbNotification) : null;
}

/** Full history, newest first (admin panel). */
export async function listNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as DbNotification[]).map(dbToNotification);
}

export async function createNotification(
  input: { title: string; body: string; linkUrl?: string | null; linkLabel?: string | null },
  userId: string,
): Promise<AppNotification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      title: input.title.slice(0, NOTIFICATION_TITLE_MAX_LENGTH),
      body: input.body.slice(0, NOTIFICATION_BODY_MAX_LENGTH),
      link_url: input.linkUrl || null,
      link_label: input.linkLabel || null,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return dbToNotification(data as DbNotification);
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}

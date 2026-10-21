import { supabase } from './supabase';
import type { SiteStats } from '../types';

// Admin-only site counts from the admin_stats() RPC in SUPABASE_SETUP.md
// (Step 3f, part 9). The function itself checks is_admin() and raises for
// everyone else, so this throws rather than returning zeros.
export async function loadSiteStats(days = 14): Promise<SiteStats> {
  const { data, error } = await supabase.rpc('admin_stats', { days });
  if (error) throw error;
  return data as SiteStats;
}

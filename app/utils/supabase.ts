import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (import.meta.server) {
    throw new Error('The Supabase client is only available in the browser.');
  }
  if (!_client) {
    const config = useRuntimeConfig();
    const supabaseUrl = config.public.supabaseUrl || '';
    const supabaseAnonKey = config.public.supabaseAnonKey || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn(
        'Supabase credentials not found. Please add NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY to your .env file.'
      );
    }

    _client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _client;
}

/**
 * Lazily-initialized Supabase client. Keeps the same `supabase.xxx` call sites
 * as the old app while deferring construction until the browser runtime config
 * is available (first touched by the auth plugin).
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const value = (getClient() as any)[prop];
    return typeof value === 'function' ? value.bind(_client) : value;
  },
});

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useRuntimeConfig } from '#app';

// Lazily create the client on first use so `useRuntimeConfig()` is only read
// inside a Nuxt request/app context (never at module-eval time, which would
// break SSR of the public pages that import this).
let _client: SupabaseClient | null = null;

function client(): SupabaseClient {
  if (_client) return _client;
  const config = useRuntimeConfig();
  const url = config.public.supabaseUrl as string;
  const key = config.public.supabaseAnonKey as string;
  if (!url || !key) {
    console.warn(
      'Supabase credentials not found. Set NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  _client = createClient(url, key);
  return _client;
}

// Proxy keeps the `supabase.from(...)` / `supabase.auth` call sites unchanged
// while deferring construction until the config is available.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(client() as object, prop, client());
  },
});

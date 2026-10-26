import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Single Supabase client for the whole app.
 * Config comes from Vite env vars (set in .env.local and in Netlify):
 *   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
 *   VITE_SUPABASE_ANON_KEY=sb_publishable_... (or legacy anon JWT)
 */
let client: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    realtime: { params: { eventsPerSecond: 5 } },
  });
  return client;
};

/** Minimal user shape used across the app (replaces firebase/auth User). */
export interface AppUser {
  uid: string;
  email: string | null;
}

export const nowIso = () => new Date().toISOString();

/** Strip `undefined` recursively (keeps JSON clean, same as the old Firestore helper). */
export function removeUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(removeUndefined) as unknown as T;
  if (obj !== null && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v !== undefined) out[k] = removeUndefined(v);
    }
    return out as T;
  }
  return obj;
}

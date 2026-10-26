/**
 * Compatibility shim — the app moved from Firebase to Supabase (Oct 2026).
 * All callers keep importing from './firebaseService'; the implementation lives in supabaseService.ts.
 */
export * from './supabaseService';

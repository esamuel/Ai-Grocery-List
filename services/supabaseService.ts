/**
 * Data + auth layer on Supabase.
 * Replaces services/firebaseService.ts (Firestore `users` / `groceryLists`).
 *
 * Tables: gl_users(id, email, data jsonb), gl_lists(id, owner_id, members uuid[], data jsonb)
 * `data` keeps the exact shape the old Firestore documents had, so the rest of the app is unchanged.
 */
import { getSupabase, nowIso, removeUndefined, type AppUser } from './supabaseClient';
import type { GroceryListData, GroceryHistoryItem, GroceryItem } from '../types';

export type User = AppUser;

let currentUser: AppUser | null = null;

const toAppUser = (u: { id: string; email?: string | null } | null | undefined): AppUser | null =>
  u ? { uid: u.id, email: u.email ?? null } : null;

const genListId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// ---------------------------------------------------------------- users

type UserDoc = {
  email?: string;
  displayName?: string;
  favorites?: GroceryHistoryItem[];
  mainListId?: string;
  sharedListId?: string;
  createdAt?: string;
  lastActive?: string;
  updatedAt?: string;
};

async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const { data, error } = await getSupabase().from('gl_users').select('email,data').eq('id', uid).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { email: data.email, ...(data.data as UserDoc) };
}

/** Merge-patch the user's jsonb `data`. Creates the row if missing. */
async function patchUserDoc(uid: string, email: string | null, patch: Partial<UserDoc>): Promise<void> {
  const sb = getSupabase();
  const existing = await getUserDoc(uid);
  const merged = removeUndefined({ ...(existing || {}), ...patch, updatedAt: nowIso() });
  delete (merged as any).email;
  const { error } = await sb
    .from('gl_users')
    .upsert({ id: uid, email: email ?? existing?.email ?? '', data: merged }, { onConflict: 'id' });
  if (error) throw error;
}

// ---------------------------------------------------------------- auth

export const signInUser = async (email: string, password: string): Promise<AppUser> => {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  const user = toAppUser(data.user)!;
  currentUser = user;
  try {
    await patchUserDoc(user.uid, user.email, { lastActive: nowIso() });
  } catch (e) {
    console.error('Error updating user row on sign-in:', e);
  }
  return user;
};

export const signUpUser = async (email: string, password: string): Promise<AppUser> => {
  const { data, error } = await getSupabase().auth.signUp({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('Sign-up did not return a user');
  const user = toAppUser(data.user)!;
  currentUser = user;

  // If email confirmation is ON there is no session yet; the list is created on first login.
  if (data.session) {
    const listId = await createListForOwner(user.uid);
    await patchUserDoc(user.uid, user.email, {
      mainListId: listId,
      favorites: [],
      displayName: '',
      createdAt: nowIso(),
      lastActive: nowIso(),
    });
  }
  return user;
};

export const signOutUser = async (): Promise<void> => {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
  currentUser = null;
  if (typeof localStorage !== 'undefined') {
    Object.keys(localStorage).filter(k => k.startsWith('listId:')).forEach(k => localStorage.removeItem(k));
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
};

export const getCurrentUser = (): AppUser | null => currentUser;

export const onAuthStateChange = (callback: (user: AppUser | null) => void) => {
  const sb = getSupabase();
  // Fire once with the persisted session, then on every change.
  sb.auth.getSession().then(({ data }) => {
    currentUser = toAppUser(data.session?.user);
    callback(currentUser);
  });
  const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
    currentUser = toAppUser(session?.user);
    callback(currentUser);
  });
  return () => sub.subscription.unsubscribe();
};

// ---------------------------------------------------------------- lists

async function createListForOwner(ownerId: string): Promise<string> {
  const listId = genListId();
  const { error } = await getSupabase().from('gl_lists').insert({
    id: listId,
    owner_id: ownerId,
    members: [ownerId],
    data: { items: [], history: [], createdAt: nowIso() },
  });
  if (error) throw error;
  return listId;
}

export const createNewList = async (): Promise<string> => {
  if (!currentUser) throw new Error('User not authenticated');
  return createListForOwner(currentUser.uid);
};

export const doesListExist = async (listId: string): Promise<boolean> => {
  const { data, error } = await getSupabase().from('gl_lists').select('id').eq('id', listId).maybeSingle();
  if (error) return false;
  return !!data;
};

export async function getListDoc(listId: string): Promise<Record<string, any> | null> {
  const { data, error } = await getSupabase().from('gl_lists').select('data').eq('id', listId).maybeSingle();
  if (error) throw error;
  return (data?.data as Record<string, any>) ?? null;
}

/** Merge-patch fields inside the list's jsonb `data` (like Firestore updateDoc). */
export async function patchListDoc(listId: string, patch: Record<string, any>): Promise<void> {
  const existing = (await getListDoc(listId)) || {};
  const merged = removeUndefined({ ...existing, ...patch, updatedAt: nowIso() });
  const { error } = await getSupabase().from('gl_lists').update({ data: merged }).eq('id', listId);
  if (error) throw error;
}

/** Real-time subscription (Supabase Realtime on gl_lists). */
export const subscribeToList = (listId: string, callback: (data: GroceryListData) => void): (() => void) => {
  const sb = getSupabase();
  const emit = (doc: any) => callback({ items: doc?.items ?? [], history: doc?.history ?? [] });

  getListDoc(listId)
    .then(doc => emit(doc))
    .catch(err => {
      console.error('❌ Initial list load failed:', err);
      emit(null);
    });

  const channel = sb
    .channel(`gl_lists:${listId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'gl_lists', filter: `id=eq.${listId}` }, payload => {
      if (payload.eventType === 'DELETE') emit(null);
      else emit((payload.new as any)?.data);
    })
    .subscribe();

  // Safety net: Realtime may be throttled on free tiers — refresh when the tab becomes visible.
  const onVisible = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      getListDoc(listId).then(emit).catch(() => {});
    }
  };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);

  return () => {
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    sb.removeChannel(channel);
  };
};

export const updateList = async (listId: string, data: GroceryListData): Promise<void> => {
  await patchListDoc(listId, { items: data.items, history: data.history });
};

export const updateListItems = async (listId: string, items: GroceryItem[]): Promise<void> => {
  await patchListDoc(listId, { items });
};

// ---------------------------------------------------------------- favorites

export const getUserFavorites = async (): Promise<GroceryHistoryItem[]> => {
  if (!currentUser) return [];
  const doc = await getUserDoc(currentUser.uid);
  return doc?.favorites || [];
};

export const updateUserFavorites = async (favorites: GroceryHistoryItem[]): Promise<void> => {
  if (!currentUser) return;
  await patchUserDoc(currentUser.uid, currentUser.email, { favorites });
};

export const addToUserFavorites = async (items: GroceryHistoryItem[]): Promise<void> => {
  if (!currentUser) return;
  const updated = [...(await getUserFavorites())];
  items.forEach(item => {
    const i = updated.findIndex(f => f.name.toLowerCase() === item.name.toLowerCase());
    if (i > -1) {
      updated[i].frequency += item.frequency;
      updated[i].lastAdded = item.lastAdded;
    } else updated.push(item);
  });
  await updateUserFavorites(updated);
};

// ---------------------------------------------------------------- user ↔ list

export const getUserMainList = async (): Promise<string> => {
  if (!currentUser) throw new Error('User not authenticated');
  const doc = await getUserDoc(currentUser.uid);
  if (doc?.mainListId) return doc.mainListId;
  const listId = await createListForOwner(currentUser.uid);
  await patchUserDoc(currentUser.uid, currentUser.email, {
    mainListId: listId,
    createdAt: doc?.createdAt || nowIso(),
  });
  return listId;
};

export const addFamilyMember = async (memberEmail: string): Promise<boolean> => {
  if (!currentUser) return false;
  try {
    const mainListId = await getUserMainList();
    const { data, error } = await getSupabase().rpc('gl_add_family_member', {
      p_list_id: mainListId,
      p_member_email: memberEmail.toLowerCase().trim(),
    });
    if (error) {
      if (/PERMISSION_DENIED/.test(error.message)) throw new Error(error.message);
      console.error('addFamilyMember failed:', error);
      return false;
    }
    return data === true;
  } catch (e) {
    console.error('Error adding family member:', e);
    if (e instanceof Error && /PERMISSION_DENIED/.test(e.message)) throw e;
    return false;
  }
};

export const getAccessibleListId = async (): Promise<string> => {
  if (!currentUser) throw new Error('User not authenticated');
  const cacheKey = `listId:${currentUser.uid}`;
  const cached = typeof localStorage !== 'undefined' ? localStorage.getItem(cacheKey) : null;
  if (cached) {
    doesListExist(cached).then(exists => {
      if (!exists && typeof localStorage !== 'undefined') localStorage.removeItem(cacheKey);
    }).catch(() => {});
    return cached;
  }
  const doc = await getUserDoc(currentUser.uid);
  const id = doc?.sharedListId || doc?.mainListId || (await getUserMainList());
  if (typeof localStorage !== 'undefined') localStorage.setItem(cacheKey, id);
  return id;
};

export const forceRefreshUserList = async (): Promise<string> => {
  if (!currentUser) throw new Error('User not authenticated');
  if (typeof localStorage !== 'undefined') localStorage.removeItem(`listId:${currentUser.uid}`);
  return getAccessibleListId();
};

export const isListOwner = async (): Promise<boolean> => {
  if (!currentUser) return false;
  try {
    const doc = await getUserDoc(currentUser.uid);
    return !!doc?.mainListId && !doc?.sharedListId;
  } catch {
    return false;
  }
};

export const getUserDisplayName = async (): Promise<string> => {
  if (!currentUser) return '';
  try {
    return (await getUserDoc(currentUser.uid))?.displayName || '';
  } catch {
    return '';
  }
};

export const updateUserDisplayName = async (displayName: string): Promise<boolean> => {
  if (!currentUser) return false;
  try {
    await patchUserDoc(currentUser.uid, currentUser.email, { displayName: displayName.trim() });
    return true;
  } catch (e) {
    console.error('Error updating display name:', e);
    return false;
  }
};

/** Kept for callers that used to grab the raw Firebase handles. */
export const getFirebaseServices = () => {
  throw new Error('Firebase has been removed. Use getSupabase() from services/supabaseClient.ts');
};

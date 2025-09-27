import { doc as docLite, getDoc as getDocLite, setDoc as setDocLite } from 'firebase/firestore/lite';
import { getFirestore as getFirestoreLite } from 'firebase/firestore/lite';

// Reuse firebase initialization from firebaseService via lazy getter
import { } from './firebaseService';

export type Language = 'en' | 'he' | 'es';

export interface SuggestedItem {
  name: string;
  category?: string;
  frequency: number;
  lastAdded?: string;
}

// Minimal accessor to Firestore Lite already initialized in firebaseService
function getDb() {
  // firebaseService already initializes and caches; import side-effects ensure app is initialized
  // We re-create the db instance using the same app (safe), or rely on firebaseService exported getter pattern if available in future.
  // This keeps us consistent with Firestore Lite usage elsewhere in the app.
  // @ts-ignore - globalThis.firebaseApp may be set by firebaseService; if not, firebaseService exports manage a singleton internally.
  // As we cannot import internals, we'll reinitialize via firebase config already present there; Firestore Lite handles singletons per app.
  // But to avoid duplication, we piggyback on existing instances by calling an exported function if present in future.
  // For now, Firebase SDK will return existing app when initializeApp is called with same config; however, here we avoid calling it again.
  // So we simply access the default app through getFirestoreLite with no args is not possible; use window._firebaseApp pattern is not reliable.
  // Instead, we access the Firestore instance indirectly via firebaseService docLite usage patterns by requiring caller to pass listId.
  // However, we still need a db reference; we can obtain it from any doc path using docLite requires db. We'll rely on getFirestoreLite from the default app.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyFirebase: any = (globalThis as any);
  if (!anyFirebase.__firebase_db_lite) {
    // Try to read from firebaseService by requiring it to initialize first via getAccessibleListId call before suggestions use.
    // The app already calls getAccessibleListId on auth ready, so db should be initialized.
    try {
      // Attempt to use the default app via getFirestoreLite(defaultApp)
      // @ts-ignore
      const db = getFirestoreLite();
      anyFirebase.__firebase_db_lite = db;
    } catch (e) {
      throw new Error('Firestore not initialized yet. Ensure firebaseService initialized before using suggestionsFirestoreService.');
    }
  }
  return anyFirebase.__firebase_db_lite;
}

function suggestionsDocPath(listId: string, language: Language) {
  // Path: groceryLists/{listId}/suggestions/{language}
  return docLite(getDb(), 'groceryLists', listId, 'suggestions', language);
}

// Quota backoff keys
function disableKey(listId: string, language: Language) {
  return `suggestions:disableUntil:${listId}:${language}`;
}

function isQuotaError(e: any): boolean {
  const msg = (e && (e.message || e.code || e.name)) ? String(e.message || e.code || e.name) : '';
  return /resource-exhausted|quota exceeded|429/i.test(msg);
}

export async function getSuggestionsFromFirestore(listId: string, language: Language): Promise<SuggestedItem[]> {
  // Offline support: use localStorage when listId signals offline mode
  if (listId.startsWith('offline-')) {
    const key = `suggestions:${listId}:${language}`;
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as SuggestedItem[]) : [];
    } catch (e) {
      console.warn('getSuggestionsFromFirestore (offline) parse failed', e);
      return [];
    }
  }

  // If we recently hit quota, short-circuit to avoid spamming Firestore
  try {
    const disabledUntil = typeof localStorage !== 'undefined' ? Number(localStorage.getItem(disableKey(listId, language)) || 0) : 0;
    if (disabledUntil && Date.now() < disabledUntil) {
      return [];
    }
  } catch {
    // ignore localStorage errors
  }

  try {
    const docRef = suggestionsDocPath(listId, language);
    const snap = await getDocLite(docRef);
    if (!snap.exists()) return [];
    const data = snap.data();
    return (data.items || []) as SuggestedItem[];
  } catch (e) {
    // On quota errors, disable further fetches for a cooldown window
    if (isQuotaError(e)) {
      try {
        // Cooldown for 30 minutes to be conservative
        const until = Date.now() + 30 * 60 * 1000;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(disableKey(listId, language), String(until));
        }
      } catch { /* ignore */ }
    }
    console.warn('getSuggestionsFromFirestore failed', e);
    return [];
  }
}

export async function setSuggestionsToFirestore(listId: string, language: Language, items: SuggestedItem[]): Promise<void> {
  if (listId.startsWith('offline-')) {
    const key = `suggestions:${listId}:${language}`;
    localStorage.setItem(key, JSON.stringify(items));
    return;
  }
  const docRef = suggestionsDocPath(listId, language);
  await setDocLite(docRef, { items, updatedAt: new Date().toISOString() });
}

export async function upsertSuggestionsToFirestore(listId: string, language: Language, items: SuggestedItem[]): Promise<void> {
  const current = await getSuggestionsFromFirestore(listId, language);
  const map = new Map<string, SuggestedItem>();
  current.forEach(i => map.set(i.name.toLowerCase(), i));
  items.forEach(i => {
    const key = i.name.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        category: i.category || existing.category,
        frequency: (existing.frequency || 0) + (i.frequency || 1),
        lastAdded: i.lastAdded || existing.lastAdded,
      });
    } else {
      map.set(key, { name: i.name, category: i.category, frequency: i.frequency || 1, lastAdded: i.lastAdded });
    }
  });
  await setSuggestionsToFirestore(listId, language, Array.from(map.values()));
}

export async function addOrIncrementFromPurchasedFirestore(listId: string, language: Language, purchased: { name: string; category?: string }[]) {
  const current = await getSuggestionsFromFirestore(listId, language);
  const map = new Map<string, SuggestedItem>();
  current.forEach(i => map.set(i.name.toLowerCase(), i));
  const now = new Date().toISOString();
  purchased.forEach(p => {
    const key = p.name.toLowerCase();
    const found = map.get(key);
    if (found) {
      found.frequency = (found.frequency || 0) + 1;
      found.lastAdded = now;
      if (p.category && !found.category) found.category = p.category;
    } else {
      map.set(key, { name: p.name, category: p.category, frequency: 1, lastAdded: now });
    }
  });
  await setSuggestionsToFirestore(listId, language, Array.from(map.values()));
}

export function subscribeSuggestions(listId: string, language: Language, callback: (items: SuggestedItem[]) => void): () => void {
  let cancelled = false;
  const BASE_INTERVAL = listId.startsWith('offline-') ? 20000 : 20000; // 20s base in both modes
  const MAX_INTERVAL = 30 * 60 * 1000; // 30 minutes
  let currentInterval = BASE_INTERVAL;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const scheduleNext = () => {
    if (cancelled) return;
    const jitter = Math.random() * 300;
    timer = setTimeout(poll, currentInterval + jitter);
  };

  const poll = async () => {
    if (cancelled) return;
    // Slow down when tab hidden
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      currentInterval = Math.min(Math.max(currentInterval, 60000), MAX_INTERVAL); // at least 1 min hidden
      scheduleNext();
      return;
    }
    try {
      // Respect cooldown from previous quota errors
      try {
        const disabledUntil = typeof localStorage !== 'undefined' ? Number(localStorage.getItem(disableKey(listId, language)) || 0) : 0;
        if (disabledUntil && Date.now() < disabledUntil) {
          currentInterval = MAX_INTERVAL;
          scheduleNext();
          return;
        }
      } catch { /* ignore */ }

      const items = await getSuggestionsFromFirestore(listId, language);
      if (!cancelled) callback(items);
      currentInterval = BASE_INTERVAL; // reset on success
    } catch (e) {
      console.warn('Polling suggestions failed', e);
      currentInterval = Math.min(currentInterval * 2, MAX_INTERVAL);
    } finally {
      scheduleNext();
    }
  };

  poll();
  return () => { cancelled = true; if (timer) clearTimeout(timer); };
}

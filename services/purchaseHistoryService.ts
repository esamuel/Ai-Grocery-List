import { doc as docLite, getDoc as getDocLite, setDoc as setDocLite } from 'firebase/firestore/lite';
import { getFirestore as getFirestoreLite } from 'firebase/firestore/lite';
import type { PurchaseHistoryItem, GroceryHistoryItem } from '../types';
import type { SuggestedItem } from './suggestionsFirestoreService';

type Language = 'en' | 'he' | 'es';

// Access Firestore instance
function getDb() {
  const anyFirebase: any = (globalThis as any);
  if (!anyFirebase.__firebase_db_lite) {
    try {
      // @ts-ignore
      const db = getFirestoreLite();
      anyFirebase.__firebase_db_lite = db;
    } catch (e) {
      throw new Error('Firestore not initialized yet. Ensure firebaseService initialized before using purchaseHistoryService.');
    }
  }
  return anyFirebase.__firebase_db_lite;
}

function historyDocPath(listId: string) {
  // Path: groceryLists/{listId}/purchaseHistory/data
  return docLite(getDb(), 'groceryLists', listId, 'purchaseHistory', 'data');
}

// Calculate average days between purchases
function calculateAvgDaysBetween(frequency: number, firstPurchased: string, lastPurchased: string): number {
  if (frequency <= 1) return 0;
  
  const first = new Date(firstPurchased).getTime();
  const last = new Date(lastPurchased).getTime();
  const totalDays = (last - first) / (1000 * 60 * 60 * 24);
  
  return Math.round(totalDays / (frequency - 1));
}

// Get purchase history from Firestore
export async function getPurchaseHistory(listId: string): Promise<PurchaseHistoryItem[]> {
  // Offline support
  if (listId.startsWith('offline-')) {
    const key = `purchaseHistory:${listId}`;
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as PurchaseHistoryItem[]) : [];
    } catch (e) {
      console.warn('getPurchaseHistory (offline) parse failed', e);
      return [];
    }
  }

  try {
    const docRef = historyDocPath(listId);
    const snap = await getDocLite(docRef);
    if (!snap.exists()) return [];
    const data = snap.data();
    return (data.items || []) as PurchaseHistoryItem[];
  } catch (e) {
    console.warn('getPurchaseHistory failed', e);
    return [];
  }
}

// Set purchase history to Firestore
export async function setPurchaseHistory(listId: string, items: PurchaseHistoryItem[]): Promise<void> {
  if (listId.startsWith('offline-')) {
    const key = `purchaseHistory:${listId}`;
    localStorage.setItem(key, JSON.stringify(items));
    return;
  }

  const docRef = historyDocPath(listId);
  await setDocLite(docRef, { 
    items, 
    updatedAt: new Date().toISOString(),
    version: 2 // Mark as new unified format
  });
}

// Add or increment item in purchase history
export async function addOrIncrementPurchase(
  listId: string,
  items: { name: string; category?: string }[]
): Promise<void> {
  const current = await getPurchaseHistory(listId);
  const map = new Map<string, PurchaseHistoryItem>();
  
  // Load existing items
  current.forEach(item => map.set(item.name.toLowerCase(), item));
  
  const now = new Date().toISOString();
  
  // Process new purchases
  items.forEach(purchase => {
    const key = purchase.name.toLowerCase();
    const existing = map.get(key);
    
    if (existing) {
      // Update existing item
      const updated: PurchaseHistoryItem = {
        ...existing,
        frequency: existing.frequency + 1,
        lastPurchased: now,
        category: purchase.category || existing.category,
      };
      
      // Calculate average days between purchases
      if (existing.firstPurchased) {
        updated.avgDaysBetween = calculateAvgDaysBetween(
          updated.frequency,
          existing.firstPurchased,
          now
        );
      }
      
      map.set(key, updated);
    } else {
      // Create new item
      map.set(key, {
        name: purchase.name,
        category: purchase.category || 'Uncategorized',
        frequency: 1,
        lastPurchased: now,
        firstPurchased: now,
        avgDaysBetween: 0,
      });
    }
  });
  
  await setPurchaseHistory(listId, Array.from(map.values()));
}

// Toggle starred status
export async function toggleStarred(listId: string, itemName: string): Promise<void> {
  const history = await getPurchaseHistory(listId);
  const updated = history.map(item => {
    if (item.name.toLowerCase() === itemName.toLowerCase()) {
      return { ...item, starred: !item.starred };
    }
    return item;
  });
  await setPurchaseHistory(listId, updated);
}

// Delete item from history
export async function deleteFromHistory(listId: string, itemName: string): Promise<void> {
  const history = await getPurchaseHistory(listId);
  const filtered = history.filter(item => item.name.toLowerCase() !== itemName.toLowerCase());
  await setPurchaseHistory(listId, filtered);
}

// Subscribe to purchase history changes (polling)
export function subscribePurchaseHistory(
  listId: string,
  callback: (items: PurchaseHistoryItem[]) => void
): () => void {
  let cancelled = false;
  const BASE_INTERVAL = listId.startsWith('offline-') ? 3000 : 3000; // 3s
  let timer: ReturnType<typeof setTimeout> | null = null;

  const poll = async () => {
    if (cancelled) return;
    
    // Slow down when tab hidden
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      timer = setTimeout(poll, 30000); // 30s when hidden
      return;
    }
    
    try {
      const items = await getPurchaseHistory(listId);
      if (!cancelled) callback(items);
    } catch (e) {
      console.warn('Polling purchase history failed', e);
    } finally {
      if (!cancelled) {
        timer = setTimeout(poll, BASE_INTERVAL);
      }
    }
  };

  poll();
  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}

// Migration: Merge old favorites and suggestions into unified history
export async function migrateLegacyData(
  listId: string,
  favorites: GroceryHistoryItem[],
  suggestions: SuggestedItem[]
): Promise<void> {
  const merged = new Map<string, PurchaseHistoryItem>();
  const now = new Date().toISOString();
  
  // Process favorites (from old GroceryHistoryItem)
  favorites.forEach(item => {
    const key = item.name.toLowerCase();
    merged.set(key, {
      name: item.name,
      category: item.category,
      frequency: item.frequency,
      lastPurchased: item.lastAdded || now,
      firstPurchased: item.lastAdded || now,
      avgDaysBetween: 0,
    });
  });
  
  // Process suggestions (merge with favorites if exist)
  suggestions.forEach(item => {
    const key = item.name.toLowerCase();
    const existing = merged.get(key);
    
    if (existing) {
      // Merge: take higher frequency
      existing.frequency = Math.max(existing.frequency, item.frequency);
      if (item.lastAdded && new Date(item.lastAdded) > new Date(existing.lastPurchased)) {
        existing.lastPurchased = item.lastAdded;
      }
    } else {
      merged.set(key, {
        name: item.name,
        category: item.category || 'Uncategorized',
        frequency: item.frequency,
        lastPurchased: item.lastAdded || now,
        firstPurchased: item.lastAdded || now,
        avgDaysBetween: 0,
      });
    }
  });
  
  // Calculate avgDaysBetween for all items
  const finalItems = Array.from(merged.values()).map(item => {
    if (item.frequency > 1 && item.firstPurchased) {
      item.avgDaysBetween = calculateAvgDaysBetween(
        item.frequency,
        item.firstPurchased,
        item.lastPurchased
      );
    }
    return item;
  });
  
  await setPurchaseHistory(listId, finalItems);
  console.log(`✅ Migrated ${finalItems.length} items to unified purchase history`);
}


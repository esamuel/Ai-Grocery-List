import { doc as docLite, getDoc as getDocLite, updateDoc as updateDocLite } from 'firebase/firestore/lite';
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

function groceryListDocPath(listId: string) {
  // Path: groceryLists/{listId} (main document)
  return docLite(getDb(), 'groceryLists', listId);
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
    const key = `groceryList:${listId}`;
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.history) ? (parsed.history as PurchaseHistoryItem[]) : [];
    } catch (e) {
      console.warn('getPurchaseHistory (offline) parse failed', e);
      return [];
    }
  }

  try {
    const docRef = groceryListDocPath(listId);
    const snap = await getDocLite(docRef);
    if (!snap.exists()) return [];
    const data = snap.data();
    return (data.history || []) as PurchaseHistoryItem[];
  } catch (e) {
    console.warn('getPurchaseHistory failed', e);
    return [];
  }
}

// Remove undefined values from an object (Firestore doesn't accept undefined)
function removeUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
  if (obj !== null && typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = removeUndefined(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
}

// Set purchase history to Firestore
export async function setPurchaseHistory(listId: string, items: PurchaseHistoryItem[]): Promise<void> {
  if (listId.startsWith('offline-')) {
    const key = `groceryList:${listId}`;
    try {
      const raw = localStorage.getItem(key) || '{}';
      const parsed = JSON.parse(raw);
      parsed.history = items;
      parsed.updatedAt = new Date().toISOString();
      localStorage.setItem(key, JSON.stringify(parsed));
    } catch (e) {
      console.warn('setPurchaseHistory (offline) failed', e);
    }
    return;
  }

  try {
    const docRef = groceryListDocPath(listId);
    // Clean undefined values before sending to Firestore
    const cleanedItems = removeUndefined(items);
    console.log(`🔄 Writing ${cleanedItems.length} items to Firestore...`);
    await updateDocLite(docRef, { 
      history: cleanedItems,
      updatedAt: new Date().toISOString()
    });
    console.log(`✅ Purchase history updated in Firestore (${cleanedItems.length} items) - UI will update in ~3s`);
  } catch (e) {
    console.error('❌ Failed to update purchase history:', e);
    throw e;
  }
}

// Add or increment item in purchase history
export async function addOrIncrementPurchase(
  listId: string,
  items: { name: string; category?: string; price?: number; currency?: string; store?: string; quantity?: number }[]
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
    
    console.log(`📝 Processing purchase: "${purchase.name}", exists: ${!!existing}`);
    
    if (existing) {
      // Update existing item
      console.log(`  ➡️ Updating existing item. Old frequency: ${existing.frequency}`);
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
      
      // Handle price tracking if price is provided
      if (purchase.price !== undefined && purchase.price > 0) {
        const priceEntry: any = {
          price: purchase.price,
          currency: purchase.currency || 'USD',
          purchaseDate: now,
          quantity: purchase.quantity || 1,
        };
        
        // Only add store if provided (avoid undefined in Firestore)
        if (purchase.store) {
          priceEntry.store = purchase.store;
        }
        
        // Add to price history
        updated.prices = [...(existing.prices || []), priceEntry];
        updated.lastPrice = purchase.price;
        
        // Calculate price statistics
        const allPrices = updated.prices.map(p => p.price);
        updated.avgPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
        updated.lowestPrice = Math.min(...allPrices);
        updated.highestPrice = Math.max(...allPrices);
      }
      
      console.log(`  ✅ New frequency: ${updated.frequency}, lastPurchased: ${updated.lastPurchased}`);
      map.set(key, updated);
    } else {
      // Create new item
      console.log(`  ➕ Creating new history item`);
      const newItem: PurchaseHistoryItem = {
        name: purchase.name,
        category: purchase.category || 'Uncategorized',
        frequency: 1,
        lastPurchased: now,
        firstPurchased: now,
        avgDaysBetween: 0,
      };
      
      // Add price if provided
      if (purchase.price !== undefined && purchase.price > 0) {
        const priceEntry: any = {
          price: purchase.price,
          currency: purchase.currency || 'USD',
          purchaseDate: now,
          quantity: purchase.quantity || 1,
        };
        
        // Only add store if provided (avoid undefined in Firestore)
        if (purchase.store) {
          priceEntry.store = purchase.store;
        }
        
        newItem.prices = [priceEntry];
        newItem.lastPrice = purchase.price;
        newItem.avgPrice = purchase.price;
        newItem.lowestPrice = purchase.price;
        newItem.highestPrice = purchase.price;
      }
      
      map.set(key, newItem);
    }
  });
  
  const finalHistory = Array.from(map.values());
  console.log(`💾 Saving ${finalHistory.length} items to history (was ${current.length})`);
  
  await setPurchaseHistory(listId, finalHistory);
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


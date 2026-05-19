/**
 * Recover purchase history dates from familyActivities check-off logs.
 * Each document like { listId: "WPEH3I", type: "checked", itemName, timestamp } becomes
 * a price entry in groceryLists/{listId}.history[].prices[].
 */

import { initializeApp, getApp } from 'firebase/app';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import type { FamilyActivity } from './familyActivityService';
import { getPurchaseHistory, setPurchaseHistory } from './purchaseHistoryService';
import { getCanonicalName } from './semanticDupService';
import type { PurchaseHistoryItem, PriceHistory } from '../types';
import { parsePurchaseDate, toDateKey, toMonthKey } from '../utils/parsePurchaseDate';

export interface RecoverFromActivitiesResult {
  activitiesScanned: number;
  priceEntriesAdded: number;
  skippedDuplicates: number;
  newItemsCreated: number;
  monthsFound: string[];
  uniqueShoppingDays: number;
}

function sameMinute(a: Date, b: Date): boolean {
  return Math.abs(a.getTime() - b.getTime()) < 60_000;
}

function recalcItemStats(item: PurchaseHistoryItem): PurchaseHistoryItem {
  const prices = [...(item.prices || [])].sort(
    (a, b) =>
      new Date(a.purchaseDate || 0).getTime() - new Date(b.purchaseDate || 0).getTime()
  );
  const validPrices = prices.map((p) => p.price).filter((p): p is number => p !== undefined && p > 0);
  const first = prices[0]?.purchaseDate;
  const last = prices[prices.length - 1]?.purchaseDate;

  return {
    ...item,
    prices,
    frequency: prices.length,
    firstPurchased: first || item.firstPurchased,
    lastPurchased: last || item.lastPurchased,
    lastPrice: validPrices.length > 0 ? validPrices[validPrices.length - 1] : item.lastPrice,
    avgPrice:
      validPrices.length > 0
        ? validPrices.reduce((s, p) => s + p, 0) / validPrices.length
        : item.avgPrice,
    lowestPrice: validPrices.length > 0 ? Math.min(...validPrices) : item.lowestPrice,
    highestPrice: validPrices.length > 0 ? Math.max(...validPrices) : item.highestPrice,
  };
}

function getDb() {
  try {
    return getFirestore(getApp());
  } catch {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
      appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
    };
    return getFirestore(initializeApp(firebaseConfig));
  }
}

async function fetchAllCheckedActivities(listId: string): Promise<FamilyActivity[]> {
  const db = getDb();
  const q = query(
    collection(db, 'familyActivities'),
    where('listId', '==', listId),
    where('type', '==', 'checked')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as FamilyActivity));
}

export async function recoverHistoryFromActivities(
  listId: string,
  currency = 'ILS'
): Promise<RecoverFromActivitiesResult> {
  const activities = await fetchAllCheckedActivities(listId);
  const history = await getPurchaseHistory(listId);

  const map = new Map<string, PurchaseHistoryItem>();
  history.forEach((item) => {
    const key = item.canonicalName || getCanonicalName(item.name);
    map.set(key, {
      ...item,
      canonicalName: key,
      prices: [...(item.prices || [])],
    });
  });

  let priceEntriesAdded = 0;
  let skippedDuplicates = 0;
  let newItemsCreated = 0;
  const months = new Set<string>();
  const days = new Set<string>();

  for (const act of activities) {
    const actDate = parsePurchaseDate(act.timestamp);
    if (!actDate) continue;

    const canonical = getCanonicalName(act.itemName);
    let item = map.get(canonical);

    if (!item) {
      newItemsCreated++;
      item = {
        name: act.itemName,
        canonicalName: canonical,
        category: 'Uncategorized',
        frequency: 0,
        lastPurchased: actDate.toISOString(),
        firstPurchased: actDate.toISOString(),
        prices: [],
      };
      map.set(canonical, item);
    }

    const prices = item.prices || [];
    const isDup = prices.some((p) => {
      const pd = parsePurchaseDate(p.purchaseDate);
      return pd && sameMinute(pd, actDate);
    });

    if (isDup) {
      skippedDuplicates++;
      continue;
    }

    const estimated =
      (item.lastPrice && item.lastPrice > 0 ? item.lastPrice : undefined) ||
      (item.avgPrice && item.avgPrice > 0 ? item.avgPrice : undefined) ||
      0;

    const priceEntry: PriceHistory = {
      purchaseDate: actDate.toISOString(),
      price: estimated,
      quantity: 1,
      currency,
      estimatedPrice: estimated === 0 || !item.lastPrice,
    };

    prices.push(priceEntry);
    item.prices = prices;
    map.set(canonical, item);

    priceEntriesAdded++;
    const dk = toDateKey(actDate);
    if (dk) days.add(dk);
    const mk = toMonthKey(actDate);
    if (mk) months.add(mk);
  }

  const finalHistory = Array.from(map.values()).map(recalcItemStats);
  await setPurchaseHistory(listId, finalHistory);

  return {
    activitiesScanned: activities.length,
    priceEntriesAdded,
    skippedDuplicates,
    newItemsCreated,
    monthsFound: Array.from(months).sort().reverse(),
    uniqueShoppingDays: days.size,
  };
}

if (typeof window !== 'undefined') {
  (window as any).recoverHistoryFromActivities = recoverHistoryFromActivities;
}

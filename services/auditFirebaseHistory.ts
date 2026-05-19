/**
 * Scan Firestore for ALL purchase history related to the signed-in user.
 * Run in browser console after login: await auditFirebaseHistory()
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { getFirebaseServices } from './firebaseService';
import type { PurchaseHistoryItem } from '../types';
import { parsePurchaseDate, toMonthKey } from '../utils/parsePurchaseDate';
import { getAccessibleListId } from './firebaseService';

export interface ListHistoryReport {
  listId: string;
  exists: boolean;
  historyItemCount: number;
  totalPriceEntries: number;
  uniqueMonths: string[];
  uniqueShoppingDays: number;
  oldestPurchase: string | null;
  newestPurchase: string | null;
  itemsWithPrices: number;
  itemsWithoutPrices: number;
  legacyLastAddedOnly: number;
  frequencyTotal: number;
}

export interface FirebaseHistoryAudit {
  userId: string;
  email: string | null;
  currentListId: string;
  mainListId: string | null;
  sharedListId: string | null;
  legacyFavoritesCount: number;
  purchaseHistoryDoc: boolean;
  priceHistoryDoc: boolean;
  lists: ListHistoryReport[];
  bestListId: string | null;
  recommendation: string;
}

function analyzeHistory(history: PurchaseHistoryItem[]): Omit<ListHistoryReport, 'listId' | 'exists'> {
  const months = new Set<string>();
  const days = new Set<string>();
  let totalPriceEntries = 0;
  let itemsWithPrices = 0;
  let itemsWithoutPrices = 0;
  let legacyLastAddedOnly = 0;
  let frequencyTotal = 0;
  let oldest: Date | null = null;
  let newest: Date | null = null;

  const considerDate = (raw: unknown) => {
    const d = parsePurchaseDate(raw);
    if (!d) return;
    const month = toMonthKey(d);
    if (month) months.add(month);
    days.add(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
    if (!oldest || d < oldest) oldest = d;
    if (!newest || d > newest) newest = d;
  };

  history.forEach((item) => {
    frequencyTotal += item.frequency || 0;
    considerDate(item.firstPurchased);
    considerDate(item.lastPurchased);
    considerDate((item as PurchaseHistoryItem & { lastAdded?: string }).lastAdded);

    if (item.prices?.length) {
      itemsWithPrices++;
      item.prices.forEach((p) => {
        totalPriceEntries++;
        considerDate(p.purchaseDate);
      });
    } else if (item.frequency > 0) {
      itemsWithoutPrices++;
      if (item.lastPurchased || (item as { lastAdded?: string }).lastAdded) {
        legacyLastAddedOnly++;
      }
    }
  });

  return {
    historyItemCount: history.length,
    totalPriceEntries,
    uniqueMonths: Array.from(months).sort().reverse(),
    uniqueShoppingDays: days.size,
    oldestPurchase: oldest ? oldest.toISOString() : null,
    newestPurchase: newest ? newest.toISOString() : null,
    itemsWithPrices,
    itemsWithoutPrices,
    legacyLastAddedOnly,
    frequencyTotal,
  };
}

async function loadListReport(db: ReturnType<typeof getFirestore>, listId: string): Promise<ListHistoryReport> {
  const snap = await getDoc(doc(db, 'groceryLists', listId));
  if (!snap.exists()) {
    return {
      listId,
      exists: false,
      historyItemCount: 0,
      totalPriceEntries: 0,
      uniqueMonths: [],
      uniqueShoppingDays: 0,
      oldestPurchase: null,
      newestPurchase: null,
      itemsWithPrices: 0,
      itemsWithoutPrices: 0,
      legacyLastAddedOnly: 0,
      frequencyTotal: 0,
    };
  }
  const history = (snap.data().history || []) as PurchaseHistoryItem[];
  return { listId, exists: true, ...analyzeHistory(history) };
}

async function findListIdsForUser(db: ReturnType<typeof getFirestore>, userId: string): Promise<Set<string>> {
  const ids = new Set<string>();

  const byOwner = await getDocs(query(collection(db, 'groceryLists'), where('ownerId', '==', userId)));
  byOwner.forEach((d) => ids.add(d.id));

  try {
    const byMember = await getDocs(
      query(collection(db, 'groceryLists'), where('members', 'array-contains', userId))
    );
    byMember.forEach((d) => ids.add(d.id));
  } catch (e) {
    console.warn('members query failed (index may be missing):', e);
  }

  return ids;
}

export async function auditFirebaseHistory(): Promise<FirebaseHistoryAudit> {
  const { db, auth } = getFirebaseServices();
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in first');

  const userSnap = await getDoc(doc(db, 'users', user.uid));
  const userData = userSnap.exists() ? userSnap.data() : {};
  const mainListId = (userData.mainListId as string) || null;
  const sharedListId = (userData.sharedListId as string) || null;
  const currentListId = await getAccessibleListId();

  const listIds = await findListIdsForUser(db, user.uid);
  if (mainListId) listIds.add(mainListId);
  if (sharedListId) listIds.add(sharedListId);
  listIds.add(currentListId);

  const lists: ListHistoryReport[] = [];
  for (const listId of listIds) {
    lists.push(await loadListReport(db, listId));
  }
  lists.sort((a, b) => b.uniqueMonths.length - a.uniqueMonths.length);

  let bestListId: string | null = null;
  let bestScore = -1;
  lists.forEach((l) => {
    if (!l.exists) return;
    const score = l.uniqueMonths.length * 100 + l.totalPriceEntries + l.frequencyTotal;
    if (score > bestScore) {
      bestScore = score;
      bestListId = l.listId;
    }
  });

  const legacyFavorites = (userData.favorites as unknown[]) || [];
  const purchaseHistoryDoc = (await getDoc(doc(db, 'purchaseHistory', user.uid))).exists();
  const priceHistoryDoc = (await getDoc(doc(db, 'priceHistory', user.uid))).exists();

  let recommendation = '';
  const current = lists.find((l) => l.listId === currentListId);
  const best = lists.find((l) => l.listId === bestListId);

  if (lists.filter((l) => l.exists).length > 1 && bestListId && bestListId !== currentListId) {
    recommendation = `Another list (${bestListId}) has more history (${best?.uniqueMonths.length} months vs ${current?.uniqueMonths.length}). Run: await mergeHistoricalLists('${currentListId}', ['${bestListId}'])`;
  } else if (current && current.uniqueMonths.length <= 2 && current.oldestPurchase) {
    const oldest = parsePurchaseDate(current.oldestPurchase);
    const newest = parsePurchaseDate(current.newestPurchase);
    if (oldest && newest) {
      const spanDays = (newest.getTime() - oldest.getTime()) / (86400000);
      if (spanDays < 60 && current.frequencyTotal > 20) {
        recommendation =
          'Firebase only has ~2 months of dated purchases. Older shopping was likely never saved with dates (only item counts). Historical months cannot be recovered exactly.';
      }
    }
  } else if (legacyFavorites.length > 0) {
    recommendation = `Legacy favorites (${legacyFavorites.length} items) exist on user doc but are not in monthly view.`;
  } else if (purchaseHistoryDoc || priceHistoryDoc) {
    recommendation = 'Old purchaseHistory/priceHistory collections exist — may need import into groceryLists.history.';
  } else {
    recommendation = 'All history appears to be in the current list only.';
  }

  const audit: FirebaseHistoryAudit = {
    userId: user.uid,
    email: user.email,
    currentListId,
    mainListId,
    sharedListId,
    legacyFavoritesCount: legacyFavorites.length,
    purchaseHistoryDoc,
    priceHistoryDoc,
    lists,
    bestListId,
    recommendation,
  };

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 FIREBASE HISTORY AUDIT');
  console.log(JSON.stringify(audit, null, 2));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡', recommendation);

  return audit;
}

if (typeof window !== 'undefined') {
  (window as any).auditFirebaseHistory = auditFirebaseHistory;
}

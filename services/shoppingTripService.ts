/**
 * Single checkout pipeline: resolve prices → persist trip + purchase events → update history cache.
 */

import {
  collection,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseServices } from './firebaseService';
import { getPurchaseHistory, addOrIncrementPurchase } from './purchaseHistoryService';
import { getCanonicalName } from './semanticDupService';
import { resolvePurchasePrice } from '../utils/priceResolution';
import type { ShoppingTripSource, PriceSource } from '../types';

export interface TripLineInput {
  name: string;
  category?: string;
  price?: number;
  currency?: string;
  store?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  purchaseDate?: string;
}

export interface CommitShoppingTripOptions {
  source: ShoppingTripSource;
  store?: string;
  purchasedAt?: string;
  currency?: string;
  receiptUrl?: string;
  userId?: string;
}

export interface CommitShoppingTripResult {
  tripId: string;
  itemCount: number;
  totalAmount: number;
  resolvedFromUser: number;
  resolvedFromLastKnown: number;
  resolvedFromCategory: number;
}

interface ResolvedLine extends TripLineInput {
  canonicalName: string;
  price: number;
  currency: string;
  priceSource: PriceSource;
  estimated: boolean;
  purchaseDate: string;
}

export async function commitShoppingTrip(
  listId: string,
  lines: TripLineInput[],
  options: CommitShoppingTripOptions
): Promise<CommitShoppingTripResult> {
  if (!lines.length) {
    throw new Error('commitShoppingTrip: no items to commit');
  }

  const history = await getPurchaseHistory(listId);
  const historyByCanonical = new Map(
    history.map((h) => [h.canonicalName || getCanonicalName(h.name), h])
  );

  const purchasedAt = options.purchasedAt || new Date().toISOString();
  const tripStore = options.store?.trim() || lines.find((l) => l.store)?.store;

  const resolved: ResolvedLine[] = lines.map((line) => {
    const canonicalName = getCanonicalName(line.name);
    const existing = historyByCanonical.get(canonicalName);
    const hasOcrPrice =
      options.source === 'receipt_ocr' && line.price !== undefined && line.price > 0;
    const resolvedPrice = hasOcrPrice
      ? {
          price: line.price!,
          currency: line.currency || options.currency || 'ILS',
          priceSource: 'receipt_ocr' as const,
          estimated: false,
        }
      : resolvePurchasePrice({
          userPrice: line.price,
          category: line.category || existing?.category,
          currency: line.currency || options.currency,
          existingItem: existing,
        });

    return {
      ...line,
      canonicalName,
      price: resolvedPrice.price,
      currency: resolvedPrice.currency,
      priceSource: resolvedPrice.priceSource,
      estimated: resolvedPrice.estimated,
      purchaseDate: line.purchaseDate || purchasedAt,
      store: line.store || tripStore,
    };
  });

  const { db } = getFirebaseServices();
  const tripRef = doc(collection(db, 'groceryLists', listId, 'trips'));
  const tripId = tripRef.id;
  const totalAmount = resolved.reduce((s, l) => s + l.price, 0);

  const batch = writeBatch(db);
  batch.set(tripRef, {
    listId,
    purchasedAt,
    store: tripStore || null,
    source: options.source,
    itemCount: resolved.length,
    totalAmount,
    receiptUrl: options.receiptUrl || null,
    createdAt: new Date().toISOString(),
    createdBy: options.userId || null,
  });

  for (const line of resolved) {
    const purchaseRef = doc(collection(db, 'groceryLists', listId, 'purchases'));
    batch.set(purchaseRef, {
      listId,
      tripId,
      canonicalName: line.canonicalName,
      displayName: line.name,
      purchasedAt: line.purchaseDate,
      price: line.price,
      currency: line.currency,
      priceSource: line.priceSource,
      estimated: line.estimated,
      store: line.store || null,
      quantity: line.quantity ?? 1,
      unit: line.unit || null,
      unitPrice: line.unitPrice ?? null,
      createdAt: new Date().toISOString(),
    });
  }

  await batch.commit();

  await addOrIncrementPurchase(
    listId,
    resolved.map((line) => ({
      name: line.name,
      category: line.category,
      price: line.price,
      currency: line.currency,
      store: line.store,
      quantity: line.quantity,
      unit: line.unit,
      unitPrice: line.unitPrice,
      purchaseDate: line.purchaseDate,
      priceSource: line.priceSource,
      tripId,
    }))
  );

  return {
    tripId,
    itemCount: resolved.length,
    totalAmount,
    resolvedFromUser: resolved.filter((l) => l.priceSource === 'user').length,
    resolvedFromLastKnown: resolved.filter((l) => l.priceSource === 'last_known').length,
    resolvedFromCategory: resolved.filter((l) => l.priceSource === 'category').length,
  };
}

if (typeof window !== 'undefined') {
  (window as unknown as { commitShoppingTrip: typeof commitShoppingTrip }).commitShoppingTrip =
    commitShoppingTrip;
}
